# CI Gate — Bounded CI Retry Loop

> Reusable reference for monitoring CI after a push and fixing actionable failures.
> Used by Phase 6 (CI Gate) and the shepherd's WATCHING state.

## Prerequisites

- `OWNER`, `REPO`, `BRANCH`, `PR_NUM` must be set
- `STATE_FILE=/tmp/ci-gate-state-$PR_NUM`

## Algorithm

### Step 0: Initialize

```bash
HEAD_SHA=$(git rev-parse HEAD)
STATE_FILE=/tmp/ci-gate-state-$PR_NUM
TOTAL_START=$(date +%s)
```

### Step 1: Appearance Wait

Poll until at least one check context exists for HEAD_SHA. GitHub takes a few seconds to register check suites after a push.

```bash
# Poll every 15s for up to 2 minutes
for i in $(seq 1 8); do
  TOTAL=$(gh api "repos/$OWNER/$REPO/commits/$HEAD_SHA/check-runs" --jq '.total_count')
  STATUSES=$(gh api "repos/$OWNER/$REPO/commits/$HEAD_SHA/status" --jq '.statuses | length')
  if [ "$((TOTAL + STATUSES))" -gt 0 ]; then break; fi
  sleep 15
done

# If still zero after 2 min → exit CI_NO_CHECKS
if [ "$((TOTAL + STATUSES))" -eq 0 ]; then
  echo "No checks appeared for $HEAD_SHA after 2 minutes"
  # → exit CI_NO_CHECKS (proceed with warning)
fi
```

### Step 2: Settle Wait

Poll until all checks reach terminal status (`status == "completed"`).

```bash
# Poll every 60s, up to 15 minutes
SETTLE_START=$(date +%s)
while true; do
  CHECK_DATA=$(gh api "repos/$OWNER/$REPO/commits/$HEAD_SHA/check-runs" \
    --jq '{
      total: .total_count,
      completed: [.check_runs[] | select(.status == "completed")] | length,
      runs: [.check_runs[] | {name: .name, status: .status, conclusion: .conclusion, app_slug: .app.slug}]
    }')
  PENDING=$(($(echo "$CHECK_DATA" | jq '.total') - $(echo "$CHECK_DATA" | jq '.completed')))
  if [ "$PENDING" -eq 0 ]; then break; fi

  ELAPSED=$(( $(date +%s) - SETTLE_START ))
  if [ "$ELAPSED" -gt 900 ]; then  # 15 minutes
    echo "Checks did not settle within 15 minutes"
    # → exit CI_TIMEOUT
  fi
  sleep 60
done
```

### Step 3: Classify Failures

For each completed check run, determine if it's passing, external, or fixable.

**Passing conclusions:** `success`, `neutral`, `skipped`

**Failing conclusions:** `failure`, `timed_out`, `cancelled`, `startup_failure`, `action_required`

**Decision matrix — a check is ACTIONS_FIXABLE only if ALL conditions met:**

| # | Condition | How to verify |
|---|-----------|--------------|
| 1 | GitHub Actions check | `app_slug == "github-actions"` from check-runs API |
| 2 | Failing job matches fixable pattern | Use `gh run view <id> --json jobs` to get job names; match case-insensitively |
| 3 | Local repro command exists | `jq -e '.scripts.<name>' package.json` |

**Job name → local command lookup table:**

| Pattern in job name (case-insensitive) | Local command |
|----------------------------------------|---------------|
| `lint` | `npm run lint` |
| `typecheck`, `type-check`, `tsc` | `npm run typecheck` or `npm run type-check` |
| `unit test`, `vitest`, `jest` | `npm run test` or `npm run test:unit` |
| `build` | `npm run build` |

