# Handoff: Spec-Kit–aware PR review UI

## Overview
This package specifies the **Spec-Kit side panel and review flow** for the existing
`pr-viewer` tool — the feature the project README already names as "the obvious
extension … detect `spec.md` / `plan.md` / `tasks.md` in the changed files and
render them as formatted markdown in a side panel rather than as just-another-diff."

It also covers two smaller upgrades that came out of the design: a **Split/Unified
diff toggle**, a **light/dark theme toggle**, and a tightened **review-submit flow**
with explicit confirm gating on irreversible-ish actions (approve, request-changes).

The differentiating screen is **Files & Spec**: the diff and the rendered spec files
sit side by side, with `tasks.md` rendered as a live checklist with a progress bar —
not raw markdown, and not buried as just-another-changed-file. That's the thing
neither the terminal nor VS Code does well, and it's the reason to build this.

## About the design files
The files in `design/` are a **design reference created in HTML** — an interactive
prototype showing the intended look and behavior. It is **not** production code to
copy verbatim.

- `design/Spec Review.dc.html` — the prototype. It is a self-contained component
  file; open it directly in a browser to click through all three screens, toggle
  theme, toggle split/unified, switch spec tabs, check off tasks, and walk the
  review → confirm flow. `design/support.js` is just its runtime; ignore it for
  implementation.
- The prototype uses a small in-house component runtime (`<sc-if>` / `<sc-for>` /
  `renderVals`). **Do not port that runtime.** The existing `pr-viewer` frontend is
  plain vanilla JS with `el()` helpers and a `state` object in one `public/index.html`
  with no build step. **Recreate this design in that existing style** — keep the
  no-build, single-file, `el()`/`state` approach. Don't introduce React, a bundler,
  or a CSS framework unless you have a strong reason; the whole point of the tool is
  that it's a thin, dependency-light face over `gh`.

The prototype also exposes a 3-way "style take" switch (Structured / Soft / Editor)
purely so the stakeholder could compare directions. **Ship only one: "Structured"**
(flat, hairline borders, no shadows) — it's the closest match to the current tool and
the chosen direction. Ignore the Soft and Editor variants.

## Fidelity
**High-fidelity.** Colors, typography, spacing, and interactions are final. Recreate
the UI faithfully, but reuse the codebase's existing CSS-variable token system (see
*Design Tokens* — the current `:root` already defines most of what you need; this
design mostly adds a **light theme** and a few spec-panel tokens).

---

## How this maps onto the existing codebase

You are extending, not rewriting. Current state of the repo:

- **`server.js`** already exposes everything the data side needs:
  - `GET /api/prs` — PR list
  - `GET /api/prs/:num` — returns `{ meta, diff, comments, repo }`. `diff` is raw
    `gh pr diff` unified text.
  - `POST /api/prs/:num/review` — posts a review with `event` of `COMMENT` /
    `APPROVE` / `REQUEST_CHANGES` (+ optional inline `comments[]`).
  - `POST /api/prs/:num/comment` — plain PR-level comment.
- **`public/index.html`** already has: a working unified-diff parser (`parseDiff`)
  that tags every file with `path` / `status` / `additions` / `deletions` / `hunks`,
  per-file collapsible rendering, gutter line-selection, a comment composer, a
  pending-review tray, and a confirm dialog on Approve / Request changes.

So most of the **backend is done**. The work is almost entirely frontend, plus two
small server touches noted below.

### Server changes needed (small)
1. **Spec-file content.** The unified diff only contains *changed* lines of the spec
   files; the panel needs the **full rendered markdown** of each spec file at the PR
   head. Add their content to the `GET /api/prs/:num` payload. Two options:
   - Cheapest: for each detected spec path, run
     `gh api repos/{repo}/contents/{path}?ref={headRefOid} --jq .content` (base64) and
     decode, OR `gh pr diff` is not enough — prefer
     `gh api .../contents` at `headRefOid`. Return as `specFiles: [{ path, markdown }]`.
   - Keep it lazy if you prefer: a `GET /api/prs/:num/spec?path=…` route the panel
     calls when first opened.
2. **Merge is intentionally NOT in scope.** The current tool deliberately omits merge
   ("do that on github.com"). The prototype shows a merge button for completeness, but
   **do not wire a real merge** unless the team explicitly decides to add it. If you
   do, it MUST stay behind the confirm modal (see *Interactions*). Approve /
   request-changes already exist server-side and are the irreversible actions to gate.

