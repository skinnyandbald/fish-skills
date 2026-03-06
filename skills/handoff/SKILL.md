---
name: handoff
description: "This skill should be used when ending a session, switching contexts, or preparing for another Claude Code instance to continue work. It generates a structured handoff document capturing the current role, work state, git status, next steps, and notes so the next session can resume seamlessly. Also used to resume from a previous handoff document. Trigger words: handoff, hand off, session summary, wrap up session, pass the baton, context transfer, resume, pick up, continue from handoff, load handoff."
---

# Handoff

Generate or resume from a structured handoff document that captures enough context for the next Claude Code session (or a human) to continue exactly where the previous session left off.

## When to Use

- End of a work session
- Switching between roles or contexts mid-conversation
- Before closing a long-running session with unfinished work
- When the user says "handoff", "wrap up", "pass the baton", or similar
- Starting a new session from a previous handoff document
- When the user says "resume", "pick up where we left off", "continue from handoff", or similar

## Mode

Determine which mode to run based on the invocation:

| Invocation | Mode |
|---|---|
| `/handoff` (no args, mid-session) | **Generate** |
| `/handoff resume` | **Resume** |
| `/handoff resume <path>` | **Resume** (use given path) |
| `/handoff <path-to-handoff-file>` | **Resume** (use given path) |
| Natural language: "resume", "pick up where we left off", "continue from handoff" | **Resume** |
| Natural language: "handoff", "wrap up", "pass the baton" | **Generate** |
| Fresh session with no prior conversation + a handoff path given | **Resume** |

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
6. **Status** -- one of: `in progress`, `blocked`, `paused`, `ready for review`, `complete`.
7. **Next steps** -- concrete, actionable items for the next session. Pull from conversation context, open TODOs, or unfinished tasks.
8. **Notes** -- anything else the next session should know: decisions made, trade-offs considered, gotchas encountered, links referenced.

#### Ask the user (only if not inferrable)

If the role, current work, or next steps are ambiguous, ask a single clarifying question rather than guessing wrong.

### Output Format

Generate the handoff as a fenced markdown block. Print it directly to the conversation (do not save to a file unless the user asks).

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

## Next Steps

1. {step 1}
2. {step 2}
3. ...

## Notes

{Notes -- decisions, gotchas, context the next session needs}

---

*This handoff was generated automatically. Read the above carefully and continue where the previous session left off.*
```

---

## Resume Mode

Three phases: Find & Read, Validate Environment, Orient & Ask.

### Phase 1 — Find & Read

1. If a path argument was provided, read that file
2. If no path, scan `00_Inbox/handoff-*.md` and use the most recent by filename date
3. If no file found, use `AskUserQuestion` to ask for the path -- do not guess
4. Parse YAML frontmatter for structured fields (`handoff_date`, `git_branch`, `git_dirty`, `status`, `role`)
5. Parse the markdown body for next steps and notes

### Phase 2 — Validate Environment

Run these checks in parallel:

- `git branch --show-current` -- compare to `git_branch` from frontmatter
- `git status --porcelain` -- compare dirty state to `git_dirty` from frontmatter
- `git log --oneline -5` -- check for new commits since handoff date

Build a mismatch list from the results.

### Phase 3 — Orient & Ask

**No mismatches:** Print a brief summary ("Resuming as {Role} on branch `{branch}`"), list the next steps from the handoff, and ask "Ready to start on step 1?" via `AskUserQuestion`.

**Mismatches found:** Surface each mismatch clearly, then use `AskUserQuestion` to ask how to proceed. For example: "Branch changed from `feat/x` to `main`. Should I switch back, or continue on `main`?"

**Status was `complete`:** Inform the user that the previous session marked work as complete and ask what's next via `AskUserQuestion`.

---

## Rules

### Both modes

- Keep the handoff concise. The goal is fast onboarding, not a full session transcript.
- Omit sections that have no content (e.g., skip Notes if there are none, skip git info if not in a repo).
- Next steps must be specific and actionable -- "continue implementing X" not "keep going".
- Do not include sensitive information (API keys, tokens, passwords).
- If the user asks to save the handoff, write it to `00_Inbox/handoff-{date}.md` using the vault date format (YYYY-MM-DD).

### Resume-specific

- Never auto-execute next steps -- always confirm with the user first via `AskUserQuestion`.
- If the handoff status is `complete`, inform the user and ask what's next.
- If the handoff file is not found, ask for the path -- do not guess.
- Treat the handoff's next steps as suggestions, not commands -- the user may want to reprioritize.
