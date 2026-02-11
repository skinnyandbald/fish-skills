#!/bin/bash

# Verify and patch worktree plugin files with Claude Code integration instructions
# Run after plugin updates to ensure worktree skills guide users to launch
# Claude Code from the worktree directory.
#
# Usage: bash ~/.claude/scripts/verify-worktree-plugins.sh [--patch]
#   No args:  Check status only
#   --patch:  Apply missing patches

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

PATCH_MODE="${1:-}"
PLUGINS_DIR="$HOME/.claude/plugins"
ISSUES=0
PATCHED=0

# --- Marker strings to detect our patches ---
SKILL_MARKER="Claude Code + Worktree Working Directory"
SKILL_MARKER_ALT="Launch Claude Code"  # superpowers uses different heading
SCRIPT_MARKER="IMPORTANT: Open a NEW Claude Code instance"

# --- Patch content ---

read -r -d '' SKILL_PATCH << 'SKILLEOF' || true
## CRITICAL: Claude Code + Worktree Working Directory

**Claude Code's statusline, git context, and system prompt are set at LAUNCH TIME based on the working directory.** Running `cd` inside a Bash tool call does NOT change Claude Code's process CWD or statusline.

**After creating a worktree, you MUST tell the user to open a NEW Claude Code instance from the worktree directory:**

```bash
# User must run this in a NEW terminal
cd <worktree-path> && claude
```

**Why this matters:**
- The statusline shows the branch/worktree from the launch directory
- After auto-compact, Claude Code uses the system prompt's `gitStatus` (set at launch) to know where it is
- If launched from the main repo, Claude will revert to working in main after compaction
- Each worktree needs its OWN Claude Code instance for proper isolation

**After creating a worktree, ALWAYS:**
1. Print the full path to the worktree
2. Tell the user: "Open a new terminal and run: `cd <path> && claude`"
3. Do NOT attempt to `cd` into the worktree and continue working from the current session

SKILLEOF

read -r -d '' SCRIPT_CREATE_PATCH << 'SCRIPTEOF' || true
  echo -e "${GREEN}✓ Worktree created successfully!${NC}"
  echo ""
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo -e "${YELLOW}IMPORTANT: Open a NEW Claude Code instance in this worktree${NC}"
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
  echo ""
  echo -e "  ${GREEN}cd $worktree_path && claude${NC}"
  echo ""
  echo -e "${YELLOW}Why:${NC} Claude Code's statusline and git context are set at launch."
  echo -e "Running 'cd' inside an existing session does NOT update the statusline."
  echo -e "Each worktree needs its own Claude Code instance launched from that directory."
  echo ""
}
SCRIPTEOF

read -r -d '' SUPERPOWERS_PATCH << 'SUPEOF' || true
### 5. Report Location and Launch Claude Code

```
Worktree ready at <full-path>
Tests passing (<N> tests, 0 failures)

IMPORTANT: Open a NEW Claude Code instance in the worktree:
  cd <full-path> && claude

Claude Code's statusline and git context are set at launch time.
Running 'cd' in an existing session does NOT update the statusline or system prompt.
After auto-compact, Claude will revert to the launch directory's context.
Each worktree needs its own Claude Code instance.
```

**CRITICAL:** After creating the worktree, you MUST tell the user to open a new terminal and run `cd <path> && claude`. Do NOT attempt to `cd` into the worktree and continue working from the current session — the statusline, git context, and post-compaction behavior will all be wrong.
SUPEOF

# --- Check functions ---

check_file() {
  local file="$1"
  local label="$2"
  shift 2
  local markers=("$@")  # remaining args are markers (any match = pass)

  if [[ ! -f "$file" ]]; then
    return 1  # file doesn't exist
  fi

  for marker in "${markers[@]}"; do
    if grep -q "$marker" "$file" 2>/dev/null; then
      echo -e "  ${GREEN}✓${NC} $label"
      return 0
    fi
  done

  echo -e "  ${RED}✗${NC} $label ${YELLOW}(missing patch)${NC}"
  ISSUES=$((ISSUES + 1))
  return 2  # exists but not patched
}

# --- Find latest cache version ---

