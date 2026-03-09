# Plan: Audit Rubric v4 + Elite Example Rewrite

**Status:** Reviewed (critic-review complete)
**Scope:** `skills/audit-claude-md/` (3 files)
**Source:** Brainstorming session comparing current elite-example.md (88/96, placeholder template) against a production CLAUDE.md (~91/96 on v3 rubric). The production file demonstrates patterns the rubric doesn't currently reward: quality gates workflows and code-enforced vs prompt-enforced separation.

## Context

The `audit-claude-md` skill scores CLAUDE.md files against a rubric and uses an elite example for auditor calibration. Two problems:

1. **Elite example is a placeholder template** — `[ProjectName]`, `[what it does]`. Real patterns are more instructive for calibration. The current example scores 88/96 but gets 0/5 on MCP/tools and lacks workflow orchestration patterns.

2. **Rubric doesn't reward two high-value patterns** found in production CLAUDE.md files:
   - **Quality gates workflow** — canonical step sequence (plan→implement→test→review→simplify→ship) that prevents skipping steps
   - **Code-enforced vs prompt-enforced separation** — explicitly stating which rules are enforced by hooks/CI vs which need CLAUDE.md compliance, reducing redundancy per ETH Zurich findings

Because the elite example has gravitational pull on auditor recommendations regardless of rubric items, any pattern shown in the example must also be in the rubric. Otherwise the auditor implicitly penalizes files missing patterns that aren't even scored.

## Decision: Add rubric items, not "optional" markers

Options considered:
- (A) Include patterns as optional in elite example — rejected: "optional" creates scoring ambiguity, auditor penalizes implicitly anyway
- (B) Include only broadly applicable patterns — rejected: both quality gates and code-vs-prompt separation are broadly applicable
- (C) Add rubric items for both, show at full strength in elite example — **selected**

## Changes

### 1. Rubric (scoring-rubric.md) — v3 → v4

**Update version header to v4 and revise preamble to describe the new items.**

**New items:**

