# PR Resolution Completion

Final steps after verification passes.

## Commit Template

```bash
git add -A
git commit -m "fix(scope): address PR review feedback

- [list key changes]
- [list CI fixes if any]"
# Replace 'scope' with the affected area (e.g., auth, api, ui)
git push
```

## Post Resolution Summary

```bash
gh pr comment $PR_NUM --body "## PR Comment Resolution Summary

### Code Fixes (N items)
| Comment | Resolution |
|---------|------------|
| [@author on file:line](link) | Description |

### Won't Fix (N items)
| Comment | Reason |
|---------|--------|
| [@author on file:line](link) | Explanation |

### Acknowledged (N items)
- [@author](link): \"LGTM\"

---
*All N comments resolved*"
```

## Resolve GitHub Threads

```bash
# Using local script
~/.claude/skills/pr-resolution/bin/resolve-pr-thread "THREAD_NODE_ID"

# Or GraphQL directly
gh api graphql -f query='
  mutation {
    resolveReviewThread(input: {threadId: "THREAD_ID"}) {
      thread { id isResolved }
    }
  }
'
```

**Only resolve threads for issues you actually fixed.**
