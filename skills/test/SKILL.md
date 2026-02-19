---
name: test
description: Auto-detects your test framework, runs the full suite, diagnoses failures, and fixes them. Use after making code changes to verify tests pass, or when you encounter test failures you want diagnosed and fixed automatically.
---

# Run Tests and Fix Failures

Detect test framework, run tests, diagnose and fix failures automatically.

## Instructions

### Step 1: Detect Test Framework

Check for test configuration files in this order:

| File | Framework | Run Command |
|------|-----------|-------------|
| `vitest.config.*` or `vite.config.*` with test | Vitest | `npx vitest run` |
| `jest.config.*` or `package.json` jest key | Jest | `npx jest` |
| `phpunit.xml` | PHPUnit | `./vendor/bin/phpunit` |
| `pest.php` or Pest in composer.json | Pest | `./vendor/bin/pest` |
| `pytest.ini` / `pyproject.toml` [tool.pytest] | pytest | `pytest` |
| `go.mod` with `_test.go` files | Go | `go test ./...` |
| `Cargo.toml` | Rust | `cargo test` |
| `Gemfile` with rspec | RSpec | `bundle exec rspec` |

Also check `package.json` scripts for `test`, `test:run`, `test:unit`, `test:integration`.

If CLAUDE.md specifies test commands, use those instead.

### Step 2: Run Tests

Run the detected test command with `run_in_background=true`. Use verbose output flags where available.

### Step 3: Analyze Results

If all tests pass, report the summary and stop.

If tests fail, for each failure:

1. **Read the failing test** to understand what it expects
2. **Read the source code** being tested
3. **Classify the failure:**
   - **Test is wrong** — test expectations don't match intended behavior (update test)
   - **Source is wrong** — code has a bug (fix source)
   - **Both need updating** — behavior changed intentionally (update both)
   - **Environment issue** — missing dependency, stale cache, wrong config (fix setup)

### Step 4: Fix and Re-run

For each failure:
1. Make the minimal fix
2. Re-run the specific failing test to verify
3. Move to the next failure

After all individual fixes, run the full suite once more to catch regressions.

### Step 5: Report

```
## Test Results

**Framework:** [detected framework]
**Command:** [command used]
**Result:** X passed, Y fixed, Z remaining

### Fixed
- [test name]: [what was wrong and what was fixed]

### Still Failing (if any)
- [test name]: [diagnosis and why it couldn't be auto-fixed]
```

## Rules

- Never delete or skip a failing test without explicit user approval
- Prefer fixing source over fixing tests (tests define expected behavior)
- If a fix requires changing more than ~20 lines, show the proposed change and ask before applying
- If the same root cause produces multiple failures, fix the root cause once
