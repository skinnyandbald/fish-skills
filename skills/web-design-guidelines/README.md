# /web-design-guidelines

Review UI code for compliance with [Vercel's Web Interface Guidelines](https://github.com/vercel-labs/web-interface-guidelines).

## Usage

```
/web-design-guidelines src/components/Button.tsx
/web-design-guidelines src/app/**/*.tsx
/web-design-guidelines
```

If no files are specified, you'll be asked which files to review.

## What It Does

1. Fetches the latest guidelines from the source repo (always up-to-date)
2. Reads the specified files
3. Checks against all rules in the guidelines
4. Outputs findings in `file:line` format

## Prerequisites

- None. The skill fetches guidelines via URL at runtime.

## Customization

No setup needed. The guidelines source URL is defined in the SKILL.md if you want to point it at a fork or local copy.
