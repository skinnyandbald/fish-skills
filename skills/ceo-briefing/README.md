# /ceo-briefing

Research any topic and produce a structured executive briefing optimized for rapid CEO decision-making. Designed for a 15-20 minute read.

## Usage

```
/ceo-briefing AI agents in customer support
/ceo-briefing Shopify vs BigCommerce for enterprise
/ceo-briefing [company name] competitive landscape
```

## What It Does

1. **Scopes the topic** — asks up to 3 clarifying questions if needed
2. **Gathers intelligence** from three sources:
   - **Attio CRM** — prior interactions, deal status, notes (if available)
   - **Vault search** — existing notes, proposals, meeting transcripts
   - **Web research** — current data, earnings reports, trade publications
3. **Synthesizes** into a structured 9-section briefing
4. **Saves** to `02_Areas/consulting/strategy/` on request

## Output Structure

```
0. Executive Snapshot (6 bullets)
1. Strategic Relevance
2. Key Metrics & Data Points
3. Timeline of Developments
4. Deep Analysis
5. Competitive Landscape
6. Risk Assessment
7. Strategic Options (0-6mo / 6-18mo)
8. Glossary
9. Additional Intelligence + References
```

Every quantitative claim includes an inline citation.

## Prerequisites

- **Attio MCP server** (optional) — for CRM intelligence
- **Web access** — for current data research

## Customization

### Default context

The skill defaults to:
- **Audience:** Technology founders and fractional CTOs
- **Geographic focus:** North America
- **Decision timeline:** 0-3 months
- **Industry lens:** AI/technology sector

Edit the `<rules>` section in SKILL.md to change defaults for your audience.

### CRM integration

The skill checks Attio first when the topic involves a person, company, or deal. If Attio MCP isn't configured, it skips CRM and notes the gap in the briefing.

### Vault paths

The skill searches `01_Projects/consulting/`, `02_Areas/notes/`, and `02_Areas/consulting/` for existing context. Update these paths in the SKILL.md if your vault uses different locations.