**To get the Actions run ID for a failing check:**
```bash
# Find the Actions workflow run matching this SHA
RUN_ID=$(gh run list --branch "$BRANCH" --json databaseId,headSha \
  | jq --arg sha "$HEAD_SHA" '[.[] | select(.headSha == $sha)] | .[0].databaseId')

# Get failed job names within that run
FAILED_JOBS=$(gh run view "$RUN_ID" --json jobs \
  --jq '[.jobs[] | select(.conclusion == "failure") | .name]')
```

**Verify local command exists before classifying as fixable:**
```bash
# Example for "lint":
jq -e '.scripts.lint' package.json >/dev/null 2>&1
```

Everything not matching all three conditions is **EXTERNAL**.

### Step 4: Route

- All checks pass → **exit CI_GREEN**
- Only EXTERNAL failures → **exit CI_EXTERNAL_ONLY**
- ACTIONS_FIXABLE failures exist → proceed to Step 5

### Step 5: Fix

For each ACTIONS_FIXABLE failure:

**a. Fetch truncated logs:**
```bash
gh run view "$RUN_ID" --log-failed 2>&1 | tail -n 300 | grep -E -i 'error|fail|exception' | head -50
```

**b. Identify relevant files** — prioritize PR-modified files first, expand if needed:
```bash
gh api "repos/$OWNER/$REPO/pulls/$PR_NUM/files" --jq '.[].filename'
```
If evidence points outside PR files (config, generated files, lockfiles, shared types), expand scope.

**c. Fix the code.**

**d. Run the local command to verify** (with timeout to prevent hangs):
```bash
timeout 120 npm run <command>
```

**e. Commit:**
```bash
git add -A
git commit -m "fix(ci): resolve <check-name> failure"
```

**f. Push and reset state:**
```bash
LAST_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
git push
sleep 60  # Grace period for check registration
HEAD_SHA=$(git rev-parse HEAD)
```

**g. Update attempt count** (keyed by normalized check name, not SHA):
```bash
CHECK_KEY=$(echo "$CHECK_NAME" | tr '/:. ' '____')
CURRENT=$(grep "^${CHECK_KEY}:" "$STATE_FILE" 2>/dev/null | tail -1 | cut -d: -f2)
CURRENT=${CURRENT:-0}
echo "${CHECK_KEY}:$((CURRENT + 1))" >> "$STATE_FILE"
```

**h. Check bounds:**
- If attempt count ≥ 3 → **exit CI_ESCALATION**
- If total elapsed > 30 minutes → **exit CI_TIMEOUT**

**i. Return to Step 1** (appearance wait for new SHA).

## Exit States

| State | Meaning |
|-------|---------|
| `CI_GREEN` | All checks pass |
| `CI_EXTERNAL_ONLY` | Only non-fixable checks failing |
| `CI_NO_CHECKS` | No checks appeared after 2 min |
| `CI_TIMEOUT` | Total timeout or checks never settled |
| `CI_ESCALATION` | 3+ fix attempts on same check |

All exit states proceed to the next phase — `CI_GREEN`/`CI_EXTERNAL_ONLY` cleanly, others with a status note.

## Pre-existing vs Introduced Policy

> If a check fails on the branch, fix it. Do NOT classify failures as "pre-existing" to skip them.
> The branch must pass CI to merge, regardless of when the failure was introduced.

## Shared State File

The state file persists attempt counts across pushes and between Phase 6 and the shepherd.

```bash
STATE_FILE=/tmp/ci-gate-state-$PR_NUM

# Normalize check name (remove special characters that break grep):
CHECK_KEY=$(echo "$CHECK_NAME" | tr '/:. ' '____')

# Write after each fix attempt:
CURRENT=$(grep "^${CHECK_KEY}:" "$STATE_FILE" 2>/dev/null | tail -1 | cut -d: -f2)
CURRENT=${CURRENT:-0}
echo "${CHECK_KEY}:$((CURRENT + 1))" >> "$STATE_FILE"

# Read current count:
grep "^${CHECK_KEY}:" "$STATE_FILE" 2>/dev/null | tail -1 | cut -d: -f2
```
