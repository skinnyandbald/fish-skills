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

Everything not matching all three conditions is **EXTERNAL** — unless it's a recognized third-party check (see below).

### Step 3b: Classify Third-Party Actionable Checks

Some third-party checks (not GitHub Actions) are still actionable because they post structured feedback as PR review comments. **This step only applies if the check actually appears in the repo's check runs** — if a provider isn't installed on the repo, its check runs won't exist and this step is naturally skipped.

**Detection:** After collecting all check runs in Step 2, scan for recognized third-party `app_slug` values. Only apply the rules below for providers whose checks actually appeared.

```bash
# Check if any CodeScene checks exist in the settled check data
HAS_CODESCENE=$(echo "$CHECK_DATA" | jq 'reduce (.runs[] | select(.app_slug == "codescene" or (.name | test("CodeScene"; "i")))) as $_ (0; . + 1)')
```

**CodeScene** (only when `HAS_CODESCENE > 0`):

CodeScene posts two types of gates as PR review comments:
1. **Code Coverage Gate** — requires new/changed code to meet a coverage threshold
2. **Code Health Gate** — flags complexity increases (Complex Method, Bumpy Road Ahead)

**When a CodeScene check has a failing conclusion:**
1. Read the latest CodeScene review comment on the PR:
   ```bash
   gh api "repos/$OWNER/$REPO/pulls/$PR_NUM/reviews" \
     --jq '[.[] | select((.body // "") | contains("cs-code-health") or contains("cs-code-coverage"))] | last | .body'
   ```

2. **Coverage gate failure** (body contains "Code Coverage Gates Failed"):
   - Parse uncovered files and line numbers from the review body
   - Add unit tests for those specific lines
   - Focus on the most impactful files first (most uncovered lines)

3. **Code Health gate failure** (body contains "Prevent hotspot decline"):
   - Parse the hotspot table for files and biomarkers
   - For "Complex Method": extract helpers, split functions, reduce nesting
   - For "Bumpy Road Ahead": reduce nested conditionals, extract early returns
   - Resolve via code changes only (refactor/simplify/extract) so the CodeScene thread has a corresponding commit — suppression is not permitted

4. Classify as **THIRD_PARTY_FIXABLE** and proceed to Step 5 (Fix)

**Adding more third-party checks:** To make other third-party checks actionable, add a detection block above (check `app_slug` or name pattern in the settled check data), document the fix strategy, and classify as THIRD_PARTY_FIXABLE.

### Step 4: Route

- All checks pass → **exit CI_GREEN**
- Only EXTERNAL failures (no ACTIONS_FIXABLE or THIRD_PARTY_FIXABLE) → **exit CI_EXTERNAL_ONLY**
- ACTIONS_FIXABLE or THIRD_PARTY_FIXABLE failures exist → proceed to Step 5

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

## Anti-Analysis-Paralysis Rule

When fixing a CI failure, the agent MUST follow this discipline:

1. **10 tool call budget per fix attempt.** After investigating the failure (reading logs, checking code), the agent MUST attempt a code fix within 10 tool calls. Analysis without a fix attempt does not count toward the 3-attempt bound.

2. **Push after every fix attempt.** Do NOT keep iterating locally. Push the fix, let CI run, and evaluate the result. The CI gate loop handles re-polling automatically.

3. **Try a different approach each time.** If attempt 1 fails, attempt 2 must use a fundamentally different strategy — not a refinement of the same approach.

4. **Escalate when stuck, don't research infinitely.** If the agent cannot form a fix hypothesis within 10 tool calls, it should exit with `CI_ESCALATION` and report:
   - What was investigated
   - What the failure appears to be
   - Why a fix could not be determined
   - Suggested next steps for a human

**Red flags that the agent is stuck:**
- More than 15 tool calls without a `git commit`
- Multiple web searches on the same topic
- Re-reading the same files
- Reasoning about the problem without making changes
- "Let me try a different approach" without actually changing code

## Exit States

| State | Meaning |
|-------|---------|
| `CI_GREEN` | All checks pass |
| `CI_EXTERNAL_ONLY` | Only truly non-fixable checks failing (not CodeScene or other recognized third-party checks) |
| `CI_NO_CHECKS` | No checks appeared after 2 min |
| `CI_TIMEOUT` | Total timeout or checks never settled |
| `CI_ESCALATION` | 3+ fix attempts on same check |

All exit states proceed to the next phase — `CI_GREEN`/`CI_EXTERNAL_ONLY` cleanly, others with a status note.

## Pre-existing vs Introduced Failure Policy

**Default stance: fix it.** The branch must pass CI to merge.

However, you MUST correctly attribute failures before fixing. A failure caused by code
the PR introduced is NOT pre-existing — even if "those tests were passing before".

### Mandatory Attribution Check

Before classifying ANY test failure as pre-existing, run these steps:

1. **Get files modified by the PR:**
   ```bash
   BASE_REF=$(gh pr view "$PR_NUM" --json baseRefName -q '.baseRefName')
   PR_FILES=$(git diff "origin/$BASE_REF" --name-only)
   ```

2. **For each failing test, check if the error references PR-modified code:**
   - Read the test failure output (stack trace, assertion error)
   - Check whether the failing function/method/import lives in a PR-modified file
   - Check whether the test file itself was modified by the PR
   - If the error mentions a symbol (function, class, mock) that was added or changed
     by the PR, the failure is PR-INTRODUCED

3. **Classification rules:**

   | Evidence | Classification | Action |
   |----------|---------------|--------|
   | Error references function/file modified by PR | **PR-INTRODUCED** | Fix it (add mocks, update assertions, etc.) |
   | Test file was modified by PR | **PR-INTRODUCED** | Fix it |
   | PR added new code paths that tests call without mocks (e.g., `Sentry.setTag`, DB guards) | **PR-INTRODUCED** | Add missing mocks/stubs |
   | Error is in code completely unrelated to PR files | **POSSIBLY PRE-EXISTING** | Verify on base branch before skipping |

4. **To verify a failure is truly pre-existing** (only if step 3 says POSSIBLY PRE-EXISTING):
   ```bash
   # Option A: Check base branch CI status
   gh api "repos/$OWNER/$REPO/commits/$BASE_REF/check-runs" \
     --jq '[.check_runs[] | select(.conclusion == "failure") | .name]'

   # Option B: Run the failing test against base branch
   git stash && git checkout "origin/$BASE_REF" && npx vitest run <failing-test-file> ; git checkout - && git stash pop
   ```

**Common PR-introduced failures that look pre-existing but are NOT:**
- Adding `Sentry.setTag()` / `Sentry.captureException()` calls without mocking Sentry in tests
- Adding `db.model.findUniqueOrThrow()` guards without adding DB mocks to tests
- Changing function signatures without updating test call sites
- Adding new imports that tests don't have stubs for

**Never bulk-classify failures as pre-existing.** Each failure must be individually attributed.

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
