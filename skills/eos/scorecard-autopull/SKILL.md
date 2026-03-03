---
name: eos-scorecard-autopull
description: Enhanced scorecard entry with auto-pull from daily L10 meetings, Attio CRM, Google Calendar, Gmail, and filesystem. Walks through each metric one at a time with pre-populated suggestions for interactive confirmation.
file-access: [02_Areas/eos/data/scorecard/, 02_Areas/eos/data/meetings/l10/, 02_Areas/content-creation/2 published/]
tools-used: [Read, Write, Glob, Grep, Bash, AskUserQuestion, mcp__attio-mcp__search_records, mcp__attio-mcp__search_records_advanced, mcp__attio-mcp__get_record_details, mcp__claude_ai_Google_Calendar__gcal_list_events, mcp__claude_ai_Gmail__gmail_search_messages, mcp__claude_ai_Gmail__gmail_read_message]
---

# eos-scorecard-autopull

Enhanced weekly scorecard entry that synthesizes data from **daily L10 meetings**, Attio CRM, Google Calendar, Gmail, and the filesystem. Walks through each metric **one at a time** with a pre-populated suggestion, letting the user confirm or tweak before proceeding to the next metric.

**This skill wraps `ceos-scorecard` -- it does NOT replace it.** After interactive confirmation, it writes the file using the same format as `ceos-scorecard` Mode: Log Weekly.

## When to Use

This skill is invoked by the `/eos` router when the user says "scorecard" and the session was triggered by `eos-ritual.sh` (cron) OR anytime the user wants to log scorecard numbers.

## Prerequisites

- CEOS data root at `02_Areas/eos/` (per CLAUDE.md)
- Daily L10 meetings in `02_Areas/eos/data/meetings/l10/` (primary data source)
- Attio MCP server connected (for CRM deal data)
- Google Calendar MCP connected (for calendar events and attendee data)
- Gmail MCP connected (for email context on deals)

## Process

### Step 1: Determine the Week

Calculate the current ISO week (`YYYY-WNN`). Check if `02_Areas/eos/data/scorecard/weeks/YYYY-WNN.md` already exists. If so, tell the user and ask if they want to update it.

Determine the week's date range (Monday through Sunday) for filtering queries.

### Step 2: Read Metric Definitions

Read `02_Areas/eos/data/scorecard/metrics.md` to get the 7 metrics, their goals, and green/red thresholds.

### Step 3: Synthesize from Daily L10s (PRIMARY SOURCE)

**This is the most important data source.** Read all L10 meeting files from `02_Areas/eos/data/meetings/l10/` that fall within the scorecard week's date range.

For each L10 file in the week:
1. Read the full file
2. Extract from **Headlines** section: deal closings, revenue mentions, pipeline movement, content published, episodes shipped
3. Extract from **Scorecard Review** section: any metric values already discussed
4. Extract from **IDS** section: context about what's working/not working
5. Extract from **To-Do Review** section: completed actions that map to metrics (e.g., "sent 15 DMs" = Warm DMs data)
6. Extract from **Conclude / New To-Dos** section: commitments that indicate activity

**Build a synthesis per metric** by scanning all L10s for the week:

| Metric | What to look for in L10s |
|--------|--------------------------|
| Warm DMs Sent | To-do completions mentioning DMs, pipeline block activity, specific counts |
| Content Pieces Published | Headlines about published content, to-dos about posting |
| Dear Ben Episodes | Headlines about episodes, to-dos about recording/publishing |
| Discovery Calls Booked | Headlines about new calls, meeting mentions with prospects |
| Proposals Sent | Headlines about proposals, deals moving to "In Progress" |
| Pipeline Value (New) | Headlines about new deals, deal values mentioned |
| Revenue Collected | Headlines about payments received, deals closed/won |

### Step 4: Auto-Pull from External Sources (run in parallel)

Run these queries to supplement/validate the L10 synthesis. **Run independent queries in parallel.**

#### 4a. Attio CRM Queries

Query Attio for deal activity during the scorecard week:

1. **Discovery Calls Booked** -- Search deals at stage "Booked" with activity this week.
2. **Proposals Sent** -- Search deals at stage "In Progress" with activity this week.
3. **Pipeline Value (New)** -- Sum values of deals that changed stage this week.
4. **Revenue Collected** -- Search deals at stage "Won" with activity this week, sum values.

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

#### 4b. Google Calendar Query

```
gcal_list_events(
  calendarId: "primary",
  timeMin: "YYYY-MM-DDT00:00:00",
  timeMax: "YYYY-MM-DDT23:59:59",
  timeZone: "America/Los_Angeles",
  condenseEventDetails: false
)
```

Use calendar events to cross-reference with Attio deals and identify unmapped meetings.

#### 4c. Gmail Context (optional enrichment)

For deals found in Attio, optionally search Gmail for related correspondence. Keep lightweight -- only query for contacts associated with active deals.

#### 4d. Filesystem Scans

