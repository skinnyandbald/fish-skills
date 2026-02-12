# /invoice

Generate professional PDF invoices from the command line via Claude Code.

Pass client name and line items as args for instant generation, or invoke with just a client name and get prompted for the rest.

```
/invoice acme "Consulting Sprint" 40000 --net 15
/invoice acme
```

## Setup

### 1. Install dependencies

The generator runs via [uv](https://docs.astral.sh/uv/) (no virtualenv needed):

```bash
# uv handles deps automatically, but if you want to verify:
uv run --with weasyprint --with pyyaml --with jinja2 python3 generate-invoice.py --help
```

### 2. Personalize the template

Edit `invoice-template.html` and update the **Pay to** section (around line 219) with your billing address:

```html
<h3>Pay to:</h3>
<p>
  Your Name<br>
  Your Street Address<br>
  City, State ZIP
</p>
```

### 3. Replace the logo

Swap `logo.png` with your own. The template renders it at 80x80px in the top-right corner. If your logo isn't pixel art, remove `image-rendering: pixelated` from the `.logo img` CSS rule.

### 4. Create a clients directory

Create a folder to store client billing YAML files. Each client gets one file:

```yaml
# clients/acme.yaml
name: "Acme Corporation"
address_1: "123 Main St, Suite 400"
address_2: "San Francisco, CA 94105"
aliases: [acme, acme-corp]
default_net: 30
```

### 5. Update paths in the SKILL.md

The skill references three paths that you need to set for your environment:

| Path | What it is | Example |
|------|-----------|---------|
| Clients dir | Where your client YAMLs live | `~/invoicing/clients/` |
| Output dir | Where generated PDFs are saved | `~/invoicing/output/` |
| Logo override | Optional per-project logo | `~/invoicing/logo.png` |

Edit the `<configuration>` section in `SKILL.md` to match your setup.

## Usage

```
/invoice <client> [description] [amount] [--net N] [--quantity N] [--notes "..."] [--hourly]
```

| Arg | Required | Default | Description |
|-----|----------|---------|-------------|
| `client` | Yes | — | Matches against client YAML filenames or aliases |
| `description` | No | prompted | Line item description |
| `amount` | No | prompted | Total in USD |
| `--net N` | No | client default or 15 | Payment terms |
| `--quantity N` | No | 1 | Line item quantity |
| `--notes "..."` | No | none | Notes below the total |
| `--hourly` | No | false | Multi-line-item mode with rates |

Invoice IDs auto-increment from existing PDFs in your output directory.
