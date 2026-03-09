# Elite CLAUDE.md Example

This is a reference example of a high-scoring CLAUDE.md. Anonymized from a production Next.js/tRPC/Supabase project. Use this as a comparison point when auditing or as a template for building a new CLAUDE.md.

---

```markdown
# CLAUDE.md

## Project Overview

[ProjectName] is a platform for [what it does] built for [who uses it]. Built with Next.js 16, React 19, tRPC, and Supabase.

**Stack:** Next.js 16 (App Router), React 19, TypeScript 5.9 (strict), Tailwind CSS 4 + Radix UI, tRPC 11 + TanStack Query, Zod 4, Supabase (PostgreSQL), Biome, Vitest + agent-browser + Testing Library, Sentry, [BackgroundJobSystem]. Path alias: `~/` for `src/` imports, relative for same-directory.

## Task Management (CRITICAL)

**Always use [task-cli]** (`task create`, `task update`, `task close`, `task sync`) for all task tracking. **Never** use TodoWrite, TaskCreate, or markdown files.

```bash
task ready                              # Find unblocked tasks
task update <id> --status=in_progress   # Claim task
# ... implement & test ...
task close <id>                         # Complete task
task sync                               # Sync with git (run at session end)
```

Task data is committed to git. **Do NOT add task data directory to `.gitignore`** — breaks sync.

**Session Close:** run Quality Gates → `git status` → `git add` → `task sync` → `git commit` → `git push`.

## Behavior Directives

<avoid_over_engineering>
Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused.
- Don't add features, refactor code, or make "improvements" beyond what was asked
- Don't add error handling for scenarios that can't happen. Only validate at system boundaries
- Don't create abstractions for one-time operations. Don't design for hypothetical future requirements
- Write general-purpose solutions — implement actual logic, not hard-coded values for specific test inputs
- Reuse existing abstractions where possible (DRY principle)
</avoid_over_engineering>

<cleanup>
Clean up any temporary files, scripts, or helpers at the end of the task.
</cleanup>

<default_to_action>
By default, implement changes rather than only suggesting them. Infer the most useful likely action and proceed, using tools to discover missing details instead of guessing.
</default_to_action>

<run_tests_in_background>
Always use `run_in_background=true` for test and typecheck commands, then check with `TaskOutput`.
Commands: `vitest run` (unit), `npm run test:integration` (DB), `vitest run path/to/file.test.ts` (specific), `npm run typecheck` (types).
</run_tests_in_background>

<frontend_aesthetics>
Avoid the "AI slop" aesthetic. Make creative, distinctive frontends.
- Typography: Avoid Inter/Roboto/Arial — choose distinctive, beautiful fonts
- Color: Dominant colors with sharp accents. Avoid cliched purple gradients on white
- Motion: CSS-only where possible, Motion library for React. Focus on high-impact page load reveals
- Backgrounds: Layer gradients, patterns, and depth — never default to solid colors
- Vary between light/dark themes. Interpret creatively for the context.
</frontend_aesthetics>

<parsing_and_debugging>
Before implementing parsers, research npm packages first (compare top 3). Prefer `cheerio` over regex for nested structures. Write edge-case tests BEFORE implementing.
After 3+ failed debugging iterations on the same problem, stop: rethink, simplify, or use an existing library.
</parsing_and_debugging>

## Quick Reference

### Testing & TDD (CRITICAL)

TDD is mandatory. Write a failing test FIRST, verify it fails, fix minimally, verify it passes. **Never fix first then write a test.**
- Unit: Vitest. E2E: agent-browser (NOT Playwright)
- E2E files: `e2e/*.sh`, run with `npm run test:e2e:agent:<name>`. Semantic selectors via `npx agent-browser find`
- Coverage minimum: 80% for new code
- Type safety and `noExplicitAny` are enforced by hooks (Biome + typecheck pre-commit) — do not rely on CLAUDE.md for these

### Coding Standards
- Follow existing code patterns in the project
- Zod for runtime validation (both input AND output schemas)
- Always read files before modifying them
- Sentry is mandatory — all errors captured with context (see [Sentry Guide](docs/claude/sentry.md))

### UI Style Guide
- **Cursor pointer** — handled globally in CSS. Do NOT add `cursor-pointer` to elements
- **Hover states** — all interactive elements need visible hover feedback
- **Accessibility** — `aria-label` on icon-only buttons

### Security
- Before merging PRs, review for input validation, auth checks, and secrets exposure — see [Security Guide](docs/claude/security.md)
- Zod validation at all API boundaries (tRPC `.input()`)
- Never concatenate user input into raw SQL

## Guides
[Architecture](docs/claude/architecture.md) · [TDD](docs/claude/tdd.md) · [TDD Examples](docs/claude/tdd-examples.md) · [Testing Setup](docs/claude/testing-setup.md) · [Best Practices](docs/claude/best-practices.md) · [Code Review](docs/claude/code-review-checklist.md) · [Security](docs/claude/security.md) · [AI Agents](docs/claude/ai-agent-instructions.md) · [Sentry](docs/claude/sentry.md)

## Commands

```bash
npm run dev | build | lint | lint:fix | format | typecheck | test | test:run | test:e2e
npx db-migrate generate     # Regenerate client after schema changes
npx db-migrate deploy       # Apply migrations
```

**DB Migrations (CRITICAL):** After ANY schema change, run BOTH `db-migrate generate` AND `db-migrate deploy`. The app will crash if out of sync. When updating `@biomejs/biome`, also update `.github/workflows/ci.yml`.

## Learnings

Check `.claude/learnings/` before starting work. After solving non-trivial debugging or discovering contradicted assumptions, invoke `/capture-learning`.

## Tools & MCPs

Prefer CLI tools over MCPs: `gh` for GitHub, `npx db-migrate` for DB. User-level MCPs (episodic-memory, sequential-thinking) are fine.

## Git Worktrees

**Directory:** `.github/worktrees/` (gitignored). CWD is set at launch — `cd` in Bash doesn't change it.

**Copy-paste block for worktree creation:**
```bash
git worktree add .github/worktrees/<name> -b feat/<name> main && \
cd .github/worktrees/<name> && npm install && claude
```

Do NOT `cd` into a worktree from the current session. Each worktree = independent branch; don't overlap files across parallel sessions. Run `git worktree list` before creating.

## Quality Gates

### Canonical Workflow (Do NOT skip or reorder)
1. Draft plan (if non-trivial) → `/review-plan` → address feedback → finalize
2. Implement → run tests
3. `/code-review` — review against plan and standards
4. `/simplify` — review for reuse/quality/efficiency. Re-run until clean
5. Commit → create PR → push

After TDD bug fix cycle, resume at step 3.

**Pre-PR:** `/simplify` is mandatory before every PR. No exceptions. If suggestions conflict with `<avoid_over_engineering>`, the directive wins.

**Plan Review:** `/review-plan` after drafting plans. **Skip only if:** single-function change in one file, no new logic/schema/API/auth, trivial modification, or pure docs/config.

## Git Workflow

- Branch from `main` for features. Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- Pre-commit hooks run Biome + typecheck on staged files. CI runs lint + typecheck + tests on PRs
- **MANDATORY: Follow the Quality Gates workflow above before committing.**

## Hooks (Enforced by Code, Not Prompts)

These rules are enforced by pre-commit and Claude Code hooks — no CLAUDE.md compliance needed:
- **Type safety:** `noExplicitAny: "error"` (Biome PostToolUse + pre-commit)
- **Linting:** `biome check` (PostToolUse on every Edit/Write + pre-commit)
- **Typecheck:** `tsc --noEmit` (PreToolUse on `git commit` + pre-commit)
```

---

## What Makes This Elite

**Foundations (12/12):** Project overview 2/2 — concise description with audience. Tech stack deviations 2/2 — Biome as primary linter and [BackgroundJobSystem] are genuinely non-standard. Runnable commands 5/5 — full command set including DB migrations. Non-standard tooling 3/3 — [task-cli] with copy-paste commands, agent-browser for E2E, `db-migrate` with critical warning.

**Standards (14/14):** Convention deviations 3/3 — "Zod for input AND output", "NOT Playwright", "Sentry is mandatory." Testing approach 5/5 — TDD mandatory, Vitest + agent-browser, 80% coverage, E2E file locations. Git workflow 3/3 — conventional commits, pre-commit hooks, CI on PRs. Path/import conventions 3/3 — `~/` alias documented.

**Behavior Configuration (28/29):** Behavior directives 7/7 — XML-tagged sections for over-engineering prevention, action bias, cleanup. Bug fix process 5/5 — "Write a failing test FIRST... Never fix first then write a test." Background processes 5/5 — `run_in_background=true` instruction with command list. Debugging guardrails 4/5 — "After 3+ failed iterations, stop" but no explicit "ask the user" threshold. Quality gates workflow 4/4 — Section "Quality Gates" defines canonical 5-step sequence (plan→implement→test→review→simplify→ship) with specific tool references at each step, skip criteria, and conflict resolution rule. Agent compliance phrasing 3/3 — XML tags throughout, bold/caps for CRITICAL, imperative phrasing.

**Architecture (22/22):** Linked detailed guides 5/5 — 9 guides in `docs/claude/`. Conciseness 6/6 — ~150 lines, all detail in linked files. Critical warnings 5/5 — "CRITICAL" on Task Management, TDD, DB Migrations; "MANDATORY" on Quality Gates; "Do NOT" throughout. Section coherence 3/3 — Quality Gates referenced from Git Workflow ("MANDATORY: Follow the Quality Gates workflow"), Session Close protocol chains task sync + quality gates + git. Code-enforced vs prompt-enforced separation 3/3 — Section "Hooks (Enforced by Code, Not Prompts)" explicitly lists 3 rules enforced by hooks and states "no CLAUDE.md compliance needed."

**Memory & Learning (10/10):** Learnings directory 5/5 — `.claude/learnings/` referenced. Capture learning trigger 5/5 — "invoke `/capture-learning`" after non-trivial debugging or contradicted assumptions.

**Advanced (11/16):** Frontend/UI guidelines 3/3 — `<frontend_aesthetics>` section with specific typography, color, motion, and background rules. Security guidelines 4/4 — inline rules (Zod at API boundaries, no raw SQL, review for auth/secrets) plus linked Security Guide. Parallel workflows 4/4 — worktree with copy-paste block, CWD warning, parallel session guidance. MCP/tool configuration 0/5 — brief mention ("Prefer CLI over MCPs") but no list of configured MCPs or what each does.

**Total: 97/103 — Elite tier.** Lost 2 points: debugging guardrails (no explicit "ask user" cap), MCP/tool configuration (mentioned but not detailed).
