---
name: setup-ai
description: "One-command AI onboarding for any codebase. Generates AGENTS.md (project context) with CLAUDE.md symlink, STYLE_GUIDE.md (coding conventions), and Beads task tracking. Also configures machine-level settings (hooks, plugins). Skips files that already exist."
argument-hint: "[--project|--global|--check]"
allowed-tools: Bash, Read, Grep, Glob, Write, Edit, LS
---

# Codebase AI Setup

One-command setup for AI-assisted development. Generates the context files AI tools need, configures your environment, and detects what's already configured — only adds what's missing.

Arguments: $ARGUMENTS

## Modes

- **No arguments / `--project`**: Set up the current codebase — generate AGENTS.md, CLAUDE.md symlink, STYLE_GUIDE.md, initialize Beads, create directories (default behavior)
- **`--global`**: Configure machine-level settings (`~/.claude/settings.json`) — notification hooks, plugin checklist
- **`--check`**: Read-only — verify your environment is fully configured. Reports what's present, what's missing, what needs attention. Does not write anything.

If no mode is specified, default to `--project` (setup the current project).

---

## `--project` Mode (default)

### Step 0: Install Dependencies

Check and install required tooling:

```bash
# Beads -- AI-native task/issue tracker
# Check if bd is installed (cross-platform)
npx --yes @beads/bd --version || npm install -g @beads/bd
```

If `bd` is already installed, skip. If not, install it globally. This gives the project `bd` for issue tracking, dependency-aware task management, and git-synced work coordination between human and AI agents.

> **Note:** `npx` works on both macOS and Windows. Do NOT use `which` (Unix-only) or `where` (Windows-only) to check for binaries.

### Step 1: File Protection Protocol (MANDATORY)

**Before ANY write to CLAUDE.md, AGENTS.md, or STYLE_GUIDE.md, you MUST run this check. This is not optional.**

```bash
# Deterministic pre-flight check — run BEFORE any file generation
CLAUDE_EXISTS=false; AGENTS_EXISTS=false; STYLE_EXISTS=false
CLAUDE_IS_SYMLINK=false
[ -f "CLAUDE.md" ] && CLAUDE_EXISTS=true
[ -L "CLAUDE.md" ] && CLAUDE_IS_SYMLINK=true
[ -f "AGENTS.md" ] && AGENTS_EXISTS=true
[ -f "STYLE_GUIDE.md" ] && STYLE_EXISTS=true
[ -f ".cursorrules" ] && echo ".cursorrules found"
[ -d ".beads" ] && echo ".beads/ found"
[ -d ".claude/learnings" ] && echo ".claude/learnings/ found"
[ -d "docs/claude" ] && echo "docs/claude/ found"
echo "CLAUDE.md exists: $CLAUDE_EXISTS (symlink: $CLAUDE_IS_SYMLINK)"
echo "AGENTS.md exists: $AGENTS_EXISTS"
echo "STYLE_GUIDE.md exists: $STYLE_EXISTS"
```

**If AGENTS.md exists (`$AGENTS_EXISTS = true`):**
1. Report: "Found existing AGENTS.md (N lines). This file will NOT be overwritten."
2. Offer ONLY these options — ask the user which they want:
   - **(a) Skip** — leave it untouched, continue with other setup steps.
   - **(b) Show what would be generated** — display the scaffold so the user can manually merge.
   - **(c) Regenerate** — only if user explicitly confirms. Back up existing file first: `cp AGENTS.md AGENTS.md.bak`
3. **NEVER choose on behalf of the user.** Wait for their response.
4. **NEVER use the Write tool on AGENTS.md when it already exists** without explicit user approval AND creating a .bak first.

**If CLAUDE.md exists and is NOT a symlink (`$CLAUDE_EXISTS = true`, `$CLAUDE_IS_SYMLINK = false`):**
1. Report: "Found existing CLAUDE.md (N lines, standalone file). This file will NOT be overwritten."
2. Offer ONLY these options — ask the user which they want:
   - **(a) Append Quality Gates section** — add the Quality Gates block to the end if not already present. Does not modify existing content. Uses Edit (append), not Write.
   - **(b) Skip CLAUDE.md entirely** — leave it untouched, continue with other steps.
   - **(c) Migrate to AGENTS.md** — incorporate content into AGENTS.md and replace CLAUDE.md with a symlink. Only with explicit user confirmation and .bak backup.
   - **(d) Show scaffold diff** — display what the scaffold WOULD contain, so the user can manually merge what they want.
