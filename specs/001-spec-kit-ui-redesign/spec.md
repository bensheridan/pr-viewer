# Feature Specification: Spec-Kit UI Redesign

**Feature Branch**: `001-spec-kit-ui-redesign`

**Created**: 2026-06-28

**Status**: Draft

**Input**: Redesign the PR viewer webapp using the design in docs/design/

---

## User Scenarios & Testing *(mandatory)*

### User Story 1 - Review a PR with Spec-Kit files (Priority: P1)

A reviewer opens a PR that contains changed `spec.md`, `plan.md`, or `tasks.md` files.
Instead of seeing those files buried in the diff list, they see a "Spec-Kit detected"
callout and can jump directly to a dedicated panel that renders each spec file as
formatted prose beside the diff.

**Why this priority**: This is the core differentiating feature — the reason the redesign
exists. Without it, the app is just a reskinned diff viewer.

**Independent Test**: Open a PR that touches `specs/001-foo/spec.md`. The left rail shows
a Specification group above the Code group. Clicking the spec tab renders markdown, not
raw diff lines. The tasks tab shows a checklist with a progress bar.

**Acceptance Scenarios**:

1. **Given** a PR whose changed files include a path matching `spec.md`, `plan.md`, or
   `tasks.md` (at any depth), **When** the reviewer opens Files & Spec, **Then** those
   files appear in a Specification group in the left rail, distinct from the Code group,
   and are rendered as formatted markdown in the right-hand spec panel.
2. **Given** a `tasks.md` is detected, **When** the reviewer clicks the tasks tab,
   **Then** tasks are rendered as checkboxes grouped by the nearest preceding heading,
   with a progress bar showing completed vs total count.
3. **Given** no spec files are present in the PR, **When** the reviewer opens Files &
   Spec, **Then** the spec panel is absent and the layout fills the full width with the
   diff (existing behavior preserved).

---

### User Story 2 - Navigate a PR across three tabs (Priority: P1)

A reviewer moves between Overview, Files & Spec, and Review tabs without page reloads.
Overview orients them on the PR; Files & Spec is the working diff view; Review is where
they compose and submit.

**Why this priority**: The three-tab layout is the structural backbone of the redesign.
All other stories live inside one of these tabs.

**Independent Test**: Open any PR. Click through Overview → Files & Spec → Review. Each
tab renders without a network request or page reload and shows the correct content. The
PR-list sidebar remains visible throughout.

**Acceptance Scenarios**:

1. **Given** a PR is open, **When** the reviewer clicks any top-bar tab, **Then** the
   center pane switches instantly to that tab's content with no network request.
2. **Given** the reviewer is on the Overview tab, **Then** they see the PR title, meta
   row (author, commit count, branch chips, age), description, activity timeline, and a
   right rail with Reviewers, Spec-Kit file list, and Checks sections.
3. **Given** the reviewer is on the Review tab, **Then** they see radio options for
   Comment / Approve / Request changes, with Approve and Request changes visually
   marked as requiring confirmation, and a markdown textarea for the review body.

---

### User Story 3 - Toggle split/unified diff and light/dark theme (Priority: P2)

A reviewer can switch between unified and split diff views, and between light and dark
themes. Both preferences persist across reloads.

**Why this priority**: Quality-of-life improvements that affect every diff review session.
Split diff is a meaningful usability upgrade for comparing added and removed lines.

**Independent Test**: Toggle split/unified on a file with both added and removed lines.
Verify paired rows appear side-by-side. Reload — the mode is restored. Toggle theme;
the page switches to the light palette. Reload — theme persists.

**Acceptance Scenarios**:

1. **Given** unified mode is active, **When** the reviewer clicks the Split toggle,
   **Then** the diff re-renders with deleted lines on the left and added lines on the
   right, pairing consecutive deletions with additions positionally.
2. **Given** a preference has been set for split mode or light theme, **When** the page
   is reloaded, **Then** both preferences are restored without re-selecting them.
3. **Given** a file is brand-new (no previous version), **When** it is rendered in either
   diff mode, **Then** it renders single-column with no empty "before" pane.

---

### User Story 4 - Submit a review with gated approval and request-changes (Priority: P2)

A reviewer selects Approve or Request changes and must confirm the action in a designed
modal before it is sent. Comment reviews submit immediately. All paths give clear
feedback on success or failure.

**Why this priority**: Incorrect approvals or blocking reviews have real consequences for
the author. Confirm gating already exists via browser dialogs; this replaces them with
a proper modal that states consequences clearly.

**Independent Test**: Select Approve, click submit. A modal appears describing the
consequence. Click Cancel — nothing is sent. Click Confirm — review is posted and a
toast appears. For Comment, no modal appears; review posts on first click.

**Acceptance Scenarios**:

1. **Given** the reviewer selects Approve or Request changes and clicks Submit, **Then**
   a confirm modal opens describing the consequence in plain words before any network
   request is made.
2. **Given** the confirm modal is open, **When** the reviewer clicks Cancel or the
   backdrop, **Then** the modal closes and no review is submitted.
3. **Given** a review is submitted successfully, **Then** a toast notification appears
   confirming success and auto-dismisses within 4 seconds.
