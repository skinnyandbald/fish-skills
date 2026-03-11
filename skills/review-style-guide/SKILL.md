---
name: review-style-guide
description: "Review code changes against STYLE_GUIDE.md before committing or creating PRs. Catches naming violations, import ordering issues, anti-pattern reintroduction, and convention drift. Run after /setup-ai or /generate-comprehensive-style-guide has created a style guide."
disable-model-invocation: true
allowed-tools: Bash, Read, Grep, Glob
---

# Style Guide Review

Review the current code changes against this project's coding style guide and conventions.

## Process

### Step 1: Load the Style Guide

Look for the style guide in this order:
1. `STYLE_GUIDE.md` in the project root
2. `.claude/style-guide.md`
3. The "Conventions" section of `CLAUDE.md` or `AGENTS.md`

If none exist, stop and tell the user:
> No style guide found. Run `/setup-ai` to generate one, or `/generate-comprehensive-style-guide` for a deeper analysis.

### Step 2: Get the Changes

Determine what to review:

1. If `$ARGUMENTS` is provided, treat it as the base to diff against:
   - `/review-style main` → `git diff main...HEAD`
   - `/review-style HEAD~3` → `git diff HEAD~3`
2. If no arguments:
   - Check `git diff --cached` — staged changes (preferred, about to be committed)
   - If nothing staged, check `git diff` — unstaged changes
   - If nothing modified, check `git diff HEAD~1` — last commit

If there are no changes anywhere, tell the user: "No changes to review."

### Step 3: Review Each Changed File

For every file in the diff, check against the style guide:

**Naming:**
- Do new variables, functions, and classes follow the naming conventions?
- Do new files follow the file naming pattern?
- Do database columns/tables follow the naming pattern?

**Code Organization:**
- Are imports ordered correctly per the style guide?
- Does the file follow the standard internal structure (imports → types → logic → exports)?
- Are new files in the right directory?

**Patterns:**
- Does error handling follow the project's documented pattern?
- Are new tests structured like existing tests (same framework, same describe/it pattern)?
- Do new API endpoints follow the established conventions?
- Do new components follow the component pattern (if frontend)?

**Anti-Patterns:**
- Does the new code use any patterns listed under "Anti-Patterns — Do NOT Replicate"?
- Does it introduce deprecated approaches the team is moving away from?

### Step 4: Report Findings

For each issue, use this format:

```
🔴 MUST FIX — [file]:[line]
   [Description of the violation]
   Style guide says: [quote or paraphrase the relevant rule]
   Code does: [what the code actually does]
   Suggested fix: [specific change to make]

🟡 SHOULD FIX — [file]:[line]
   [Description]
   Style guide says: [rule]
   Code does: [actual]
   Suggested fix: [change]

🟢 CONSIDER — [file]:[line]
   [Description and reasoning]
```

**Severity definitions:**
- 🔴 **Must fix:** Clearly violates a documented convention in the style guide
- 🟡 **Should fix:** Deviates from common patterns in the codebase but not explicitly documented as a rule
- 🟢 **Consider:** Stylistic choice worth noting — could go either way

### Step 5: Summary

End with:

```
## Review Summary
- Files reviewed: [count]
- Issues found: [count] 🔴 / [count] 🟡 / [count] 🟢
- Verdict: [PASS — code matches project conventions / NEEDS CHANGES — see issues above]
```

## Rules

- **Only flag actual deviations.** Don't impose personal preferences that aren't in the style guide.
- **Be specific.** "Line 42 uses camelCase but style guide specifies snake_case for function names" — not "naming is inconsistent."
- **Cite the style guide rule.** Every 🔴 and 🟡 must reference which section of the style guide is being violated.
- **If the style guide is ambiguous**, mark as 🟢 CONSIDER, never 🔴 MUST FIX.
- **If the code is clean**, say so: "No style guide violations found. Code matches project conventions."
- **Don't review generated files** (lock files, build output, auto-generated types). Focus on human-authored source code.
