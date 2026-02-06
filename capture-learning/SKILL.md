---
name: capture-learning
description: Capture comprehensive problem-solving narratives from work sessions, documenting the journey of discovery
---

# Capture Learning

Capture comprehensive problem-solving narratives from our work sessions, documenting not just the solution but the entire journey of discovery.

## Purpose

This command captures the full narrative of problem-solving: what we thought was true, what we discovered was actually true, the troubleshooting journey, and the lessons learned. This narrative format makes it easy to harvest insights for updating documentation, commands, or pipelines.

## Usage

```bash
# Interactive mode - guides you through the narrative
bun ~/.claude/skills/capture-learning/scripts/capture-learning.ts

# Direct mode with full narrative (all 6 arguments)
bun ~/.claude/skills/capture-learning/scripts/capture-learning.ts "problem" "initial assumption" "actual reality" "troubleshooting steps" "solution" "key takeaway"
```

## Trigger Phrases

When you say any of these, I'll capture our learning:
- "Great job, log this"
- "Nice work, make a record"
- "Document this"
- "Capture this learning"
- "Save this for later"
- "That worked!"

## The Narrative Structure

The command captures a complete story with these elements:

1. **The Problem** - What issue did we encounter?
2. **Initial Assumption** - "We thought this was true..."
3. **Actual Reality** - "What we realized was actually true..."
4. **Troubleshooting Journey** - Steps we took to discover the truth
5. **The Solution** - What finally worked
6. **The Takeaway** - "So now we know..." or "So now we do it this way..."

## Why This Format?

This narrative approach helps us:
- Remember the journey, not just the destination
- Understand WHY the solution works
- Recognize similar patterns in future problems
- Update our mental models and documentation
- Share knowledge effectively with others

## Output

Files are saved to: `~/.claude/context/learnings/`

Named with format: `YYYY-MM-DD-problem-description.md`

Each file contains:
- Full narrative story
- Before/after comparison
- Technical details and commands used
- Actionable takeaways for future reference

## Implementation

The TypeScript implementation is in `scripts/capture-learning.ts`.

The command:
- Prompts for all 6 narrative elements if not provided
- Creates a structured markdown file in `~/.claude/context/learnings/`
- Names files with date and problem description
- Generates a comprehensive learning narrative
