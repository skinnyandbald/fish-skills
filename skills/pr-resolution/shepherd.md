# PR Resolution Shepherd

> **Background agent workflow.** This document is read by a Claude Code background agent.
> It monitors a PR for new bot review comments and autonomously re-resolves them.
>
> **Reference:** `references/shepherd-states.md` for state machine diagram.

## CRITICAL RULES

- **DO NOT prompt the user or ask questions.** You are running in background mode.
- **DO NOT proceed to RE_RESOLVE unless bot_comment_count > 0.**
- **DO NOT call `resolve-all-threads`.** Only resolve threads from the current iteration.
- **On ANY error, exit with a status report. Do not retry.**
- **On human-only comments, exit immediately with a report. Do not attempt resolution.**

## Setup

Parse the context JSON from your launch prompt to extract these variables:

| Variable | Description |
|----------|-------------|
| `PR_NUM` | Pull request number |
| `LAST_TIMESTAMP` | ISO 8601 UTC timestamp from Phase 5b |
| `OWNER_REPO` | `owner/repo` string |
| `BRANCH` | Git branch name |
| `RUN_ID` | Unix timestamp for summary comment idempotency |

Initialize state:

```bash
START_TIME=$(date +%s)
ITERATION_COUNT=0
FILE_FLAGS='{}'  # JSON object: { "path": count }
SKIP_LIST='[]'   # JSON array of file paths
BATCHED_QUESTIONS='[]'  # JSON array of { file, comment, bot }
```

Split OWNER_REPO:
```bash
OWNER="${OWNER_REPO%/*}"
REPO="${OWNER_REPO#*/}"
```

Resolve the skill directory for script paths:
```bash
SKILL_DIR=$(find ~/.claude/skills -name "pr-resolution" -type d 2>/dev/null | head -1)
if [ -z "$SKILL_DIR" ]; then
  SKILL_DIR=$(find .claude/skills -name "pr-resolution" -type d 2>/dev/null | head -1)
fi
```

## State Machine

### INITIAL_POLL

1. Wait 60 seconds for bots to respond to the push:
   ```bash
   sleep 60
   ```

2. Check for new comments:
   ```bash
   POLL_RESULT=$("$SKILL_DIR/bin/check-new-comments" "$PR_NUM" "$LAST_TIMESTAMP" "$OWNER_REPO")
   ```

3. Route the result:
   ```bash
   ROUTE=$(cd "$SKILL_DIR" && npx tsx lib/shepherd-state.ts route "$POLL_RESULT")
   ACTION=$(echo "$ROUTE" | jq -r '.action')
   ```

4. Follow the action:
   - `RE_RESOLVE` → go to **RE_RESOLVE**
   - `EXIT_HUMAN_REVIEW` → go to **POST_SUMMARY** with reason "human_review"
   - `POST_SUMMARY` → go to **POST_SUMMARY** (merged or closed)
   - `EXIT_ERROR` → go to **POST_SUMMARY** with error details
   - `CONTINUE_WATCHING` → go to **WATCHING**

### WATCHING

1. Wait 60 seconds:
   ```bash
   sleep 60
   ```

2. Check wall-clock timeout:
   ```bash
   ELAPSED=$(( $(date +%s) - START_TIME ))
   TIMEOUT_CHECK=$(cd "$SKILL_DIR" && npx tsx lib/shepherd-state.ts should-timeout "{\"elapsed\":$ELAPSED}")
   if [ "$(echo "$TIMEOUT_CHECK" | jq -r '.timeout')" = "true" ]; then
     # → go to POST_SUMMARY with reason "timeout"
   fi
   ```

3. Check for new comments:
   ```bash
   POLL_RESULT=$("$SKILL_DIR/bin/check-new-comments" "$PR_NUM" "$LAST_TIMESTAMP" "$OWNER_REPO")
   ```

4. Route and follow action (same as INITIAL_POLL step 3-4).

### RE_RESOLVE

1. Increment iteration count:
   ```bash
   ITERATION_COUNT=$((ITERATION_COUNT + 1))
   ```

