# Orchestrator Instructions

This document provides step-by-step instructions for orchestrating parallel codebase simplification.

## Prerequisites

Before starting orchestration:

1. **Clean git state**: No uncommitted changes
2. **Tests passing**: Run available test command from `package.json`
3. **No listeners running**: User manages external services (webhooks, etc.)

## Orchestration Workflow

### Step 1: Parse Options and Initialize

Parse user-provided options from the command invocation:

```typescript
// Default options
const options = {
  dryRun: false,      // --dry-run flag
  focus: undefined,   // --focus=AREA
  maxSegments: 3,     // --segments=N
  maxFiles: 20,       // --max-files=N
  verbose: false,     // --verbose flag
};
```

### Step 2: Run Codebase Analysis

If project has `scripts/analyze-codebase.ts`:
```bash
npx tsx scripts/analyze-codebase.ts --verbose --max-files=${maxFiles} ${focus ? `--focus=${focus}` : ''}
```

Otherwise, build segment map manually using glob/grep (see `analyze.md`).

### Step 3: Create Progress Tracking

Initialize TodoWrite with all segments.

### Step 4: Process Parallel Groups

For each parallel group:

#### 4.1 Dispatch Workers

Launch Task agents for all segments in the current group simultaneously:

```typescript
// IMPORTANT: All tasks in a group must be dispatched in a SINGLE message
// with multiple Task tool calls to achieve true parallelism

Task({
  subagent_type: "code-simplifier:code-simplifier",
  description: `Simplify ${segment.name}`,
  prompt: buildWorkerPrompt(segment),
  run_in_background: true,
  model: "haiku"  // Use haiku for cost efficiency
})
```

#### 4.2 Worker Prompt Template

```markdown
## Code Simplification Task

You are simplifying code in segment: ${segment.name}

### Files to Modify (EXCLUSIVE LIST)

ONLY modify these files - no others:

${segment.paths.map(p => `- ${p}`).join('\n')}

### Simplification Patterns to Apply

1. **Remove Debug Logs** - Delete `console.log()`, `console.debug()` calls. Keep `console.error()` and `console.warn()`.
2. **Simplify Nested Ternaries** - Replace with helper functions or named booleans.
3. **Extract Repeated Patterns** - If same code appears 3+ times, extract to helper.
4. **Improve Naming** - Rename unclear variables to descriptive names.
5. **Split Long Functions** - Functions > 50 lines should be split.

### Constraints

- DO NOT add new dependencies
- DO NOT change public API signatures
- DO NOT modify test files
- DO NOT touch files outside your exclusive list
- Preserve all existing functionality

### CRITICAL: Preserve All Documentation

NEVER remove: docstrings (JSDoc/TSDoc), file header comments, phase markers, TODO/FIXME, business logic comments.

### Output

1. List files modified
2. List patterns applied
3. Confirm docstrings preserved (REQUIRED)
4. Note any files skipped and why
```

#### 4.3 Wait for Group Completion

Wait for all workers in the current group to complete before proceeding to next group.

#### 4.4 Verify Group Results

After each group, run quick verification:

```bash
npm run typecheck 2>/dev/null || npm run type-check 2>/dev/null || true
```

If verification fails, identify and revert the problematic segment.

### Step 5: Final Verification

After all groups complete, run full verification suite — detect and run available checks from `package.json`.

### Step 5.5: Docstring Preservation Check (CRITICAL)

Before committing, verify that docstrings and file headers were NOT removed:

```bash
# Check for removed docstrings by comparing with previous commit
git diff --stat | head -20
```

**Manual verification checklist:**
- [ ] Randomly sample 3-5 modified files
- [ ] Confirm `/** ... */` blocks above functions are preserved
- [ ] Confirm file header block comments are preserved

### Step 6: Create Consolidated Commit

```bash
git add -A
git commit -m "refactor: parallel codebase simplification

Applied simplifications across ${segments.length} segments:
- Removed debug console.log statements
- Extracted repeated patterns into helper functions
- Simplified nested ternaries
- Improved variable naming"
```

### Step 7: Generate Summary Report

Output final summary with segments processed, files modified, verification results, and commit hash.

## Dry Run Mode

When `--dry-run` is specified:
1. Run codebase analysis
2. Display segment breakdown
3. Show parallel group execution plan
4. **DO NOT** launch worker agents
5. **DO NOT** modify any files

## Error Handling

### Worker Timeout
Kill the worker, mark segment as failed, continue with other segments.

### Worker Failure
Retry up to 3 times with smaller batch (split segment in half). If still failing, mark as failed.

### Verification Failure
Identify changed files, revert specific segment if needed.

### Circular Dependencies
Merge circular segments into one and process as single unit.

## Concurrency Control

Never exceed the user-specified `--segments` limit. Workers use `model: "haiku"` for cost efficiency and run in background.
