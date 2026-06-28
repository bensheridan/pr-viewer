# Data Model: Spec-Kit UI Redesign

**Date**: 2026-06-28

All state lives in the browser `state` object (no server-side session). Persistent
preferences use localStorage. The server adds one new field to its PR-detail response.

---

## State Object (extended)

Existing fields (unchanged): `prs`, `current`, `repo`, `commitId`, `files`, `pending`,
`commentsByLoc`.

### New fields

```js
state = {
  // --- existing (unchanged) ---
  prs: [],           // PR list from /api/prs
  current: null,     // active PR number
  repo: null,        // "owner/name"
  commitId: null,    // headRefOid
  files: [],         // parsed code diff files (excludes spec files)
  pending: [],       // pending inline comments
  commentsByLoc: {}, // keyed "path:line"

  // --- new ---
  specFiles: [],     // [{ path, kind, markdown }] — detected spec files
  tasks: [],         // [{ code, text, done, phase, isNew }] — parsed from tasks.md

  screen: 'files',   // 'overview' | 'files' | 'review'  (persisted: no)
  diffMode: 'unified', // 'unified' | 'split'             (persisted: localStorage)
  selFile: null,     // path of active file in left rail
  specTab: 'spec',   // 'spec' | 'plan' | 'tasks'

  theme: 'dark',     // 'dark' | 'light'                  (persisted: localStorage)
  reviewAction: 'comment', // 'comment' | 'approve' | 'request'
  confirm: null,     // null | ConfirmConfig — see below
  prState: 'open',   // 'open' | 'approved' | 'changes_requested' | 'merged'
}
```

---

## Entity Shapes

### SpecFile

```js
{
  path: string,      // e.g. "specs/001-foo/spec.md"
  kind: 'spec' | 'plan' | 'tasks',
  markdown: string,  // full markdown content at PR head ref
}
```

### Task (parsed from tasks.md)

```js
{
  code: string,      // e.g. "T001" — leading token from task line
  text: string,      // task description (rest of line after code)
  done: boolean,     // true if "- [x]"
  phase: string,     // heading text of the nearest preceding ## or ### heading
  isNew: boolean,    // true if line contains "[new]" tag (optional marker)
}
```

### ConfirmConfig

```js
{
  kind: 'approve' | 'request' | 'merge',
  title: string,           // e.g. "Approve this PR?"
  body: string,            // consequence in plain words
  label: string,           // confirm button label, e.g. "Approve"
  tone: 'ok' | 'danger',  // button color: ok=green, danger=red
}
```

---

## Persistence (localStorage)

| Key | Values | Default |
|-----|--------|---------|
| `pr-viewer-theme` | `'dark'` \| `'light'` | `'dark'` |
| `pr-viewer-diffmode` | `'unified'` \| `'split'` | `'unified'` |

Read on page load; write on toggle. No other state is persisted.

---

## Server-Side Data (new field)

The `GET /api/prs/:num` response gains one new top-level field:

```js
{
  meta: { ... },     // unchanged
  diff: "...",       // unchanged
  comments: [...],   // unchanged
  repo: "...",       // unchanged
  specFiles: [       // NEW — empty array if no spec files detected
    { path: string, kind: 'spec'|'plan'|'tasks', markdown: string }
  ]
}
```

Detection and content fetching happen in `server.js` during the existing PR-detail
handler. The client receives spec content in the same response as the diff.
