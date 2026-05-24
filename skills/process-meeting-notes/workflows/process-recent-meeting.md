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

## Step 1: Fetch Recent Meeting

Determine the source (Fireflies or Plaud) and fetch recent meetings.

If coming from the inbox workflow (`process-unprocessed-inbox.md`), the source
and meeting ID are already known — skip the listing and proceed directly to
Step 2 with the provided ID.

**If source is not yet known:** Check both sources (Fireflies first, then
Plaud if available) and present a combined list so the user can pick the
correct meeting regardless of source. Skip Plaud if its MCP tools are not
configured.

**If source is Fireflies:**
```text
mcp__fireflies__fireflies_get_transcripts with limit: 5
```
Or search by keyword:
```text
mcp__fireflies__fireflies_search with query: "keyword:\"<term>\" limit:5"
```

**If source is Plaud:**
```text
mcp__plaud__list_files with page: 1, page_size: 10
```

Present the meeting list to user and confirm which one to process.

## Step 2: Retrieve Meeting Summary

Once meeting is selected, fetch the summary from the appropriate source.

**Fireflies:**
```text
mcp__fireflies__fireflies_get_summary with transcriptId: <selected_meeting_id>
```
Extract: Action Items, Keywords, Overview, Participants.

**Plaud:**
```text
mcp__plaud__get_note with fileId: <selected_file_id>
```
The note returns a Markdown document with Core Synopsis, Decision Architecture,
and Action Items sections. Extract the same categories from this structure.

## Step 3: Retrieve and Analyze Full Transcript (MANDATORY)

ALWAYS fetch the full transcript. The automated summary is a starting point,
not the final extraction.

**Fireflies:**
```text
mcp__fireflies__fireflies_get_transcript with transcriptId: <selected_meeting_id>
```

**Plaud:**
```text
mcp__plaud__get_transcript with fileId: <selected_file_id>
```
The Plaud transcript returns an array. The item with `data_type: "transaction"`
contains JSON-encoded segments, each with `{content, start_time, end_time, speaker}`.
Parse these into the same `[MM:SS - MM:SS] Speaker: content` format used downstream.

Dispatch a subagent to read the transcript and extract:
- Explicit commitments: "I'll handle...", "Let me do...", "I need to..."
- Implicit tasks: "we should...", "we need to...", "the next step is..."
- Product changes: "we need to add X", "the product should have X"
- Business tasks: "reach out to X", "set up Y", "write Z"
- Research tasks: "look into X", "check on Y", "figure out Z"

The subagent MUST read the ENTIRE transcript file in a single pass. A vague
"summarize this" prompt will lose detail. Be explicit: "Read the full file,
then list every action item with the speaker name and timestamp."

If the transcript exceeds 200K chars, fall back to chunked reading with
offset/limit to cover the whole file — but try single-pass first.

Merge the subagent's extraction with Fireflies' automated action items.
Deduplicate conservatively: only merge items with exact normalized text AND
matching owner. For ambiguous near-matches, surface both to the user for
confirmation. When in doubt, keep both items — over-extraction is better
than under-extraction.

