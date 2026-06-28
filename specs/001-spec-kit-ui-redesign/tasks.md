---

description: "Task list for Spec-Kit UI Redesign"
---

# Tasks: Spec-Kit UI Redesign

**Input**: Design documents from `specs/001-spec-kit-ui-redesign/`

**Prerequisites**: plan.md ✅ spec.md ✅ research.md ✅ data-model.md ✅ contracts/api.md ✅

**Tests**: Not requested — manual browser validation per quickstart.md

**Organization**: Tasks grouped by user story to enable independent implementation and testing.

## Format: `[ID] [P?] [Story?] Description`

- **[P]**: Can run in parallel (different files, no dependencies)
- **[Story]**: Which user story this task belongs to (US1–US4)
- Exact file paths included in all task descriptions

---

## Phase 1: Setup (CSS Tokens & Theme Foundation)

**Purpose**: Establish the design token system and theme infrastructure that every
subsequent task depends on. No layout or feature work yet.

- [x] T001 Replace existing CSS `:root` variables in `tools/pr-viewer/public/index.html` with the Structured-take dark token set from `docs/README.md` (bg, surface, s2, s3, border, border2, text, text2, text3, add-bg, del-bg, ok, warn, danger, overlay, row-h, radius, radius-sm, accent, accent-text)
- [x] T002 Add `[data-theme="light"]` override block on `:root` in `tools/pr-viewer/public/index.html` with all light token values from design handoff
- [x] T003 Add theme-init script at top of `<script>` in `tools/pr-viewer/public/index.html` — read `localStorage.getItem("pr-viewer-theme")`, set `document.documentElement.dataset.theme` before first render to avoid flash
- [x] T004 Add `theme` field to `state` object in `tools/pr-viewer/public/index.html` (default: `'dark'`, loaded from localStorage on init)

---

## Phase 2: Foundational (Layout Skeleton — Blocks All User Stories)

**Purpose**: Replace the current single-pane layout with the three-tab shell. Must
complete before any user story work begins — every story lives inside one tab.

**⚠️ CRITICAL**: No user story work can begin until this phase is complete.

- [x] T005 Add tab-bar HTML to `<header>` in `tools/pr-viewer/public/index.html` — three buttons (Overview, Files & Spec, Review) plus sun/moon theme toggle button on the right; remove old layout-specific header content that moves into tabs
- [x] T006 Replace `.layout` grid in `tools/pr-viewer/public/index.html` with updated grid: left PR-list sidebar (300px, unchanged) + right content area; right content area contains three `<div>` panes (id: `paneOverview`, `paneFiles`, `paneReview`) — only one visible at a time
- [x] T007 Add CSS for tab bar, tab buttons (active state accent underline), pane show/hide, and theme toggle button in `tools/pr-viewer/public/index.html`
- [x] T008 Add `screen` field to `state` in `tools/pr-viewer/public/index.html` (default: `'files'`) and `switchTab(screen)` function that sets `state.screen`, updates active tab class, and shows/hides the correct pane
- [x] T009 Wire tab button `onclick` handlers to `switchTab()` in `tools/pr-viewer/public/index.html`; wire theme toggle button to toggle `state.theme`, update `document.documentElement.dataset.theme`, and persist to `localStorage.setItem("pr-viewer-theme", theme)`
- [x] T010 Move existing diff rendering into `paneFiles` in `tools/pr-viewer/public/index.html` — confirm PR list sidebar and diff render correctly after structural change; existing `renderPR()` and `renderFile()` target the files pane

**Checkpoint**: App loads, three tabs switch correctly, diff still renders in Files tab, theme toggle works.

---

## Phase 3: User Story 1 — Spec-Kit Panel (Priority: P1) 🎯 MVP

**Goal**: Detect spec/plan/tasks files in a PR and render them as formatted markdown
in a right-hand panel beside the diff, with tasks as an interactive checklist.

**Independent Test**: Open a PR touching `specs/*/spec.md`. Left rail shows Specification
group. Right panel shows rendered markdown. Tasks tab shows checklist + progress bar.
See `quickstart.md` Scenarios 2 and 3.

### Server — spec file content (T011–T012)

