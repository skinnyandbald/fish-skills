#!/bin/bash
# Tests for bin/check-new-comments
# Uses a mock gh function to return fixture data.
# Each test runs in a subshell for mock isolation.
# Results are written to a temp file so the parent can aggregate counts.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$(dirname "$SCRIPT_DIR")"
RESULTS_FILE=$(mktemp)

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
BOLD='\033[1m'
NC='\033[0m'

# Write pass/fail to the results file (called from subshells)
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

# Export so subshells can call it
export -f assert_json_eq record_pass record_fail
export RESULTS_FILE BIN_DIR GREEN RED NC

echo -e "${BOLD}check-new-comments tests${NC}"
echo ""

# -------------------------------------------------------------------------
# T1: No new comments — all paginated endpoints return empty
# -------------------------------------------------------------------------
echo "T1: No new comments"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T1 status=NO_CHANGES"       "$OUT" '.status'            "NO_CHANGES"
  assert_json_eq "T1 new_comment_count=0"     "$OUT" '.new_comment_count' "0"
)

# -------------------------------------------------------------------------
# T1b: Zero-page response — gh api returns empty string
# -------------------------------------------------------------------------
echo "T1b: Empty string from paginated calls"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *--paginate*--slurp*) echo '' ;;
    esac
  }
  export -f gh
  # Empty string -> jq 'add // []' -> [] -> no new comments
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T1b status=NO_CHANGES"   "$OUT" '.status'            "NO_CHANGES"
  assert_json_eq "T1b new_comment_count=0" "$OUT" '.new_comment_count' "0"
)

# -------------------------------------------------------------------------
# T2: Bot comments only
# -------------------------------------------------------------------------
echo "T2: Bot comments only"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *pulls*comments*--paginate*--slurp*)
        echo '[[{"created_at":"2026-06-01T00:00:00Z","user":{"login":"coderabbitai[bot]"}},{"created_at":"2026-06-02T00:00:00Z","user":{"login":"coderabbitai[bot]"}}]]'
        ;;
      *pulls*reviews*--paginate*--slurp*) echo '[[]]' ;;
      *issues*comments*--paginate*--slurp*) echo '[[]]' ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T2 status=NEW_COMMENTS"    "$OUT" '.status'             "NEW_COMMENTS"
  assert_json_eq "T2 bot_comment_count=2"    "$OUT" '.bot_comment_count'  "2"
  assert_json_eq "T2 human_comment_count=0"  "$OUT" '.human_comment_count' "0"
)

# -------------------------------------------------------------------------
# T3: Human comment only
# -------------------------------------------------------------------------
echo "T3: Human comment only"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *pulls*comments*--paginate*--slurp*)
        echo '[[{"created_at":"2026-06-01T00:00:00Z","user":{"login":"alice"}}]]'
        ;;
      *pulls*reviews*--paginate*--slurp*) echo '[[]]' ;;
      *issues*comments*--paginate*--slurp*) echo '[[]]' ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T3 status=NEW_COMMENTS"    "$OUT" '.status'              "NEW_COMMENTS"
  assert_json_eq "T3 human_comment_count=1"  "$OUT" '.human_comment_count' "1"
  assert_json_eq "T3 bot_comment_count=0"    "$OUT" '.bot_comment_count'   "0"
)

# -------------------------------------------------------------------------
# T4: Mixed bot + human
# -------------------------------------------------------------------------
echo "T4: Mixed bot + human"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *pulls*comments*--paginate*--slurp*)
        echo '[[{"created_at":"2026-06-01T00:00:00Z","user":{"login":"coderabbitai[bot]"}},{"created_at":"2026-06-02T00:00:00Z","user":{"login":"alice"}}]]'
        ;;
      *pulls*reviews*--paginate*--slurp*) echo '[[]]' ;;
      *issues*comments*--paginate*--slurp*) echo '[[]]' ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T4 status=NEW_COMMENTS"    "$OUT" '.status'              "NEW_COMMENTS"
  assert_json_eq "T4 bot_comment_count=1"    "$OUT" '.bot_comment_count'   "1"
  assert_json_eq "T4 human_comment_count=1"  "$OUT" '.human_comment_count' "1"
)

# -------------------------------------------------------------------------
# T5: Merged PR
# -------------------------------------------------------------------------
echo "T5: Merged PR"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"MERGED","mergedAt":"2026-03-14T00:00:00Z"}' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T5 status=MERGED" "$OUT" '.status' "MERGED"
)

# -------------------------------------------------------------------------
# T6: Closed PR
# -------------------------------------------------------------------------
echo "T6: Closed PR"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"CLOSED","mergedAt":null}' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T6 status=CLOSED" "$OUT" '.status' "CLOSED"
)

