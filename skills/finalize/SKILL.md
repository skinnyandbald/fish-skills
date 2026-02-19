---
name: finalize
description: Cleans up completed feature work. Removes false starts, dead-end code, debug statements, and experimental remnants from your coding session. Use after a feature is working to consolidate the implementation before committing.
---

# Finalize Recent Work

Clean up after a feature is done — remove iteration artifacts and consolidate the implementation.

## Instructions

### Step 1: Identify Session Artifacts

Review recent changes (`git diff` or `git diff --staged`) and flag:

**Remove:**
- `console.log`, `print()`, `dd()`, `var_dump()`, `debugger` statements
- Commented-out code (old approaches, false starts)
- TODO/FIXME comments that were resolved
- Temporary variable names (`temp`, `test`, `foo`, `xxx`)
- Unused imports added during exploration
- Test data or hardcoded values that should be dynamic

**Simplify:**
- Duplicated logic that can be extracted
- Over-engineered abstractions (does it need that wrapper?)
- Naming inconsistencies introduced during iteration
- Unnecessarily complex conditionals
- Functions that grew too long during development

**Verify:**
- No leftover feature flags for this feature
- Error messages are user-facing quality (not developer shorthand)
- Types are specific (no `any` that snuck in)
- No credentials, API keys, or secrets in the diff

### Step 2: Clean Up

Make changes in small, reviewable steps:
1. Remove debug statements and dead code
2. Fix naming inconsistencies
3. Simplify where possible
4. Verify nothing broke

### Step 3: Run Tests

Run the project's test suite to ensure cleanup didn't break anything.

### Step 4: Report

```
## Finalize Summary

**Files cleaned:** [count]

### Removed
- [X] debug statements
- [X] commented-out blocks
- [X] unused imports

### Simplified
- [description of simplification]

### Verified
- All tests passing
- No secrets in diff
- No `any` types introduced
```

## Rules

- Never change behavior — only clean up presentation
- If you're unsure whether code is dead, leave it and flag it rather than deleting
- Run tests after every batch of changes
- Keep cleanup commits separate from feature commits
