# Verification Gate

Mandatory checks before committing.

## Local Checks (REQUIRED)

Detect and run available checks from the project's `package.json`:

```bash
# Common check commands - run whichever exist in the project
npm run lint 2>/dev/null || true
npm run typecheck 2>/dev/null || npm run type-check 2>/dev/null || true
npm run test 2>/dev/null || npm run test:unit 2>/dev/null || true
npm run build 2>/dev/null || true
```

**DO NOT commit until ALL available checks pass locally.**

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
