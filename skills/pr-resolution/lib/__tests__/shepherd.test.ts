import { describe, expect, it } from "vitest";
import { route, trackFlags } from "../shepherd-state.js";

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
