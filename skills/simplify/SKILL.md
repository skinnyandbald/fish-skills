---
name: simplify
description: Run code-simplifier on current branch/PR changes to show a cleaned-up version
arguments:
  - name: scope
    description: "Optional: 'branch' (default), 'staged', 'file:path/to/file', or 'all'"
    required: false
---

# Code Simplifier

Run the code-simplifier agent to clean up and refine code on this branch.

## Instructions

1. First, determine the scope of changes to simplify:

```bash
# Check if we're on a PR branch
gh pr view --json number,headRefName 2>/dev/null || echo "Not on a PR branch"

# Get the current branch
git branch --show-current

# Show files changed vs main
git diff --name-only main...HEAD 2>/dev/null || git diff --name-only origin/main...HEAD
```

2. Use the Task tool to run the code-simplifier agent:

```
Task tool with subagent_type: code-simplifier:code-simplifier
```

**Prompt for the agent based on scope:**

- If `$ARGUMENTS.scope` is empty or "branch":
  "Simplify and refine all code changes on this branch compared to main. Focus on recently modified files. Show me a cleaned-up version with explanations of what was simplified."

- If `$ARGUMENTS.scope` is "staged":
  "Simplify and refine only the staged changes. Show me a cleaned-up version."

- If `$ARGUMENTS.scope` starts with "file:":
  "Simplify and refine the specified file: [extract path]. Show me a cleaned-up version."

- If `$ARGUMENTS.scope` is "all":
  "Do a comprehensive simplification pass on recently modified code in this codebase. Show me a cleaned-up version with explanations."

3. After the agent completes, summarize:
   - What files were simplified
   - Key changes made (removed duplication, improved naming, etc.)
   - Any suggestions the agent couldn't auto-apply

## Usage Examples

```
/simplify              # Simplify branch changes vs main
/simplify staged       # Only staged changes
/simplify file:src/lib/utils.ts  # Specific file
/simplify all          # Broader pass on recent changes
```
