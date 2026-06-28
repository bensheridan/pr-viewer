---
description: "Task list for Review UX Enhancements"
---

# Tasks: Review UX Enhancements

**Input**: Design documents from `specs/002-review-ux-enhancements/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/api.md ✅

**Tests**: Not requested — manual browser validation per quickstart.md

**Organization**: Tasks grouped by user story. All three stories target only two files:
`tools/pr-viewer/server.js` and `tools/pr-viewer/public/index.html`.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different concerns, no blocking dependency)
- **[US#]**: User story label

---

## Phase 1: Setup

**Purpose**: No new project structure needed — this is a pure extension. Setup confirms
the existing state is correct before changes begin.

- [x] T001 Verify `tools/pr-viewer/server.js` exports the `specFiles` array in `GET /api/prs/:num` response and confirm `addedLines` field is absent (baseline before US1 work)
- [x] T002 Verify `tools/pr-viewer/public/index.html` contains `renderMarkdown()`, `renderSpecPanel()`, `renderFileRail()`, and `makeCommentRow()` functions (baseline before US2/US3 work)

---

## Phase 2: Foundational

No shared blocking prerequisites across user stories — each story is independently
additive. Proceed directly to user story phases.

---

## Phase 3: User Story 1 — Spec Panel Added-Line Highlights (Priority: P1) 🎯 MVP

**Goal**: Lines added in this PR are visually highlighted in the spec panel prose view
and the tasks checklist, so reviewers can see what changed without switching to the diff.

**Independent Test**: Open a PR modifying a spec file. Spec panel shows green-accented
lines for additions; unchanged lines are plain. See `quickstart.md` Scenarios 1 & 2.

### Server (T003)

- [x] T003 [US1] In `tools/pr-viewer/server.js` `GET /api/prs/:num` handler: after collecting `specPaths`, for each spec file extract its added line numbers from the already-fetched `diff` string — walk the raw diff lines for that file's section, tracking `newNo` (same counter logic as `parseDiff`), collecting each `+` line's `newNo` into an `addedLines` array; add `addedLines` to each entry in the `specFiles` array returned in `res.json()`

### Frontend — markdown renderer (T004)

- [x] T004 [US1] Update `renderMarkdown(text, addedLines=[])` in `tools/pr-viewer/public/index.html` to accept an optional `addedLines` array (Set of 1-based line numbers); track a `lineIdx` counter as each source line is consumed; for each emitted element (heading, paragraph, list item), if `lineIdx` is in `addedLines`, add class `md-highlight` to that element; ensure the existing `md-highlight` CSS rule (`border-left: 3px solid var(--add-stat); background: var(--add-bg)`) is already present (it was added in the redesign)

### Frontend — spec panel wiring (T005)

- [x] T005 [US1] Update `renderSpecPanel()` in `tools/pr-viewer/public/index.html`: when calling `renderMarkdown(active.markdown)` for spec/plan tabs, pass `new Set(active.addedLines || [])` as the second argument; ensure `state.specFiles` entries now carry `addedLines` from the server response (set in `openPR()` when assigning `state.specFiles = data.specFiles || []`)

### Frontend — tasks checklist "new" tag (T006)

- [x] T006 [US1] Update `parseTasks(markdown, addedLines=[])` in `tools/pr-viewer/public/index.html` to accept `addedLines`; track `lineIdx` while walking lines; set `isNew: true` on any task whose source line index is in `addedLines` (overrides the existing `[new]` text-tag detection, or combines with it); update the `renderTasksPanel()` call in `renderSpecPanel()` to pass `new Set(active.addedLines || [])` to `parseTasks()`

**Checkpoint**: Open a modified spec file in a PR → added lines highlighted in green prose. Open an unmodified spec file → no highlights. Tasks tab shows "new" tags on added tasks.

---

## Phase 4: User Story 2 — Reply to Thread (Priority: P1)

**Goal**: Reviewers can reply to existing inline comments without leaving the app.

**Independent Test**: Click Reply on an existing comment → compose area opens → submit → reply appears inline. See `quickstart.md` Scenario 3.

### Server (T007)

- [x] T007 [US2] Add `POST /api/prs/:num/comment/reply` route to `tools/pr-viewer/server.js`: accept `{ comment_id, body, repo }` in request body; validate `body` is non-empty (400 if missing); write `{ body }` to a temp file; call `gh api repos/{repo}/pulls/comments/{comment_id}/replies --method POST --input {tmp}`; return `{ ok: true, result }` on success or `{ error: msg }` on failure; clean up temp file in `finally` block (same pattern as existing review route)

### Frontend — reply affordance on comments (T008)

- [x] T008 [US2] Update `makeCommentRow(c, colSpan)` in `tools/pr-viewer/public/index.html` to append a "Reply" button below each comment body; the button triggers `openReplyComposer(c.id, commentRowElement)` — only show the button when `c.id` is present (guards against malformed comment objects)

### Frontend — reply composer (T009)

- [x] T009 [US2] Add `openReplyComposer(commentId, anchorEl)` function in `tools/pr-viewer/public/index.html`: creates a composer `<div>` (reuse `.composer` CSS class) positioned below `anchorEl`; shows context label "Replying to thread"; textarea with Cmd/Ctrl+Enter to submit and Escape to cancel; "Cancel" button calls `closeReplyComposer()`; "Reply" button calls `submitReply(commentId, text)`

### Frontend — reply submission (T010)

- [x] T010 [US2] Add `submitReply(commentId, body)` in `tools/pr-viewer/public/index.html`: POST to `/api/prs/${state.current}/comment/reply` with `{ comment_id: commentId, body, repo: state.repo }`; on success: close composer, show success toast, call `openPR(state.current)` to refresh and display the new reply inline; on failure: show error toast, keep composer open with text preserved

**Checkpoint**: Existing inline comment shows Reply button. Clicking opens composer. Submitting posts reply to GitHub and it appears inline after refresh. Cancel/Escape closes without posting.

---

## Phase 5: User Story 3 — Viewed File Toggle (Priority: P2)

**Goal**: Reviewers can mark code files as Viewed; state persists within the PR session
and is reflected in the left file rail.

**Independent Test**: Mark a file Viewed → left rail shows indicator → switch files → indicator persists → open different PR → indicator gone. See `quickstart.md` Scenario 4.

### Frontend — state (T011)

- [x] T011 [US3] Add `state.viewed = new Map()` to the state object in `tools/pr-viewer/public/index.html`; add `isViewed(path)` helper returning `(state.viewed.get(state.current) ?? new Set()).has(path)`; add `setViewed(path, val)` helper that gets-or-creates the Set for `state.current` and adds/deletes `path`; reset is implicit — a new PR number produces an empty Set

### Frontend — Viewed toggle in toolbar (T012)

- [x] T012 [US3] Add a "Viewed" checkbox control to the diff toolbar in `tools/pr-viewer/public/index.html` (right side of `#diffToolbar`, after the segmented Split/Unified control): render as `<label class="viewed-toggle"><input type="checkbox"> Viewed</label>`; set `checked` to `isViewed(state.selFile)` when rendering; on `change`, call `setViewed(state.selFile, checkbox.checked)`, then `renderFileRail()` to update the rail; only show when `state.selFile` is a code file (not a spec file)

