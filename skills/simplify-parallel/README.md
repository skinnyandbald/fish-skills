# /simplify-parallel

Run code simplification across an entire codebase using parallel agents with automatic segmentation.

## Usage

```
/simplify-parallel                  # Analyze and simplify entire codebase
/simplify-parallel --dry-run        # Analyze only, show plan
/simplify-parallel --focus=lib      # Limit to specific area
/simplify-parallel --segments=4     # Set max parallel agents
```

## Options

| Option | Default | Description |
|--------|---------|-------------|
| `--dry-run` | false | Analyze only, don't modify files |
| `--focus=AREA` | all | Limit scope: `api`, `lib`, `components`, `hooks`, `pages` |
| `--segments=N` | 3 | Max parallel agents |
| `--max-files=N` | 20 | Max files per segment |
| `--verbose` | false | Show detailed progress |

## How It Works

1. **Analyze** — Scans directory structure, counts files, builds import dependency graph
2. **Segment** — Groups files by natural boundaries and coupling (10-25 files per segment)
3. **Execute** — Launches parallel `code-simplifier` agents, one per segment
4. **Verify** — Runs available project checks (typecheck, lint, test, build)

Segments within a group run in parallel; groups run sequentially (foundation modules first, then dependents).

## What It Preserves

- JSDoc/TSDoc comments
- File header comments
- Business logic comments and TODO/FIXME
- Error handling structure
- Intentional `console.log` in test files

## Prerequisites

- Must be in a git repository with a `package.json`
- Works best on TypeScript/JavaScript codebases

## See Also

- `/simplify` — Single-agent version for branch-level changes
- `/git-worktree` — Optional: run in a worktree for maximum isolation