2. **Shepherd Discovery** — fetch thread IDs for new bot comments:
   ```bash
   THREADS_RAW=$(gh api graphql --paginate --slurp -f query='
     query($owner: String!, $repo: String!, $pr: Int!, $endCursor: String) {
       repository(owner: $owner, name: $repo) {
         pullRequest(number: $pr) {
           reviewThreads(first: 100, after: $endCursor) {
             nodes {
               id
               path
               isResolved
               comments(last: 1) {
                 nodes { createdAt author { login } body }
               }
             }
             pageInfo { hasNextPage endCursor }
           }
         }
       }
     }
   ' -F owner="$OWNER" -F repo="$REPO" -F pr="$PR_NUM")

   # Flatten paginated results and extract thread info (including path for file flag tracking)
   THREADS=$(echo "$THREADS_RAW" | jq '[.[].data.repository.pullRequest.reviewThreads.nodes[] | {
     id: .id,
     path: .path,
     isResolved: .isResolved,
     lastAuthor: .comments.nodes[0].author.login,
     lastCreatedAt: .comments.nodes[0].createdAt,
     lastBody: .comments.nodes[0].body
   }]')

   # Check for GraphQL errors in the response
   GRAPHQL_ERRORS=$(echo "$THREADS_RAW" | jq '[.[].errors // [] | .[]] | length')
   if [ "$GRAPHQL_ERRORS" -gt 0 ]; then
     echo "Warning: GraphQL returned $GRAPHQL_ERRORS partial errors" >&2
     # Continue with whatever data we got
   fi
   ```

3. **Filter threads** — only unresolved bot threads newer than LAST_TIMESTAMP:
   ```bash
   THREAD_IDS=$(cd "$SKILL_DIR" && npx tsx lib/shepherd-state.ts filter-threads \
     "{\"threads\":$THREADS,\"last_timestamp\":\"$LAST_TIMESTAMP\"}")
   ```
   If zero actionable threads → go back to **INITIAL_POLL** (no work to do).

4. **Parse CodeRabbit reviews** (if any new reviews from CodeRabbit):
   ```bash
   "$SKILL_DIR/bin/parse-coderabbit-review" "$PR_NUM"
   ```

5. **Classification (Phase 2)** — classify each comment:
   - **First:** Read `$SKILL_DIR/references/classification.md` and `$SKILL_DIR/references/bot-formats.md` for classification rules and bot comment format examples. These are essential context for correct classification.
   - Read the thread body from the discovery data
   - Comments on files in SKIP_LIST → auto-classified as `acknowledged`
   - Comments classified as `question` → add to BATCHED_QUESTIONS, exclude from fixing
   - Group remaining comments by file

6. **Execution (Phase 3)** — fix comments **sequentially** (not parallel):
   - For each file group, read the file, apply the fix, verify the change
   - **DO NOT launch parallel sub-agents** — background agents should not spawn nested agents

7. **Verification (Phase 4)** — run local checks:
   - Lint, typecheck, test (same as standard Phase 4)
   - If checks fail, attempt to fix. If still failing → go to **POST_SUMMARY** with error

8. **Commit and push:**
   ```bash
   git add -A

   # Skip commit if nothing staged (ack-only or question-only round)
   if git diff --cached --quiet; then
     # No changes to commit — skip to thread resolution
   else
     git commit -m "fix: address PR review feedback (shepherd round $ITERATION_COUNT)"
     LAST_TIMESTAMP=$(date -u +%Y-%m-%dT%H:%M:%SZ)
     PUSH_ERR=$(mktemp)
     trap 'rm -f "$PUSH_ERR"' EXIT
     if ! git push 2>"$PUSH_ERR"; then
       PUSH_ERROR=$(cat "$PUSH_ERR")
       # → go to POST_SUMMARY with reason "push_failed" and PUSH_ERROR
     fi
   fi
   ```

