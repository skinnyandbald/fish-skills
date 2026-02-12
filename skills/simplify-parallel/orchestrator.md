# Orchestrator Instructions

This document provides step-by-step instructions for orchestrating parallel codebase simplification.

## Prerequisites

Before starting orchestration:

1. **Clean git state**: No uncommitted changes
2. **Tests passing**: `npm run test:run` should pass
3. **No listeners running**: User manages `stripe listen`, QStash, etc.

## Orchestration Workflow

### Step 1: Parse Options and Initialize

Parse user-provided options from the command invocation:

```typescript
const options = {
  dryRun: false,
  focus: undefined,
  maxSegments: 3,
  maxFiles: 20,
  verbose: false,
};
```

### Step 2: Run Codebase Analysis

```bash
npx tsx scripts/analyze-codebase.ts --verbose --max-files=${maxFiles} ${focus ? `--focus=${focus}` : ''}
```

### Step 3: Create Progress Tracking

Initialize task tracking with all segments.

### Step 4: Process Parallel Groups

For each parallel group:

#### 4.1 Dispatch Workers

Launch Task agents for all segments in the current group simultaneously.

#### 4.2 Worker Prompt Template

```markdown
## Code Simplification Task

You are simplifying code in segment: ${segment.name}

### Files to Modify (EXCLUSIVE LIST)

ONLY modify these files - no others:
${segment.paths.map(p => `- ${p}`).join('\n')}

### Simplification Patterns to Apply

1. **Remove Debug Logs** - Delete console.log/debug (keep console.error/warn)
2. **Simplify Nested Ternaries** - Replace with helper function
3. **Extract Repeated Patterns** - If same code appears 3+ times
4. **Improve Naming** - Rename unclear variables
5. **Split Long Functions** - Functions > 50 lines

### Constraints

- DO NOT add new dependencies
- DO NOT change public API signatures
- DO NOT modify test files
- DO NOT touch files outside your exclusive list
- Preserve all existing functionality

### CRITICAL: NEVER Remove Comments or Documentation

**READ THIS CAREFULLY - violations here negate the value of simplification.**

You must NEVER remove any of the following:

1. **Section separator comments**: `// ===== Types =====`, `// ===== Helpers =====`, etc.
2. **JSDoc/TSDoc docstrings**: `/** ... */` comments above functions, classes, interfaces
3. **File header comments**: Block comments at the top of files explaining purpose
4. **"Why" comments**: Comments explaining reasoning, not just restating code
5. **Business logic comments**: Comments explaining rules, edge cases, workarounds
6. **TODO/FIXME/NOTE comments**: Track technical debt
7. **Biome ignore directives**: `// biome-ignore ...` with their reasons
8. **Re-export annotations**: `// Re-export types for convenience`, etc.
9. **Phase/section markers**: `// Phase 14.16`, `// Step 1: ...`

**The rule**: If removing a comment changes the clarity of *intent*, don't remove it.

### CRITICAL: Manual Test Output

- NEVER remove `console.log` from files named `manual.*.ts` or `*.manual.ts`
- NEVER remove `console.log` from `*.integration.ts` files
- Only remove console.log from production code paths

### Output

After completing simplifications:
1. List files modified
2. List patterns applied
3. **Confirm no comments were removed** (REQUIRED)
4. Note any files skipped and why
```

#### 4.3 Wait for Group Completion

Wait for all workers in the current group to complete.

#### 4.4 Verify Group Results

After each group, run quick verification:

```bash
npm run typecheck
```

### Step 5: Final Verification

```bash
npm run typecheck
npm run lint
npm run test:run
npm run build
```

### Step 5.5: Comment Preservation Check (MANDATORY)

```bash
# Check for removed comments
git diff HEAD -- '*.ts' '*.tsx' | grep -E '^\-\s*//' | grep -v '^\-\s*//\s*$'
```

If any comments were removed, restore them before committing.

### Step 6: Create Consolidated Commit

```bash
git add -A
git commit -m "refactor: parallel codebase simplification"
```

### Step 7: Generate Summary Report

Output final summary with segments processed, files modified, patterns applied.

## Error Handling

### Worker Timeout
Kill after 5 minutes, mark as failed, continue with other segments.

### Worker Failure
Retry up to 3 times with smaller batch (split segment in half).

### Verification Failure
Identify changed files, revert specific segment if needed.

### Circular Dependencies
Merge those segments into one, process as single unit.
