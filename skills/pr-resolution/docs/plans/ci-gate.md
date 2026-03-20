# Plan: Add Bounded CI Retry Loop to PR Resolution

## Problem

The pr-resolution skill resolves review comments and pushes, but never monitors whether CI passes after the push. The shepherd only watches for new bot review comments, not CI check status. If CI fails after push, the failures go unnoticed and unfixed.

Additionally, Phase 4 (Verification) runs local checks with `|| true` which swallows failures, and the agent rationalized typecheck failures as "pre-existing" rather than fixing them.

## Goal

Add a bounded CI retry loop that:
1. Polls CI status after every push, scoped to the latest commit SHA
2. Uses two data sources: commit check-runs API (all checks) + `gh run list` (Actions logs)
3. Distinguishes fixable checks (Actions runs with matching job name + local repro) from external checks
4. For fixable failures: fetches truncated logs, diagnoses, fixes, commits, pushes, and re-polls
5. Exits when CI is green, after timeout, or after max fix attempts

## Constraints

- **npm-based JS/TS repos only.** Local repro detection uses `package.json` scripts. Non-Node repos are out of scope.
- **GitHub Actions only for log fetching.** Third-party check providers (Vercel, CodeScene, Semgrep) are classified as EXTERNAL.
- **Sequential execution.** Phase 6 completes before shepherd starts. No concurrent CI fixing.
- **No `gh run rerun`.** Only code fixes, not infrastructure retries. Transient failures (`startup_failure`) are classified as EXTERNAL.

## Changes

### 1. New file: `references/ci-gate.md`

Defines the CI monitoring loop as a reusable reference (used by both Phase 6 and the shepherd).

#### CI Gate Algorithm

```
0. Initialize after push:
   HEAD_SHA=$(git rev-parse HEAD)
   CHECKS_SETTLE_TIMEOUT=15min
   TOTAL_CI_GATE_TIMEOUT=30min

   Read existing attempt counts from state file:
   STATE_FILE=/tmp/ci-gate-state-$PR_NUM

1. APPEARANCE WAIT — poll until at least one check context exists for HEAD_SHA:
   Loop every 15s for up to 2 minutes:
     ALL_CHECKS=$(gh api "repos/$OWNER/$REPO/commits/$HEAD_SHA/check-runs" \
       --jq '.total_count')
     STATUSES=$(gh api "repos/$OWNER/$REPO/commits/$HEAD_SHA/status" \
       --jq '.statuses | length')
     if (ALL_CHECKS + STATUSES) > 0 → break, proceed to step 2
   If 2 min elapsed with zero checks → exit CI_NO_CHECKS (proceed with warning)

2. SETTLE WAIT — poll until all checks for HEAD_SHA reach terminal status:
   Loop every 60s:
     CHECK_RUNS=$(gh api "repos/$OWNER/$REPO/commits/$HEAD_SHA/check-runs" \
       --jq '{
         total: .total_count,
         completed: [.check_runs[] | select(.status == "completed")] | length,
         runs: [.check_runs[] | {name: .name, status: .status, conclusion: .conclusion, app: .app.slug}]
       }')
     PENDING = total - completed
     if PENDING == 0 → break, proceed to step 3
     if CHECKS_SETTLE_TIMEOUT elapsed → exit CI_TIMEOUT

3. CLASSIFY each completed check run:
   For each check run with a non-passing conclusion:
   (Passing = conclusion in: success, neutral, skipped)
   (Failing = conclusion in: failure, timed_out, cancelled, startup_failure, action_required)

   Decision matrix — a check is ACTIONS_FIXABLE only if ALL conditions met:

   a. Is it a GitHub Actions check? (app.slug == "github-actions")
   b. Does a failing JOB within the run match a fixable pattern?
      To get job names: gh run list --branch "$BRANCH" --json databaseId,headSha \
        | find matching run → gh run view <databaseId> --json jobs \
        --jq '[.jobs[] | select(.conclusion == "failure") | .name]'
   c. Does the job name map to a local command via the lookup table?

   Lookup table (case-insensitive match on job name):
   | Pattern in job name          | Local command                              |
   |------------------------------|--------------------------------------------|
   | lint                         | npm run lint                               |
   | typecheck, type-check, tsc   | npm run typecheck ∥ npm run type-check     |
   | unit test, vitest, jest      | npm run test ∥ npm run test:unit           |
   | build                        | npm run build                              |

   Verify local command exists: jq -e '.scripts.lint' package.json >/dev/null 2>&1

   Classification results:
   - ACTIONS_FIXABLE: all three conditions met → attempt fix
   - EXTERNAL: anything else (third-party apps, no local repro, transient infra)

4. ROUTE based on classification:
   - All checks pass → exit CI_GREEN
   - Only EXTERNAL failures → exit CI_EXTERNAL_ONLY
   - ACTIONS_FIXABLE failures exist → proceed to step 5

5. FIX each ACTIONS_FIXABLE failure:
   a. Fetch truncated logs for the specific failing job:
      gh run view <databaseId> --log-failed 2>&1 | tail -n 300
      Pipe through: grep -E -i 'error|fail|exception' | head -50
   b. Identify relevant files — prioritize PR-modified files first:
      gh api "repos/$OWNER/$REPO/pulls/$PR_NUM/files" --jq '.[].filename'
      If evidence points outside PR files, expand to config/dependency/test files.
   c. Fix the code
   d. Run the corresponding local command to verify the fix (with timeout):
      timeout 120 npm run <command>
   e. Commit: "fix(ci): resolve <check-name> failure"
   f. Push, then:
      - Wait 60 seconds (grace period for check registration)
      - Update HEAD_SHA=$(git rev-parse HEAD)
      - Update LAST_TIMESTAMP
   g. Update attempt count in state file:
      # Key by PR_NUM + normalized check name (no SHA — survives across pushes)
      CHECK_KEY=$(echo "$CHECK_NAME" | tr '/:' '__')
      CURRENT=$(grep "^${CHECK_KEY}:" "$STATE_FILE" 2>/dev/null | tail -1 | cut -d: -f2)
      CURRENT=${CURRENT:-0}
      echo "${CHECK_KEY}:$((CURRENT + 1))" >> "$STATE_FILE"
   h. If attempt count >= 3 for this check → exit CI_ESCALATION
   i. Return to step 1 (appearance wait for new SHA)

6. If TOTAL_CI_GATE_TIMEOUT elapsed at any point → exit CI_TIMEOUT
```

