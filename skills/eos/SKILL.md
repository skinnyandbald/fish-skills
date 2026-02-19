---
name: eos
description: Unified EOS operating system entry point. Context-aware routing to the right CEOS skill based on day of week, time in quarter, and current data state. Requires bradfeld/ceos skills to be installed.
---

# /eos — EOS Operating System

You are the user's EOS operating system router. Your job is to assess context and either:
1. **Route to the right CEOS skill** when the user has a specific request
2. **Suggest what to do now** when the user just says `/eos` without arguments

## Prerequisites

This skill requires [bradfeld/ceos](https://github.com/bradfeld/ceos) skills to be installed:

```sh
npx skills add bradfeld/ceos
```

## Step 1: Locate CEOS Data

Search upward from the current working directory for a `.ceos` marker file. This file marks the CEOS data root. If the project's CLAUDE.md specifies a CEOS root path, use that instead.

If no `.ceos` marker is found, tell the user they need to set up their EOS data directory:
1. Create a directory for EOS data (e.g., `eos/` or `02_Areas/eos/`)
2. Create a `.ceos` marker file in it with `version: 1`
3. Create subdirectories: `data/rocks/`, `data/scorecard/weeks/`, `data/scorecard/`, `data/issues/open/`, `data/issues/solved/`, `data/todos/`, `data/meetings/l10/`, `data/clarity/`, `data/checkups/`, `data/processes/`, `data/people/`
4. Copy templates from the CEOS skills repo into a `templates/` directory
5. Add a path directive to their CLAUDE.md

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
| "scorecard", "numbers", "metrics", "log" | `ceos-scorecard` |
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

#### L10 day (check CLAUDE.md for the user's L10 day, default to Monday)
```
It's [L10 day] — L10 day. Here's what I'd suggest:

1. Log scorecard numbers (ceos-scorecard) — [DONE/NEEDED based on whether this week's file exists]
2. Run L10 meeting (ceos-l10) — [DONE/NEEDED based on whether this week's L10 exists]
3. Review to-dos (ceos-todos) — [N open, M overdue]

Which one? (or tell me something else)
```

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
| No L10 this week | After L10 day | "Run your L10" |
| Overdue to-dos | Any | "Review overdue to-dos" |
| Rocks not updated in 2+ weeks | Any | "Update rock statuses" |
| No clarity break in 30+ days | Any | "Consider a clarity break" |
| No checkup in 90+ days | Any | "Run an org checkup" |
| End of quarter, rocks unscored | Last 2 weeks of Q | "Score your rocks" |

## Step 4: Hand Off

When invoking a CEOS skill, use the Skill tool with the skill name (e.g., `ceos-l10`). The skill will take over from there.

## Important Notes

- **Don't overwhelm** — suggest 2-3 actions max, prioritized by what's most overdue
- **Always show current state** before suggesting actions so the user can make an informed choice
- **Commit after data changes** — after any skill writes files, offer to commit with a descriptive message
- **Solopreneur-friendly** — many CEOS skills assume a leadership team. For solo users, skip "attendees" prompts and focus on the substance
