---
name: analyze-feedback
description: Analyze and prioritize peer review feedback from multiple AI reviewers on a plan
argument-hint: "[path/to/plan.md] [path/to/feedback1] [path/to/feedback2] [path/to/feedback3]"
---

# Feedback Analysis & Prioritization

## Input

$ARGUMENTS

## Resolve inputs

Parse the arguments:
- **First argument**: Path to the original plan file (required). Read it now.
- **Remaining arguments**: Paths to feedback files OR pasted feedback blocks. Read any file paths now.

If no arguments were provided, ask the user:
1. Which plan was reviewed?
2. Paste or provide paths to the feedback from each reviewer.

If only the plan path was provided, ask the user to paste the feedback directly. Accept 1-3 feedback sources.

## Task

Review and analyze the following feedback about the plan. Provide a structured assessment:

### 1. Technical Assessment

For each piece of feedback from each reviewer:
- Is the technical point **valid and accurate**?
- Does it apply to our specific stack (Next.js 16, tRPC 11, Supabase, Zod 4)?
- Is it based on current best practices or outdated patterns?
- Cross-reference against our codebase patterns where relevant

### 2. Priority Classification

Categorize every distinct feedback point:

| Priority | Criteria |
|----------|----------|
| **Critical** | Blocks shipping. Security vulnerabilities, data loss risk, broken functionality |
| **High** | Should fix before merge. Performance issues, missing error handling, test gaps |
| **Medium** | Fix soon. Code quality, naming, documentation, minor UX issues |
| **Low** | Nice-to-have. Style preferences, theoretical improvements, future considerations |

### 3. Conflict Resolution

Where reviewers disagree:
- State each position clearly
- Evaluate which is more applicable to our context
- Make a recommendation with reasoning

### 4. Action Items

Create a numbered list of specific, actionable tasks:
- Each task references the feedback source(s)
- Each task has a clear definition of done
- Group by the plan section they affect

### 5. Implementation Timeline

For each action item, estimate:
- **Effort**: 1 (trivial) to 5 (significant rework)
- **Risk of skipping**: What happens if we don't do this?
- **Dependencies**: Does this block or depend on other items?

## Output Format

```markdown
## Feedback Summary

### Critical (must address)
- [ ] Item with effort estimate and source

### High Priority
- [ ] Item with effort estimate and source

### Medium Priority
- [ ] Item with effort estimate and source

### Low Priority / Deferred
- [ ] Item with effort estimate and source

## Recommended Next Steps (in order)
1. First thing to do
2. Second thing to do
...

## Reviewer Agreement Matrix
| Topic | Gemini | Opus | ChatGPT | Verdict |
```

After presenting the analysis, ask if the user wants to apply any of the feedback directly to the plan.
