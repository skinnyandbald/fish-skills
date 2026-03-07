## Step 0: Check Project Knowledge Base (ALWAYS FIRST)

Before reviewing any code, search for past solutions and patterns relevant to this change.

**Search these locations in order:**

1. **Compound Engineering solutions** (`docs/solutions/`):
   ```bash
   find docs/solutions/ -type f -name "*.md" 2>/dev/null
   ```
   Read any files whose topic overlaps with the modules/patterns being changed.

2. **Project learnings** (`.claude/learnings/`):
   ```bash
   ls -t .claude/learnings/*.md 2>/dev/null | head -10
   ```
   Read the most recent 5 files and any whose name suggests overlap with this change.

3. **Global cross-project patterns** (`~/.claude/learnings/global-patterns.md`):
   ```bash
   cat ~/.claude/learnings/global-patterns.md 2>/dev/null
   ```
   Read the full file — it contains patterns that apply across all projects.

**For any past solution found that is relevant to this PR:**
- Flag it as a **Known Pattern** with the source path
- Use it as context when evaluating whether the new code follows established patterns
- If the new code contradicts a known pattern, flag it as an **Important** finding

---

