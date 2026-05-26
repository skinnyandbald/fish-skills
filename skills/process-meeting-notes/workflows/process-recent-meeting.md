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
Skip this step for Plaud — do NOT call `get_note`. The skill generates its own
summary from the full transcript in Step 3. Plaud's AI notes are not used.

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
Parse each segment into normalized Fireflies format: `Speaker Name: content`
(one line per segment, no timestamps, no bold, no brackets). See Principle 1b
in SKILL.md for the exact format spec.

Dispatch a subagent to read the transcript and extract:
- Explicit commitments: "I'll handle...", "Let me do...", "I need to..."
- Implicit tasks: "we should...", "we need to...", "the next step is..."
- Product changes: "we need to add X", "the product should have X"
- Business tasks: "reach out to X", "set up Y", "write Z"
- Research tasks: "look into X", "check on Y", "figure out Z"

The subagent MUST read the ENTIRE transcript file in a single pass. A vague
"summarize this" prompt will lose detail. Be explicit: "Read the full file,
then list every action item with the speaker name and a supporting quote."

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
- Source = "Fireflies", "PLAUD", or "Pasted" depending on origin
- Include frontmatter with `processed_note` linking to the structured note
- **Body format:** MUST be normalized Fireflies format per Principle 1b in SKILL.md:
  `Speaker Name: content` — one line per segment, no timestamps, no bold
- **NEVER save AI summary content to the transcripts folder.** Do not call `get_note` at all.
  The skill generates its own summaries in the structured meeting note (Step 7b). Transcripts folder = raw dialogue only.

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

## Step 7.5: CRM Pipeline Update

**Skip this step if:** the meeting has 0 CRM-relevant signals (see Principle 7 in SKILL.md).

Read `references/attio-crm-integration.md` before executing this step.

### 7.5-detect: Check CRM Relevance

Evaluate signals in **short-circuit order** to avoid unnecessary API calls:

**Fast path (no API — re-run only):**
4. **Frontmatter signal:** If a structured meeting note already exists from a prior run (Step 7b writes `attio_deal_id` on first successful CRM update), check its `attio_deal_id` field. On first-run processing, this signal is naturally absent — fall through to local signals. If present, **validate the deal exists** via MCP `get-records-by-ids`. If valid → skip detection, go directly to 7.5a. If deal is missing/archived → clear the ID from frontmatter, fall through to normal detection.

**Local signals (no API):**
1. **Meeting type signal:** `meeting_type` (from frontmatter or Fireflies/Plaud metadata) is one of: `sales`, `discovery`, `client`, `diagnostic`
2. **Keyword signal:** Fireflies or Plaud summary keywords (from Step 2) contain any of: pricing, proposal, diagnostic, engagement, retainer, sprint, consulting, quote, SOW

**API signal (tiebreaker only):**
3. **Active deal signal:** Only query Attio if exactly 1 local signal is present. Search for participant emails linked to active deals (Lead or In Progress stage):
   ```
   mcp__claude_ai_Attio__search-records with object: "deals", query: "<participant email or company name>"
   ```
   Filter results for stages Lead or In Progress. Check if any deal's `associated_people` or `associated_company` matches a meeting participant.

**Decision:**
- **Signal 4 valid** → proceed directly to 7.5a with known deal ID
- **2+ local signals (1+2)** → proceed to 7.5a without API call
- **1 local signal** → query Attio (signal 3). If match → proceed. If no match → ask user.
- **0 local signals** → skip to Step 8 silently. **Do not query Attio.**

### 7.5a: Find the Deal

1. **If `attio_deal_id` is known** (from frontmatter signal): fetch the deal directly:
   ```
   mcp__claude_ai_Attio__get-records-by-ids with object: "deals", record_ids: ["<attio_deal_id>"]
   ```

2. **Otherwise:** search by company name and participant emails:
   ```
   mcp__claude_ai_Attio__search-records with object: "deals", query: "<company name>"
   ```
   Filter results to stages Lead or In Progress.

3. **If multiple deals found:** present a numbered list and ask user to pick.

4. **If zero deals found:**
   Print: "No Attio deal found for {company}. Create one? (yes/no)"
   - **If yes:** Create via REST API (MCP cannot create deals -- see reference doc for curl template). Use the company name + meeting type for the deal name. Set stage to Lead. Link to the company and person records if they exist.
   - **If no:** Print "Skipping CRM update." and proceed to Step 8.
   - **On API error (4xx/5xx):** Print the error. Do not leave a partial deal. Skip CRM steps.

Extract from the deal record: `deal_id`, `deal_name`, current `stage`, current `next_step`, `offer_type` (consulting or partnership).

### 7.5b: Determine Stage Transition

Read the current stage from the deal record. Handle by current stage:

**If Lead:**
| Target | Trigger |
|--------|---------|
| In Progress | Discovery/diagnostic call happened, agreed next commercial step |
| Lost | Prospect declined, ghosted, or call revealed bad fit |

**If In Progress:**
| Target | Trigger |
|--------|---------|
| Won | Payment confirmed or contract signed (require explicit user confirmation — Tally/n8n is normal source of truth. Do not infer Won from transcript language.) |
| Lost | Explicit no from prospect |

**If Won or Lost:**
No stage transition. Update `next_step` only if the meeting produced actionable follow-ups. Won-stage meetings are typically delivery — present as: "This appears to be a delivery meeting on a Won deal. Update next step only?"

If the meeting doesn't clearly indicate a transition, default to **no stage change** but still update `next_step`. Always include `next_step` in the confirmation UX for user review.

**Collect but do not execute:** save the proposed stage change (or "no change") for the confirmation UX.

### 7.5c: Collect Deal Updates

