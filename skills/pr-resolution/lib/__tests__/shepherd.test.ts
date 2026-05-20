import { describe, expect, it } from "vitest";
import {
  route,
  trackFlags,
  filterThreadsForResolution,
  determineSummaryAction,
  shouldTimeout,
  evaluateSettleStatus,
} from "../shepherd-state.js";

describe("Shepherd state routing", () => {
  // T11: File flag count 1→2
  it("adds file to skip list at count 2", () => {
    const result = trackFlags({
      files: ["src/Button.tsx"],
      current_flags: { "src/Button.tsx": 1 },
    });
    expect(result.skip_list).toContain("src/Button.tsx");
    expect(result.flags["src/Button.tsx"]).toBe(2);
    expect(result.escalate).toBe(false);
  });

  // T12: File flag count 2→3
  it("triggers escalation at count 3", () => {
    const result = trackFlags({
      files: ["src/Button.tsx"],
      current_flags: { "src/Button.tsx": 2 },
    });
    expect(result.flags["src/Button.tsx"]).toBe(3);
    expect(result.escalate).toBe(true);
    expect(result.escalation_file).toBe("src/Button.tsx");
  });

  // T13: Human-only routing
  it("routes human-only comments to exit", () => {
    const result = route({
      bot_comment_count: 0,
      human_comment_count: 1,
      status: "NEW_COMMENTS",
    });
    expect(result.action).toBe("EXIT_HUMAN_REVIEW");
  });

  // T14: Bot+human routing
  it("routes bot+human comments to RE_RESOLVE", () => {
    const result = route({
      bot_comment_count: 1,
      human_comment_count: 1,
      status: "NEW_COMMENTS",
    });
    expect(result.action).toBe("RE_RESOLVE");
  });

  // T15: NO_CHANGES → CONTINUE_WATCHING
  it("routes NO_CHANGES to CONTINUE_WATCHING", () => {
    const result = route({
      bot_comment_count: 0,
      human_comment_count: 0,
      status: "NO_CHANGES",
    });
    expect(result.action).toBe("CONTINUE_WATCHING");
  });

  // T16: MERGED/CLOSED → POST_SUMMARY
  it("routes MERGED to POST_SUMMARY", () => {
    const result = route({
      bot_comment_count: 0,
      human_comment_count: 0,
      status: "MERGED",
    });
    expect(result.action).toBe("POST_SUMMARY");
    expect(result.exit_reason).toBe("merged");
  });

  it("routes CLOSED to POST_SUMMARY", () => {
    const result = route({
      bot_comment_count: 0,
      human_comment_count: 0,
      status: "CLOSED",
    });
    expect(result.action).toBe("POST_SUMMARY");
    expect(result.exit_reason).toBe("closed");
  });
});

describe("Shepherd error handling", () => {
  // T19: Wall-clock timeout
  it("returns true when elapsed exceeds 2 hours", () => {
    expect(shouldTimeout(7201)).toBe(true);   // 2h + 1s
    expect(shouldTimeout(7200)).toBe(true);   // exactly 2h
    expect(shouldTimeout(7199)).toBe(false);  // just under 2h
    expect(shouldTimeout(0)).toBe(false);     // start of session
  });

  // T21: Error routing
  it("routes ERROR status to EXIT_ERROR", () => {
    const result = route({
      bot_comment_count: 0,
      human_comment_count: 0,
      status: "ERROR",
      error_type: "rate_limit",
      message: "API rate limit exceeded",
    });
    expect(result.action).toBe("EXIT_ERROR");
    expect(result.exit_reason).toContain("rate limit");
  });
});

describe("Summary comment idempotency", () => {
  // T23: Marker exists → PATCH
  it("returns PATCH when existing comment ID found", () => {
    const action = determineSummaryAction("12345");
    expect(action.method).toBe("PATCH");
    expect(action.comment_id).toBe("12345");
  });

  // T23b: No marker → POST
  it("returns POST when no existing comment", () => {
    const action = determineSummaryAction(null);
    expect(action.method).toBe("POST");
  });
});

describe("Phase 6 gating", () => {
  // T24: Push failure prevents shepherd launch
  it("push failure input produces no-launch action", () => {
    const result = route({
      bot_comment_count: 0,
      human_comment_count: 0,
      status: "ERROR",
      message: "Push failed",
    });
    expect(result.action).toBe("EXIT_ERROR");
  });
});

