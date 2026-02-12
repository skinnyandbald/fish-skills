# /analyze-plan-feedback

Synthesize peer review feedback from multiple AI reviewers on an implementation plan. Prioritize, resolve conflicts, and produce actionable next steps.

## Usage

```
/analyze-plan-feedback docs/plans/my-feature.md
/analyze-plan-feedback docs/plans/my-feature.md 2     # 2 reviewers
/analyze-plan-feedback 2                               # auto-detect plan, 2 reviewers
/analyze-plan-feedback                                 # auto-detect plan, 3 reviewers
```

## What It Does

1. **Resolves the plan** — finds the file or auto-detects from recent changes
2. **Collects feedback** — asks you to paste feedback from each reviewer (default: 3)
3. **Analyzes** — validates technical accuracy, classifies priority, resolves conflicts
4. **Produces** — prioritized action items with effort estimates

## Output

```markdown
## Critical (must address)
- [ ] Item with effort estimate and source

## High Priority
- [ ] Item with effort estimate and source

## Reviewer Agreement Matrix
| Topic | Reviewer 1 | Reviewer 2 | Verdict |
```

## Prerequisites

- None. Works with any text-based plan and pasted feedback.

## Workflow

Best used after `/prepare-plan-for-review`:

```
1. /prepare-plan-for-review    → generates review prompt
2. Paste into 2-3 AI models    → collect feedback
3. /analyze-plan-feedback       → synthesize and prioritize
4. Apply feedback to plan       → optional, skill offers to help
```
