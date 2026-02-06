import { describe, expect, it } from "vitest";
import type { CodeRabbitComment } from "../parse-coderabbit-review.js";
import { parseCodeRabbitReview } from "../parse-coderabbit-review.js";
import {
  BASIC_NITPICK,
  BASIC_OUTSIDE_DIFF,
  BLOCKQUOTE_WRAPPED,
  BOTH_SECTIONS,
  COMMITTABLE_SUGGESTION,
  DEEPLY_NESTED,
  EMOJI_FILE_PATHS,
  EMPTY_BODY,
  EMPTY_SECTIONS,
  generateLargePayload,
  generateManyFiles,
  LABEL_VARIATIONS,
  MALFORMED_HTML,
  MIXED_CONTENT,
  NO_SECTIONS,
  SHORT_BODY,
  SPECIAL_CHARACTERS,
} from "./fixtures/coderabbit-fixtures.js";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Assert common shape on every comment */
function assertCommentShape(c: CodeRabbitComment) {
  expect(c.source).toBe("coderabbit-review-body");
  expect(c.file).toBeTruthy();
  expect(c.file).toMatch(/\./); // file path must contain a dot
  expect(c.line).toMatch(/^\d+(-\d+)?$/);
  expect(c.title).toBeTruthy();
  expect(typeof c.body).toBe("string");
  expect(c.category).toMatch(/^(nitpick|outside-diff)$/);
}

// ===========================================================================
// 1. BASIC HTML DETAILS / BLOCKQUOTE STRUCTURES
// ===========================================================================

describe("Basic structures", () => {
  it("parses a standard nitpick section with one file and two comments", () => {
    const results = parseCodeRabbitReview(BASIC_NITPICK);
    expect(results).toHaveLength(2);

    expect(results[0].category).toBe("nitpick");
    expect(results[0].file).toBe("src/components/Button.tsx");
    expect(results[0].line).toBe("42-45");
    expect(results[0].title).toBe("Use semantic HTML button element");
    expect(results[0].body).toContain("element instead");

    expect(results[1].category).toBe("nitpick");
    expect(results[1].file).toBe("src/components/Button.tsx");
    expect(results[1].line).toBe("78");
    expect(results[1].title).toBe("Remove unused import");

    results.forEach(assertCommentShape);
  });

  it("parses a standard outside-diff section with two files", () => {
    const results = parseCodeRabbitReview(BASIC_OUTSIDE_DIFF);
    expect(results).toHaveLength(3);

    expect(results[0].category).toBe("outside-diff");
    expect(results[0].file).toBe("src/utils/format.ts");
    expect(results[0].line).toBe("10-15");

    expect(results[1].category).toBe("outside-diff");
    expect(results[1].file).toBe("src/utils/format.ts");
    expect(results[1].line).toBe("30");

    expect(results[2].category).toBe("outside-diff");
    expect(results[2].file).toBe("src/lib/api.ts");
    expect(results[2].line).toBe("152-159");

    results.forEach(assertCommentShape);
  });

  it("parses both nitpick and outside-diff sections in one body", () => {
    const results = parseCodeRabbitReview(BOTH_SECTIONS);
    expect(results).toHaveLength(4);

    const outsideDiff = results.filter((c) => c.category === "outside-diff");
    const nitpicks = results.filter((c) => c.category === "nitpick");
    expect(outsideDiff).toHaveLength(2);
    expect(nitpicks).toHaveLength(2);

    // outside-diff comes first
    expect(results[0].category).toBe("outside-diff");
    expect(results[0].file).toBe("src/server/api.ts");
    expect(results[2].category).toBe("nitpick");
    expect(results[2].file).toBe("src/components/Modal.tsx");

    results.forEach(assertCommentShape);
  });

  it("every comment has source = 'coderabbit-review-body'", () => {
    const results = parseCodeRabbitReview(BOTH_SECTIONS);
    for (const c of results) {
      expect(c.source).toBe("coderabbit-review-body");
    }
  });
});

// ===========================================================================
// 2. EMPTY BLOCKS AND EDGE CASES
// ===========================================================================

describe("Empty and edge cases", () => {
  it("returns empty array for empty sections (0 comments)", () => {
    const results = parseCodeRabbitReview(EMPTY_SECTIONS);
    expect(results).toEqual([]);
  });

  it("returns empty array for empty body", () => {
    const results = parseCodeRabbitReview(EMPTY_BODY);
    expect(results).toEqual([]);
  });

  it("returns empty array for short body (< 100 chars)", () => {
    const results = parseCodeRabbitReview(SHORT_BODY);
    expect(results).toEqual([]);
  });

  it("returns empty array when no CodeRabbit sections exist", () => {
    const results = parseCodeRabbitReview(NO_SECTIONS);
    expect(results).toEqual([]);
  });

  it("handles null/undefined input gracefully", () => {
    // @ts-expect-error testing runtime guard
    expect(parseCodeRabbitReview(null)).toEqual([]);
    // @ts-expect-error testing runtime guard
    expect(parseCodeRabbitReview(undefined)).toEqual([]);
  });
});

