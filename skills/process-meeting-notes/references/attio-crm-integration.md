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

| Stage | Status ID | Meaning |
|-------|-----------|---------|
| Lead | `c3232144-8ed3-423f-bdc5-a9766a8042d2` | New opportunity, no conversation yet |
| In Progress | `3ad19b88-2ecf-4917-8ee4-b7991c2a1cbf` | Discovery done or diagnostic selling |
| Waiting | `4d4c71d2-39ff-4ab1-9c64-1272c8021ac2` | Blocked on external party |
| Nurture | `d4726c6b-1f38-4fe3-ab24-5614551de349` | Long-term relationship, no active deal motion |
| Booked | `613ef098-ed6e-4320-afea-be0351b3ee26` | Engagement scheduled/confirmed |
| Won | `b7254f7f-5d74-42f0-bb1d-ed445099f91c` | Engagement complete (title includes emoji in Attio) |
| Lost | `fbd53783-386b-46a2-be35-4699b16461cc` | Prospect declined or ghosted |

**REST API note:** The `stage` field requires `{"status": "<status_id>"}`, not `{"status": {"title": "..."}}`.
The `associated_people` field requires `{"target_object": "people", "target_record_id": "<id>"}`.

## Valid Stage Transitions (from meetings)

| Current | Target | Trigger |
|---------|--------|---------|
| Lead | In Progress | Discovery/diagnostic call happened, agreed next commercial step |
| Lead | Lost | Prospect declined, ghosted, or call revealed bad fit |
| In Progress | Won | Payment confirmed or contract signed (require explicit user confirmation -- Tally/n8n is normal source of truth) |
| In Progress | Lost | Explicit no from prospect |
| Waiting | In Progress | Blocker resolved, active deal motion resumes |
| Waiting | Lost | Prospect went dark or declined while waiting |
| Nurture | Lead | Re-engaged prospect, new opportunity surfaced |
| Nurture | (no transition) | Update next_step only -- nurture meetings maintain relationship |
| Booked | Won | Payment confirmed or contract signed (require explicit user confirmation) |
| Booked | In Progress | Engagement rescheduled or scope renegotiation needed |
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
        "stage": [{"status": "c3232144-8ed3-423f-bdc5-a9766a8042d2"}],
        "owner": [{"referenced_actor_type": "workspace-member", "referenced_actor_id": "d5828bae-2782-4e17-94d2-a0380207c8a7"}],
        "associated_company": [{"target_record_id": "COMPANY_RECORD_ID"}],
        "associated_people": [{"target_object": "people", "target_record_id": "PERSON_RECORD_ID"}]
      }
    }
  }'
```

On 4xx/5xx: report error, skip CRM steps. Do not leave a partial deal.

## Ben's Workspace Member ID

`d5828bae-2782-4e17-94d2-a0380207c8a7`
