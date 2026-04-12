---
date: 2026-04-12
type: plan
status: Ready
spec: docs/specs/2026-04-12 - Spec - Process Meeting Notes v2.md
branch: fix/process-meeting-notes-v2
---
# Implementation Plan: Process Meeting Notes v2

## Overview

Apply 7 changes to the process-meeting-notes skill: mandatory transcript analysis, smart repo routing, completeness gates, and a verification script. All changes are to markdown skill files and one bash script.

## Prerequisites

- Branch `fix/process-meeting-notes-v2` exists on fish-skills repo (done)
- Spec committed and reviewed (9/10 avg score from 3 models)

## Tasks

### Task 1: Create verification script
**File:** `skills/process-meeting-notes/bin/verify-extraction-completeness.sh`
**Action:** Create new file with the exact bash script from spec Change 4.
**Steps:**
1. `mkdir -p skills/process-meeting-notes/bin`
2. Write the script (3 args: combined_count, skipped_count, l10_file)
3. `chmod +x` the script
4. Test locally: `bash skills/process-meeting-notes/bin/verify-extraction-completeness.sh 11 3 /path/to/test-l10.md` — should PASS with 8+ action items in the test file

### Task 2: Update workflow — Step 3 (mandatory transcript analysis)
**File:** `skills/process-meeting-notes/workflows/process-recent-meeting.md`
**Action:** Replace Step 3 content with spec Change 1 text.
**Steps:**
1. Find `## Step 3: Retrieve Full Transcript (if needed)`
2. Replace heading with `## Step 3: Retrieve and Analyze Full Transcript (MANDATORY)`
3. Replace body with the full text from Change 1 (subagent dispatch, single-pass read, conservative dedup, decisions tracked separately)

### Task 3: Update workflow — Step 6 (present ALL items, no pre-filtering)
**File:** `skills/process-meeting-notes/workflows/process-recent-meeting.md`
**Action:** Add the mandatory triage rules from spec Change 2 to the top of Step 6.
**Steps:**
1. Find `## Step 6: Create GitHub Issues`
2. Add the CRITICAL block at the top (three exclusive states, non-user items default to L10 ONLY, zero-action short circuit for Step 6 only)

### Task 4: Add smart repo routing (Change 2.5)
**File:** `skills/process-meeting-notes/workflows/process-recent-meeting.md`
**Action:** Add new Step 5.5 between Step 5 (compare existing issues) and Step 6 (create issues).
**Steps:**
1. Add `## Step 5.5: Determine Target Repository for Each Issue` after Step 5
2. Include: repo list fetch via `gh repo list`, fuzzy matching, routing rules (product -> project repo, business -> SB), fallback to SB, grouped triage table format
3. Each CREATE ISSUE item gets a suggested repo that the user can override

### Task 5: Update workflow — Step 8 (L10 completeness)
**File:** `skills/process-meeting-notes/workflows/process-recent-meeting.md`
**Action:** Add the requirements from spec Change 3 to Step 8.
**Steps:**
1. Find Step 8 (Generate EOS Level 10 Summary)
2. Add: ALL participants' action items required, GitHub issue links inline, IDS section must capture decisions, Fireflies API failure handling note

### Task 6: Add three checkpoints to workflow
**File:** `skills/process-meeting-notes/workflows/process-recent-meeting.md`
**Action:** Insert Checkpoints A, B, C from spec Change 5 at the correct positions.
**Steps:**
1. After Step 3 (transcript analysis) -> insert Checkpoint A (extraction count, temp file write)
2. After Step 6 (issue triage) -> insert Checkpoint B (triage completeness, temp file write)
3. After Step 8 (L10 generation) -> insert Checkpoint C (run verification script, cleanup temp files)
4. Use `{MEETING_ID}` placeholder in temp file paths (Fireflies transcript ID)

### Task 7: Update success criteria
**File:** `skills/process-meeting-notes/workflows/process-recent-meeting.md`
**Action:** Add the new success criteria from spec Change 6.
**Steps:**
1. Find the `<success_criteria>` block
2. Add the 7 new checklist items (transcript analyzed, all participants in L10, decisions in IDS, verification passed, triage complete, states sum correctly, repo routing correct)

### Task 8: Update SKILL.md description
**File:** `skills/process-meeting-notes/SKILL.md`
**Action:** Update the skill description to mention mandatory transcript analysis and completeness verification.
**Steps:**
1. Read current SKILL.md
2. Update description/intro to mention: full transcript analysis (not just Fireflies summary), deterministic verification gate, smart repo routing

### Task 9: Symlink update + commit
**Action:** Ensure symlink is current, commit, push.
**Steps:**
1. Verify symlink: `ls -la ~/.claude/skills/process-meeting-notes` -> should point to `~/code/fish-skills/skills/process-meeting-notes`
2. `git add skills/process-meeting-notes/`
3. `git commit -m "feat: process-meeting-notes v2 — mandatory transcript analysis + completeness gates + repo routing"`
4. `git push`

## Execution Order

Tasks 1-8 are independent of each other (all edit different sections or create new files). They can be executed in parallel by a single agent reading the spec.

Task 9 depends on all others completing first.

## Verification

After implementation:
1. Read the updated `workflows/process-recent-meeting.md` end-to-end and verify all 7 spec changes are present
2. Run the verification script against a test L10 to confirm it works
3. Verify the symlink is active and the skill appears in `/find-skills`
