---
name: process-meeting-notes
description: "Process meeting transcripts from Fireflies and Plaud with mandatory full transcript analysis, extract action items from ALL participants, create GitHub issues with smart repo routing, run deterministic verification gates, and generate EOS Level 10 Meeting summaries. When invoked bare (no arguments), scans both sources for unprocessed meetings and walks through them one by one. Use after team meetings or when the user mentions meetings, Fireflies, Plaud, L10, or action item extraction."
---

<essential_principles>
## How This Skill Works

This skill processes meeting transcripts from **Fireflies** and **Plaud** with mandatory full transcript analysis — not just automated summaries. It extracts action items from ALL participants, routes GitHub issues to the correct repository via smart detection, and runs a deterministic verification script to ensure no items are dropped. It works with **any repository** you're currently in.

### Principle 1: Mandatory Full Transcript Analysis

Fetch meeting data from the appropriate source:

**Fireflies MCP:**
- `mcp__fireflies__fireflies_search` to find meetings
- `mcp__fireflies__fireflies_get_summary` for action items, keywords, overview
- `mcp__fireflies__fireflies_get_transcript` — ALWAYS fetch the full transcript; it is mandatory, not optional

**Plaud MCP (optional):**
- `mcp__plaud__list_files` to browse/find recordings
- `mcp__plaud__get_transcript` for timestamped transcript with speaker labels

Do NOT use `mcp__plaud__get_note`. The skill generates its own structured
summary and action items by analyzing the full transcript — Plaud's built-in
AI notes are lower quality than what this skill produces. The only Plaud tools
needed are `list_files` (to find recordings) and `get_transcript` (to get raw
dialogue).

Plaud tools are optional. If Plaud MCP is not configured in the current
environment, skip Plaud steps gracefully and process Fireflies-only. Do not
fail or error when Plaud tools are unavailable.

For both sources: a subagent must read the entire transcript to extract action
items, decisions, and key discussion points. The skill generates all summaries
itself from the raw transcript — never from a third-party AI summary.

### Principle 1b: Transcript File Format (CRITICAL)

When saving transcripts to the vault, ALL transcripts MUST use normalized Fireflies format regardless of source:

```text
Speaker Name: Content of what they said in this segment.
Speaker Name: Next thing they said.
Other Person: Their response.
```

**Rules:**
- One line per speech segment
- Format: `Speaker Name: content` — no timestamps, no bold, no brackets
- Use the speaker's real name when available (from Plaud `speaker` field or Fireflies attribution)
- NO `[MM:SS - MM:SS]` timestamps, NO `**Speaker:**` bold formatting
- The transcript body is raw dialogue only — no markdown headers or summary sections

**For Plaud specifically:**
- Call `get_transcript` (NOT `get_note`) to populate the transcript file
- Parse the returned JSON segments: each has `{content, speaker, start_time, end_time}`
- Convert each segment to one line: `{speaker}: {content}`
- NEVER save `get_note` output (AI summary) to the transcripts folder — that goes in the structured meeting note only

**For Fireflies:**
- Call `fireflies_get_transcript` — it natively outputs in the correct speaker-attributed format

### Principle 1c: Source ID in Frontmatter (MANDATORY)

Every transcript file MUST include the source recording ID in YAML frontmatter:
- Plaud recordings: `plaud_id: <file_id from Plaud>`
- Fireflies recordings: `fireflies_id: <transcriptId from Fireflies>`
- Pasted transcripts (`source: pasted`): exempt — no provider ID exists

This is the deduplication key for the unprocessed inbox workflow. Never skip it
for Plaud or Fireflies sources.

### Principle 2: Dynamic Repository Context

At workflow start, detect the current repository:
- Repository owner and name via `gh repo view`
- Available labels via `gh label list`
- Available milestones via GitHub API
- GitHub Projects (if any exist)

**Never hardcode repo-specific values.** Always detect dynamically.

### Principle 3: Compare Before Creating

