/**
 * Test fixtures representing real-world CodeRabbit review body formats.
 *
 * CodeRabbit embeds comments inside nested <details>/<summary>/<blockquote>
 * HTML structures within GitHub markdown review bodies. These fixtures cover
 * the full range of structures the parser must handle.
 */

// ---------------------------------------------------------------------------
// Basic: standard nitpick section with one file and two comments
// ---------------------------------------------------------------------------
export const BASIC_NITPICK = `
**Actionable comments posted: 5**

<details>
<summary>🧹 Nitpick comments (2)</summary>
<blockquote>

<details>
<summary>src/components/Button.tsx (2)</summary><blockquote>

\`42-45\`: _Suggestion_ | _Non-blocking_ **Use semantic HTML button element**

Consider using a \`<button>\` element instead of a \`<div>\` with an onClick handler for better accessibility.

\`78\`: **Remove unused import**

The \`useState\` import is not used in this component.

</blockquote></details>

</blockquote></details>
`;

// ---------------------------------------------------------------------------
// Basic: standard outside-diff section with two files
// ---------------------------------------------------------------------------
export const BASIC_OUTSIDE_DIFF = `
**Actionable comments posted: 3**

<details>
<summary>⚠️ Outside diff range comments (3)</summary>
<blockquote>

<details>
<summary>src/utils/format.ts (2)</summary><blockquote>

\`10-15\`: **Missing null check**

The function should handle null input gracefully.

\`30\`: _Warning_ | _Important_ **Potential memory leak**

The event listener is never cleaned up.

</blockquote></details>

<details>
<summary>src/lib/api.ts (1)</summary><blockquote>

\`152-159\`: **Error handling needed**

API calls should be wrapped in try-catch blocks.

</blockquote></details>

</blockquote></details>
`;

// ---------------------------------------------------------------------------
// Both sections combined (nitpick + outside-diff)
// ---------------------------------------------------------------------------
export const BOTH_SECTIONS = `
**Actionable comments posted: 4**

<details>
<summary>⚠️ Outside diff range comments (2)</summary>
<blockquote>

<details>
<summary>src/server/api.ts (2)</summary><blockquote>

\`10\`: **Add rate limiting**

Consider adding rate limiting to this endpoint.

\`25-30\`: **Validate input schema**

Input should be validated against the Zod schema.

</blockquote></details>

</blockquote></details>

**Other section content here**

<details>
<summary>🧹 Nitpick comments (2)</summary>
<blockquote>

<details>
<summary>src/components/Modal.tsx (1)</summary><blockquote>

\`5\`: **Simplify conditional**

This ternary can be simplified to a logical AND expression.

</blockquote></details>

<details>
<summary>src/styles/theme.ts (1)</summary><blockquote>

\`100\`: **Use CSS variable**

Hardcoded color should use the theme CSS variable instead.

</blockquote></details>

</blockquote></details>
`;

// ---------------------------------------------------------------------------
// Empty sections (no file blocks inside)
// ---------------------------------------------------------------------------
export const EMPTY_SECTIONS = `
**Actionable comments posted: 0**

<details>
<summary>🧹 Nitpick comments (0)</summary>
<blockquote>

</blockquote></details>

<details>
<summary>⚠️ Outside diff range comments (0)</summary>
<blockquote>

</blockquote></details>
`;

// ---------------------------------------------------------------------------
// Deeply nested: file block contains <details> within comment body (5+ levels)
// ---------------------------------------------------------------------------
export const DEEPLY_NESTED = `
<details>
<summary>🧹 Nitpick comments (1)</summary>
<blockquote>

<details>
<summary>src/components/Accordion.tsx (1)</summary><blockquote>

\`20-35\`: **Refactor nested details rendering**

The current implementation has deeply nested structures:

<details>
<summary>Current implementation (click to expand)</summary>

\`\`\`tsx
function Accordion() {
  return (
    <details>
      <summary>Level 1</summary>
      <details>
        <summary>Level 2</summary>
        <details>
          <summary>Level 3</summary>
          <p>Deeply nested content</p>
        </details>
      </details>
    </details>
  );
}
\`\`\`

</details>

Consider flattening this structure using a recursive component pattern.

</blockquote></details>

</blockquote></details>
`;

