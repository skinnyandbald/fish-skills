#!/bin/bash
# Tests for bin/check-mergeability
# Uses a mock gh function to return fixture data.
# Each test runs in a subshell for mock isolation.
# Results are written to a temp file so the parent can aggregate counts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE=$(mktemp)

GREEN='\033[0;32m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

record_pass() { echo "PASS:$1" >> "$RESULTS_FILE"; }
record_fail() { echo "FAIL:$1" >> "$RESULTS_FILE"; }

assert_json_eq() {
  local description="$1" actual="$2" path="$3" expected="$4"
  local got
  got=$(echo "$actual" | jq -r "$path" 2>/dev/null)
  if [ "$got" = "$expected" ]; then
    echo -e "  ${GREEN}+${NC} $description"
    record_pass "$description"
  else
    echo -e "  ${RED}x${NC} $description (expected '$expected', got '$got')"
    record_fail "$description"
  fi
}

export -f assert_json_eq record_pass record_fail
export RESULTS_FILE BIN_DIR GREEN RED NC

# Speed up polling tests — 1s sleep, max 3 polls. Real script defaults to 10s/6 polls.
export CHECK_MERGEABILITY_MAX_POLLS=3
export CHECK_MERGEABILITY_SLEEP=1

echo -e "${BOLD}check-mergeability tests${NC}"
echo ""

# -------------------------------------------------------------------------
# T1: MERGEABLE + CLEAN — happy path, continue
# -------------------------------------------------------------------------
echo "T1: MERGEABLE + CLEAN -> CLEAN"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"mergeable":"MERGEABLE","mergeStateStatus":"CLEAN"}' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-mergeability" 42)
  assert_json_eq "T1 status=CLEAN"        "$OUT" '.status'           "CLEAN"
  assert_json_eq "T1 mergeable"           "$OUT" '.mergeable'        "MERGEABLE"
  assert_json_eq "T1 mergeStateStatus"    "$OUT" '.mergeStateStatus' "CLEAN"
  assert_json_eq "T1 poll_count=1"        "$OUT" '.poll_count'       "1"
)

# -------------------------------------------------------------------------
# T2: MERGEABLE + UNSTABLE — failing/pending checks don't block mergeability
# -------------------------------------------------------------------------
echo "T2: MERGEABLE + UNSTABLE -> CLEAN (CI is a separate gate)"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"mergeable":"MERGEABLE","mergeStateStatus":"UNSTABLE"}' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-mergeability" 42)
  assert_json_eq "T2 status=CLEAN"        "$OUT" '.status'           "CLEAN"
  assert_json_eq "T2 mergeStateStatus"    "$OUT" '.mergeStateStatus' "UNSTABLE"
)

# -------------------------------------------------------------------------
# T3: MERGEABLE + BEHIND — auto-sync target
# -------------------------------------------------------------------------
echo "T3: MERGEABLE + BEHIND -> BEHIND"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"mergeable":"MERGEABLE","mergeStateStatus":"BEHIND"}' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-mergeability" 42)
  assert_json_eq "T3 status=BEHIND"       "$OUT" '.status'           "BEHIND"
  assert_json_eq "T3 mergeable"           "$OUT" '.mergeable'        "MERGEABLE"
)

# -------------------------------------------------------------------------
# T4: CONFLICTING + DIRTY — block, don't auto-resolve
# -------------------------------------------------------------------------
echo "T4: CONFLICTING + DIRTY -> CONFLICT"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"mergeable":"CONFLICTING","mergeStateStatus":"DIRTY"}' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-mergeability" 42)
  assert_json_eq "T4 status=CONFLICT"     "$OUT" '.status'           "CONFLICT"
  assert_json_eq "T4 mergeable"           "$OUT" '.mergeable'        "CONFLICTING"
  assert_json_eq "T4 mergeStateStatus"    "$OUT" '.mergeStateStatus' "DIRTY"
)

