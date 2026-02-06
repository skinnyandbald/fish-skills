# Resolve PR Comments (v3 - Detailed Reference)

> This is the **detailed reference** for single-threaded PR resolution. For parallel execution (recommended for 2+ comments), use the main SKILL.md workflow.

---

## When to Use This Reference

| Use main SKILL.md (parallel) | Use this reference |
|-------------------------------|------------------|
| PR has 2+ comments on different files | Learning the full workflow |
| Comments are independent | Single comment to resolve |
| You want maximum speed | Comments are interdependent |

---

## Phase 0: Pre-Flight

See `references/goodtogo.md` for GoodToGo pre-flight check.

**Route based on status:**

| Status | Action |
|--------|--------|
| `READY` | Quick verification → commit |
| `CI_FAILING` | Fix CI first (Phase 3) |
| `ACTION_REQUIRED` | Full discovery workflow |
| `UNRESOLVED_THREADS` | Focus on thread resolution |

---

## Phase 1: Discovery

### Step 1: Gather ALL Comment Types

Use scripts from `references/discovery.md`.

**CRITICAL: Query all sources:**
1. Review comments (inline on code)
2. Discussion comments (including Claude bot)
3. Unresolved review threads (GraphQL - MANDATORY)

### Step 2: Parse Bot Comments

**CRITICAL:** Each bot uses DIFFERENT formats. See `references/bot-formats.md` for:
- CodeRabbit: Collapsible `<details>` sections
- Gemini: `![priority]` badges
- Claude: Numbered `### 1.` in single discussion comment
- Human: Free-form patterns

### Step 3: Mandatory Enumeration

**STOP. Print enumeration before proceeding:**

```markdown
## Discovery Complete

| Bot | Found | Expected | Match |
|-----|-------|----------|-------|
| CodeRabbit | [N] | [N] | / |
| Gemini | [N] | [N] | / |
| Claude | [N] | [N] | / |
| Human | [N] | [N] | / |

**All items ([TOTAL]):**
1. [category] `file:line` - "Summary" ([@author](link))
...
```

**If counts don't match: STOP and re-parse.**

---

## Phase 2: Classification

### Step 4: Categorize Each Comment

See `references/classification.md` for categories and signals.

### Step 5: Create Todo List

```markdown
CRITICAL (CI Failures):
- [ ] [blocking] Fix lint error in Button.tsx:23

BLOCKING COMMENTS:
- [ ] [blocking] [@reviewer](link) Fix bug in route.ts:45

SUGGESTIONS:
- [ ] [suggestion] [@reviewer](link) Improve test coverage

NITPICKS (fix automatically):
- [ ] [nitpick] [@reviewer](link) Fix typo

QUESTIONS (ask human):
- [ ] [question] [@reviewer](link) "Should this handle null?"

NON-ACTIONABLE:
- [ ] [non_actionable] [@reviewer](link) "LGTM"
```

---

## Phase 3: Resolution

### Step 6: Fix CI Failures First

Run local checks from `references/verification.md` and fix any failures before proceeding.

### Step 7: Work Through Comments

**Order:** blocking → suggestion → nitpick → question → non_actionable

For each comment:
1. Read the full context
2. Fix the issue (record: `code_fix` + evidence)
3. For questions: ask human
4. For non_actionable: auto-acknowledge

### Step 8: Handle "Won't Fix" / "Disagree"

**Ask human first:**
```text
Comment from @reviewer on src/config.ts:23:
"[comment text]"

I recommend NOT addressing because: [reason]

Should I mark as 'won't fix'? (yes/no)
```

---

## Phase 4: Verification Gate (MANDATORY)

### Step 9: Run Local Checks

See `references/verification.md`.

### Step 10: GoodToGo Final Verification

See `references/goodtogo.md`.

### Step 11: Manual Verification

**Verify EVERY comment:**

| Check | Requirement |
|-------|-------------|
| Status | `resolved` or `acknowledged` |
| Type | `code_fix`, `wont_fix`, `disagree`, `acknowledged` |
| Evidence | What changed / reason |

**HARD BLOCK: Do NOT commit until all pass.**

---

## Phase 5: Completion

See `references/completion.md` for:
1. Commit template
2. Post resolution summary
3. Resolve GitHub threads

---

## Important Guidelines

1. **Verification gate is mandatory** - no commit until every comment resolved
2. **Fix CI failures FIRST**
3. **Run local checks BEFORE committing**
4. **Fix bot comments and nitpicks automatically**
5. **Only ask for questions or uncertainty**
6. **Parse full body for multiple items**
7. **Include permalinks everywhere**

---

## Related

| Resource | Description |
|----------|-------------|
| Main SKILL.md | Parallel execution (recommended) |
| `/commit-commands:commit` | Clean commit workflow |
