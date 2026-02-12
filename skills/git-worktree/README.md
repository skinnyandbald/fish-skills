# /git-worktree

Manage isolated Git worktrees for parallel development. Creates worktrees in `.github/worktrees/` with symlinked `.env` files.

## Usage

```
/git-worktree create feature-auth
/git-worktree create hotfix/auth main     # branch from main instead of develop
/git-worktree list
/git-worktree cleanup
```

## What It Does

1. Creates a worktree at `.github/worktrees/<name>`
2. Symlinks `.env` from project root (single source of truth)
3. Ensures `.github/worktrees/` is in `.gitignore`
4. Outputs a copy-paste command to launch Claude Code in the worktree

**Important:** After creating a worktree, the skill **stops**. You must open a new terminal and run the provided command. Claude Code's working directory is set at launch — you can't `cd` into a worktree from an existing session.

## Commands

| Command | Description |
|---------|-------------|
| `create <name> [base]` | Create worktree (default base: `develop`) |
| `list` / `ls` | List all worktrees |
| `switch <name>` / `go <name>` | Switch to a worktree |
| `cleanup` / `clean` | Remove inactive worktrees interactively |

## Prerequisites

- Git 2.15+ (worktree support)

## Setup

### Default base branch

The skill defaults to branching from `develop`. Edit the script at `scripts/worktree-manager.sh` to change the default base branch if your project uses `main`.

### Direct script usage

```bash
bash ~/.claude/skills/git-worktree/scripts/worktree-manager.sh create feature-name
bash ~/.claude/skills/git-worktree/scripts/worktree-manager.sh list
bash ~/.claude/skills/git-worktree/scripts/worktree-manager.sh cleanup
```

## Why a New Terminal?

Claude Code's CWD and statusline are set at launch. If you `cd` into a worktree from an existing session, the statusline stays wrong and auto-compact reverts you to the main repo. Each worktree needs its own Claude Code instance.
