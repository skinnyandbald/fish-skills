# CLAUDE.md Scoring Rubric (v3)

Revised March 2026. Adds section coherence and agent compliance phrasing checks — inspired by integration analysis patterns that catch contradictions and phrasing that agents reliably follow. Based on "Evaluating AGENTS.md" (ETH Zurich, ICML 2026). Key insight: agents discover most project info from existing files (README, package.json, source code). Context files are highest-value for non-standard tools, behavioral constraints, and project-specific footguns.

Reference implementation: See [elite-example.md](elite-example.md) for a fully annotated example.

## Scoring Categories

### Foundations (12 points)

| Check | Points | What to Look For |
|-------|--------|------------------|
| **Project overview** | 2 | 1-3 sentence description of what the project does, who it's for. Keep brief -- agents read README for details. |
| **Tech stack deviations** | 2 | Only document what DIFFERS from framework defaults or what agents can't discover from package.json/config files. "React 19" = discoverable. "We use Bun not npm" = valuable. |
| **Runnable commands** | 5 | Dev server, test, build, lint commands -- copy-pasteable. Research shows agents adopt documented tools 50x more than undocumented ones. Include ALL non-standard scripts. |
| **Non-standard tooling** | 3 | Custom CLIs, repo-specific scripts, non-default package managers, unusual build steps. The single highest-ROI item to document per empirical evidence. |

### Standards (14 points)

| Check | Points | What to Look For |
|-------|--------|------------------|
| **Convention deviations** | 3 | Only conventions that DEVIATE from framework defaults. "Use strict TypeScript" = discoverable from tsconfig. "Never use `any`" = deviates from what agents default to. |
| **Testing approach** | 5 | Framework named, coverage expectations, TDD stance. Process directives remain high-value -- agents can't infer "TDD is mandatory" from code. |
| **Git workflow** | 3 | Branch strategy, commit message format. Agents infer much from .github/ and commit history. Score deviations from conventional patterns. |
| **Path/import conventions** | 3 | Aliases, relative vs absolute, barrel exports stance |

### Behavior Configuration (25 points)

| Check | Points | What to Look For |
|-------|--------|------------------|
| **Behavior directives** | 7 | Explicit rules for AI behavior: over-engineering prevention, action bias, cleanup. These CANNOT be inferred from code -- highest unique value of context files. |
| **Bug fix process** | 5 | TDD-based steps: write failing test -> verify fail -> fix -> verify pass |
| **Background processes** | 5 | Instruction to run tests/builds in background, command table |
| **Debugging guardrails** | 5 | Iteration limits, "stop and reconsider" rules, library-first approach. Prevents expensive debugging loops -- research shows context files increase inference cost 14-22% when agents follow unnecessary instructions. |
| **Agent compliance phrasing** | 3 | Directives use patterns agents reliably follow: XML-style named sections (`<avoid_over_engineering>`), tables for structured choices, bold/caps for critical rules ("DO NOT", "CRITICAL"). Prose paragraphs are weaker than structured formats. Partial credit for some structure but inconsistent phrasing. |

### Architecture (19 points)

| Check | Points | What to Look For |
|-------|--------|------------------|
| **Linked detailed guides** | 5 | `docs/claude/` or similar directory with topic-specific deep dives |
| **Conciseness (under 200 lines)** | 6 | Main CLAUDE.md is lean; detail lives in linked files. Research shows redundant context increases inference cost 14-22% with no performance gain. Penalize files that restate info from README or package.json. |
| **Critical warnings** | 5 | Project-specific footguns called out prominently (bold, caps, or dedicated section) |
| **Section coherence** | 3 | No contradictions between directives. Sections reinforce rather than conflict (e.g., "always run tests" + session close checklist that includes testing). Ordering matches agent processing priority -- behavior rules before reference material. Partial credit if mostly coherent but with minor inconsistencies. |

### Memory & Learning (10 points)

| Check | Points | What to Look For |
|-------|--------|------------------|
| **Learnings directory** | 5 | References `.claude/learnings/` or similar for captured debugging narratives. Cross-session memory is undiscoverable -- agents start fresh each session. |
| **Capture learning trigger** | 5 | Instruction to invoke learning capture after non-trivial debugging. Prevents repeated debugging loops across sessions. |

### Advanced (16 points)

| Check | Points | What to Look For |
|-------|--------|------------------|
| **Frontend/UI guidelines** | 3 | Design taste rules, component library specified, "avoid AI slop" equivalent |
| **Security guidelines** | 4 | Input validation, auth patterns, secrets handling, security review process |
| **Parallel workflows** | 4 | Worktree instructions, multi-session patterns, copy-paste launch blocks |
| **MCP/tool configuration** | 5 | Which MCPs/tools are configured, what each is used for, any non-standard tool preferences. Research shows 50x adoption rate for documented tools. |

## Scoring Tiers

| Score | Tier | Assessment |
|-------|------|------------|
| 0-21 | Bare Minimum | AI is flying blind. Will generate generic code that doesn't match your project. |
| 22-43 | Functional | Covers basics but AI will still produce inconsistent code and miss conventions. |
| 44-64 | Strong | AI produces code matching project conventions. Most common issues prevented. |
| 65-80 | Advanced | Full behavior configuration. AI works like a disciplined team member. |
| 81-96 | Elite | Institutional memory, parallel workflows, continuous learning. The AI gets better over time. |

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
- Documents DEVIATIONS from framework defaults (not standard config)
- Non-standard tools explicitly called out with usage instructions
- No contradictions between sections (coherent directives)
- Consistent phrasing style across directives (all structured, not mix of prose and tables)

### Red Flags
- Over 300 lines with no linked files (context window hog -- adds 14-22% inference cost)
- Restates information available in package.json, README, or tsconfig (redundancy penalty)
- No testing section at all
- Generic descriptions ("we use React") without explaining what's non-standard
- No behavior directives (AI has no working-style guidance)
- Contradictory sections (e.g., "always commit" in one place, "never auto-commit" in another)
- No commands section (AI can't run your project)
- Copy-pasted from a template without customization (generic headings with no content)
- LLM-generated content that reads like an `/init` dump (usually net negative per research)

### Partial Credit Signals
- Has a section but it's vague ("follow best practices")
- Lists technologies but doesn't explain what's non-standard about the setup
- Has commands but they're incomplete (dev server but no test command)
- Mentions testing but no framework or coverage expectations

## Research Basis

This rubric is informed by "Evaluating AGENTS.md: Are Repository-Level Context Files Helpful for Coding Agents?" (Gloaguen et al., ETH Zurich, ICML 2026). Key findings:

1. **LLM-generated context files reduce task success by ~3%** and increase cost by 20%+
2. **Human-written context files provide marginal ~4% improvement** at 19% cost increase
3. **Non-standard tools documented in context files are used 50x more frequently** than undocumented ones
4. **Context files do NOT function as repository overviews** -- agents navigate codebases independently
5. **When existing docs are stripped, context files become helpful** -- proving they're redundant with README/docs

**Implication:** Context files should document what agents CANNOT discover (behavioral constraints, non-standard tools, footguns) rather than what they CAN discover (tech stack, project structure, standard config).

**Limitations:** Study was Python-only, measured only task resolution rate (not code quality/style/security), no statistical significance testing. Findings are directionally strong but should not be treated as definitive for all contexts.