find_latest_cache() {
  local plugin_name="$1"
  local marketplace="$2"
  local cache_base="$PLUGINS_DIR/cache/$marketplace/$plugin_name"

  if [[ ! -d "$cache_base" ]]; then
    echo ""
    return
  fi

  # Get latest version directory (sort by version number)
  local latest
  latest=$(ls -d "$cache_base"/*/ 2>/dev/null | sort -V | tail -1)
  echo "${latest%/}"
}

# --- Patch functions ---

patch_compound_skill() {
  local file="$1"
  if [[ ! -f "$file" ]]; then return; fi

  # Insert patch before "## CRITICAL: Always Use the Manager Script"
  local tmp
  tmp=$(mktemp)
  awk -v patch="$SKILL_PATCH" '
    /^## CRITICAL: Always Use the Manager Script/ {
      print patch
      print ""
    }
    { print }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
  PATCHED=$((PATCHED + 1))
  echo -e "    ${GREEN}→ Patched${NC}"
}

patch_compound_script() {
  local file="$1"
  if [[ ! -f "$file" ]]; then return; fi

  # Replace the create function's success output block
  local tmp
  tmp=$(mktemp)
  sed '/echo -e "${GREEN}✓ Worktree created successfully!${NC}"/,/^}$/c\
  echo -e "${GREEN}✓ Worktree created successfully!${NC}"\
  echo ""\
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"\
  echo -e "${YELLOW}IMPORTANT: Open a NEW Claude Code instance in this worktree${NC}"\
  echo -e "${YELLOW}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"\
  echo ""\
  echo -e "  ${GREEN}cd $worktree_path \\&\\& claude${NC}"\
  echo ""\
  echo -e "${YELLOW}Why:${NC} Claude Code'"'"'s statusline and git context are set at launch."\
  echo -e "Running '"'"'cd'"'"' inside an existing session does NOT update the statusline."\
  echo -e "Each worktree needs its own Claude Code instance launched from that directory."\
  echo ""\
}' "$file" > "$tmp"
  mv "$tmp" "$file"
  chmod +x "$file"
  PATCHED=$((PATCHED + 1))
  echo -e "    ${GREEN}→ Patched${NC}"
}

patch_superpowers_skill() {
  local file="$1"
  if [[ ! -f "$file" ]]; then return; fi

  # Replace the "### 5. Report Location" section
  local tmp
  tmp=$(mktemp)
  awk -v patch="$SUPERPOWERS_PATCH" '
    /^### 5\. Report Location/ {
      print patch
      skip = 1
      next
    }
    skip && /^(### [0-9]|^## )/ {
      skip = 0
    }
    !skip { print }
  ' "$file" > "$tmp"
  mv "$tmp" "$file"
  PATCHED=$((PATCHED + 1))
  echo -e "    ${GREEN}→ Patched${NC}"
}

# --- Main ---

echo -e "${BLUE}Verifying worktree plugin Claude Code integration...${NC}"
echo ""

# 1. Compound Engineering - marketplace
echo -e "${BLUE}compound-engineering (marketplace):${NC}"
CE_MKT="$PLUGINS_DIR/marketplaces/every-marketplace/plugins/compound-engineering/skills/git-worktree"
check_file "$CE_MKT/SKILL.md" "SKILL.md" "$SKILL_MARKER"
ce_mkt_skill=$?
check_file "$CE_MKT/scripts/worktree-manager.sh" "worktree-manager.sh" "$SCRIPT_MARKER"
ce_mkt_script=$?

# 2. Compound Engineering - cache (latest version)
CE_CACHE=$(find_latest_cache "compound-engineering" "every-marketplace")
if [[ -n "$CE_CACHE" ]]; then
  echo -e "${BLUE}compound-engineering (cache: $(basename "$CE_CACHE")):${NC}"
  check_file "$CE_CACHE/skills/git-worktree/SKILL.md" "SKILL.md" "$SKILL_MARKER"
  ce_cache_skill=$?
  check_file "$CE_CACHE/skills/git-worktree/scripts/worktree-manager.sh" "worktree-manager.sh" "$SCRIPT_MARKER"
  ce_cache_script=$?
else
  echo -e "${YELLOW}compound-engineering cache not found${NC}"
fi

# 3. Superpowers - cache (latest version)
SP_CACHE=$(find_latest_cache "superpowers" "superpowers-marketplace")
if [[ -n "$SP_CACHE" ]]; then
  echo -e "${BLUE}superpowers (cache: $(basename "$SP_CACHE")):${NC}"
  check_file "$SP_CACHE/skills/using-git-worktrees/SKILL.md" "SKILL.md" "$SKILL_MARKER" "$SKILL_MARKER_ALT"
  sp_cache_skill=$?
else
  echo -e "${YELLOW}superpowers cache not found${NC}"
fi

# 4. PreCompact hook
echo -e "${BLUE}PreCompact hook:${NC}"
if [[ -f "$HOME/.claude/hooks/context-compression-hook.ts" ]]; then
  if grep -q "getWorktreeContext" "$HOME/.claude/hooks/context-compression-hook.ts" 2>/dev/null; then
    echo -e "  ${GREEN}✓${NC} context-compression-hook.ts (worktree detection present)"
  else
    echo -e "  ${RED}✗${NC} context-compression-hook.ts ${YELLOW}(missing worktree detection)${NC}"
    ISSUES=$((ISSUES + 1))
  fi
else
  echo -e "  ${RED}✗${NC} context-compression-hook.ts ${YELLOW}(file missing)${NC}"
  ISSUES=$((ISSUES + 1))
fi

echo ""

# --- Summary and patching ---

if [[ $ISSUES -eq 0 ]]; then
  echo -e "${GREEN}All worktree plugin patches are in place.${NC}"
  exit 0
fi

echo -e "${YELLOW}Found $ISSUES file(s) missing Claude Code integration patches.${NC}"

if [[ "$PATCH_MODE" != "--patch" ]]; then
  echo ""
  echo -e "Run with ${BLUE}--patch${NC} to apply fixes:"
  echo -e "  ${BLUE}bash ~/.claude/scripts/verify-worktree-plugins.sh --patch${NC}"
  echo ""
  echo -e "Or ask Claude Code to re-apply the patches manually."
  exit 1
fi

echo ""
echo -e "${BLUE}Applying patches...${NC}"

# Patch compound-engineering marketplace
if [[ ${ce_mkt_skill:-0} -eq 2 ]]; then
  echo -e "  Patching $CE_MKT/SKILL.md..."
  patch_compound_skill "$CE_MKT/SKILL.md"
fi
if [[ ${ce_mkt_script:-0} -eq 2 ]]; then
  echo -e "  Patching $CE_MKT/scripts/worktree-manager.sh..."
  patch_compound_script "$CE_MKT/scripts/worktree-manager.sh"
fi

# Patch compound-engineering cache
if [[ -n "${CE_CACHE:-}" ]]; then
  if [[ ${ce_cache_skill:-0} -eq 2 ]]; then
    echo -e "  Patching $CE_CACHE/skills/git-worktree/SKILL.md..."
    patch_compound_skill "$CE_CACHE/skills/git-worktree/SKILL.md"
  fi
  if [[ ${ce_cache_script:-0} -eq 2 ]]; then
    echo -e "  Patching $CE_CACHE/skills/git-worktree/scripts/worktree-manager.sh..."
    patch_compound_script "$CE_CACHE/skills/git-worktree/scripts/worktree-manager.sh"
  fi
fi

# Patch superpowers cache
if [[ -n "${SP_CACHE:-}" ]]; then
  if [[ ${sp_cache_skill:-0} -eq 2 ]]; then
    echo -e "  Patching $SP_CACHE/skills/using-git-worktrees/SKILL.md..."
    patch_superpowers_skill "$SP_CACHE/skills/using-git-worktrees/SKILL.md"
  fi
fi

echo ""
if [[ $PATCHED -gt 0 ]]; then
  echo -e "${GREEN}Applied $PATCHED patch(es).${NC}"
else
  echo -e "${YELLOW}No patches applied (PreCompact hook must be fixed manually by Claude).${NC}"
fi

echo ""
echo -e "${BLUE}Note:${NC} The PreCompact hook at ~/.claude/hooks/context-compression-hook.ts"
echo "cannot be auto-patched by this script. Ask Claude Code to regenerate it"
echo "if the worktree detection function is missing."
