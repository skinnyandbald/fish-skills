# Workflow: Create Issues from Provided Notes

<required_reading>
**Read these reference files NOW:**
1. references/github-project-config.md
2. templates/github-issue-checklist.md
</required_reading>

<process>
## Step 0: Detect Repository Context

Before processing, detect the current repository context:

```bash
# Check if in a git repo
git rev-parse --git-dir 2>/dev/null

# Get repo details
REPO_OWNER=$(gh repo view --json owner -q '.owner.login' 2>/dev/null)
REPO_NAME=$(gh repo view --json name -q '.name' 2>/dev/null)
```

**If not in a repo:** Ask user which repository to create issues in.

**Detect available labels:**
```bash
gh label list --json name,description -q '.[] | "\(.name): \(.description)"'
```

**Detect milestones:**
```bash
gh api repos/$REPO_OWNER/$REPO_NAME/milestones --jq '.[].title' 2>/dev/null
```

**Cache detected context for use throughout workflow.**

## Step 1: Receive Notes

Ask user to provide their meeting notes or action items:

```
Please share your meeting notes or action items. You can:
- Paste them directly
- Provide a file path to read
- Share a URL to fetch

I'll extract action items and help create GitHub issues.
```

## Step 2: Parse and Categorize

Analyze the provided notes and extract:

**Action Items** - Look for:
- Bullet points with names/owners
- "TODO:", "Action:", "Next step:"
- Imperative statements ("Implement...", "Fix...", "Add...")
- Commitments ("I'll...", "We need to...")

**Questions** - Look for:
- Question marks
- "TBD", "To be determined"
- "Need to figure out..."
- "Outstanding question:"

Categorize each item:
- **Feature:** New functionality to add
- **Bug:** Something broken to fix
- **Question:** Research/investigation needed
- **Chore:** Maintenance/cleanup task

## Step 3: Compare Against Existing Issues

For each extracted item, search the **current repository**:

```bash
gh issue list --repo $REPO_OWNER/$REPO_NAME --search "<keywords>" --state all --limit 10
```

Present comparison:
- **New:** No related issues found
- **Related:** Issue #X covers similar ground
- **Duplicate:** Issue #X already tracks this exactly

## Step 4: Confirm Each Issue

For each NEW item, present for confirmation:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PROPOSED ISSUE #[N]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Repository:** $REPO_OWNER/$REPO_NAME

**Title:** [Suggested title]

**From Notes:** "[Original text]"

**Type:** [Feature / Bug / Question / Chore]

**Suggested Labels:** [from detected labels]

**Suggested Milestone:** [from detected milestones, or None]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
Create this issue? (yes/no/modify/skip)
```

## Step 5: Create Confirmed Issues

For each confirmed issue:

1. Write issue body to temp file using checklist template
2. Create issue:
```bash
gh issue create --repo $REPO_OWNER/$REPO_NAME \
  --title "[title]" \
  --body-file /tmp/issue-body.md \
  --label "[labels]" \
  --milestone "[milestone]"
```

3. Add to project (if detected):
```bash
gh project item-add $PROJECT_NUM --owner $REPO_OWNER --url <issue_url>
```

4. Report created issue number and URL

## Step 6: Summary

After all issues processed, summarize:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
✅ ISSUES CREATED
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Repository: $REPO_OWNER/$REPO_NAME

Created:
- #[N]: [Title] - [URL]
- #[N]: [Title] - [URL]

Skipped:
- [Item] - Reason: [duplicate of #X / user skipped]

Related (consider commenting):
- #[N]: [Title] - relates to [item]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
</process>

<success_criteria>
This workflow is complete when:
- [ ] Repository context detected (owner, name, labels, milestones)
- [ ] Notes received and parsed
- [ ] Items categorized by type
- [ ] Comparison against existing issues done
- [ ] User confirmed/modified/skipped each item
- [ ] GitHub issues created for confirmed items
- [ ] Issues added to project board (if exists)
- [ ] Summary of actions presented
</success_criteria>
