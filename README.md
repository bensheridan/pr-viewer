# PR Viewer

A small, locally-hosted pull-request review UI backed by the `gh` CLI. Built for
teams that are stuck on GitHub but find the web PR experience clunky for *reading
diffs* and *commenting on code*. GitHub stays the source of truth — merges, auth,
history all live there. This is just a nicer face for review.

Each person runs their own instance. `gh` provides auth and identity for free.

## Why this exists

Three specific GitHub-web annoyances it fixes:

1. **Clunky reading** → clean dark diff, syntax-spaced, collapsible per file,
   sticky file headers.
2. **Multi-line code suggestions are hit-and-miss** → line selection is a
   first-class interaction. Drag down the gutter, or click then shift-click to
   extend. The exact range is explicit, so multi-line suggestion blocks are
   reliable instead of fighting GitHub's drag UX. An "Insert suggestion" button
   prefills a ```suggestion block from the selected source lines.
3. **New files waste half the screen on an empty "before" pane** → added files
   are detected and rendered single-column, full width, with the noisy
   `@@ -0,0 +1,N @@` headers suppressed.

## Features

### Diff reading
- Unified and split diff views, toggle per file
- **Syntax highlighting** for JS/TS/JSON/Python/Shell
- **Expand context** — click "↕ Show more context" on any hunk separator to load
  10 additional lines from GitHub inline, without leaving the page
- **Search in diff** — `Cmd+F` opens an in-page search bar with prev/next
  navigation and match count; `Escape` closes it
- **Open on GitHub** — link in the diff toolbar jumps directly to the file at
  the PR head commit
- File rail groups files by type: Code, Config, Docs (within each section)
- **Viewed toggle** — mark files as reviewed; the rail shows a checkmark and
  dims the filename. State is per-PR and resets when you open a different PR

### Commenting
- Drag or shift-click the gutter to select a line range, then add an inline comment
- "Insert suggestion" prefills a ` ```suggestion ` block from the selected lines
- **Reply to thread** — Reply button on any existing comment opens a composer
  scoped to that thread; `Cmd+Enter` submits, `Escape` cancels
- **Comment resolution** — Resolve button per comment dims the thread locally
  (visual only — does not call the GitHub API)
- Comments are batched into a pending review tray and submitted together (COMMENT,
  APPROVE, or REQUEST CHANGES). Approve/Request Changes are gated behind a confirm
  dialog

### Spec panel
- Detects `spec.md`, `plan.md`, and `tasks.md` in changed files and renders them
  as formatted markdown in a right-hand panel alongside the diff
- **Added-line highlights** — lines that are additions in the PR diff get a green
  left-accent highlight in the spec panel, so you can see what changed in the spec
  without switching to the raw diff view
- Tasks tab shows a "new" badge on task lines that were added in this PR
- **PR description card** — collapsible card at the top of the file rail shows
  the PR title and body

### Navigation
- `j` / `k` — next / previous file in the rail
- `n` / `p` — next / previous comment thread in the current diff
- `Cmd+F` — open diff search

## Setup

Prereqs: Node 18+ and the GitHub CLI (`gh`), already authenticated.

```bash
gh auth login        # once, if you haven't
cd pr-viewer
npm install
```

## Run

Run it **from inside the git repo you want to review**, so `gh` resolves the
right repo automatically:

```bash
cd /path/to/your/repo
node /path/to/pr-viewer/server.js
```

Then open http://localhost:4319.

(Tip: alias it — `alias prv='node ~/tools/pr-viewer/server.js'` — and just run
`prv` from any repo.)

## How review submission works

Inline comments are posted via the **reviews** endpoint with a `comments`
array (`gh api repos/OWNER/REPO/pulls/N/reviews`), not the direct
`/pulls/N/comments` endpoint. The latter returns spurious 422 validation errors
on multi-line ranges; the reviews endpoint handles ranges reliably. Comments you
add are batched into a pending review tray and submitted together as one review.

- **Submit comments** → posts a COMMENT review (no approval state).
- **Approve** / **Request changes** → gated behind a confirm dialog, since
  they're visible to the author and affect merge eligibility.

Merging is intentionally **not** here — do that on github.com as you already do.

## Files

- `server.js` — Express server, shells out to `gh`. ~6 routes.
- `public/index.html` — the whole frontend (no build step).

## Caveats

- Diffs are parsed from `gh pr diff` unified output. Binary files show no rows.
- Comment resolution (Resolve button) is local UI state only — it does not mark
  threads resolved on GitHub.
- One repo per running instance (whatever dir you launch from).