### Spec-Kit detection (frontend, in `openPR`)
After `parseDiff(data.diff)`, branch on filename. A file is a spec file when its
`path` matches `specs/**/{spec,plan,tasks}.md` (be lenient — also match a bare
`spec.md` / `plan.md` / `tasks.md` at any depth). Pull those out of the normal file
list into a separate `state.specFiles` group, and render them in the right-hand panel
instead of as diff cards. Show a "Spec-Kit detected" affordance only when at least one
is present; when none are present the layout collapses to the current diff-only view.

### tasks.md → checklist
Parse GitHub-style task lines from `tasks.md`: `- [ ] text` and `- [x] text`. Render
each as a checkbox row; count `[x]` vs total for the progress bar. Group by the
nearest preceding markdown heading (the prototype groups into Setup / Core / Validation
/ Docs — those come from `##`/`###` headings in the file). Checking a box in the UI is a
**local preview** unless you decide to write back to the file — treat it as read-only
reflection of the committed `tasks.md` by default.

---

## Screens / Views

The prototype is a single PR's detail view with three tabs in the top bar:
**Overview**, **Files & Spec**, **Review**. (The existing tool's left PR-list sidebar
still belongs to the left of all of this — the prototype focuses on the detail pane.)

### 1. Overview
- **Purpose**: orient the reviewer — PR header, description, activity timeline, and a
  Spec-Kit summary in the right rail.
- **Layout**: centered column, `max-width: 1080px`, `padding: 30px 32px 60px`. Below
  the PR header, a two-column grid: `grid-template-columns: 1fr 296px`, `gap: 30px`,
  `align-items: start`. Left = description card + Spec-Kit callout + vertical timeline.
  Right (sticky) = Reviewers, Spec-Kit file list (3), Checks.
- **Key components**:
  - **PR header**: title at `25px / 600 / letter-spacing -0.012em`; meta row at `13px`
    muted with author avatar chip (19px circle, initials), commit count, base/head
    branch chips (mono `12px`, `--s2` bg, `radius 6px`), "opened 2 days ago".
  - **Status pill** (top bar): `Open` green, `Approved` green, `Changes requested` red,
    `Merged` neutral. 6px dot + label, `radius 999px`, tinted bg.
  - **Spec-Kit callout card**: 34px square "SPEC" badge (accent bg) + title "Spec-Kit
    detected in this PR" + a button that jumps to Files & Spec.
  - **Timeline**: 1.5px vertical rule at `left:10px`; each event a 21px circular node
    (surface bg, 1.5px border) with an icon, `who` bold + `text` muted + `when`. Some
    events expand an inline body card.
  - **Right rail sections** ("Reviewers", "Spec-Kit", "Checks"): 11px uppercase muted
    labels, `letter-spacing 0.04em`. Spec-Kit list rows are mono filename + meta;
    clicking a row opens Files & Spec on that tab.

### 2. Files & Spec  — THE HERO SCREEN
- **Purpose**: review the diff with the spec pinned beside it.
- **Layout**: three columns, full height, no page scroll (each column scrolls
  independently):
  - **Left file rail** — `width: 262px`, `border-right`. Two groups: **Specification**
    (the 3 spec files, each with an "M↓" markdown badge) and **Code** (the changed code
    files with status dot + `+add`/`−del` stats). Selected row uses `--s2` bg.
  - **Center diff** — `flex: 1`. A 46px toolbar (selected file path in mono, stat,
    then a **Split / Unified** segmented toggle on the right, and a "Viewed" checkbox).
    Below it the diff body scrolls.
  - **Right spec panel** — `width: 392px`, `border-left`, pinned/always visible. 46px
    header ("SPEC" badge + "Specification" + "pinned"). A row of 3 tabs:
    `spec.md` / `plan.md` / `tasks.md` (tasks tab shows a `6/9` counter badge). Content
    scrolls below.