#### Exit States

| State | Meaning | Action |
|-------|---------|--------|
| `CI_GREEN` | All checks pass | Proceed to next phase |
| `CI_EXTERNAL_ONLY` | Only non-fixable checks failing | Proceed with note |
| `CI_NO_CHECKS` | No checks appeared after 2 min | Proceed with warning |
| `CI_TIMEOUT` | Total timeout or checks never settled | Report and proceed |
| `CI_ESCALATION` | 3+ fix attempts on same check | Report and proceed |

#### Pre-existing vs Introduced Policy

> If a check fails on the branch, fix it. Do NOT classify failures as "pre-existing" to skip them.
> The branch must pass CI to merge, regardless of when the failure was introduced.

#### Shared State File

Persist attempt counts keyed by `CHECK_NAME` (not SHA) to enforce bounds across pushes:

```bash
STATE_FILE=/tmp/ci-gate-state-$PR_NUM

# Write after each fix attempt (CHECK_KEY is normalized — no colons/slashes):
CHECK_KEY=$(echo "$CHECK_NAME" | tr '/:. ' '____')
CURRENT=$(grep "^${CHECK_KEY}:" "$STATE_FILE" 2>/dev/null | tail -1 | cut -d: -f2)
CURRENT=${CURRENT:-0}
echo "${CHECK_KEY}:$((CURRENT + 1))" >> "$STATE_FILE"

# Read:
grep "^${CHECK_KEY}:" "$STATE_FILE" 2>/dev/null | tail -1 | cut -d: -f2
```

### 2. Update `SKILL.md` — Renumber phases and add CI Gate

Renumber to avoid sub-letter confusion:

| Current | New | Name |
|---------|-----|------|
| Phase 4 | Phase 4 | Verification (local checks) |
| Phase 5 | Phase 5 | Completion (commit, push, resolve threads) |
| — | **Phase 6** | **CI Gate (NEW)** |
| Phase 6 | Phase 7 | Shepherd |

Phase 6 content:

```markdown
## Phase 6: CI Gate (MANDATORY)

After pushing in Phase 5, monitor CI until green or exit condition.

Follow the bounded CI retry loop from `references/ci-gate.md`.

1. Wait for checks to appear on HEAD_SHA (2 min registration timeout)
2. Wait for all checks to reach terminal status (15 min settle timeout)
3. Classify failures: ACTIONS_FIXABLE (Actions run + job name match + local command) vs EXTERNAL
4. For ACTIONS_FIXABLE failures:
   a. Fetch truncated failure logs (300 lines, grep for errors)
   b. Diagnose — prioritize PR-modified files, expand if needed
   c. Fix the code, verify with local command (timeout 120s)
   d. Commit "fix(ci): resolve <check-name> failure"
   e. Push, wait 60s grace period, update HEAD_SHA and LAST_TIMESTAMP
   f. Return to step 1
5. Max 3 fix attempts per check name (persisted to state file, keyed by name not SHA)
6. Total timeout: 30 minutes

Phase 5 MUST complete successfully (exit 0) before Phase 6 runs.
Phase 6 exit states all proceed to Phase 7 — CI_GREEN/CI_EXTERNAL_ONLY cleanly,
CI_TIMEOUT/CI_ESCALATION/CI_NO_CHECKS with a status note.
```

### 3. Update `shepherd.md` — Add CI check to WATCHING state