// ---------------------------------------------------------------------------
// Malformed HTML: unclosed tags, missing closing tags, broken nesting
// ---------------------------------------------------------------------------
export const MALFORMED_HTML = `
<details>
<summary>🧹 Nitpick comments (2)</summary>
<blockquote>

<details>
<summary>src/broken.ts (1)</summary><blockquote>

\`10\`: **Fix unclosed tag**

This has unclosed <div and broken <span class="test" nesting.

</blockquote></details>

<details>
<summary>src/also-broken.ts (1)</summary><blockquote>

\`20\`: **Another issue**

Content with </div> extra closing tags and <img src="test.png"> self-closing elements.

</blockquote></details>

</blockquote></details>
`;

// ---------------------------------------------------------------------------
// Special characters: Unicode paths, HTML entities, code with angle brackets
// ---------------------------------------------------------------------------
export const SPECIAL_CHARACTERS = `
<details>
<summary>🧹 Nitpick comments (3)</summary>
<blockquote>

<details>
<summary>src/i18n/日本語.ts (1)</summary><blockquote>

\`5\`: **Use proper encoding**

Ensure UTF-8 encoding for the string: "Héllo Wörld" — em dash &amp; ampersand &lt;tag&gt;.

</blockquote></details>

<details>
<summary>src/generics/types.ts (1)</summary><blockquote>

\`15-20\`: **Simplify generic constraint**

The type \`Record<string, Array<Map<string, Set<number>>>>\` is overly complex.

Use a simpler approach:
\`\`\`typescript
type Simple = Map<string, number[]>;
\`\`\`

</blockquote></details>

<details>
<summary>src/utils/html-escape.ts (1)</summary><blockquote>

\`8\`: **Handle all HTML entities**

Currently only handles &amp;amp; and &amp;lt; but misses &amp;gt;, &amp;quot;, and &amp;#39;.

</blockquote></details>

</blockquote></details>
`;

// ---------------------------------------------------------------------------
// Mixed content: text + HTML + markdown interleaved in comment bodies
// ---------------------------------------------------------------------------
export const MIXED_CONTENT = `
<details>
<summary>⚠️ Outside diff range comments (1)</summary>
<blockquote>

<details>
<summary>src/parser/mixed.ts (1)</summary><blockquote>

\`50-75\`: **Improve parsing robustness**

The parser needs to handle:

1. **Bold markdown** within HTML
2. \`Inline code\` with <angle> brackets
3. Links like [click here](https://example.com)

<details>
<summary>Suggested implementation</summary>

\`\`\`typescript
function parse(input: string): Result {
  // Handle HTML entities: &lt; &gt; &amp;
  const cleaned = decodeEntities(input);
  return { value: cleaned };
}
\`\`\`

</details>

> Blockquote within a blockquote
> with multiple lines

Also consider edge cases with \`\`\` triple backticks \`\`\` inline.

</blockquote></details>

</blockquote></details>
`;

// ---------------------------------------------------------------------------
// Multiple labels: zero, one, two, and three label variations
// ---------------------------------------------------------------------------
export const LABEL_VARIATIONS = `
<details>
<summary>🧹 Nitpick comments (4)</summary>
<blockquote>

<details>
<summary>src/labels.ts (4)</summary><blockquote>

\`10\`: **No labels at all**

Comment with zero label prefixes.

\`20\`: _Suggestion_ **One label**

Comment with a single label.

\`30\`: _Suggestion_ | _Non-blocking_ **Two labels**

Comment with the standard two-label format.

\`40\`: _Suggestion_ | _Non-blocking_ | _Informational_ **Three labels**

Comment with three labels separated by pipes.

</blockquote></details>

</blockquote></details>
`;

