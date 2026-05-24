# Exit States

> Complete taxonomy of every exit state the PR resolution workflow can produce.
> Referenced by SKILL.md (Phase 0, Phase 6), ci-gate.md, and shepherd.md.

## Phase 0: Pre-Flight

| State | Severity | Meaning |
|-------|----------|---------|
| `PRE_FLIGHT_CONFLICT` | error | Base branch has conflicting changes — human must resolve |
| `PRE_FLIGHT_UNKNOWN_MERGE_STATE` | error | GitHub couldn't compute mergeability after polling — investigate manually |
| `PRE_FLIGHT_ERROR` | error | API or usage failure in mergeability check |

Phase 0 exits terminate the workflow immediately. No phases 1-7 run.

## Phase 6: CI Gate

| State | Severity | Meaning | Next |
|-------|----------|---------|------|
| `CI_GREEN` | success | All checks pass, PR is mergeable | Phase 7 |
| `CI_EXTERNAL_ONLY` | warning | Only non-fixable third-party checks failing, PR is mergeable | Phase 7 |
| `CI_NO_CHECKS` | warning | No check runs appeared for HEAD SHA after 2 minutes | Phase 7 |
| `CI_TIMEOUT` | warning | Total 30-min timeout or checks never reached terminal status | Phase 7 |
| `CI_ESCALATION` | error | 3+ fix attempts exhausted on the same check | Phase 7 |
| `CI_MERGE_CONFLICT` | error | Checks settled but a new merge conflict appeared during the run | Phase 7 |
| `CI_UNKNOWN_MERGE_STATE` | error | GitHub never finished computing mergeability | Phase 7 |
| `CI_MERGE_CHECK_ERROR` | error | `bin/check-mergeability` script or API failure | Phase 7 |

All Phase 6 exits proceed to Phase 7. `CI_GREEN` and `CI_EXTERNAL_ONLY` proceed cleanly. All others must be surfaced prominently in the final report — especially `CI_MERGE_CONFLICT` and `CI_UNKNOWN_MERGE_STATE`.

## Phase 7: Shepherd

| Reason | Severity | Meaning |
|--------|----------|---------|
| `merged` | success | PR was merged during monitoring |
| `closed` | warning | PR was closed without merging |
| `timeout` | warning | 2-hour wall-clock timeout reached |
| `human_review` | info | Human-only comments detected — shepherd exits for human attention |
| `escalation` | error | Same file flagged by bots 3+ times — infinite fix loop detected |
| `push_failed` | error | `git push` failed during a re-resolve iteration |
| `error` | error | Unrecoverable API or system error |

Shepherd exits terminate the workflow. The exit reason is included in the POST_SUMMARY comment on the PR and in the background agent's final output to the user.