Add CI monitoring alongside comment monitoring. The shepherd delegates to the same `references/ci-gate.md` algorithm but with reduced limits (max 2 additional attempts) and reads prior attempt state from the shared state file.

```markdown
### WATCHING (add after comment check, before route)

4. **Check CI status** (same approach as Phase 6, using commit check-runs API):
   ```bash
   HEAD_SHA=$(git rev-parse HEAD)

   # Get all check runs for current SHA
   CHECK_RUNS=$(gh api "repos/$OWNER/$REPO/commits/$HEAD_SHA/check-runs" \
     --jq '{
       total: .total_count,
       completed: [.check_runs[] | select(.status == "completed")] | length,
       failing: [.check_runs[] | select(.conclusion != null and .conclusion != "success" and .conclusion != "neutral" and .conclusion != "skipped")]
     }')

   PENDING=$(($(echo "$CHECK_RUNS" | jq '.total') - $(echo "$CHECK_RUNS" | jq '.completed')))
   FAILING=$(echo "$CHECK_RUNS" | jq '.failing | length')
   ```
   - If PENDING > 0 → continue watching (checks still running)
   - If FAILING > 0:
     a. Classify using ci-gate.md decision matrix (same lookup table, same 3-condition test)
     b. Read attempt counts from shared state file ($STATE_FILE)
     c. If ACTIONS_FIXABLE and total attempts < 5 (Phase 6's 3 + shepherd's 2):
        - Fetch truncated logs, fix, verify locally (timeout 120s), commit, push
        - Wait 60s grace period
        - Update HEAD_SHA, LAST_TIMESTAMP, state file
     d. If attempts exhausted → note in POST_SUMMARY, continue watching for comments
   - If all pass → no action needed
```

**Concurrency note:** Phase 6 always completes before shepherd starts. They never run simultaneously.

### 4. Update `references/verification.md` — Make failures blocking

Replace error-swallowing commands with proper detection and blocking exit:

```bash
CHECKS_FAILED=0

# Detect available scripts via package.json (reliable across npm versions)
if jq -e '.scripts.lint' package.json >/dev/null 2>&1; then
  echo "Running lint..."
  if timeout 120 npm run lint; then echo "Lint: PASS"; else echo "Lint: FAIL"; CHECKS_FAILED=1; fi
fi

if jq -e '.scripts.typecheck' package.json >/dev/null 2>&1; then
  echo "Running typecheck..."
  if timeout 120 npm run typecheck; then echo "Typecheck: PASS"; else echo "Typecheck: FAIL"; CHECKS_FAILED=1; fi
elif jq -e '.scripts["type-check"]' package.json >/dev/null 2>&1; then
  echo "Running type-check..."
  if timeout 120 npm run type-check; then echo "Typecheck: PASS"; else echo "Typecheck: FAIL"; CHECKS_FAILED=1; fi
fi

if [ "$CHECKS_FAILED" -ne 0 ]; then
  echo "⚠️ Local checks failed. Fix all failures before proceeding to commit."
  echo "Return to Phase 3 (Resolution) to fix, then re-run Phase 4."
  exit 1  # BLOCKING — Phase 5 must not run if this exits non-zero
fi
```

Note: stderr is NOT suppressed — error output is needed for diagnosis. All commands wrapped in `timeout 120` to prevent hangs.

**Update Phase 4/5 contract in SKILL.md:** "Phase 5 MUST NOT run if Phase 4 verification exits non-zero."

## Files Touched

| File | Change |
|------|--------|
| `references/ci-gate.md` | **New** — bounded CI retry loop with dual-API approach, decision matrix, lookup table |
| `SKILL.md` | Renumber phases (5→5, 6→CI Gate, 7→Shepherd), add Phase 6, update Phase 4/5 contract |
| `shepherd.md` | Add CI check to WATCHING loop using check-runs API + shared state |
| `references/verification.md` | Initialize vars, jq-based script detection, blocking exit, timeout wrapping |

## Risks & Mitigations

| Risk | Mitigation |
|------|-----------|
| Log output too large for context | Truncate to 300 lines, grep for errors (50 lines max) |
| Stale/no check results after push | Appearance wait (2 min), 60s grace period after each push |
| CI fix introduces new failures | Re-polls from step 1 after every push; per-check attempt counter (keyed by name, not SHA) |
| External checks misclassified as fixable | Three-condition matrix: Actions app + job name match + local command verified via package.json |
| Phase 6 and shepherd fight over same check | Sequential execution (Phase 6 completes before shepherd), shared state file |
| GitHub API rate limits | 60s poll interval = ~30 calls in 30 min; check-runs API is lightweight |
| Checks never settle (queued runners) | 15-min settle timeout separate from 30-min total timeout |
| CHECK_NAME with special characters | Normalized via `tr '/:. ' '____'` before state file writes |
| Local command hangs | All local commands wrapped in `timeout 120` |
| CI failures outside PR-modified files | File scope is a heuristic, not a constraint — expand when evidence points elsewhere |