3. **NEVER choose on behalf of the user.** Wait for their response.
4. **NEVER use the Write tool on CLAUDE.md when it already exists** — only Edit (append) for option (a), or skip.

**If STYLE_GUIDE.md exists (`$STYLE_EXISTS = true`):**
1. Report: "Found existing STYLE_GUIDE.md (N lines). Skipping."
2. If user wants to regenerate, back up first: `cp STYLE_GUIDE.md STYLE_GUIDE.md.bak`

### Step 2: Generate AGENTS.md (if needed)

If no AGENTS.md exists (or user approved regeneration):

Analyze the codebase and generate AGENTS.md. This is the primary context file — tool-agnostic, works with Claude Code, Copilot, Cursor, Codex, etc.

<!-- GUIDELINE: Only document what agents CANNOT discover from your codebase. -->
<!-- Agents read package.json, README, tsconfig, etc. automatically. -->
<!-- Focus on: non-standard tools, behavioral constraints, project-specific footguns. -->

**AGENTS.md should contain:**

- **Project overview** — 1-2 sentence description (what it does, who it's for)
- **Stack deviations** — only what DIFFERS from framework defaults. "React 19" = discoverable, skip it. "We use Bun not npm" = valuable, include it.
- **Commands** — dev server, test, build, lint commands in a table. Auto-detect from package.json/Makefile. Include ALL non-standard scripts and custom CLIs.
- **Conventions summary** — reference STYLE_GUIDE.md for details
- **Critical warnings** — project-specific footguns agents can't discover on their own
- **Behavior Directives** (always include — these CANNOT be inferred from code):

```
<avoid_over_engineering>
Only make changes that are directly requested or clearly necessary.
</avoid_over_engineering>

<run_tests_in_background>
Run long commands (tests, typechecks, builds) with `run_in_background=true`.
Check results with `TaskOutput` -- don't block on slow operations.
</run_tests_in_background>

<tdd_required>
TDD is mandatory for ALL code changes -- features and bug fixes alike.

**Bug Fix Process:**
1. **Write a failing test FIRST** -- reproduce the bug
2. **Verify test fails** -- confirm it catches the bug
3. **Fix the implementation** -- minimal change
4. **Verify test passes** -- confirm the fix works

**Feature Process:**
1. **Write a failing test** -- define expected behavior
2. **Implement minimal code** to make it pass
3. **Refactor** if needed, keeping tests green

**DO NOT fix first then write a test.** The test must fail before the fix. This is non-negotiable -- subagents must follow TDD too.
</tdd_required>

<use_beads_for_task_management>
ALWAYS use `bd` (beads) for task management -- never use TodoWrite or internal task tools. Break work into beads issues, update status as you go, and close when done.

Key commands: `bd create`, `bd list`, `bd show <id>`, `bd update <id> --status <status>`, `bd close <id>`.

**Sync protocol:** Beads data lives in `.beads/issues.jsonl` (git-tracked). The Dolt DB is local-only.
- **Session start:** Run `bd list` -- this auto-imports from JSONL if it's newer than local Dolt DB.
- **Before committing:** Run `bd backup` to flush Dolt -> JSONL, then include the `.beads/` changes in your commit.
- **After pulling:** Any `bd` command auto-detects stale DB and re-imports.
</use_beads_for_task_management>
```

- **Quality Gates** (always include):

```
## Quality Gates

### Canonical Workflow (Do NOT skip or reorder)
1. Draft plan (if non-trivial) → `/critic-review` → address feedback → finalize
2. Implement → run tests
3. `superpowers:code-reviewer` — review against plan and standards
4. `/simplify` — review for reuse/quality/efficiency. Re-run until clean
5. Commit → create PR → push

**Pre-PR:** `/simplify` is mandatory before every PR. No exceptions. If suggestions conflict with `<avoid_over_engineering>`, the directive wins.
```

- **Detailed Guides** — link to `docs/claude/` for topic-specific deep dives
- **Style Guide** — link to STYLE_GUIDE.md for coding conventions

**Do NOT generate:**
- Tech stack lists or project structure sections — agents discover these from source files
- Content that duplicates README, package.json, or tsconfig — redundant context increases inference cost 14-22% per ETH Zurich research

Keep it under 200 lines total. If .cursorrules exists, incorporate its content.

### Step 3: Create CLAUDE.md Link

After AGENTS.md is written, detect the platform and create the appropriate link:

**macOS/Linux:**
```bash
ln -sf AGENTS.md CLAUDE.md
```

**Windows (PowerShell or cmd):**
```powershell
# Copy instead of symlink -- Windows symlinks require Developer Mode or admin
copy AGENTS.md CLAUDE.md
```

> **Platform detection:** Check `os.platform()` or `uname` to determine which approach to use. On Windows, prefer copying AGENTS.md to CLAUDE.md since symlinks require Developer Mode enabled or admin privileges. The tradeoff: Windows users must re-copy after editing AGENTS.md (or just edit CLAUDE.md directly). On macOS/Linux, always use a symlink.

This ensures Claude Code reads the project context natively while AGENTS.md remains the primary, tool-agnostic file.

**If AGENTS.md was skipped but CLAUDE.md doesn't exist either**, generate a standalone CLAUDE.md scaffold with just the behavior directives and quality gates sections (no project context — that's AGENTS.md's job).

**If both AGENTS.md and CLAUDE.md already exist:**
When scaffolding is not needed, add this awareness comment if creating any new file alongside them:

```markdown
<!-- This project has both AGENTS.md and CLAUDE.md.
     AGENTS.md is for project context; CLAUDE.md is for behavioral directives.
     Keep them separate — don't duplicate content between files. -->
```

### Step 4: Generate STYLE_GUIDE.md (if needed)

If no STYLE_GUIDE.md exists (or user approved regeneration):

Follow the full style guide generation process:
1. Detect tech stack from dependency/config files
2. Read existing linter/formatter configs (.eslintrc, .prettierrc, .rubocop.yml, biome.json, etc.)
3. Sample 10-15 representative files for patterns
4. Identify testing patterns from test files
5. Check git history for commit/branch conventions

Generate STYLE_GUIDE.md with evidence-backed conventions for:
- Language & formatting
- Naming conventions (files, variables, functions, classes, database)
- Code organization and import ordering
- Function patterns and error handling
- Testing standards
- API and database patterns
- Git conventions
- Anti-patterns to avoid

**Rules for style guide generation:**
- ONLY document patterns you actually observe in the code. Never hallucinate conventions.
- When patterns are inconsistent across the codebase, note the inconsistency and ask the user which convention to standardize on.
- Cite specific files as evidence: "Based on `src/services/UserService.ts`, `src/services/OrderService.ts`..."
- If a STYLE_GUIDE.md already exists, read it first and improve/incorporate rather than overwriting.

> For deeper standalone style analysis (17-section output, full evidence citations), use `/generate-style-guide`. For pre-commit/pre-PR style enforcement against the generated guide, use `/review-style`.

### Step 5: Initialize Beads (if needed)

If no `.beads/` directory exists:

```bash
bd init
```

This creates the `.beads/` directory with config, issue tracking, and git hooks. After init, add the Beads integration to `.claudeignore`:

```
# Beads internals
.beads/dolt/
```

(Keep `.beads/issues.jsonl` and `.beads/config.yaml` tracked in git — only exclude the Dolt database files.)

**If `.beads/` already exists**, skip initialization.

### Step 6: Create Directories

Create if missing:
- `.claude/learnings/` — for `/capture-learning` skill
- `docs/claude/` — for dynamic imports from AGENTS.md / CLAUDE.md

### Step 7: Add Cross-References

If both AGENTS.md and STYLE_GUIDE.md were generated:
- Add to the bottom of AGENTS.md: `## Style Guide\nSee [STYLE_GUIDE.md](STYLE_GUIDE.md) for detailed coding conventions.`
- Ensure STYLE_GUIDE.md header notes the generation date

### Step 8: Summary

Present to the user:
1. What was generated (or skipped)
2. File structure: "AGENTS.md is the primary file. CLAUDE.md is a symlink (macOS/Linux) or copy (Windows) of it."
3. What looks solid vs. what was ambiguous
4. Any inconsistencies that need a human decision
5. "Review both files. AI gets ~80% right — the 20% you fix is the most valuable part."
6. "Run `/audit-claude-md` to score your setup and see where to improve."

---

## `--global` Mode

### 1. Notification Hook (macOS)

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

### 2. Recommended Plugins Check

Report which recommended plugins are installed vs missing:

| Plugin | Purpose | Install |
|--------|---------|---------|
| `superpowers` | Structured workflows (TDD, debugging, planning) | `claude plugins:add obra/superpowers` |
| `episodic-memory` | Persistent memory across sessions | `claude plugins:add obra/episodic-memory` |
| `code-simplifier` | Code simplification agent | Via plugins marketplace |
| `context7` | Library documentation lookup | Via plugins marketplace |

Don't auto-install plugins — just report what's missing and provide install commands.

### Execution Flow

```
1. Read ~/.claude/settings.json
2. For each missing global config:
   a. Show what will be added
   b. Ask for confirmation
   c. Apply the change
3. Report final state
```

---

## `--check` Mode

Read-only audit of your setup. Does not write anything.

```
1. Read ~/.claude/settings.json
2. Report:
   ✅ Notification hook: configured (Funk.aiff)
   ❌ Notification hook: not configured
   ✅ Plugin: superpowers (installed)
   ❌ Plugin: episodic-memory (not installed)
   ...
3. If in a project, also check:
   ✅ AGENTS.md exists (142 lines) — run /audit-claude-md to score it
   ✅ CLAUDE.md exists (symlink → AGENTS.md)
   ⚠️  CLAUDE.md over 200 lines (287 lines) — may increase inference cost 14-22%
   ❌ CLAUDE.md missing — run /setup-ai to scaffold
   ✅ STYLE_GUIDE.md exists (87 lines)
   ❌ STYLE_GUIDE.md missing — run /setup-ai or /generate-style-guide
   ✅ .beads/ initialized
   ❌ .beads/ missing — run /setup-ai or bd init
   ✅ .claude/learnings/ exists
   ❌ docs/claude/ missing
   ✅ Background processes directive found
   ✅ TDD directive found (tdd_required section detected)
   ❌ TDD directive missing — add <tdd_required> block to Behavior Directives
   ✅ Quality Gates workflow found
   ❌ Quality Gates missing — add Canonical Workflow section
   ✅ Non-standard tools documented (3 found: uv, custom-cli, deploy.sh)
   ⚠️  Tech stack section may duplicate package.json — consider trimming
   ✅ Behavior directives present (XML-style sections detected)
```

---

## Safety Rules

- **NEVER overwrite CLAUDE.md, AGENTS.md, or STYLE_GUIDE.md without explicit user confirmation.** Run the bash existence check first, present options, wait for their answer. No exceptions. No "I'll just replace it with a better version." The user's existing files are sacred.
- **NEVER use the Write tool on any of these files when they already exist** — only with explicit user approval AND after creating a .bak backup first. Use Edit (append) for safe additions like Quality Gates.
- **NEVER choose options on behalf of the user.** Present the options and wait for their response.
- **ONLY document patterns you actually observe in the code.** Never hallucinate conventions.
- When patterns are inconsistent, note the inconsistency and ask which to standardize on.
- Cite specific files as evidence for every convention.
- If only one file needs generating, skip the others gracefully.
- **AGENTS.md is always the primary file.** CLAUDE.md is a symlink (macOS/Linux) or copy (Windows). On macOS/Linux, never write content to CLAUDE.md directly — edit AGENTS.md and the symlink follows. On Windows, edits to either file are fine but keep them in sync.
- **Never overwrite** existing configuration — only add missing pieces.
- **Always confirm** before writing to settings.json.
- **Read-modify-write** for JSON files — never clobber existing keys.
- **Don't auto-install plugins** — report what's missing and provide commands.
- **Detect platform** — macOS vs Linux vs WSL for notification hook sound command and symlink strategy.
- Commit the symlink (or copy) to git so it persists for the whole team.
