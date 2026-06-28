# Research: Review UX Enhancements

**Date**: 2026-06-28

---

## 1. Spec highlight — sourcing added-line numbers

**Decision**: Extract added line numbers for each spec file from the *already-fetched*
unified diff in `server.js`. No extra `gh` call needed. Walk the diff for each spec
file's hunk rows: every `+` line increments `newNo` and is collected; `-` and context
lines are not. Return `addedLines: number[]` alongside `markdown` in each `specFiles`
entry.

**Rationale**: The raw diff is already in memory when building `specFiles`. Reusing it
avoids any extra latency and keeps the change to a single payload field addition.

**Alternatives considered**: Fetching a diff-only view via `gh api` for each spec file
separately — rejected as redundant; the unified diff already contains this information.

---

## 2. Spec highlight — mapping diff line numbers to rendered markdown

**Decision**: In `renderMarkdown()`, track the current output line index as each
markdown line is emitted. When `addedLines` contains that index, wrap the emitted
element in a `<div class="md-highlight">` (or add the class directly to the paragraph/
list item/heading element). Line index is 1-based and matches the `newNo` values from
`parseDiff`.

**Rationale**: The markdown renderer already walks the source text line-by-line. Adding
a line counter and a Set lookup (`addedLinesSet.has(lineIdx)`) is O(1) per line and
requires no additional parsing.

**Alternatives considered**: Diffing the rendered HTML — rejected as fragile and
complex. Post-processing the DOM — rejected as a second pass when a single pass
suffices.

---

## 3. Reply-to-thread — GitHub API endpoint

**Decision**: Use `gh api repos/{repo}/pulls/comments/{comment_id}/replies --method POST`
with a JSON body `{ body: "..." }`. This is the correct endpoint for replying into an
existing pull request review comment thread (not the reviews endpoint, not the issue
comments endpoint).

**Rationale**: The spec assumption is correct — this endpoint is distinct from both
`/pulls/{num}/reviews` (used for full review submission) and `/issues/{num}/comments`
(PR-level comments). It threads the reply under the parent comment on GitHub.

**Alternatives considered**: Using the reviews endpoint with `in_reply_to` field —
possible but less direct; the dedicated replies endpoint is the GitHub-recommended path.

---

## 4. Reply-to-thread — server route vs direct gh call

**Decision**: Add a `POST /api/prs/:num/comment/reply` route to `server.js` that
accepts `{ comment_id, body, repo }` and calls `gh api` with `--method POST`. Keeps
the pattern consistent with the existing review/comment routes and avoids exposing the
raw GitHub API shape to the frontend.

**Rationale**: Consistent with constitution Principle III (all GitHub API calls through
`gh` on the server). The frontend sends a simple `{ comment_id, body }` payload; the
server handles the `gh api` call and error translation.

---

## 5. Viewed state — storage approach

**Decision**: Store Viewed state in `state.viewed` as a `Map<prNum, Set<filePath>>`.
Scoped to the current PR: when `openPR(num)` is called with a different `num`, the
previous PR's Viewed set is left in the map but the active set switches. This means
Viewed state survives tab switching within a PR but resets implicitly when a new PR
is opened (the UI reads from the current PR's set, which starts empty).

**Rationale**: Simplest correct implementation. No localStorage needed (session-only
per spec). A Map keyed by PR number naturally gives per-PR scoping without explicit
reset logic.

**Alternatives considered**: A flat `Set<filePath>` reset on PR open — slightly simpler
but loses Viewed state if the user briefly switches to another PR and comes back.
The Map approach is marginally better UX for no extra complexity.
