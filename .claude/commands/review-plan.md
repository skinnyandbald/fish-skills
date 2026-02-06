---
name: review-plan
description: Multi-model peer review of an implementation plan (Gemini, Opus, ChatGPT in parallel)
argument-hint: "[path/to/plan.md]"
---

# Multi-Model Plan Peer Review

## Plan to Review

$ARGUMENTS

## Resolve the plan file

If `$ARGUMENTS` contains a file path, read that file now. If no argument was provided, ask which plan to review.

## Task

You are an AI development consultant specializing in Test-Driven Development implementation. Conduct a comprehensive peer review of this plan by running **three parallel analyses** using `vibe-tools`.

Launch all three in parallel using the Bash tool with `run_in_background=true`:

### 1. Gemini Analysis (codebase-aware)

```bash
vibe-tools repo "You are an AI development consultant specializing in TDD implementation. Conduct a comprehensive analysis of this plan:

ANALYSIS SCOPE:
- Backend: tRPC procedures, database operations, authentication flows
- Frontend: React Server Components, Client Components, form validation with Zod
- Integration: End-to-end type safety, API contract validation

REQUIRED DELIVERABLES:
1. Test Coverage Assessment (30-40%): Unit, integration, E2E coverage gaps with specific file references
2. TDD Cycle Compliance (25-30%): Red-Green-Refactor adherence per feature
3. Stack Best Practices (25-30%): TypeScript strict mode, Zod validation, schema patterns
4. Actionable Recommendations (15-20%): Specific code examples for missing tests

DO NOT test the actual codebase - give feedback on the proposed plan only.

Plan: [PASTE PLAN CONTENT HERE]" --provider gemini
```

### 2. Opus Analysis (deep reasoning)

```bash
vibe-tools ask "You are a senior staff engineer reviewing an implementation plan. Focus on:
1. Complexity and edge cases the plan misses
2. Security and performance implications
3. Failure modes and error handling gaps
4. Whether the TDD approach is sound
5. Architecture risks

Be specific - reference plan sections and suggest concrete improvements.

Plan: [PASTE PLAN CONTENT HERE]" --provider anthropic --model claude-opus-4-6 --reasoning-effort high
```

### 3. ChatGPT Analysis (production perspective)

```bash
vibe-tools ask "You are a production engineer reviewing an implementation plan before it ships. Focus on:
1. Operational concerns (monitoring, alerting, rollback)
2. Database migration safety
3. Deployment strategy gaps
4. Load and scale considerations
5. What will break at 3am

Be direct and practical. No theoretical concerns - only things that matter in production.

Plan: [PASTE PLAN CONTENT HERE]" --provider openai --model o3
```

**IMPORTANT:** Replace `[PASTE PLAN CONTENT HERE]` with the actual plan content in each command. Use `--save-to` to capture each output to a temp file if the plan is very long.

## After All Three Complete

Consolidate the three reviews into a single structured assessment:

1. **Consensus** - Points all three agree on (highest confidence)
2. **Conflicts** - Where reviewers disagree (needs judgment call)
3. **Critical Issues** - Anything flagged as blocking by any reviewer
4. **Top 5 Improvements** - Prioritized by impact, with effort estimates
5. **Risk Matrix** - Highest-risk areas mapped to mitigation steps

Save the consolidated feedback so it can be fed into `/analyze-feedback` if the user wants deeper analysis.
