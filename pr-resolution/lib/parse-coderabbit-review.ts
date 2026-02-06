import * as cheerio from "cheerio";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface CodeRabbitComment {
  category: "nitpick" | "outside-diff";
  file: string;
  line: string;
  title: string;
  body: string;
  source: "coderabbit-review-body";
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const SECTION_MARKERS: Array<{
  marker: string;
  category: CodeRabbitComment["category"];
}> = [
  { marker: "Outside diff range comments", category: "outside-diff" },
  { marker: "Nitpick comments", category: "nitpick" },
];

/** Emoji prefixes used by CodeRabbit for category headers (not file paths) */
const EMOJI_PREFIX = /^[\p{Emoji_Presentation}\p{Extended_Pictographic}]/u;

const MAX_BODY_LENGTH = 300;

// ---------------------------------------------------------------------------
// Comment regex
//
// Matches: `42-45`: _Label_ | _Label_ **Title Text**
// - Group 1: line number or range (e.g. "42-45" or "42")
// - Group 2: title text
//
// The label section is zero or more occurrences of _text_ optionally
// separated by | pipes, handled by a non-greedy match up to the first **.
// ---------------------------------------------------------------------------

const COMMENT_REGEX =
  /`(\d+(?:-\d+)?)`:\s*(?:(?:_[^_]*_\s*\|?\s*)*)\*\*([^*]+)\*\*/g;

// ---------------------------------------------------------------------------
// Main export
// ---------------------------------------------------------------------------

export function parseCodeRabbitReview(body: string): CodeRabbitComment[] {
  if (!body || typeof body !== "string" || body.length < 100) {
    return [];
  }

  // Strip blockquote > prefixes (GitHub sometimes wraps review bodies)
  body = body.replace(/^> ?/gm, "");

  const results: CodeRabbitComment[] = [];

  for (const { marker, category } of SECTION_MARKERS) {
    const sectionContent = extractSection(body, marker);
    if (!sectionContent) continue;

    const fileBlocks = extractFileBlocks(sectionContent);
    for (const { filePath, content } of fileBlocks) {
      const comments = extractComments(content, filePath, category);
      results.push(...comments);
    }
  }

  return results;
}

// ---------------------------------------------------------------------------
// Section extraction
//
// Finds the top-level <details> whose <summary> contains the marker text,
// then returns the inner HTML of its <blockquote> child.
// ---------------------------------------------------------------------------

function extractSection(body: string, marker: string): string | null {
  // Find the section by marker text in the raw string first, then extract
  // the content between the section's <blockquote> and closing tags.
  // We use cheerio on just the relevant portion to handle nesting correctly.

  const markerIdx = body.indexOf(marker);
  if (markerIdx === -1) return null;

  // Walk backward to find the <details> that contains this <summary>
  const detailsStart = body.lastIndexOf("<details>", markerIdx);
  if (detailsStart === -1) return null;

  // Find the matching </details> by tracking depth from detailsStart
  const sectionHtml = extractMatchingDetails(body, detailsStart);
  if (!sectionHtml) return null;

  // Use cheerio to get the content of the top-level <blockquote>
  const doc = cheerio.load(sectionHtml, { xml: false });
  const topBlockquote = doc("details").first().children("blockquote").first();
  if (topBlockquote.length === 0) return null;

  return topBlockquote.html();
}

// ---------------------------------------------------------------------------
// Extract matching <details>...</details> block from a position
// ---------------------------------------------------------------------------

function extractMatchingDetails(body: string, start: number): string | null {
  let depth = 0;
  let pos = start;

  while (pos < body.length) {
    const nextOpen = body.indexOf("<details>", pos + (depth === 0 ? 1 : 0));
    const nextOpen2 = body.indexOf("<details\n", pos + (depth === 0 ? 1 : 0));
    const effectiveOpen = minPositive(nextOpen, nextOpen2);

    const nextClose = body.indexOf("</details>", pos + 1);

    if (nextClose === -1) return null;

    if (effectiveOpen !== -1 && effectiveOpen < nextClose) {
      depth++;
      pos = effectiveOpen + 9;
    } else {
      if (depth === 0) {
        return body.substring(start, nextClose + 10);
      }
      depth--;
      pos = nextClose + 10;
    }
  }

  return null;
}

function minPositive(a: number, b: number): number {
  if (a === -1) return b;
  if (b === -1) return a;
  return Math.min(a, b);
}

// ---------------------------------------------------------------------------
// File block extraction
//
// Within a section's blockquote content, find each <details> block that
// represents a file (has a summary like "src/foo.ts (3)").
// ---------------------------------------------------------------------------

interface FileBlock {
  filePath: string;
  content: string;
}

function extractFileBlocks(sectionHtml: string): FileBlock[] {
  const blocks: FileBlock[] = [];

  // Match file-level <details> entries: <details>\n<summary>path (N)</summary><blockquote>
  // Using regex for the header, then depth-tracking for the content boundary.
  // This avoids cheerio.load on potentially huge section HTML (performance).
  const fileHeaderRegex =
    /<details>\s*\n?\s*<summary>([^<\n]+?)\s*\(\d+\)<\/summary><blockquote>/g;

  for (
    let headerMatch = fileHeaderRegex.exec(sectionHtml);
    headerMatch !== null;
    headerMatch = fileHeaderRegex.exec(sectionHtml)
  ) {
    const rawPath = headerMatch[1].trim();

    // Skip emoji-prefixed category headers and non-file entries
    if (EMOJI_PREFIX.test(rawPath) || !rawPath.includes(".")) continue;

    const contentStart = headerMatch.index + headerMatch[0].length;
    const content = extractBlockquoteContent(sectionHtml, contentStart);
    if (content !== null) {
      blocks.push({ filePath: rawPath, content });
    }
  }

  return blocks;
}

/**
 * Starting from `start` (just after `<blockquote>`), find the matching
 * `</blockquote></details>` by tracking `<details>` nesting depth.
 */
function extractBlockquoteContent(html: string, start: number): string | null {
  let depth = 0;
  let pos = start;

  while (pos < html.length) {
    const nextOpen = html.indexOf("<details>", pos);
    const nextCloseBq = html.indexOf("</blockquote></details>", pos);
    const nextCloseD = html.indexOf("</details>", pos);

    // Find the earliest close tag (either type)
    let nextClose: number;
    let closeLen: number;
    let isBqClose: boolean;

    if (
      nextCloseBq !== -1 &&
      (nextCloseD === -1 || nextCloseBq <= nextCloseD)
    ) {
      nextClose = nextCloseBq;
      closeLen = 23;
      isBqClose = true;
    } else if (nextCloseD !== -1) {
      nextClose = nextCloseD;
      closeLen = 10;
      isBqClose = false;
    } else {
      return null;
    }

    if (nextOpen !== -1 && nextOpen < nextClose) {
      depth++;
      pos = nextOpen + 9;
    } else if (depth === 0 && isBqClose) {
      return html.substring(start, nextClose);
    } else {
      depth--;
      pos = nextClose + closeLen;
    }
  }

  return null;
}

// ---------------------------------------------------------------------------
// Comment extraction from a file block's content
// ---------------------------------------------------------------------------

function extractComments(
  content: string,
  filePath: string,
  category: CodeRabbitComment["category"],
): CodeRabbitComment[] {
  const comments: CodeRabbitComment[] = [];

  // Decode HTML entities so regex can match backticks, asterisks, etc.
  const decoded = decodeEntities(content);

  const matches: Array<{ index: number; line: string; title: string }> = [];

  // Reset regex state and collect all matches
  COMMENT_REGEX.lastIndex = 0;
  for (
    let m = COMMENT_REGEX.exec(decoded);
    m !== null;
    m = COMMENT_REGEX.exec(decoded)
  ) {
    matches.push({
      index: m.index + m[0].length,
      line: m[1],
      title: m[2].trim(),
    });
  }

  for (let i = 0; i < matches.length; i++) {
    const { line, title } = matches[i];
    const bodyStart = matches[i].index;
    const bodyEnd =
      i + 1 < matches.length
        ? decoded.lastIndexOf(
            "\n",
            matches[i + 1].index - matches[i + 1].line.length - 10,
          )
        : decoded.length;

    const effectiveEnd = bodyEnd > bodyStart ? bodyEnd : decoded.length;
    let bodyText = decoded.substring(bodyStart, effectiveEnd);

    bodyText = cleanBody(bodyText);

    comments.push({
      category,
      file: filePath,
      line,
      title,
      body: truncate(bodyText, MAX_BODY_LENGTH),
      source: "coderabbit-review-body",
    });
  }

  return comments;
}

// ---------------------------------------------------------------------------
// Body cleaning
// ---------------------------------------------------------------------------

function cleanBody(raw: string): string {
  let text = raw;

  // Remove nested <details>...</details> blocks (suggested implementations, etc.)
  text = text.replace(/<details>[\s\S]*?<\/details>/g, "");

  // Strip remaining HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Replace code blocks with [code]
  text = text.replace(/```[\s\S]*?```/g, "[code]");

  // Collapse whitespace
  text = text.replace(/\n+/g, " ");
  text = text.replace(/\s+/g, " ");

  return text.trim();
}

// ---------------------------------------------------------------------------
// HTML entity decoding
// ---------------------------------------------------------------------------

function decodeEntities(html: string): string {
  return html
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&#x27;/g, "'");
}

// ---------------------------------------------------------------------------
// Truncation
// ---------------------------------------------------------------------------

function truncate(text: string, maxLength: number): string {
  if (text.length <= maxLength) return text;
  return `${text.substring(0, maxLength)}...`;
}
