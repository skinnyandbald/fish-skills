# GitHub Project Configuration (Dynamic)

<overview>
This skill works with whatever GitHub repository context you're currently in. It detects project settings dynamically rather than using hardcoded values.
</overview>

<detect_current_repo>
## Detecting Current Repository

At the start of any workflow, detect the current context:

```bash
# Get current repo
gh repo view --json nameWithOwner,url -q '.nameWithOwner'

# Get repo owner and name separately
REPO_OWNER=$(gh repo view --json owner -q '.owner.login')
REPO_NAME=$(gh repo view --json name -q '.name')
```

If not in a git repo or gh not authenticated, ask user to specify.
</detect_current_repo>

<detect_project>
## Detecting GitHub Project (if exists)

Check if the repo has an associated GitHub Project:

```bash
# List projects for the repo owner (org or user)
gh project list --owner $REPO_OWNER --format json

# Get project details
gh project view <project-number> --owner $REPO_OWNER --format json
```

If multiple projects exist, ask user which one to use.
If no project exists, skip project-related features (just create issues).
</detect_project>

<detect_labels>
## Detecting Available Labels

Fetch labels from the current repository:

```bash
gh label list --json name,description
```

Use these to suggest appropriate labels for issues.
Common patterns to look for:
- `area:*` or `domain:*` - Component labels
- `priority:*` or `p0/p1/p2` - Priority labels
- `type:*` or `bug/feature/chore` - Type labels
</detect_labels>

<detect_milestones>
## Detecting Milestones

Fetch milestones from the current repository:

```bash
gh api repos/$REPO_OWNER/$REPO_NAME/milestones --jq '.[].title'
```

Suggest matching milestones based on issue content.
If no milestones exist, skip milestone assignment.
</detect_milestones>

<issue_creation>
## Creating Issues (Generic)

**Standard Command:**
```bash
gh issue create \
  --repo $REPO_OWNER/$REPO_NAME \
  --title "[Type]: Brief description" \
  --body-file /tmp/issue-body.md \
  --label "detected-label" \
  --milestone "detected-milestone"  # only if milestones exist
```

**Adding to Project (if project exists):**
```bash
# Get project number first
PROJECT_NUM=$(gh project list --owner $REPO_OWNER --format json | jq '.[0].number')

# Add issue to project
gh project item-add $PROJECT_NUM --owner $REPO_OWNER --url <issue_url>
```

**Title Conventions (suggest based on repo patterns):**
Detect existing issue title patterns from recent issues:
```bash
gh issue list --limit 20 --json title -q '.[].title'
```

Common patterns:
- `feat: `, `fix: `, `chore: ` (conventional commits style)
- `[Feature]`, `[Bug]`, `[Question]` (bracket prefix style)
- Plain descriptions (no prefix)

Match the repo's existing style.
</issue_creation>

<context_caching>
## Caching Context for Session

After detecting repo context once, cache it for the session:

```
DETECTED CONTEXT:
- Repository: $REPO_OWNER/$REPO_NAME
- Project: $PROJECT_NUM (or "none")
- Labels available: [list]
- Milestones: [list]
- Title style: [detected pattern]
```

Reuse this context throughout the workflow without re-querying.
</context_caching>