Collect pending changes (do not execute yet):
- `stage`: the new stage (if transitioning) or current stage (if no change)
- `next_step`: set to the most immediate Ben action item from the **Step 3 extraction** (not from the L10, which hasn't been generated yet)

### 7.5d: Collect Task Lifecycle Changes

1. **List existing tasks:**
   ```
   mcp__claude_ai_Attio__list-tasks with linked_record_object: "deals", linked_record_id: "<deal_id>", is_completed: false
   ```

2. **Identify tasks to complete.** For each existing task, check if its content matches a known template string from the reference doc's "Consulting Task Templates" section. Matching rules:
   - Case-insensitive comparison
   - Replace `{Company}` and `{Name}` in the template with the actual company/contact name
   - Match if the existing task content **starts with** the substituted template string (tasks may have extra context appended)
   - If a task doesn't match any template: flag it as "unmatched" and include it in the confirmation UX with a `[?]` marker

3. **Identify tasks to create — only when a stage transition was confirmed.** If the deal stays at the same stage, do NOT create new template tasks. When creating:
   - Check `offer_type` on the deal to select consulting vs partnership templates
   - Read the templates for the **target stage** from `deal-creation-tasks.md`
   - Substitute `{Company}` and `{Name}` with actual values
   - Check if an incomplete task on the deal already has a matching title (exact match after substitution). If so, skip.
   - Calculate deadlines from today's date per the template (Day 0 = today, Day +3 = today + 3 days). Use ISO 8601 UTC midnight format.

4. **Filter:** only include deal-advancing tasks (per `attio-task-scope.md`). Non-deal-advancing items should already be GitHub issues from Step 6.

### 7.5-confirm: Present Confirmation

Present all collected changes in one block:

```text
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  CRM UPDATE -- {Company Name}
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Deal: {deal name} ({current stage})
  Proposed stage: {current stage} -> {new stage} (or "no change")
  Next step: "{most immediate action}"

  Tasks to complete:
    [x] {task content} (matched template)
    [x] {task content} (matched template)
    [?] {task content} (unmatched -- confirm?)

  Tasks to create:
    [ ] {task content} (Day 0)
    [ ] {task content} (Day +3)

  consulting-state.md: will update Pipeline section

  [confirm all / skip CRM update]
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Wait for user confirmation. User can: confirm all, skip entirely, or modify individual items.

**Only after confirmation:** proceed to 7.5-execute.

### 7.5-execute: Execute With Error Handling

Execute in this order:

1. **Update deal record** (stage + next_step):
   ```
   mcp__claude_ai_Attio__update-record with object: "deals", record_id: "<deal_id>", values: { "stage": "<new_stage>", "next_step": "<next_step>" }
   ```

2. **Verify the update** — read the deal back to confirm:
   ```
   mcp__claude_ai_Attio__get-records-by-ids with object: "deals", record_ids: ["<deal_id>"]
   ```
   Confirm stage and next_step match intended values. If verification fails, stop and warn user.

3. **Complete matched tasks** (for each task to complete):
   ```
   mcp__claude_ai_Attio__update-task with task_id: "<task_id>", is_completed: true
   ```

4. **Create new stage tasks** (only if stage transition was confirmed; for each task to create):
   ```
   mcp__claude_ai_Attio__create-task with content: "<task content>", assignee_workspace_member_id: "d5828bae-2782-4e17-94d2-a0380207c8a7", linked_record_object: "deals", linked_record_id: "<deal_id>", deadline_at: "<calculated deadline>"
   ```

5. **Write `attio_deal_id` to meeting note frontmatter** — if the deal was found via search (not from existing frontmatter), edit the meeting note's YAML to add `attio_deal_id: <deal_id>`. This makes future runs idempotent.

6. **Update consulting-state.md** (only after steps 1-4 verified):
   Edit `02_Areas/consulting/consulting-state.md` Pipeline section. If the Pipeline section is missing, issue a warning and skip this update rather than auto-creating the section. Otherwise, add/update the deal entry with:
   - Deal ID, current stage, old stage
   - Dated note: "Moved to {stage} after {meeting_type} on {date}"
   - Tasks completed and created
   - Latest context from the meeting

**Error handling:** If any of steps 1-6 fails:
- Write the full set of intended changes (completed + pending) to `/tmp/crm-update-{deal_id}-{timestamp}.md`
- Print: "CRM update partially failed at step {N}. Pending changes saved to {path}."
- Print what succeeded and what didn't
- Do NOT silently continue to Step 8 — ask user how to proceed

**On full success:** Print:
```text
CRM updated: {deal name} ({old stage} -> {new stage}), {N} tasks completed, {M} tasks created
```

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
queue.

**Resolve the angle queue path:** Use `$CONTENT_CREATION_DIR/angle-queue.md` if
set, otherwise fall back to `02_Areas/content-creation/angle-queue.md`.

Skip this step if:
- The meeting was purely operational (standup, sprint planning, no insights)
- No `angle-queue.md` exists at the resolved path
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

**Append to `## Ready` section** of `angle-queue.md`.
If `## Ready` is missing, skip append and notify the user with a warning.
Do not rewrite the file — use Edit to insert after the `## Ready` line.

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
- [ ] Content angles extracted and appended to angle queue (if meeting had signal AND queue file/Ready section were resolvable); otherwise skip was reported
- [ ] CRM relevance detected (or correctly skipped for non-sales meetings)
- [ ] Attio deal found (or user chose to create/skip)
- [ ] Stage transition proposed and confirmed (or no change)
- [ ] Pre-meeting tasks completed in Attio
- [ ] New stage-appropriate tasks created in Attio
- [ ] consulting-state.md updated with pipeline change
- [ ] All CRM changes confirmed by user before execution
</success_criteria>
