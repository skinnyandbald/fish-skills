#!/bin/bash
# Tests for shepherd push/escalation bash patterns
# These test inline bash patterns used in shepherd.md, not standalone scripts.
# Uses temp file for results aggregation (subshells can't update parent vars).
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE=$(mktemp)

GREEN='\033[0;32m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Write pass/fail to the results file (called from subshells)
record_pass() { echo "PASS:$1" >> "$RESULTS_FILE"; }
record_fail() { echo "FAIL:$1" >> "$RESULTS_FILE"; }

assert_contains() {
  local description="$1" actual="$2" expected="$3"
  if echo "$actual" | grep -q "$expected"; then
    echo -e "  ${GREEN}+${NC} $description"
    record_pass "$description"
  else
    echo -e "  ${RED}x${NC} $description (expected to contain '$expected')"
    record_fail "$description"
  fi
}

assert_eq() {
  local description="$1" actual="$2" expected="$3"
  if [ "$actual" = "$expected" ]; then
    echo -e "  ${GREEN}+${NC} $description"
    record_pass "$description"
  else
    echo -e "  ${RED}x${NC} $description (expected '$expected', got '$actual')"
    record_fail "$description"
  fi
}

# Export so subshells can call them
export -f record_pass record_fail assert_contains assert_eq
export RESULTS_FILE GREEN RED NC

echo -e "${BOLD}shepherd-actions bash pattern tests${NC}"
echo ""

# ── T17: Push non-fast-forward ────────────────────────────────────────
echo "T17: Push non-fast-forward"
(
  git() {
    if [ "$1" = "push" ]; then
      echo "error: failed to push some refs" >&2
      echo "hint: Updates were rejected because the tip of your current branch is behind" >&2
      return 1
    fi
    command git "$@"
  }
  export -f git

  PUSH_ERR=$(mktemp)
  trap 'rm -f "$PUSH_ERR"' EXIT
  PUSH_FAILED=false
  if ! git push 2>"$PUSH_ERR"; then
    PUSH_ERROR=$(cat "$PUSH_ERR")
    PUSH_FAILED=true
  fi

  assert_eq    "T17 push failure detected"    "$PUSH_FAILED"  "true"
  assert_contains "T17 error contains rejected" "$PUSH_ERROR" "rejected"
)

# ── T18: Push auth failure ────────────────────────────────────────────
echo "T18: Push auth failure"
(
  git() {
    if [ "$1" = "push" ]; then
      echo "fatal: Authentication failed for 'https://github.com/org/repo.git'" >&2
      return 1
    fi
    command git "$@"
  }
  export -f git

  PUSH_ERR=$(mktemp)
  trap 'rm -f "$PUSH_ERR"' EXIT
  PUSH_FAILED=false
  if ! git push 2>"$PUSH_ERR"; then
    PUSH_ERROR=$(cat "$PUSH_ERR")
    PUSH_FAILED=true
  fi

  assert_eq       "T18 push failure detected"        "$PUSH_FAILED"  "true"
  assert_contains "T18 error contains Authentication" "$PUSH_ERROR"  "Authentication"
)

# ── T20: SKIP_LIST acknowledge flow ──────────────────────────────────
echo "T20: SKIP_LIST acknowledge flow"
(
  CALLS_FILE=$(mktemp)
  trap 'rm -f "$CALLS_FILE"' EXIT

  gh() {
    case "$*" in
      *-X\ POST*/issues/*/comments*) echo "reply_posted" >> "$CALLS_FILE" ;;
    esac
    echo '{"id":1}'
  }
  export -f gh

  resolve_pr_thread() {
    echo "thread_resolved" >> "$CALLS_FILE"
  }
  export -f resolve_pr_thread

  # Simulate the SKIP_LIST acknowledge pattern
  THREAD_ID="PRRT_test123"
  PR_NUM=42
  OWNER="org"
  REPO="repo"
  BODY="Acknowledged — this file has been flagged multiple times and is being skipped per shepherd policy."

  gh api -X POST "/repos/$OWNER/$REPO/issues/$PR_NUM/comments" -f body="$BODY" >/dev/null
  resolve_pr_thread "$THREAD_ID"

  CALLS_MADE=$(cat "$CALLS_FILE")
  assert_contains "T20 reply posted"    "$CALLS_MADE" "reply_posted"
  assert_contains "T20 thread resolved" "$CALLS_MADE" "thread_resolved"
)

# ── Summary ───────────────────────────────────────────────────────────
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
