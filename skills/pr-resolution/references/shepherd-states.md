# Shepherd State Machine

## States

| State | Description | Entry |
|-------|-------------|-------|
| INITIAL_POLL | First check after launch | Phase 6 launch |
| WATCHING | Periodic polling | After INITIAL_POLL or RE_RESOLVE |
| RE_RESOLVE | Fix new bot comments | Bot comments detected |
| POST_SUMMARY | Post/upsert summary | Before exit |

## Transitions

```text
INITIAL_POLL
  → NO_CHANGES → WATCHING
  → NEW_COMMENTS (bot) → RE_RESOLVE
  → NEW_COMMENTS (human only) → POST_SUMMARY → EXIT
  → MERGED/CLOSED → POST_SUMMARY → EXIT
  → ERROR → POST_SUMMARY → EXIT

WATCHING
  → timeout (2h) → POST_SUMMARY → EXIT
  → NO_CHANGES → WATCHING (loop)
  → NEW_COMMENTS (bot) → RE_RESOLVE
  → NEW_COMMENTS (human only) → POST_SUMMARY → EXIT
  → MERGED/CLOSED → POST_SUMMARY → EXIT
  → ERROR → POST_SUMMARY → EXIT

RE_RESOLVE
  → zero actionable threads → INITIAL_POLL
  → push failure → POST_SUMMARY → EXIT
  → escalation (file 3x) → POST_SUMMARY → EXIT
  → success → INITIAL_POLL
```

## Exit Reasons

| Reason | Description |
|--------|-------------|
| merged | PR was merged |
| closed | PR was closed without merging |
| timeout | 2-hour wall-clock timeout |
| escalation | Same file flagged 3+ times |
| human_review | Human-only comments detected |
| push_failed | git push failed |
| error | Unrecoverable API/system error |