- [x] T011 In `tools/pr-viewer/server.js` `GET /api/prs/:num` handler: after fetching `diff`, scan raw diff lines for `+++ b/` paths matching `/(^|\/)spec\.md$/`, `/(^|\/)plan\.md$/`, `/(^|\/)tasks\.md$/`; collect detected paths with their `kind` (`spec`/`plan`/`tasks`)
- [x] T012 In `tools/pr-viewer/server.js`: for each detected spec path, call `gh api repos/{repo}/contents/{path}?ref={headRefOid} --jq .content` via the existing `gh()` helper, base64-decode with `Buffer.from(b64.replace(/\n/g,""), "base64").toString("utf8")`; build `specFiles: [{ path, kind, markdown }]`; fetch in parallel with `Promise.allSettled`; skip failures silently; add `specFiles` to `res.json({ meta, diff, comments, repo, specFiles })`

### Frontend — state + spec detection (T013–T014)

- [x] T013 [P] Add `specFiles`, `specTab`, `selFile`, `diffMode`, `tasks` fields to `state` object in `tools/pr-viewer/public/index.html` per data-model.md; add `diffMode` init from `localStorage.getItem("pr-viewer-diffmode")` (default `'unified'`)
- [x] T014 [US1] In `openPR()` in `tools/pr-viewer/public/index.html`: after `parseDiff(data.diff)`, set `state.specFiles = data.specFiles || []`; filter `state.files` to exclude spec-file paths (they render in the panel, not as diff cards); set `state.selFile` to first code file path; call `parseTasks()` if a tasks.md spec file is present

### Frontend — markdown renderer + task parser (T015–T016)

- [x] T015 [P] [US1] Add `renderMarkdown(text)` function in `tools/pr-viewer/public/index.html` — vanilla JS, returns a `<div>` DOM node; handle: `###`/`##`/`#` headings (uppercase muted label style per design), blank-line-separated paragraphs, inline code (backtick), bold (`**`), unordered list items (`- `); skip task lines (handled separately); no external library
- [x] T016 [P] [US1] Add `parseTasks(markdown)` function in `tools/pr-viewer/public/index.html` — returns `[{ code, text, done, phase, isNew }]`; walk lines: `##`/`###` headings update current `phase`; `- [x]` → `done:true`, `- [ ]` → `done:false`; extract leading `T\d+` token as `code`; detect `[new]` tag as `isNew`; store result in `state.tasks`

### Frontend — Files & Spec three-column layout (T017–T020)

- [x] T017 [US1] Replace content of `paneFiles` in `tools/pr-viewer/public/index.html` with three-column layout: left file rail (`width:262px`, `border-right`, id `fileRail`), center diff area (`flex:1`, id `diffArea`), right spec panel (`width:392px`, `border-left`, id `specPanel`); spec panel hidden when `state.specFiles.length === 0`
- [x] T018 [US1] Add CSS for three-column Files & Spec layout in `tools/pr-viewer/public/index.html`: file rail groups (Specification / Code), file rail row styles (active state, markdown badge for spec files, status dot + stat for code files), spec panel header (SPEC badge + "Specification" + "pinned" label), spec tab bar (3 tabs with active accent bg, tasks tab shows `N/M` counter badge)
- [x] T019 [US1] Add `renderFileRail()` in `tools/pr-viewer/public/index.html`: render Specification group (spec file rows with "M↓" badge, clicking sets `state.specTab` and switches spec panel tab) and Code group (code file rows with status dot + `+add/−del`, clicking sets `state.selFile` and calls `renderDiff()`); highlight active row with `--s2` bg
- [x] T020 [US1] Add `renderSpecPanel()` in `tools/pr-viewer/public/index.html`: render tab bar (spec/plan/tasks tabs — show only tabs for which a spec file exists); on spec/plan tab: call `renderMarkdown(specFile.markdown)` and append to panel content area; on tasks tab: render progress bar (`done/total`, accent fill, `transition: width .3s`) then grouped checklist rows (checkbox, mono task code, text, strikethrough+muted when done, optional "new" tag); wire checkbox `onclick` to toggle `state.tasks[i].done` and re-render progress bar

### Frontend — wire spec panel into PR open flow (T021)

- [x] T021 [US1] Update `renderPR()` in `tools/pr-viewer/public/index.html` to call `renderFileRail()` and `renderSpecPanel()` after setting up pane layout; show/hide spec panel column based on `state.specFiles.length > 0`; ensure `renderDiff(state.selFile)` renders the initially selected file in the center diff area

**Checkpoint**: Open a PR with spec files → Specification group in rail, right panel renders markdown, tasks tab shows checklist with progress bar. Open a PR without spec files → full-width diff, no spec panel.

---

## Phase 4: User Story 2 — Three-Tab Overview & Review (Priority: P1)