9. **Resolve bot threads** from this iteration only:
   ```bash
   # Resolve fixable threads and SKIP_LIST threads (NOT question threads)
   # For each thread ID from step 3 (excluding questions added to BATCHED_QUESTIONS):
   "$SKILL_DIR/bin/resolve-pr-thread" "$THREAD_ID"
   ```

   **For files in SKIP_LIST:** Post acknowledgment reply first:
   ```bash
   gh api -X POST "/repos/$OWNER/$REPO/issues/$PR_NUM/comments" \
     -f body="Acknowledged — this file has been flagged multiple times and is being skipped per shepherd policy. A human will review."
   "$SKILL_DIR/bin/resolve-pr-thread" "$THREAD_ID"
   ```

10. **Track file flags:**
    ```bash
    # Extract file paths from threads touched in this iteration (using .path from GraphQL, not body parsing)
    FILES_JSON=$(jq -n --argjson threads "$THREADS" --argjson thread_ids "$THREAD_IDS" '$threads | map(select(.id as $id | $thread_ids | index($id))) | map(.path) | unique')

    FLAG_RESULT=$(cd "$SKILL_DIR" && npx tsx lib/shepherd-state.ts track-flags \
      "{\"files\":$FILES_JSON,\"current_flags\":$FILE_FLAGS}")

    FILE_FLAGS=$(echo "$FLAG_RESULT" | jq '.flags')
    SKIP_LIST=$(echo "$FLAG_RESULT" | jq '.skip_list')

    if [ "$(echo "$FLAG_RESULT" | jq -r '.escalate')" = "true" ]; then
      ESCALATION_FILE=$(echo "$FLAG_RESULT" | jq -r '.escalation_file')
      # → go to POST_SUMMARY with reason "escalation"
    fi
    ```

11. Go back to **INITIAL_POLL** (restart polling after push).

### POST_SUMMARY

Post or update a summary comment on the PR. Skip if ITERATION_COUNT == 0 (no noise on clean PRs).

1. Build summary body:
   ```markdown
   <!-- pr-resolution-shepherd-summary run:$RUN_ID -->
   ## Shepherd Summary
   - **Monitoring duration:** [elapsed minutes] minutes
   - **Iterations:** $ITERATION_COUNT
   - **Comments resolved:** [count] ([breakdown by source])
   - **Files skipped:** [skip list count]
   - **Exit reason:** [reason]
   [If BATCHED_QUESTIONS not empty:]
   ### Unanswered Questions
   [list each question with file, comment, bot]
   [If escalation:]
   ### Escalation
   [file name, flag count, latest bot comment]
   ```

2. Find existing summary for this run:
   ```bash
   EXISTING=$(gh api "/repos/$OWNER/$REPO/issues/$PR_NUM/comments" --paginate --slurp \
     | jq --arg rid "$RUN_ID" 'add // [] | map(select(.body | contains("run:" + $rid))) | sort_by(.created_at) | last')
   COMMENT_ID=$(echo "$EXISTING" | jq -r '.id // empty')
   ```

3. Upsert:
   ```bash
   if [ -n "$COMMENT_ID" ]; then
     gh api -X PATCH "/repos/$OWNER/$REPO/issues/comments/$COMMENT_ID" -f body="$SUMMARY"
   else
     gh api -X POST "/repos/$OWNER/$REPO/issues/$PR_NUM/comments" -f body="$SUMMARY"
   fi
   ```
   If the API call fails, include the error in the exit report but do not retry.

4. **Exit** with a status report to the user's main session:

   **For merged:**
   ```
   PR #$PR_NUM merged successfully.
   Shepherd completed $ITERATION_COUNT iteration(s), resolving [N] bot comments.
   ```

   **For timeout:**
   ```
   PR #$PR_NUM shepherd timed out after 2 hours.
   Completed $ITERATION_COUNT iteration(s). Run /pr-resolution again to continue.
   ```

   **For escalation:**
   ```
   PR #$PR_NUM shepherd exiting: $ESCALATION_FILE flagged $COUNT times.
   Latest comment: "[summary]"
   Fix manually, then run /pr-resolution for another pass.
   ```

   **For human review:**
   ```
   PR #$PR_NUM has new human comments. Shepherd exiting for human review.
   Comments from: [list of authors]
   ```

   **For error:**
   ```
   PR #$PR_NUM shepherd error: [error details]
   Last successful state: [state]. Run /pr-resolution to retry.
   ```
