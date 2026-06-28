# API Contract: Review UX Enhancements

**Date**: 2026-06-28

---

## GET /api/prs/:num (modified — specFiles shape)

Each entry in `specFiles[]` gains `addedLines`:

```json
{
  "specFiles": [
    {
      "path": "specs/002-foo/spec.md",
      "kind": "spec",
      "markdown": "...",
      "addedLines": [3, 4, 5, 12]
    }
  ]
}
```

- `addedLines`: 1-based line numbers (matching the `newNo` counter in `parseDiff`)
  that are `+` additions in the unified diff for this file.
- Always present; empty array `[]` when the file was not modified or had no additions.
- Computed server-side from the already-fetched unified diff — no extra `gh` call.

---

## POST /api/prs/:num/comment/reply (new)

Reply to an existing inline review comment thread.

**Request**:
```json
{ "comment_id": 123456789, "body": "Reply text here.", "repo": "owner/repo" }
```

**Response (success)**:
```json
{ "ok": true, "result": { /* GitHub pull request review comment object */ } }
```

**Response (error)**:
```json
{ "error": "error message from gh" }
```

**Implementation**: Calls `gh api repos/{repo}/pulls/comments/{comment_id}/replies
--method POST --input <tmpfile>` using the same temp-file pattern as the existing
review route.

**Error behaviour**: Any `gh` failure returns `{ error: msg }` with HTTP 500.
Empty `body` returns HTTP 400.

---

## No other route changes

All existing routes (`GET /api/prs`, `POST /api/prs/:num/review`,
`POST /api/prs/:num/comment`, `GET /`) are unchanged.