**Goal**: Populate the Overview and Review tabs with correct content. Tab switching
is already wired (Phase 2) — this phase fills in the content.

**Independent Test**: Click Overview → see PR title, meta, description, timeline, right
rail. Click Review → see radio buttons and textarea. See `quickstart.md` Scenario 1.

### Overview tab (T022–T024)

- [x] T022 [US2] Add `renderOverview(meta)` in `tools/pr-viewer/public/index.html`: render into `paneOverview`; two-column grid layout (1fr 296px, gap 30px); left column: PR header (title at 25px/600, meta row with author avatar chip, commit count, branch chips in mono, age), description card, Spec-Kit callout card (shown only when `state.specFiles.length > 0` — SPEC badge + "Spec-Kit detected" + button to switch to Files & Spec tab), activity timeline (vertical rule, event nodes); right column: Reviewers section, Spec-Kit file list (clickable rows → switch to Files & Spec), Checks section
- [x] T023 [P] [US2] Add CSS for Overview layout in `tools/pr-viewer/public/index.html`: two-column grid, PR header styles (title 25px/600, letter-spacing -0.012em), meta row (13px muted, avatar chip 19px circle, branch chips mono 12px/radius 6px), timeline (1.5px vertical rule, 21px circular event nodes), right rail section labels (11px uppercase muted, letter-spacing 0.04em), Spec-Kit callout card (34px SPEC badge, accent bg)
- [x] T024 [P] [US2] Add `timeAgo(dateString)` helper in `tools/pr-viewer/public/index.html` — returns human-readable relative time ("2 days ago", "just now") from an ISO date string; used in Overview meta row and timeline events

### Review tab (T025–T026)

- [x] T025 [US2] Add `renderReview()` in `tools/pr-viewer/public/index.html`: render into `paneReview`; centered layout max-width 680px; "← back to files" link (calls `switchTab('files')`); heading "Submit your review"; form card with three radio options (Comment / Approve / Request changes — Approve and Request changes show mono `confirm required` tag); markdown textarea; submit button whose label/color updates based on selected radio; merge card present but non-functional (placeholder text only)
- [x] T026 [P] [US2] Add CSS for Review tab in `tools/pr-viewer/public/index.html`: centered max-width 680px, form card (border, radius, padding), radio option rows (label + `confirm required` mono tag), submit button danger variant for Request changes, merge card (muted, non-interactive appearance)

### Wire Overview + Review into PR open flow (T027)

- [x] T027 [US2] Update `openPR()` in `tools/pr-viewer/public/index.html` to call `renderOverview(data.meta)` and `renderReview()` after PR data loads; `renderOverview` and `renderReview` must be callable independently so tab switching to any tab shows current PR data

**Checkpoint**: All three tabs render correct content for the open PR. Back link from Review returns to Files & Spec.

---

## Phase 5: User Story 3 — Split Diff & Theme Toggle (Priority: P2)

**Goal**: Add split/unified diff toggle and light/dark theme toggle, both persisted.

**Independent Test**: Toggle split on a file with adds and removes — paired rows appear.
Reload — mode restores. Toggle theme — light palette applies. Reload — theme restores.
See `quickstart.md` Scenarios 5 and 6.

### Split diff (T028–T030)

- [x] T028 [US3] Add `buildSplit(hunks)` function in `tools/pr-viewer/public/index.html`: takes `parseDiff` hunk array; walks rows; buffers consecutive `del` rows and consecutive `add` rows; when run ends emits paired `{ left, right }` objects (positional zip); unpaired slots get `null`; context rows emit `{ left: ctx, right: ctx }`; returns array of pair objects for table rendering
- [x] T029 [US3] Add `renderDiffUnified(file)` and `renderDiffSplit(file)` functions in `tools/pr-viewer/public/index.html`: unified = existing `renderFile()` table logic (refactored to accept a file object); split = two-cell table rows using `buildSplit()` output — left cell (old: del/ctx, `--del-bg` or transparent), right cell (new: add/ctx, `--add-bg` or transparent), empty cells use `--empty-bg` filler; single-column override for `file.isNew` in both modes; `renderDiff(path)` dispatches to unified or split based on `state.diffMode`
- [x] T030 [US3] Add Split/Unified segmented control to diff toolbar in `tools/pr-viewer/public/index.html` (inside `diffArea` toolbar, right side); wire segment button `onclick` to set `state.diffMode`, persist to `localStorage.setItem("pr-viewer-diffmode", mode)`, and call `renderDiff(state.selFile)` to re-render current file; add segmented control CSS (two buttons, active segment gets `--s2` bg + border, `transition: all .12s`)

