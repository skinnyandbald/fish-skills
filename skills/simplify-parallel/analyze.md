# Analysis Instructions

This document explains how to analyze a codebase for parallel simplification.

## Analysis Script

Located at: `scripts/analyze-codebase.ts`

### Running the Analysis

```bash
npx tsx scripts/analyze-codebase.ts                              # Basic (JSON to stdout)
npx tsx scripts/analyze-codebase.ts --verbose                    # With summary
npx tsx scripts/analyze-codebase.ts --output=analysis.json       # Save to file
npx tsx scripts/analyze-codebase.ts --focus=lib --verbose        # Focus on area
npx tsx scripts/analyze-codebase.ts --max-files=15 --verbose     # Custom segment size
```

### Options

| Option | Description | Default |
|--------|-------------|---------|
| `--output=PATH` | Save JSON analysis to file | stdout |
| `--focus=AREA` | Limit to area (api, lib, components, hooks, pages) | all |
| `--max-files=N` | Maximum files per segment | 20 |
| `--verbose` or `-v` | Show detailed progress and summary | false |

## How Segmentation Works

### 1. Natural Boundaries

```
src/
├── app/api/     -> Segments: api-auth, api-creator, api-webhooks, etc.
├── lib/         -> Segments: lib, lib-email, lib-analytics, etc.
├── components/  -> Segments: components, components-ui
└── hooks/       -> Segment: hooks
```

### 2. Dependency Analysis

Tracks `@/` alias imports and relative imports. Ignores external packages.

### 3. Segment Formation

1. Group files by area
2. Split large areas into sub-segments by subdirectory
3. Build dependency graph between segments
4. Calculate priority (fewer dependencies = higher priority)

### 4. Parallel Group Formation

1. Topologically sort segments
2. Form groups where all dependencies are satisfied
3. Segments in same group run concurrently

## Area Classification

| Path Pattern | Area |
|--------------|------|
| `src/app/api/{subdir}/` | `api-{subdir}` |
| `src/lib/{subdir}/` | `lib-{subdir}` |
| `src/components/ui/` | `components-ui` |
| `src/components/` | `components` |
| `src/hooks/` | `hooks` |
| `src/config/` | `config` |
| `src/types/` | `types` |

## Troubleshooting

- **"Found 0 files"**: Check you're in the correct directory with `src/`
- **"Too many segments"**: Increase `--max-files=30`
- **"Segments too large"**: Decrease `--max-files=10`
- **"Circular dependency"**: Handled by processing those segments sequentially
