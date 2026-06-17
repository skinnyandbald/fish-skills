# Bot Comment Formats Reference

This module documents how different code review bots format their comments.

## Quick Reference Table

| Bot | Format | Blocking | Suggestion | Nitpick |
|-----|--------|----------|------------|---------|
| **CodeRabbit** | `<details>` sections, "Actionable comments: N" | "must fix" | "should" | `Nitpick` |
| **Gemini** | `![priority]` badges | `![high]` | `![medium]` | `![low]` |
| **Claude** | Numbered `### 1.` in discussion comment | `## Critical` | `## Important` | `## Suggestions` |
| **CodeScene** | `[//]: # (cs-code-health)` markers, biomarker links | Complex Method, Complex Conditional, Large Method | Code Duplication, Bumpy Road Ahead, Primitive Obsession | — (no nitpicks) |
| **chatgpt-codex-connector** | `![P1/P2/P3 Badge]` header, bold title, plain prose | P1 | P2 | P3 |
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

## CodeScene Delta Analysis Format

| Biomarker | Category | Action |
|-----------|----------|--------|
| **Complex Method** | `blocking` | Extract helper functions to reduce cyclomatic complexity |
| **Complex Conditional** | `blocking` | Simplify or extract named boolean helpers |
| **Code Duplication** | `suggestion` | Extract shared code into a function |
| **Bumpy Road Ahead** | `suggestion` | Reduce nesting depth, extract early returns |
| **Primitive Obsession** | `suggestion` | Consider enums or branded types for string parameters |
| **Large Method** | `blocking` | Split into smaller functions |

**Parsing instructions:**
1. CodeScene comments start with `[//]: # (cs-code-health)` hidden marker
2. Each comment targets a specific file:line with a biomarker link
3. The ❌ emoji prefix means "Getting worse" or "New issue" — both are actionable
4. The biomarker name is in the markdown link text (e.g., `**Complex Method**`)
5. Method/function name follows on the next line
6. CodeScene comments are ALWAYS actionable — they represent measurable code health regressions

**Classification rule:** All CodeScene comments are `blocking` or `suggestion` — never `non_actionable`. They must be resolved with code changes (extract functions, reduce complexity, remove duplication). Do NOT resolve CodeScene threads without a corresponding code commit.

**Identifying CodeScene comments:**
- Author: `codescene-delta-analysis[bot]`
- Comments contain biomarker links to CodeScene documentation
- Posted as PR review comments on specific file:line locations

---

## ChatGPT Codex Connector Format

**CRITICAL — discovery:** `chatgpt-codex-connector` posts inline comments *without* submitting
a formal GitHub review, so they do NOT appear in `reviewThreads` (GraphQL). They are only
visible in `inline_comments` (REST) and in the `orphan_inline_comments` field of `get-pr-comments`
output. See `discovery.md` for the detection procedure.

| Badge / Signal | Priority | Action |
|----------------|----------|--------|
| `![P1 Badge]` (`P1-red`) | `blocking` | Must fix before merge |
| `![P2 Badge]` (`P2-yellow`) | `suggestion` | Should address or reply with rationale |
| `![P3 Badge]` (`P3-green`) | `nitpick` | Optional improvement |

**Parsing instructions:**
1. Each comment is a standalone inline comment on a specific file:line
2. Starts with a `<sub><sub>![P1/P2/P3 Badge]</sub></sub>` badge header
3. Followed by a bold title: `**Title of the finding**`
4. Followed by a prose explanation and sometimes a code block
5. Comments are independent — each is a separate actionable item
6. `in_reply_to_id` is `null` for root comments (use this to identify the primary item vs. any human replies)

**Identifying chatgpt-codex-connector comments:**
```bash
gh api repos/$OWNER/$REPO/pulls/$PR_NUM/comments \
  --jq '.[] | select(.user.login == "chatgpt-codex-connector[bot]") | {id: .id, path: .path, line: .line, body: .body[:100]}'
```

**Replying to a chatgpt-codex-connector comment** (to mark it addressed):
```bash
gh api repos/$OWNER/$REPO/pulls/$PR_NUM/comments/$COMMENT_ID/replies \
  --method POST --field body="Fixed in <sha>. <brief explanation>"
```

---

## Human Review Patterns

Look for:
- Numbered lists (1. 2. 3.)
- Bullet points with file references
- Code blocks with suggested changes
- "In file X, line Y..." patterns
- Markdown headers splitting different feedback items

Extract each as a separate actionable item.
