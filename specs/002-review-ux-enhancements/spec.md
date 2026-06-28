# Feature Specification: Review UX Enhancements

**Feature Branch**: `002-review-ux-enhancements`

**Created**: 2026-06-28

**Status**: Draft

**Input**: Three reviewer UX improvements — spec panel added-line highlights, reply-to-thread, and per-file "Viewed" tracking.

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - See what changed in a spec file at a glance (Priority: P1)

A reviewer opens a PR that modifies a `spec.md` or `tasks.md`. Instead of switching
to the diff view to understand what changed, they read the spec panel as prose — and
the lines that were *added in this PR* are subtly highlighted in green, so the new
content stands out from the unchanged context without obscuring readability.

**Why this priority**: This is the "killer idea" — it's the thing neither the terminal
nor GitHub's web UI does well. Without it, the spec panel is useful but passive. With
it, a reviewer can understand both *what the spec says* and *what just changed* in a
single reading pass.

**Independent Test**: Open a PR that modifies `spec.md`. In the spec panel, lines
present in the diff as additions are highlighted with a green left-accent. Lines
unchanged from the base are not highlighted. The prose is fully readable either way.

**Acceptance Scenarios**:

1. **Given** a spec file has been modified in the PR, **When** the reviewer views
   it in the spec panel, **Then** paragraphs, list items, or heading text that were
   added in this PR are visually distinguished with a subtle green left-accent
   highlight, while unchanged content renders without any highlight.
2. **Given** a spec file was added entirely new in the PR (all lines are additions),
   **When** the reviewer views it in the spec panel, **Then** the entire content is
   highlighted — making it clear this is a brand-new document.
3. **Given** a spec file exists in the PR but was not modified (only other files
   changed), **When** the reviewer views it in the spec panel, **Then** no lines
   are highlighted — the panel renders as plain prose.
4. **Given** a tasks.md file is modified, **When** the reviewer views the tasks tab,
   **Then** tasks that were added in this PR are marked visually (e.g., a "new" tag
   or highlight) in the checklist, distinguishable from pre-existing tasks.

---

### User Story 2 - Reply to an existing review thread inline (Priority: P1)

A reviewer sees an existing inline comment on a diff line and wants to reply to it
within the same thread — without leaving the app or opening GitHub.com. Replies
appear nested under the original comment, matching how GitHub threads work.

**Why this priority**: Without reply, inline discussion is one-way. A reviewer reading
a PR where someone has already left comments has no way to respond, ask for
clarification, or acknowledge a point. This is a significant gap for team use.

**Independent Test**: Open a PR with at least one existing inline comment. A "Reply"
button or link appears beneath the comment. Clicking it opens a composer pre-scoped
to that thread. Submitting the reply posts it to GitHub and the reply appears inline
immediately.

**Acceptance Scenarios**:

1. **Given** an existing inline review comment is visible in the diff, **When** the
   reviewer clicks "Reply", **Then** a compose area opens beneath that comment,
   scoped to the same thread, with no need to select a line range.
2. **Given** the reviewer has typed a reply and submits it, **When** the request
   completes, **Then** the reply appears inline in the diff immediately below the
   comment it replied to, and a success toast is shown.
3. **Given** the reviewer clicks Reply but then clicks Cancel or presses Escape,
   **Then** the compose area closes and nothing is posted.
4. **Given** the reply submission fails (network error or API error), **Then** an
   error toast is shown and the compose area remains open so the reviewer can retry
   without losing their text.

---

### User Story 3 - Track which files have been reviewed (Priority: P2)

A reviewer working through a PR with many changed files can mark individual files
as "Viewed" to track their progress. Viewed files are visually distinguished in the
left rail and the state persists for the duration of the session.

**Why this priority**: For PRs with 10+ changed files, losing track of where you are
is a real friction point. This is a lightweight local affordance — no server round-trip,
no GitHub state — just personal progress tracking.

**Independent Test**: Open a PR with multiple code files. Click the "Viewed" toggle
on the diff toolbar while viewing a file. The file row in the left rail gains a
checked/greyed appearance. Switch to another file and back — the Viewed state is
retained. Close and reopen the same PR in the same session — Viewed state resets
(session-only is acceptable).

**Acceptance Scenarios**:

1. **Given** a code file is open in the diff view, **When** the reviewer clicks the
   "Viewed" toggle in the diff toolbar, **Then** the file is marked as Viewed and
   its row in the left rail shows a visual indicator (e.g., checkmark or muted style).
