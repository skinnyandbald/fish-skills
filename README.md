```
          /`·.¸
         /¸...¸`:·
     ¸.·´  ¸   `·.¸.·´)
    : © ):´;      ¸  {    f i s h - s k i l l s
     `·.¸ `·  ¸.·´\`·¸)
         `\\´´\¸.·´
```

# fish-skills

Personal [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills for development workflows — PR resolution, code simplification, worktree management, meeting processing, and more.

## Installation

### Quick Install (Recommended)

Uses the [Vercel Skills CLI](https://github.com/vercel-labs/skills) — interactive picker, symlinks, multi-agent support (Claude Code, Cursor, Copilot, Gemini CLI, Codex, Amp, and more).

```sh
npx skills add skinnyandbald/fish-skills
```

This clones the repo, shows an interactive skill picker (space to toggle), and installs your selections via symlinks. Cherry-pick a single skill with:

```sh
npx skills add skinnyandbald/fish-skills@pr-resolution
```

**Submodule skills** (community contributions) aren't included in the main repo install — add them separately:

```sh
npx skills add aarondfrancis/counselors     # Fan-out to multiple AI agents
npx skills add rjs/shaping-skills           # Basecamp-style shaping workflow
npx skills add mvanhorn/last30days-skill    # Trending topic research
```

**Managing installed skills:**

```sh
npx skills list       # see what's installed
npx skills check      # check for updates
npx skills update     # update all skills
```

### Manual Install (Alternative)

If you prefer managing symlinks yourself, or want everything including submodule skills in one clone:

```sh
git clone --recursive https://github.com/skinnyandbald/fish-skills.git ~/code/fish-skills
```

Claude Code looks for skills in two places:

| Location | Scope | Path |
|----------|-------|------|
| **User skills** | Available in every project on your machine | `~/.claude/skills/` |
| **Project skills** | Available only in a specific project | `<project-root>/.claude/skills/` |

**Install all skills globally:**

```sh
mkdir -p ~/.claude/skills
find ~/code/fish-skills/skills -iname skill.md -exec dirname {} \; | while read d; do
  ln -sf "$d" ~/.claude/skills/
done
```

**Cherry-pick individual skills:**

```sh
mkdir -p ~/.claude/skills
ln -s ~/code/fish-skills/skills/pr-resolution ~/.claude/skills/pr-resolution
ln -s ~/code/fish-skills/skills/simplify-parallel ~/.claude/skills/simplify-parallel
```

**Install into a specific project:**

```sh
cd ~/my-project
mkdir -p .claude/skills
ln -s ~/code/fish-skills/skills/pr-resolution .claude/skills/pr-resolution
```

After installing (either method), restart Claude Code or start a new session. Skills are auto-discovered and show up as `/skill-name` commands.

### Required dependencies

Most skills work out of the box, but some require additional setup:

| Dependency | Required by | Install |
|---|---|---|
| [GitHub CLI](https://cli.github.com/) (`gh`) | pr-resolution, process-meeting-notes | `brew install gh && gh auth login` |
| Claude Code v2.1.63+ | simplify-parallel | Built-in `/simplify` provides the review model; `/simplify-parallel` extends it to full-codebase sweeps |
| [Fireflies MCP](https://www.fireflies.ai/) | process-meeting-notes | Configure in Claude Code MCP settings |

Skills not listed above (setup-ai, git-worktree, capture-learning, last30days, web-design-guidelines, vercel-react-best-practices, prepare-plan-for-review, analyze-plan-feedback, simplify-parallel) work with no additional setup beyond the dependencies above.

## Quick Start

Open any project in Claude Code and invoke a skill:

```
/pr-resolution 42
/simplify-parallel --focus=lib
/git-worktree create feat/my-feature
/last30days "best AI coding tools"
```

Each skill runs in Claude Code's context with access to your codebase, git history, and configured tools.

## Skills

### Code Review & Quality

| Skill | Command | Description |
|-------|---------|-------------|
| **pr-resolution** | `/pr-resolution [PR#]` | Resolve PR review comments using parallel agents with 5-phase workflow |
| **simplify-parallel** | `/simplify-parallel` | Parallel codebase simplification with automatic segmentation (complements built-in `/simplify`) |
| **web-design-guidelines** | `/web-design-guidelines` | Review UI code against [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) |
| **vercel-react-best-practices** | `/vercel-react-best-practices` | React/Next.js performance optimization (45 rules across 8 categories) |

### Development Workflow

| Skill | Command | Description |
|-------|---------|-------------|
| **setup-ai** | `/setup-ai [--global\|--project\|--check]` | Configure Claude Code for power-user AI development (hooks, plugins, CLAUDE.md) |
| **git-worktree** | `/git-worktree [cmd] [args]` | Manage Git worktrees for isolated parallel development |
| **capture-learning** | `/capture-learning` | Capture problem-solving narratives as structured learnings |

### Planning & Review

| Skill | Command | Description |
|-------|---------|-------------|
| **prepare-plan-for-review** | `/prepare-plan-for-review [path]` | Generate a copyable peer review prompt for Cursor's multi-model agent flow |
| **analyze-plan-feedback** | `/analyze-plan-feedback [path] [N]` | Interactively collect and analyze peer review feedback from N reviewers |

### EOS Operating System

| Skill | Command | Description |
|-------|---------|-------------|
| **eos** | `/eos [request]` | Context-aware EOS router — suggests actions based on day of week, quarter position, and data staleness |

The `/eos` skill is a conductor that routes to [Brad Feld's CEOS skills](https://github.com/bradfeld/ceos) (17 skills for running EOS with Claude Code). Install CEOS first, then use `/eos` as your single entry point:

```sh
npx skills add bradfeld/ceos         # install the 17 CEOS skills
npx skills add skinnyandbald/fish-skills@eos  # install the /eos router
```

`/eos` reads your project's CLAUDE.md for customization (CEOS data root path, L10 day, solopreneur mode). Without arguments, it shows a context-aware dashboard with prioritized suggestions. With arguments (e.g., `/eos scorecard`, `/eos rocks`), it routes directly to the right CEOS skill.

### Research & Knowledge

| Skill | Command | Description |
|-------|---------|-------------|
| **last30days** | `/last30days [topic]` | Research trending topics from Reddit, X, and the web |
| **process-meeting-notes** | `/process-meeting-notes` | Process Fireflies transcripts into action items and GitHub issues |

## Skill Details

### prepare-plan-for-review

Generates a **copyable prompt** for multi-model peer review of an implementation plan. Resolves the plan file path to an absolute path, substitutes it into the prompt template, and outputs a fenced code block you can paste into Cursor's multi-model agent flow.

```
/prepare-plan-for-review docs/plans/my-feature.md
/prepare-plan-for-review  # prompts for plan path
```

Output: A ready-to-copy TDD analysis prompt with the plan file path baked in.

On first run, auto-detects the project's tech stack and caches it to `.claude/stack-profile.md`. Subsequent runs use the cache instantly. To refresh after a stack change, delete `.claude/stack-profile.md` and run the command again — it'll re-detect automatically.

### analyze-plan-feedback

Interactively collect and analyze peer review feedback from multiple reviewers. Asks for each reviewer's feedback one at a time, then categorizes as Critical/High/Medium/Low, resolves conflicts, and creates an ordered action plan.

```
/analyze-plan-feedback docs/plans/my-feature.md    # 3 reviewers (default)
/analyze-plan-feedback docs/plans/my-feature.md 2  # 2 reviewers
/analyze-plan-feedback 2                            # auto-detect plan, 2 reviewers
/analyze-plan-feedback                              # auto-detect plan, 3 reviewers
```

When no plan path is given, it auto-detects from conversation context, recent git changes, or the most recently modified file in `docs/plans/`.

Output: Priority-classified action items with effort estimates and a reviewer agreement matrix.

### Typical Plan Review Workflow

```
# 1. Write a plan
/plan "Add transcript import feature"

# 2. Get a copyable peer review prompt
/prepare-plan-for-review docs/plans/transcript-import.md
# → paste into Gemini, ChatGPT, Claude web

# 3. Analyze the feedback interactively (auto-detects plan)
/analyze-plan-feedback

# 4. Apply the prioritized improvements to your plan
```

### pr-resolution

Resolves GitHub PR review comments through a 5-phase parallel workflow:

1. **Pre-Flight** — Optional [GoodToGo](https://github.com/dsifry/goodtogo) check for deterministic PR readiness
2. **Discovery** — Gather all unresolved review threads (supports CodeRabbit, Gemini, Claude, human reviewers)
3. **Classification** — Categorize comments by type, severity, and file grouping
4. **Parallel Resolution** — Launch dedicated agents per file group to implement fixes
5. **Verification & Completion** — Run checks, commit changes, resolve threads

```
/pr-resolution           # auto-detect PR for current branch
/pr-resolution 42        # resolve comments on PR #42
```

### simplify-parallel

Codebase-wide simplification using parallel agents with automatic file segmentation and dependency ordering.

> **Note:** Claude Code v2.1.63+ ships a built-in `/simplify` that reviews recently changed files through 3 parallel agents (code reuse, quality, efficiency). `/simplify-parallel` complements it for full-codebase sweeps and large PRs where the built-in's diff-scoped approach may hit context limits.

```
/simplify-parallel                # analyze and simplify entire codebase
/simplify-parallel --dry-run      # analyze only, show plan
/simplify-parallel --focus=lib    # limit to specific area
/simplify-parallel --segments=4   # set max parallel agents
```

Each worker reviews its file segment through the same three lenses as the built-in `/simplify`: code reuse, code quality, and efficiency.

### git-worktree

Manage Git worktrees in `.github/worktrees/` for isolated parallel development:

```
/git-worktree create feat/auth    # create worktree with branch
/git-worktree list                # show all worktrees
/git-worktree switch feat/auth    # switch to worktree
/git-worktree cleanup             # remove stale worktrees
```

Key behavior: symlinks `.env` (not copies) so all worktrees share a single source of truth for environment variables. Automatically updates `.gitignore`.

### last30days

Research any topic across Reddit, X, and the web to surface what people are actually discussing right now:

```
/last30days "best AI coding tools" for Claude Code
/last30days "photorealistic AI prompts"
```

Three research modes based on available API keys:
- **Full**: Reddit + X + Web (requires `OPENAI_API_KEY` + `XAI_API_KEY`)
- **Partial**: Single platform + Web
- **Web-Only**: No API keys needed

### process-meeting-notes

Process Fireflies meeting transcripts into structured outputs:

- Extract action items with WHO/WHAT/WHEN accountability (EOS Level 10 format)
- Create GitHub issues with labels, checklists, and project assignment
- Detect duplicate issues before creating
- Dynamic repo context detection (available labels, milestones, projects)

Requires Fireflies MCP integration in Claude Code.

### capture-learning

Capture problem-solving narratives with a 6-element structure:

1. The Problem
2. Initial Assumption
3. Actual Reality
4. Troubleshooting Journey
5. The Solution
6. The Takeaway

Saves to `<project-root>/.claude/learnings/YYYY-MM-DD-problem-description.md`. Falls back to `~/.claude/learnings/` if not in a git repo. Trigger with phrases like "Great job, log this" or "Capture this learning".

**Setup:** Add this to your project's `CLAUDE.md` so Claude reads past learnings and captures new ones:

```markdown
## Learnings
Before starting work, check `.claude/learnings/` for relevant past
problem-solving narratives. Apply those lessons instead of repeating
mistakes.

**IMPORTANT:** After solving any non-trivial debugging session or
discovering something that contradicts an initial assumption, invoke
`/capture-learning` before moving on. Do not skip this step.
```

The `.claude/learnings/` directory is created automatically on first capture. Without the `CLAUDE.md` snippet, Claude won't check for existing learnings or know to capture new ones.

### vercel-react-best-practices

45 optimization rules across 8 priority categories:

| Priority | Category | Rules |
|----------|----------|-------|
| Critical | Eliminating Waterfalls | Async patterns, parallel data fetching |
| Critical | Bundle Size | Barrel imports, tree shaking, dynamic imports |
| High | Server-Side Performance | RSC patterns, streaming, caching |
| Medium-High | Client Data Fetching | TanStack Query, SWR patterns |
| Medium | Re-render Optimization | 7 rules for memo, callbacks, state |
| Medium | Rendering Performance | Virtualization, layout thrashing |
| Low-Medium | JavaScript Performance | 10 micro-optimization rules |
| Low | Advanced Patterns | Web Workers, WASM, compiler hints |

Each rule includes incorrect vs correct code examples with explanations.

## Optional Enhancements

Some skills detect and use optional tools at runtime. These are **not required** — skills work fine without them but gain extra capabilities when available.

### GoodToGo (`gtg`)

Used by: `pr-resolution`

[GoodToGo](https://github.com/dsifry/goodtogo) provides deterministic PR readiness detection. When installed, pr-resolution uses it to skip unnecessary work (`READY` → fast-path), route intelligently based on status (`CI_FAILING` vs `ACTION_REQUIRED` vs `UNRESOLVED_THREADS`), and gate completion with a final check.

```sh
pip install gtg
```

Uses your GitHub CLI auth automatically (`gh auth token`). No additional configuration needed.

### API Keys (last30days)

Optional keys for expanded research capabilities:

```sh
# ~/.config/last30days/.env
OPENAI_API_KEY=sk-...    # enables Reddit research
XAI_API_KEY=xai-...      # enables X/Twitter research
```

Without these, `last30days` falls back to web-only research mode.

## Recommended Hooks

Claude Code [hooks](https://docs.anthropic.com/en/docs/claude-code/hooks) run shell commands in response to lifecycle events (Stop, PostToolUse, SessionStart, etc.). These are global automation recipes that pair well with fish-skills.

### Auto-Simplify on Stop

Automatically runs the built-in `/simplify` skill (3-agent parallel code review for reuse, quality, and efficiency) whenever Claude finishes a task that modified code files. Uses a Stop hook so all changes are batched into one review pass.

**Why Stop, not PostToolUse:** PostToolUse fires after every single Write/Edit -- running 3 review agents per edit is expensive and noisy. Stop fires once when Claude is "done," covering all changes at once.

**Create the hook script:**

```bash
# ~/.claude/hooks/auto-simplify-stop.sh
#!/bin/bash
# Auto-Simplify Stop Hook
# When Claude stops after modifying code files, blocks the stop and tells
# Claude to run /simplify. Uses session-scoped flag to prevent infinite loops.

INPUT=$(cat)
SESSION_ID=$(echo "$INPUT" | jq -r '.session_id // "unknown"')

FLAG_DIR="/tmp/claude-simplify-flags"
mkdir -p "$FLAG_DIR"
FLAG_FILE="$FLAG_DIR/$SESSION_ID"

# If flag exists, simplify already ran -- clean up and let Claude stop
if [ -f "$FLAG_FILE" ]; then
  rm -f "$FLAG_FILE"
  exit 0
fi

# Check for modified code files:
# 1. Uncommitted changes (staged + unstaged)
# 2. Unpushed commits (already committed but not pushed to remote)
UNCOMMITTED=$(git diff --name-only 2>/dev/null; git diff --name-only --cached 2>/dev/null)
UNPUSHED=$(git diff --name-only @{upstream}..HEAD 2>/dev/null)
ALL=$(echo -e "$UNCOMMITTED\n$UNPUSHED" | grep -E '\.(py|ts|tsx|js|jsx)$' | sort -u | grep -v '^$')

if [ -z "$ALL" ]; then
  exit 0  # No code changes -- stop normally
fi

# Block stop, request simplify
touch "$FLAG_FILE"
echo "[$(date -u +%Y-%m-%dT%H:%M:%SZ)] auto-simplify triggered for session $SESSION_ID: $ALL" >> /tmp/claude-simplify.log
echo "Code changes detected. Run /simplify to review before completing:" >&2
echo "$ALL" >&2
exit 2
```

**Install:**

```bash
chmod +x ~/.claude/hooks/auto-simplify-stop.sh
```

Add to `~/.claude/settings.json` under `hooks.Stop`:

```json
{
  "hooks": [
    {
      "command": "bash ~/.claude/hooks/auto-simplify-stop.sh",
      "type": "command"
    }
  ]
}
```

**How it works:**

1. Claude finishes a coding task and tries to stop
2. Hook checks `git diff` for uncommitted changes + unpushed commits with code file extensions
3. If code changed and no flag file exists: creates flag, exits with code 2 (blocks stop), tells Claude to run `/simplify`
4. Claude runs `/simplify` (3 parallel agents review code reuse, quality, efficiency)
5. Claude tries to stop again -- flag exists, so hook removes it and exits 0 (allows stop)

**Customize file extensions:** Edit the `grep -E` pattern to match your stack. Default: `.py`, `.ts`, `.tsx`, `.js`, `.jsx`.

**Logs:** Check `/tmp/claude-simplify.log` to see when it triggers.

## Recommended Plugins

These Claude Code plugins pair well with fish-skills. They're not required, but they make your workflow significantly better.

### [Superpowers](https://github.com/obra/superpowers)

Adds structured workflows for test-driven development, systematic debugging, parallel agent dispatch, git worktrees, code review, and plan execution. Teaches Claude to work more methodically instead of jumping straight to code.

```sh
claude plugins:add obra/superpowers
```

### [Episodic Memory](https://github.com/obra/episodic-memory)

Gives Claude persistent memory across sessions. It indexes your conversation history so Claude can search past sessions for decisions, solutions, and context you've already discussed. Pairs especially well with `/capture-learning` — learnings you capture become searchable knowledge.

```sh
claude plugins:add obra/episodic-memory
```

After installing, start a new Claude Code session. Both plugins auto-register their skills and agents.

## Architecture

```
fish-skills/
├── skills/                          # All skills (directories with SKILL.md)
│   ├── analyze-plan-feedback/       # Peer review feedback analysis
│   │   └── SKILL.md
│   ├── capture-learning/            # Problem-solving narrative capture
│   │   ├── SKILL.md
│   │   └── scripts/
│   ├── eos/                         # EOS operating system router (requires bradfeld/ceos)
│   │   └── SKILL.md
│   ├── git-worktree/                # Worktree management
│   │   ├── SKILL.md
│   │   └── scripts/
│   ├── last30days/                  # Trending topic research (submodule)
│   │   └── ...
│   ├── pr-resolution/               # PR comment resolution (v3, parallel agents)
│   │   ├── SKILL.md
│   │   ├── bin/
│   │   └── references/
│   ├── prepare-plan-for-review/     # Multi-model plan peer review prompt
│   │   └── SKILL.md
│   ├── process-meeting-notes/       # Fireflies → GitHub issues
│   │   ├── SKILL.md
│   │   ├── references/
│   │   ├── templates/
│   │   └── workflows/
│   ├── setup-ai/                    # AI dev environment setup & audit
│   │   └── SKILL.md
│   ├── simplify-parallel/           # Parallel codebase simplification (complements built-in /simplify)
│   │   ├── SKILL.md
│   │   ├── analyze.md
│   │   └── orchestrator.md
│   ├── vercel-react-best-practices/ # React/Next.js optimization
│   │   ├── SKILL.md
│   │   ├── AGENTS.md
│   │   └── rules/
│   └── web-design-guidelines/       # Web UI compliance checker
│       └── SKILL.md
└── README.md
```

### Skill Anatomy

Every skill follows the same structure:

```
skill-name/
├── SKILL.md        # Required: YAML frontmatter + instructions
├── references/     # Optional: supporting docs referenced by SKILL.md
├── scripts/        # Optional: shell/TypeScript/Python scripts
├── bin/            # Optional: executable CLI tools
└── templates/      # Optional: output templates
```

The `SKILL.md` frontmatter controls how Claude Code runs the skill:

```yaml
---
name: skill-name
description: One-line description
argument-hint: "[args]"       # shown in autocomplete
context: fork                 # fork = isolated context
agent: Explore                # agent type to handle execution
allowed-tools: Bash, Read...  # tool access whitelist
---
```

## Prerequisites

| Requirement | Used By | Notes |
|-------------|---------|-------|
| [Claude Code](https://docs.anthropic.com/en/docs/claude-code) | All skills | Host environment |
| [GitHub CLI](https://cli.github.com/) (`gh`) | pr-resolution, process-meeting-notes | Authenticated via `gh auth login` |
| Git | git-worktree, pr-resolution, simplify-parallel | Standard installation |
| Python 3 | git-worktree, last30days | For scripts |
| Bash | git-worktree | Shell scripts |

### Built-in /simplify (Claude Code v2.1.63+)

Claude Code ships a built-in `/simplify` command that reviews recently changed files through 3 parallel agents (code reuse, quality, efficiency). No installation needed — it's available automatically.

`/simplify-parallel` from this repo complements it for codebase-wide sweeps where the built-in's diff-scoped approach may hit context limits. Each parallel worker uses the same three-lens review model.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-skill`
3. Add your skill to `skills/` as a directory with a `SKILL.md`
4. Submit a pull request

Skills must have a `SKILL.md` with valid YAML frontmatter. See [Skill Anatomy](#skill-anatomy) for the required structure.

## License

MIT