# -------------------------------------------------------------------------
# T7: Timestamp filtering — old comment excluded, new one counted
# -------------------------------------------------------------------------
echo "T7: Timestamp filtering"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *pulls*comments*--paginate*--slurp*)
        # One comment before cutoff, one after
        echo '[[{"created_at":"2025-12-31T23:59:59Z","user":{"login":"coderabbitai[bot]"}},{"created_at":"2026-06-01T00:00:00Z","user":{"login":"coderabbitai[bot]"}}]]'
        ;;
      *pulls*reviews*--paginate*--slurp*) echo '[[]]' ;;
      *issues*comments*--paginate*--slurp*) echo '[[]]' ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh
  # Cutoff is 2026-01-01 — old comment is 2025-12-31 (excluded), new is 2026-06-01 (included)
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T7 new_comment_count=1" "$OUT" '.new_comment_count' "1"
  assert_json_eq "T7 bot_comment_count=1" "$OUT" '.bot_comment_count'  "1"
)

# -------------------------------------------------------------------------
# T8: Edited old comment (updated_at is new, created_at is old) — NOT counted
# The script filters by created_at only, so an edited old comment is excluded.
# -------------------------------------------------------------------------
echo "T8: Edited old comment not counted"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *pulls*comments*--paginate*--slurp*)
        # created_at before cutoff, updated_at after — should be excluded
        echo '[[{"created_at":"2025-06-01T00:00:00Z","updated_at":"2026-06-01T00:00:00Z","user":{"login":"coderabbitai[bot]"}}]]'
        ;;
      *pulls*reviews*--paginate*--slurp*) echo '[[]]' ;;
      *issues*comments*--paginate*--slurp*) echo '[[]]' ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T8 status=NO_CHANGES"   "$OUT" '.status'            "NO_CHANGES"
  assert_json_eq "T8 new_comment_count=0" "$OUT" '.new_comment_count' "0"
)

# -------------------------------------------------------------------------
# T9: APPROVED review excluded
# -------------------------------------------------------------------------
echo "T9: APPROVED review excluded"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *pulls*comments*--paginate*--slurp*) echo '[[]]' ;;
      *pulls*reviews*--paginate*--slurp*)
        echo '[[{"submitted_at":"2026-06-01T00:00:00Z","state":"APPROVED","user":{"login":"alice"}}]]'
        ;;
      *issues*comments*--paginate*--slurp*) echo '[[]]' ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T9 status=NO_CHANGES"   "$OUT" '.status'            "NO_CHANGES"
  assert_json_eq "T9 new_comment_count=0" "$OUT" '.new_comment_count' "0"
)

# -------------------------------------------------------------------------
# T9b: DISMISSED review excluded
# -------------------------------------------------------------------------
echo "T9b: DISMISSED review excluded"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *pulls*comments*--paginate*--slurp*) echo '[[]]' ;;
      *pulls*reviews*--paginate*--slurp*)
        echo '[[{"submitted_at":"2026-06-01T00:00:00Z","state":"DISMISSED","user":{"login":"alice"}}]]'
        ;;
      *issues*comments*--paginate*--slurp*) echo '[[]]' ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T9b status=NO_CHANGES"   "$OUT" '.status'            "NO_CHANGES"
  assert_json_eq "T9b new_comment_count=0" "$OUT" '.new_comment_count' "0"
)

# -------------------------------------------------------------------------
# T10: Missing OWNER_REPO — falls back to gh repo view
# -------------------------------------------------------------------------
echo "T10: Missing OWNER_REPO falls back to gh repo view"
(
  gh() {
    case "$*" in
      "repo view"*) echo 'org/repo' ;;
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh
  # Call without OWNER_REPO arg
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z")
  assert_json_eq "T10 status=NO_CHANGES" "$OUT" '.status' "NO_CHANGES"
)

# -------------------------------------------------------------------------
# T10b: Missing OWNER_REPO + gh repo view fails -> error JSON
# -------------------------------------------------------------------------
echo "T10b: Missing OWNER_REPO + gh repo view fails"
(
  gh() {
    case "$*" in
      "repo view"*) return 1 ;;
      *) echo '{}' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" 2>/dev/null || true)
  assert_json_eq "T10b status=ERROR"     "$OUT" '.status'     "ERROR"
  assert_json_eq "T10b error_type=api_error" "$OUT" '.error_type' "api_error"
)

# -------------------------------------------------------------------------
# T22: API error — gh returns non-zero for inline comments endpoint
# -------------------------------------------------------------------------
echo "T22: gh api exits non-zero"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *pulls*comments*--paginate*--slurp*) return 1 ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh

  RESULT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo" 2>/dev/null) || true
  assert_json_eq "T22 status=ERROR"          "$RESULT" '.status'     "ERROR"
  assert_json_eq "T22 error_type=api_error"  "$RESULT" '.error_type' "api_error"
)

