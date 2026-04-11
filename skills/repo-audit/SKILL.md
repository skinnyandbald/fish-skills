---
name: repo-audit
description: "Audit GitHub repo security settings, dependabot config, workflow hygiene, stale PRs/branches, and action pinning. Auto-fix drift with --fix. Use when you want to check repo health across an org or a single repo."
---

# Repo Audit

Audit GitHub repo security settings and hygiene. Detect drift, report findings, optionally auto-fix.

## Invocation

```
/repo-audit                    # audit all active repos (default org: skinnyandbald)
/repo-audit <repo>             # audit one repo (e.g. skinnyandbald/cos-bot)
/repo-audit --fix              # audit + auto-fix what's fixable
/repo-audit <org>              # audit all active repos in a specific org
/repo-audit <repo> --fix       # audit one repo + fix
```

## Workflow

### Step 0: Preflight -- Token Permission Check

Before running any checks, verify the token has sufficient permissions:

```bash
# Check token is valid
gh api /user

# Check repo scope by testing vulnerability alerts on first repo
gh api repos/{first-repo}/vulnerability-alerts
```

If either call fails, warn the user and skip security settings checks (`dependabot-alerts`, `dependabot-autofixes`). Report clearly:

```
WARNING: Token permission check failed. Ensure your token has `repo` scope.
  Security settings checks will be skipped.
```

Continue with remaining checks (dependabot-config, semgrep-syntax, stale-prs, stale-branches, actions-pinned) that only require read access.

### Step 1: Build Repo List

**Single-repo mode:** If a specific repo was provided (contains `/`), use that repo directly. Skip to Step 2.

**Org mode:** List all active repos for the org (default: `skinnyandbald`).

Active repos = non-archived repos with a push in the last 180 days.

```bash
CUTOFF=$(date -v-180d +%Y-%m-%dT%H:%M:%SZ)   # macOS; use `date -d '-180 days'` on Linux
gh repo list {org} --limit 200 --json nameWithOwner,isArchived,pushedAt --no-archived \
  --jq --arg cutoff "$CUTOFF" '.[] | select(.pushedAt > $cutoff) | .nameWithOwner'
```

Report the repo count before proceeding: "Found N active repos in {org}."

### Step 2: Run All Checks

For each repo, run every check below. Collect all results into three buckets: **Critical**, **Warning**, **Clean**.

**Rate limit awareness:** If auditing 50+ repos, add a 1-second pause between repos (`sleep 1`).

---

## Check Definitions

### 1. `dependabot-alerts` (Critical, Auto-fixable)

Verify vulnerability alerts are enabled at the repo level.

```bash
gh api repos/{repo}/vulnerability-alerts
# 204 = enabled, 404 = disabled
```

A 404 response means alerts are disabled.

### 2. `dependabot-autofixes` (High, Auto-fixable)

Verify automated security fixes are enabled.

```bash
gh api repos/{repo}/automated-security-fixes
# Check the response JSON -- `enabled` field
```

### 3. `dependabot-config` (High, Auto-fixable)

Verify `.github/dependabot.yml` exists in the repo.

```bash
gh api repos/{repo}/contents/.github/dependabot.yml
# 404 = missing
```

### 4. `semgrep-syntax` (High, Auto-fixable)

Scan all `*.yml` files under `.github/workflows/` for any file that contains both `semgrep ci` and `--config auto` on the same line or in the same step.

```bash
# List workflow files
workflows=$(gh api repos/{repo}/contents/.github/workflows --jq '.[].name' 2>/dev/null)

# For each workflow file, fetch content and check
for wf in $workflows; do
  content=$(gh api repos/{repo}/contents/.github/workflows/$wf --jq '.content' | base64 -d)
  if echo "$content" | grep -q 'semgrep ci' && echo "$content" | grep -q '\-\-config auto'; then
    # Flag this file
    echo "FAIL: $wf contains semgrep ci with --config auto"
  fi
done
```

### 5. `stale-prs` (Low, Report only)

Find open PRs older than 30 days.

