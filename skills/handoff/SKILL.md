---
name: handoff
description: "This skill should be used when ending a session, switching contexts, or preparing for another Claude Code instance to continue work. It generates a structured handoff document capturing the current role, work state, git status, next steps, and notes so the next session can resume seamlessly. Also used to resume from a previous handoff document. Trigger words: handoff, hand off, session summary, wrap up session, pass the baton, context transfer, resume, pick up, continue from handoff, load handoff."
---

# Handoff

Generate or resume from a structured handoff document that captures enough context for the next Claude Code session (or a human) to continue exactly where the previous session left off.

The handoff file is always: **`docs/HANDOFF.md`** in the repo root.

## When to Use

- End of a work session
- Switching between roles or contexts mid-conversation
- Before closing a long-running session with unfinished work
- When the user says "handoff", "wrap up", "pass the baton", or similar
- Starting a new session from a previous handoff document
- When the user says "resume", "pick up where we left off", "continue from handoff", or similar

## Mode Detection

| Invocation | Mode |
|---|---|
| `/handoff` mid-session | **Generate** |
| `/handoff resume` | **Resume** |
| Fresh session (no args) | **Resume** if `docs/HANDOFF.md` exists, else **Generate** |
| Natural language: "resume", "pick up where we left off" | **Resume** |
| Natural language: "handoff", "wrap up", "pass the baton" | **Generate** |

There are no path arguments. The file is always `docs/HANDOFF.md`.

---

## Generate Mode

### Gathering Context

Collect the following information before generating the handoff. Use tools to gather what can be detected automatically; ask the user only for what cannot be inferred.

#### Auto-detect (do not ask the user)

1. **Git branch** -- run `git branch --show-current`
2. **Working tree dirty?** -- run `git status --porcelain` (any output = dirty)
3. **Recent commits** -- run `git log --oneline -5` for recent context

#### Infer from conversation

4. **Role** -- what role has this session been operating in? (e.g., "developer", "content writer", "EOS facilitator", "researcher"). Default to "developer" if unclear.
5. **Current work** -- summarize what the session has been working on, in one or two sentences.
6. **Status** -- one of: `in_progress | blocked | paused | ready_for_review | complete`
7. **Critical References** -- 2-3 most important spec/design/plan docs referenced this session (omit section if none)
8. **Recent Changes** -- files modified this session with `file:line` references to key changes
9. **Learnings** -- patterns discovered, gotchas, root causes; prefer `file:line` references over inline code blocks
10. **Artifacts** -- exhaustive list of files/docs the next session should read to get up to speed
11. **Next steps** -- concrete, actionable items for the next session
12. **Notes** -- decisions made, trade-offs, links, anything else worth preserving

#### Ask the user (only if not inferrable)

If the role, current work, or next steps are ambiguous, ask a single clarifying question rather than guessing wrong.

### Output Format

Generate the handoff as a fenced markdown block. **Print it directly to the conversation first** (do not write to file yet). After printing, ask the user to approve or amend it. Only write to `docs/HANDOFF.md` after user approval.

Prefer `path/to/file.ext:line-range` references over inline code blocks throughout.

```
---
handoff_date: YYYY-MM-DD
git_branch: {branch}
git_dirty: true|false
status: {status}
role: {role}
---
# HANDOFF: {Role} Session

## Current State

**Role**: {Role}
**Working on**: {CurrentWork}
**Status**: {Status}

**Git branch**: {branch}
{if dirty: "Working tree has uncommitted changes"}

## Critical References

- {path/to/spec.md} -- {one-line description}
- {URL or file} -- {one-line description}

(Omit this section if no critical references exist)

## Recent Changes

- `{file:line-range}` -- {what changed and why}
- `{file:line-range}` -- {what changed and why}

## Learnings

- {Pattern or gotcha discovered} -- see `{file:line}` for context
- {Root cause of a bug or decision} -- rationale: {brief explanation}

## Artifacts

Files and documents the next session should read to get up to speed:

- `{file path}` -- {why it matters}
- `{file path}` -- {why it matters}

## Next Steps

1. {step 1 -- specific and actionable}
2. {step 2}
3. ...

## Notes

{Decisions, trade-offs, gotchas, links -- anything that doesn't fit above}

---

*This handoff was generated automatically. Read the above carefully and continue where the previous session left off.*
```

---

## Resume Mode

Three phases: Find & Read, Validate Environment, Orient & Ask.

### Phase 1 — Find & Read

1. Read `docs/HANDOFF.md` -- this is always the file, no path scanning or arguments
2. If file not found, inform the user and switch to Generate mode
3. Parse YAML frontmatter: `handoff_date`, `git_branch`, `git_dirty`, `status`, `role`
4. Parse all markdown sections: Current State, Critical References, Recent Changes, Learnings, Artifacts, Next Steps, Notes
5. **Read every file listed in `## Artifacts`** before proceeding to Phase 3

### Phase 2 — Validate Environment

Run these checks in parallel:

- `git branch --show-current` -- compare to `git_branch` from frontmatter
- `git status --porcelain` -- compare dirty state to `git_dirty` from frontmatter
- `git log --oneline -5` -- check for new commits since handoff date
- Check if `CLAUDE.md` exists and read it (conventions may have changed)

Build a mismatch list from the results.

### Phase 3 — Orient & Ask

Classify the situation into one of these scenarios and respond accordingly:

**Clean** -- no mismatches, status is not `complete` and not stale:
> Present a brief summary ("Resuming as {Role} on branch `{branch}`"), list next steps from the handoff, and ask "Ready to start on step 1?" via `AskUserQuestion`.

**Diverged** -- branch or dirty state doesn't match the handoff:
> Surface each mismatch clearly, then use `AskUserQuestion` to ask how to proceed. Example: "Branch changed from `feat/x` to `main`. Should I switch back, or continue on `main`?"

**Incomplete** -- status is `in_progress` or `blocked`:
> Acknowledge the in-flight status, surface any blockers noted, focus on completing the first unfinished step. Ask user to confirm before starting.

**Stale** -- `handoff_date` is more than 7 days ago:
> Flag it: "This handoff is from {date} ({N} days ago) -- it may be out of date." Then ask via `AskUserQuestion`: "Should I trust this handoff and proceed, or re-explore the codebase first?"

**Complete** -- status is `complete`:
> Inform the user: "The previous session marked this work as complete." Then ask via `AskUserQuestion` what they'd like to work on next.

---

## Rules

### Both modes

- Keep the handoff concise. The goal is fast onboarding, not a full session transcript.
- Omit sections with no content (e.g., skip Critical References if there are none).
- Next steps must be specific and actionable -- "continue implementing X" not "keep going".
- Do not include sensitive information (API keys, tokens, passwords).
- Prefer `path/to/file:line-range` references over inline code blocks.

### Generate-specific

- Always print the draft to the conversation first and get user approval before writing to `docs/HANDOFF.md`.
- Create `docs/` directory if it doesn't exist.

### Resume-specific

- Never auto-execute next steps -- always confirm with the user first via `AskUserQuestion`.
- Read all Artifacts files before presenting the analysis.
- Treat next steps as suggestions, not commands -- the user may want to reprioritize.
- If `docs/HANDOFF.md` is not found, do not guess -- inform the user and offer to generate one.