// ===========================================================================
// 3. DEEPLY NESTED ELEMENTS (5+ levels)
// ===========================================================================

describe("Deeply nested elements", () => {
  it("extracts comments from file blocks containing nested <details>", () => {
    const results = parseCodeRabbitReview(DEEPLY_NESTED);
    expect(results).toHaveLength(1);

    expect(results[0].file).toBe("src/components/Accordion.tsx");
    expect(results[0].line).toBe("20-35");
    expect(results[0].title).toBe("Refactor nested details rendering");
    // Body should contain the text but strip nested <details> content
    expect(results[0].body).toContain("nested structures");

    assertCommentShape(results[0]);
  });
});

// ===========================================================================
// 4. MALFORMED HTML
// ===========================================================================

describe("Malformed HTML", () => {
  it("extracts comments despite broken HTML in comment bodies", () => {
    const results = parseCodeRabbitReview(MALFORMED_HTML);
    expect(results).toHaveLength(2);

    expect(results[0].file).toBe("src/broken.ts");
    expect(results[0].line).toBe("10");
    expect(results[0].title).toBe("Fix unclosed tag");

    expect(results[1].file).toBe("src/also-broken.ts");
    expect(results[1].line).toBe("20");
    expect(results[1].title).toBe("Another issue");

    results.forEach(assertCommentShape);
  });

  it("does not crash on severely malformed input", () => {
    const garbage =
      "<details><summary>🧹 Nitpick comments (1)<blockquote><details><summary>src/x.ts (1)</summary><blockquote>`5`: **Broken**\nBody.</details>";
    expect(() => parseCodeRabbitReview(garbage)).not.toThrow();
  });
});

// ===========================================================================
// 5. SPECIAL CHARACTERS
// ===========================================================================

describe("Special characters", () => {
  it("handles Unicode file paths", () => {
    const results = parseCodeRabbitReview(SPECIAL_CHARACTERS);
    const japaneseFile = results.find((c) => c.file.includes("日本語"));
    expect(japaneseFile).toBeDefined();
    expect(japaneseFile?.file).toBe("src/i18n/日本語.ts");
  });

  it("handles HTML entities in comment bodies", () => {
    const results = parseCodeRabbitReview(SPECIAL_CHARACTERS);
    const encodingComment = results.find(
      (c) => c.title === "Use proper encoding",
    );
    expect(encodingComment).toBeDefined();
    // Body should have decoded or preserved entities
    expect(encodingComment?.body).toBeTruthy();
  });

  it("handles angle brackets in generic types", () => {
    const results = parseCodeRabbitReview(SPECIAL_CHARACTERS);
    const genericsComment = results.find(
      (c) => c.title === "Simplify generic constraint",
    );
    expect(genericsComment).toBeDefined();
  });

  it("extracts all 3 comments from special characters fixture", () => {
    const results = parseCodeRabbitReview(SPECIAL_CHARACTERS);
    expect(results).toHaveLength(3);
    results.forEach(assertCommentShape);
  });
});

// ===========================================================================
// 6. MIXED CONTENT (text + HTML + markdown)
// ===========================================================================

describe("Mixed content", () => {
  it("extracts comment from mixed HTML/markdown body", () => {
    const results = parseCodeRabbitReview(MIXED_CONTENT);
    expect(results).toHaveLength(1);

    expect(results[0].file).toBe("src/parser/mixed.ts");
    expect(results[0].line).toBe("50-75");
    expect(results[0].title).toBe("Improve parsing robustness");
    expect(results[0].category).toBe("outside-diff");

    assertCommentShape(results[0]);
  });

  it("body contains text content but strips nested HTML details", () => {
    const results = parseCodeRabbitReview(MIXED_CONTENT);
    expect(results[0].body).toContain("parser needs to handle");
  });
});

// ===========================================================================
// 7. LABEL VARIATIONS
// ===========================================================================

describe("Comment label variations", () => {
  it("parses comments with zero, one, two, and three labels", () => {
    const results = parseCodeRabbitReview(LABEL_VARIATIONS);
    expect(results).toHaveLength(4);

    expect(results[0].title).toBe("No labels at all");
    expect(results[1].title).toBe("One label");
    expect(results[2].title).toBe("Two labels");
    expect(results[3].title).toBe("Three labels");

    results.forEach(assertCommentShape);
  });

  it("all comments reference the same file", () => {
    const results = parseCodeRabbitReview(LABEL_VARIATIONS);
    for (const c of results) {
      expect(c.file).toBe("src/labels.ts");
    }
  });

  it("line numbers are sequential across label variants", () => {
    const results = parseCodeRabbitReview(LABEL_VARIATIONS);
    expect(results.map((c) => c.line)).toEqual(["10", "20", "30", "40"]);
  });
});