- **Diff rendering** — reuse and extend the existing `parseDiff` output:
  - **Unified mode** = essentially today's table, but with two gutter columns
    (old line no. + new line no.), a sign column, and the code. Row backgrounds:
    add = `--add-bg`, del = `--del-bg`, context = transparent. Hunk header row uses
    `--s2` bg, muted mono `11px`.
  - **Split mode** (new) = two side-by-side panes. Build paired rows by walking each
    hunk: consecutive `-` lines pair with consecutive `+` lines positionally; unpaired
    cells get an `--empty-bg` filler. Left pane = old (del/context), right = new
    (add/context), 1px divider between. See `buildSplit()` / `buildUnified()` in the
    prototype's logic for the exact pairing algorithm — port that logic into a vanilla
    function that consumes your existing `parseDiff` file objects.
  - Row height token `--row-h` (Structured take = 27px). Mono `12.5px`,
    `white-space: pre`, line numbers `user-select: none`, muted.
  - Keep the existing nicety: brand-new files render single-column (no empty "before").
- **Spec panel tabs**:
  - **spec.md / plan.md** — rendered markdown. Headings become 12px uppercase muted
    section labels; body `13.5px / line-height 1.62` muted; inline code is mono `12px`
    on `--s2` chip. Lines that were *added in this PR* can get a subtle `--add-bg`
    left-accent highlight (the prototype shows one acceptance-criterion line highlighted
    as "added") — optional but it's the "spec changes as readable prose, not a code
    diff" idea.
  - **tasks.md** — heading + `done/total` count, a 6px progress bar
    (`width: pct%`, accent fill, `transition: width .3s`), then grouped checklist rows.
    Each row: 16px checkbox (accent fill + check when done), mono task code (`T001`),
    task text (strikethrough + muted when done), optional "new" tag.

### 3. Review
- **Purpose**: compose and submit the review; gate irreversible actions.
- **Layout**: centered, `max-width: 680px`. A "← back to files" link, title
  "Submit your review", then a form card and a merge card.
- **Form card**: three radio options — **Comment** / **Approve** / **Request changes**.
  Approve and Request-changes show a mono `confirm required` tag. Selecting one updates
  the submit button label + helper text (`Submit comment` posts immediately;
  `Approve…` / `Request changes…` open the confirm modal). A markdown textarea below.
  Request-changes uses the danger color on its submit button.
- **Merge card**: present for completeness only — see server note; don't ship a live
  merge without an explicit decision.

