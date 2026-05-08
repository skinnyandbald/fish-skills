# Comment Classification Reference

This module defines how to categorize and validate PR comments.

## Core Principle

Bot comments are **hypotheses, not instructions**. Every finding must be verified against the actual code before deciding whether to act on it. Bots hallucinate, misread context, recommend reverting intentional patterns, and flag non-issues. Your job is to evaluate each recommendation independently, fix what's legitimately wrong, and skip what isn't — with a brief reason.

## Categories

| Category | Signals | Action |
|----------|---------|--------|
| `blocking` | "must", "critical", "required", "bug", "security", "breaking" | Validate, then fix if confirmed |
| `suggestion` | "should", "suggest", "recommend", "consider", "improve" | Validate, then fix if it improves the code |
| `nitpick` | "nit", "minor", "style", "typo", "optional" | Validate, then fix if correct |
| `question` | Ends with "?", asks for clarification | Ask human |
| `non_actionable` | "LGTM", "looks good", "approved", "+1" | Auto-acknowledge |

## Resolution Types

| Type | When Used | Evidence Required |
|------|-----------|-------------------|
| `code_fix` | Comment is valid and addressed by code change | What changed + file:line reference |
| `invalid` | Finding is factually wrong or doesn't apply to this code | One-line reason explaining why (e.g., "no trailing spaces exist at this line", "secrets context is unavailable at job level") |
| `wont_fix` | Valid finding but intentionally not addressing | One-line reason explaining the design choice |
| `disagree` | Technical disagreement with feedback | Technical argument with evidence |
| `acknowledged` | Non-actionable comments | None |

## Validation (MANDATORY before fixing)

For EACH comment, before writing any code:

1. **Read the actual code** at the line(s) referenced. Does the issue the bot describes actually exist?
2. **Check the bot's assumptions.** Does the bot understand the surrounding context? Is it referencing stale code, a different file, or misreading the pattern?
3. **Verify suggested fixes wouldn't break things.** Would the bot's recommendation contradict project conventions, reintroduce a known bug, or conflict with how the codebase actually works?
4. **For claims about syntax/runtime behavior:** verify the claim is correct for the language/framework version in use.

**Common false positives to watch for:**
- Bot says "this will fail" but the code works (misunderstanding of API, framework behavior, or shell semantics)
- Bot recommends restoring a pattern that was intentionally removed (check git blame / recent commits)
- Bot flags "trailing spaces" or "inline comments" that don't actually exist in the file
- Bot says "variable will be lost" but the code uses a file/external state that survives the scope
- Bot recommends adding a guard that the framework already provides

## Bot-Specific Signals

| Bot | Blocking | Suggestion | Nitpick |
|-----|----------|------------|---------|
| **CodeRabbit** | "must fix" | "should" | `Nitpick` |
| **Gemini** | `high-priority.svg` in URL | `medium-priority.svg` in URL | `low-priority.svg` in URL |
| **Claude** | Under `## Critical` | Under `## Important` | Under `## Suggestions` |
| **CodeScene** | Complex Method, Complex Conditional, Large Method | Code Duplication, Bumpy Road, Primitive Obsession | — (no nitpicks) |

## Important Rules

1. **Validate before acting.** Never implement a bot suggestion without first reading the code it references and confirming the issue exists.
2. **"Outside diff range comments"** → treat as `suggestion` or `blocking`, but still validate
3. **Code diff blocks** (```diff) → verify the suggested change is correct, then implement if valid
4. **Fix confirmed nitpicks without asking** — but still verify the issue exists first
5. **Only ask human for questions or genuine uncertainty**
6. **CodeScene comments flag measurable regressions** — treat these as high-confidence signals, but still validate each finding against the referenced code/context before changing code.
7. **Skip invalid findings confidently.** Resolve the thread with a brief explanation of why the finding doesn't apply. Don't implement wrong suggestions just because a bot said so.
