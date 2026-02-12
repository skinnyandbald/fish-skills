# /verify-worktree-plugins

Verify that worktree plugin patches are intact after Claude Code plugin updates. Checks that the `compound-engineering` and `superpowers` plugins still include instructions for launching new Claude Code instances in worktree directories.

## Usage

```
/verify-worktree-plugins
```

## What It Checks

| Component | What's Verified |
|-----------|----------------|
| compound-engineering SKILL.md | "Claude Code + Worktree Working Directory" section |
| compound-engineering worktree-manager.sh | "Open a NEW Claude Code instance" banner |
| superpowers SKILL.md | "Launch Claude Code" in step 5 report |
| PreCompact hook | `getWorktreeContext` function for compaction survival |

## Prerequisites

- The `compound-engineering` and/or `superpowers` Claude Code plugins installed
- The verification script at `scripts/verify-worktree-plugins.sh` (or `~/.claude/scripts/`)

## When to Run

- After updating the `compound-engineering` plugin
- After updating the `superpowers` plugin
- If worktree creation stops showing "launch Claude Code" instructions
- Periodically as a sanity check

## Fixing Failures

```bash
# Verify
bash ~/.claude/scripts/verify-worktree-plugins.sh

# Auto-patch if checks fail
bash ~/.claude/scripts/verify-worktree-plugins.sh --patch
```

The `--patch` flag auto-fixes SKILL.md and shell script patches. The PreCompact TypeScript hook must be regenerated manually if broken (see SKILL.md for structure).

## Background

Claude Code's working directory is set at launch. Plugin updates can overwrite the patches that tell users to open new terminals for worktrees, causing them to work in the wrong directory context.
