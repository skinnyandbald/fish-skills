# /capture-learning

Capture problem-solving narratives from work sessions — documenting not just the solution but the entire journey of discovery.

## Usage

```
/capture-learning
```

Or trigger it naturally with phrases like:
- "Great job, log this"
- "Document this"
- "That worked!"
- "Save this for later"

## What It Captures

The skill records a six-part narrative:

1. **The Problem** — What issue did we encounter?
2. **Initial Assumption** — "We thought this was true..."
3. **Actual Reality** — "What we realized was actually true..."
4. **Troubleshooting Journey** — Steps we took to discover the truth
5. **The Solution** — What finally worked
6. **The Takeaway** — "So now we know..." / "So now we do it this way..."

## Output

Files save to `<project-root>/.claude/learnings/YYYY-MM-DD-problem-description.md`. Falls back to `~/.claude/learnings/` outside a git repo.

## Prerequisites

- [Bun](https://bun.sh) runtime (for the TypeScript script)

## Setup

### Making learnings active

Claude Code doesn't automatically read the learnings directory. Add this to your project's `CLAUDE.md`:

```markdown
## Learnings
Before starting work, check `.claude/learnings/` for relevant past
problem-solving narratives. Apply those lessons instead of repeating mistakes.

**IMPORTANT:** After solving any non-trivial debugging session or
discovering something that contradicts an initial assumption, invoke
`/capture-learning` before moving on.
```

## Direct Script Usage

```bash
# Interactive mode
bun ~/.claude/skills/capture-learning/scripts/capture-learning.ts

# Direct mode (all 6 arguments)
bun ~/.claude/skills/capture-learning/scripts/capture-learning.ts \
  "problem" "initial assumption" "actual reality" \
  "troubleshooting steps" "solution" "key takeaway"
```