```bash
gh pr list --repo {repo} --state open --json number,title,createdAt,author \
  --jq '.[] | select(.createdAt < "'$(date -v-30d +%Y-%m-%dT%H:%M:%SZ)'")'
```

Report count and PR numbers/titles.

### 6. `stale-branches` (Low, Report only)

Find branches with tip commit older than 60 days, excluding:
- The default branch
- `dependabot/*`, `renovate/*`, `release/*` prefixes
- Any branch that has an open PR (source or target)

```bash
# Get all open PR source and target branches (to exclude them)
open_pr_branches=$(gh api repos/{repo}/pulls --jq '.[].head.ref, .[].base.ref' | sort -u)
default_branch=$(gh api repos/{repo} --jq '.default_branch')

gh api repos/{repo}/branches --paginate | jq -r '.[].name' | while read branch; do
  # Skip default branch
  [[ "$branch" == "$default_branch" ]] && continue
  # Skip dependabot/renovate/release branches
  [[ "$branch" =~ ^(dependabot|renovate|release)/ ]] && continue
  # Skip branches with open PRs
  echo "$open_pr_branches" | grep -qx "$branch" && continue

  # URL-encode branch name to handle slashes and special chars
  encoded_branch=$(python3 -c "import urllib.parse, sys; print(urllib.parse.quote(sys.argv[1], safe=''))" "$branch")

  # Check tip commit date
  committed_at=$(gh api "repos/{repo}/git/refs/heads/${encoded_branch}" --jq '.object.url' \
    | xargs gh api --jq '.committer.date')

  # Flag if older than 60 days
  cutoff_60d=$(date -v-60d +%Y-%m-%dT%H:%M:%SZ)
  if [[ "$committed_at" < "$cutoff_60d" ]]; then
    echo "STALE: $branch (last commit: $committed_at)"
  fi
done
```

### 7. `actions-pinned` (High, Report only)

Scan workflow files for third-party GitHub Actions that are NOT pinned to a SHA.

A `uses:` line is flagged if ALL of these are true:
- The action owner is NOT `actions/*` or `github/*` (first-party exclusions)
- The ref after `@` is NOT a 40-character hexadecimal SHA

This catches `@main`, `@master`, `@v1`, `@v1.2.3`, and any other non-SHA ref.

```bash
# For each workflow file, fetch and scan
for wf in $workflows; do
  content=$(gh api repos/{repo}/contents/.github/workflows/$wf --jq '.content' | base64 -d)
  # Find uses: lines with non-SHA refs for third-party actions
  echo "$content" | grep -E '^\s*uses:\s*' | while read line; do
    # Extract action ref (owner/repo@ref)
    action=$(echo "$line" | sed 's/.*uses:\s*//' | tr -d '"' | tr -d "'")
    owner=$(echo "$action" | cut -d'/' -f1)
    ref=$(echo "$action" | sed 's/.*@//')

    # Skip first-party actions
    [[ "$owner" == "actions" || "$owner" == "github" ]] && continue

    # Check if ref is a 40-char hex SHA
    if ! echo "$ref" | grep -qE '^[0-9a-f]{40}$'; then
      echo "UNPINNED: $wf uses $action"
    fi
  done
done
```

---

## Step 3: Report

Format results as a markdown report with three sections:

```markdown
## Repo Audit Results

### Critical Issues
| Repo | Check | Details |
|------|-------|---------|
| cos-bot | dependabot-alerts | Disabled |

### Warnings
| Repo | Check | Details |
|------|-------|---------|
| prompto | stale-prs | 3 PRs older than 30 days |
| dear-ben | actions-pinned | 2 unpinned actions in ci.yml |

### All Clear
dear-ben, SecondBrain, distil (12 repos clean)

**Summary:** 2 critical, 3 warnings, 12 clean
```

Map check severities to report sections:
- **Critical Issues:** `dependabot-alerts` (Critical severity)
- **Warnings:** `dependabot-autofixes`, `dependabot-config`, `semgrep-syntax`, `actions-pinned` (High severity), `stale-prs`, `stale-branches` (Low severity)
- **All Clear:** repos with zero findings