Before creating new GitHub issues:
1. Search existing issues in the **current repository** for potential duplicates
2. Check against project milestones (whatever naming convention the repo uses)
3. If related issue exists, suggest commenting/updating rather than duplicating

### Principle 4: Prompt for Confirmation

For each potential GitHub issue:
- Show extracted action item
- Display suggested labels (from detected available labels)
- Ask user to confirm/modify before creation
- Never auto-assign (leave unassigned)

### Principle 5: EOS Level 10 Format

All meeting summaries follow the Level 10 Meeting structure:
- Clear accountability (WHO is responsible)
- Specific deliverables (WHAT is agreed)
- Time-bound commitments (WHEN is the deadline)

### Principle 6: Action Items as Checklists

Action items MUST always use markdown checkbox format — never tables or plain bullets:
```markdown
- [ ] Action description -- **Owner Name** (due date)
```
This enables Obsidian task tracking and interactive checkboxes.

### Principle 7: CRM Pipeline Awareness

After saving to vault (Step 7), detect whether the meeting is CRM-relevant
(sales, discovery, client, or diagnostic). If so, check Attio for existing
deals, propose stage transitions and task updates, and execute only after
user confirmation.

**Detection uses short-circuit evaluation to avoid unnecessary API calls:**
1. Check `attio_deal_id` in frontmatter — signal 4 (validate deal exists before trusting)
2. Check `meeting_type` (sales/discovery/client/diagnostic) — signal 1, local, no API
3. Check Fireflies/Plaud keywords — signal 2, local, no API
4. Query Attio for active deal linkage — signal 3, **only as tiebreaker when exactly 1 local signal exists**
Zero-signal meetings never touch the Attio API.

**Key constraints:**
- MCP `create_record` cannot create deals (owner field unsupported). Use REST API via curl when deal creation is needed.
- Only deal-advancing tasks go to Attio (per `attio-task-scope.md`). Everything else stays as GitHub issues.
- All changes are collected and presented for confirmation before execution.
- On partial failure: log pending changes to temp file, warn user, do not continue silently.

See `references/attio-crm-integration.md` for deal stages, task templates,
MCP tool inventory, and REST API curl template.

### Principle 8: Issue Hierarchy — Parent Issues with Sub-Issues

When a meeting produces 2+ action items for the same source (meeting, project,
participant cluster), do NOT create N flat standalone issues. Apply hierarchy:

1. **Single item** from a source → standalone issue
2. **2+ items** from a source → create a parent issue first, then:
   - Simple items (send a link, read something) → checklist in parent body
   - Complex items (needs own research thread, labels, multi-step) → native sub-issue via REST API

**Creating sub-issues via API:**
```bash
CHILD_ID=$(gh api repos/OWNER/REPO/issues/$CHILD_NUM --jq '.id')
echo "{\"sub_issue_id\": $CHILD_ID}" | gh api repos/OWNER/REPO/issues/$PARENT_NUM/sub_issues --method POST --input -
```

**Critical:** `sub_issue_id` is the REST API `id` (large integer), NOT the issue
number. `-f` sends strings and causes 422 — pipe JSON with `--input -`.

