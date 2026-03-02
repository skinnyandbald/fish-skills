---
name: eos-scorecard-autopull
description: Enhanced scorecard entry with auto-pull from Attio CRM, Clay calendar, and filesystem. Presents suggestions for interactive confirmation before writing.
file-access: [02_Areas/eos/data/scorecard/, 02_Areas/content-creation/2 published/]
tools-used: [Read, Write, Glob, Grep, Bash, AskUserQuestion, mcp__attio-mcp__search_records, mcp__attio-mcp__search_records_advanced, mcp__attio-mcp__get_record_details, mcp__clay__searchContacts, mcp__clay__getEvents]
---

# eos-scorecard-autopull

Enhanced weekly scorecard entry that auto-pulls data from Attio CRM, Clay, and the filesystem, then presents pre-populated suggestions for the user to confirm or edit interactively before writing the scorecard file.

**This skill wraps `ceos-scorecard` -- it does NOT replace it.** After interactive confirmation, it writes the file using the same format as `ceos-scorecard` Mode: Log Weekly.

## When to Use

This skill is invoked by the `/eos` router when the user says "scorecard" and the session was triggered by `eos-ritual.sh` (cron) OR anytime the user wants to log scorecard numbers.

## Prerequisites

- Attio MCP server connected (for CRM deal data)
- Clay MCP server connected (for calendar/email metadata)
- CEOS data root at `02_Areas/eos/` (per CLAUDE.md)

## Process

### Step 1: Determine the Week

Calculate the current ISO week (`YYYY-WNN`). Check if `02_Areas/eos/data/scorecard/weeks/YYYY-WNN.md` already exists. If so, tell the user and ask if they want to update it.

Determine the week's date range (Monday through Sunday) for filtering queries.

### Step 2: Read Metric Definitions

Read `02_Areas/eos/data/scorecard/metrics.md` to get the 7 metrics, their goals, and green/red thresholds.

### Step 3: Auto-Pull Data (run queries in parallel where possible)

For each metric, pull data from the appropriate source. **Run independent queries in parallel to save time.**

#### 3a. Attio CRM Queries

Query Attio for deal activity during the scorecard week:

1. **Discovery Calls Booked** -- Search deals that moved to stage "Booked" this week.
   - Use `search_records` with `resource_type: "deals"` filtered by stage and date.
   - Count deals + list their names and values.

2. **Proposals Sent** -- Search deals that moved to stage "In Progress" this week.
   - Use `search_records` with `resource_type: "deals"` filtered by stage and date.
   - Count deals + list their names.

3. **Pipeline Value (New)** -- Sum the value of all deals created or that changed stage this week.
   - Look for deals at stages Lead, In Progress, Booked with activity this week.
   - Sum their `value` fields.

4. **Revenue Collected** -- Search deals at stage "Won" this week.
   - Use `search_records` with `resource_type: "deals"` filtered to stage "Won".
   - Sum their values.

**Attio query pattern:**
```
search_records_advanced(
  resource_type: "deals",
  filters: {
    filters: [
      { attribute: { slug: "stage" }, condition: "equals", value: "<stage>" }
    ]
  },
  limit: 50
)
```

Then filter results by date in the current week. For each matching deal, use `get_record_details` to get the full record including value.

#### 3b. Clay Calendar Query

Query Clay for calendar events during the scorecard week:

```
getEvents(start: "YYYY-MM-DD", end: "YYYY-MM-DD")
```

Use calendar events to:
- Cross-reference with Attio deals (meetings with deal contacts = discovery calls)
- Identify unmapped meetings that might be discovery calls not yet in CRM

#### 3c. Filesystem Scans

1. **Content Pieces Published** -- Scan for files created this week:
   - `02_Areas/content-creation/2 published/` -- files with date prefix matching this week
   - Also check `02_Areas/content-creation/1 drafts/` for items with `Status: Published` and dates this week

2. **Dear Ben Episodes** -- Scan for episodes published this week:
   - `/Users/ben/code/dear-ben/content/episodes/` -- files with date prefix matching this week

3. **Warm DMs Sent** -- No auto-pull source. This requires manual entry.

### Step 4: Present Suggestions Interactively

**This is the core of the skill.** Present each metric with its auto-suggested value, the source/evidence, and ask the user to confirm or edit.