# -------------------------------------------------------------------------
# T5: UNKNOWN -> MERGEABLE — polling resolves it
# Use a state file because mock-function state doesn't persist across calls.
# -------------------------------------------------------------------------
echo "T5: UNKNOWN then MERGEABLE -> CLEAN (polling)"
(
  STATE_FILE=$(mktemp)
  echo 0 > "$STATE_FILE"
  export STATE_FILE
  gh() {
    case "$*" in
      "pr view"*)
        CALL=$(cat "$STATE_FILE")
        CALL=$((CALL + 1))
        echo "$CALL" > "$STATE_FILE"
        if [ "$CALL" -lt 2 ]; then
          echo '{"mergeable":"UNKNOWN","mergeStateStatus":""}'
        else
          echo '{"mergeable":"MERGEABLE","mergeStateStatus":"CLEAN"}'
        fi
        ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-mergeability" 42)
  assert_json_eq "T5 status=CLEAN"        "$OUT" '.status'     "CLEAN"
  assert_json_eq "T5 poll_count=2"        "$OUT" '.poll_count' "2"
  rm -f "$STATE_FILE"
)

# -------------------------------------------------------------------------
# T6: UNKNOWN throughout — exhausts polls, returns UNKNOWN
# -------------------------------------------------------------------------
echo "T6: UNKNOWN throughout -> UNKNOWN"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"mergeable":"UNKNOWN","mergeStateStatus":""}' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-mergeability" 42)
  assert_json_eq "T6 status=UNKNOWN"      "$OUT" '.status'     "UNKNOWN"
  assert_json_eq "T6 poll_count=3"        "$OUT" '.poll_count' "3"
)

# -------------------------------------------------------------------------
# T7: Missing PR_NUM -> usage ERROR
# -------------------------------------------------------------------------
echo "T7: Missing PR_NUM -> ERROR"
(
  OUT=$("$BIN_DIR/check-mergeability" || true)
  assert_json_eq "T7 status=ERROR"        "$OUT" '.status'     "ERROR"
  assert_json_eq "T7 error_type=usage"    "$OUT" '.error_type' "usage"
)

# -------------------------------------------------------------------------
# T8: OWNER_REPO is forwarded — verify --repo is passed when set
# -------------------------------------------------------------------------
echo "T8: OWNER_REPO is forwarded to gh"
(
  CAPTURE_FILE=$(mktemp)
  export CAPTURE_FILE
  gh() {
    echo "$*" >> "$CAPTURE_FILE"
    echo '{"mergeable":"MERGEABLE","mergeStateStatus":"CLEAN"}'
  }
  export -f gh
  OUT=$("$BIN_DIR/check-mergeability" 42 "org/repo")
  CAPTURED=$(cat "$CAPTURE_FILE")
  if echo "$CAPTURED" | grep -q -- "--repo org/repo"; then
    echo -e "  ${GREEN}+${NC} T8 --repo forwarded"
    record_pass "T8 --repo forwarded"
  else
    echo -e "  ${RED}x${NC} T8 --repo forwarded (got: $CAPTURED)"
    record_fail "T8 --repo forwarded"
  fi
  assert_json_eq "T8 status=CLEAN"        "$OUT" '.status' "CLEAN"
  rm -f "$CAPTURE_FILE"
)

# -------------------------------------------------------------------------
# Summary
# -------------------------------------------------------------------------
echo ""
PASS=$(grep -c '^PASS:' "$RESULTS_FILE" 2>/dev/null || true)
FAIL=$(grep -c '^FAIL:' "$RESULTS_FILE" 2>/dev/null || true)
PASS="${PASS:-0}"
FAIL="${FAIL:-0}"
TOTAL=$((PASS + FAIL))

echo -e "${BOLD}Results: ${GREEN}${PASS}${NC}/${TOTAL} passed${NC}"

if [ "$FAIL" -gt 0 ]; then
  echo -e "${RED}Failed tests:${NC}"
  grep '^FAIL:' "$RESULTS_FILE" | sed 's/^FAIL:/  - /'
fi

rm -f "$RESULTS_FILE"

[ "$FAIL" -eq 0 ]
