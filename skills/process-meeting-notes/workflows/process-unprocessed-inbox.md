# Workflow: Process Unprocessed Inbox

Scan both Fireflies and Plaud for meetings that have not yet been processed
into the vault. Present a unified queue and walk through each one using the
`process-recent-meeting.md` workflow.

<process>
## Step 1: Scan Fireflies for Recent Meetings

Fetch recent Fireflies meetings:
```
mcp__fireflies__fireflies_get_transcripts with limit: 20
```

Collect each meeting's ID and title into a candidate list:
```
FIREFLIES_CANDIDATES = [{ id, title, date, duration, source: "fireflies" }, ...]
```

## Step 2: Scan Plaud for Recent Recordings

Fetch recent Plaud recordings:
```
mcp__plaud__list_files with page: 1, page_size: 20
```

If fewer than `page_size` results returned, that's all recordings. Otherwise,
fetch additional pages (up to 5 pages max = 100 recordings) to cover a
reasonable window.

Collect each recording into the same candidate format:
```
PLAUD_CANDIDATES = [{ id, title, date, duration, source: "plaud" }, ...]
```

## Step 3: Cross-Reference Against Vault

For each candidate, check whether a matching transcript already exists in
the vault by grepping for the source-specific ID in frontmatter.

**Fireflies — check for `fireflies_id`:**
```bash
grep -rl "fireflies_id: <id>" "$MEETING_TRANSCRIPTS_DIR" 2>/dev/null
```

**Plaud — check for `plaud_id`:**
```bash
grep -rl "plaud_id: <id>" "$MEETING_TRANSCRIPTS_DIR" 2>/dev/null
```

If `MEETING_TRANSCRIPTS_DIR` is not set, check the project's CLAUDE.md for
the transcripts path. For SecondBrain, it's `02_Areas/notes/transcripts/`.

**If grep returns a match:** the meeting has already been processed. Remove
from the candidate list.

**If grep returns nothing:** the meeting is unprocessed. Keep it.

## Step 4: Present Unified Queue

Merge remaining Fireflies and Plaud candidates into one list, sorted by
date (newest first). Present to the user:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  UNPROCESSED MEETINGS (N total)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  #  | Source    | Date       | Duration | Title
  ---|-----------|------------|----------|---------------------------
  1  | Fireflies | 2026-05-22 | 45m      | Weekly Sync with Hugo
  2  | Plaud     | 2026-05-21 | 23m      | Coffee chat Pierre
  3  | Fireflies | 2026-05-20 | 1h12m    | Hampton Core Meeting
  ...

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Process all sequentially, pick specific ones, or skip?
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

If the queue is empty, tell the user: "All recent meetings have been
processed. Nothing in the inbox."

**Wait for user response.** Options:
- "all" / "yes" — process every item sequentially (newest first)
- Numbers (e.g., "1, 3") — process only selected items
- "skip" / "none" — exit without processing

## Step 5: Process Each Meeting

For each selected meeting, delegate to `workflows/process-recent-meeting.md`
with the source and ID pre-set:

- **source** = "fireflies" or "plaud"
- **meeting_id** = the Fireflies transcript ID or Plaud file ID

The `process-recent-meeting.md` workflow's Step 1 will detect that the source
and ID are already known and skip the listing/selection step.

After each meeting is fully processed (L10 saved, issues triaged, verification
passed), move to the next item in the queue.

Between meetings, print a brief separator:
```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  Completed 1/N. Moving to next: "Coffee chat Pierre" (Plaud, 2026-05-21)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

## Step 6: Final Summary

After all selected meetings are processed, present a roll-up:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
  INBOX PROCESSING COMPLETE
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

  Processed: N meetings
  Issues created: X across Y repos
  L10 summaries: N saved

  Remaining unprocessed: M meetings (if any were skipped)
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```
</process>

<success_criteria>
This workflow is complete when:
- [ ] Fireflies scanned for recent meetings
- [ ] Plaud scanned for recent recordings
- [ ] Each candidate cross-referenced against vault frontmatter IDs
- [ ] Unified queue presented to user (sorted by date, newest first)
- [ ] User selected which meetings to process (or all)
- [ ] Each selected meeting fully processed via process-recent-meeting.md
- [ ] Final roll-up summary presented
</success_criteria>
