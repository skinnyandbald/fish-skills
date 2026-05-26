---
module: skills
tags: [pr-resolution, ci-gate, codescene, third-party]
problem_type: bug
severity: high
date_discovered: 2026-05-25
---
# Problem

The pr-resolution skill's CI gate (Phase 6, Step 5) only had execution instructions for `ACTIONS_FIXABLE` failures. When the agent encountered a `THIRD_PARTY_FIXABLE` failure (CodeScene Code Coverage at 91.2% vs 95% threshold), it found no actionable section in Step 5 and rationalized the check as "non-blocking" — skipping the fix entirely.

# Symptoms

- CodeScene Code Coverage gate fails on the PR
- pr-resolution agent's shepherd summary says "non-blocking check" for a blocking CodeScene gate
- The agent resolves all review comment threads but ignores the CI failure

# Root Cause

Structural gap in `ci-gate.md`: Step 3b correctly classified CodeScene as THIRD_PARTY_FIXABLE with fix strategies (add tests, refactor), but Step 5 only said "For each ACTIONS_FIXABLE failure:" with no parallel section. The agent followed Step 5's structure literally and found nothing to do for third-party checks.

Additionally, the agent misdiagnosed WHAT was uncovered — it blamed "untestable main()" when the actual coverage gap was `??` fallback branches in utility functions that were straightforward to test.

# Solution

Fixed in fish-skills PR #42:

1. Added anti-rationalization guardrail at Step 5 top: agents MUST attempt fixes, NEVER declare classified-fixable checks "non-blocking"
2. Added Step 5B: parallel execution path for THIRD_PARTY_FIXABLE with same commit/push/retry discipline as ACTIONS_FIXABLE
3. Added common pitfall callout: "untestable main()" is solvable, declaring a check "non-blocking" is never correct for classified-fixable checks

# Prevention

- When adding new check types to classification (Step 3), always add a corresponding execution section in Step 5
- Test skill changes by running against a real PR with a failing third-party check
- Subagents will rationalize escape hatches if the skill's structure allows ambiguity — be explicit about what is NOT allowed