### Theme toggle wiring (T031)

- [x] T031 [US3] Confirm theme toggle button (wired in T009) correctly triggers full palette swap; add CSS for any tokens not yet covered by T001–T002 (empty-bg for split filler, overlay for modal scrim); verify `--sel` and `--sel-edge` (line selection) use updated accent tokens from T001 rather than old blue `#6ea8fe`

**Checkpoint**: Split diff renders paired rows. Reload restores both split mode and theme. Brand-new files remain single-column in both modes.

---

## Phase 6: User Story 4 — Confirm Modal & Toast (Priority: P2)

**Goal**: Replace `window.confirm()` with a designed modal for Approve and Request
changes; wire Review tab submit buttons to the confirm flow; toast on success.

**Independent Test**: On Review tab, select Approve → submit → modal appears → Cancel
closes with no request → Confirm posts review → toast appears. Comment submits immediately.
See `quickstart.md` Scenarios 7 and 8.

### Confirm modal (T032–T034)

- [x] T032 [US4] Add confirm modal HTML structure to `tools/pr-viewer/public/index.html` (outside pane divs, sibling to existing `#tray`): `<div id="confirmModal">` with overlay scrim (`--overlay` bg, `backdrop-filter: blur(2px)`), inner card (440px, centered), icon chip (tone-tinted: ok-green for approve, danger-red for request-changes), title `<h3>`, body `<p>`, Cancel button, and tone-colored confirm button
- [x] T033 [US4] Add `showConfirm(config)` and `hideConfirm()` in `tools/pr-viewer/public/index.html`: `showConfirm` populates modal title/body/button label/tone from `ConfirmConfig` object (see data-model.md), shows modal; `hideConfirm` hides modal and clears `state.confirm`; clicking scrim or Cancel calls `hideConfirm()`; clicking confirm button calls the provided `onConfirm` callback then `hideConfirm()`
- [x] T034 [US4] Add CSS for confirm modal in `tools/pr-viewer/public/index.html`: overlay full-screen fixed with `--overlay` bg and blur; inner card `max-width: 440px`, centered, `border-radius: var(--radius)`, `animation: pop .2s cubic-bezier(.2,.7,.2,1)`; icon chip (32px square, tinted bg); tone classes for ok (green) and danger (red) confirm button; `@keyframes pop` scale from 0.92 to 1

### Review tab submission (T035–T036)

- [x] T035 [US4] Add `reviewAction` field to `state` (default `'comment'`) in `tools/pr-viewer/public/index.html`; wire radio buttons in `renderReview()` to set `state.reviewAction` and update submit button label (`Submit comment` / `Approve…` / `Request changes…`) and helper text; Request changes submit button uses danger color
- [x] T036 [US4] Replace `submitReview()` calls in `tools/pr-viewer/public/index.html`: Comment → calls `doSubmitReview("COMMENT")` directly (no modal); Approve → calls `showConfirm({ kind:'approve', title:'Approve this PR?', body:'This submits a formal approval visible to the author and counts toward merge eligibility. It cannot be undone from here — use GitHub.com to dismiss the review.', label:'Approve', tone:'ok', onConfirm: () => doSubmitReview("APPROVE") })`; Request changes → same pattern with danger tone and appropriate consequence text; `doSubmitReview(event)` contains the existing fetch logic from `submitReview()`; on success: toast via existing `toast()`, clear pending + review body, refresh PR

### Existing tray wiring cleanup (T037)

- [x] T037 [US4] Remove old `window.confirm()` calls from `tools/pr-viewer/public/index.html`; rewire `#submitApprove` and `#submitChanges` tray buttons to use `showConfirm()` (same config as Review tab); keep tray for inline comment management (add-to-review, pending list, discard) — tray is still the primary UX for inline comment submission

**Checkpoint**: No `window.confirm()` remains. Approve and Request changes always show modal. Comment path has no modal. Toast appears on success. Existing inline comment tray still works.

---

## Phase N: Polish & Cross-Cutting Concerns

**Purpose**: Final fit-and-finish across all stories.

