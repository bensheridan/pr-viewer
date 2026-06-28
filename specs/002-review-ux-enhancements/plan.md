# Implementation Plan: Review UX Enhancements

**Branch**: `002-review-ux-enhancements` | **Date**: 2026-06-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-review-ux-enhancements/spec.md`

## Summary

Three additive enhancements to `public/index.html` (and one small server touch for
US1). All changes are purely frontend except the spec-highlight feature which needs
the server to return which lines are additions for each spec file. No new dependencies,
no build step, no new routes (one payload field addition).

- **US1**: Cross-reference the unified diff to highlight added lines in the rendered
  spec panel markdown — "spec changes as readable prose."
- **US2**: Reply to existing inline review comment threads via
  `POST /repos/{owner}/{repo}/pulls/comments/{id}/replies`.
- **US3**: Per-file "Viewed" toggle — session-local, reflected in the left file rail.

## Technical Context

**Language/Version**: Node.js 18+ ESM, vanilla JS (no transpile)

**Primary Dependencies**: Express 4.x; no frontend dependencies

**Storage**: In-memory session state for Viewed; no persistence required

**Testing**: Manual browser validation per quickstart.md

**Target Platform**: Local macOS/Linux, single-user, launched from a git repo

**Project Type**: Extend existing `server.js` + `public/index.html`

**Constraints**: Zero build step; no new npm packages; `gh` CLI only for GitHub API

**Scale/Scope**: Single reviewer session; a few spec files and tens of diff lines per PR

## Constitution Check

| Principle | Status | Notes |
|-----------|--------|-------|
| I. GitHub as Source of Truth | ✅ PASS | Thread replies post to GitHub; Viewed is local-only and makes no GitHub state claim |
| II. Zero Build Step | ✅ PASS | All changes in `server.js` + `public/index.html` only |
| III. gh CLI as Auth and API Layer | ✅ PASS | Thread reply uses `gh api` with `--method POST`; no direct HTTP client |
| IV. Local-First, Single-User | ✅ PASS | Viewed state is in-memory only; no shared session |
| V. Simplicity and Minimal Surface Area | ✅ PASS | US1 adds one payload field; US2 adds one `gh api` call pattern; US3 adds one state map |

*Post-design re-check*: All gates pass.

## Project Structure

### Documentation (this feature)

```text
specs/002-review-ux-enhancements/
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── contracts/
│   └── api.md
└── tasks.md   ← /speckit-tasks output
```

### Source Code

```text
tools/pr-viewer/
├── server.js          ← add addedLines[] per spec file to PR-detail payload
└── public/
    └── index.html     ← all three UX changes land here
```
