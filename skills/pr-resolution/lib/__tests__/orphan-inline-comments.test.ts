import { describe, expect, it } from "vitest";
import {
  findOrphanInlineComments,
  type GetPrCommentsOutput,
  type InlineComment,
  type ReviewThread,
} from "../orphan-inline-comments.js";

// ---------------------------------------------------------------------------
// Fixtures
// ---------------------------------------------------------------------------

function makeThread(overrides: Partial<ReviewThread> = {}): ReviewThread {
  return {
    id: "T_thread1",
    isResolved: false,
    path: "src/foo.ts",
    line: 10,
    comments: {
      nodes: [
        {
          id: "C_comment1",
          body: "Some comment",
          author: { login: "coderabbitai[bot]" },
          createdAt: "2026-01-01T00:00:00Z",
        },
      ],
    },
    ...overrides,
  };
}

function makeInlineComment(overrides: Partial<InlineComment> = {}): InlineComment {
  return {
    id: 1001,
    user: { login: "chatgpt-codex-connector[bot]" },
    body: "P2 suggestion",
    path: "src/foo.ts",
    line: 20,
    in_reply_to_id: null,
    pull_request_review_id: null,
    html_url: "https://github.com/org/repo/pull/1#discussion_r1001",
    created_at: "2026-01-01T00:00:00Z",
    ...overrides,
  };
}

// ---------------------------------------------------------------------------
// Tests
// ---------------------------------------------------------------------------

describe("findOrphanInlineComments", () => {
  it("returns empty array when there are no inline comments", () => {
    const output: GetPrCommentsOutput = {
      review_threads: [makeThread()],
      inline_comments: [],
    };
    expect(findOrphanInlineComments(output)).toEqual([]);
  });

  it("returns empty array when all root inline comment authors are in threads", () => {
    const output: GetPrCommentsOutput = {
      review_threads: [makeThread()], // coderabbitai[bot] is in thread
      inline_comments: [
        makeInlineComment({ id: 1, user: { login: "coderabbitai[bot]" } }),
      ],
    };
    expect(findOrphanInlineComments(output)).toEqual([]);
  });

  it("returns inline comments whose author does not appear in any thread", () => {
    const orphan = makeInlineComment({ id: 999, user: { login: "chatgpt-codex-connector[bot]" } });
    const output: GetPrCommentsOutput = {
      review_threads: [makeThread()], // only coderabbitai[bot] in threads
      inline_comments: [orphan],
    };
    expect(findOrphanInlineComments(output)).toEqual([orphan]);
  });

  it("excludes reply comments (in_reply_to_id set) even when author is not in threads", () => {
    const reply = makeInlineComment({
      id: 42,
      user: { login: "chatgpt-codex-connector[bot]" },
      in_reply_to_id: 41,
    });
    const output: GetPrCommentsOutput = {
      review_threads: [],
      inline_comments: [reply],
    };
    expect(findOrphanInlineComments(output)).toEqual([]);
  });

  it("handles multiple orphan comments from the same author across different files", () => {
    const a = makeInlineComment({ id: 1, path: "src/a.ts", line: 10 });
    const b = makeInlineComment({ id: 2, path: "src/b.ts", line: 20 });
    const output: GetPrCommentsOutput = {
      review_threads: [],
      inline_comments: [a, b],
    };
    expect(findOrphanInlineComments(output)).toEqual([a, b]);
  });

  it("handles empty review_threads — all root inline comments are orphans", () => {
    const a = makeInlineComment({ id: 1, user: { login: "bot-a[bot]" } });
    const b = makeInlineComment({ id: 2, user: { login: "bot-b[bot]" } });
    const output: GetPrCommentsOutput = {
      review_threads: [],
      inline_comments: [a, b],
    };
    expect(findOrphanInlineComments(output)).toEqual([a, b]);
  });

  it("mixes thread-covered and orphan comments correctly", () => {
    const geminiComment = makeInlineComment({
      id: 10,
      user: { login: "gemini-code-assist[bot]" },
    });
    const codexComment = makeInlineComment({
      id: 20,
      user: { login: "chatgpt-codex-connector[bot]" },
    });
    const codexReply = makeInlineComment({
      id: 21,
      user: { login: "chatgpt-codex-connector[bot]" },
      in_reply_to_id: 20,
    });
    const output: GetPrCommentsOutput = {
      review_threads: [
        makeThread({
          comments: { nodes: [{ id: "G1", body: "g", author: { login: "gemini-code-assist[bot]" }, createdAt: "" }] },
        }),
      ],
      inline_comments: [geminiComment, codexComment, codexReply],
    };
    // gemini is in threads → not orphan
    // codexReply has in_reply_to_id → not orphan
    // codexComment is root and author not in threads → orphan
    expect(findOrphanInlineComments(output)).toEqual([codexComment]);
  });

  it("reproduces the real chatgpt-codex-connector PR #271 scenario", () => {
    // Simulates the actual bug: 4 chatgpt-codex-connector root comments were
    // posted without formal review threads, so thread-only discovery missed them.
    const codexComments: InlineComment[] = [
      makeInlineComment({ id: 3431701397, path: "src/app.ts", line: 2165, body: "Enforce the tool-free synthesis step" }),
      makeInlineComment({ id: 3431701400, path: "src/signups/format-reply.ts", line: 165, body: "Surface Apollo auth details" }),
      makeInlineComment({ id: 3431701403, path: "src/app.ts", line: 2200, body: "Fetch calendar fields" }),
      makeInlineComment({ id: 3431701405, path: "src/agents/meeting-prep-cron.ts", line: 114, body: "Canonicalize attendees" }),
    ];
    const coderabbitThread = makeThread({
      comments: { nodes: [{ id: "CR1", body: "cr", author: { login: "coderabbitai[bot]" }, createdAt: "" }] },
    });
    const geminiThread = makeThread({
      comments: { nodes: [{ id: "G1", body: "g", author: { login: "gemini-code-assist[bot]" }, createdAt: "" }] },
    });
    const output: GetPrCommentsOutput = {
      review_threads: [coderabbitThread, geminiThread],
      inline_comments: codexComments,
    };
    expect(findOrphanInlineComments(output)).toHaveLength(4);
    expect(findOrphanInlineComments(output).map((c) => c.id)).toEqual([
      3431701397, 3431701400, 3431701403, 3431701405,
    ]);
  });
});