2. **Given** a file is marked Viewed, **When** the reviewer clicks the toggle again,
   **Then** the Viewed state is cleared and the file row returns to its normal
   appearance.
3. **Given** multiple files are marked Viewed, **When** the reviewer switches between
   files, **Then** all Viewed states are preserved — Viewed files remain marked
   regardless of which file is currently selected.
4. **Given** the reviewer opens a different PR, **Then** the Viewed states from the
   previous PR do not carry over — Viewed is scoped to the current PR.

---

### Edge Cases

- What if a spec file's diff is unavailable (spec file is new but content fetch fails)? Highlight state should be omitted silently — render the markdown without any highlights rather than failing the panel.
- What if a reply thread has been deleted on GitHub between page load and reply submission? Show the API error message in the toast and keep the compose area open.
- What if a file is marked Viewed then new commits are pushed to the PR? The Viewed state resets when the PR is reloaded (since the diff changes), which is the correct behaviour.
- What if the "Viewed" toggle is clicked on a spec file row (not a code file)? Spec files in the Specification group do not have a Viewed toggle — Viewed applies to code files only.
- What if a PR has zero existing comments? The reply affordance is not shown; the diff renders as before.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The spec panel MUST highlight added lines by cross-referencing the spec file's diff — lines present as additions in the unified diff MUST receive a green left-accent visual treatment in the rendered markdown.
- **FR-002**: The highlight treatment MUST apply at the line level within the rendered markdown: a paragraph, list item, or heading that corresponds to an added diff line is highlighted; unchanged lines are not.
- **FR-003**: Highlights MUST NOT appear when a spec file was not modified in the PR — the absence of a diff means no lines are highlighted.
- **FR-004**: Task items in the tasks checklist that correspond to added lines MUST receive a visual "new" indicator (tag or highlight) matching the overall highlight treatment.
- **FR-005**: Each existing inline review comment MUST display a "Reply" affordance beneath it in the diff.
- **FR-006**: Activating the Reply affordance MUST open a compose area scoped to the existing thread, pre-filled with no text, without requiring line selection.
- **FR-007**: Submitting a reply MUST post it to the correct GitHub thread (not create a new standalone comment) and display the reply inline immediately on success.
- **FR-008**: If a reply fails, the compose area MUST remain open with the reviewer's text preserved and an error toast MUST be shown.
- **FR-009**: Each code file in the left rail MUST have a "Viewed" toggle accessible from the diff toolbar when that file is active.
- **FR-010**: The Viewed state for each file MUST persist for the duration of the current PR session and MUST be reflected in the left rail with a visual indicator.
- **FR-011**: Viewed state MUST be scoped to the current PR — switching to a different PR MUST start with all files un-viewed.
- **FR-012**: Spec files in the Specification group MUST NOT have a Viewed toggle — it applies to code files only.

### Key Entities

- **DiffHighlight**: The set of line numbers (from the unified diff) that are additions for a given spec file; used to annotate rendered markdown.
- **ThreadReply**: A reply posted to an existing pull request review comment thread; has a parent comment ID, body text, and the resulting reply comment from the API.
- **ViewedState**: A per-PR, per-file boolean indicating whether the reviewer has marked a file as reviewed; scoped to the current browser session.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: A reviewer can identify all lines added to a spec file in this PR without switching away from the spec panel — zero tab changes required.
- **SC-002**: A reviewer can reply to an existing inline comment without navigating to GitHub.com — the full reply flow completes within the app.
- **SC-003**: Viewing state for all files in a PR is preserved without any additional action from the reviewer as they move between files.
- **SC-004**: All three enhancements work correctly for PRs where none of them apply (no spec files, no existing comments, one file) — zero regressions introduced.

---

## Assumptions

- Diff line data needed for spec highlighting is already available in the server's PR-detail response (the raw unified diff); no additional server fetch is required for Feature 1.
- The GitHub API endpoint for replying to a review comment thread is `POST /repos/{owner}/{repo}/pulls/comments/{comment_id}/replies`; this differs from the review submission endpoint already in use.
- Viewed state is session-local only (no localStorage persistence across page reloads); this matches how GitHub's own "Viewed" feature behaves for first-time use.
- The "Reply" affordance is shown on all existing inline comments, including those posted by other reviewers — replies are not restricted to the current user's own comments.
- Highlight granularity is per diff line, not per word or character; partial-line inline edits will highlight the whole line.
- All three enhancements are additive — they do not change the behaviour of existing features (diff rendering, comment posting, spec panel markdown rendering).