describe("Thread discovery filtering", () => {
  // T25: Human thread exclusion
  it("excludes threads where latest comment is from human", () => {
    const threads = filterThreadsForResolution([
      { id: "PRRT_1", path: "src/a.ts", isResolved: false, lastAuthor: "alice", lastCreatedAt: "2026-06-01T00:00:00Z" },
      { id: "PRRT_2", path: "src/b.ts", isResolved: false, lastAuthor: "coderabbitai[bot]", lastCreatedAt: "2026-06-01T00:00:00Z" },
    ], "2025-01-01T00:00:00Z");
    expect(threads).toEqual(["PRRT_2"]);
  });

  // T26: Bot reply on old thread
  it("discovers thread with old root but new bot reply", () => {
    const threads = filterThreadsForResolution([
      { id: "PRRT_3", path: "src/c.ts", isResolved: false, lastAuthor: "coderabbitai[bot]", lastCreatedAt: "2026-06-01T00:00:00Z" },
    ], "2026-05-01T00:00:00Z");
    expect(threads).toEqual(["PRRT_3"]);
  });
});

describe("Thread ID mapping", () => {
  // T27: GraphQL thread IDs have PRRT_ prefix
  it("accepts PRRT_ prefixed thread IDs", () => {
    const threads = filterThreadsForResolution([
      { id: "PRRT_kwDOQ5hYsc5p5d0U", path: "src/Button.tsx", isResolved: false, lastAuthor: "coderabbitai[bot]", lastCreatedAt: "2026-06-01T00:00:00Z" },
    ], "2025-01-01T00:00:00Z");
    expect(threads[0]).toMatch(/^PRRT_/);
  });

  // T28: REST comment IDs rejected
  it("rejects PRRC_ prefixed IDs", () => {
    const threads = filterThreadsForResolution([
      { id: "PRRC_kwDOQ5hYsc5p5d0U", path: "src/x.ts", isResolved: false, lastAuthor: "coderabbitai[bot]", lastCreatedAt: "2026-06-01T00:00:00Z" },
    ], "2025-01-01T00:00:00Z");
    expect(threads).toEqual([]);
  });

  // T29: Pagination exhaustion — 150 threads
  it("handles 150 threads across pages", () => {
    const manyThreads = Array.from({ length: 150 }, (_, i) => ({
      id: `PRRT_thread${i}`,
      path: `src/file${i}.ts`,
      isResolved: false,
      lastAuthor: "coderabbitai[bot]",
      lastCreatedAt: "2026-06-01T00:00:00Z",
    }));
    const threads = filterThreadsForResolution(manyThreads, "2025-01-01T00:00:00Z");
    expect(threads).toHaveLength(150);
  });
});

describe("Edge cases", () => {
  // T34: GraphQL partial errors — data still processed
  it("filters valid bot-authored unresolved threads", () => {
    const threads = filterThreadsForResolution([
      { id: "PRRT_1", path: "src/x.ts", isResolved: false, lastAuthor: "coderabbitai[bot]", lastCreatedAt: "2026-06-01T00:00:00Z" },
    ], "2025-01-01T00:00:00Z");
    expect(threads).toHaveLength(1);
  });

  // T35: determineSummaryAction edge cases
  it("determineSummaryAction treats empty string as no existing comment", () => {
    const action = determineSummaryAction("");
    expect(action.method).toBe("POST");
  });

  it("determineSummaryAction treats null as no existing comment", () => {
    const action = determineSummaryAction(null);
    expect(action.method).toBe("POST");
  });

  // T36: Same-second timestamp
  it("excludes comments at exact same second as timestamp (strict >)", () => {
    const threads = filterThreadsForResolution([
      { id: "PRRT_1", path: "src/x.ts", isResolved: false, lastAuthor: "coderabbitai[bot]", lastCreatedAt: "2026-06-01T00:00:00Z" },
    ], "2026-06-01T00:00:00Z"); // Same timestamp
    expect(threads).toEqual([]); // strict > means same-second excluded
  });
});

