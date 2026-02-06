# fish-skills

Personal [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills for development workflows — PR resolution, code simplification, worktree management, meeting processing, and more.

## Installation

Clone the repo (includes submodules for `last30days`):

```sh
git clone --recursive https://github.com/skinnyandbald/fish-skills.git ~/code/fish-skills
```

If you already cloned without `--recursive`, pull the submodules:

```sh
cd ~/code/fish-skills
git submodule update --init
```

### Adding skills to Claude Code

Claude Code looks for skills in two places:

| Location | Scope | Path |
|----------|-------|------|
| **User skills** | Available in every project on your machine | `~/.claude/skills/` |
| **Project skills** | Available only in a specific project | `<project-root>/.claude/skills/` |

**Option A: Install all skills globally (user-level)**

Symlink the entire repo so every skill is available everywhere:

```sh
ln -s ~/code/fish-skills ~/.claude/skills
```

**Option B: Install individual skills globally**

Cherry-pick specific skills:

```sh
mkdir -p ~/.claude/skills
ln -s ~/code/fish-skills/pr-resolution ~/.claude/skills/pr-resolution
ln -s ~/code/fish-skills/simplify ~/.claude/skills/simplify
```

**Option C: Install into a specific project**

Add skills to a single project's `.claude/skills/` directory:

```sh
cd ~/my-project
mkdir -p .claude/skills
ln -s ~/code/fish-skills/pr-resolution .claude/skills/pr-resolution
```

After symlinking, restart Claude Code (or start a new session). Skills are auto-discovered and show up as `/skill-name` commands.

### Required dependencies

Most skills work out of the box, but some require additional setup:

| Dependency | Required by | Install |
|---|---|---|
| [GitHub CLI](https://cli.github.com/) (`gh`) | pr-resolution, process-meeting-notes | `brew install gh && gh auth login` |
| [code-simplifier plugin](#required-plugin-code-simplifier) | simplify, simplify-parallel | See [setup instructions](#required-plugin-code-simplifier) below |
| [Fireflies MCP](https://www.fireflies.ai/) | process-meeting-notes | Configure in Claude Code MCP settings |

Skills not listed above (git-worktree, capture-learning, last30days, web-design-guidelines, vercel-react-best-practices) work with no additional setup.

## Quick Start

Open any project in Claude Code and invoke a skill:

```
/pr-resolution 42
/simplify branch
/git-worktree create feat/my-feature
/last30days "best AI coding tools"
```

Each skill runs in Claude Code's context with access to your codebase, git history, and configured tools.

## Skills

### Code Review & Quality

| Skill | Command | Description |
|-------|---------|-------------|
| **pr-resolution** | `/pr-resolution [PR#]` | Resolve PR review comments using parallel agents with 5-phase workflow |
| **simplify** | `/simplify [scope]` | Run code simplification on current branch/PR changes |
| **simplify-parallel** | `/simplify-parallel` | Parallel codebase simplification with automatic segmentation |
| **web-design-guidelines** | `/web-design-guidelines` | Review UI code against [Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines) |
| **vercel-react-best-practices** | `/vercel-react-best-practices` | React/Next.js performance optimization (45 rules across 8 categories) |

### Development Workflow

| Skill | Command | Description |
|-------|---------|-------------|
| **git-worktree** | `/git-worktree [cmd] [args]` | Manage Git worktrees for isolated parallel development |
| **capture-learning** | `/capture-learning` | Capture problem-solving narratives as structured learnings |

### Research & Knowledge

| Skill | Command | Description |
|-------|---------|-------------|
| **last30days** | `/last30days [topic]` | Research trending topics from Reddit, X, and the web |
| **process-meeting-notes** | `/process-meeting-notes` | Process Fireflies transcripts into action items and GitHub issues |

## Skill Details

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

### simplify & simplify-parallel

Analyze code changes and suggest simplifications with explanations.

```
/simplify branch         # simplify current branch changes
/simplify staged         # simplify staged files only
/simplify file:src/app.ts
/simplify all            # entire codebase
```

`/simplify-parallel` runs the same analysis across the entire codebase using parallel agents with automatic file segmentation and dependency ordering. Supports `--dry-run`, `--focus=AREA`, `--segments=N`.

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

Saves to `~/.claude/context/learnings/YYYY-MM-DD-problem-description.md`. Trigger with phrases like "Great job, log this" or "Capture this learning".

**Important:** Claude Code does not automatically load files from `~/.claude/context/`. To make captured learnings influence future sessions, add a reference in your `CLAUDE.md`:

```markdown
# In your project's CLAUDE.md (or ~/.claude/CLAUDE.md for global)

## Learnings
Before starting work, check `~/.claude/context/learnings/` for relevant past problem-solving narratives. These contain documented solutions, assumptions that turned out wrong, and patterns to follow.
```

This tells Claude to consult your learnings directory at the start of each session, turning passive notes into active institutional memory.

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

## Architecture

```
fish-skills/
├── pr-resolution/          # PR comment resolution (v3, parallel agents)
│   ├── SKILL.md            # Skill definition + workflow
│   ├── bin/                # 5 executable scripts (get-pr-comments, etc.)
│   └── references/         # 6 domain knowledge docs
├── simplify/               # Code simplification (single pass)
│   └── SKILL.md
├── simplify-parallel/      # Parallel codebase simplification
│   ├── SKILL.md            # Orchestrator workflow
│   ├── analyze.md          # Analysis phase
│   └── orchestrator.md     # Parallel dispatch logic
├── git-worktree/           # Worktree management
│   ├── SKILL.md
│   └── scripts/            # worktree-manager.sh (323 lines)
├── capture-learning/       # Problem-solving narrative capture
│   ├── SKILL.md
│   └── scripts/            # capture-learning.ts
├── process-meeting-notes/  # Fireflies → GitHub issues
│   ├── SKILL.md
│   ├── references/         # EOS format, GitHub config
│   ├── templates/          # Output templates
│   └── workflows/          # Workflow definitions
├── last30days/             # Trending topic research (submodule → mvanhorn/last30days-skill)
│   └── ...
├── web-design-guidelines/  # Web UI compliance checker
│   └── SKILL.md
└── vercel-react-best-practices/  # React/Next.js optimization
    ├── SKILL.md
    ├── AGENTS.md           # Full compiled guide (60KB)
    └── rules/              # 45+ individual rule files
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
| Git | git-worktree, pr-resolution, simplify | Standard installation |
| Python 3 | git-worktree, last30days | For scripts |
| Bash | git-worktree | Shell scripts |

### Required Plugin: code-simplifier

The **simplify** and **simplify-parallel** skills delegate to the `code-simplifier` agent provided by Anthropic's official plugin. You must install it for these skills to work.

**1. Add the official plugins marketplace** (if you haven't already):

```
/plugins:add-registry anthropics/claude-plugins-official
```

**2. Install the code-simplifier plugin:**

```
/plugins:install code-simplifier@claude-plugins-official
```

**3. Enable the plugin** in your Claude Code settings (`~/.claude/settings.json`):

```json
{
  "enabledPlugins": {
    "code-simplifier@claude-plugins-official": true
  }
}
```

This registers the `code-simplifier:code-simplifier` agent that both `/simplify` and `/simplify-parallel` use under the hood. Without it, these skills will fail when they attempt to launch the agent via the Task tool.

## Contributing

1. Fork the repository
2. Create a feature branch: `git checkout -b feat/my-skill`
3. Add your skill directory with a `SKILL.md`
4. Submit a pull request

Each skill must have a `SKILL.md` with valid YAML frontmatter. See [Skill Anatomy](#skill-anatomy) for the required structure.

## License

MIT