Format each metric like this:

```
### 1. Warm DMs Sent (Goal: 100)
   Suggested: 0 (no auto-pull source -- manual entry needed)
   Status: off_track

   What's the actual number? (Enter to accept 0, or type a number)
```

```
### 2. Content Pieces Published (Goal: 5)
   Suggested: 0
   Source: No files found in content-creation/2 published/ for this week
   Status: off_track

   What's the actual number? (Enter to accept 0, or type a number)
```

```
### 3. Discovery Calls Booked (Goal: 2)
   Suggested: 1
   Source: Attio -- Findrow Training Pack moved to Booked ($7,500)
   Calendar: Meeting with [contact] on [date]
   Status: off_track

   What's the actual number? (Enter to accept 1, or type a number)
```

Use `AskUserQuestion` for each metric so the user can confirm or override the suggestion. Group metrics into 2-3 questions max to avoid fatigue (e.g., "auto-pull metrics" vs "manual metrics").

**Grouping strategy:**
- **Group 1 (auto-pulled, high confidence):** Revenue Collected, Proposals Sent, Discovery Calls Booked, Pipeline Value -- these have CRM data backing them. Present all at once for quick confirmation.
- **Group 2 (filesystem-pulled):** Content Pieces Published, Dear Ben Episodes -- present together.
- **Group 3 (manual):** Warm DMs Sent -- ask directly.

For each group, show the evidence and suggested values, then ask: "Confirm these numbers? Edit any that are wrong."

### Step 5: Compile Notes

After all metrics are confirmed, auto-generate the Notes section:

For each metric, create a note line:
- `**[Metric]: [Value] ([status])** -- [source/context]`

Include a "Calendar Context" subsection listing key meetings from Clay, noting which are mapped to deals and which are unmapped.

Include a "Data Sources" line: `*Auto-populated from: Attio CRM (deals/stages), Clay (calendar, email metadata), filesystem (content/episodes). Warm DMs requires manual entry.*`

### Step 6: Show Final Scorecard and Write

Present the complete scorecard table:

```
| Metric | Owner | Goal | Actual | Status |
|--------|-------|------|--------|--------|
| ... | ... | ... | ... | ... |
```

Ask: "Save this week's scorecard?"

On confirmation, write to `02_Areas/eos/data/scorecard/weeks/YYYY-WNN.md` using the standard CEOS template format:

```markdown
---
week: "YYYY-WNN"
date: "YYYY-MM-DD"
---

# Scorecard -- YYYY-WNN

*Logged: YYYY-MM-DD (date range)*

| Metric | Owner | Goal | Actual | Status |
|--------|-------|------|--------|--------|
| ... |

## Notes

- **Metric: Value (status)** -- context
...

## Calendar Context (auto-pulled)

Key meetings this week:
- [contact] ([date]) -- mapped to [deal] / unmapped

## Data Sources

*Auto-populated from: Attio CRM (deals/stages), Clay (calendar, email metadata), filesystem (content/episodes). Warm DMs requires manual entry.*
```

### Step 7: Flag Off-Track Items

For any off_track metric, note: "Off-track items should be discussed during the L10 meeting."

If 3+ metrics are off track, add: "Consider whether this week was an anomaly or a pattern worth investigating."

Offer to commit the scorecard file.

## Guardrails

- **Never write the scorecard without user confirmation.** The whole point is interactive review.
- **Show sources for every suggestion.** Don't just show a number -- show where it came from.
- **Graceful degradation.** If Attio or Clay MCP is unavailable, skip those queries and note which metrics need manual entry. Don't fail the whole flow.
- **Don't modify upstream CEOS files.** Only write to `02_Areas/eos/data/scorecard/weeks/`.
- **Respect metric definitions.** Use thresholds from `metrics.md` for status calculation.
- **Keep it conversational.** This runs in an interactive Claude Code session. Talk to the user, don't just dump data.

## Integration

- Called by `/eos` router when user says "scorecard", "numbers", "metrics", or "log"
- Replaces direct routing to `ceos-scorecard` for the "Log Weekly" mode
- `ceos-scorecard` is still available for "Define Metrics" and "Trend Analysis" modes
- After writing, suggest running `ceos-l10` if it's L10 day (Sunday)
