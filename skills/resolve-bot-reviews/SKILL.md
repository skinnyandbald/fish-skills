---
name: resolve-bot-reviews
description: "Triage, fix, and resolve bot code review comments (CodeRabbit, Gemini Code Assist) on PRs. Use when asked to resolve bot reviews, given a PR URL, or on '/resolve-bot-reviews'."
argument-hint: "<PR URL> [--auto]"
---

# Resolve Bot Reviews

Fetch bot review comments from a PR, triage by severity, fix source files, commit, push, and resolve threads -- all in one workflow.

## Invocation

```
/resolve-bot-reviews <PR URL>
/resolve-bot-reviews <PR URL> --auto    # skip triage confirmation
```

## Quick Reference

| Phase | Action |
|-------|--------|
| 1. Fetch | Pull review threads via GraphQL, filter to bot authors |
| 2. Triage | Present severity table, confirm with user (unless `--auto`) |
| 3. Fix | Apply bounded fixes to source files, never build outputs |
| 3.5. Commit + Push | Stage, commit, push -- must succeed before resolving |
| 4. Resolve | Resolve each thread via GraphQL mutation, report totals |

---

## Phase 1: Fetch and Categorize

### 1a. Parse the PR URL

Extract `owner`, `repo`, and `pr` number from the URL:
```
https://github.com/{owner}/{repo}/pull/{pr}
```

### 1b. Fetch review threads via GraphQL

Use `gh api graphql` to fetch all review threads in a single call:

```bash
gh api graphql -f query='
  query($owner: String!, $repo: String!, $pr: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        reviewThreads(first: 100) {
          nodes {
            id
            isResolved
            comments(first: 5) {
              nodes {
                author { login }
                body
                path
                line
              }
            }
          }
        }
      }
    }
  }
' -F owner="$OWNER" -F repo="$REPO" -F pr=$PR_NUM
```

### 1c. Filter to bot authors

Only process threads where the first comment's author is one of:
- `coderabbitai[bot]`
- `gemini-code-assist[bot]`

Discard all other threads.

### 1d. Categorize each thread

For each bot thread, extract:

| Field | Source |
|-------|--------|
| **Severity** | Parse from bot markup (see Severity Parsing below) |
| **File** | `path` field from the comment |
| **Line** | `line` field from the comment |
| **Type** | Classify as one of: `banned-word`, `em-dash`, `pattern-violation`, `security`, `logic-bug`, `doc-mismatch`, `structural` |
| **Source or build output** | Detect if file is in a build output directory (e.g., `training-playbook-builds/`) |

---

## Phase 2: Triage

Present a table to the user:

```
| # | Severity | File | Issue | Action |
|---|----------|------|-------|--------|
| 1 | Major | package-age-guard.cjs:69 | NPM regex allows dot at start | FIX |
| 2 | Minor | HANDOFF.md:22 | Obsidian image embed | SKIP |
| 3 | Major | claude.yml:28 | No actor gating | FIX |
```

### Skip Rules (hardcoded, training-pack PRs only)

These patterns are always SKIP, no confirmation needed:
- **HANDOFF.md Obsidian image embed** comments
- **PAT-in-URL clone command** comments
- **Shell quoting edge cases in hooks** comments
- **"This is a training template"** comments about branch protection

### Default action assignment

| Severity | Default Action |
|----------|---------------|
| Critical | FIX |
| Major | FIX |
| Minor | FIX (unless matches a skip rule) |
| Unspecified | Requires manual triage before marking FIX or SKIP |

### Confirmation

- If `--auto` flag is set: proceed immediately without asking
- Otherwise: present the triage table and ask the user to confirm or adjust actions before proceeding

---

## Phase 3: Fix

For each comment marked **FIX**, apply the appropriate fix strategy.

### 3a. Trace to source file

**CRITICAL: Never edit build output files directly.** If the target file is in a build output directory, trace to the source file first.

See the **Source File Tracing** section below for the full lookup procedure.

### 3b. Read the source file

Read the file identified in 3a. If no source could be determined, skip the comment and flag it in the report.

### 3c. Apply fix by comment type

Each type has a bounded strategy:

| Type | Strategy |
|------|----------|
| **banned-word** | Deterministic find-and-replace using the style guide's banned word list |
| **em-dash** | Replace lazy connectors with period, comma, colon, or semicolon; enforce em-dash count limits per section |
| **pattern-violation** | Rewrite the flagged pattern, preserving meaning |
| **doc-mismatch** | Update the doc to match the code (or vice versa, based on which is authoritative) |
| **security** | Apply the bot's suggested fix if one is provided; otherwise present to user for decision |
| **logic-bug** | Present to user for confirmation before applying any change |
| **structural** | Present to user for confirmation before applying any change |

### 3d. Rules

- Never edit build output files -- all fixes go to source files
- For `security` and `logic-bug` and `structural` types without a clear automated fix, present to the user and wait for confirmation
- If a test suite exists for hook files, run tests after fixing

