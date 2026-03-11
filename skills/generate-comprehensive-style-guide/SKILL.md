---
name: generate-comprehensive-style-guide
description: "Deep codebase analysis to generate or regenerate STYLE_GUIDE.md with full evidence citations. Use when /setup-ai's quick pass isn't thorough enough, when conventions have drifted, or after a major refactor. Produces a 17-section style guide citing specific files as evidence."
allowed-tools: Bash, Read, Grep, Glob, Write, LS
---

# Generate Comprehensive Style Guide

Perform a deep analysis of this codebase and generate (or regenerate) a **STYLE_GUIDE.md** file with full evidence citations for every convention.

> **When to use this vs `/setup-ai`:** `/setup-ai` generates a quick-pass style guide as part of initial project setup. This skill is for when you need the thorough version — 17 sections, every convention backed by specific file citations, inconsistencies flagged for human decision. Run this after `/setup-ai` for more depth, or independently when conventions have drifted.

## Rules

- **ONLY document patterns you actually observe in the code.** Never hallucinate or assume conventions.
- When patterns are inconsistent across the codebase, note the inconsistency and ask the user which convention to standardize on.
- Cite specific files as evidence: "Based on `src/services/UserService.ts`, `src/services/OrderService.ts`..."
- If a STYLE_GUIDE.md already exists, read it first and improve/incorporate rather than overwriting.

## Analysis Process

### Step 1: Detect Tech Stack

Search for dependency and config files:

| File | Stack |
|------|-------|
| `package.json` | Node.js / JavaScript / TypeScript |
| `tsconfig.json` | TypeScript specifically |
| `Gemfile` | Ruby |
| `requirements.txt`, `pyproject.toml`, `Pipfile` | Python |
| `go.mod` | Go |
| `Cargo.toml` | Rust |
| `composer.json` | PHP |
| `pom.xml`, `build.gradle` | Java / Kotlin |
| `*.csproj`, `*.sln` | C# / .NET |

Read the dependency file to identify: language version, framework and version, key libraries, build tools, testing framework, linter/formatter configuration.

### Step 2: Read Existing Configuration

Check for existing style/convention docs that define rules:
- `.eslintrc`, `.eslintrc.json`, `.eslintrc.js`
- `.prettierrc`, `.prettierrc.json`
- `.rubocop.yml`
- `.editorconfig`
- `biome.json`, `biome.jsonc`
- `ruff.toml`, `pyproject.toml` (ruff/black sections)
- `CLAUDE.md`, `AGENTS.md`, `.cursorrules`

These are authoritative — extract rules from them directly.

### Step 3: Sample Code for Patterns

Read 10-15 representative files — sample strategically, don't try to read everything:
- 3-4 "core" files (models, services, controllers, components)
- 2-3 test files
- 1-2 configuration/setup files
- 1-2 utility/helper files
- 1 entry point or router file

For each file, extract patterns for:
- **Naming:** camelCase, snake_case, PascalCase, kebab-case — for variables, functions, classes, files
- **File naming:** `*.service.ts`, `*_controller.rb`, `*.spec.js`, etc.
- **Imports:** ordering (stdlib → external → internal), style (named vs default), path aliases
- **Exports:** named exports, default exports, module.exports, barrel files
- **Error handling:** try/catch, Result types, error middleware, rescue blocks
- **Comments:** style, density, JSDoc/RDoc/docstrings
- **Types:** TypeScript strict mode, JSDoc annotations, Python type hints, none
- **Functions:** arrow vs declaration, parameter patterns, return style, async/await

### Step 4: Identify Testing Patterns

From the test files:
- Framework (Jest, Vitest, RSpec, pytest, Go testing, etc.)
- File naming convention (`*_test.rb`, `*.spec.ts`, `*.test.js`, `test_*.py`)
- Test structure (describe/it, test(), class-based, table-driven)
- Fixture/factory patterns
- Mocking approach (jest.mock, factory_bot, unittest.mock)
- Assertion style (expect().toBe, assert, should)
- Test file co-location vs separate directory

### Step 5: Check Git History (if available)

Run `git log --oneline -20` to see:
- Commit message format (conventional commits? Ticket refs? Free-form?)

Run `git branch -a | head -20` to see:
- Branch naming convention (feature/, fix/, etc.)

## Generate: STYLE_GUIDE.md

Write to the project root. Use this structure:

```markdown
# Coding Style Guide

> Auto-generated from codebase analysis on [date]. Review and adjust — these patterns were extracted from your existing code. Where patterns were inconsistent, the most common convention was chosen.

## Language & Formatting
[Indentation: tabs or spaces, width. Line length limit. Semicolons. Quote style. Trailing commas.]
**Evidence:** Based on [cite 2-3 representative files]

## Naming Conventions

### Files & Directories
[Pattern with real examples from the codebase]

### Variables & Functions
[camelCase / snake_case / etc. with real examples]

### Classes, Types & Interfaces
[PascalCase / etc. with real examples]

### Constants
[UPPER_SNAKE_CASE / etc.]

### Database
[Column naming (snake_case?), table naming (plural?), migration naming]

## Code Organization

### File Structure
[Standard order within a file: imports → types → constants → main logic → helpers → exports]
**Evidence:** [cite a file that exemplifies this pattern]

### Import Ordering
[Standard order: stdlib/framework → external packages → internal modules → relative imports]
[Are there path aliases? (@/ or ~/)]

## Function Patterns
[Arrow functions vs declarations. When to use each. Parameter destructuring. Return style. Async/await conventions.]
**Evidence:** [cite examples]

## Error Handling
[The standard error handling pattern — with a real code example copied from the codebase]

## Testing Standards

### File Naming
[Pattern: `*.spec.ts`, `*_test.rb`, etc.]

### Test Structure
[describe/it blocks, test() calls, class-based — with skeleton example]

### What to Test
[Unit tests for what, integration tests for what, what coverage is expected]

### Fixtures & Mocking
[How test data is set up. How external dependencies are mocked.]

## API Patterns
[Endpoint naming. Request validation. Response format (envelope? direct?). Error response format. Status code conventions.]

## Database Patterns
[Migration style. Model/schema definitions. Query conventions. Transactions.]

## Component Patterns (if frontend)
[Component file structure. Props patterns. State management. Styling approach.]

## Git Conventions
[Commit message format. Branch naming. PR description expectations.]

## Anti-Patterns — Do NOT Replicate
[Patterns found in the codebase that should NOT be followed in new code. Legacy approaches being phased out. Inconsistencies being resolved.]
```

## After Generation

1. Present a summary to the user: what you found, what looks solid, what was ambiguous
2. Highlight any inconsistencies that need a human decision
3. Tell the user: "Review this file. I extracted these patterns from your code but your team knows the intent. Edit anything that's wrong or aspirational rather than actual."
4. If AGENTS.md doesn't exist yet, suggest: "Run `/setup-ai` to generate your AGENTS.md and CLAUDE.md, then it will reference STYLE_GUIDE.md automatically."
5. Suggest: "Run `/review-style-guide` before PRs to automatically check new code against this style guide."
