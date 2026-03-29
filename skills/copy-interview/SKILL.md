---
name: copy-interview
description: "Extract authentic marketing copy by interviewing the user as a buyer would, then analyze the output line-by-line. Use when the user says 'interview me for copy,' 'extract copy,' 'help me write copy by interviewing me,' 'copy interview,' 'what would I say about this offer,' or 'help me pitch this.' Combines buyer-perspective interviewing (inspired by Jason Adams' method) with line-by-line copy analysis and direct response principles."
---

# Copy Interview

Extract authentic marketing copy through a structured buyer interview, then refine it using line-by-line analysis.

Arguments: $ARGUMENTS

## Why This Exists

Your verbal pitch is always better than what you write from a blank page. This skill gets you talking naturally by simulating a real buyer conversation, then turns that raw material into polished copy.

## Before Starting

1. **Read the style guide** at `02_Areas/content-creation/style-guide.md` -- this is the voice bible
2. **Check for product marketing context** at `.claude/product-marketing-context.md` if it exists
3. **Read the existing page** if rewriting (get the current copy so you know what to improve)

## Phase 1: Setup

Ask the user (or infer from arguments):

- **What are we writing copy for?** (page type: homepage, service page, landing page, email)
- **What's the offer?** (product, service, price point)
- **Who's the buyer?** (title, company size, what they're feeling when they land on this page)

If the user provides a page URL or file path, read it first.

## Phase 2: The Buyer Interview

**You are now a prospect.** Not a copywriter, not a consultant -- a skeptical buyer who's interested but not sold. Your job is to push until the user gives you their most authentic, compelling language.

Ask **one question at a time.** Wait for the answer before asking the next.

### The Interview Sequence

These are not a rigid script -- adapt to what the user says. But cover these angles:

**Opening (get them talking naturally):**
> "Tell me why I should buy [the thing]. Like straight up, just to me. Don't sell it -- just tell me."

**Price objection (forces value framing):**
> "That seems like a lot of money. What do you think?"

If they rationalize with hourly comparisons or competitor pricing, push back:
> "I don't care what McKinsey charges. What's it worth to ME? What happens if I don't do this?"

**Trust objection (extracts credentials):**
> "How can I be sure this will actually help me?"
> "Why else should someone trust you?"

**Deliverable clarity (gets specific):**
> "What exactly will I get?"
> "And then what happens after that?"

**Outcome vision (the aspirational close):**
> "If this goes really well, what's the best thing that can happen for me?"

**Differentiation (separates from alternatives):**
> "How is this different from [obvious alternative]?"

**The meta-question (if they're hedging):**
> "You sound like you're being careful not to oversell. But I need to feel confident enough to spend money. Can you tell me the version where you're proud of what this does?"

### Interview Rules

- **When they say something authentic and compelling, flag it.** Say: "That right there -- that's copy. I'm keeping that."
- **When they hedge or rationalize, push back.** Don't accept "it depends" or "it's hard to say."
- **When they compare to hourly rates, redirect.** Frame around outcomes and cost of getting it wrong.
- **When they downplay credentials, call it out.** "You're underselling yourself. That credential matters to a buyer -- it's what makes them feel safe."
- **Stop after 6-10 questions** or when you have enough raw material.

## Phase 3: Draft Copy

Take the raw material from the interview and write the copy. Rules:

1. **Use their actual words wherever possible.** The verbal pitch is the copy -- just tightened.
2. **Apply the style guide.** Run every line through the banned words list and voice rules.
3. **Apply direct response principles** from ugly-ads and positioning-basics:
   - Enter the existing mental conversation the prospect is having
   - Lead with the emotional struggle, not the product description
   - Credentials are safety, not bragging -- make them prominent
   - Frame price around the cost of getting it wrong
   - Don't call time-bound things by their time ("60-minute call") -- call them by their outcome ("strategy work")
4. **Flag transcript-sourced language** with [from interview] annotations
5. **Structure by priority:** Headline > Subheadline > Intro > Pricing/risk reversal

## Phase 4: Line-by-Line Analysis (Jason Adams' Method)

After drafting -- or when reviewing existing copy -- run this analysis:

### The Method

Read each line of the copy individually. After each line, answer two questions:

1. **"What am I thinking or feeling as the reader right now?"**
2. **"Are those thoughts and feelings conducive to the goal of this page?"**

### Scoring

| Reader reaction | Grade | Action |
|----------------|-------|--------|
| "Hell yeah, exactly" | Keep | This line is working |
| "Interesting, tell me more" | Keep | Momentum is good |
| "Is that true?" / "Do I believe that?" | Rewrite | Making them think, not feel |
| "So what?" / skimming | Rewrite | Not earning attention |
| "This feels like AI" / "This feels corporate" | Rewrite | Lost the authentic voice |
| "F*ck this guy" (if CEO sends to CTO) | Delete | Alienating the wrong people |

### Priority Order

Spend the most time on these, in this order:
1. **Headline** -- must clearly articulate value AND make them feel why it's beneficial. Ten seconds.
2. **Subheadline** -- expands on headline, adds specificity
3. **Intro paragraph** -- should trigger "hell yeah" not "is that true?"
4. **Pricing and risk reversal** -- frame around outcome value, never hourly comparisons

### Specific Checks

- **Disqualifying statements:** Only use them if the entire page reads "I'm in demand." Selling and qualifying at the same time is incongruent.
- **Credentials placement:** Should be prominent and easy to find, not buried in small text.
- **Social proof:** Should be a core feature, not an afterthought.
- **Price framing:** "What happens if your team spends the next three months building the wrong thing?" not "Less than what McKinsey charges per hour."

## Phase 5: Present and Iterate

Present the draft with:
- The copy, organized by section
- Line-by-line analysis results for the top 4-5 most important lines
- Annotations showing which phrases came from the interview
- 2-3 alternative headlines

Ask: "Read through this. Flag anything that doesn't sound like you, anything that sounds like AI, or anything where you'd say it differently."

## Related Skills

- **copywriting** -- general copywriting principles and frameworks
- **ugly-ads** -- direct response ad copy (shares the "enter their mental conversation" principle)
- **positioning-basics** -- value proposition and differentiation
- **copy-editing** -- for polishing after the draft
- **de-ai-ify** -- for catching AI-tell patterns
- **interview-me** -- similar Socratic method but for product/technical specs, not marketing copy
