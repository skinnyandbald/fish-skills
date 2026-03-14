// Shepherd state machine — routing logic and escalation tracking.
// Used as both a library (Vitest) and CLI entrypoint (npx tsx).
//
// CLI usage:
//   npx tsx lib/shepherd-state.ts route '{"bot_comment_count":2,...}'
//   npx tsx lib/shepherd-state.ts track-flags '{"files":[...],"current_flags":{...}}'
//   npx tsx lib/shepherd-state.ts filter-threads '{"threads":[...],"last_timestamp":"..."}'
//   npx tsx lib/shepherd-state.ts summary-action '{"comment_id":"12345"}'
//   npx tsx lib/shepherd-state.ts should-timeout '{"elapsed":7201}'

export interface RouteInput {
  bot_comment_count: number;
  human_comment_count: number;
  status: "NEW_COMMENTS" | "NO_CHANGES" | "MERGED" | "CLOSED" | "ERROR";
  error_type?: string;
  message?: string;
}

export interface RouteOutput {
  action: "RE_RESOLVE" | "CONTINUE_WATCHING" | "POST_SUMMARY" | "EXIT_HUMAN_REVIEW" | "EXIT_ERROR";
  exit_reason?: string;
}

export interface TrackFlagsInput {
  files: string[];
  current_flags: Record<string, number>;
}

export interface TrackFlagsOutput {
  flags: Record<string, number>;
  skip_list: string[];
  escalate: boolean;
  escalation_file?: string;
}

export function route(input: RouteInput): RouteOutput {
  if (input.status === "ERROR") {
    return { action: "EXIT_ERROR", exit_reason: input.message || "API error" };
  }
  if (input.status === "MERGED") {
    return { action: "POST_SUMMARY", exit_reason: "merged" };
  }
  if (input.status === "CLOSED") {
    return { action: "POST_SUMMARY", exit_reason: "closed" };
  }
  if (input.status === "NEW_COMMENTS") {
    if (input.bot_comment_count > 0) {
      return { action: "RE_RESOLVE" };
    }
    if (input.human_comment_count > 0) {
      return { action: "EXIT_HUMAN_REVIEW", exit_reason: "human_comments_only" };
    }
  }
  return { action: "CONTINUE_WATCHING" };
}

export function trackFlags(input: TrackFlagsInput): TrackFlagsOutput {
  const flags = { ...input.current_flags };
  const skip_list: string[] = [];
  let escalate = false;
  let escalation_file: string | undefined;

  // Inherit existing skip list entries (files already at count >= 2)
  for (const [file, count] of Object.entries(flags)) {
    if (count >= 2 && !input.files.includes(file)) {
      skip_list.push(file);
    }
  }

  for (const file of input.files) {
    flags[file] = (flags[file] || 0) + 1;
    if (flags[file] >= 3) {
      escalate = true;
      escalation_file = file;
    } else if (flags[file] >= 2) {
      skip_list.push(file);
    }
  }

  return { flags, skip_list, escalate, escalation_file };
}

export interface ThreadInfo {
  id: string;
  path: string;
  isResolved: boolean;
  lastAuthor: string;
  lastCreatedAt: string;
}

export function filterThreadsForResolution(
  threads: ThreadInfo[],
  lastTimestamp: string,
): string[] {
  return threads
    .filter((t) => {
      if (t.isResolved) return false;
      if (t.lastCreatedAt <= lastTimestamp) return false;
      if (!t.lastAuthor.endsWith("[bot]")) return false;
      if (!t.id.startsWith("PRRT_")) return false;
      return true;
    })
    .map((t) => t.id);
}

const TIMEOUT_SECONDS = 7200; // 2 hours

export function shouldTimeout(elapsedSeconds: number): boolean {
  return elapsedSeconds >= TIMEOUT_SECONDS;
}

export interface SummaryAction {
  method: "PATCH" | "POST";
  comment_id?: string;
}

export function determineSummaryAction(existingCommentId: string | null): SummaryAction {
  if (existingCommentId && existingCommentId.length > 0) {
    return { method: "PATCH", comment_id: existingCommentId };
  }
  return { method: "POST" };
}

// CLI entrypoint — detect when run directly via `npx tsx` or `node`
const isCLI = import.meta.url === `file://${process.argv[1]}` ||
  process.argv[1]?.endsWith("shepherd-state.ts") ||
  process.argv[1]?.endsWith("shepherd-state.js");
if (isCLI) {
  const subcommand = process.argv[2];
  const jsonArg = process.argv[3];

  if (!subcommand || !jsonArg) {
    console.error("Usage: shepherd-state.ts <route|track-flags|filter-threads|summary-action|should-timeout> '<json>'");
    process.exit(1);
  }

  try {
    const input = JSON.parse(jsonArg);
    let result: RouteOutput | TrackFlagsOutput | string[] | SummaryAction | { timeout: boolean };

    if (subcommand === "route") {
      result = route(input as RouteInput);
    } else if (subcommand === "track-flags") {
      result = trackFlags(input as TrackFlagsInput);
    } else if (subcommand === "filter-threads") {
      result = filterThreadsForResolution(input.threads, input.last_timestamp);
    } else if (subcommand === "summary-action") {
      result = determineSummaryAction(input.comment_id);
    } else if (subcommand === "should-timeout") {
      result = { timeout: shouldTimeout(input.elapsed) };
    } else {
      console.error(`Unknown subcommand: ${subcommand}`);
      process.exit(1);
    }

    console.log(JSON.stringify(result));
  } catch (err) {
    console.error(`Failed to parse input: ${err}`);
    process.exit(1);
  }
}
