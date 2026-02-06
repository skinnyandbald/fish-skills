# Bot Comment Formats Reference

This module documents how different code review bots format their comments.

## Quick Reference Table

| Bot | Format | Blocking | Suggestion | Nitpick |
|-----|--------|----------|------------|---------|
| **CodeRabbit** | `<details>` sections, "Actionable comments: N" | "must fix" | "should" | `Nitpick` |
| **Gemini** | `![priority]` badges | `![high]` | `![medium]` | `![low]` |
| **Claude** | Numbered `### 1.` in discussion comment | `## Critical` | `## Important` | `## Suggestions` |
| **Human** | Free-form, file:line references | Explicit urgency | "should", "consider" | "nit", "minor" |

---

## CodeRabbit Format

| Look For | Emoji | Action |
|----------|-------|--------|
| "Actionable comments posted: N" | — | You need N items total |
| "Outside diff range comments (N)" | — | Expand `<details>`, extract N items |
| "Nitpick comments (N)" | — | Expand `<details>`, extract N items |
| "Suggested implementation" | — | Contains code diff to apply |
| "Walkthrough" | — | Summary only, usually non-actionable |
| "Committable suggestion" | — | Contains ready-to-apply code block |

**Parsing instructions:**
1. Expand ALL `<details>` blocks - they contain hidden items
2. Check for nested `<details>` within `<details>`
3. Each file `<summary>` may contain multiple line-range items
4. Extract file path from `<summary>` tag
5. Extract line numbers from backtick-wrapped range (e.g., `` `152-159` ``)

---

## Gemini Code Assist Format

| Badge URL Contains | Category |
|--------------------|----------|
| `high-priority.svg` | `blocking` - must fix |
| `medium-priority.svg` | `suggestion` - should address |
| `low-priority.svg` | `nitpick` - minor improvement |

**IMPORTANT:** Gemini does NOT provide a count summary. Query the API:

```bash
GEMINI_COUNT=$(gh api repos/$OWNER/$REPO/pulls/$PR_NUM/comments \
  --jq '[.[] | select(.user.login == "gemini-code-assist[bot]")] | length')
```

**Identifying Gemini comments:**
- Author: `gemini-code-assist[bot]`
- Comments start with `![priority]` image badge
- Posted as individual inline review comments (no collapsible sections)

---

## Claude Bot Format

**CRITICAL:** Claude posts a **single discussion comment** with MULTIPLE numbered items.

| Section Header | Priority |
|----------------|----------|
| `## Critical Issues` | `blocking` |
| `## Important Issues` | `suggestion` |
| `## Suggestions` | `nitpick` |
| `## Checklist` items | `suggestion` |

**To find Claude's review:**
```bash
gh api repos/$OWNER/$REPO/issues/$PR_NUM/comments \
  --jq '.[] | select(.user.login == "claude[bot]")'
```

**Count numbered items:**
```bash
CLAUDE_COUNT=$(gh api repos/$OWNER/$REPO/issues/$PR_NUM/comments \
  --jq '.[] | select(.user.login == "claude[bot]") | .body' \
  | grep -cE "^\s*### [0-9]+\.")
```

**Do NOT count:**
- Section headers (## Critical Issues)
- Checklist items (- [x] or - [])
- "Priority Fixes Before Merge" summary (duplicates numbered items)

---

## Human Review Patterns

Look for:
- Numbered lists (1. 2. 3.)
- Bullet points with file references
- Code blocks with suggested changes
- "In file X, line Y..." patterns
- Markdown headers splitting different feedback items

Extract each as a separate actionable item.
