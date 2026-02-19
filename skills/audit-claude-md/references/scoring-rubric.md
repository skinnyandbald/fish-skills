# CLAUDE.md Scoring Rubric

Reference implementation: See [elite-example.md](elite-example.md) for a fully annotated example scoring 82/90.

## Scoring Categories

### Foundations (20 points)

| Check | Points | What to Look For |
|-------|--------|------------------|
| **Project overview** | 5 | 1-3 sentence description of what the project does, who it's for |
| **Tech stack with versions** | 5 | Specific frameworks + version numbers (not just "React" but "React 19") |
| **Runnable commands** | 5 | Dev server, test, build, lint commands — copy-pasteable |
| **Project structure** | 5 | Key directories explained, path aliases, import conventions |

### Standards (18 points)

| Check | Points | What to Look For |
|-------|--------|------------------|
| **Coding conventions** | 5 | Naming, types, imports, linting tool specified, formatting rules |
| **Testing approach** | 5 | Framework named, coverage expectations, TDD stance |
| **Git workflow** | 5 | Branch strategy, commit message format (conventional commits, etc.) |
| **Path/import conventions** | 3 | Aliases, relative vs absolute, barrel exports stance |

### Behavior Configuration (18 points)

| Check | Points | What to Look For |
|-------|--------|------------------|
| **Behavior directives** | 5 | Explicit rules for AI behavior: over-engineering prevention, action bias, cleanup |
| **Bug fix process** | 5 | TDD-based steps: write failing test → verify fail → fix → verify pass |
| **Background processes** | 5 | Instruction to run tests/builds in background, command table |
| **Debugging guardrails** | 3 | Iteration limits, "stop and reconsider" rules, library-first approach |

### Architecture (14 points)

| Check | Points | What to Look For |
|-------|--------|------------------|
| **Linked detailed guides** | 5 | `docs/claude/` or similar directory with topic-specific deep dives |
| **Under 200 lines** | 4 | Main CLAUDE.md is concise; detail lives in linked files |
| **Critical warnings** | 5 | Project-specific footguns called out prominently (bold, caps, or dedicated section) |

### Memory & Learning (7 points)

| Check | Points | What to Look For |
|-------|--------|------------------|
| **Learnings directory** | 4 | References `.claude/learnings/` or similar for captured debugging narratives |
| **Capture learning trigger** | 3 | Instruction to invoke learning capture after non-trivial debugging |

### Advanced (13 points)

| Check | Points | What to Look For |
|-------|--------|------------------|
| **Frontend/UI guidelines** | 3 | Design taste rules, component library specified, "avoid AI slop" equivalent |
| **Security guidelines** | 4 | Input validation, auth patterns, secrets handling, security review process |
| **Parallel workflows** | 3 | Worktree instructions, multi-session patterns, copy-paste launch blocks |
| **MCP/tool configuration** | 3 | Which MCPs/tools are relevant for this project, what to enable/disable |

## Scoring Tiers

| Score | Tier | Assessment |
|-------|------|------------|
| 0-20 | Bare Minimum | AI is flying blind. Will generate generic code that doesn't match your project. |
| 21-40 | Functional | Covers basics but AI will still produce inconsistent code and miss conventions. |
| 41-60 | Strong | AI produces code matching project conventions. Most common issues prevented. |
| 61-75 | Advanced | Full behavior configuration. AI works like a disciplined team member. |
| 76-90 | Elite | Institutional memory, parallel workflows, continuous learning. The AI gets better over time. |

## Report Format

For each category, report:

```
### [Category Name] — [X]/[Max] points

| Check | Score | Status | Notes |
|-------|-------|--------|-------|
| [item] | X/Y | Found / Partial / Missing | [specific observation] |

**Top recommendation:** [single highest-impact improvement for this category]
```

## Common Patterns to Detect

### Positive Signals
- XML-style named sections (e.g., `<avoid_over_engineering>`)
- Tables mapping commands to use cases
- Links to separate guide files
- Bold/caps warnings for critical processes
- "DO NOT" or "CRITICAL" markers for important rules
- Version numbers alongside technology names

### Red Flags
- Over 300 lines with no linked files (context window hog)
- No testing section at all
- Generic descriptions ("we use React") without versions
- No behavior directives (AI has no working-style guidance)
- No commands section (AI can't run your project)
- Copy-pasted from a template without customization (generic headings with no content)

### Partial Credit Signals
- Has a section but it's vague ("follow best practices")
- Lists technologies but no versions
- Has commands but they're incomplete (dev server but no test command)
- Mentions testing but no framework or coverage expectations
