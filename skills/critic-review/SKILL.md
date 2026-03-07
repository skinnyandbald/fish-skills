---
name: critic-review
description: Validates implementation plans and code against a structured rubric using GPT-5.4. Gathers current library docs via Context7 first (staleness safeguard), then scores on correctness, completeness, ordering, feasibility, risk, and test coverage. Routes through superpowers:receiving-code-review for post-review triage. Requires OPENAI_API_KEY.
---

# Critic Review

Send a plan, code, or design to GPT-5.4 for structured critique. The key safeguard: Context7 gathers current library documentation *before* the review so the critic grades against reality, not training data.

**Use this when:**
- You have an implementation plan and want to catch gaps before writing code
- You're about to start a phased build and want ordering/dependency validation
- You're working with third-party APIs or libraries where version staleness matters

**Use `/counselors` instead when:**
- You want multiple models' perspectives on an architecture decision (divergent opinions)
- You're in the exploration phase, not the validation phase

Arguments: $ARGUMENTS

---

## Phase 1: Get the Content

If `$ARGUMENTS` contains a file path, read that file. If it contains inline content, use that directly.

If no content is provided, ask the user:

> "Paste the plan, code, or design you'd like reviewed, or provide a file path."

Once you have the content, confirm the scope in one line:

> "Reviewing: [brief description of what you received]"

---

## Phase 2: Technology Scan

Scan the content for libraries, frameworks, APIs, services, and runtime environments. List them briefly — this drives the documentation gathering step.

Example: "Found: Next.js, Supabase JS, Anthropic SDK, Inngest"

If no specific libraries are identifiable (e.g. it's a pure architecture diagram), skip to Phase 3 with a note that staleness checking is not applicable.

---

## Phase 3: Documentation Gathering (Staleness Safeguard)

For each key technology identified in Phase 2, gather current documentation using Context7. This is what makes the review trustworthy — the critic will know what's current, not just what was current at training time.

**For each technology (up to 5 technologies, 2-3 snippets each):**

1. Use `mcp__plugin_compound-engineering_context7__resolve-library-id` to get the Context7 library ID
2. Use `mcp__plugin_compound-engineering_context7__query-docs` to fetch relevant snippets — focus queries on APIs, configuration, and breaking changes

**Limits:**
- Cap total reference documentation at ~8,000 tokens. Trim or summarize the least relevant snippets if exceeded.
- If Context7 fails or a library isn't found: add a note `(Context7 unavailable — docs not verified for [library])` and continue.
- If Context7 doesn't cover a library, try `WebFetch` on `[library-website]/llms.txt` as a fallback.

Build a REFERENCE DOCUMENTATION section from the gathered snippets. Include the library name and version in each entry.

---

## Phase 4: Build the Review Prompt

Assemble the full prompt using this exact structure:

```
RUBRIC:
Evaluate along these dimensions:

CORRECTNESS: Will it actually work? Check for wrong APIs, missing error paths, race conditions, incorrect assumptions about libraries or services.

COMPLETENESS: Are there gaps? Missing tasks, unhandled edge cases, steps that assume something not set up yet, missing rollback paths.

ORDERING & DEPENDENCIES: Are tasks in the right order? Does any task depend on something not yet done? Would a different order reduce risk or rework?

FEASIBILITY: Are there steps that sound simple but are actually hard? Underestimated complexity? Dependencies on external services that might not behave as assumed?

RISK: What could go wrong in production? Data loss paths, security issues, cost exposure (especially cloud services), missing monitoring or alerting.

TEST COVERAGE: If the plan includes tests, do they actually verify the implementation? Are assertions too loose? Are error paths tested? Are there missing test cases that would catch real bugs?

## Response Format

Use this exact structure:

### Score: X/10
One sentence overall assessment.

### Critical Issues
Things that will cause failures or data loss. Each item: task/step reference, what's wrong, concrete fix.

### Major Issues
Things that will cause significant problems or rework. Same format.

### Minor Issues
Style, naming, small improvements. Same format.

### Missing
Requirements or edge cases not addressed. What's missing and where it should go.

### Questions
Things you can't assess without more context. Be specific about what you need to know.

REFERENCE DOCUMENTATION:
[Gathered docs from Phase 3 go here]

IMPORTANT: Flag any libraries, models, APIs, or patterns in the content that may be outdated, deprecated, or superseded. The reference documentation section above contains current versions — use it to catch staleness issues.

CONTENT TO REVIEW:
[Plan/code/design content goes here]
```

---

## Phase 5: Call GPT-5.4

Make the OpenAI Responses API call via Bash:

```bash
REVIEW=$(curl -s https://api.openai.com/v1/responses \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer $OPENAI_API_KEY" \
  -d '{
    "model": "gpt-5.4",
    "instructions": "You are a senior staff engineer. First, identify the technologies, languages, frameworks, and services mentioned in the content below. Then assume deep expertise in those specific areas for your review.\n\nYour reviews are direct, specific, and actionable. You reference exact task numbers, step names, file paths, and code snippets. You never pad with praise — if something is good, silence is approval.",
    "input": "[assembled prompt from Phase 4]"
  }')
echo "$REVIEW"
```

**Error handling:**
- If `OPENAI_API_KEY` is not set: stop and tell the user — `OPENAI_API_KEY is not set. Add it to your shell profile or .env file and retry.`
- If the API returns an error status: display the status and body. Do not retry silently.
- Parse `output_text` from the response. If empty, check `output[].content[].text` as fallback.

**Timeout:** Set curl `--max-time 120` (2 minutes).

---

## Phase 6: Present the Review

Display the GPT-5.4 response as-is — it uses the structured format specified in Phase 4. Do not summarize or reformat it.

After presenting, add one line:

> "Running post-review triage via receiving-code-review..."

---

## Phase 7: Post-Review Triage

Invoke the `superpowers:receiving-code-review` skill. This lets Claude evaluate the critic's findings, identify which are valid, flag any based on outdated information (cross-referenced against the docs gathered in Phase 3), and propose concrete next steps.

If the superpowers skill is not available, instead:
- Identify which issues from the review are clearly valid
- Flag any recommendations that may conflict with the reference documentation gathered in Phase 3
- Propose the top 3 actionable next steps

---

## Phase 8: Offer Next Steps

After triage, ask the user:

> "Would you like to (a) address a specific issue, (b) re-run with a custom rubric, or (c) send this to `/counselors` for multi-model perspective?"

Option (c) is useful when the critic flags structural or architectural concerns that benefit from multiple models weighing in.
