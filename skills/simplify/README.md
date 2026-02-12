# /simplify

Run the code-simplifier agent on your current branch to clean up and refine code.

## Usage

```
/simplify              # Simplify branch changes vs main
/simplify staged       # Only staged changes
/simplify file:src/lib/utils.ts  # Specific file
/simplify all          # Broader pass on recent changes
```

## What It Does

1. Detects which files changed on your branch (compared to main)
2. Launches the `code-simplifier` agent on those files
3. Reports what was simplified: removed duplication, improved naming, etc.

## Prerequisites

- Must be in a git repository
- Works best when on a feature branch with changes vs main

## Customization

No setup needed. The scope argument controls what gets simplified.

## See Also

- `/simplify-parallel` — For large codebases, runs multiple simplifier agents in parallel across file segments
