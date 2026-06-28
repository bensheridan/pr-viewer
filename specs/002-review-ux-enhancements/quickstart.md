# Quickstart Validation Guide: Review UX Enhancements

**Date**: 2026-06-28

---

## Prerequisites

- Node 18+, `gh` CLI authenticated
- Run from inside a git repo with open PRs
- For US1: a PR that modifies at least one spec/plan/tasks file
- For US2: a PR with at least one existing inline review comment
- For US3: a PR with multiple changed code files

```bash
cd /path/to/your/repo
node /path/to/reviewer/tools/pr-viewer/server.js
# → http://localhost:4319
```

---

## Scenario 1 — Spec panel highlights added lines (US1)

1. Open a PR that **modifies** `spec.md`, `plan.md`, or `tasks.md` (not just adds it).
2. Open Files & Spec tab → click the spec file in the Specification group.
3. In the right spec panel, read the rendered markdown.

**Expected**:
- Lines that are additions in the PR diff have a green left-accent highlight
  (`--add-bg` background + 3px left border in `--add-stat` color).
- Unchanged lines render as plain prose — no highlight.
- The highlight does not break readability; paragraphs and headings remain legible.

4. Check DevTools → Network → `GET /api/prs/{num}` response.

**Expected**: Each `specFiles` entry has `addedLines: [...]` with the correct 1-based
line numbers.

5. Open a PR where a spec file is present but **not modified**.

**Expected**: No highlights — `addedLines` is `[]`, panel renders plain prose.

---

## Scenario 2 — tasks.md "new" tag on added tasks (US1 extension)

1. Open a PR that adds new task lines to `tasks.md`.
2. Click the tasks tab in the spec panel.

**Expected**:
- Tasks whose line number is in `addedLines` show a "new" tag (or matching highlight).
- Pre-existing tasks (not in `addedLines`) show no tag.

---

## Scenario 3 — Reply to an existing inline comment (US2)

1. Open a PR that has at least one existing inline review comment visible in the diff.
2. Find the comment in the diff. A "Reply" button appears below it.
3. Click "Reply".

**Expected**: A compose area opens below the comment, scoped to that thread.
No line-range selection required.

4. Type a reply and click Submit (or press Cmd/Ctrl+Enter).

**Expected**:
- Success toast appears.
- The reply appears inline immediately below the original comment.
- DevTools → Network → `POST /api/prs/{num}/comment/reply` returns `{ ok: true }`.

5. Click Reply again, type something, then press Escape or click Cancel.

**Expected**: Compose area closes; nothing is posted.

6. Simulate a failure (disconnect from network, then try to reply).

**Expected**: Error toast appears; compose area stays open with text preserved.

---

## Scenario 4 — Viewed file toggle (US3)

1. Open a PR with 3+ code files.
2. Click the first file in the left rail → it opens in the diff view.
3. Click the "Viewed" checkbox/toggle in the diff toolbar.

**Expected**:
- The file row in the left rail shows a visual Viewed indicator (checkmark or muted style).
- The toolbar toggle reflects the Viewed state.

4. Click a different file, then click back to the first file.

**Expected**: First file is still marked Viewed.

5. Click the Viewed toggle again on the first file.

**Expected**: Viewed state clears; file row returns to normal appearance.

6. Open a different PR.

**Expected**: All files start un-viewed — previous PR's Viewed state does not carry over.

7. Confirm spec files in the Specification group have no Viewed toggle.

**Expected**: No Viewed affordance on spec file rows or when a spec file tab is active.
