#!/bin/bash
# Tests for bin/push-to-pr-branch
# Builds a real local bare "remote" + a detached worktree and exercises the
# happy path, the concurrent-push race (fetch+rebase+retry), and the no-force invariant.
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
BIN_DIR="$(dirname "$SCRIPT_DIR")"
SCRIPT="$BIN_DIR/push-to-pr-branch"

GREEN='\033[0;32m'; RED='\033[0;31m'; BOLD='\033[1m'; NC='\033[0m'
RESULTS_FILE=$(mktemp)
ok()  { echo -e "  ${GREEN}+${NC} $1"; echo "PASS:$1" >> "$RESULTS_FILE"; }
no()  { echo -e "  ${RED}x${NC} $1"; echo "FAIL:$1" >> "$RESULTS_FILE"; }

TMP=$(mktemp -d)
cleanup() { rm -rf "$TMP"; rm -f "$RESULTS_FILE"; }
trap cleanup EXIT

export GIT_AUTHOR_NAME=t GIT_AUTHOR_EMAIL=t@t GIT_COMMITTER_NAME=t GIT_COMMITTER_EMAIL=t@t

echo -e "${BOLD}push-to-pr-branch${NC}"

# --- Fixture: bare remote seeded with main + feat/x ---
git init -q --bare "$TMP/remote.git"
REMOTE="$TMP/remote.git"

git init -q "$TMP/seed"
( cd "$TMP/seed"
  git commit -q --allow-empty -m init
  git branch -M main
  git remote add origin "$REMOTE"
  git push -q origin main
  git checkout -q -b feat/x
  echo a > a.txt && git add a.txt && git commit -q -m a
  git push -q origin feat/x )

# --- Working clone with a DETACHED worktree at origin/feat/x ---
git clone -q "$REMOTE" "$TMP/work"
( cd "$TMP/work" && git fetch -q origin feat/x )
WT="$TMP/wt"
git -C "$TMP/work" worktree add -q --detach "$WT" origin/feat/x

# === TEST 1: detached HEAD commit pushes to the branch ref, claims no branch ===
( cd "$WT" && echo b > b.txt && git add b.txt && git commit -q -m b )
NEWSHA=$( cd "$WT" && git rev-parse HEAD )
if ( cd "$WT" && "$SCRIPT" feat/x ) >/dev/null 2>&1; then
  ok "push succeeds from a detached HEAD"
else
  no "push succeeds from a detached HEAD"
fi
REMOTE_SHA=$(git ls-remote "$REMOTE" refs/heads/feat/x | cut -f1)
[ "$REMOTE_SHA" = "$NEWSHA" ] && ok "remote feat/x fast-forwarded to our commit" || no "remote feat/x advanced (got ${REMOTE_SHA:0:7} want ${NEWSHA:0:7})"
[ -z "$( cd "$WT" && git branch --show-current )" ] && ok "HEAD stays detached (no local branch claimed)" || no "HEAD stays detached"

# === TEST 2: concurrent remote update -> race -> fetch+rebase+retry lands our commit ===
# Another writer advances feat/x to a commit we don't have yet.
( cd "$TMP/seed"
  git fetch -q origin feat/x
  git reset --hard -q origin/feat/x     # catch up to our pushed 'b'
  echo c > c.txt && git add c.txt && git commit -q -m c
  git push -q origin feat/x )           # remote now ahead of our worktree
RACE_SHA=$( cd "$TMP/seed" && git rev-parse HEAD )

( cd "$WT" && echo d > d.txt && git add d.txt && git commit -q -m d )
if ( cd "$WT" && "$SCRIPT" feat/x ) >/dev/null 2>&1; then
  ok "race: fetch+rebase+retry push succeeds"
else
  no "race: fetch+rebase+retry push succeeds"
fi
( cd "$WT" && git fetch -q origin feat/x )
LOG=$( cd "$WT" && git log --format='%s' origin/feat/x | head -4 | tr '\n' ' ' )
if echo "$LOG" | grep -q d && echo "$LOG" | grep -q c; then
  ok "race: remote holds both the racing commit and ours (rebased)"
else
  no "race: remote history wrong: [$LOG]"
fi
if ( cd "$WT" && git merge-base --is-ancestor "$RACE_SHA" origin/feat/x ); then
  ok "race: racing commit preserved (no force-push clobber)"
else
  no "race: racing commit was lost (force-push?)"
fi

# === TEST 3: the script never force-pushes ===
if grep -qE -- '(--force|--force-with-lease| -f |\+HEAD|\+refs)' "$SCRIPT"; then
  no "script contains a force-push"
else
  ok "script never force-pushes"
fi

# --- aggregate ---
PASS=$(grep -c '^PASS:' "$RESULTS_FILE" || true)
FAIL=$(grep -c '^FAIL:' "$RESULTS_FILE" || true)
echo
echo -e "${BOLD}push-to-pr-branch: ${GREEN}${PASS} passed${NC}, $([ "$FAIL" -gt 0 ] && echo -e "${RED}${FAIL} failed${NC}" || echo "0 failed")"
[ "$FAIL" -eq 0 ]
