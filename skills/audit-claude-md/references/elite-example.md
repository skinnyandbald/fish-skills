# Elite CLAUDE.md Example

This is a reference example of a high-scoring CLAUDE.md (82/90). Derived from a production Next.js/tRPC/Supabase project. Use this as a comparison point when auditing or as a template for building a new CLAUDE.md.

---

```markdown
# CLAUDE.md

## Project Overview

[ProjectName] is a platform for [what it does] built for [who it's for]. Built with Next.js 16, React 19, tRPC, and Supabase.

**Current state:** [Brief status — what's working, what's in progress]

## Behavior Directives

<avoid_over_engineering>
Only make changes that are directly requested or clearly necessary. Keep solutions simple and focused.
- Don't add features, refactor code, or make "improvements" beyond what was asked
- Don't add error handling for scenarios that can't happen. Trust internal code and framework guarantees. Only validate at system boundaries
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

| Command                              | Use When                                |
|--------------------------------------|-----------------------------------------|
| `vitest run`                         | Default — parallel unit tests (no DB)   |
| `npm run test:integration`           | Run DB integration tests (sequential)   |
| `vitest run path/to/file.test.ts`    | Specific test file                      |
| `npm run typecheck`                  | Full TypeScript type check              |
</run_tests_in_background>

<frontend_aesthetics>
Avoid the "AI slop" aesthetic. Make creative, distinctive frontends.
- Typography: Avoid Inter/Roboto/Arial — choose distinctive, beautiful fonts
- Color: Dominant colors with sharp accents. Avoid cliched purple gradients on white
- Motion: CSS-only where possible, Motion library for React
- Backgrounds: Layer gradients, patterns, and depth — never default to solid colors
</frontend_aesthetics>

<parsing_and_debugging>
Before implementing parsers, research npm packages first (compare top 3). Prefer libraries over regex for nested structures.

When debugging produces 3+ failed iterations on the same problem, stop: reconsider approach, check for existing libraries, or simplify requirements.
</parsing_and_debugging>

## Quick Reference

### Bug Fix Process (CRITICAL — TDD Required)

1. **Write a failing test FIRST** — reproduce the bug
2. **Verify test fails** — confirm it catches the bug
3. **Fix the implementation** — minimal change
4. **Verify test passes** — confirm the fix works

**DO NOT fix first then write a test.** The test must fail before the fix.

### Coding Standards
- TypeScript strict mode — no `any` types
- Follow existing code patterns in the project
- TDD practices — write tests BEFORE implementation (see [TDD Guide](docs/claude/tdd.md))
- Zod for runtime validation (both input AND output schemas)
- Always read files before modifying them

### UI Style Guide
- **Cursor pointer** — handled globally in CSS. Do NOT add `cursor-pointer` to individual elements
- **Hover states** — all interactive elements need visible hover feedback
- **Accessibility** — `aria-label` on icon-only buttons

### Testing
- TDD is mandatory — see [TDD Guide](docs/claude/tdd.md)
- Unit tests: Vitest. E2E: agent-browser
- Coverage minimum: 80% for new code

## Detailed Guides

| Topic | Description |
|-------|-------------|
| [Architecture](docs/claude/architecture.md) | Directory structure, path aliases, pipeline |
| [TDD Guide](docs/claude/tdd.md) | Red-Green-Refactor cycle, acceptance criteria |
| [TDD Examples](docs/claude/tdd-examples.md) | Code examples for tRPC, React, utilities |
| [Testing Setup](docs/claude/testing-setup.md) | Vitest, agent-browser, CI/CD configuration |
| [Best Practices](docs/claude/best-practices.md) | Database, tRPC, React, error handling |
| [Code Review Checklist](docs/claude/code-review-checklist.md) | Naming, Zod, error handling, testing |
| [Security](docs/claude/security.md) | Input validation, auth, security review |
| [AI Agent Instructions](docs/claude/ai-agent-instructions.md) | Parallel agents, PR resolution, worktrees |

## Commands

```bash
npm run dev              # Dev server (Turbopack)
npm run build            # Production build
npm run lint             # Biome linter
npm run lint:fix         # Fix linting issues
npm run format           # Format with Biome
npm run typecheck        # TypeScript type check
npm run test             # Vitest watch mode
npm run test:run         # Vitest single run (CI)
```

## Tech Stack

- **Framework:** Next.js 16 (App Router) + React 19
- **Language:** TypeScript 5.9 (strict mode)
- **Styling:** Tailwind CSS 4 + Radix UI primitives
- **API:** tRPC 11 with TanStack Query
- **Validation:** Zod 4
- **Database:** Supabase (PostgreSQL)
- **Linting:** Biome (primary) + ESLint (secondary, specific rules)
- **Testing:** Vitest + agent-browser + Testing Library

## Path Alias

Use `~/` for cross-directory imports from `src/`. Prefer relative imports for same-directory modules.

## Learnings

Before starting work, check `.claude/learnings/` for relevant past problem-solving narratives.

**IMPORTANT:** After solving any non-trivial debugging session, invoke `/capture-learning` before moving on.

## Git Worktrees

**Worktree directory:** `.github/worktrees/` (already gitignored)

After writing a plan, give the user a single copy-paste block:
```bash
git worktree add .github/worktrees/<feature> -b feat/<feature> main && \
cd .github/worktrees/<feature> && npm install && claude
```

## Git Workflow

- Branch from `main` for features
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`, `test:`
- Pre-commit hooks run Biome on staged files
```

---

## What Makes This Elite

**Foundations (20/20):** Project overview, versioned tech stack, full commands, project structure via architecture guide.

**Standards (18/18):** TypeScript strict mode, Biome+ESLint specified, TDD mandatory with 80% coverage, conventional commits, path aliases.

**Behavior Configuration (16/18):** Named XML-style directives for over-engineering prevention, action bias, background processes with command table, TDD bug fix process, debugging guardrails. (Lost 2 points: could add more specific iteration limits.)

**Architecture (14/14):** 9 linked guide files in `docs/claude/`, main file ~120 lines, critical warnings in bold/caps.

**Memory & Learning (7/7):** `.claude/learnings/` directory, explicit `/capture-learning` trigger after debugging.

**Advanced (7/13):** Frontend aesthetics rules, security guide linked, worktree workflow. (Lost points: no MCP configuration guidance, no explicit performance budgets.)