### Confirm modal (shared)
- Centered, 440px, over a `--overlay` scrim with `backdrop-filter: blur(2px)`. Icon
  chip (tone-tinted: ok-green for approve, danger-red for request-changes/merge),
  title, body that **states the consequence in plain words** ("This submits a blocking
  review… merge stays blocked until…" / "Merging cannot be undone from here — you would
  need a revert PR"), Cancel + a tone-colored confirm button. Clicking the scrim or
  Cancel closes; only the confirm button performs the action. On success, a toast.
- This replaces the current `window.confirm()` calls in `submitReview()`. Functionally
  equivalent gating, nicer surface — but `window.confirm()` is an acceptable MVP if you
  want to ship the panel first and upgrade the modal later.

---

## Interactions & Behavior
- **Top-bar tab switch** (Overview / Files & Spec / Review): instant; no page reload.
- **Split ↔ Unified**: segmented control; re-renders the current file's diff. Persist
  the choice (localStorage) so it survives reloads.
- **Theme toggle** (sun/moon, top right): swaps the light/dark token set on the root.
  Persist in localStorage. **Note:** the current tool is dark-only; this adds a real
  light theme — see tokens below.
- **Spec tab switch** (spec/plan/tasks): swaps panel content; selection state on the
  active tab (accent bg).
- **Task checkbox**: toggles done state + recomputes the progress bar (local-only by
  default).
- **File row select** (left rail): sets the active file in the center diff; spec rows
  switch the right panel tab.
- **Review radio**: changes submit button label/color/helper + whether submit opens the
  confirm modal.
- **Confirm-gated actions**: Approve, Request changes (and Merge if ever added) never
  fire on first click — always the modal. Everything else (Comment, add inline comment)
  is immediate.
- **Toast**: bottom-center, accent bg, `animation: toastIn .25s`, auto-dismiss ~3.6s.
- **Transitions**: segmented-control buttons `transition: all .12s`; progress bar
  `width .3s cubic-bezier(.4,0,.2,1)`; modal `pop .2s cubic-bezier(.2,.7,.2,1)`.

## State Management
Extend the existing `state` object. New fields:
- `theme: 'light' | 'dark'` (persisted)
- `screen: 'overview' | 'files' | 'review'`
- `diffMode: 'split' | 'unified'` (persisted)
- `selFile`: active code file id/path
- `specTab: 'spec' | 'plan' | 'tasks'`
- `specFiles: [{ path, kind, markdown }]` — the detected Spec-Kit files (new, from
  server)
- `tasks: [{ code, text, done, phase, isNew }]` — parsed from `tasks.md`
- `reviewAction: 'comment' | 'approve' | 'request'`
- `confirm: null | { kind, title, body, label, tone, danger }`
- `prState: 'open' | 'approved' | 'changes_requested' | 'merged'` — reflects review
  decision; drives the status pill.

Existing fields (`prs`, `current`, `repo`, `commitId`, `files`, `pending`) stay.

## Design Tokens

The current `:root` is the **dark** set. Keep it, and add a **light** set the theme
toggle swaps to. Values below are from the chosen "Structured" take (OKLCH; hex
fallbacks fine).

**Light**
- bg `oklch(0.984 0.002 248)` · surface `#fff` · s2 `oklch(0.966 0.003 248)` · s3 `oklch(0.94 0.004 248)`
- border `oklch(0.912 0.004 248)` · border2 `oklch(0.85 0.006 250)`
- text `oklch(0.245 0.012 258)` · text2 `oklch(0.5 0.012 258)` · text3 `oklch(0.64 0.01 258)`
- add-bg `oklch(0.952 0.035 150)` · del-bg `oklch(0.957 0.03 25)` · add-stat `oklch(0.52 0.1 150)` · del-stat `oklch(0.55 0.13 25)`
- ok `oklch(0.55 0.1 150)` · warn `oklch(0.56 0.12 65)` · danger `oklch(0.53 0.16 25)`
- accent `oklch(0.27 0.012 258)` (near-black) · accent-text `#fff`

**Dark** (≈ your existing palette, re-stated in OKLCH)
- bg `oklch(0.176 0.006 262)` · surface `oklch(0.212 0.007 262)` · s2 `oklch(0.248 0.008 262)`
- border `oklch(0.305 0.008 262)` · text `oklch(0.95 0.004 262)` · text2 `oklch(0.72 0.008 262)` · text3 `oklch(0.56 0.008 262)`
- add-bg `oklch(0.30 0.045 152)` · del-bg `oklch(0.315 0.055 24)` · accent `oklch(0.95 0.004 262)` (near-white) · accent-text `oklch(0.2 0.01 262)`

Note the **monochrome accent**: light theme accent = near-black, dark theme accent =
near-white. Diff add/remove stays the only color (desaturated green/red). No blue
accent like the current `--accent: #6ea8fe`; the design is deliberately near-neutral.

**Geometry (Structured take)**: radius `8px` / radius-sm `6px` · shadow `none`
(hairline borders only) · card padding `15px` · diff row height `27px`.

**Type**:
- Sans: **Geist** (fallback `system-ui, -apple-system, sans-serif`)
- Mono: **Geist Mono** (fallback `ui-monospace, "SF Mono", Menlo, monospace`)
- The current tool uses `system-ui` + `ui-monospace`; Geist is a nicer match for the
  "GitHub-Next / Linear" feel but is optional — the layout holds with the system stack.
- Scale: PR title 25px/600; screen titles 17–22px/600; body 13.5px/1.62; UI controls
  12.5–13px/500–560; mono code 12.5px; section labels 11px uppercase `letter-spacing .04em`.

## Assets
- **Icons**: all drawn inline as small SVGs in the prototype (check, x, sun, moon,
  comment, git nodes, warning triangle, merge). Reuse your preferred icon approach —
  inline SVG or an icon font. No raster assets.
- **Fonts**: Geist / Geist Mono via Google Fonts (`fonts.googleapis.com`), optional.
- **No images** in the design. Avatars are initials-in-a-circle chips.

## Files
- `design/Spec Review.dc.html` — the interactive prototype (all three screens, both
  themes, both diff modes). Open in a browser to explore. **The split/unified pairing
  logic and the tasks/markdown parsing intent are easiest to read straight from this
  file's logic section.**
- `design/support.js` — prototype runtime only; not part of the deliverable.

Existing files you'll modify:
- `public/index.html` — most of the work lands here (new layout, spec panel, toggles,
  modal), reusing `parseDiff`, `el()`, `state`, the tray, and the composer.
- `server.js` — add spec-file content to the PR-detail payload (one route touch).
