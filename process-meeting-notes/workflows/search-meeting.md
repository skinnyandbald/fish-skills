# Workflow: Search for Specific Meeting

<required_reading>
**Read these reference files if needed:**
1. references/eos-level-10-format.md (if generating summary)
</required_reading>

<process>
## Step 1: Gather Search Criteria

Ask user what they're looking for:

```
How would you like to find the meeting?

1. **By date** - Meetings from a specific date range
2. **By keyword** - Search meeting content for specific topics
3. **By participant** - Meetings with specific people
4. **Show recent** - List last 10 meetings to choose from
```

## Step 2: Execute Search

**By Date:**
```
mcp__fireflies__fireflies_get_transcripts with:
- fromDate: "YYYY-MM-DD"
- toDate: "YYYY-MM-DD" (optional)
- limit: 20
```

**By Keyword:**
```
mcp__fireflies__fireflies_search with:
- query: "keyword:\"search term\" limit:20"
```

**By Participant:**
```
mcp__fireflies__fireflies_get_transcripts with:
- participants: ["email@example.com"]
- limit: 20
```

**Show Recent:**
```
mcp__fireflies__fireflies_get_transcripts with:
- limit: 10
```

## Step 3: Present Results

Display matching meetings:

```
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📅 MEETING SEARCH RESULTS
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

[1] [Meeting Title]
    Date: YYYY-MM-DD HH:MM
    Duration: X minutes
    Participants: [Names]

[2] [Meeting Title]
    Date: YYYY-MM-DD HH:MM
    Duration: X minutes
    Participants: [Names]

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
```

Ask: "Which meeting would you like to process? (Enter number)"

## Step 4: Route to Processing

Once meeting selected, route to `process-recent-meeting.md` workflow starting at Step 2 (with the selected meeting ID).
</process>

<success_criteria>
This workflow is complete when:
- [ ] User's search criteria collected
- [ ] Fireflies queried with appropriate filters
- [ ] Results presented in readable format
- [ ] User selected a meeting to process
- [ ] Handed off to main processing workflow
</success_criteria>
