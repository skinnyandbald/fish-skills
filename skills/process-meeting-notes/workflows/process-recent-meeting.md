# Workflow: Process Recent Meeting

<required_reading>
**Read these reference files NOW:**
1. references/eos-level-10-format.md
2. references/github-project-config.md
3. templates/l10-meeting-summary.md
4. templates/github-issue-checklist.md
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
gh label list --json name -q '.[].name'
```

**Detect milestones:**
```bash
gh api repos/$REPO_OWNER/$REPO_NAME/milestones --jq '.[].title' 2>/dev/null
```

**Detect GitHub Project (optional):**
```bash
gh project list --owner $REPO_OWNER --format json 2>/dev/null
```

**Cache detected context for use throughout workflow.**

## Step 1: Fetch Recent Meeting from Fireflies

Use Fireflies MCP to find and retrieve recent meetings:

```
mcp__fireflies__fireflies_get_transcripts with limit: 5
```

Or search by keyword if user provided context:
```
mcp__fireflies__fireflies_search with query: "keyword:\"<term>\" limit:5"
```

Present the meeting list to user and confirm which one to process.

## Step 2: Retrieve Meeting Summary

Once meeting is selected, fetch the full summary:

```
mcp__fireflies__fireflies_get_summary with transcriptId: <selected_meeting_id>
```

Extract from the summary:
- **Action Items** (direct from Fireflies extraction)
- **Keywords** (topics discussed)
- **Overview** (meeting context)
- **Participants** (who attended)

## Step 3: Retrieve Full Transcript (if needed)

If action items are unclear or context is insufficient:

```
mcp__fireflies__fireflies_get_transcript with transcriptId: <selected_meeting_id>
```

Scan transcript for:
- Phrases indicating commitment: "I'll handle...", "Let's make sure...", "We need to..."
- Questions marked for follow-up: "We should figure out...", "Outstanding question..."
- Decisions made: "We agreed that...", "The decision is..."

## Step 4: Categorize Extracted Items

Group items into three categories:

**A. New Features/Enhancements**
- Things to build or add
- Process improvements
- New integrations

**B. Bugs/Issues to Fix**
- Problems reported
- Things not working correctly
- Performance concerns

**C. Questions/Research Needed**
- Unknowns requiring investigation
- Architecture questions
- Technical feasibility checks

## Step 5: Compare Against Existing GitHub Issues

For each extracted item, search the **current repository**:

```bash
gh issue list --repo $REPO_OWNER/$REPO_NAME --search "<keywords from item>" --state all --limit 10
```

Present comparison:
- **DUPLICATE:** Issue #X already tracks this exactly → Skip
- **RELATED:** Issue #X covers similar ground → Suggest commenting instead
- **NEW:** No related issues found → Proceed to creation

## Step 6: Create GitHub Issues (with confirmation)

For each NEW item, present to user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📋 PROPOSED ISSUE #[N]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

**Repository:** $REPO_OWNER/$REPO_NAME

**Title:** [Extracted title]

**From Meeting:** "[Quote from transcript]"

**Type:** [Feature / Bug / Question]

**Suggested Labels:** [from detected labels]

**Suggested Milestone:** [from detected milestones, or None]

**Implementation Checklist:**
- [ ] Check 1: [What to verify in codebase]
- [ ] Check 2: [Related code to examine]
- [ ] Check 3: [Architecture consideration]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

**Ask user to confirm/modify:**
- Accept as-is
- Modify labels/priority
- Skip this item
- Merge with existing issue

After confirmation, create issue:
```bash
gh issue create --repo $REPO_OWNER/$REPO_NAME \
  --title "..." --body "..." --label "..." --milestone "..."
```

Add to GitHub Project if one exists:
```bash
gh project item-add $PROJECT_NUM --owner $REPO_OWNER --url <issue_url>
```

## Step 7: Save Transcript and Meeting Note to Vault

**Check if vault integration is configured:**
- Look for `MEETING_NOTES_DIR` and `MEETING_TRANSCRIPTS_DIR` env vars
- Or check the project's CLAUDE.md for these paths
- If neither is set, ask: "Want to save the meeting note and transcript? If so, where?"

**If configured (or user provides a path):**

**7a. Save raw transcript:**
- If transcript was pasted directly by the user, always save it (it's not recoverable elsewhere)
- If transcript was fetched from Fireflies, save it too (local copy for search/reference)
- Save to `$MEETING_TRANSCRIPTS_DIR/YYYY-MM-DD - Source - Topic.md`
- Source = "Fireflies" if fetched via MCP, "Pasted" if user provided it
- Include frontmatter with `processed_note` linking to the structured note

**7b. Save structured meeting note:**
- Save the L10 summary (from Step 8) to `$MEETING_NOTES_DIR/YYYY-MM-DD - Entity - Topic.md`
- Include frontmatter: date, type (meeting), meeting_type, attendees, status, tags
- The note should be the polished, structured version — not the raw transcript

**File naming rules:**
- Use ` - ` (space-dash-space) as delimiter
- Entity = group or company name (e.g., "Hampton", "Hugo", "CouponFollow")
- Topic = short description (e.g., "Core Meeting", "Sprint Kickoff")

## Step 8: Generate EOS Level 10 Summary

After all issues processed, generate the L10 summary using the template.

**CRITICAL — NO EXTRA BLANK LINES:**
- The file MUST start on line 1 with content (no leading blank line)
- After the closing `---` of YAML frontmatter, the `#` heading MUST follow on the VERY NEXT LINE — no blank line between them
- WRONG: `---\n\n# Title` | RIGHT: `---\n# Title`

Structure the summary with:
1. **Meeting Metadata** (date, participants, duration)
2. **Scorecard Review** (if metrics discussed)
3. **Rock Review** (quarterly goals status)
4. **Headlines** (key announcements/news)
5. **Action Items** — always as `- [ ]` checklists with `-- **Owner** (date)` format
6. **Issues Discussed** (IDS items)
7. **Conclusion** (agreements, accountabilities, deadlines)

## Step 8: Present Final Summary

Display the complete L10 summary and ask:
- Save to file? (suggest: `docs/meetings/YYYY-MM-DD-meeting-summary.md`)
- Copy for sharing?
- Create any additional follow-up items?
</process>

<success_criteria>
This workflow is complete when:
- [ ] Repository context detected (owner, name, labels, milestones)
- [ ] Meeting transcript retrieved from Fireflies
- [ ] All action items extracted and categorized
- [ ] Comparison against existing issues in current repo completed
- [ ] User confirmed/skipped each proposed issue
- [ ] GitHub issues created with proper labels and checklists
- [ ] Issues added to project board (if project exists)
- [ ] EOS Level 10 summary generated with WHO/WHAT/WHEN accountability
- [ ] Raw transcript saved to vault (if configured or user requested)
- [ ] Structured meeting note saved to vault (if configured or user requested)
- [ ] Summary saved or shared as requested
</success_criteria>
