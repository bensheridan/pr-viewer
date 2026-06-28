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

## Spec-Kit angle (next step, not yet built)

The obvious extension for your team: detect `spec.md` / `plan.md` / `tasks.md`
in the changed files and render them as formatted markdown in a side panel
rather than as just-another-diff. The parser already tags every file with its
path and status, so branching on those filenames is a small addition.

## Files

- `server.js` — Express server, shells out to `gh`. ~5 routes.
- `public/index.html` — the whole frontend (no build step).

## Caveats

- Read + comment focused. No reply-to-thread yet (the GitHub API for replying
  into an existing review thread needs the thread/comment id; straightforward to
  add).
- Diffs are parsed from `gh pr diff` unified output. Binary files show no rows.
- One repo per running instance (whatever dir you launch from).
