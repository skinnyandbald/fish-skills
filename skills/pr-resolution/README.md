# /pr-resolution

Resolve all PR review comments in parallel — fetch, classify, fix, verify, and resolve GitHub threads.

## Usage

```
/pr-resolution
/pr-resolution 42
/pr-resolution https://github.com/org/repo/pull/42
```

## What It Does

```
Phase 0: Pre-Flight     → Optional GoodToGo status check
Phase 1: Discovery      → Fetch comments, parse bot formats (CodeRabbit, etc.)
Phase 2: Classification → Categorize by priority, group by file
Phase 3: Resolution     → Launch parallel agents (one per file group)
Phase 4: Verification   → Local checks + optional GoodToGo gate
Phase 5: Completion     → Commit, push, resolve all GitHub threads
```

Key behaviors:
- Comments on the **same file** go to the **same agent** (avoids conflicts)
- Comments on **different files** run in **parallel**
- CI failures get a **dedicated agent**
- Questions are **asked before fixing** (never auto-resolved)

## Prerequisites

- **GitHub CLI** (`gh`) installed and authenticated
- **Node.js** for the helper scripts in `bin/`
- Must be on a PR branch

## Setup

Install the skill's dependencies:

```bash
cd ~/.claude/skills/pr-resolution
npm install
```

### Optional: GoodToGo (`gtg`)

If you have [GoodToGo](https://github.com/goodtogo) installed, the skill uses it for pre-flight and verification gates. Without it, the skill skips those checks and runs the full workflow.

## Scripts

| Script | Purpose |
|--------|---------|
| `bin/get-pr-comments` | Fetch all PR comments |
| `bin/parse-coderabbit-review` | Parse CodeRabbit bot reviews |
| `bin/resolve-pr-thread` | Resolve a single GitHub thread |
| `bin/resolve-all-threads` | Resolve all unresolved threads on a PR |

## Customization

- `references/bot-formats.md` — Add parsing rules for other review bots
- `references/classification.md` — Adjust priority classification criteria
- `references/verification.md` — Customize local verification checks
