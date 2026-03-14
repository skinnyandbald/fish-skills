# Workflow: Generate L10 Summary Only

<required_reading>
**Read these reference files NOW:**
1. references/eos-level-10-format.md
2. templates/l10-meeting-summary.md
</required_reading>

<process>
## Step 1: Gather Meeting Data

Ask user for the source:

```
What's the source for this L10 summary?

1. **Fireflies meeting** - I'll fetch from Fireflies
2. **Notes you'll provide** - Paste or share notes
3. **Issues just created** - Summarize from recent GitHub issue creation
```

## Step 2: Collect Information

**If Fireflies:**
- Fetch meeting summary and transcript
- Extract structured data automatically

**If Notes:**
- Receive pasted notes
- Parse for L10 structure elements

**If Issues:**
- Review recently created issues in this session
- Reconstruct meeting context from issue bodies

## Step 3: Map to L10 Structure

Use the L10 template and fill each section:

**Required sections (always include):**
- Meeting metadata (date, participants)
- To-Dos (WHO/WHAT/WHEN)
- Issues discussed

**Optional sections (include if data available):**
- Scorecard (if metrics discussed)
- Rock Review (if quarterly goals mentioned)
- Headlines (if news/announcements shared)

## Step 4: Generate Action Items Checklist

The most critical part - create clear accountability using **checkbox format**:

```markdown
## Action Items

- [ ] Specific action item description -- **Owner Name** (2026-03-15)
- [ ] Another action item -- **Other Person** (before next call)
```

**Rules:**
- **Always use `- [ ]` checkbox format** — never tables or plain bullets
- Every item has ONE owner (not "team"), bolded after `--`
- Dates are specific (not "ASAP" or "soon"), in parentheses
- Link to GitHub issues inline if they exist
- Default deadline: "before next call"

## Step 5: Add Outstanding Questions

Any unresolved items become questions:

```markdown
## Outstanding Questions

| Question | Owner | Context |
|----------|-------|---------|
| [Question] | [Researcher] | [Why it matters] |
```

## Step 6: Save Transcript to Vault (if pasted)

**If the user pasted a transcript directly** (not fetched from Fireflies):

Check for `MEETING_TRANSCRIPTS_DIR` env var or project CLAUDE.md config.

- **If configured:** Save the raw transcript to `$MEETING_TRANSCRIPTS_DIR/YYYY-MM-DD - Pasted - Topic.md` with frontmatter linking to the structured note via `processed_note`
- **If not configured:** Ask: "Want to save the raw transcript? If so, where?"

Pasted transcripts are not recoverable from any external source — saving them is important.

**If fetched from Fireflies:** Optionally save (it's recoverable, but local copy is useful for search).

## Step 7: Present and Offer Save

Display the complete L10 summary and ask:

```
L10 Summary generated! What would you like to do?

1. **Save to vault** - $MEETING_NOTES_DIR/YYYY-MM-DD-Entity-Topic.md (if configured)
2. **Save to repo** - docs/meetings/YYYY-MM-DD-meeting-summary.md
3. **Copy to clipboard** - I'll format for easy pasting
4. **Review and edit** - Make adjustments before saving
5. **Done** - No further action needed
```

If saving to vault (option 1):
- Save structured note to `$MEETING_NOTES_DIR/YYYY-MM-DD - Entity - Topic.md`
- Include full frontmatter (date, type, meeting_type, attendees, status, tags)

If saving to repo (option 2):
```bash
mkdir -p docs/meetings
# Write summary to file
```

**CRITICAL — NO EXTRA BLANK LINES:**
- The file MUST start on line 1 with content (no leading blank line)
- After the closing `---` of YAML frontmatter, the `#` heading MUST follow on the VERY NEXT LINE — no blank line between them
- WRONG: `---\n\n# Title` | RIGHT: `---\n# Title`
</process>

<success_criteria>
This workflow is complete when:
- [ ] Meeting data source identified and collected
- [ ] All available sections mapped to L10 structure
- [ ] Accountability table has WHO/WHAT/WHEN for every to-do
- [ ] Outstanding questions captured separately
- [ ] Summary presented in clean format
- [ ] User chose save/copy/done action
</success_criteria>
