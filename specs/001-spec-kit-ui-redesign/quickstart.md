# Quickstart Validation Guide: Spec-Kit UI Redesign

**Date**: 2026-06-28

Use this guide to manually validate the feature after implementation.

---

## Prerequisites

- Node 18+ and `gh` CLI installed and authenticated (`gh auth login`)
- Run from inside a git repo that has open PRs on GitHub
- At least one PR that touches spec files (see "Seed data" below)

## Start the server

```bash
cd /path/to/your/repo
node /path/to/reviewer/tools/pr-viewer/server.js
# → PR viewer running at http://localhost:4319
```

Open http://localhost:4319 in a browser.

---

## Seed data (for spec-file scenarios)

To test the spec panel, you need a PR that changes at least one of:
`spec.md`, `plan.md`, `tasks.md` (at any path depth). The reviewer repo itself
(this repo) with a branch that modifies `specs/001-spec-kit-ui-redesign/spec.md`
is a perfect test case. Alternatively, use any PR from a Spec-Kit project.

For non-spec scenarios, any open PR with code changes is sufficient.

---

## Validation Scenarios

### Scenario 1 — Basic load and tab switching

1. Page loads → PR list appears in left sidebar.
2. Click any PR → center pane shows the PR.
3. Click "Overview" tab → see PR title, author meta, description, activity timeline,
   right rail (Reviewers, Spec-Kit, Checks sections).
4. Click "Files & Spec" tab → see diff view.
5. Click "Review" tab → see Comment / Approve / Request changes radio buttons and
   textarea.
6. Switch back to "Files & Spec" → diff is still rendered (no reload needed).

**Expected**: All three tabs switch in under 100ms with no network request.

---

### Scenario 2 — Spec panel appears for a PR with spec files

1. Open a PR that touches `spec.md`, `plan.md`, or `tasks.md`.
2. Click "Files & Spec" tab.

**Expected**:
- Left rail shows a "Specification" group above the "Code" group.
- Spec files (with a markdown badge) are listed in the Specification group.
- Right panel shows the spec content rendered as formatted markdown prose (headings,
  paragraphs, inline code) — not raw diff lines.
- Overview tab right rail shows the Spec-Kit file list and a "Spec-Kit detected" callout.

---

### Scenario 3 — tasks.md renders as checklist with progress bar

1. Open a PR that touches `tasks.md`.
2. In Files & Spec, click the "tasks" tab in the right spec panel.

**Expected**:
- A progress bar shows `N/M tasks complete` (e.g. `6/9`).
- Tasks are grouped by the nearest preceding heading (e.g. "Phase 1: Setup").
- Completed tasks (`- [x]`) appear checked and with strikethrough text.
- Uncompleted tasks (`- [ ]`) appear unchecked.
- Clicking a checkbox toggles its visual state locally (does not reload or write to repo).

---

### Scenario 4 — No spec files → existing diff-only layout

1. Open a PR with only code file changes (no `spec.md` / `plan.md` / `tasks.md`).
2. Click "Files & Spec" tab.

**Expected**:
- No spec panel appears on the right; diff fills the full width.
- No "Spec-Kit detected" callout in Overview.
- Left rail shows only the "Code" group (no "Specification" group).

---

### Scenario 5 — Split / Unified diff toggle

1. Open any PR with files that have both added and removed lines.
2. In Files & Spec, click the "Split" toggle (top-right of the diff toolbar).

**Expected**:
- Diff re-renders with removed lines on the left, added lines on the right.
- Lines pair positionally: consecutive deletions match with consecutive additions.
- Unpaired cells show an empty filler (no content, distinct background).
- Brand-new files (status: added) continue to render single-column.

3. Reload the page.

**Expected**: Split mode is restored (localStorage persisted).

4. Click "Unified" toggle — diff returns to the original single-column format.

---

### Scenario 6 — Light / Dark theme toggle

1. Click the sun/moon button in the top bar.

**Expected**: Page switches to the light palette (near-white background, near-black
text, same accent approach). No flash or layout shift.

2. Reload the page.

**Expected**: Light theme is restored.

3. Toggle back to dark.

**Expected**: Dark palette restored; preference persists on next reload.

---

### Scenario 7 — Review submission with confirm modal

1. Open any PR. On the Review tab, select "Approve" and click Submit.

**Expected**:
- A confirm modal appears (not `window.confirm()`).
- Modal states the consequence in plain words.
- Clicking Cancel closes the modal; no network request made.
- Clicking Confirm posts the review; a toast appears confirming success.

2. Repeat with "Request changes".

**Expected**: Same modal behaviour; submit button uses danger (red) styling.

3. Select "Comment", fill in the textarea, click Submit.

**Expected**: Review posts immediately (no modal). Toast confirms success.

---

### Scenario 8 — Existing features still work (regression check)

1. Open a PR with code files. In Files & Spec, drag the gutter to select a line range.

**Expected**: Line selection highlight appears; comment composer opens at correct position.

2. Add a comment to the review. Verify pending tray shows it.
3. Submit the review as a Comment.

**Expected**: Review posts with the inline comment; tray clears; posted comment appears
inline in the diff after the PR refreshes.

---

## What to verify in the server response

Open DevTools → Network tab, click a PR, inspect the `GET /api/prs/{num}` response.

- `specFiles` array is present (empty `[]` for PRs with no spec files).
- For PRs with spec files: each entry has `path`, `kind` (`spec`/`plan`/`tasks`),
  and `markdown` (full file content, not diff fragment).
- No extra routes are called for spec content (it's in the same response).
