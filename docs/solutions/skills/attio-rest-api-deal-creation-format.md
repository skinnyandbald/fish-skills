---
module: skills
tags: [process-meeting-notes, attio, crm, rest-api, deal-creation]
problem_type: config
severity: high
date_discovered: 2026-05-26
---
# Problem

The Attio CRM reference doc for the process-meeting-notes skill had incorrect REST API field formats for deal creation, and was missing 3 of 7 deal stages. Live deal creation failed with 400 errors until the correct formats were discovered empirically.

# Symptoms

- `curl` POST to `/v2/objects/deals/records` returns 400 with `"Expected string, received object"` on the `stage` field
- Second attempt returns 400 with `"Missing target_object on record reference value"` on `associated_people`
- Reference doc listed only 4 stages (Lead, In Progress, Won, Lost) but the actual workspace has 7

# Root Cause

Three issues in the original reference doc:

1. **Stage field format:** The `stage` attribute is type `status`. The REST API requires `{"status": "<status_id>"}` where `status_id` is a UUID. The original template used `{"status": {"title": "Lead"}}` (object, not string). The MCP `update-record` tool accepts stage names directly (e.g., `"stage": "In Progress"`) because the MCP server resolves names to IDs internally — but the REST API does not.

2. **Record reference format:** `associated_people` and `associated_company` are record-reference attributes. They require `{"target_object": "people", "target_record_id": "<uuid>"}`. The original template omitted `target_object`.

3. **Missing stages:** The workspace has 7 stages (Lead, In Progress, Waiting, Nurture, Booked, Won, Lost). The "Won" stage title includes an emoji ("Won :tada:"). Only 4 were documented.

# Solution

- Query `/v2/objects/deals/attributes/stage/statuses` to get all stage status IDs
- Use `{"status": "<status_id>"}` (string, not object) in the REST API curl template
- Add `"target_object"` to all record-reference fields
- Document all 7 stages with their UUIDs
- Add a note distinguishing MCP (accepts names) from REST API (requires status IDs)

# Prevention

- When documenting API formats, verify against the actual API (not just the MCP tool interface) — MCP servers often abstract away format details
- Query attribute metadata endpoints (`/v2/objects/{object}/attributes/{slug}/statuses`) to discover all options rather than documenting from memory
- Test curl templates with a real API call before committing them to reference docs
