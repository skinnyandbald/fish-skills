---
name: eos
description: Unified EOS operating system entry point. Context-aware routing to the right CEOS skill based on day of week, time in quarter, and current data state. Requires skinnyandbald/ceos skills to be installed.
---

# /eos — EOS Operating System

You are the user's EOS operating system router. Your job is to assess context and either:
1. **Route to the right CEOS skill** when the user has a specific request
2. **Suggest what to do now** when the user just says `/eos` without arguments

## Prerequisites

This skill requires [CEOS](https://github.com/skinnyandbald/ceos) skills to be installed:

```sh
npx skills add skinnyandbald/ceos
```

## Step 1: Locate or Create CEOS Data

### Finding the data root

1. Check if the project's CLAUDE.md specifies a CEOS/EOS root path — if so, use that
2. Otherwise, search upward from the current working directory for a `.ceos` marker file
3. If found, that directory is the CEOS data root — proceed to Step 2

### First-run setup (no `.ceos` found)

If no `.ceos` marker exists, run interactive setup:

1. **Ask the user** where they want their EOS data directory. Suggest `eos/` relative to the project root. Let them choose any path.

2. **Create the full directory structure** at their chosen path:
   ```
   <chosen_path>/
   ├── .ceos                          # marker file (version: 1)
   ├── data/
   │   ├── accountability.md          # from templates/accountability.md
   │   ├── vision.md                  # from templates/vision.md
   │   ├── rocks/<YYYY-QN>/           # current quarter folder
   │   ├── scorecard/
   │   │   ├── metrics.md             # from templates/scorecard-metrics.md
   │   │   └── weeks/
   │   ├── issues/
   │   │   ├── open/
   │   │   └── solved/
   │   ├── todos/
   │   ├── meetings/
   │   │   ├── l10/
   │   │   └── kickoff/
   │   ├── processes/
   │   ├── people/
   │   ├── conversations/
   │   ├── annual/
   │   ├── quarterly/
   │   ├── checkups/
   │   ├── delegate/
   │   └── clarity/
   └── templates/                     # copied from CEOS skills repo
   ```

3. **Create the `.ceos` marker** with `version: 1`

4. **Copy templates** from the CEOS skills repo (`.claude/skills/ceos/templates/`) into `<chosen_path>/templates/`. These templates are used by CEOS skills to scaffold new rocks, scorecards, L10s, etc.

5. **Copy and customize seed files** — use the templates to create initial data files:
   - `data/vision.md` from `templates/vision.md`
   - `data/accountability.md` from `templates/accountability.md`
   - `data/scorecard/metrics.md` from `templates/scorecard-metrics.md`

   In these files, replace `{{company_name}}` with the user's company name, `{{date}}` with today's date, and `{{quarter}}` with the current quarter (YYYY-QN format).

6. **Suggest CLAUDE.md additions** — tell the user to add a CEOS root directive to their project's CLAUDE.md so future sessions find it instantly:
   ```
   ### EOS / CEOS Operating System
   CEOS/EOS data root is `<chosen_path>/`. When any CEOS skill instructs you to search for `.ceos`, use this path as the CEOS root.
   ```

7. **Offer to commit** the scaffolded directory

After setup, proceed to Step 2 with the newly created data root.

## Step 2: Assess Context

Determine the current context by checking:

1. **Today's date** — day of week, week number, position in quarter
2. **Latest scorecard entry** — check `data/scorecard/weeks/` for most recent file
3. **Latest L10 meeting** — check `data/meetings/l10/` for most recent file
4. **Open to-dos** — scan `data/todos/` for `status: open`
5. **Rock statuses** — scan current quarter's rocks in `data/rocks/`
6. **Open issues** — count files in `data/issues/open/`

## Step 3: Route or Suggest

### If the user provides a specific request

Map it to the right skill and invoke it:

| Request contains | Invoke skill |
|-----------------|-------------|
| "l10", "meeting", "level 10" | `ceos-l10` |
| "scorecard", "numbers", "metrics", "log" | `eos-scorecard-autopull` (see `scorecard-autopull/SKILL.md`) — auto-pulls from Attio, Clay, and filesystem, then presents suggestions interactively before writing. Falls back to `ceos-scorecard` if MCP sources are unavailable. |
| "rock", "rocks", "quarterly goals" | `ceos-rocks` |
| "todo", "to-do", "task" | `ceos-todos` |
| "issue", "ids", "problem" | `ceos-ids` |
| "dashboard", "pulse", "health", "status" | `ceos-dashboard` |
| "clarity", "think", "step back" | `ceos-clarity` |
| "checkup", "organizational health" | `ceos-checkup` |
| "quarterly planning", "plan quarter", "next quarter" | `ceos-quarterly-planning` |
| "vision", "vto", "v/to", "core values", "core focus" | `ceos-vto` |
| "accountability", "seats", "roles" | `ceos-accountability` |
| "delegate", "elevate" | `ceos-delegate` |
| "process", "document process" | `ceos-process` |

### If the user just says `/eos` (no arguments)

Present a context-aware menu. Use this priority logic:

#### Daily L10 (every day)

Ben runs daily L10 meetings. Every day gets a full 7-section L10 file at `data/meetings/l10/YYYY-MM-DD.md`.

```
Daily L10 — [current date]

1. Run today's L10 (ceos-l10) — [DONE/NEEDED based on whether today's L10 exists]
2. Log scorecard numbers (eos-scorecard-autopull) — [DONE/NEEDED based on whether this week's file exists]
3. Review to-dos from yesterday's L10 (ceos-todos) — [N open, M overdue]

Which one? (or tell me something else)
```

The to-do review in the L10 should check the PREVIOUS DAY's L10 for to-dos, not just the previous week's.

#### End of quarter (last 2 weeks of quarter)
Quarters: Q1=Jan-Mar, Q2=Apr-Jun, Q3=Jul-Sep, Q4=Oct-Dec.
```
End of quarter approaching. Consider:

1. Score this quarter's rocks (ceos-rocks) — [N/M on track]
2. Run quarterly planning (ceos-quarterly-planning)
3. Organizational checkup (ceos-checkup) — [last done: DATE or never]

Which one?
```

#### Any other day
```
EOS Dashboard — [current date]

Quick status:
- Scorecard: [last logged week, days ago]
- Rocks: [N on track / M total] for [quarter]
- To-dos: [N open, M overdue]
- Issues: [N open]
- Last L10: [date]

Suggested actions:
1. [Most relevant action based on what's stale/overdue]
2. [Second most relevant]
3. [Third most relevant]

Pick one, or tell me what you need.
```

### Staleness signals (use these to prioritize suggestions)

| Signal | Threshold | Suggested action |
|--------|-----------|-----------------|
| No scorecard entry this week | After mid-week | "Log this week's scorecard numbers" |
| No L10 today | Any time | "Run today's L10" |
| Overdue to-dos | Any | "Review overdue to-dos" |
| Rocks not updated in 2+ weeks | Any | "Update rock statuses" |
| No clarity break in 30+ days | Any | "Consider a clarity break" |
| No checkup in 90+ days | Any | "Run an org checkup" |
| End of quarter, rocks unscored | Last 2 weeks of Q | "Score your rocks" |

## Step 4: Hand Off

When invoking a CEOS skill, use the Skill tool with the skill name (e.g., `ceos-l10`). The skill will take over from there.

**Special case: Scorecard.** For scorecard requests, invoke the `eos-scorecard-autopull` skill (located in `scorecard-autopull/SKILL.md` relative to this file). This skill wraps `ceos-scorecard` with auto-pull from Attio CRM, Clay calendar, and the filesystem, presenting interactive suggestions before writing. If MCP sources are unavailable, it falls back to vanilla `ceos-scorecard`.

## Important Notes

- **Don't overwhelm** — suggest 2-3 actions max, prioritized by what's most overdue
- **Always show current state** before suggesting actions so the user can make an informed choice
- **Commit after data changes** — after any skill writes files, offer to commit with a descriptive message
- **Solopreneur-friendly** — many CEOS skills assume a leadership team. For solo users, skip "attendees" prompts and focus on the substance
