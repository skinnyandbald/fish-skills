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

Push the detached HEAD to the PR branch ref (fetch+rebase+retry on a concurrent-push race; never force):

```bash
~/.claude/skills/pr-resolution/bin/push-to-pr-branch "$PR_BRANCH"
```

> **If push fails**, the resolution is incomplete — skip the remaining steps and report. A detached worktree's commits live only in reflog until pushed.

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

**HARD BLOCK: Workflow is NOT complete until every non-`unverified` thread is individually confirmed as addressed and resolved.** Threads classified as `unverified` are intentionally left open for human review and excluded from this gate.

---

## Note for the user (parent session is stale, not broken)

The fixes were committed and pushed from a throwaway detached worktree that is removed on exit. The interactive session's working tree and branch were never touched. But if the user was sitting on `$PR_BRANCH`, their **local** branch is now one push behind `origin/$PR_BRANCH`. Tell them to run `git pull --ff-only` (or `git pull --rebase`) before adding more commits. Include this reminder in the final summary.
