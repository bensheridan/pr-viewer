<!--
SYNC IMPACT REPORT
==================
Version change: (unversioned template) → 1.0.0
Added sections:
  - Core Principles (I–V)
  - Technical Constraints
  - Development Workflow
  - Governance
Modified principles: N/A (initial population)
Removed sections: N/A
Templates reviewed:
  - .specify/templates/plan-template.md  ✅ compatible (Constitution Check section is generic)
  - .specify/templates/spec-template.md  ✅ compatible
  - .specify/templates/tasks-template.md ✅ compatible
Deferred TODOs: none
-->

# PR Viewer Constitution

## Core Principles

### I. GitHub as Source of Truth

GitHub is the canonical store for all repository data: commits, PR history,
review threads, merge decisions, and permissions. This app MUST NOT duplicate,
shadow, or cache GitHub state beyond what is required to serve a single page
request. Merging, branch management, and force-pushes MUST remain on
github.com. The app's scope is strictly: read diffs, post inline comments,
submit reviews.

### II. Zero Build Step

The project MUST be runnable with `node server.js` and a browser — no
transpilers, bundlers, compiled assets, or separate build commands. All server
code lives in `server.js`; all frontend code lives in `public/index.html`.
Adding a build pipeline requires explicit justification and team agreement
before any other work proceeds.

### III. gh CLI as Auth and API Layer

All GitHub API interactions MUST go through the `gh` CLI. Direct use of raw
HTTP clients with personal access tokens or OAuth flows is prohibited. Auth and
identity are fully delegated to `gh auth login`, which the user runs once. This
keeps credentials out of the app entirely and ensures the correct repo context
is resolved from the working directory.

### IV. Local-First, Single-User

Each reviewer runs their own instance from within their local repo checkout.
There is no multi-tenancy, no shared state, no cloud hosting, and no
persistent server-side session. Features that require a persistent backend
service or shared database are out of scope.

### V. Simplicity and Minimal Surface Area

The project MUST stay small. New routes, dependencies, or abstractions require
a concrete problem they solve — not anticipated future need. Three lines of
repeated code is acceptable; a premature helper is not. The "no build step"
and "two files" invariants are the strongest signal of project health.

## Technical Constraints

- **Runtime**: Node.js 18+ (LTS)
- **Dependencies**: Express (server routing); no frontend framework
- **Auth**: `gh` CLI (pre-authenticated by user)
- **GitHub API**: `gh api` subcommand; reviews endpoint (`/pulls/N/reviews`)
  for posting comments, not `/pulls/N/comments` (avoids 422 on multi-line ranges)
- **Binary files**: shown as no-row diffs (no special handling needed)
- **Merging**: intentionally out of scope — users do that on github.com

## Development Workflow

- Run from inside the target git repo so `gh` resolves the correct remote
- Test golden path manually in a browser before marking a feature done
- Confirm `gh` calls succeed and return expected JSON before wiring to the UI
- No automated test suite required; manual verification is the gate
- Commit after each coherent change; keep diffs reviewable

## Governance

This constitution supersedes all other documented practices for the PR Viewer
project. Any amendment MUST:

1. Update this file with a version bump (MAJOR/MINOR/PATCH per semver rules).
2. Update `LAST_AMENDED_DATE` to the date of the change.
3. Propagate material changes to `.specify/templates/` files as needed.
4. Be documented in the Sync Impact Report comment at the top of this file.

All feature plans and specs MUST include a Constitution Check confirming no
principle is violated (or explicitly justifying any necessary deviation).

**Version**: 1.0.0 | **Ratified**: 2026-06-28 | **Last Amended**: 2026-06-28
