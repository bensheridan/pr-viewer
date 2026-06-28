# API Contract: Spec-Kit UI Redesign

**Date**: 2026-06-28

Only one server route changes. All other routes (`GET /api/prs`, `POST /api/prs/:num/review`,
`POST /api/prs/:num/comment`, `GET /`) are unchanged.

---

## GET /api/prs/:num  (modified)

Returns PR detail with diff, comments, and — new — full spec file content.

### Response shape

```json
{
  "meta": {
    "number": 42,
    "title": "Add feature X",
    "body": "PR description...",
    "author": { "login": "bensheridan" },
    "headRefName": "feat/x",
    "baseRefName": "main",
    "headRefOid": "abc123def456",
    "state": "OPEN",
    "additions": 120,
    "deletions": 30,
    "changedFiles": 5,
    "reviewDecision": null,
    "url": "https://github.com/owner/repo/pull/42"
  },
  "diff": "diff --git a/... (unified diff text)",
  "comments": [ /* existing GitHub review comments, unchanged */ ],
  "repo": "owner/repo",
  "specFiles": [
    {
      "path": "specs/001-foo/spec.md",
      "kind": "spec",
      "markdown": "# Feature Specification: Foo\n\n..."
    },
    {
      "path": "specs/001-foo/tasks.md",
      "kind": "tasks",
      "markdown": "# Tasks: Foo\n\n- [ ] T001 ...\n- [x] T002 ...\n"
    }
  ]
}
```

### specFiles field rules

- `specFiles` is always present (empty array `[]` when no spec files detected).
- A file is included when its path matches any of:
  - `/(^|\/)spec\.md$/`
  - `/(^|\/)plan\.md$/`
  - `/(^|\/)tasks\.md$/`
  - (lenient: bare filename match at any depth)
- `kind` is derived from the filename: `spec.md` → `"spec"`, `plan.md` → `"plan"`,
  `tasks.md` → `"tasks"`.
- `markdown` is the full file content at `headRefOid` (base64-decoded from GitHub
  contents API). If fetching fails for a file, that file is omitted from the array
  and the route does not fail — the error is logged server-side.
- Files are fetched in parallel (via `Promise.all`) to avoid serial latency.

### Server implementation notes

1. After fetching `diff`, detect spec paths by scanning `parsedFiles` (or re-scanning
   the raw diff for `+++ b/` lines).
2. For each detected path, call:
   ```
   gh api repos/{repo}/contents/{path}?ref={headRefOid} --jq .content
   ```
3. Decode base64 and set `markdown`. Skip binary or oversized files (> 500KB).
4. Return the `specFiles` array alongside existing fields.

### Error behaviour

- If `gh api` call for a spec file fails (404, permission error, etc.): omit that
  file from `specFiles`; do not fail the whole route.
- Overall route errors (diff fetch failure, etc.) unchanged — return `{ error: msg }`.

---

## No new routes

The spec panel content is delivered inline in the existing PR-detail response. There
is no separate `/api/prs/:num/spec` route.
