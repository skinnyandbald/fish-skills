# /prepare-plan-for-review

Generate a copy-paste-ready peer review prompt for your implementation plan, tailored to your project's tech stack.

## Usage

```
/prepare-plan-for-review docs/plans/my-feature.md
/prepare-plan-for-review docs/plans/my-feature/
/prepare-plan-for-review
```

If no path is provided, auto-detects recent plan files and lets you pick.

## What It Does

1. **Resolves the plan** — finds the file/directory to review
2. **Detects your tech stack** — reads `package.json`, `tsconfig.json`, config files, etc. Caches the result at `.claude/stack-profile.md`
3. **Generates a review prompt** — a ready-to-copy prompt that asks another AI model for a comprehensive TDD implementation analysis

The output prompt covers:
- Test coverage assessment (unit, integration, E2E)
- TDD cycle compliance (red-green-refactor)
- Stack-specific best practices
- Actionable recommendations with code examples

## Prerequisites

- Must be in a project with a `package.json` or similar config files for stack detection

## Customization

After first run, edit `.claude/stack-profile.md` to tweak the detected stack, analysis scope, or best practices. The skill uses the cached profile on subsequent runs.

## Workflow

Pairs with `/analyze-plan-feedback`:

```
1. /prepare-plan-for-review    → generates the review prompt
2. Paste into Cursor/ChatGPT   → get feedback from other models
3. /analyze-plan-feedback       → synthesize feedback from multiple reviewers
```