// ---------------------------------------------------------------------------
// Blockquote-prefixed body (GitHub sometimes wraps review bodies in > )
// ---------------------------------------------------------------------------
export const BLOCKQUOTE_WRAPPED = `> **Actionable comments posted: 1**
>
> <details>
> <summary>🧹 Nitpick comments (1)</summary>
> <blockquote>
>
> <details>
> <summary>src/wrapped.ts (1)</summary><blockquote>
>
> \`15\`: **Wrapped comment**
>
> This entire body was wrapped in blockquote markers.
>
> </blockquote></details>
>
> </blockquote></details>
`;

// ---------------------------------------------------------------------------
// No CodeRabbit sections at all (just a walkthrough)
// ---------------------------------------------------------------------------
export const NO_SECTIONS = `
## Walkthrough

This PR updates the authentication flow to use OAuth2 tokens instead of session cookies.

### Changes

| File | Change |
|------|--------|
| src/auth.ts | Replaced session logic with OAuth2 |
| src/middleware.ts | Updated token validation |
`;

// ---------------------------------------------------------------------------
// Short body (under 100 characters)
// ---------------------------------------------------------------------------
export const SHORT_BODY = "Short review body.";

// ---------------------------------------------------------------------------
// Empty body
// ---------------------------------------------------------------------------
export const EMPTY_BODY = "";

// ---------------------------------------------------------------------------
// File paths with emoji prefixes (should be filtered out — they're category headers)
// ---------------------------------------------------------------------------
export const EMOJI_FILE_PATHS = `
<details>
<summary>🧹 Nitpick comments (2)</summary>
<blockquote>

<details>
<summary>💡 Codebase verification (1)</summary><blockquote>

This is a category header, not a file block.

</blockquote></details>

<details>
<summary>src/real-file.ts (1)</summary><blockquote>

\`5\`: **Real comment**

This is a real file comment.

</blockquote></details>

</blockquote></details>
`;

// ---------------------------------------------------------------------------
// Committable suggestion blocks (code that should be extracted, not stripped)
// ---------------------------------------------------------------------------
export const COMMITTABLE_SUGGESTION = `
<details>
<summary>🧹 Nitpick comments (1)</summary>
<blockquote>

<details>
<summary>src/config.ts (1)</summary><blockquote>

\`12-18\`: **Use environment variable for timeout**

Hardcoded timeout should be configurable.

\`\`\`suggestion
const TIMEOUT = process.env.API_TIMEOUT
  ? parseInt(process.env.API_TIMEOUT, 10)
  : 5000;
\`\`\`

</blockquote></details>

</blockquote></details>
`;

// ---------------------------------------------------------------------------
// Many files in a single section (stress test structure parsing)
// ---------------------------------------------------------------------------
export function generateManyFiles(count: number): string {
  const fileBlocks = Array.from({ length: count }, (_, i) => {
    const path = `src/generated/file-${String(i).padStart(3, "0")}.ts`;
    return `<details>
<summary>${path} (1)</summary><blockquote>

\`${i + 1}\`: **Comment for file ${i}**

Body text for generated file ${i}.

</blockquote></details>`;
  }).join("\n\n");

  return `
<details>
<summary>🧹 Nitpick comments (${count})</summary>
<blockquote>

${fileBlocks}

</blockquote></details>
`;
}

// ---------------------------------------------------------------------------
// Large payload generator (for performance testing)
// ---------------------------------------------------------------------------
export function generateLargePayload(targetSizeMB: number): string {
  const targetBytes = targetSizeMB * 1024 * 1024;
  const singleComment = `
<details>
<summary>src/large/file.ts (1)</summary><blockquote>

\`1-10\`: **Performance test comment**

${"Lorem ipsum dolor sit amet, consectetur adipiscing elit. ".repeat(50)}

</blockquote></details>
`;

  const commentsNeeded = Math.ceil(targetBytes / singleComment.length);
  const fileBlocks = Array.from({ length: commentsNeeded }, (_, i) => {
    return singleComment.replace("src/large/file.ts", `src/large/file-${i}.ts`);
  }).join("\n");

  return `
<details>
<summary>🧹 Nitpick comments (${commentsNeeded})</summary>
<blockquote>

${fileBlocks}

</blockquote></details>
`;
}