Decisions made during the meeting (e.g. "we agreed that...", "the decision
is...") are tracked separately in the IDS section of the L10, not as action
items. Do not include decisions in the action item extraction list.

### CHECKPOINT A: Extraction Count
Print: "Extracted N total action items:"
Print: "  - M from Fireflies automated summary"
Print: "  - K additional from full transcript analysis"

If K = 0 and the meeting was longer than 30 minutes, print an advisory:
"Zero additional items from transcript analysis. This is unusual for a
meeting of this length. Verify the transcript was fully read."
(Do NOT force a re-scan — K=0 is valid if coverage appears correct.)

Define `MEETING_ID` from the source-specific ID selected in Step 1:
- Fireflies: use the transcript ID (the `<selected_meeting_id>` value)
- Plaud: use the file ID (the `<selected_file_id>` value)

Use `$MEETING_ID` consistently in all temp file paths and shell commands.

Write N to `/tmp/meeting-notes-$MEETING_ID-extraction-count.txt` for use at Checkpoint C.
The source-specific ID namespaces temp files and prevents cross-run contamination.

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

## Step 5.5: Determine Target Repository for Each Issue

Before creating issues, determine the correct repository for each item.

**Detection logic:**
1. Extract the project/company context from the meeting (participants, topic, keywords)
2. Fetch the authenticated user's repo list once: `GH_LOGIN=$(gh api user -q '.login' 2>/dev/null)` then `gh repo list "$GH_LOGIN" --limit 200 --json name --jq '.[].name'`. Fuzzy-match the meeting's project/company name against this list (case-insensitive, strip hyphens for comparison). If exactly one repo matches, use it. If multiple match, present options to the user. If zero match, route to SecondBrain.

**Fallback:** If `gh` CLI is unavailable, rate-limited, or errors on all lookups, default all items to SecondBrain repo and notify the user: "Repo detection unavailable — routing all issues to SecondBrain."

**Routing rules:**
- **Product/engineering tasks** (code changes, features, bugs, technical debt) -> project repo if it exists
- **Business/consulting/personal tasks** (outreach, strategy, content, follow-ups) -> SB repo
- **If no project repo exists** -> SB repo (with project prefix in title)

**Present the routing to the user for each CREATE ISSUE item:**
```
PROPOSED ISSUE #3
  Title: [DISTIL] - Product - Add PII consent checkbox
  Repo: skinnyandbald/distil (detected from meeting context)
  [confirm / change repo / skip]
```

**The user can override any routing.** The detection is a suggestion, not a mandate.

**If multiple repos are relevant** (e.g., meeting covers both Distil product work and Ben's consulting tasks), group issues by repo in the triage table:

```
=== skinnyandbald/distil (3 issues) ===
#1 [CREATE ISSUE] Add PII consent checkbox -- Ben (this week)
#2 [CREATE ISSUE] Model token costs -- Jared (this week)

=== skinnyandbald/SecondBrain (2 issues) ===
#3 [CREATE ISSUE] [DISTIL] Share training content with Jared -- Ben (next week)
#4 [CREATE ISSUE] [DISTIL] Coordinate sprint integration -- Ben (ongoing)

=== L10 Only (5 items) ===
#5-9 [L10 ONLY] Jared's tasks (tracked in L10, no issue)
```

## Step 6: Create GitHub Issues (with confirmation)

**CRITICAL: Present ALL extracted action items to the user for triage.**
Do NOT pre-filter, skip, or decide on the user's behalf which items
deserve GitHub issues. Present every item — including items assigned to
other participants. The user decides what to track.

Each item has exactly one of three states after triage:
- CREATE ISSUE: user wants a GitHub issue created
- L10 ONLY: track in the L10 but no GitHub issue needed
- SKIP: user explicitly chose not to track this item

Items assigned to other participants default to L10 ONLY. Do NOT create
GitHub issues for non-user-owned items unless the user explicitly approves.

If the combined extraction count is 0, skip Step 6 (issue triage). Still generate the L10 in Step 8 — meetings with zero action items may still have decisions, IDS items, and headlines worth capturing.

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

### CHECKPOINT B: Issue Triage Completeness
Print: "Triaged N action items:"
Print: "  - X created as GitHub issues (issue_created)"
Print: "  - Y tracked in L10 only (l10_only)"
Print: "  - Z skipped by user (user_skipped)"

These three states are mutually exclusive. Every extracted item must be
in exactly one state.

Verify: X + Y + Z = COMBINED_COUNT
If not equal, items were dropped. List what's missing before proceeding.

Write Z (skipped count) to `/tmp/meeting-notes-$MEETING_ID-skipped-count.txt`
for use at Checkpoint C.

## Step 7: Save Transcript and Meeting Note to Vault

**Check if vault integration is configured:**
- Look for `MEETING_NOTES_DIR` and `MEETING_TRANSCRIPTS_DIR` env vars
- Or check the project's CLAUDE.md for these paths
- If neither is set, ask: "Want to save the meeting note and transcript? If so, where?"

**If configured (or user provides a path):**

**7a. Save raw transcript:**
- If transcript was pasted directly by the user, always save it (it's not recoverable elsewhere)
- If transcript was fetched from Fireflies or Plaud, save it too (local copy for search/reference)
- Save to `$MEETING_TRANSCRIPTS_DIR/YYYY-MM-DD - Source - Topic.md`
- Source = "Fireflies", "Plaud", or "Pasted" depending on origin
- Include frontmatter with `processed_note` linking to the structured note

**Source-specific frontmatter:**

Fireflies:
```yaml
---
date: YYYY-MM-DD
type: transcript
source: fireflies
fireflies_id: <transcript_id>
meeting_type: <type>
attendees: [...]
tags: [transcript, from-fireflies]
processed_note: "YYYY-MM-DD - Entity - Topic.md"
---
```

Plaud:
```yaml
---
date: YYYY-MM-DD
type: transcript
source: plaud
plaud_id: <file_id>
duration: HH:MM:SS
speakers: <count>
tags: [transcript, from-plaud]
processed_note: "YYYY-MM-DD - Entity - Topic.md"
---
```

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

**Action Items section MUST include tasks for ALL meeting participants.**
The L10 format tracks accountability across everyone in the meeting. If
Jared committed to 6 tasks and Ben committed to 5, all 11 appear in the
Action Items section with their respective owners.

Link GitHub issue numbers inline where issues were created:
- [ ] Action description -- **Owner** (due date) [#NNN](url)

**IDS section MUST capture decisions made during the meeting.**
For each decision: record what was decided, who decided, and any rationale.
Decisions are distinct from action items — they go in IDS, not Action Items.

**Transcript fetch failure handling:** If the transcript fetch fails (Fireflies
or Plaud API error), warn the user and proceed with the summary only. Note in
the L10 that full transcript analysis was unavailable.

### CHECKPOINT C: Run Verification Script

Before running verification, save the L10 content to a temp file for the script to validate:
```bash
L10_FILE_PATH="/tmp/meeting-notes-$MEETING_ID-l10-draft.md"
# Write the generated L10 content to this path
```

Read counts from temp files:
```bash
COMBINED_COUNT=$(cat /tmp/meeting-notes-$MEETING_ID-extraction-count.txt)
SKIPPED_COUNT=$(cat /tmp/meeting-notes-$MEETING_ID-skipped-count.txt)
```

Run the verification script:
```bash
bash ~/.claude/skills/process-meeting-notes/bin/verify-extraction-completeness.sh \
  "$COMBINED_COUNT" \
  "$SKIPPED_COUNT" \
  "$L10_FILE_PATH"
```

DO NOT mark the workflow as complete until this script exits 0.
If it fails, add the missing items to the L10 and re-run.

Clean up temp files after verification: `rm -f /tmp/meeting-notes-$MEETING_ID-*.txt`

## Step 8.5: Extract Content Angles (Optional)

Mine the meeting for content-worthy moments and append to the spark angle
queue. Skip this step if:
- The meeting was purely operational (standup, sprint planning, no insights)
- No `angle-queue.md` exists at `$CONTENT_CREATION_DIR/angle-queue.md`
  (check `02_Areas/content-creation/angle-queue.md` for SecondBrain)
- The angle queue file cannot be resolved

**What to extract:**

Look for these signals in the transcript analysis and L10 already generated:
- Contrarian takes that challenge conventional wisdom
- Real examples with specific numbers or outcomes (not hypothetical)
- Pattern recognition across participants ("three people described the same problem")
- War stories with concrete details
- Questions the user asked that reveal a unique angle or framework

**What to skip:**
- Generic meeting outcomes ("we decided to ship the feature")
- Other participants' internal tasks
- Anything that restates common knowledge without a twist

**Extract 0-3 angles max.** Zero is a valid outcome — not every meeting has
content signal.

**Format each angle** to match the spark angle queue:
```text
- **Angle Title** | Source: YYYY-MM-DD Meeting Name | Persona: capability|stuck | Type: pattern|contrarian|war-story|client-result | Platform: linkedin|both|newsletter | Extracted: YYYY-MM-DD | "key quote or context"
```

**Persona mapping:**
- `capability` = "here's how to do something better" (techniques, frameworks, workflows)
- `stuck` = "here's what's blocking you and why" (diagnosis, reframes, identity threats)

**Append to `## Ready` section** of `angle-queue.md`. Do not rewrite the file —
use Edit to insert after the `## Ready` line.

If angles were extracted, print:
```text
Content mining: added N angle(s) to spark queue
```

## Step 9: Present Final Summary

Display the complete L10 summary and ask:
- Save to file? (suggest: `docs/meetings/YYYY-MM-DD-meeting-summary.md`)
- Copy for sharing?
- Create any additional follow-up items?
</process>

<success_criteria>
This workflow is complete when:
- [ ] Repository context detected (owner, name, labels, milestones)
- [ ] Meeting transcript retrieved from Fireflies or Plaud
- [ ] All action items extracted and categorized
- [ ] Comparison against existing issues in current repo completed
- [ ] User confirmed/skipped each proposed issue
- [ ] GitHub issues created with proper labels and checklists
- [ ] Issues added to project board (if project exists)
- [ ] EOS Level 10 summary generated with WHO/WHAT/WHEN accountability
- [ ] Raw transcript saved to vault (if configured or user requested)
- [ ] Structured meeting note saved to vault (if configured or user requested)
- [ ] Summary saved or shared as requested
- [ ] Full transcript retrieved and analyzed (not just automated summary)
- [ ] ALL action items from ALL participants included in L10
- [ ] Decisions captured in L10 IDS section
- [ ] Verification script passed (L10 count >= combined - skipped)
- [ ] User triaged every extracted item (none silently dropped)
- [ ] All three triage states sum to COMBINED_COUNT
- [ ] Issues routed to correct repos (project repo for product work, SB for business tasks)
- [ ] Content angles extracted and appended to angle queue (if meeting had signal)
</success_criteria>
