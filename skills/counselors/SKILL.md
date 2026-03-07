---
name: counselors
description: Fan out a prompt to multiple AI coding agents in parallel and synthesize their responses.
---

# Counselors — Multi-Agent Review Skill

Fan out a prompt to multiple AI coding agents in parallel and synthesize their responses.

Arguments: $ARGUMENTS

**If no arguments provided**, ask the user what they want reviewed.

---

## Phase 1: Context Gathering

Parse `$ARGUMENTS` to understand what the user wants reviewed. Then auto-gather relevant context:

1. **Files mentioned in the prompt**: Use Glob/Grep to find files referenced by name, class, function, or keyword
2. **Recent changes**: Run `git diff HEAD` and `git diff --staged` to capture recent work
3. **Related code**: Search for key terms from the prompt and read the most relevant files (up to 5 files, ~50KB total cap)

Be selective — don't dump the entire codebase. Pick the most relevant code sections.

---

## Phase 2: Agent Selection

**Default agents:** `claude-opus`, `gemini-3-pro-preview`, `codex-5.4-medium`

1. **Use defaults unless the user overrides.** If `$ARGUMENTS` does not contain agent-selection instructions (e.g. "use all agents", "add codex", "only gemini"), skip directly to the confirmation step with the defaults.

2. **If the user requests different agents** (in `$ARGUMENTS` or via follow-up), discover available agents by running via Bash:
   ```bash
   counselors ls
   ```
   Print the full output, then ask the user to pick using AskUserQuestion.

   **If 4 or fewer agents**: Use AskUserQuestion with `multiSelect: true`, one option per agent.

   **If more than 4 agents**: AskUserQuestion only supports 4 options. Use these fixed options:
   - Option 1: "All [N] agents" — sends to every configured agent
   - Option 2-4: The first 3 individual agents by ID
   - The user can always select "Other" to type a comma-separated list of agent IDs from the printed list above

   Do NOT combine agents into preset groups (e.g. "claude + codex + gemini"). Each option must be a single agent or "All".

3. **MANDATORY: Confirm the selection before continuing.** Echo back the exact list you will dispatch to:

   > Dispatching to: **claude-opus**, **gemini-3-pro-preview**, **amp-smart**

   Then ask the user to confirm (e.g. "Look good?") before proceeding to Phase 3. This prevents silent tool omissions. If the user corrects the list, update your selection accordingly.

---

## Phase 3: Prompt Assembly

1. **Generate a slug** from the topic (lowercase, hyphens, max 40 chars)
   - "review the auth flow" → `auth-flow-review`
   - "is this migration safe" → `migration-safety-review`

2. **Create the output directory** via Bash. The directory name MUST always be prefixed with a **second-precision** UNIX timestamp so runs are lexically sortable and never collide:
   ```
   ./agents/counselors/TIMESTAMP-[slug]
   ```
   For example: `./agents/counselors/1770676882-auth-flow-review`

   > **Mac tip:** Generate with `date +%s` (seconds since epoch). Millisecond precision is NOT available via `date` on macOS without GNU coreutils — use `date +%s` for portable second-precision timestamps.

3. **Write the prompt file** using the Write tool to `./agents/counselors/TIMESTAMP-[slug]/prompt.md`:

```markdown
# Review Request

## Question
[User's original prompt/question from $ARGUMENTS]

## Context

### Files Referenced
[Contents of the most relevant files found in Phase 1]

### Recent Changes
[git diff output, if any]

### Related Code
[Related files discovered via search]

## Instructions
You are providing an independent review. Be critical and thorough.
- Analyze the question in the context provided
- Identify risks, tradeoffs, and blind spots
- Suggest alternatives if you see better approaches
- Be direct and opinionated — don't hedge
- Structure your response with clear headings
```

---

## Phase 4: Dispatch

Tell the user before dispatching:
> "Dispatching to [N] agents: [list]. This typically takes 1-3 minutes..."

Run counselors via Bash with the prompt file, passing the user's selected agents:

```bash
counselors run -f ./agents/counselors/[slug]/prompt.md --tools [comma-separated-selections] --json
```

Example: `--tools claude,codex,gemini`

Use Bash `timeout: 480000` (8 minutes). The counselors CLI has its own per-tool timeout — the Bash timeout is a hard ceiling so you never hang indefinitely.

**Important**: Use `-f` (file mode) so the prompt is sent as-is without wrapping. Use `--json` to get structured output for parsing.

---

## Phase 5: Read Results

**Immediately after the command returns**, check for failures before reading output:

1. **If the Bash call itself timed out** (no JSON output): Tell the user "Counselors timed out after 8 minutes. Try with fewer agents or check `counselors doctor`." **Stop here.**

2. **Parse the JSON manifest** from stdout and classify each tool:
   - `success` with `wordCount > 0` — genuine success
   - `timeout` — tool exceeded its timeout
   - `error` or non-zero `exitCode` — tool crashed
   - `success` with `wordCount: 0` — **silent failure** (treat as error; read its `stderrFile` for the real error)

3. **If ALL tools failed**: Report each failure with the first 3 lines of its `stderrFile`. Suggest running `counselors doctor`. **Stop here — do not proceed to synthesis.**

4. **If SOME tools failed**: Note failures in one line (e.g. "amp-smart failed (402 — needs paid credits), codex timed out — continuing with 2 of 4 responses") and proceed with successful responses only.

5. **Read each successful agent's response** from the `outputFile` path in the manifest. Skip failed agents entirely.

---

## Phase 6: Synthesize and Present

Combine all agent responses into a synthesis:

```markdown
## Counselors Review

**Agents consulted:** [list of agents that responded]

**Consensus:** [What most agents agree on — key takeaways]

**Disagreements:** [Where they differ, and reasoning behind each position]

**Key Risks:** [Risks or concerns flagged by any agent]

**Blind Spots:** [Things none of the agents addressed that seem important]

**Recommendation:** [Your synthesized recommendation based on all inputs]

---
Reports saved to: [output directory from manifest]
```

Present this synthesis to the user. Be concise — the individual reports are saved for deep reading.

---

## Phase 7: Action (Optional)

After presenting the synthesis, ask the user what they'd like to address. Offer the top 2-3 actionable items from the synthesis as options. If the user wants to act on findings, plan the implementation before making changes.

---

## Error Handling

- **counselors not installed**: Tell the user to install it (`npm install -g counselors`)
- **No tools configured**: Tell the user to run `counselors init` or `counselors add`
- **Bash timeout (no JSON output)**: The entire run exceeded the 8-minute ceiling. Tell the user and stop — do not wait or retry.
- **Single agent fails**: Note it in the synthesis, continue with remaining successful agents.
- **Silent failure** (`status: "success"` but `wordCount: 0`): Read the agent's `.stderr` file. Common causes: expired API key, 402 payment required, rate limit. Report the actual error to the user.
- **All agents fail**: Report the specific error from each agent's stderr file. Suggest `counselors doctor`. Do NOT proceed to synthesis with zero successful responses.
- **Never wait indefinitely**: If something seems stuck, the 8-minute Bash timeout will catch it. Do not add sleep/retry loops.
