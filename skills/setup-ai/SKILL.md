---
name: setup-ai
description: Configure Claude Code for power-user AI development. Sets up notification hooks, CLAUDE.md scaffolding, recommended plugins, and essential settings. Run once on a new machine or project to get the optimal AI-assisted dev setup.
argument-hint: "[--project|--global|--check]"
---

# AI Development Setup

One-command installer for Claude Code power-user configuration. Detects what's already configured and only adds what's missing.

Arguments: $ARGUMENTS

## Modes

- **No arguments / `--project`**: Configure project-level settings — scaffold CLAUDE.md, create directories, configure hooks (default behavior)
- **`--global`**: Configure machine-level settings (`~/.claude/settings.json`)
- **`--analyze`**: Read-only audit — report what's configured and what's missing, touch nothing

If no mode is specified, default to `--project` (setup the current project).

## What Gets Configured

### Global Settings (`--global`)

#### 1. Notification Hook (macOS)

Plays the macOS "Funk" sound when Claude Code needs your attention. Essential when running multiple parallel sessions.

**Check:** Read `~/.claude/settings.json`, inspect `hooks.Notification` array.

**If empty or missing**, add:

```json
{
  "hooks": {
    "Notification": [
      {
        "hooks": [
          {
            "type": "command",
            "command": "afplay \"/System/Library/Sounds/Funk.aiff\""
          }
        ]
      }
    ]
  }
}
```

**Important:** Merge into existing settings — do NOT overwrite other hook categories (SessionStart, Stop, etc.). Use `jq` or read-modify-write to safely merge.

**Platform note:** This uses macOS `afplay`. On Linux, suggest `paplay` or `aplay` as alternatives. On Windows/WSL, suggest `powershell.exe -c "(New-Object Media.SoundPlayer 'C:\Windows\Media\chord.wav').PlaySync()"`.

#### 2. Recommended Plugins Check

Report which recommended plugins are installed vs missing:

| Plugin | Purpose | Install |
|--------|---------|---------|
| `superpowers` | Structured workflows (TDD, debugging, planning) | `claude plugins:add obra/superpowers` |
| `episodic-memory` | Persistent memory across sessions | `claude plugins:add obra/episodic-memory` |
| `code-simplifier` | Code simplification agent | Via plugins marketplace |
| `context7` | Library documentation lookup | Via plugins marketplace |

Don't auto-install plugins — just report what's missing and provide install commands.

### Project Settings (`--project`)

#### 1. CLAUDE.md Scaffold

If no `CLAUDE.md` exists in the project root:

1. Detect the tech stack (check `package.json`, `Cargo.toml`, `pyproject.toml`, `Gemfile`, `go.mod`, etc.)
2. Generate a starter CLAUDE.md following the "document what agents can't discover" principle:

```markdown
<!-- GUIDELINE: Only document what agents CANNOT discover from your codebase. -->
<!-- Agents read package.json, README, tsconfig, etc. automatically. -->
<!-- Focus on: non-standard tools, behavioral constraints, project-specific footguns. -->

# [Project Name]

[1-2 sentence description: what it does, who it's for]

## Stack Deviations
<!-- What's DIFFERENT from framework defaults? Delete lines that match defaults. -->
<!-- Example: "Package manager: bun (not npm)" or "ORM: Drizzle (not Prisma)" -->
<!-- If everything is standard, delete this section entirely. -->

## Commands

[Auto-detected from package.json/Makefile:]

| Command | Use When |
|---------|----------|

<!-- ADD any non-standard tools: custom scripts, repo-specific CLIs, unusual build steps. -->
<!-- Research shows agents adopt documented tools 50x more than undocumented ones. -->

## Behavior Directives
<!-- Rules for HOW the AI should work, not WHAT the project is. -->
<!-- These are the highest-value content in a context file -- agents can't infer them from code. -->

<avoid_over_engineering>
Only make changes that are directly requested or clearly necessary.
</avoid_over_engineering>

<run_tests_in_background>
Run long commands (tests, typechecks, builds) with `run_in_background=true`.
Check results with `TaskOutput` -- don't block on slow operations.
</run_tests_in_background>

<tdd_required>
## Bug Fix Process (CRITICAL — TDD Required)

- Step 1: Write a failing test that reproduces the bug FIRST.
- Step 2: Verify the test fails — this confirms it actually catches the bug.
- Step 3: Fix the implementation with the minimal change needed.
- Step 4: Verify the test passes.
- Do NOT fix first, then write a test. The test must fail before the fix.
</tdd_required>

## Critical Warnings
<!-- Project-specific footguns that agents would NOT discover on their own. -->

## Detailed Guides

See `docs/claude/` for topic-specific deep dives.
```

3. Keep it under 50 lines -- it's a scaffold, not the final product
4. **Do NOT generate tech stack lists or project structure sections** -- agents discover these from source files. Only scaffold sections for undiscoverable content.

If CLAUDE.md already exists, suggest running `/audit-claude-md` instead.

#### 2. Directory Structure

Create if missing:
- `.claude/learnings/` — for `/capture-learning` skill
- `docs/claude/` — for dynamic imports from CLAUDE.md

#### 3. Background Processes Directive

Check if CLAUDE.md mentions `run_in_background`. If not, suggest adding:

```markdown
## Performance
- Run long commands (tests, typechecks, builds) with `run_in_background=true`
- Check results with `TaskOutput` — don't block on slow operations
```

## Execution Flow

### --project (default)

```
1. Check for existing CLAUDE.md
2. If missing: detect stack, scaffold CLAUDE.md (includes TDD directives)
3. Create missing directories (.claude/learnings/, docs/claude/)
4. Check for background processes directive — suggest if missing
5. Report what was created/suggested
```

### --analyze

```
1. Read ~/.claude/settings.json
2. Report:
   ✅ Notification hook: configured (Funk.aiff)
   ❌ Notification hook: not configured
   ✅ Plugin: superpowers (installed)
   ❌ Plugin: episodic-memory (not installed)
   ...
3. If in a project, also check:
   ✅ CLAUDE.md exists (142 lines) — run /audit-claude-md to score it
   ⚠️  CLAUDE.md over 200 lines (287 lines) — may increase inference cost 14-22%
   ❌ CLAUDE.md missing — run /setup-ai to scaffold
   ✅ .claude/learnings/ exists
   ❌ docs/claude/ missing
   ✅ Background processes directive found
   ✅ TDD directive found (tdd_required section detected)
   ❌ TDD directive missing — add <tdd_required> block to ## Behavior Directives
   ✅ Non-standard tools documented (3 found: uv, custom-cli, deploy.sh)
   ⚠️  Tech stack section may duplicate package.json — consider trimming
   ✅ Behavior directives present (XML-style sections detected)
```

### --global

```
1. Read ~/.claude/settings.json
2. For each missing global config:
   a. Show what will be added
   b. Ask for confirmation
   c. Apply the change
3. Report final state
```

## Safety Rules

- **Never overwrite** existing configuration — only add missing pieces
- **Always confirm** before writing to settings.json
- **Read-modify-write** for JSON files — never clobber existing keys
- **Don't auto-install plugins** — report what's missing and provide commands
- **Detect platform** — macOS vs Linux vs WSL for notification hook sound command
