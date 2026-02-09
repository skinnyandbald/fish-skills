#!/bin/bash

# Git Worktree Manager
# Creates worktrees in .github/worktrees/ with symlinked .env files

set -e

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

# Get repo root
GIT_ROOT=$(git rev-parse --show-toplevel)
WORKTREE_DIR="$GIT_ROOT/.github/worktrees"

# Ensure .github/worktrees is in .gitignore
ensure_gitignore() {
  local gitignore="$GIT_ROOT/.gitignore"
  if ! grep -q "^\.github/worktrees$" "$gitignore" 2>/dev/null; then
    echo "" >> "$gitignore"
    echo "# Git worktrees for parallel development" >> "$gitignore"
    echo ".github/worktrees" >> "$gitignore"
    echo -e "${GREEN}Added .github/worktrees to .gitignore${NC}"
  fi
}

# Symlink .env file (convention: symlinks, not copies)
symlink_env() {
  local worktree_path="$1"
  local source_env="$GIT_ROOT/.env"
  local dest_env="$worktree_path/.env"

  if [[ ! -f "$source_env" ]]; then
    echo -e "${YELLOW}No .env file found in project root${NC}"
    return
  fi

  if [[ -L "$dest_env" ]]; then
    echo -e "${YELLOW}.env symlink already exists${NC}"
    return
  fi

  if [[ -f "$dest_env" ]]; then
    echo -e "${YELLOW}.env file exists (not symlink), backing up${NC}"
    mv "$dest_env" "${dest_env}.backup"
  fi

  # Compute relative path dynamically using python3
  local relative_path
  relative_path=$(python3 -c "import os; print(os.path.relpath('$source_env', '$worktree_path'))")

  # Create symlink
  (cd "$worktree_path" && ln -s "$relative_path" .env)

  # Verify symlink
  if [[ -L "$dest_env" ]] && [[ -f "$dest_env" ]]; then
    echo -e "${GREEN}Symlinked .env file${NC}"
    ls -la "$dest_env"
  else
    echo -e "${RED}Failed to create .env symlink${NC}"
    return 1
  fi
}

