---
name: analyze-plan-feedback
description: Analyze and prioritize peer review feedback from multiple AI reviewers on a plan
arguments:
  - name: plan-path
    description: "Path to the plan file (optional — auto-detects from context if omitted)"
    required: false
  - name: num-reviewers
    description: "Number of reviewers to collect feedback from (default: 3)"
    required: false
---

# Feedback Analysis & Prioritization

## Step 1: Parse arguments

$ARGUMENTS

Parse `$ARGUMENTS` for:
- **Plan path** (optional): The first argument that looks like a file path. Resolve to absolute and read it.
- **Reviewer count** (optional): A number (1-10). Defaults to **3** if not provided.

**If no plan path is provided**, auto-detect candidates and present an interactive selection:

1. **Detect candidates** (run these in parallel):
   - Check if a plan file was recently created, read, or discussed in this session
   - Check `git diff --name-only` and `git log --oneline -5 --diff-filter=AM -- 'docs/plans/**/*.md'` for recently added/modified plans
   - Look for plan files/directories matching `docs/plans/**/*.md`

2. **ALWAYS present an `AskUserQuestion` multiple-choice UI** with up to 4 detected candidates. Never just ask a text question — always use the interactive chip UI. Example:
   ```
   AskUserQuestion(questions: [{
     question: "Which plan should I collect feedback for?",
     header: "Plan",
     options: [
       { label: "phase-15-transcript-import/", description: "Modified 2 mins ago — 8 files" },
       { label: "phase-14-streaming.md", description: "Modified 3 days ago" }
     ],
     multiSelect: false
   }])
   ```
   The user can always select "Other" (built into AskUserQuestion) to type a custom path.

3. If zero candidates are found, still use `AskUserQuestion` with helpful options:
   ```
   options: [
     { label: "docs/plans/", description: "Browse the plans directory" },
     { label: "Browse recent files", description: "Show recently modified .md files" }
   ]
   ```

Examples:
- `/analyze-plan-feedback docs/plans/my-plan.md` → 3 reviewers
- `/analyze-plan-feedback docs/plans/my-plan.md 2` → 2 reviewers
- `/analyze-plan-feedback 2` → auto-detect plan, 2 reviewers
- `/analyze-plan-feedback` → auto-detect plan, 3 reviewers

## Step 2: Collect feedback interactively

Ask the user to paste feedback **one reviewer at a time**, up to the reviewer count. After each paste, confirm receipt and ask for the next.

For each reviewer (1 through N):
- Ask: "Paste **reviewer N** feedback:"
- The user may paste text directly or provide a file path — if it looks like a path, read the file.

**Do NOT proceed to analysis until all N reviewers' feedback has been collected.**

## Step 3: Analyze

Review and analyze all collected feedback against the plan:

### 1. Technical Assessment

For each piece of feedback from each reviewer:
- Is the technical point **valid and accurate**?
- Does it apply to our specific stack and codebase?
- Is it based on current best practices or outdated patterns?
- Cross-reference against codebase patterns where relevant

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
| Topic | Reviewer 1 | ... | Reviewer N | Verdict |
```

After presenting the analysis, ask if the user wants to apply any of the feedback directly to the plan.
