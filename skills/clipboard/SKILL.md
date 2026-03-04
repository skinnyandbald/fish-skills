---
name: clipboard
description: Copy generated text to the user's macOS clipboard using pbcopy. Use this skill PROACTIVELY whenever you've just generated content the user will paste somewhere else -- emails, messages, social posts, bios, copy, outreach sequences, or any standalone text block. Also use when the user says "copy", "clipboard", "copy that", "put that on my clipboard", or "I need to paste this". Don't wait for the user to ask -- if you wrote something they'll clearly paste elsewhere, offer to copy it.
---

# Clipboard

Copy generated text content to the user's clipboard.

## When to Use

Use this automatically after generating any content the user will paste into another app:
- Emails (cold outreach, follow-ups, replies)
- Social posts (LinkedIn, Twitter/X, Threads)
- Messages (Slack, iMessage, WhatsApp)
- Bios, taglines, ad copy
- Any standalone text block the user asked you to write

Also use when the user explicitly asks to copy something.

## How It Works

Write the content to a temp file and pipe it to `pbcopy`. This avoids heredoc indentation issues that cause unwanted leading spaces:

```bash
TMPFILE=$(mktemp) && cat > "$TMPFILE" << 'CLIPBOARD'
[content here -- start at column 0, no leading indentation]
CLIPBOARD
pbcopy < "$TMPFILE" && rm "$TMPFILE"
```

IMPORTANT: The heredoc content MUST start at column 0 (no indentation). The Bash tool may indent your command, but the text between the heredoc markers must not have leading whitespace. If the content itself contains single quotes or special characters, the `<<'CLIPBOARD'` quoting handles it.

Alternative for short content (under ~1000 chars): use `printf '%s'` piped to pbcopy. But for longer emails and multi-paragraph content, the temp file approach is more reliable.

## Rules

1. **Strip markdown formatting** before copying. The user is pasting into email clients, social platforms, or messaging apps -- not markdown renderers. Convert:
   - `**bold**` to plain text (no asterisks)
   - `[link text](url)` to just the URL on its own line, or `link text: url` if context helps
   - Headers (`##`) to plain text
   - Bullet points (`-`) to bullet points (these are fine, most apps handle them)

2. **Don't include subject lines in the body.** If the content is an email with a subject line, mention the subject line in your response text but don't include "Subject: ..." in the clipboard content. The user will type the subject into their email client's subject field separately.

3. **Confirm what was copied.** After copying, tell the user briefly: "Copied to clipboard." If there are placeholders they need to fill in (like `[REPO LINK]`), call those out.

4. **One clipboard operation per turn.** If you generated multiple pieces of content (e.g., an email + a social post), copy the primary one and mention you can copy the other if needed.

## Platform Detection

macOS: `pbcopy` (default -- this is Ben's setup)
Linux: `xclip -selection clipboard` or `xsel --clipboard`
WSL: `clip.exe`

Check `uname` if unsure, but default to `pbcopy`.