| Item | Category | Points | What to Look For |
|------|----------|--------|------------------|
| **Quality gates workflow** | Behavior Configuration (25→29) | 4 | Canonical step sequence from implementation through review/validation to commit. Defined ordering that prevents skipping steps (e.g., plan→implement→test→review→simplify→ship). Higher value when steps reference specific tools or skills. Scores the overarching development lifecycle, NOT the TDD fix cycle (scored separately under Bug fix process). Partial credit for informal "before committing, run X" without defined sequence. Zero credit for quality gates that list steps without connecting them to specific tools or commands. |
| **Code-enforced vs prompt-enforced separation** | Architecture (19→22) | 3 | Explicitly states which rules are enforced by hooks/CI/linting (and therefore don't need CLAUDE.md compliance) vs which require prompt-level directives. Scores boundary clarity only, NOT whether hooks themselves are comprehensive. Reduces redundancy per ETH Zurich finding that restated information adds 14-22% inference cost. Partial credit for mentioning hooks exist without clarifying which rules they cover. |

**Updated totals:**
- Behavior Configuration: 25 → **29** (added quality gates 4pts)
- Architecture: 19 → **22** (added code-vs-prompt 3pts)
- **Total: 96 → 103**

**Tier thresholds (scaled proportionally from v3, factor = 103/96 ≈ 1.073x):**

Rounding policy: multiply v3 boundary by 1.073, round to nearest integer. Boundaries chosen to preserve the approximate percentage cutoffs from v3 (23% / 45% / 67% / 83% / 84%+).

| v3 Boundary | × 1.073 | Rounded | Tier |
|-------------|---------|---------|------|
| 0-21 | 0-22.5 | 0-23 | Bare Minimum |
| 22-43 | 23.6-46.1 | 24-46 | Functional |
| 44-64 | 47.2-68.7 | 47-69 | Strong |
| 65-80 | 69.7-85.8 | 70-86 | Advanced |
| 81-96 | 86.9-103 | 87-103 | Elite |

**New positive signals to add:**
- Numbered/ordered workflow steps with specific tool references
- Explicit "enforced by hooks, not CLAUDE.md" callouts
- Explicit enforcement mechanism labels (e.g., "enforced by CI", "enforced by pre-commit hook")

**New red flags to add:**
- CLAUDE.md restates rules already enforced by pre-commit hooks or CI (redundancy)
- Quality gates defined but not connected to specific tools or commands (ceremony without substance)

**Research Basis update:** Add note that quality gates workflow and code-vs-prompt separation are derived from production observation of effective CLAUDE.md files, not from the ETH Zurich study. The ETH Zurich findings about redundancy cost (14-22%) support the code-vs-prompt item's rationale.

### 2. Elite Example (elite-example.md) — full rewrite

**Source:** Anonymized version of a production CLAUDE.md.

**Anonymization policy:**

| Category | Rule | Examples |
|----------|------|---------|
| Project identity | Replace with placeholders | `[ProjectName]`, `[description]` |
| Common commodity tools | Keep as-is | Sentry, Vitest, Biome, Tailwind |
| Uncommon vendor-specific tools | Generalize to category | Beads → "CLI task tracker", Inngest → `[BackgroundJobSystem]` |
| Repo paths & internal commands | Normalize to generic equivalents | `e2e/agent-browser/*.sh` → `e2e/*.sh` |
| DB-specific footguns | Generalize pattern, keep CRITICAL style | Prisma → "DB migration tool" |
| URLs, team names, domains | Remove or genericize | Strip all |
| Workflow identifiers | Preserve structure, normalize names | Skill names → generic `/review`, `/simplify` |

**Re-identification review pass:** After anonymization, verify that no combination of remaining tool names, workflow structures, or section ordering uniquely identifies the source project.

**Sections to preserve (with anonymization):**
1. Project Overview (compact stack line)
2. Task Management (CRITICAL) — generalized CLI tracker
3. Behavior Directives (XML-tagged, same as current)
4. Quick Reference (Testing & TDD, Coding Standards, UI Style Guide, Security)
5. Guides (inline link format, not table — more concise)
6. Commands (compact one-liner format)
7. Learnings
8. Tools & MCPs (brief but present — addresses current 0/5 gap)
9. Git Worktrees
10. **Quality Gates** (canonical workflow — NEW rubric item)
11. Git Workflow
12. **Hooks** (code-enforced vs prompt — NEW rubric item)

**Expected score against v4 rubric:** Target Elite tier (87+) but not perfect. Preferred range: 94-99/103.
- Will lose 1-2 points on MCP comprehensiveness (brief but not detailed)
- Will lose 0-1 on debugging guardrails (has iteration rule but no explicit "stop and ask user")
- Exact score determined by post-anonymization scoring, not pre-set

**Annotation format:** Per-check scoring with evidence references. Each annotation must include:
- Item name
- Score (X/Y)
- Evidence: section reference or brief quote from the example

Example: `Quality gates workflow 4/4 — Section "Quality Gates" defines ordered 5-step sequence (plan→implement→test→review→simplify→ship) referencing specific tools at each step.`

**Update header** to reflect new score and v4 total. Rewrite "What Makes This Elite" with per-check breakdown against all v4 categories.

### 3. SKILL.md — update report template

- Overall score: `/96` → `/103`
- Behavior Configuration: `/25` → `/29`
- Architecture: `/19` → `/22`
- Potential score line: `/96` → `/103`
- **Tier thresholds in report template** (if referenced): update to match v4 boundaries
- Audit all hardcoded references to category names, totals, and tier interpretation — not just `/96` strings

## Implementation Order

1. Update `scoring-rubric.md` — version header v4, add 2 items with disambiguation language, update category totals, scale tiers with documented rounding, add signals/flags, update Research Basis
2. **Design checkpoint:** Draft anonymized elite example outline, verify both new items remain clearly scorable after anonymization, before finalizing rubric wording
3. Rewrite `elite-example.md` — apply anonymization policy, run re-identification review, add v4 annotations with evidence references
4. Update `SKILL.md` — totals, tier thresholds, any other hardcoded references
5. **Validation:** Score the current v3 elite example (placeholder) against v4 rubric to verify backward-compatible scoring (existing files shouldn't score dramatically worse on unchanged items)
6. Verify: re-read all 3 files, confirm math (category sums = 103, elite annotations sum to claimed total)
7. Commit atomically (all 3 files in one commit for clean revert) and push

## Risks

- **Rubric inflation:** Going from 96→103 (v3→v4), or 90→103 cumulatively across v2→v3→v4 in one session. Mitigated: each item was justified independently, not added for round-number aesthetics. The v3 changes (coherence + compliance phrasing) and v4 changes (quality gates + code-vs-prompt) address distinct gaps.
- **Anonymization leakage:** Mitigated by principled anonymization policy with re-identification review pass. Commodity tools stay; vendor-specific tools generalize.
- **Elite example too perfect:** Target 94-99 range, not 100+. Annotation explicitly shows where it loses points, demonstrating that even elite files have gaps.
- **Rubric-fitting:** Mitigated by validation step (scoring a second file) and design checkpoint before finalizing rubric wording.