describe("CI settle status evaluation", () => {
  // T37: All checks completed and passing → SETTLED
  it("returns SETTLED when all checks completed successfully", () => {
    const result = evaluateSettleStatus([
      { name: "Typecheck & Tests", status: "completed", conclusion: "success", app_slug: "github-actions" },
      { name: "CodeRabbit", status: "completed", conclusion: "success", app_slug: "coderabbit-ai" },
      { name: "CodeScene", status: "completed", conclusion: "neutral", app_slug: "codescene" },
    ]);
    expect(result.action).toBe("SETTLED");
    expect(result.pending_count).toBe(0);
    expect(result.actions_failures).toEqual([]);
  });

  // T38: Some checks still running, none failed → KEEP_WAITING
  it("returns KEEP_WAITING when checks are pending and none failed", () => {
    const result = evaluateSettleStatus([
      { name: "Typecheck & Tests", status: "completed", conclusion: "success", app_slug: "github-actions" },
      { name: "CodeRabbit", status: "in_progress", conclusion: null, app_slug: "coderabbit-ai" },
    ]);
    expect(result.action).toBe("KEEP_WAITING");
    expect(result.pending_count).toBe(1);
    expect(result.actions_failures).toEqual([]);
  });

  // T39: THE BUG — Actions check failed while bot check still pending → FAIL_FAST
  it("returns FAIL_FAST when a GitHub Actions check failed even though other checks are pending", () => {
    const result = evaluateSettleStatus([
      { name: "CI / Typecheck & Tests", status: "completed", conclusion: "failure", app_slug: "github-actions" },
      { name: "Semgrep", status: "completed", conclusion: "success", app_slug: "github-actions" },
      { name: "CodeRabbit", status: "in_progress", conclusion: null, app_slug: "coderabbit-ai" },
      { name: "CodeScene Code Health", status: "completed", conclusion: "success", app_slug: "codescene" },
    ]);
    expect(result.action).toBe("FAIL_FAST");
    expect(result.pending_count).toBe(1);
    expect(result.actions_failures).toEqual(["CI / Typecheck & Tests"]);
  });

  // T40: Non-Actions check failed while pending → KEEP_WAITING (only Actions failures trigger fail-fast)
  it("keeps waiting when only non-Actions checks have failed", () => {
    const result = evaluateSettleStatus([
      { name: "Typecheck & Tests", status: "completed", conclusion: "success", app_slug: "github-actions" },
      { name: "CodeScene Coverage", status: "completed", conclusion: "failure", app_slug: "codescene" },
      { name: "CodeRabbit", status: "in_progress", conclusion: null, app_slug: "coderabbit-ai" },
    ]);
    expect(result.action).toBe("KEEP_WAITING");
    expect(result.pending_count).toBe(1);
    expect(result.actions_failures).toEqual([]);
  });

  // T41: Actions timed_out counts as failure for fail-fast
  it("treats timed_out and cancelled Actions checks as fail-fast triggers", () => {
    const result = evaluateSettleStatus([
      { name: "CI / Build", status: "completed", conclusion: "timed_out", app_slug: "github-actions" },
      { name: "CodeRabbit", status: "queued", conclusion: null, app_slug: "coderabbit-ai" },
    ]);
    expect(result.action).toBe("FAIL_FAST");
    expect(result.actions_failures).toEqual(["CI / Build"]);
  });

  // T42: All checks settled with failures → SETTLED (not FAIL_FAST)
  it("returns SETTLED when all checks completed even if some failed", () => {
    const result = evaluateSettleStatus([
      { name: "Typecheck & Tests", status: "completed", conclusion: "failure", app_slug: "github-actions" },
      { name: "CodeRabbit", status: "completed", conclusion: "success", app_slug: "coderabbit-ai" },
    ]);
    expect(result.action).toBe("SETTLED");
    expect(result.pending_count).toBe(0);
    expect(result.actions_failures).toEqual(["Typecheck & Tests"]);
  });

  // T43: Multiple Actions failures with pending checks
  it("reports all failed Actions check names on fail-fast", () => {
    const result = evaluateSettleStatus([
      { name: "CI / Lint", status: "completed", conclusion: "failure", app_slug: "github-actions" },
      { name: "CI / Typecheck", status: "completed", conclusion: "failure", app_slug: "github-actions" },
      { name: "CodeRabbit", status: "in_progress", conclusion: null, app_slug: "coderabbit-ai" },
    ]);
    expect(result.action).toBe("FAIL_FAST");
    expect(result.actions_failures).toEqual(["CI / Lint", "CI / Typecheck"]);
  });

  // T44: Empty check runs array → SETTLED (edge case)
  it("returns SETTLED for empty check runs", () => {
    const result = evaluateSettleStatus([]);
    expect(result.action).toBe("SETTLED");
    expect(result.pending_count).toBe(0);
  });

  // T45: skipped conclusion is passing, not failing
  it("treats skipped conclusion as passing", () => {
    const result = evaluateSettleStatus([
      { name: "CI / Optional", status: "completed", conclusion: "skipped", app_slug: "github-actions" },
      { name: "CodeRabbit", status: "in_progress", conclusion: null, app_slug: "coderabbit-ai" },
    ]);
    expect(result.action).toBe("KEEP_WAITING");
    expect(result.actions_failures).toEqual([]);
  });
});
