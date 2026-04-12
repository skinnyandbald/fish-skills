---
date: 2026-04-12
type: spec
status: Draft
skill-location: ~/code/fish-skills/skills/process-meeting-notes/
---
# Process Meeting Notes v2 — Mandatory Transcript Analysis + Completeness Gates

## Problem

The process-meeting-notes skill skipped critical steps in practice:
1. Relied on Fireflies' automated action item extraction instead of analyzing the full transcript
2. Pre-filtered which action items to create as GitHub issues (should present ALL for user triage)
3. Omitted action items for non-user participants (Jared's 6 tasks were dropped)
4. Generated a meeting note instead of a proper EOS L10 summary
5. No deterministic verification that all items were captured

In a 2.5-hour meeting with 11 action items, the skill created only 4 GitHub issues and missed the L10 entirely.

## Root Cause

Step 3 (full transcript retrieval) was marked "if needed" — making it optional. Without the transcript, the skill relies entirely on Fireflies' automated summary, which:
- Misses implicit commitments ("we should...", "the next step is...")
- Misses decisions that imply tasks
- Uses generic phrasing that loses specificity

The workflow also had no verification gate — no way to catch when items were dropped.

## Design

### Change 1: Step 3 is MANDATORY (full transcript analysis)

**Current workflow file:** `workflows/process-recent-meeting.md`, Step 3

**Current text:**
```markdown
## Step 3: Retrieve Full Transcript (if needed)
If action items are unclear or context is insufficient:
```

**New text:**
```markdown
## Step 3: Retrieve and Analyze Full Transcript (MANDATORY)

ALWAYS fetch the full transcript via Fireflies MCP. The automated summary
is a starting point, not the final extraction.

Dispatch a subagent to read the transcript and extract:
- Explicit commitments: "I'll handle...", "Let me do...", "I need to..."
- Implicit tasks: "we should...", "we need to...", "the next step is..."
- Product changes: "we need to add X", "the product should have X"
- Business tasks: "reach out to X", "set up Y", "write Z"
- Research tasks: "look into X", "check on Y", "figure out Z"

The subagent MUST read the ENTIRE transcript file in a single pass. A vague
"summarize this" prompt will lose detail. Be explicit: "Read the full file,
then list every action item with the speaker name and timestamp."

If the transcript exceeds 200K chars, fall back to chunked reading with
offset/limit to cover the whole file — but try single-pass first.

Merge the subagent's extraction with Fireflies' automated action items.
Deduplicate conservatively: only merge items with exact normalized text AND
matching owner. For ambiguous near-matches, surface both to the user for
confirmation. When in doubt, keep both items — over-extraction is better
than under-extraction.

Decisions made during the meeting (e.g. "we agreed that...", "the decision
is...") are tracked separately in the IDS section of the L10, not as action
items. Do not include decisions in the action item extraction list.
```

### Change 2: Step 6 must present ALL items — no pre-filtering

**Current:** Step 6 says "present to user" but doesn't prohibit pre-filtering.

**Add to the top of Step 6:**
```markdown
**CRITICAL: Present ALL extracted action items to the user for triage.**
Do NOT pre-filter, skip, or decide on the user's behalf which items
deserve GitHub issues. Present every item — including items assigned to
other participants. The user decides what to track.

Each item has exactly one of three states after triage:
- CREATE ISSUE: user wants a GitHub issue created
- L10 ONLY: track in the L10 but no GitHub issue needed
- SKIP: user explicitly chose not to track this item

Items assigned to other participants default to L10 ONLY. Do NOT create
GitHub issues for non-user-owned items unless the user explicitly approves.

If the combined extraction count is 0, skip Step 6 (issue triage). Still generate the L10 in Step 8 — meetings with zero action items may still have decisions, IDS items, and headlines worth capturing.
```

### Change 2.5: Smart repo routing for GitHub issues

**New capability:** Before creating issues, determine the correct repository for each item.

**Detection logic:**
1. Extract the project/company context from the meeting (participants, topic, keywords)
2. Fetch the authenticated user's repo list once: `GH_LOGIN=$(gh api user -q '.login' 2>/dev/null)` then `gh repo list "$GH_LOGIN" --limit 200 --json name --jq '.[].name'`. Fuzzy-match the meeting's project/company name against this list (case-insensitive, strip hyphens for comparison). If exactly one repo matches, use it. If multiple match, present options to the user. If zero match, route to SecondBrain.

**Fallback:** If `gh` CLI is unavailable, rate-limited, or errors on all lookups, default all items to SB repo and notify the user: "Repo detection unavailable — routing all issues to SecondBrain."

**Routing rules:**
- **Product/engineering tasks** (code changes, features, bugs, technical debt) -> project repo if it exists
- **Business/consulting/personal tasks** (outreach, strategy, content, follow-ups) -> SB repo
- **If no project repo exists** -> SB repo (with project prefix in title)

**Present the routing to the user for each CREATE ISSUE item:**
```text
PROPOSED ISSUE #3
  Title: [DISTIL] - Product - Add PII consent checkbox
  Repo: skinnyandbald/distil (detected from meeting context)
  [confirm / change repo / skip]
```

**The user can override any routing.** The detection is a suggestion, not a mandate.

**If multiple repos are relevant** (e.g., meeting covers both Distil product work and Ben's consulting tasks), group issues by repo in the triage table:

```text
=== skinnyandbald/distil (3 issues) ===
#1 [CREATE ISSUE] Add PII consent checkbox -- Ben (this week)
#2 [CREATE ISSUE] Model token costs -- Jared (this week)

=== skinnyandbald/SecondBrain (2 issues) ===
#3 [CREATE ISSUE] [DISTIL] Share training content with Jared -- Ben (next week)
#4 [CREATE ISSUE] [DISTIL] Coordinate sprint integration -- Ben (ongoing)

=== L10 Only (5 items) ===
#5-9 [L10 ONLY] Jared's tasks (tracked in L10, no issue)
```

### Change 3: L10 must include ALL participants' action items and decisions

**Current:** Step 8 generates the L10 but doesn't explicitly require all participants or decisions.

**Add to Step 8:**
```markdown
**Action Items section MUST include tasks for ALL meeting participants.**
The L10 format tracks accountability across everyone in the meeting. If
Jared committed to 6 tasks and Ben committed to 5, all 11 appear in the
Action Items section with their respective owners.

Link GitHub issue numbers inline where issues were created:
- [ ] Action description -- **Owner** (due date) [#NNN](url)

**IDS section MUST capture decisions made during the meeting.**
For each decision: record what was decided, who decided, and any rationale.
Decisions are distinct from action items — they go in IDS, not Action Items.

**Fireflies API failure handling:** If the Fireflies transcript fetch fails,
warn the user and proceed with the Fireflies summary only. Note in the L10
that full transcript analysis was unavailable.
```

### Change 4: Verification script (deterministic gate)

**New file:** `bin/verify-extraction-completeness.sh`

```bash
#!/usr/bin/env bash
# Verify L10 action items >= expected items after accounting for skipped items
# Usage: verify-extraction-completeness.sh <combined_count> <skipped_count> <l10_file>
#
# combined_count = Fireflies items + additional transcript-extracted items
# skipped_count  = items the user explicitly chose not to track
# l10_file       = path to the generated L10 markdown file

set -euo pipefail

if [ "$#" -ne 3 ]; then
  echo "Usage: verify-extraction-completeness.sh <combined_count> <skipped_count> <l10_file>"
  echo "  combined_count: total items from Fireflies + transcript analysis"
  echo "  skipped_count:  items user explicitly chose not to track"
  echo "  l10_file:       path to the generated L10 markdown file"
  exit 1
fi

COMBINED_COUNT="$1"
SKIPPED_COUNT="$2"
L10_FILE="$3"

# Validate that counts are numeric
if ! [[ "$COMBINED_COUNT" =~ ^[0-9]+$ ]]; then
  echo "FAIL: combined_count must be a non-negative integer, got: $COMBINED_COUNT"
  exit 1
fi

if ! [[ "$SKIPPED_COUNT" =~ ^[0-9]+$ ]]; then
  echo "FAIL: skipped_count must be a non-negative integer, got: $SKIPPED_COUNT"
  exit 1
fi

if [ ! -f "$L10_FILE" ]; then
  echo "FAIL: L10 file not found at $L10_FILE"
  exit 1
fi

if [ "$SKIPPED_COUNT" -gt "$COMBINED_COUNT" ]; then
  echo "FAIL: skipped_count ($SKIPPED_COUNT) cannot exceed combined_count ($COMBINED_COUNT)"
  exit 1
fi

EXPECTED=$((COMBINED_COUNT - SKIPPED_COUNT))

# Count checkboxes only within the Action Items section (not the whole file)
# Uses dash-only format to enforce canonical L10 checkbox style (- [ ])
L10_COUNT=$(awk '/^## Action Items/{flag=1; next} /^## /{flag=0} flag' "$L10_FILE" | grep -Ec '^[[:space:]]*-[[:space:]]*\[[ xX]\]' || true)

echo "Combined extraction count (Fireflies + transcript): $COMBINED_COUNT"
echo "Skipped by user: $SKIPPED_COUNT"
echo "Expected in L10: $EXPECTED"
echo "L10 action item count: $L10_COUNT"

if [ "$L10_COUNT" -lt "$EXPECTED" ]; then
  MISSING=$((EXPECTED - L10_COUNT))
  echo "FAIL: L10 is missing $MISSING action item(s)"
  echo "The L10 must contain at least as many items as (combined - skipped)."
  echo "Re-check the transcript analysis and add missing items."
  exit 1
fi

echo "PASS: L10 action item count ($L10_COUNT) >= expected ($EXPECTED)"
exit 0
```

### Change 5: Three mandatory checkpoints in the workflow

**Checkpoint A — after Step 3 (transcript analysis):**
```text
### CHECKPOINT A: Extraction Count
Print: "Extracted N total action items:"
Print: "  - M from Fireflies automated summary"
Print: "  - K additional from full transcript analysis"

If K = 0 and the meeting was longer than 30 minutes, print an advisory:
"Zero additional items from transcript analysis. This is unusual for a
meeting of this length. Verify the transcript was fully read."
(Do NOT force a re-scan — K=0 is valid if coverage appears correct.)

Write N to /tmp/meeting-notes-$MEETING_ID-extraction-count.txt for use at Checkpoint C.
Use the Fireflies transcript ID as MEETING_ID to namespace temp files and prevent cross-run contamination.
```

**Checkpoint B — after Step 6 (issue triage):**
```text
### CHECKPOINT B: Issue Triage Completeness
Print: "Triaged N action items:"
Print: "  - X created as GitHub issues (issue_created)"
Print: "  - Y tracked in L10 only (l10_only)"
Print: "  - Z skipped by user (user_skipped)"

These three states are mutually exclusive. Every extracted item must be
in exactly one state.

Verify: X + Y + Z = COMBINED_COUNT
If not equal, items were dropped. List what's missing before proceeding.

Write Z (skipped count) to /tmp/meeting-notes-$MEETING_ID-skipped-count.txt
for use at Checkpoint C.
```

**Checkpoint C — after Step 8 (L10 generation):**
```text
### CHECKPOINT C: Run Verification Script

Before running verification, save the L10 content to a temp file:
L10_FILE_PATH="/tmp/meeting-notes-$MEETING_ID-l10-draft.md"
# Write the generated L10 content to this path

Read COMBINED_COUNT from /tmp/meeting-notes-$MEETING_ID-extraction-count.txt
Read SKIPPED_COUNT from /tmp/meeting-notes-$MEETING_ID-skipped-count.txt

bash ~/.claude/skills/process-meeting-notes/bin/verify-extraction-completeness.sh \
  "$COMBINED_COUNT" \
  "$SKIPPED_COUNT" \
  "$L10_FILE_PATH"

DO NOT mark the workflow as complete until this script exits 0.
If it fails, add the missing items to the L10 and re-run.

Clean up temp files after verification: rm -f /tmp/meeting-notes-$MEETING_ID-*.txt
```

### Change 6: Update success criteria

**Current success criteria** doesn't mention transcript analysis or completeness verification.

**Add:**
```markdown
- [ ] Full transcript retrieved and analyzed (not just Fireflies summary)
- [ ] ALL action items from ALL participants included in L10
- [ ] Decisions captured in L10 IDS section
- [ ] Verification script passed (L10 count >= combined - skipped)
- [ ] User triaged every extracted item (none silently dropped)
- [ ] All three triage states sum to COMBINED_COUNT
- [ ] Issues routed to correct repos (project repo for product work, SB for business tasks)
```

## Files to Modify

| File | Change |
|------|--------|
| `workflows/process-recent-meeting.md` | Steps 3, 6, 8 rewritten + 3 checkpoints added |
| `bin/verify-extraction-completeness.sh` | New file (verification script) |
| `SKILL.md` | Update description to mention mandatory transcript analysis |

## Constraints

- The verification script must be portable (bash, no dependencies beyond awk and grep)
- The subagent for transcript analysis must read the ENTIRE file in a single pass (only chunk if > 200K chars)
- Fireflies' automated items are the FLOOR, not the ceiling. The transcript analysis typically finds additional items in meetings > 30 minutes, but K=0 is valid if transcript coverage appears correct.
- The L10 is the authoritative record. Meeting notes (saved to vault) are secondary.
- Shell variables do not persist across interactive steps — use temp files at `/tmp/meeting-notes-$MEETING_ID-*.txt` (namespaced by Fireflies transcript ID) to pass counts between checkpoints and prevent cross-run contamination.

## Testing

Manual test: re-run the skill against today's Jared/Distil meeting (Fireflies ID: 01KP147X4JB2Z3Y8EVN9M2J3XW).
- Fireflies extracted 11 action items
- Expected: transcript analysis finds the same 11 + potentially more implicit tasks
- Expected: all 11+ appear in the L10, all are presented for GitHub issue triage
- Expected: verification script passes