# -------------------------------------------------------------------------
# T30: Pagination — inline comments across 2 pages
# page 1: 1 old comment; page 2: 1 new bot comment → new_comment_count: 1
# -------------------------------------------------------------------------
echo "T30: Inline comments across 2 pages"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *pulls*comments*--paginate*--slurp*)
        echo '[[{"created_at":"2025-01-01T00:00:00Z","user":{"login":"alice"}}],[{"created_at":"2026-06-01T00:00:00Z","user":{"login":"coderabbitai[bot]"}}]]'
        ;;
      *pulls*reviews*--paginate*--slurp*) echo '[[]]' ;;
      *issues*comments*--paginate*--slurp*) echo '[[]]' ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T30 status=NEW_COMMENTS"   "$OUT" '.status'            "NEW_COMMENTS"
  assert_json_eq "T30 new_comment_count=1"   "$OUT" '.new_comment_count' "1"
  assert_json_eq "T30 bot_comment_count=1"   "$OUT" '.bot_comment_count'  "1"
  assert_json_eq "T30 human_comment_count=0" "$OUT" '.human_comment_count' "0"
)

# -------------------------------------------------------------------------
# T31: Pagination — reviews across 2 pages
# page 1: APPROVED (excluded); page 2: COMMENTED (included) → bot_comment_count: 1
# -------------------------------------------------------------------------
echo "T31: Reviews across 2 pages — APPROVED excluded, COMMENTED included"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *pulls*comments*--paginate*--slurp*) echo '[[]]' ;;
      *pulls*reviews*--paginate*--slurp*)
        echo '[[{"submitted_at":"2026-06-01T00:00:00Z","state":"APPROVED","user":{"login":"coderabbitai[bot]"}}],[{"submitted_at":"2026-06-02T00:00:00Z","state":"COMMENTED","user":{"login":"coderabbitai[bot]"}}]]'
        ;;
      *issues*comments*--paginate*--slurp*) echo '[[]]' ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T31 status=NEW_COMMENTS"  "$OUT" '.status'           "NEW_COMMENTS"
  assert_json_eq "T31 bot_comment_count=1"  "$OUT" '.bot_comment_count'  "1"
  assert_json_eq "T31 new_comment_count=1"  "$OUT" '.new_comment_count' "1"
)

# -------------------------------------------------------------------------
# T32: Pagination — mixed old/new across pages
# page 1: all old; page 2: 1 old + 1 new → only new from page 2 counted
# -------------------------------------------------------------------------
echo "T32: Mixed old/new across pages"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *pulls*comments*--paginate*--slurp*)
        echo '[[{"created_at":"2025-06-01T00:00:00Z","user":{"login":"alice"}},{"created_at":"2025-12-31T23:59:59Z","user":{"login":"bob"}}],[{"created_at":"2025-11-01T00:00:00Z","user":{"login":"carol"}},{"created_at":"2026-06-01T00:00:00Z","user":{"login":"alice"}}]]'
        ;;
      *pulls*reviews*--paginate*--slurp*) echo '[[]]' ;;
      *issues*comments*--paginate*--slurp*) echo '[[]]' ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh
  # Cutoff 2026-01-01 — only the 2026-06-01 comment from page 2 is new
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T32 status=NEW_COMMENTS"    "$OUT" '.status'              "NEW_COMMENTS"
  assert_json_eq "T32 new_comment_count=1"    "$OUT" '.new_comment_count'   "1"
  assert_json_eq "T32 human_comment_count=1"  "$OUT" '.human_comment_count' "1"
  assert_json_eq "T32 bot_comment_count=0"    "$OUT" '.bot_comment_count'   "0"
)

# -------------------------------------------------------------------------
# T33: Pagination — issue comments across 2 pages merged correctly
# -------------------------------------------------------------------------
echo "T33: Issue comments across 2 pages"
(
  gh() {
    case "$*" in
      "pr view"*) echo '{"state":"OPEN","mergedAt":null}' ;;
      *pulls*comments*--paginate*--slurp*) echo '[[]]' ;;
      *pulls*reviews*--paginate*--slurp*) echo '[[]]' ;;
      *issues*comments*--paginate*--slurp*)
        echo '[[{"created_at":"2026-06-01T00:00:00Z","user":{"login":"alice"}}],[{"created_at":"2026-06-02T00:00:00Z","user":{"login":"bob"}}]]'
        ;;
      *--paginate*--slurp*) echo '[[]]' ;;
    esac
  }
  export -f gh
  OUT=$("$BIN_DIR/check-new-comments" 42 "2026-01-01T00:00:00Z" "org/repo")
  assert_json_eq "T33 issue_comment_count=2" "$OUT" '.issue_comment_count' "2"
  # Issue comments don't affect new_comment_count (inline + reviews only)
  assert_json_eq "T33 new_comment_count=0"   "$OUT" '.new_comment_count'   "0"
  assert_json_eq "T33 status=NO_CHANGES"     "$OUT" '.status'              "NO_CHANGES"
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