- [x] T038 [P] Add status pill component to PR header area in `tools/pr-viewer/public/index.html` — 6px dot + label, radius 999px, tinted bg: Open (green), Approved (green), Changes requested (red), Merged (neutral); derive from `meta.reviewDecision` and `meta.state`; show in Overview header and top bar
- [x] T039 [P] Add toast animation in `tools/pr-viewer/public/index.html`: `@keyframes toastIn` (slide up from bottom), `animation: toastIn .25s`; update toast auto-dismiss to 3600ms (up from current 2500ms) per design spec; bottom-center positioning with accent bg
- [x] T040 [P] Tighten diff row height to `var(--row-h, 27px)` and mono font size to `12.5px` in `tools/pr-viewer/public/index.html` diff table CSS; update `white-space: pre` (not `pre-wrap`) for diff code cells per design
- [x] T041 Update `tools/pr-viewer/public/index.html` empty states: no-PR-selected state, empty diff state, spec panel error state (when a spec file's markdown is null/missing — show "Could not load [filename]" inline in the panel tab, not a full-page failure)
- [x] T042 Run through `quickstart.md` Scenarios 1–8 manually; verify all acceptance criteria from `spec.md` pass; fix any visual or interaction gaps

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1 (Setup)**: No dependencies — start immediately
- **Phase 2 (Foundational)**: Depends on Phase 1 — BLOCKS all user stories
- **Phase 3 (US1 — Spec Panel)**: Depends on Phase 2 — core MVP work
- **Phase 4 (US2 — Overview & Review)**: Depends on Phase 2; can run alongside Phase 3 (different functions)
- **Phase 5 (US3 — Split/Theme)**: Depends on Phase 3 (split builds on `renderDiff`); theme toggle wired in Phase 2
- **Phase 6 (US4 — Modal)**: Depends on Phase 4 (Review tab must exist)
- **Polish**: Depends on all story phases complete

### User Story Dependencies

- **US1 (Spec Panel)**: Depends on Phase 2 foundational layout only
- **US2 (Tabs content)**: Depends on Phase 2 foundational layout only; can run in parallel with US1
- **US3 (Split/Theme)**: Depends on US1 (`renderDiff` function); theme toggle already wired in Phase 2
- **US4 (Modal)**: Depends on US2 (Review tab exists)

### Within Each Phase

- Tasks marked [P] can run in parallel with other [P] tasks in the same phase
- T011–T012 (server) can run fully in parallel with T015–T016 (frontend parsers)
- T022–T024 (Overview) can run in parallel with T025–T026 (Review CSS/render)

---

## Parallel Opportunities

### Phase 3 (US1) — can parallelise:

```
Parallel group A (server):
  T011 — detect spec paths in diff
  T012 — fetch spec file content

Parallel group B (frontend parsers — independent of server):
  T015 — renderMarkdown()
  T016 — parseTasks()

Sequential after both groups complete:
  T013 → T014 → T017 → T018 → T019 → T020 → T021
```

### Phase 4 (US2) — can parallelise:

```
Parallel:
  T023 — Overview CSS
  T024 — timeAgo() helper
  T026 — Review CSS

Sequential:
  T022 → T025 → T027
```

---

## Implementation Strategy

### MVP First (US1 + US2 only)

1. Phase 1: CSS tokens
2. Phase 2: Three-tab shell
3. Phase 3: Spec panel (server + frontend) — **this is the core feature**
4. Phase 4: Overview + Review content
5. **STOP and validate**: Scenarios 1–4 from `quickstart.md`

### Full Feature

5. Phase 5: Split diff + theme persistence (Scenarios 5–6)
6. Phase 6: Confirm modal (Scenarios 7–8)
7. Polish: T038–T042

### Single-Developer Order

T001 → T002 → T003 → T004 → T005 → T006 → T007 → T008 → T009 → T010 →
T011 → T012 → T013 → T014 → T015 → T016 → T017 → T018 → T019 → T020 → T021 →
T022 → T023 → T024 → T025 → T026 → T027 →
T028 → T029 → T030 → T031 →
T032 → T033 → T034 → T035 → T036 → T037 →
T038 → T039 → T040 → T041 → T042

---

## Notes

- [P] tasks = different files or functions, no blocking dependencies
- [US#] label maps task to a specific user story for traceability
- All tasks target exactly two source files: `tools/pr-viewer/server.js` and `tools/pr-viewer/public/index.html`
- Verify diff still renders after Phase 2 before proceeding to Phase 3
- The existing `parseDiff`, `el()`, `toast()`, `wireGutter()`, `attachComments()`, and `renderTray()` are preserved and reused throughout
- No new npm packages at any phase — constitution Principle II