# Create worktree
create_worktree() {
  local branch_name="$1"
  local from_branch="${2:-main}"

  if [[ -z "$branch_name" ]]; then
    echo -e "${RED}Error: Branch name required${NC}"
    echo "Usage: worktree-manager.sh create <branch-name> [from-branch]"
    exit 1
  fi

  # Normalize branch name for directory (replace / with -)
  local dir_name="${branch_name//\//-}"
  local worktree_path="$WORKTREE_DIR/$dir_name"

  # Check if worktree exists
  if [[ -d "$worktree_path" ]]; then
    echo -e "${YELLOW}Worktree already exists: $worktree_path${NC}"
    echo -e "Switch to it? (y/n)"
    read -r response
    if [[ "$response" == "y" ]]; then
      echo -e "${BLUE}cd $worktree_path${NC}"
    fi
    return
  fi

  echo -e "${BLUE}Creating worktree${NC}"
  echo "  Branch: $branch_name"
  echo "  From: $from_branch"
  echo "  Path: $worktree_path"
  echo ""
  echo "Proceed? (y/n)"
  read -r response

  if [[ "$response" != "y" ]]; then
    echo -e "${YELLOW}Cancelled${NC}"
    return
  fi

  # Setup
  mkdir -p "$WORKTREE_DIR"
  ensure_gitignore

  # Strip origin/ prefix if present to avoid double-prepending
  local fetch_ref="$from_branch"
  local checkout_ref="$from_branch"
  if [[ "$from_branch" == origin/* ]]; then
    fetch_ref="${from_branch#origin/}"
    checkout_ref="$from_branch"
  else
    checkout_ref="origin/$from_branch"
  fi

  # Update base branch
  echo -e "${BLUE}Updating $from_branch...${NC}"
  if ! git fetch origin "$fetch_ref" 2>/dev/null; then
    echo -e "${YELLOW}Warning: Failed to fetch $fetch_ref from origin${NC}"
    echo -e "${YELLOW}Continuing with local reference (may be stale)${NC}"
  fi

  # Create worktree
  echo -e "${BLUE}Creating worktree...${NC}"
  git worktree add -b "$branch_name" "$worktree_path" "$checkout_ref"

  # Symlink .env
  symlink_env "$worktree_path"

  echo ""
  echo -e "${GREEN}Worktree created!${NC}"
  echo ""
  echo "To switch to this worktree:"
  echo -e "${BLUE}cd $worktree_path${NC}"
}

# List worktrees
list_worktrees() {
  echo -e "${BLUE}Worktrees in .github/worktrees/:${NC}"
  echo ""

  if [[ ! -d "$WORKTREE_DIR" ]]; then
    echo -e "${YELLOW}No worktrees found${NC}"
    return
  fi

  local count=0
  for worktree_path in "$WORKTREE_DIR"/*; do
    if [[ -d "$worktree_path" && -e "$worktree_path/.git" ]]; then
      count=$((count + 1))
      local name=$(basename "$worktree_path")
      local branch=$(git -C "$worktree_path" rev-parse --abbrev-ref HEAD 2>/dev/null || echo "unknown")
      local env_status=""

      if [[ -L "$worktree_path/.env" ]]; then
        env_status="${GREEN}[.env linked]${NC}"
      elif [[ -f "$worktree_path/.env" ]]; then
        env_status="${YELLOW}[.env copy]${NC}"
      else
        env_status="${RED}[no .env]${NC}"
      fi

      if [[ "$PWD" == "$worktree_path" ]]; then
        echo -e "  ${GREEN}* $name${NC} → $branch $env_status"
      else
        echo -e "    $name → $branch $env_status"
      fi
    fi
  done

  if [[ $count -eq 0 ]]; then
    echo -e "${YELLOW}No worktrees found${NC}"
  else
    echo ""
    echo -e "Total: $count worktree(s)"
  fi

  echo ""
  echo -e "${BLUE}Main repo:${NC}"
  echo "  Branch: $(git rev-parse --abbrev-ref HEAD)"
  echo "  Path: $GIT_ROOT"
}

# Switch to worktree
switch_worktree() {
  local name="$1"

  if [[ -z "$name" ]]; then
    list_worktrees
    echo ""
    echo -e "Enter worktree name to switch:"
    read -r name
  fi

  local worktree_path="$WORKTREE_DIR/$name"

  if [[ ! -d "$worktree_path" ]]; then
    echo -e "${RED}Worktree not found: $name${NC}"
    list_worktrees
    exit 1
  fi

  echo -e "${GREEN}Switch to: $worktree_path${NC}"
  echo -e "${BLUE}cd $worktree_path${NC}"
}

# Cleanup worktrees
cleanup_worktrees() {
  if [[ ! -d "$WORKTREE_DIR" ]]; then
    echo -e "${YELLOW}No worktrees to clean${NC}"
    return
  fi

  echo -e "${BLUE}Checking worktrees...${NC}"
  echo ""

  local to_remove=()
  for worktree_path in "$WORKTREE_DIR"/*; do
    if [[ -d "$worktree_path" && -e "$worktree_path/.git" ]]; then
      local name=$(basename "$worktree_path")

      if [[ "$PWD" == "$worktree_path" ]]; then
        echo -e "${YELLOW}(skip) $name - currently active${NC}"
        continue
      fi

      to_remove+=("$worktree_path")
      echo -e "  • $name"
    fi
  done

  if [[ ${#to_remove[@]} -eq 0 ]]; then
    echo -e "${GREEN}No inactive worktrees to clean${NC}"
    return
  fi

  echo ""
  echo -e "Remove ${#to_remove[@]} worktree(s)? (y/n)"
  read -r response

  if [[ "$response" != "y" ]]; then
    echo -e "${YELLOW}Cancelled${NC}"
    return
  fi

  for worktree_path in "${to_remove[@]}"; do
    local name=$(basename "$worktree_path")

    # Check for uncommitted changes before force removal
    if git -C "$worktree_path" diff --quiet && git -C "$worktree_path" diff --cached --quiet 2>/dev/null; then
      git worktree remove "$worktree_path" --force 2>/dev/null || true
      echo -e "${GREEN}Removed: $name${NC}"
    else
      echo -e "${YELLOW}Warning: $name has uncommitted changes${NC}"
      echo -e "  Force remove anyway? (y/n)"
      read -r force_response
      if [[ "$force_response" == "y" ]]; then
        git worktree remove "$worktree_path" --force 2>/dev/null || true
        echo -e "${GREEN}Removed: $name${NC}"
      else
        echo -e "${YELLOW}Skipped: $name${NC}"
      fi
    fi
  done

  # Clean empty directory
  if [[ -z "$(ls -A "$WORKTREE_DIR" 2>/dev/null)" ]]; then
    rmdir "$WORKTREE_DIR" 2>/dev/null || true
  fi

  echo -e "${GREEN}Cleanup complete${NC}"
}

# Help
show_help() {
  cat << EOF
Git Worktree Manager

Usage: worktree-manager.sh <command> [options]

Commands:
  create <branch-name> [from-branch]  Create worktree (from-branch defaults to main)
  list | ls                           List all worktrees
  switch | go [name]                  Switch to worktree
  cleanup | clean                     Remove inactive worktrees
  help                                Show this help

Directory: .github/worktrees/
Convention: Uses symlinks for .env (not copies)

Examples:
  worktree-manager.sh create feature/pipeline-steps
  worktree-manager.sh create hotfix/auth develop
  worktree-manager.sh list
  worktree-manager.sh cleanup

EOF
}

# Main
main() {
  local cmd="${1:-list}"

  case "$cmd" in
    create)
      create_worktree "$2" "$3"
      ;;
    list|ls)
      list_worktrees
      ;;
    switch|go)
      switch_worktree "$2"
      ;;
    cleanup|clean)
      cleanup_worktrees
      ;;
    help|-h|--help)
      show_help
      ;;
    *)
      echo -e "${RED}Unknown command: $cmd${NC}"
      show_help
      exit 1
      ;;
  esac
}

main "$@"
