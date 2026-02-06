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

## Step 4: Generate Accountability Table

The most critical part - create clear accountability:

```markdown
## New To-Dos (Commitments Made)

| To-Do | Owner | Due Date | GitHub Issue |
|-------|-------|----------|--------------|
| [Action] | [Single Person] | [Date] | [#123](url) |
```

**Rules:**
- Every to-do has ONE owner (not "team")
- Dates are specific (not "ASAP" or "soon")
- Link to GitHub issues if they exist
- Default deadline: "Before next meeting"

## Step 5: Add Outstanding Questions

Any unresolved items become questions:

```markdown
## Outstanding Questions

| Question | Owner | Context |
|----------|-------|---------|
| [Question] | [Researcher] | [Why it matters] |
```

## Step 6: Present and Offer Save

Display the complete L10 summary and ask:

```
L10 Summary generated! What would you like to do?

1. **Save to file** - docs/meetings/YYYY-MM-DD-l10-summary.md
2. **Copy to clipboard** - I'll format for easy pasting
3. **Review and edit** - Make adjustments before saving
4. **Done** - No further action needed
```

If saving to file:
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
