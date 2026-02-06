# Comment Classification Reference

This module defines how to categorize PR comments.

## Categories

| Category | Signals | Action |
|----------|---------|--------|
| `blocking` | "must", "critical", "required", "bug", "security", "breaking" | Fix immediately |
| `suggestion` | "should", "suggest", "recommend", "consider", "improve" | Fix unless conflicts |
| `nitpick` | "nit", "minor", "style", "typo", "optional" | Fix automatically |
| `question` | Ends with "?", asks for clarification | Ask human |
| `non_actionable` | "LGTM", "looks good", "approved", "+1" | Auto-acknowledge |

## Resolution Types

| Type | When Used | Evidence Required |
|------|-----------|-------------------|
| `code_fix` | Comment addressed by code change | What changed + file:line reference |
| `wont_fix` | Intentionally not addressing | One-line reason explaining why |
| `disagree` | Technical disagreement with feedback | Technical argument with evidence |
| `acknowledged` | Non-actionable comments | None |

## Bot-Specific Signals

| Bot | Blocking | Suggestion | Nitpick |
|-----|----------|------------|---------|
| **CodeRabbit** | "must fix" | "should" | `Nitpick` |
| **Gemini** | `high-priority.svg` in URL | `medium-priority.svg` in URL | `low-priority.svg` in URL |
| **Claude** | Under `## Critical` | Under `## Important` | Under `## Suggestions` |

## Important Rules

1. **Bot code suggestions are NEVER non_actionable** - always address them
2. **"Outside diff range comments"** → treat as `suggestion` or `blocking`
3. **Code diff blocks** (```diff) → treat as `suggestion`, implement the change
4. **Fix nitpicks automatically** - don't ask, just do it
5. **Only ask human for questions or genuine uncertainty**
