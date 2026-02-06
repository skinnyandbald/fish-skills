# fish-skills

Personal [Claude Code](https://docs.anthropic.com/en/docs/claude-code) skills for development workflows.

## Setup

Clone and symlink into Claude Code's skills directory:

```bash
git clone https://github.com/skinnyandbald/fish-skills.git ~/code/fish-skills
ln -s ~/code/fish-skills ~/.claude/skills
```

Skills are automatically discovered by Claude Code on next session start.

## Skills

| Skill | Description |
|-------|-------------|
| `pr-resolution` | Resolve PR review comments using parallel agents |
| `simplify` | Run code simplification on current branch changes |
| `simplify-parallel` | Parallel codebase simplification with automatic segmentation |
| `git-worktree` | Manage Git worktrees for isolated parallel development |
| `capture-learning` | Capture problem-solving narratives as structured learnings |
| `web-research` | Web research via Perplexity AI |
| `export-session` | Export Claude Code session to timestamped files |
| `process-meeting-notes` | Process Fireflies meeting transcripts into action items |
| `last30days` | Generate visual recaps of recent work |
| `web-design-guidelines` | Review UI code for Web Interface Guidelines compliance |
| `vercel-react-best-practices` | React/Next.js performance optimization guidelines |

## Optional Enhancements

Some skills detect and use optional tools at runtime. These are **not required** — skills work fine without them but gain extra capabilities when they're available.

### GoodToGo (`gtg`)

Used by: `pr-resolution`

[GoodToGo](https://github.com/dsifry/goodtogo) provides deterministic PR readiness detection. When installed, the pr-resolution skill uses it to:
- **Skip unnecessary work** — if `gtg` reports `READY`, jump straight to verification
- **Route intelligently** — `CI_FAILING` vs `ACTION_REQUIRED` vs `UNRESOLVED_THREADS` each trigger different workflows
- **Gate completion** — final `gtg --refresh` check before committing

Without it, the skill runs the full discovery/classification/resolution workflow every time (which still works, just doesn't have the fast-path optimization).

Install:

```bash
pip install gtg
```

`gtg` uses your GitHub CLI auth automatically (`gh auth token`). No additional configuration needed.

## Structure

Each skill is a directory with a `SKILL.md` (required) and optional supporting files:

```
skill-name/
├── SKILL.md              # Skill definition (YAML frontmatter + instructions)
├── references/           # Supporting docs referenced by SKILL.md
├── scripts/              # Shell/TypeScript scripts
└── bin/                  # Executable CLI tools
```

## License

MIT