1. **Content Pieces Published** -- `02_Areas/content-creation/2 published/` files with date prefix matching this week. Also check `1 drafts/` for `Status: Published`.
2. **Dear Ben Episodes** -- `/Users/ben/code/dear-ben/content/episodes/` files with date prefix matching this week.

### Step 5: Merge Sources and Resolve Conflicts

For each metric, merge the L10 synthesis with external source data:

- **L10 says X, external source says Y** -- Present both, flag the discrepancy, let the user decide.
- **L10 says X, no external data** -- Use L10 value as the suggestion.
- **No L10 data, external source says Y** -- Use external value as the suggestion.
- **Neither source has data** -- Suggest 0, note "no data found -- manual entry needed."

**Priority order:** User's words in L10s > CRM data > Calendar data > Filesystem > Default to 0.

### Step 6: Walk Through Each Metric (Sequential Questions)

**This is the core interaction.** Present ONE metric at a time using `AskUserQuestion`. Each question shows:
- The metric name and goal
- The synthesized suggestion with evidence
- The source(s) it came from
- Status based on the suggested value

Walk through all 7 metrics in order. For each metric:

1. Show a brief summary of what was found:
   ```
   ### Warm DMs Sent (Goal: 50/week)

   Suggested: 23
   Sources:
   - Mon L10: "sent 8 DMs during pipeline block"
   - Wed L10: "15 DMs sent, mostly Hampton connections"
   - No data for Tue/Thu/Fri

   Status: off_track (goal: 50, red threshold: < 30)
   ```

2. Ask using `AskUserQuestion` with the suggested value as the default option:
   - Option 1: "23 (suggested)" -- accept the synthesized number
   - Option 2: "Different number" -- user provides the correct number in notes
   - Option 3 (if applicable): "0 -- didn't track" -- explicit zero

3. Record the confirmed value before moving to the next metric.

**Key principle:** The pre-populated suggestion should save the user time. If the L10s captured good data, the user just confirms. If not, they override. Either way, they only deal with one metric at a time.

#### Metric walk-through order:

1. **Warm DMs Sent** (manual-heavy, ask first to get it out of the way)
2. **Content Pieces Published** (filesystem + L10 data)
3. **Dear Ben Episodes** (filesystem + L10 data)
4. **Discovery Calls Booked** (Attio + Calendar + L10 data)
5. **Proposals Sent** (Attio + L10 data)
6. **Pipeline Value (New)** (Attio + L10 data)
7. **Revenue Collected** (Attio + L10 data)

### Step 7: Compile Notes

After all 7 metrics are confirmed, auto-generate the Notes section:

For each metric, create a note line:
- `**[Metric]: [Value] ([status])** -- [source/context from L10s and external data]`

Include a "L10 Context" subsection summarizing key themes from the week's daily L10s (IDS issues tackled, major headlines, patterns).

Include a "Calendar Context" subsection listing key meetings from Google Calendar.

Include a "Data Sources" line: `*Synthesized from: daily L10 meetings ([N] this week), Attio CRM (deals/stages), Google Calendar (meetings/attendees), Gmail (deal correspondence), filesystem (content/episodes).*`

### Step 8: Show Final Scorecard and Write

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

## L10 Context (synthesized from daily meetings)

Key themes this week:
- [theme from IDS discussions]
- [pattern across multiple L10s]

## Calendar Context (auto-pulled)

Key meetings this week:
- [contact] ([date]) -- mapped to [deal] / unmapped

## Data Sources

*Synthesized from: daily L10 meetings ([N] this week), Attio CRM (deals/stages), Google Calendar (meetings/attendees), Gmail (deal correspondence), filesystem (content/episodes).*
```

### Step 9: Flag Off-Track Items

For any off_track metric, note: "Off-track items should be discussed during today's L10."

If 3+ metrics are off track, add: "Consider whether this week was an anomaly or a pattern worth investigating."

Offer to commit the scorecard file.

## Guardrails

- **Never write the scorecard without user confirmation.** The whole point is interactive review.
- **One metric at a time.** Don't dump all 7 metrics in one question. Walk through them sequentially so the user can focus.
- **Show sources for every suggestion.** Don't just show a number -- show where it came from (which L10, which Attio deal, which file).
- **L10s are the primary source.** They capture what the user actually said happened. CRM and calendar are validation/supplementation.
- **Graceful degradation.** If no L10s exist for the week, fall back to external sources only. If Attio/Calendar/Gmail MCP is unavailable, skip those queries. Don't fail the whole flow.
- **Don't modify upstream CEOS files.** Only write to `02_Areas/eos/data/scorecard/weeks/`.
- **Respect metric definitions.** Use thresholds from `metrics.md` for status calculation.
- **Keep it conversational.** This runs in an interactive Claude Code session. Talk to the user, don't just dump data.

## Integration

- Called by `/eos` router when user says "scorecard", "numbers", "metrics", or "log"
- Replaces direct routing to `ceos-scorecard` for the "Log Weekly" mode
- `ceos-scorecard` is still available for "Define Metrics" and "Trend Analysis" modes
- After writing, suggest running today's L10 if one hasn't been done yet
