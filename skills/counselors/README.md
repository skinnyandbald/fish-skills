# Counselors Skill

Fan out a prompt to multiple AI coding agents in parallel and synthesize their responses. Built on [aarondfrancis/counselors](https://github.com/aarondfrancis/counselors).

## Prerequisites

```bash
npm install -g counselors
counselors init
```

## Usage

```
/counselors review the auth flow for security issues
/counselors is this database migration safe to run?
/counselors review my recent changes for bugs
```

If invoked without arguments, the skill will ask what you want reviewed.

## How it works

1. **Gathers context** — finds relevant files, recent git changes, and related code
2. **Lists agents** — runs `counselors ls` and asks you to pick which agents to consult
3. **Assembles a prompt** — writes a structured review request to `./agents/counselors/`
4. **Dispatches in parallel** — sends to all selected agents simultaneously via `counselors run`
5. **Synthesizes results** — reads all responses and presents consensus, disagreements, risks, and a recommendation

## OpenRouter setup (single API key for all models)

The default counselors setup requires separate API keys for each provider (Anthropic, OpenAI, Google). If you'd rather use one key for everything, OpenRouter works as a unified gateway. This uses counselors' built-in custom adapter — no fork required.

### Quick setup

Have Claude Code read this file and implement the solution:

```
Read skills/counselors/README.md and set up the OpenRouter integration for counselors
```

Or do it manually:

### Manual setup

**1. Get an OpenRouter API key** at https://openrouter.ai/keys and add it to your environment:

```bash
echo 'OPENROUTER_API_KEY="sk-or-v1-your-key-here"' >> ~/.env
```

**2. Install the wrapper script** (bundled in this skill):

```bash
cp skills/counselors/openrouter-agent ~/.local/bin/
chmod +x ~/.local/bin/openrouter-agent
```

**3. Add models to counselors config** (`~/.config/counselors/config.json`):

Add entries to the `"tools"` object — one per model you want to use. Each points to the same wrapper script with a different `--model` flag:

```json
"or-claude-sonnet": {
  "binary": "/Users/YOU/.local/bin/openrouter-agent",
  "readOnly": { "level": "enforced" },
  "stdin": true,
  "custom": true,
  "extraFlags": ["--model", "anthropic/claude-sonnet-4"]
},
"or-gpt-4o": {
  "binary": "/Users/YOU/.local/bin/openrouter-agent",
  "readOnly": { "level": "enforced" },
  "stdin": true,
  "custom": true,
  "extraFlags": ["--model", "openai/gpt-4o"]
},
"or-gemini-3.1-pro": {
  "binary": "/Users/YOU/.local/bin/openrouter-agent",
  "readOnly": { "level": "enforced" },
  "stdin": true,
  "custom": true,
  "extraFlags": ["--model", "google/gemini-3.1-pro-preview"]
}
```

Replace `/Users/YOU/` with your home directory. Browse all available models at [openrouter.ai/models](https://openrouter.ai/models).

**4. Optionally create a group** for easy selection:

```json
"groups": {
  "openrouter": ["or-claude-sonnet", "or-gpt-4o", "or-gemini-3.1-pro"]
}
```

**5. Verify:** `counselors ls` should show your new tools.

### Trade-offs: native CLIs vs. OpenRouter

| | Native CLIs (`claude`, `codex`, `gemini`) | OpenRouter wrapper |
|---|---|---|
| API keys | One per provider | One key total |
| Capabilities | Agentic — reads files, uses tools, iterates | Single-shot prompt/response |
| Cost | Direct pricing | Small OpenRouter markup |
| Model access | What each CLI supports | 200+ models |

Native CLIs can browse your codebase and use tools during review. The OpenRouter wrapper sends one prompt and gets one response — still useful for code review, but without the agentic loop. A good setup keeps one or two native CLI agents alongside OpenRouter agents for breadth.

## Submodule

The `counselors/` subdirectory is a git submodule pointing to the upstream repo for reference and installation.