**Same-owner constraint:** GitHub's native sub-issues API requires the sub-issue
to belong to the **same repository owner** as the parent (per the
[Add sub-issue REST docs](https://docs.github.com/en/rest/issues/sub-issues#parameters-for-add-sub-issue)).
Cross-**repository** attachment works as long as both repos share an owner (e.g.
`skinnyandbald/SecondBrain` ↔ `skinnyandbald/distil`). Cross-**owner / cross-org**
attachment is NOT supported and returns 422 — for those items, keep them as
standalone issues or as checklist entries in the parent body instead of native
sub-issues.

See the **Issue Hierarchy decision tree** in the
`workflows/process-recent-meeting.md` (Step 5.75) for the full grouping logic and
parent body format.
</essential_principles>

<configuration>
## Optional: Vault Integration

If you want meeting notes and transcripts saved to a personal knowledge base (Obsidian vault, SecondBrain, etc.), set these environment variables or define them in your project's CLAUDE.md:

| Variable | Purpose | Example |
|----------|---------|---------|
| `MEETING_NOTES_DIR` | Where structured meeting notes are saved | `~/SecondBrain/02_Areas/notes` |
| `MEETING_TRANSCRIPTS_DIR` | Where raw transcripts are archived | `~/SecondBrain/02_Areas/notes/transcripts` |

**If not set:** The skill will only generate GitHub issues and L10 summaries without saving to a vault. It will ask the user where to save if they request it.

**If set:** The skill automatically saves:
1. **Structured meeting note** to `$MEETING_NOTES_DIR/YYYY-MM-DD - Entity - Topic.md`
2. **Raw transcript** (when piped in directly or fetched from Fireflies) to `$MEETING_TRANSCRIPTS_DIR/YYYY-MM-DD - Source - Topic.md`

### File Naming Convention

Notes: `YYYY-MM-DD - Entity - Topic.md` (e.g., `2026-03-13 - Hampton - Core Meeting.md`)
Transcripts: `YYYY-MM-DD - Source - Topic.md` (e.g., `2026-03-13 - Fireflies - Hampton Core Meeting.md`)

### Transcript Frontmatter

```yaml
---
date: YYYY-MM-DD
type: transcript
source: fireflies | pasted | plaud
fireflies_id: <transcript_id>  # required when source: fireflies
plaud_id: <file_id>            # required when source: plaud
meeting_type: sales | internal | peer-advisory | other
attendees: [...]
processed_note: "YYYY-MM-DD - Entity - Topic.md"
---
```

The `processed_note` field links the raw transcript to its structured meeting note.
</configuration>

<intake>
What would you like to do?

0. **Process unprocessed inbox** - Scan Fireflies and Plaud for unprocessed meetings, walk through each one
1. **Process recent meeting** - Analyze the most recent meeting from Fireflies or Plaud and extract action items
2. **Search specific meeting** - Find a meeting by date, keyword, or participant
3. **Create issues from notes** - I already have meeting notes to convert to GitHub issues
4. **Generate L10 summary only** - Create EOS Level 10 summary without creating issues

**If invoked with no arguments, default to option 0.**

**Wait for response before proceeding.**
</intake>

<routing>
| Response | Workflow |
|----------|----------|
| 0, no args, "unprocessed", "inbox" | `workflows/process-unprocessed-inbox.md` |
| 1, "recent", "latest", "today" | `workflows/process-recent-meeting.md` |
| 2, "search", "find", "specific" | `workflows/search-meeting.md` |
| 3, "create", "notes", "issues" | `workflows/create-issues-from-notes.md` |
| 4, "summary", "L10", "EOS" | `workflows/generate-l10-summary.md` |

**After reading the workflow, follow it exactly.**
</routing>

<reference_index>
All domain knowledge in `references/`:

**EOS Framework:** eos-level-10-format.md
**GitHub Integration:** github-project-config.md (dynamic detection patterns)
**Attio CRM Integration:** attio-crm-integration.md (deal stages, MCP tools, task templates, REST API)
</reference_index>

<workflows_index>
| Workflow | Purpose |
|----------|---------|
| process-unprocessed-inbox.md | Scan Fireflies + Plaud for unprocessed meetings, present queue, walk through each |
| process-recent-meeting.md | Full workflow: detect context → fetch → compare → create issues → L10 summary |
| search-meeting.md | Find specific meeting by criteria |
| create-issues-from-notes.md | Convert provided notes to GitHub issues |
| generate-l10-summary.md | Create L10 summary from existing analysis |
</workflows_index>

<templates_index>
| Template | Purpose |
|----------|---------|
| l10-meeting-summary.md | EOS Level 10 Meeting summary structure |
| github-issue-checklist.md | Issue body with implementation checklist |
</templates_index>
