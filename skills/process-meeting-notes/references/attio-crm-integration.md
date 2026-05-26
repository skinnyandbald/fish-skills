# Attio CRM Integration Reference

## MCP Tool Inventory

| Tool | Purpose | Works? |
|------|---------|--------|
| `search-records` | Find deals by company/person | Yes |
| `get-records-by-ids` | Fetch deal by known ID | Yes |
| `update-record` | Update deal stage, next_step | Yes |
| `list-tasks` | List tasks on a deal | Yes |
| `create-task` | Create new task linked to deal | Yes |
| `update-task` | Complete existing tasks | Yes |
| `create_record` (deals) | Create new deal | NO -- owner field (actor-reference) unsupported |

## Deal Stages

| Stage | Meaning |
|-------|---------|
| Lead | New opportunity, no conversation yet |
| In Progress | Discovery done or diagnostic selling |
| Won | Engagement complete |
| Lost | Prospect declined or ghosted |

## Valid Stage Transitions (from meetings)

| Current | Target | Trigger |
|---------|--------|---------|
| Lead | In Progress | Discovery/diagnostic call happened, agreed next commercial step |
| Lead | Lost | Prospect declined, ghosted, or call revealed bad fit |
| In Progress | Won | Payment confirmed or contract signed (require explicit user confirmation -- Tally/n8n is normal source of truth) |
| In Progress | Lost | Explicit no from prospect |
| Won | (no transition) | Update next_step only -- delivery meetings don't re-trigger pipeline |
| Lost | (no transition) | Update next_step only if actionable follow-ups exist |

## Consulting Task Templates (for matching)

These are the exact template strings from `deal-creation-tasks.md`. Use for
matching existing tasks and deduplicating new task creation. Replace
`{Company}` and `{Name}` with the actual company/contact name before matching.

### Lead Stage Templates
- `Qualify {Company} -- run /scope-gate in Claude`
- `Send intro/availability email to {Name}`
- `LinkedIn connect + personalized DM to {Name}`
- `Schedule discovery call with {Name} at {Company}`
- `Pre-call research -- run /deal-prep in Claude for {Company}`

### In Progress Stage Templates
- `Send diagnostic proposal to {Name} -- check /offer-check for pricing`
- `Follow up with {Name} if no response on diagnostic`

### Won Stage Templates
- `Generate invoice for {Company} -- run /invoice in Claude`
- `Run /post-call-review in Claude for {Company} engagement`
- `Update consulting-state.md with {Company} outcome`

## CRM-Relevant Meeting Signals

A meeting is CRM-relevant when 2+ of these signals are present:

1. `meeting_type` is `sales`, `discovery`, `client`, or `diagnostic`
2. Fireflies summary keywords contain: pricing, proposal, diagnostic, engagement, retainer, sprint, consulting, quote, SOW
3. Participant emails match an Attio person or company linked to an **active deal** (stage = Lead or In Progress)
4. Meeting note frontmatter contains `attio_deal_id` (strongest -- skip detection)

If only 1 signal: ask user. If 0 signals: skip silently.

## REST API -- Deal Creation (when MCP fails)

Only used when user explicitly requests deal creation and no deal exists.

```bash
curl -s -X POST "https://api.attio.com/v2/objects/deals/records" \
  -H "Authorization: Bearer ${ATTIO_API_KEY}" \
  -H "Content-Type: application/json" \
  -d '{
    "data": {
      "values": {
        "name": [{"value": "DEAL_NAME"}],
        "stage": [{"status": {"title": "Lead"}}],
        "owner": [{"referenced_actor_type": "workspace-member", "referenced_actor_id": "d5828bae-2782-4e17-94d2-a0380207c8a7"}],
        "associated_company": [{"target_record_id": "COMPANY_RECORD_ID"}],
        "associated_people": [{"target_record_id": "PERSON_RECORD_ID"}]
      }
    }
  }'
```

On 4xx/5xx: report error, skip CRM steps. Do not leave a partial deal.

## Ben's Workspace Member ID

`d5828bae-2782-4e17-94d2-a0380207c8a7`
