# PR Comment Discovery

Scripts for gathering all PR comments.

## Quick Discovery (Local Scripts)

```bash
# Get all review threads (inline comments)
~/.claude/skills/pr-resolution/bin/get-pr-comments "$PR_NUM"

# Get CodeRabbit review body comments (Nitpicks + Outside diff range)
# IMPORTANT: CodeRabbit embeds comments in <details> sections that aren't posted as threads
~/.claude/skills/pr-resolution/bin/parse-coderabbit-review "$PR_NUM"
```

## Full API Discovery

```bash
PR_NUM=$(gh pr view --json number -q '.number' 2>/dev/null || echo "$ARGUMENTS")
OWNER=$(gh repo view --json owner -q '.owner.login')
REPO=$(gh repo view --json name -q '.name')

# 1. Review comments (inline on code)
echo "=== REVIEW COMMENTS ==="
gh api repos/$OWNER/$REPO/pulls/$PR_NUM/comments --jq '.[] | {
  id: .id, permalink: .html_url, author: .user.login,
  body: .body, path: .path, line: .line
}'

# 2. Discussion comments (including Claude bot reviews)
echo "=== DISCUSSION COMMENTS ==="
gh api repos/$OWNER/$REPO/issues/$PR_NUM/comments --jq '.[] | {
  id: .id, permalink: .html_url, author: .user.login, body: .body
}'

# 3. Unresolved review threads (CRITICAL - GraphQL)
echo "=== UNRESOLVED THREADS ==="
gh api graphql -f query='
  query {
    repository(owner: "'"$OWNER"'", name: "'"$REPO"'") {
      pullRequest(number: '"$PR_NUM"') {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            path
            line
            comments(first: 10) {
              nodes { body author { login } url }
            }
          }
        }
      }
    }
  }
' --jq '.data.repository.pullRequest.reviewThreads.nodes[] | select(.isResolved == false)'

# 4. CodeRabbit review body embedded comments (CRITICAL - often missed!)
echo "=== CODERABBIT REVIEW BODY COMMENTS ==="
~/.claude/skills/pr-resolution/bin/parse-coderabbit-review "$PR_NUM"
```

## CodeRabbit Embedded Comments

**CRITICAL:** CodeRabbit posts some comments in two ways:

1. **Inline review threads** - Posted on specific code lines, appear in GitHub's review UI
2. **Review body embedded** - Hidden in `<details>` sections in the review summary

The embedded comments include:
- **Nitpick comments** - Low-priority suggestions
- **Outside diff range comments** - Comments on code not in the PR diff

These are NOT posted as review threads and will be **missed** if you only query the API!

Use `~/.claude/skills/pr-resolution/bin/parse-coderabbit-review` to extract them.

## Enumeration Template

After discovery, print this enumeration:

```markdown
## Discovery Complete - Enumeration

**Bot counts (verify!):**
| Bot | Source | Found | Expected | Match |
|-----|--------|-------|----------|-------|
| CodeRabbit | Inline threads | [N] | [N from "Actionable comments posted"] | / |
| CodeRabbit | Review body (Nitpicks/Outside) | [N] | [N from review summary] | / |
| Gemini | Inline threads | [N] | [N from API query] | / |
| Claude | Discussion comment | [N] | [N numbered items] | / |
| Human | Various | [N] | [manual count] | / |

**All items ([TOTAL]):**
1. [category] `file:line` - "Summary" ([@author](permalink))
...
```

**If counts don't match: STOP and re-parse. Do NOT proceed.**

## Verification Checklist

Before proceeding to classification, verify:

- [ ] Ran `~/.claude/skills/pr-resolution/bin/get-pr-comments` for inline threads
- [ ] Ran `~/.claude/skills/pr-resolution/bin/parse-coderabbit-review` for embedded comments
- [ ] Checked CodeRabbit review for "Nitpick comments (N)" count
- [ ] Checked CodeRabbit review for "Outside diff range comments (N)" count
- [ ] Total matches sum of all sources