---

## Phase 3.5: Commit and Push

After all fixes are applied:

1. **Stage** all changed source files:
   ```bash
   git add <list of changed source files>
   ```

2. **Commit** with a descriptive message:
   ```bash
   git commit -m "fix: resolve bot review feedback on PR #$PR_NUM"
   ```

3. **Push** to the PR branch:
   ```bash
   git push
   ```

4. **Confirm push succeeded** before proceeding to Phase 4. If push fails, stop and report the error -- do NOT resolve threads without a successful push.

---

## Phase 4: Resolve Threads

For each thread that was fixed or skipped (with a skip rule), resolve it using the thread ID captured in Phase 1.

### 4a. Resolve each thread

```bash
gh api graphql -f query='
  mutation($threadId: ID!) {
    resolveReviewThread(input: {threadId: $threadId}) {
      thread { id isResolved }
    }
  }
' -f threadId="$THREAD_ID"
```

### 4b. Verify resolution

After resolving all threads, run an independent count check:

```bash
UNRESOLVED=$(gh api graphql -f query='
  query($owner: String!, $repo: String!, $pr: Int!) {
    repository(owner: $owner, name: $repo) {
      pullRequest(number: $pr) {
        unresolvedThreads: reviewThreads(first: 1, filterBy: {resolved: false}) { totalCount }
      }
    }
  }
' -F owner="$OWNER" -F repo="$REPO" -F pr=$PR_NUM \
  --jq '.data.repository.pullRequest.unresolvedThreads.totalCount')

echo "Unresolved threads remaining: $UNRESOLVED"
```

If `UNRESOLVED > 0`, retry resolution for any remaining threads. If threads persist after two attempts, list the thread IDs in the report.

### 4c. Report

Print a summary:
```
Resolved: 18/20 threads
Skipped: 2 (HANDOFF.md image, PAT-in-URL)
```

---

## Severity Parsing

Parse severity from bot comment markup using these rules:

### CodeRabbit

| Markup | Severity |
|--------|----------|
| `Critical` or `_Critical_` (with red circle emoji) | Critical |
| `Major` or `_Major_` (with orange circle emoji) | Major |
| `Minor` or `_Minor_` (with yellow circle emoji) | Minor |
| `[nitpick]` anywhere in comment | Minor |

### Gemini Code Assist

| Markup | Severity |
|--------|----------|
| `![high](` (prefix match -- badge URL follows) | Critical |
| `![medium](` | Major |
| `![low](` | Minor |

### Fallback

If no severity marker is found, classify as **Unspecified**. Unspecified threads require manual triage before being marked FIX or SKIP.

---

## Source File Tracing

Tracing is deterministic. Do not use wildcard-to-wildcard guesses.

### Precedence -- apply rules in this order:

1. **Asset files** matching `assets/R*.md` (or built equivalents in `week1/`, `week2/`) -- use R-number frontmatter lookup
2. **Non-asset files** -- use exact path mapping table
3. **Files directly under `training-playbook/training-pack/`** -- direct source, no tracing needed

### For asset files (`.md` files in `week1/`, `week2/`, or `assets/`):

1. Read the build output file's content
2. Extract the R-number from the frontmatter `id:` field (e.g., `id: R22`)
3. Glob for the source file at `training-pack/assets/R{number}-*.md`
4. That match is the authoritative source -- edit it, not the build output

### For non-asset files, use exact path mapping:

| Build output path | Source path |
|---|---|
| `training-playbook-builds/{client}/.claude/hooks/*` | `training-pack/base-claude/hooks/*` (check for client override at `training-pack/client-overlays/{client}/.claude/hooks/*` first) |
| `training-playbook-builds/{client}/.claude/settings.json` | `training-pack/base-claude/settings.json` (check for client override at `training-pack/client-overlays/{client}/.claude/settings.json` first) |
| `training-playbook-builds/{client}/workflow-templates/*` | `training-pack/assets/workflow-templates/*` (exact filename match) |
| `training-playbook/training-pack/*` | Direct source -- no tracing needed |

### Client override precedence

For hook and settings files, always check for a client-specific override first:
1. Check `training-pack/client-overlays/{client}/.claude/hooks/{filename}` -- if exists, edit this
2. Fall back to `training-pack/base-claude/hooks/{filename}`

---

## Constraints

- **Training-pack scoped.** The fetch/categorize/resolve flow is reusable, but skip rules and source-tracing logic are specific to the training-pack build system.
- **Never edit build output files.** All fixes go to source files only.
- **Push before resolve.** Phase 3.5 (commit + push) must complete successfully before Phase 4 (resolve threads) begins.
- **Run tests after hook fixes.** If a test suite exists for hook files, run it after applying fixes to hooks.
- **Unspecified severity requires manual triage.** Never auto-FIX a thread with no parseable severity marker.
