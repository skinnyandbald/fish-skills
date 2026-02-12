# /process-meeting-notes

Process Fireflies meeting transcripts into GitHub issues and EOS Level 10 Meeting summaries.

## Usage

```
/process-meeting-notes
```

You'll be asked to choose:
1. **Process recent meeting** — Fetch the latest Fireflies meeting
2. **Search specific meeting** — Find by date, keyword, or participant
3. **Create issues from notes** — Convert your own meeting notes to GitHub issues
4. **Generate L10 summary only** — EOS Level 10 summary without issues

## What It Does

1. Fetches meeting transcript and action items from Fireflies
2. Detects your current GitHub repo context (labels, milestones, projects)
3. Compares extracted action items against existing issues to avoid duplicates
4. Creates GitHub issues with your confirmation (never auto-assigns)
5. Generates an EOS L10 summary (WHO, WHAT, WHEN)

## Prerequisites

- **Fireflies MCP server** configured in your Claude Code MCP settings
- **GitHub CLI** (`gh`) installed and authenticated
- Must be run from inside a git repository

## Setup

### Fireflies MCP

Add the Fireflies MCP server to your Claude Code config. The skill uses these tools:
- `mcp__fireflies__fireflies_search`
- `mcp__fireflies__fireflies_get_summary`
- `mcp__fireflies__fireflies_get_transcript`

### Customization

The skill auto-detects your repo's labels, milestones, and projects. No hardcoded values to change.

**Reference files** in the skill directory:
- `references/eos-level-10-format.md` — L10 meeting template
- `references/github-project-config.md` — GitHub integration patterns
- `workflows/` — Individual workflow definitions
- `templates/` — Issue body and L10 summary templates
