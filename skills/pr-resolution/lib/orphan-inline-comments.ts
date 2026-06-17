export interface ReviewThreadComment {
  id: string;
  body: string;
  author: { login: string } | null;
  createdAt: string;
}

export interface ReviewThread {
  id: string;
  isResolved: boolean;
  path: string;
  line: number | null;
  comments: { nodes: ReviewThreadComment[] };
}

export interface InlineComment {
  id: number;
  user: { login: string } | null;
  body: string;
  path: string;
  line: number | null;
  in_reply_to_id: number | null;
  pull_request_review_id: number | null;
  html_url: string;
  created_at: string;
}

export interface GetPrCommentsOutput {
  review_threads: ReviewThread[];
  inline_comments: InlineComment[];
}

/**
 * Returns inline comments that are root comments (no in_reply_to_id) whose
 * author does not appear in ANY review thread. These are "orphan" comments —
 * posted directly via the REST API without going through the formal GitHub
 * review flow, and thus invisible to thread-only discovery.
 *
 * Root cause: bots like chatgpt-codex-connector post inline comments via
 * POST /repos/:owner/:repo/pulls/:pr/comments without first submitting a
 * formal review (POST /pulls/:pr/reviews). GitHub's GraphQL reviewThreads
 * only surfaces comments attached to formal reviews, so these bots are
 * silently skipped when discovery relies solely on reviewThreads.
 */
export function findOrphanInlineComments(output: GetPrCommentsOutput): InlineComment[] {
  const threadAuthors = new Set<string>();
  if (output?.review_threads) {
    for (const thread of output.review_threads) {
      if (thread?.comments?.nodes) {
        for (const comment of thread.comments.nodes) {
          if (comment?.author?.login) {
            threadAuthors.add(comment.author.login);
          }
        }
      }
    }
  }

  if (!output?.inline_comments) {
    return [];
  }

  return output.inline_comments.filter(
    (c) => c.in_reply_to_id == null && c.user?.login && !threadAuthors.has(c.user.login),
  );
}
