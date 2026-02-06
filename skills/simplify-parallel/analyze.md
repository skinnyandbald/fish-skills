# Analysis Instructions

This document explains how to analyze a codebase for parallel simplification.

## Analysis Approach

### If project has `scripts/analyze-codebase.ts`

```bash
# Basic analysis (outputs JSON to stdout)
npx tsx scripts/analyze-codebase.ts

# Verbose analysis with summary
npx tsx scripts/analyze-codebase.ts --verbose

# Save analysis to file
npx tsx scripts/analyze-codebase.ts --output=analysis.json

# Focus on specific area
npx tsx scripts/analyze-codebase.ts --focus=lib --verbose

# Custom segment size
npx tsx scripts/analyze-codebase.ts --max-files=15 --verbose
```

### If no analysis script exists

Build the analysis manually:

1. **Scan directories** using glob to find all TypeScript/JavaScript files
2. **Count files and lines** per directory
3. **Parse imports** to build dependency graph
4. **Form segments** based on directory boundaries

```bash
# Find all source files (adjust patterns for project)
find src -name '*.ts' -o -name '*.tsx' | grep -v node_modules | grep -v '.test.' | grep -v '.spec.'

# Count lines per directory
find src -name '*.ts' -o -name '*.tsx' | xargs wc -l | sort -rn
```

## Understanding the Output

### Analysis JSON Structure

```typescript
interface CodebaseAnalysis {
  timestamp: string;        // When analysis was run
  rootDir: string;          // Project root directory
  totalFiles: number;       // Total TypeScript files found
  totalLines: number;       // Total lines of code
  segments: CodebaseSegment[];
  dependencyOrder: string[]; // Topologically sorted segment IDs
  parallelGroups: string[][]; // Groups for concurrent execution
}
```

### Segment Structure

```typescript
interface CodebaseSegment {
  id: string;           // Unique identifier (e.g., "lib-email-1")
  name: string;         // Human-readable name (e.g., "Lib Email 1")
  paths: string[];      // File paths in this segment
  fileCount: number;    // Number of files
  totalLines: number;   // Total lines of code
  dependencies: string[]; // Other segment IDs this depends on
  dependents: string[]; // Segments that depend on this
  priority: number;     // Lower = process first
  area: string;         // Area category (api, lib, components, etc.)
}
```

## How Segmentation Works

### 1. Natural Boundaries

Recognize directory structures as natural segment boundaries. Common patterns:

```
src/
├── app/
│   ├── api/              → Segments: api-auth, api-creator, etc.
│   └── (pages)/          → Segment: pages
├── lib/                  → Segments: lib, lib-email, lib-analytics, etc.
├── components/           → Segments: components, components-ui
│   └── ui/
└── hooks/                → Segment: hooks
```

### 2. Dependency Analysis

Track imports between files:

```typescript
// These imports are tracked:
import { something } from "@/lib/auth";  // @/ or ~/ alias → src/
import { other } from "./utils";          // Relative import
import type { Type } from "../types";     // Type imports

// These are ignored (external packages):
import React from "react";
import { z } from "zod";
```

### 3. Segment Formation Algorithm

```
1. Group files by area (api-auth, lib, components-ui, etc.)
2. For each area:
   - If fileCount <= maxFilesPerSegment: Create single segment
   - Else: Split by subdirectory, keeping related files together
3. Build dependency graph between segments
4. Calculate priority (number of dependencies)
```

### 4. Parallel Group Formation

```
1. Topologically sort segments by dependencies
2. Form parallel groups:
   - Group = all segments whose dependencies are satisfied
   - Multiple segments in same group can run concurrently
3. Example:
   Group 1: [config, hooks, types]     ← No dependencies
   Group 2: [lib-utils, lib-email]     ← Depend on config
   Group 3: [api-auth, api-creator]    ← Depend on lib-*
   Group 4: [pages, creator-pages]     ← Depend on api-*, components
```

## Area Classification Rules

| Path Pattern | Area |
|--------------|------|
| `src/app/api/{subdir}/` | `api-{subdir}` |
| `src/app/` (non-api) | `pages` |
| `src/lib/{subdir}/` | `lib-{subdir}` |
| `src/lib/` | `lib` |
| `src/components/ui/` | `components-ui` |
| `src/components/` | `components` |
| `src/hooks/` | `hooks` |
| `src/config/` | `config` |
| `src/types/` | `types` |
| Other | `other` |

These are illustrative — adapt to the project's actual directory structure.

## Interpreting Parallel Groups

### Good Parallelization

```
Parallel Groups:
  Group 1: config, types, lib-constants      ← 3 parallel, no deps
  Group 2: lib-utils, lib-email, hooks       ← 3 parallel, deps satisfied
  Group 3: api-auth, api-creator, api-webhooks  ← 3 parallel
```

This shows good natural separation - many independent segments.

### Poor Parallelization

```
Parallel Groups:
  Group 1: lib-1
  Group 2: lib-2
  Group 3: lib-3
```

This shows high coupling - each segment depends on the previous. Accept sequential processing or refactor to reduce coupling.

## Troubleshooting

### "Found 0 files"
Check that you're in the correct directory and source files exist.

### "Too many segments"
Increase max files per segment to create fewer, larger segments.

### "Segments too large"
Decrease max files per segment to create more, smaller segments.

### "Circular dependency detected"
The analysis handles this by processing those segments sequentially. To fix permanently, refactor the circular imports.
