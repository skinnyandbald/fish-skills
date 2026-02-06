---
name: simplify-parallel
description: Run code simplification across entire codebase using parallel agents with automatic segmentation and coordination
---

# Parallel Codebase Simplification

Execute code simplification across a large codebase by automatically segmenting it into logical chunks and processing them concurrently with proper dependency ordering.

## Quick Reference

| Command | Description |
|---------|-------------|
| `/simplify-parallel` | Analyze and simplify entire codebase |
| `/simplify-parallel --dry-run` | Analyze only, show plan without executing |
| `/simplify-parallel --focus=lib` | Limit to specific area |
| `/simplify-parallel --segments=4` | Set max parallel agents |

## Usage

```
/simplify-parallel [options]
```

### Options

| Option | Default | Description |
|--------|---------|-------------|
| `--dry-run` | false | Analyze only, don't modify files |
| `--focus=AREA` | all | Limit to area: `api`, `lib`, `components`, `hooks`, `pages` |
| `--segments=N` | 3 | Maximum parallel agents |
| `--max-files=N` | 20 | Max files per segment |
| `--verbose` | false | Show detailed progress |

## How It Works

### Phase 1: Codebase Analysis

The orchestrator analyzes the codebase structure:

```
1. Directory Tree Scan     → Identify top-level modules
2. File Metrics Collection → Count files, LOC, complexity per directory
3. Dependency Graph        → Parse imports to build file→file dependency map
4. Cluster Formation       → Group tightly-coupled files into processing units
```

**Analysis approach:** If the project has a `scripts/analyze-codebase.ts` (or similar), use it. Otherwise, use `find` + `wc -l` + import parsing via grep/glob to build the segment map manually.

**Note:** Automatically excludes `.github/worktrees/` directories to avoid analyzing code in other worktrees.

### Phase 2: Segment Formation

Files are grouped into segments based on:
- **Natural boundaries**: Directory structure (e.g., `src/app/api/`, `src/lib/`, `src/components/`)
- **Dependency coupling**: Files that import each other stay together
- **Size limits**: Target 10-25 files per segment

### Phase 3: Parallel Execution

```
┌──────────────────────────────────────────────┐
│           Orchestrator (Main Agent)           │
│  - Creates segment queue                      │
│  - Dispatches parallel workers                │
│  - Tracks progress                            │
│  - Consolidates results                       │
└──────────────────────────────────────────────┘
         │                │                │
         ▼                ▼                ▼
┌──────────────┐ ┌──────────────┐ ┌──────────────┐
│ Worker Agent │ │ Worker Agent │ │ Worker Agent │
│ (Segment A)  │ │ (Segment B)  │ │ (Segment C)  │
└──────────────┘ └──────────────┘ └──────────────┘
```

### Phase 4: Verification & Consolidation

After all segments complete, detect and run available checks from `package.json`:

```bash
# Run whichever checks exist in the project
npm run typecheck 2>/dev/null || npm run type-check 2>/dev/null || true
npm run lint 2>/dev/null || true
npm run test 2>/dev/null || npm run test:unit 2>/dev/null || true
npm run build 2>/dev/null || true
```

When running tests, use `--exclude='.github/worktrees/**'` to skip worktree test files.

## Workflow Steps

### Step 1: Analyze Codebase

Determine available analysis approach:
- If `scripts/analyze-codebase.ts` exists: `npx tsx scripts/analyze-codebase.ts --verbose`
- Otherwise: Use glob/grep to scan directories, count files, parse imports

### Step 2: Review Parallel Groups

The analysis output shows which segments can run concurrently:

```
Parallel Groups:
  Group 1 (foundation): lib, components-ui, config
  Group 2 (independent): api-auth, api-webhooks, hooks
  Group 3 (depends on lib): api-creator, api-subscription
  Group 4 (depends on components): pages, creator-pages
```

**Key principle**: Groups are processed sequentially, but segments within a group run in parallel.

### Step 3: Execute Simplification

For each parallel group:

1. **Launch worker agents** using the Task tool with `code-simplifier:code-simplifier`
2. **Each worker receives** an exclusive list of files to modify
3. **Workers run simultaneously** with no overlap
4. **Wait for all workers** before proceeding to next group

### Step 4: Verify & Commit

After all groups complete, run available project checks and create commit.

## Simplification Patterns Applied

Workers apply these transformations:

| Pattern | Before | After |
|---------|--------|-------|
| Nested ternaries | `a ? b ? c : d : e` | Helper function |
| Debug logs | `console.log('debug')` | Removed |
| Repeated patterns | Same code 3+ times | Extracted function |
| Complex conditions | `if (a && b \|\| c && d)` | Named boolean |
| Long functions | 100+ lines | Split into smaller functions |

## IMPORTANT: What NOT to Change

Workers must preserve:

| Preserve | Reason |
|----------|--------|
| **Docstrings (JSDoc/TSDoc)** | `/** ... */` comments above functions, classes, interfaces are MANDATORY to preserve |
| **Component/file header comments** | Block comments at the top of files explaining purpose are MANDATORY to preserve |
| **Helpful comments** | Comments explaining "why" (not "what") are valuable documentation |
| **Explicit intent patterns** | Code like `if (x) { return x; } return undefined;` shows explicit intent |
| **Error handling structure** | Don't collapse try/catch blocks that handle different error types |
| **Business logic comments** | Comments explaining business rules, edge cases, or workarounds |
| **TODO/FIXME comments** | These track technical debt and should not be removed |
| **Manual test output** | `console.log` in `*.integration.ts` or manual test files is intentional |

**CRITICAL - Docstrings are OFF LIMITS:**
- NEVER remove `/** ... */` style comments (JSDoc/TSDoc)
- NEVER remove phase/section markers
- NEVER remove comments that describe what a function/component does
- NEVER remove `@param`, `@returns`, `@example` documentation

**Rule of thumb**: If removing a comment or simplification changes the clarity of *intent*, don't do it.

## Conflict Prevention

| Strategy | Implementation |
|----------|---------------|
| **File Ownership** | Each segment has exclusive file list - no overlaps |
| **Dependency Order** | Foundation modules processed before dependents |
| **Sequential Groups** | Groups run one at a time, segments within parallel |
| **Verification Gates** | Type-check between groups catches issues early |

## Integration with git-worktree (Optional)

For maximum isolation, create worktrees per parallel group:

```bash
bash ~/.claude/skills/git-worktree/scripts/worktree-manager.sh create simplify-group-1
bash ~/.claude/skills/git-worktree/scripts/worktree-manager.sh create simplify-group-2
```

## Troubleshooting

### "Circular dependency detected"
The analysis may detect circular imports. These segments are processed sequentially instead of in parallel.

### "Worker timed out"
Increase timeout or reduce `--max-files` to create smaller segments:
```
/simplify-parallel --max-files=10
```

### "Type check failed after group N"
The verification gate caught an issue. Review the specific files modified in that group and fix manually.

### "Too many segments"
Use `--focus` to limit scope:
```
/simplify-parallel --focus=lib
```
