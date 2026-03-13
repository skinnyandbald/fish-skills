# Setting Up OpenRouter for Counselors + Critic Review

**Counselors version:** v0.6.0+
**Platforms:** Windows, Mac, Linux

---

## Install (4 commands)

Works on any platform with Node.js 20+ installed.

```
# 1. Install the skills
npx skills add skinnyandbald/fish-skills@critic-review
npx skills add skinnyandbald/fish-skills@counselors

# 2. Install the counselors CLI (includes openrouter-agent automatically)
npm install -g github:skinnyandbald/counselors

# 3. Set your OpenRouter API key
#    Get a key at https://openrouter.ai/keys
#    Add to your shell profile (~/.zshrc, ~/.bashrc, or Windows environment variables)
export OPENROUTER_API_KEY="sk-or-..."

# 4. Run init — OpenRouter auto-discovered as a built-in adapter
counselors init
```

`npm install -g` installs both `counselors` and `openrouter-agent` as commands. No manual copying needed — npm creates the right shims on every platform (symlinks on Mac/Linux, `.cmd` wrappers on Windows).

During `counselors init`, you'll see OpenRouter listed alongside Claude, Codex, Gemini, and Amp. Select the OpenRouter models you want — the recommended defaults are:

- `or-claude-opus` — Anthropic Claude Opus 4
- `or-gemini-3.1-pro` — Google Gemini 3.1 Pro
- `or-codex-5.4` — OpenAI GPT-5.4

---

## Verify

```
counselors --version
counselors ls
echo "Reply with exactly: OK" | openrouter-agent --model anthropic/claude-opus-4
```

Then in Claude Code:

```
/critic-review docs/plans/some-plan.md
```

---

## Upgrading from an older version

If you have stale custom OpenRouter entries (`stdin: true, custom: true`) from a previous setup, delete the config and re-init:

```
rm ~/.config/counselors/config.json
counselors init
```

If you previously installed `openrouter-agent` manually to `~/.local/bin/`, you can remove it — `npm install -g` now handles this automatically.

---

## How API keys work

Counselors never prompts for API keys — by design. Each adapter's tool handles its own auth. `openrouter-agent` checks for `OPENROUTER_API_KEY` at runtime and fails with a clear error if missing. The counselors skill reads `.stderr` files and reports the error back.

**Mac/Linux** — add to shell profile:
```
echo 'export OPENROUTER_API_KEY="sk-or-..."' >> ~/.zshrc
source ~/.zshrc
```

**Windows** — set as environment variable:
```
setx OPENROUTER_API_KEY "sk-or-..."
```
Then restart your terminal.

---

## Troubleshooting

**"openrouter-agent not found" during init:**
Run `npm install -g github:skinnyandbald/counselors` again. Verify with `openrouter-agent --help` or `where openrouter-agent` (Windows) / `which openrouter-agent` (Mac/Linux).

**"OPENROUTER_API_KEY not set" at runtime:**
The key isn't in your environment. Check with `echo $OPENROUTER_API_KEY` (Mac/Linux) or `echo %OPENROUTER_API_KEY%` (Windows CMD). Add it to your shell profile or system environment variables.

**API errors from OpenRouter:**
Verify your key works — open `https://openrouter.ai/models` in a browser while logged in. If your account has credits, the key is good — the issue is elsewhere.