4. **Given** the reviewer selects Comment and clicks Submit, **Then** the review posts
   immediately with no confirm modal.

---

### Edge Cases

- What if spec files exist at the repo root (`spec.md`) rather than nested under `specs/`? Both locations must be detected.
- What if the spec file content cannot be fetched (network error)? Show an inline error state within the spec panel; do not fail the whole PR view.
- What if `tasks.md` has no headings — just a flat task list? Render without grouping headers.
- How does split diff handle a hunk with more deletions than additions? Unpaired rows show an empty filler cell on the opposite side.
- What if the PR has no files at all (e.g., a description-only PR)? The Files & Spec tab shows an empty state message.

---

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: The app MUST display three top-bar tabs — Overview, Files & Spec, and Review — that switch the center pane without a page reload.
- **FR-002**: The Files & Spec view MUST detect files whose path matches `spec.md`, `plan.md`, or `tasks.md` at any depth and separate them from code files in the left rail.
- **FR-003**: Detected spec files MUST be rendered as formatted markdown in a right-hand spec panel, not as raw diff lines.
- **FR-004**: The tasks tab MUST parse GitHub-style task checkboxes (`- [ ]` / `- [x]`) and render them as checkboxes grouped by the nearest preceding heading, with a progress bar showing completed vs total.
- **FR-005**: Task checkbox state in the UI is local-only (read-only reflection of the committed file); no write-back to the repository is required.
- **FR-006**: The diff view MUST support a Split mode that pairs deletions and additions side-by-side, in addition to the existing Unified mode.
- **FR-007**: The Split / Unified preference MUST be persisted to localStorage and restored on page reload.
- **FR-008**: The app MUST support a light theme toggled via a sun/moon button in the top bar, in addition to the existing dark theme.
- **FR-009**: The light/dark theme preference MUST be persisted to localStorage and restored on page reload.
- **FR-010**: Approve and Request changes submissions MUST be gated behind a confirm modal that describes the consequence before any network request is made.
- **FR-011**: The confirm modal MUST close without submitting on Cancel or backdrop click.
- **FR-012**: Successful review submissions MUST display a toast notification that auto-dismisses within 4 seconds.
- **FR-013**: The server MUST provide full markdown content for detected spec files at the PR head ref (not just changed lines from the unified diff).
- **FR-014**: When no spec files are detected, the layout MUST collapse to the existing diff-only view with no empty spec panel.
- **FR-015**: Brand-new files MUST render single-column in both unified and split modes (no empty "before" pane).
- **FR-016**: The Overview tab MUST display PR title, author, commit count, branch chips, age, description, activity timeline, and a right rail with Reviewers, Spec-Kit file list, and Checks.
- **FR-017**: The existing inline comment, gutter line-selection, and pending review tray MUST continue to function after the redesign.

### Key Entities

- **PR**: A GitHub pull request with metadata, diff, review state, inline comments, and optionally spec files at the head ref.
- **Spec File**: A file detected in the PR matching spec/plan/tasks naming; has a `kind` (spec/plan/tasks) and full `markdown` content fetched at the head ref.
- **Task**: A parsed item from `tasks.md` with a code, text, done state, phase group, and optional "new" indicator.
- **Review**: A pending or submitted review with an action (comment/approve/request-changes), body text, and optional inline comments array.
- **Confirm Dialog**: A modal with a tone (ok/danger), title, consequence description, and confirm/cancel actions; required before irreversible review submissions.

---

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: Tab switching between Overview, Files & Spec, and Review completes in under 100ms with no network round-trip.
- **SC-002**: A PR containing spec files automatically shows the Spec-Kit panel without any additional steps from the reviewer.
- **SC-003**: The tasks checklist accurately reflects the checked vs unchecked state of every task in the committed `tasks.md`.
- **SC-004**: Theme and diff-mode preferences survive a full page reload and are restored without the reviewer re-selecting them.
- **SC-005**: Zero Approve or Request changes reviews can be submitted without passing through the confirm modal.
- **SC-006**: The redesigned app runs with no new installation steps beyond the existing Node 18+ and `gh` CLI prerequisites.
- **SC-007**: All existing functionality (inline comments, gutter selection, pending review tray, confirm on approve/request-changes) works correctly after the redesign.

---

## Assumptions

- The existing `parseDiff`, `el()`, and `state` patterns in `public/index.html` are preserved; the redesign extends them rather than replacing them.
- No build step is introduced; all frontend changes land in `public/index.html` and server changes in `server.js`.
- Merge functionality remains intentionally out of scope; the merge card shown in the design prototype is not wired to a live action.
- The server fetches full spec file content via the GitHub contents API at the PR head ref and returns it as a `specFiles` array in the existing PR-detail payload.
- Geist / Geist Mono fonts are optional; the layout is correct with the existing system font stack.
- Only the "Structured" visual style (hairline borders, no shadows, `radius 8px`) from the design prototype is implemented; the Soft and Editor variants are ignored.
- Inline commenting on spec file lines is out of scope; spec files are rendered as read-only markdown prose.
- The design prototype's 3-way style switcher is a stakeholder review artifact only and is not shipped in the product.
