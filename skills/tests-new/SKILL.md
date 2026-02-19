---
name: tests-new
description: Reviews the feature you just built and adds missing test coverage. Focuses on behavior that matters — not coverage metrics. Use after completing a feature to identify untested code paths, edge cases, and risk areas.
---

# New Tests for Recent Work

Review recent changes and add missing test coverage where it matters.

## Instructions

### Step 1: Identify Recent Changes

Run `git diff HEAD~1` (or `git diff main...HEAD` if on a branch) to find what changed. If no git changes, ask the user which files to cover.

Focus on:
- New functions, methods, or components
- Changed behavior in existing code
- New API endpoints or routes
- Modified business logic

### Step 2: Audit Existing Coverage

For each changed file, check if corresponding tests exist:
- `src/foo.ts` → look for `src/foo.test.ts`, `tests/foo.test.ts`, `__tests__/foo.test.ts`
- Follow the project's test file convention

Classify each changed function/component:

| Status | Meaning |
|--------|---------|
| **Untested** | No test file or no tests for this function |
| **Under-tested** | Tests exist but miss important paths |
| **Covered** | Tests adequately cover the behavior |

### Step 3: Prioritize by Risk

Don't test everything — test what matters. Prioritize:

1. **Complex logic** — conditionals, loops, state machines, calculations
2. **Error paths** — what happens when things fail
3. **Data transformations** — parsing, formatting, mapping
4. **Integration boundaries** — API calls, database queries, external services
5. **User-facing behavior** — things that break the experience if wrong

Skip:
- Simple getters/setters
- Pure pass-through functions
- Framework boilerplate
- Code that's already well-covered

### Step 4: Write Tests

Follow the project's existing test patterns (framework, assertion style, file structure, mocking approach). Read 1-2 existing test files first to match conventions.

For each test:
- **Name describes behavior**, not implementation: `"returns empty array when no results found"` not `"test getResults"`
- **Arrange-Act-Assert** structure
- **One behavior per test** — if a test name has "and", split it
- **Real edge cases**: empty input, null/undefined, boundary values, concurrent access, error responses

### Step 5: Verify

Run the new tests to ensure they pass. If any fail, that's a potential bug — flag it rather than deleting the test.

### Step 6: Report

```
## New Test Coverage

**Files analyzed:** [count]
**Tests added:** [count]
**Potential bugs found:** [count, if any]

### Added
- `[test file]`: [what behaviors are now covered]

### Skipped (adequate coverage)
- `[file]`: already covered by [test file]

### Potential Bugs
- `[test name]`: expected [X] but got [Y] — [file:line]
```
