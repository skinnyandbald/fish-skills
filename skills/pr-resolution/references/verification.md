# Verification Gate

Mandatory checks before committing.

## Local Checks (REQUIRED)

Detect available scripts via `package.json` and run them. **Failures are blocking — do NOT proceed to commit.**

```bash
CHECKS_FAILED=0

# Detect available scripts via package.json (reliable across npm versions)
if jq -e '.scripts.lint' package.json >/dev/null 2>&1; then
  echo "Running lint..."
  if timeout 120 npm run lint; then echo "Lint: PASS"; else echo "Lint: FAIL"; CHECKS_FAILED=1; fi
fi

if jq -e '.scripts.typecheck' package.json >/dev/null 2>&1; then
  echo "Running typecheck..."
  if timeout 120 npm run typecheck; then echo "Typecheck: PASS"; else echo "Typecheck: FAIL"; CHECKS_FAILED=1; fi
elif jq -e '.scripts["type-check"]' package.json >/dev/null 2>&1; then
  echo "Running type-check..."
  if timeout 120 npm run type-check; then echo "Typecheck: PASS"; else echo "Typecheck: FAIL"; CHECKS_FAILED=1; fi
fi

if jq -e '.scripts.test' package.json >/dev/null 2>&1; then
  echo "Running tests..."
  if timeout 120 npm run test; then echo "Test: PASS"; else echo "Test: FAIL"; CHECKS_FAILED=1; fi
elif jq -e '.scripts["test:unit"]' package.json >/dev/null 2>&1; then
  echo "Running unit tests..."
  if timeout 120 npm run test:unit; then echo "Test: PASS"; else echo "Test: FAIL"; CHECKS_FAILED=1; fi
fi

if [ "$CHECKS_FAILED" -ne 0 ]; then
  echo "⚠️ Local checks failed. Fix all failures before proceeding to commit."
  echo "Return to Phase 3 (Resolution) to fix, then re-run Phase 4."
  exit 1  # BLOCKING — Phase 5 must not run if this exits non-zero
fi
```

**Note:** stderr is NOT suppressed — error output is needed for diagnosis. All commands wrapped in `timeout 120` to prevent hangs.

**Phase 4/5 contract:** Phase 5 MUST NOT run if Phase 4 verification exits non-zero.

## Verification Checklist

Verify EVERY comment has explicit resolution:

```markdown
## Verification Checklist

| # | Comment | Resolution | Evidence |
|---|---------|------------|----------|
| 1 | [@author](link) on file:45 | code_fix | Added null check |
| 2 | [@author](link) on file:23 | code_fix | Added prop types |
| 3 | [@author](link) on file:67 | wont_fix | Conflicts with convention |
| 4 | [@author](link) "LGTM" | acknowledged | Non-actionable |

All N comments resolved - READY TO COMMIT
```

## Verification Rules

| Check | Requirement |
|-------|-------------|
| Status | Must be `resolved` or `acknowledged` (not `pending`) |
| Resolution Type | Must have `code_fix`, `wont_fix`, `disagree`, or `acknowledged` |
| Evidence | If `code_fix`: what changed. If `wont_fix`/`disagree`: reason |

**If ANY comment is missing resolution: STOP. Do NOT commit.**