// ===========================================================================
// 8. BLOCKQUOTE-WRAPPED BODY
// ===========================================================================

describe("Blockquote-wrapped body", () => {
  it("strips > prefixes and still parses correctly", () => {
    const results = parseCodeRabbitReview(BLOCKQUOTE_WRAPPED);
    expect(results).toHaveLength(1);

    expect(results[0].file).toBe("src/wrapped.ts");
    expect(results[0].line).toBe("15");
    expect(results[0].title).toBe("Wrapped comment");
    expect(results[0].body).toContain("blockquote markers");

    assertCommentShape(results[0]);
  });
});

// ===========================================================================
// 9. EMOJI FILE PATH FILTERING
// ===========================================================================

describe("Emoji file path filtering", () => {
  it("filters out category headers with emoji prefixes", () => {
    const results = parseCodeRabbitReview(EMOJI_FILE_PATHS);
    expect(results).toHaveLength(1);
    expect(results[0].file).toBe("src/real-file.ts");
  });
});

// ===========================================================================
// 10. COMMITTABLE SUGGESTIONS
// ===========================================================================

describe("Committable suggestions", () => {
  it("parses comments containing code suggestion blocks", () => {
    const results = parseCodeRabbitReview(COMMITTABLE_SUGGESTION);
    expect(results).toHaveLength(1);
    expect(results[0].title).toBe("Use environment variable for timeout");
    expect(results[0].body).toContain("configurable");

    assertCommentShape(results[0]);
  });
});

// ===========================================================================
// 11. BODY TRUNCATION
// ===========================================================================

describe("Body truncation", () => {
  it("truncates body to 300 characters with ellipsis", () => {
    const longBody = `
<details>
<summary>🧹 Nitpick comments (1)</summary>
<blockquote>

<details>
<summary>src/long.ts (1)</summary><blockquote>

\`1\`: **Long comment**

${"A".repeat(500)}

</blockquote></details>

</blockquote></details>
`;
    const results = parseCodeRabbitReview(longBody);
    expect(results).toHaveLength(1);
    expect(results[0].body.length).toBeLessThanOrEqual(303); // 300 + "..."
    expect(results[0].body).toMatch(/\.\.\.$/);
  });

  it("does not add ellipsis to short bodies", () => {
    const results = parseCodeRabbitReview(BASIC_NITPICK);
    for (const c of results) {
      if (c.body.length <= 300) {
        expect(c.body).not.toMatch(/\.\.\.$/);
      }
    }
  });
});

// ===========================================================================
// 12. MANY FILES (stress test)
// ===========================================================================

describe("Many files", () => {
  it("handles 50 files in a single section", () => {
    const input = generateManyFiles(50);
    const results = parseCodeRabbitReview(input);
    expect(results).toHaveLength(50);

    // Spot-check first and last
    expect(results[0].file).toBe("src/generated/file-000.ts");
    expect(results[0].line).toBe("1");
    expect(results[49].file).toBe("src/generated/file-049.ts");
    expect(results[49].line).toBe("50");

    results.forEach(assertCommentShape);
  });

  it("handles 200 files", () => {
    const input = generateManyFiles(200);
    const results = parseCodeRabbitReview(input);
    expect(results).toHaveLength(200);
  });
});

// ===========================================================================
// 13. LARGE PAYLOAD PERFORMANCE
// ===========================================================================

describe("Large payloads", () => {
  it("parses a ~1MB payload within 5 seconds", () => {
    const input = generateLargePayload(1);
    const start = performance.now();
    const results = parseCodeRabbitReview(input);
    const elapsed = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(5000);
  });

  it("parses a ~10MB payload within 30 seconds", { timeout: 60000 }, () => {
    const input = generateLargePayload(10);
    const start = performance.now();
    const results = parseCodeRabbitReview(input);
    const elapsed = performance.now() - start;

    expect(results.length).toBeGreaterThan(0);
    expect(elapsed).toBeLessThan(30000);
  });
});

// ===========================================================================
// 14. OUTPUT CONTRACT
// ===========================================================================

describe("Output contract", () => {
  it("matches the exact shape required by downstream consumers", () => {
    const results = parseCodeRabbitReview(BASIC_NITPICK);
    const c = results[0];

    // Every field must exist and be a string
    expect(Object.keys(c).sort()).toEqual(
      ["body", "category", "file", "line", "source", "title"].sort(),
    );
    for (const val of Object.values(c)) {
      expect(typeof val).toBe("string");
    }
  });

  it("category is strictly 'nitpick' or 'outside-diff'", () => {
    const results = parseCodeRabbitReview(BOTH_SECTIONS);
    for (const c of results) {
      expect(["nitpick", "outside-diff"]).toContain(c.category);
    }
  });
});
