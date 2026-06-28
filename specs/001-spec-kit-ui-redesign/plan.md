# Implementation Plan: Spec-Kit UI Redesign

**Branch**: `001-spec-kit-ui-redesign` | **Date**: 2026-06-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-spec-kit-ui-redesign/spec.md`

## Summary

Extend the existing PR viewer (Express + single `public/index.html`, no build step) with:
a three-tab layout (Overview / Files & Spec / Review), a right-hand spec panel that
renders `spec.md` / `plan.md` / `tasks.md` as formatted markdown beside the diff, a
split/unified diff toggle, a light/dark theme toggle (both persisted), and a designed
confirm modal replacing `window.confirm()`. Two files change: `server.js` (one new
payload field) and `public/index.html` (layout, CSS tokens, all new UI).

## Technical Context

**Language/Version**: Node.js 18+ ESM (`"type":"module"`), vanilla JS (no transpile)

**Primary Dependencies**: Express 4.x (server); no frontend dependencies

**Storage**: localStorage (theme + diffMode preferences only); no database

**Testing**: Manual browser validation (no automated test suite)

**Target Platform**: Local macOS/Linux — single user, launched from a git repo directory

**Project Type**: Thin web UI over `gh` CLI — extend, not rewrite

**Performance Goals**: Tab switching < 100ms (pure DOM, no network); spec content fetched
on PR open alongside existing diff fetch

**Constraints**: Zero build step; all changes in `server.js` + `public/index.html`;
no new npm dependencies; `gh` CLI is the only GitHub API channel

**Scale/Scope**: Single user, one repo per running instance; ~5 spec files max per PR

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Principle | Status | Notes |
|-----------|--------|-------|
| I. GitHub as Source of Truth | ✅ PASS | Merge intentionally not wired; spec content read from GitHub at head ref via `gh api` |
| II. Zero Build Step | ✅ PASS | All changes land in existing files; no bundler or transpiler introduced |
| III. gh CLI as Auth and API Layer | ✅ PASS | Spec file content fetched via `gh api repos/{repo}/contents/{path}?ref={headRefOid}` |
| IV. Local-First, Single-User | ✅ PASS | localStorage for prefs only; no server-side session or shared state added |
| V. Simplicity and Minimal Surface Area | ✅ PASS | No new npm packages; markdown rendering is vanilla JS; split diff is a pure function over existing `parseDiff` output |

*Post-design re-check*: All gates pass. No principle violated.

## Project Structure

### Documentation (this feature)

```text
specs/001-spec-kit-ui-redesign/
├── plan.md              ← this file
├── research.md          ← Phase 0 output
├── data-model.md        ← Phase 1 output
├── quickstart.md        ← Phase 1 output
├── contracts/
│   └── api.md           ← updated server payload shape
└── tasks.md             ← /speckit-tasks output (not created here)
```

### Source Code (repository root)

```text
tools/pr-viewer/
├── server.js            ← add specFiles[] to GET /api/prs/:num response
└── public/
    └── index.html       ← all CSS tokens, layout, and JS changes
```

**Structure Decision**: Single project. Both files already exist; this is an extension
of the existing codebase, not a restructure.
