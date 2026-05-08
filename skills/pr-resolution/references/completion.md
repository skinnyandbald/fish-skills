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

## Step 4: Resolve Threads Individually (MANDATORY)

Resolve each review thread one-by-one after confirming the comment was addressed:

```bash
~/.claude/skills/pr-resolution/bin/resolve-pr-thread "THREAD_NODE_ID"
```

**Rules:**
- Only resolve a thread after you've verified the fix is in the pushed commit (for code fixes) or posted a reply (for invalid/wont_fix)
- Do NOT use `resolve-all-threads` to bulk-resolve — it hides unaddressed comments
- Invalid findings should already be resolved in Phase 2 (after posting reply)

## Step 5: Post-Resolution Verification (MANDATORY)

Verify zero unresolved threads remain. If any remain, investigate each one — don't bulk-resolve to make the number go to zero.

**HARD BLOCK: Workflow is NOT complete until every thread is individually confirmed as addressed and resolved.**
