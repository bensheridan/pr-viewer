# Data Model: Review UX Enhancements

**Date**: 2026-06-28

---

## State Extensions

### state.specFiles (modified shape)

Each entry gains an `addedLines` field:

```js
{
  path: string,
  kind: 'spec' | 'plan' | 'tasks',
  markdown: string,
  addedLines: number[],  // NEW — 1-based line numbers that are additions in this PR
}
```

### state.viewed (new)

```js
// Map<prNumber, Set<filePath>>
state.viewed = new Map();

// Access pattern:
const viewedSet = state.viewed.get(state.current) ?? new Set();
const isViewed = viewedSet.has(filePath);
```

---

## Server Payload Extension

`GET /api/prs/:num` → each `specFiles` entry:

```json
{
  "path": "specs/002-foo/spec.md",
  "kind": "spec",
  "markdown": "# Feature...",
  "addedLines": [3, 4, 5, 12, 13]
}
```

`addedLines` is always present (empty array `[]` when no lines were added or spec was
not modified).

---

## New Server Route

`POST /api/prs/:num/comment/reply`

Request body:
```json
{ "comment_id": 123456789, "body": "Thanks, updated.", "repo": "owner/repo" }
```

Response (success):
```json
{ "ok": true, "result": { /* GitHub API reply comment object */ } }
```

Response (error):
```json
{ "error": "message from gh" }
```