If `--fix` was NOT passed, remind the user: "Run `/repo-audit --fix` to auto-fix fixable issues."

---

## Step 4: Auto-Fix (only with `--fix` flag)

If `--fix` was not passed, STOP here. Do not modify anything.

Auto-fixable checks fall into two categories:

### Settings Fixes (API PUT, no git required)

**`dependabot-alerts`:**
```bash
gh api repos/{repo}/vulnerability-alerts --method PUT
```

**`dependabot-autofixes`:**
```bash
gh api repos/{repo}/automated-security-fixes --method PUT
```

### Content Fixes (GitHub Contents API, no clone required)

**`dependabot-config`** -- create `.github/dependabot.yml` with the default template (see below).

Only push if the repo has a `package.json` (npm ecosystem) or `.github/workflows/` (actions ecosystem). Skip repos with neither.

For new file creation, omit the `sha` field:

```bash
# Write template to temp file
cat > /tmp/dependabot.yml << 'DEPBOT'
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    cooldown:
      default-days: 7
      semver-major-days: 14
      semver-minor-days: 7
      semver-patch-days: 3
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    cooldown:
      default-days: 3
DEPBOT

gh api repos/{repo}/contents/.github/dependabot.yml \
  --method PUT \
  -f message="chore: add dependabot config" \
  -f content="$(base64 < /tmp/dependabot.yml)"
```

**`semgrep-syntax`** -- update each offending workflow file to remove `--config auto`.

Scan ALL `*.yml` files under `.github/workflows/` (not just `security.yml`).

```bash
# Get current file content and SHA
sha=$(gh api repos/{repo}/contents/.github/workflows/{file} --jq '.sha')
content=$(gh api repos/{repo}/contents/.github/workflows/{file} --jq '.content' | base64 -d)

# Remove --config auto from the content
fixed_content=$(echo "$content" | sed 's/--config auto//g')

# Write fixed content to temp file
echo "$fixed_content" > /tmp/fixed-workflow.yml

# Push fix via Contents API
gh api repos/{repo}/contents/.github/workflows/{file} \
  --method PUT \
  -f message="fix: remove --config auto from semgrep ci" \
  -f content="$(base64 < /tmp/fixed-workflow.yml)" \
  -f sha="$sha"
```

### Default Dependabot Template

```yaml
version: 2
updates:
  - package-ecosystem: "npm"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 10
    cooldown:
      default-days: 7
      semver-major-days: 14
      semver-minor-days: 7
      semver-patch-days: 3
  - package-ecosystem: "github-actions"
    directory: "/"
    schedule:
      interval: "weekly"
    open-pull-requests-limit: 5
    cooldown:
      default-days: 3
```

### Fix Report

After applying fixes, report what was changed:

```markdown
## Fixes Applied
| Repo | Check | Action |
|------|-------|--------|
| cos-bot | dependabot-alerts | Enabled via API |
| cos-bot | dependabot-config | Created .github/dependabot.yml via Contents API |
| prompto | semgrep-syntax | Removed --config auto from security.yml |
```

---

## Constraints

1. **Never modify repo code.** Only repo settings and config files under `.github/`.
2. **Read-only by default.** Only apply fixes when the `--fix` flag is passed.
3. **Skip archived repos.** The repo list query already filters these out.
4. **Org-agnostic.** Works with any GitHub org. Default to `skinnyandbald` if none specified.
5. **Rate limits.** If auditing 50+ repos, add `sleep 1` between repos to avoid hitting GitHub API rate limits.
6. **macOS date commands.** Use `date -v-Nd` syntax (macOS). On Linux, use `date -d '-N days'` instead.
7. **No cloning.** All checks and fixes use the GitHub API directly. No `git clone` needed.
8. **Confirm before fixing.** When `--fix` is passed, show the audit report FIRST, then confirm with the user before applying fixes. List exactly what will be changed.
