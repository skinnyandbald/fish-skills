# Upgrade Guide: OpenRouter Adapter for Counselors

**Counselors version:** v0.6.0
**Prereq:** Existing fish-skills clone with the counselors skill installed

---

## 1. Pull latest fish-skills (with submodules)

```bash
cd ~/path/to/fish-skills
git pull
git submodule update --init --recursive
```

This brings in the updated counselors submodule at `skills/counselors/counselors/` which includes the bundled `openrouter-agent` script.

## 2. Install / upgrade counselors CLI to v0.6.0

Option A — npm global install (linked to your local checkout):

```bash
cd skills/counselors/counselors
npm install
npm run build
npm install -g .
```

Option B — fresh install from GitHub:

```bash
npm install -g github:skinnyandbald/counselors
```

Confirm the version:

```bash
counselors --version
# Should show 0.6.0
```

## 3. Install the openrouter-agent script

The script is bundled in two places. Copy it to your PATH:

```bash
cp skills/counselors/counselors/scripts/openrouter-agent ~/.local/bin/openrouter-agent
chmod +x ~/.local/bin/openrouter-agent
```

Make sure `~/.local/bin` is on your PATH. Verify:

```bash
which openrouter-agent
```

## 4. Set your OpenRouter API key

Get a key at [https://openrouter.ai/keys](https://openrouter.ai/keys) if you don't have one.

Add it to your shell profile (`~/.bashrc`, `~/.zshrc`, etc.):

```bash
export OPENROUTER_API_KEY="sk-or-..."
```

Source the file or open a new terminal:

```bash
source ~/.zshrc  # or ~/.bashrc
```

## 5. Re-run counselors init

This is the key step. The new init auto-discovers `openrouter-agent` as a built-in adapter and writes clean config entries using `adapter: "openrouter"` instead of the old `stdin: true, custom: true` format.

```bash
counselors init
```

This overwrites `~/.config/counselors/config.json` with the new adapter-based entries. If you had custom OpenRouter entries from before, they will be replaced -- that is the intended behavior. The old `stdin`/`custom` style entries are stale and won't work correctly with v0.6.0.

## 6. Verify the setup

List available counselors:

```bash
counselors ls
```

You should see the OpenRouter models listed -- the defaults are now:

- `or-claude-opus`
- `or-gemini-3.1-pro`
- `or-codex-5.4`

Quick smoke test — send a trivial prompt to one OR model:

```bash
echo "Reply with exactly: OK" | openrouter-agent --model anthropic/claude-opus-4
```

If you get `OK` back, the adapter is working.

## 7. Test critic-review end-to-end

The `critic-review` and `counselors` skills now default to these three OpenRouter models. In Claude Code, run:

```
/critic-review docs/plans/some-plan.md
```

You should see reviews from all three models dispatched via OpenRouter. If any model fails, check:

- `OPENROUTER_API_KEY` is set and valid
- `openrouter-agent` is on your PATH and executable
- You have credits/quota on your OpenRouter account

---

## Troubleshooting

**"openrouter-agent not found" during init:**
Make sure step 3 is done and `which openrouter-agent` returns a path. Re-run `counselors init` after fixing.

**Old config entries lingering:**
If `counselors ls` shows stale entries with `stdin: true` or `custom: true`, delete the config and re-init:

```bash
rm ~/.config/counselors/config.json
counselors init
```

**API errors from OpenRouter:**
Verify your key works directly:

```bash
curl -s https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" | head -c 200
```

If that returns JSON, your key is good -- the issue is elsewhere.
