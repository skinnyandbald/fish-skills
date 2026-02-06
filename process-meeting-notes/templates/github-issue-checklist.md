# GitHub Issue Template with Implementation Checklist

<template_instructions>
Use this template when creating GitHub issues from meeting action items. The checklist helps developers understand the current architecture context before implementing.
</template_instructions>

<template>
```markdown
## Context

**From Meeting:** [Meeting date and title]
**Discussed By:** [Participants who discussed this]

> "[Direct quote from meeting transcript if available]"

## Description

[Clear description of what needs to be done]

## Implementation Checklist

Before implementing, verify the current state:

- [ ] **Current Architecture:** [Where does related code currently live?]
- [ ] **Related Files:** [Which files would need modification?]
- [ ] **Dependencies:** [What other features/code does this touch?]
- [ ] **Database Impact:** [Any schema changes needed?]
- [ ] **API Changes:** [Any endpoint modifications?]
- [ ] **Testing Considerations:** [What tests exist? What new tests needed?]

## Acceptance Criteria

- [ ] [Specific criterion 1]
- [ ] [Specific criterion 2]
- [ ] [Specific criterion 3]

## Questions to Answer

<!-- Things that need clarification before or during implementation -->

- [ ] [Question 1]
- [ ] [Question 2]

## Related

- Related Issue: #[number] (if any)
- Milestone: [Slice N] (if applicable)
- Blocks/Blocked by: #[number] (if any)
```
</template>

<checklist_guidance>
**Implementation Checklist Purpose:**
The checklist exists so developers (human or AI) can research the codebase BEFORE writing code. Each checkbox prompts investigation:

- **Current Architecture**: Forces reading existing code patterns
- **Related Files**: Identifies scope of changes
- **Dependencies**: Prevents breaking other features
- **Database Impact**: Catches migration needs early
- **API Changes**: Identifies integration points
- **Testing Considerations**: Ensures test coverage

**How to Fill Checklist from Meeting:**
If the meeting discussed WHERE something should go or HOW it might work, include those hints. Otherwise, leave checkboxes empty for developer to fill during exploration phase.

**Example - Filled vs Empty:**

*Meeting provided context:*
```markdown
- [ ] **Current Architecture:** Auth logic is in `src/lib/auth/` - webhook handlers in `src/app/api/webhooks/`
```

*No context from meeting:*
```markdown
- [ ] **Current Architecture:** [Investigate where related code lives]
```
</checklist_guidance>