### Frontend — rail indicator (T013)

- [x] T013 [US3] Update `renderFileRail()` in `tools/pr-viewer/public/index.html`: for each code file row, if `isViewed(f.path)` is true, add a checkmark indicator (e.g., a `✓` span with `color:var(--ok)` and `opacity:0.7`) to the right side of the row, and apply `opacity:0.6` to the row's filename text to give a "done" visual appearance without hiding it

**Checkpoint**: Toggle Viewed on a file → rail shows checkmark + muted name. Toggle off → reverts. Open new PR → no files marked Viewed.

---

## Phase N: Polish & Cross-Cutting Concerns

- [x] T014 [P] Add CSS rule for `md-highlight` in `tools/pr-viewer/public/index.html` if not already present from the redesign: `border-left: 3px solid var(--add-stat); padding-left: 8px; background: var(--add-bg); border-radius: 0 3px 3px 0; margin-left: -11px;` — verify it renders correctly for headings, paragraphs, and list items
- [x] T015 [P] Add CSS for `.viewed-toggle` in `tools/pr-viewer/public/index.html` if not already present: `display:flex; align-items:center; gap:5px; font-size:12px; color:var(--text3); cursor:pointer; user-select:none;` with checkbox styled to match the existing task checkbox approach
- [x] T016 Run through all four `quickstart.md` scenarios manually; verify no regressions in existing features (tab switching, line selection, pending tray, review submission, split/unified diff, theme toggle)

---

## Dependencies & Execution Order

- **T001–T002**: Verification baseline — no code changes, just read existing state
- **T003**: Server-only; can be done independently of frontend work
- **T004–T006**: Frontend US1 — T004 must precede T005 and T006 (signature change)
- **T007**: Server-only; independent of US1 frontend work
- **T008–T010**: Frontend US2 — sequential (each builds on the previous)
- **T011–T013**: Frontend US3 — T011 must precede T012 and T013
- **T014–T015**: CSS polish — can run in parallel; safe if rules already exist (idempotent)
- **T016**: Final validation — depends on all tasks complete

### Parallel opportunities

```
T003 (server US1) ‖ T007 (server US2)   — different route additions, same file but non-conflicting
T004 (renderMarkdown sig) ‖ T011 (state.viewed) — different functions
T014 (CSS highlight) ‖ T015 (CSS viewed)   — adjacent CSS rules
```

---

## Implementation Strategy

### MVP (US1 only — highest value)

1. T001 → T002 (verify baseline)
2. T003 (server: addedLines)
3. T004 → T005 → T006 (frontend: highlight + tasks)
4. Validate Scenarios 1 & 2

### Full feature

5. T007 → T008 → T009 → T010 (reply-to-thread)
6. T011 → T012 → T013 (Viewed toggle)
7. T014 → T015 → T016 (polish + QA)

---

## Notes

- All 16 tasks target exactly two files: `tools/pr-viewer/server.js` and `tools/pr-viewer/public/index.html`
- No new npm packages — constitution Principle II and V
- T003 reuses the existing `parseDiff` line-counting logic already present in the server's diff scan; it does not call `parseDiff()` itself (that function lives in the frontend)
- The `md-highlight` CSS class was introduced in the 001 redesign — T014 is a safety check in case it needs adjustment
