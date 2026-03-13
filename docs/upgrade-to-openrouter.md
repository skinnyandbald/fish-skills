# Setting Up Counselors + Critic Review with OpenRouter

**Package:** `@skinnyandbald/counselors` (npm)
**Platforms:** Windows, Mac, Linux
**Requires:** Node.js 20+, Claude Code CLI

---

## Install (3 commands)

```
npm install -g @skinnyandbald/counselors
npx skills add skinnyandbald/counselors
counselors init
```

**What each command does:**

1. `npm install -g @skinnyandbald/counselors` — installs the `counselors` CLI and `openrouter-agent` commands globally. Works on all platforms — npm creates `.cmd` shims on Windows automatically.

2. `npx skills add skinnyandbald/counselors` — installs the SKILL.md into Claude Code so `/counselors` works as a slash command.

3. `counselors init` — discovers OpenRouter (plus any native CLIs like Claude, Codex, Gemini, Amp) and writes your config.

**For critic-review** (separate skill, same fish-skills repo):

```
npx skills add skinnyandbald/fish-skills@critic-review
```

---

## Set your OpenRouter API key

Get a key at [openrouter.ai/keys](https://openrouter.ai/keys).

**Mac/Linux:**
```
echo 'export OPENROUTER_API_KEY="sk-or-..."' >> ~/.zshrc
source ~/.zshrc
```

**Windows (CMD):**
```
setx OPENROUTER_API_KEY "sk-or-..."
```
Then restart your terminal.

---

## Verify

```
counselors --version
counselors ls
echo "Reply with exactly: OK" | openrouter-agent --model anthropic/claude-opus-4
```

Then in Claude Code:

```
/counselors review my recent changes
/critic-review docs/plans/some-plan.md
```

---

## Upgrading from a previous version

```
npm install -g @skinnyandbald/counselors
```

If you have stale config from before v0.7:

```
rm ~/.config/counselors/config.json
counselors init
```

---

## How API keys work

Counselors never prompts for API keys. Each adapter handles its own auth at runtime. `openrouter-agent` checks for `OPENROUTER_API_KEY` and fails with a clear error if missing. Set it in your shell profile so it's always available.

---

## Troubleshooting

**"counselors: command not found" after install:**
Your npm global bin directory may not be in PATH. Check with `npm config get prefix` — the bin directory is `<prefix>/bin` (Mac/Linux) or `<prefix>` (Windows). Add it to your PATH.

**"openrouter-agent: command not found":**
Same as above — installed alongside counselors via npm.

**"OPENROUTER_API_KEY not set" at runtime:**
The key isn't in your environment. Verify with `echo $OPENROUTER_API_KEY` (Mac/Linux) or `echo %OPENROUTER_API_KEY%` (Windows CMD).

**API errors from OpenRouter:**
Check your account credits at [openrouter.ai](https://openrouter.ai).
