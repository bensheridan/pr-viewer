# Research: Spec-Kit UI Redesign

**Date**: 2026-06-28

All technical decisions below were resolved from: the design handoff (`docs/README.md`),
the existing codebase (`server.js`, `public/index.html`), and standard platform APIs.
No unknowns remain.

---

## 1. Fetching full spec file content from GitHub

**Decision**: Add `specFiles: [{ path, kind, markdown }]` to the existing
`GET /api/prs/:num` payload. For each detected spec path in the diff, call:

```
gh api repos/{repo}/contents/{path}?ref={headRefOid} --jq .content
```

Decode the base64 result with `Buffer.from(b64, "base64").toString("utf8")`. Return the
decoded markdown string. This is cheap (one extra `gh api` call per spec file) and keeps
all data in a single fetch from the client's perspective.

**Rationale**: The design handoff explicitly recommends this approach. It uses the
existing `gh api` pattern already in `server.js`, requires no new auth or dependencies,
and delivers full prose content rather than just changed lines.

**Alternatives considered**:
- Lazy `GET /api/prs/:num/spec?path=…` route: avoided because it adds a second
  round-trip that delays the spec panel opening; the content is small and the upfront
  cost is acceptable.
- Parsing the unified diff to reconstruct full file content: rejected because diff output
  only contains changed context — reconstructing the full file is error-prone and
  fragile.

---

## 2. Markdown rendering in vanilla JS (no library)

**Decision**: Implement a lightweight `renderMarkdown(text)` function directly in
`index.html`. Required elements for spec/plan/tasks content:

- Headings (`# H1`, `## H2`, `### H3`) → `<h1>`–`<h3>` with uppercase muted label
  styling as specified in the design
- Paragraphs (blank-line-separated blocks)
- Inline code (backtick-wrapped) → `<code>` on a muted chip
- Unordered lists (`- item`) → `<ul><li>`
- Task lines (`- [ ] text`, `- [x] text`) → handled by the separate `parseTasks()`
  function, not by `renderMarkdown()`
- Bold (`**text**`) → `<strong>`
- No need for tables, footnotes, or nested lists for spec content

**Rationale**: The design handoff explicitly says "Do not port that runtime" (referring
to the prototype's component system). The existing codebase has no dependencies beyond
Express. A ~40-line regex-based renderer covers 100% of spec-kit markdown content
without adding a library. `marked.js` or `micromark` would require a `<script>` tag
from a CDN (acceptable) or a bundler (not acceptable) — simpler to inline.

**Alternatives considered**:
- `marked.js` via CDN `<script>` tag: would work within the no-build constraint but
  adds an external dependency and CDN fetch on every load. Avoided for simplicity.
- `innerHTML` with raw markdown: rejected (XSS risk from PR body content).

---

## 3. Split diff pairing algorithm

**Decision**: Port the `buildSplit()` logic from the design prototype. The algorithm:

1. Walk each hunk's rows sequentially.
2. Collect consecutive `-` (del) rows into a `dels` buffer and consecutive `+` (add)
   rows into an `adds` buffer.
3. When the run ends (next row is context or hunk header), emit paired rows: zip `dels`
   and `adds` by index; emit `{ left: del|null, right: add|null }` pairs. Unpaired slots
   get `null` (rendered as an `--empty-bg` filler cell).
4. Context rows emit `{ left: ctx, right: ctx }` (same row in both panes).

This is a pure function over the existing `parseDiff` file objects — no changes to
`parseDiff` itself.

**Rationale**: The design handoff explicitly references this algorithm and recommends
porting it. It handles the common case (interspersed adds/removes) correctly and
produces visually paired output. The positional pairing (not semantic diff) is
intentional — it matches what the prototype shows and is the simplest correct approach.

**Alternatives considered**:
- Myers diff between del and add strings for word-level highlighting: out of scope for
  this feature; the design doesn't include word-level highlighting.
- Rendering split as two separate `<table>` elements side by side: rejected in favour
  of a single table with left/right cell pairs — simpler scroll sync and consistent
  with the prototype approach.

---

## 4. Spec file detection pattern

**Decision**: A file is a spec file if its path satisfies any of:
- Filename is exactly `spec.md`, `plan.md`, or `tasks.md` (any depth)
- Path matches `specs/**/spec.md`, `specs/**/plan.md`, or `specs/**/tasks.md`

In code: `/(^|\/)spec\.md$/.test(path)` etc., and set `kind` to `'spec'`, `'plan'`,
or `'tasks'` accordingly.

**Rationale**: The design handoff specifies "be lenient — also match a bare `spec.md` /
`plan.md` / `tasks.md` at any depth." This covers both the project's own
`specs/001-*/spec.md` layout and simpler single-spec repos.

---

## 5. Theme token strategy

**Decision**: Keep the existing dark CSS variables as-is (renamed to match the design's
semantic naming where needed). Add a `[data-theme="light"]` block on `:root` (or `html`)
that overrides each variable with the light values from the design handoff. The theme
toggle sets `document.documentElement.dataset.theme = theme` and persists to
`localStorage.setItem("theme", theme)`.

New tokens needed beyond the current set:
- `--s2`, `--s3` (surface levels 2 and 3)
- `--border2` (stronger border)
- `--text2`, `--text3` (muted text levels)
- `--ok`, `--warn`, `--danger` (status colors)
- `--overlay` (modal scrim)
- `--row-h: 27px` (diff row height token)
- `--radius: 8px`, `--radius-sm: 6px`
- Accent changes: dark → near-white, light → near-black (monochrome accent per design)

The existing `--accent: #6ea8fe` (blue) is replaced by the monochrome accent system.
Selection highlight color (`--sel`, `--sel-edge`) needs updating to use the new accent.

**Rationale**: CSS variable override per `[data-theme]` attribute is the simplest,
no-JS-in-CSS approach that works without a build step. It's what the prototype implies.

---

## 6. Three-tab layout strategy

**Decision**: Replace the current `<section class="main">` single-pane area with a
tab-bar + three content panes approach. Each pane is a `<div>` that is shown/hidden via
`display:none` / `display:block` (or a CSS class). `state.screen` drives which is
visible. No routing, no history API — tab switching is pure DOM.

The left PR-list sidebar (`#sidebar`, 300px) remains unchanged. The right side of the
layout changes from one scrollable column to:

```
[top bar: PR Viewer | repo | [Overview] [Files & Spec] [Review] | theme toggle]
[overview pane | files pane | review pane]   ← only one visible at a time
```

The Files & Spec pane is a three-column layout (file rail 262px | diff flex:1 | spec
panel 392px) that is full-height with independent scroll per column.

**Rationale**: The simplest DOM approach that meets the < 100ms tab switch requirement.
No framework, no virtual DOM, no router — just toggling `display`.
