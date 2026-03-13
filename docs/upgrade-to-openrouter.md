# Setting Up OpenRouter for Counselors + Critic Review

**Counselors version:** v0.6.0

---

## Install (5 commands)

```bash
# 1. Install the skills
npx skills add skinnyandbald/fish-skills@critic-review
npx skills add skinnyandbald/fish-skills@counselors

# 2. Install the counselors CLI (our fork with OpenRouter adapter)
npm install -g github:skinnyandbald/counselors

# 3. Install the openrouter-agent wrapper script
cp "$(npm root -g)/counselors/scripts/openrouter-agent" ~/.local/bin/
chmod +x ~/.local/bin/openrouter-agent

# 4. Set your OpenRouter API key (add to ~/.zshrc or ~/.bashrc)
#    Get a key at https://openrouter.ai/keys
export OPENROUTER_API_KEY="sk-or-..."

# 5. Run init — OpenRouter auto-discovered as a built-in adapter
counselors init
```

Make sure `~/.local/bin` is on your PATH. If not, add `export PATH="$HOME/.local/bin:$PATH"` to your shell profile.

During `counselors init`, you'll see OpenRouter listed alongside Claude, Codex, Gemini, and Amp. Select the OpenRouter models you want — the recommended defaults are:

- `or-claude-opus` — Anthropic Claude Opus 4
- `or-gemini-3.1-pro` — Google Gemini 3.1 Pro
- `or-codex-5.4` — OpenAI GPT-5.4

---

## Verify

```bash
# Check the CLI version
counselors --version
# Should show 0.6.0

# Check OpenRouter models are configured
counselors ls

# Smoke test
echo "Reply with exactly: OK" | openrouter-agent --model anthropic/claude-opus-4
```

Then in Claude Code:

```
/critic-review docs/plans/some-plan.md
```

You should see reviews from all three OR models.

---

## Upgrading from an older version

If you already have counselors installed with stale custom OpenRouter entries (`stdin: true, custom: true`), delete the config and re-init:

```bash
rm ~/.config/counselors/config.json
counselors init
```

The new init writes clean adapter-based entries. The old `stdin`/`custom` format is deprecated.

---

## How API keys work

Counselors never prompts for API keys — that's by design. Each adapter's tool handles its own auth. The `openrouter-agent` script checks for `OPENROUTER_API_KEY` at runtime and fails with a clear error if it's missing. The counselors skill reads `.stderr` files and reports the error back to you.

Set the key in your shell profile so it's always available:

```bash
echo 'export OPENROUTER_API_KEY="sk-or-..."' >> ~/.zshrc
source ~/.zshrc
```

---

## Troubleshooting

**"openrouter-agent not found" during init:**
Verify `which openrouter-agent` returns a path. If not, re-run step 3 and make sure `~/.local/bin` is on your PATH.

**"OPENROUTER_API_KEY not set" at runtime:**
The key isn't in your environment. Check with `echo $OPENROUTER_API_KEY`. Add it to your shell profile (step 4).

**API errors from OpenRouter:**
Verify your key works:

```bash
curl -s https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" | head -c 200
```

If that returns JSON, your key is valid — check your account credits at [openrouter.ai](https://openrouter.ai).
