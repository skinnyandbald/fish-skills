# PR Resolution Completion

Final steps after verification passes. **Every step is mandatory.**

---

## Replying to Review Comments

Use this pattern to reply to a specific review comment (e.g., to explain why a finding is invalid). You need the comment's `id` (numeric ID from the REST API, not the GraphQL node ID):

```bash
gh api "repos/$OWNER/$REPO/pulls/$PR_NUM/comments/$COMMENT_ID/replies" \
  --method POST \
  -f body="This finding doesn't apply — [brief reason]."
```

For top-level review body comments (not inline), reply to the review thread using:

```bash
gh pr comment $PR_NUM --body "> [quote the relevant finding]

This doesn't apply — [brief reason]."
```

Always reply BEFORE resolving the thread so the explanation is visible.

---

## Step 1: Commit

```bash
git add -A
git commit -m "fix(scope): address PR review feedback

- [list key changes]
- [list CI fixes if any]"
# Replace 'scope' with the affected area (e.g., auth, api, ui)
```

## Step 2: Push

```bash
git push
```

## Step 3: Post Resolution Summary

```bash
gh pr comment $PR_NUM --body "## PR Comment Resolution Summary

### Code Fixes (N items)
| Comment | Resolution |
|---------|------------|
| [@author on file:line](link) | Description |

### Invalid (N items)
| Comment | Reason |
|---------|--------|
| [@author on file:line](link) | Why the finding doesn't apply |

### Won't Fix (N items)
| Comment | Reason |
|---------|--------|
| [@author on file:line](link) | Explanation |

### Acknowledged (N items)
- [@author](link): \"LGTM\"

---
*All N comments resolved*"
```

## Step 4: Resolve ALL GitHub Threads (MANDATORY)

**Run the batch resolution script:**

```bash
~/.claude/skills/pr-resolution/bin/resolve-all-threads $PR_NUM
```

This script resolves every unresolved review thread and verifies zero remain.

**Manual fallback** (if the script fails for a specific thread):

```bash
~/.claude/skills/pr-resolution/bin/resolve-pr-thread "THREAD_NODE_ID"
```

## Step 5: Post-Resolution Verification (MANDATORY)

**Confirm the script output ends with:**

```
All threads resolved
```

If the script exited non-zero or reports remaining threads:
1. Note which thread IDs failed from the script output
2. Resolve them manually with `bin/resolve-pr-thread THREAD_ID`
3. Re-run `bin/resolve-all-threads $PR_NUM` to verify

**HARD BLOCK: Workflow is NOT complete until `resolve-all-threads` exits 0 and prints "All threads resolved".**
