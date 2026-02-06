# GoodToGo Integration

Scripts for deterministic PR readiness detection.

## Pre-Flight Check

```bash
PR_NUM=$(gh pr view --json number -q '.number' 2>/dev/null || echo "$ARGUMENTS")
OWNER=$(gh repo view --json owner -q '.owner.login')
REPO=$(gh repo view --json name -q '.name')

if command -v gtg &> /dev/null; then
  GTG_STATE_FLAG=""
  [ -d ".goodtogo" ] && GTG_STATE_FLAG="--state-path .goodtogo/state.db"

  GTG_RESULT=$(gtg $PR_NUM --format json $GTG_STATE_FLAG 2>/dev/null)
  GTG_STATUS=$(echo "$GTG_RESULT" | jq -r '.status')

  case $GTG_STATUS in
    "READY") echo "PR appears READY - verify and commit" ;;
    "CI_FAILING") echo "CI FAILING - fix CI first" ;;
    "ACTION_REQUIRED") echo "Comments need attention" ;;
    "UNRESOLVED_THREADS") echo "Unresolved threads" ;;
  esac
fi
```

## Status Routing

| Status | Action |
|--------|--------|
| `READY` | Quick verification → commit (fast path) |
| `CI_FAILING` | Fix CI first |
| `ACTION_REQUIRED` | Full discovery workflow |
| `UNRESOLVED_THREADS` | Focus on thread resolution |

## Final Verification

```bash
if command -v gtg &> /dev/null; then
  GTG_FINAL=$(gtg $PR_NUM --format json --refresh 2>/dev/null)
  FINAL_STATUS=$(echo "$GTG_FINAL" | jq -r '.status')

  case $FINAL_STATUS in
    "READY") echo "GoodToGo: READY - proceed to commit" ;;
    "CI_FAILING") echo "BLOCK: CI failing" && exit 1 ;;
    "ACTION_REQUIRED") echo "BLOCK: Comments remain" && exit 1 ;;
    "UNRESOLVED_THREADS") echo "BLOCK: Threads unresolved" && exit 1 ;;
  esac
fi
```

## Installation (One-Time)

```bash
pip install gtg
export GITHUB_TOKEN=$(gh auth token)

# Optional: state persistence
mkdir -p .goodtogo
grep -q "^\.goodtogo/" .gitignore || echo ".goodtogo/" >> .gitignore
```
