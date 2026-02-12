#!/usr/bin/env python3
"""
Invoice PDF Generator
Generates professional invoices from YAML configuration files.

Usage:
  uv run --with weasyprint --with pyyaml --with jinja2 python3 generate-invoice.py <config.yaml> [options]

Options:
  --output-dir <path>   Directory to save PDFs (default: ./invoices)
  --logo <path>         Custom logo file (default: logo.png next to this script)

Output: <output-dir>/invoice-#<id>-<date>-<client>.pdf
"""

import sys
import os
import re
from pathlib import Path

# ---------------------------------------------------------------------------
# Dependencies
# ---------------------------------------------------------------------------
try:
    import yaml
    from jinja2 import Template
    from weasyprint import HTML
except ImportError:
    print("Missing dependencies. Run with:")
    print('  uv run --with weasyprint --with pyyaml --with jinja2 python3 generate-invoice.py <config.yaml>')
    sys.exit(1)


def format_currency(amount: float) -> str:
    """Format a number as currency: 32,500.00"""
    return f"{amount:,.2f}"


def slugify(text: str) -> str:
    """Convert text to a filename-safe slug."""
    text = text.lower().strip()
    text = re.sub(r'[^\w\s-]', '', text)
    text = re.sub(r'[\s_]+', '-', text)
    text = re.sub(r'-+', '-', text)
    return text.strip('-')


def parse_args(argv):
    """Parse CLI arguments."""
    config_path = None
    output_dir = None
    logo_path = None

    i = 0
    while i < len(argv):
        if argv[i] == '--output-dir' and i + 1 < len(argv):
            output_dir = argv[i + 1]
            i += 2
        elif argv[i] == '--logo' and i + 1 < len(argv):
            logo_path = argv[i + 1]
            i += 2
        elif not argv[i].startswith('--'):
            config_path = argv[i]
            i += 1
        else:
            i += 1

    return config_path, output_dir, logo_path


def main():
    config_path, output_dir_arg, logo_path_arg = parse_args(sys.argv[1:])

    if not config_path:
        print("Usage: generate-invoice.py <config.yaml> [--output-dir <path>] [--logo <path>]")
        sys.exit(1)

    config_path = Path(config_path)
    if not config_path.exists():
        print(f"Error: {config_path} not found")
        sys.exit(1)

    # Load config
    with open(config_path) as f:
        config = yaml.safe_load(f)

    # Load HTML template
    script_dir = Path(__file__).parent
    template_path = script_dir / "invoice-template.html"
    with open(template_path) as f:
        template = Template(f.read())

    # Determine if any items have a rate (hourly mode)
    show_rate = any("rate" in item for item in config["items"])

    # Process line items
    items = []
    for item in config["items"]:
        processed = {
            "description": item["description"],
            "quantity": item["quantity"],
            "amount_display": format_currency(item["amount"]),
        }
        if show_rate and "rate" in item:
            processed["rate_display"] = f"${format_currency(item['rate'])}/hr"
        elif show_rate:
            processed["rate_display"] = ""
        items.append(processed)

    # Calculate totals
    subtotal = sum(item["amount"] for item in config["items"])
    total = subtotal

    # Process notes
    notes_text = config.get("notes", "")
    notes_lines = [line for line in notes_text.strip().split("\n") if line.strip()] if notes_text else []

    # Logo path (absolute for weasyprint)
    logo_path = Path(logo_path_arg) if logo_path_arg else script_dir / "logo.png"
    if not logo_path.exists():
        print(f"Warning: Logo not found at {logo_path}")

    # Render HTML
    html_content = template.render(
        invoice_id_display=f"#{str(config['invoice_id']).lstrip('#')}",
        invoice_date=config["invoice_date"],
        due_date=config["due_date"],
        payment_terms=config["payment_terms"],
        client_name=config["client"]["name"],
        client_address_1=config["client"]["address_1"],
        client_address_2=config["client"]["address_2"],
        items=items,
        show_rate=show_rate,
        subtotal_display=format_currency(subtotal),
        total_display=format_currency(total),
        notes=bool(notes_lines),
        notes_lines=notes_lines,
        logo_path=logo_path.resolve().as_uri(),
    )

    # Output directory
    output_dir = Path(output_dir_arg) if output_dir_arg else script_dir / "invoices"
    output_dir.mkdir(parents=True, exist_ok=True)

    # Generate filename: invoice-#N-MM-DD-YYYY-client.pdf
    date_slug = config["invoice_date"].replace("/", "-")
    invoice_num = str(config['invoice_id']).lstrip('#')
    client_slug = slugify(config.get("client_slug", config["client"]["name"]))
    output_file = output_dir / f"invoice-#{invoice_num}-{date_slug}-{client_slug}.pdf"

    # Generate PDF
    HTML(string=html_content, base_url=str(script_dir)).write_pdf(str(output_file))
    print(f"Generated: {output_file}")


if __name__ == "__main__":
    main()
