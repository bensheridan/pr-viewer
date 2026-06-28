// Local PR review viewer — thin Express server over the `gh` CLI.
// Each user runs their own instance; `gh` provides auth and identity for free.

import express from "express";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import os from "node:os";
import { writeFile, unlink } from "node:fs/promises";

const execFileP = promisify(execFile);
const __dirname = dirname(fileURLToPath(import.meta.url));
const app = express();
app.use(express.json({ limit: "5mb" }));

const PORT = process.env.PORT || 4319;

// --- gh helpers -----------------------------------------------------------

// Run a gh command and return stdout. Never scrape human output — callers
// always pass --json or use `gh api`.
async function gh(args, { input } = {}) {
  try {
    const opts = { maxBuffer: 50 * 1024 * 1024 };
    if (input !== undefined) opts.input = input;
    const { stdout } = await execFileP("gh", args, opts);
    return stdout;
  } catch (err) {
    const msg = err.stderr || err.message || String(err);
    const e = new Error(msg.trim());
    e.gh = true;
    throw e;
  }
}

async function ghJson(args, opts) {
  const out = await gh(args, opts);
  return out.trim() ? JSON.parse(out) : null;
}

// Resolve the current repo (owner/name) once, used for raw gh api calls.
async function currentRepo() {
  const r = await ghJson([
    "repo", "view", "--json", "owner,name",
  ]);
  return `${r.owner.login}/${r.name}`;
}

// --- API routes -----------------------------------------------------------

// List open PRs in the current repo.
app.get("/api/prs", async (req, res) => {
  try {
    const state = req.query.state || "open";
    const prs = await ghJson([
      "pr", "list",
      "--state", state,
      "--limit", "50",
      "--json",
      "number,title,author,headRefName,baseRefName,updatedAt,isDraft,additions,deletions,changedFiles,reviewDecision",
    ]);
    res.json(prs || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PR detail: metadata + body + review threads + the diff.
app.get("/api/prs/:num", async (req, res) => {
  const num = req.params.num;
  try {
    const meta = await ghJson([
      "pr", "view", num,
      "--json",
      "number,title,body,author,headRefName,baseRefName,headRefOid,state,additions,deletions,changedFiles,reviewDecision,url",
    ]);
    const diff = await gh(["pr", "diff", num]);

    // Existing review comments (so reviewers see prior discussion inline).
    const repo = await currentRepo();
    let comments = [];
    try {
      comments = await ghJson([
        "api",
        `repos/${repo}/pulls/${num}/comments`,
        "--paginate",
      ]) || [];
    } catch {
      comments = [];
    }

    // Detect spec files in the diff and fetch their full content at head ref
    const specPaths = [];
    for (const ln of diff.split('\n')) {
      if (!ln.startsWith('+++ b/')) continue;
      const p = ln.slice(6);
      if (/(^|\/)spec\.md$/.test(p)) specPaths.push({ path: p, kind: 'spec' });
      else if (/(^|\/)plan\.md$/.test(p)) specPaths.push({ path: p, kind: 'plan' });
      else if (/(^|\/)tasks\.md$/.test(p)) specPaths.push({ path: p, kind: 'tasks' });
    }
    // Extract added line numbers per spec file from the unified diff
    function extractAddedLines(diffText, filePath) {
      const added = [];
      let inFile = false, newNo = 0;
      for (const ln of diffText.split('\n')) {
        if (ln.startsWith('+++ b/')) { inFile = ln.slice(6) === filePath; continue; }
        if (!inFile) continue;
        if (ln.startsWith('@@')) {
          const m = ln.match(/@@ -\d+(?:,\d+)? \+(\d+)(?:,\d+)? @@/);
          newNo = m ? +m[1] : 0; continue;
        }
        if (ln.startsWith('+')) { added.push(newNo); newNo++; }
        else if (!ln.startsWith('-')) newNo++;
      }
      return added;
    }

    const specFiles = (await Promise.allSettled(
      specPaths.map(async ({ path, kind }) => {
        const b64 = await gh([
          'api', `repos/${repo}/contents/${path}?ref=${meta.headRefOid}`, '--jq', '.content',
        ]);
        const markdown = Buffer.from(b64.replace(/\n/g, ''), 'base64').toString('utf8');
        const addedLines = extractAddedLines(diff, path);
        return { path, kind, markdown, addedLines };
      })
    )).flatMap(r => r.status === 'fulfilled' ? [r.value] : []);

    res.json({ meta, diff, comments, repo, specFiles });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Post a review with one or more inline comments.
// Uses the REVIEWS endpoint (comments array) — the direct /comments endpoint
// throws spurious 422s on multi-line ranges, so we avoid it entirely.
app.post("/api/prs/:num/review", async (req, res) => {
  const num = req.params.num;
  const { event = "COMMENT", body = "", comments = [], repo, commit_id } = req.body;

  // Whitelist event types; anything irreversible-ish (APPROVE / REQUEST_CHANGES)
  // is allowed but the UI gates it behind an explicit confirm.
  const allowed = ["COMMENT", "APPROVE", "REQUEST_CHANGES"];
  if (!allowed.includes(event)) {
    return res.status(400).json({ error: `Invalid event: ${event}` });
  }

  const payload = { event };
  if (body) payload.body = body;
  if (commit_id) payload.commit_id = commit_id;
  if (comments.length) {
    // Each comment: { path, line, side, start_line?, start_side?, body }
    payload.comments = comments.map((c) => {
      const out = { path: c.path, line: c.line, side: c.side || "RIGHT", body: c.body };
      if (c.start_line != null && c.start_line !== c.line) {
        out.start_line = c.start_line;
        out.start_side = c.start_side || out.side;
      }
      return out;
    });
  }

  // Write payload to a temp file and use --input (avoids shell-escaping issues
  // with multi-line markdown bodies and suggestion blocks).
  const tmp = join(os.tmpdir(), `pr-review-${num}-${Date.now()}.json`);
  try {
    await writeFile(tmp, JSON.stringify(payload));
    const out = await gh([
      "api",
      `repos/${repo}/pulls/${num}/reviews`,
      "--method", "POST",
      "--input", tmp,
    ]);
    res.json({ ok: true, result: out.trim() ? JSON.parse(out) : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    unlink(tmp).catch(() => {});
  }
});

// Reply to an existing inline review comment thread.
app.post("/api/prs/:num/comment/reply", async (req, res) => {
  const { comment_id, body, repo } = req.body;
  if (!body) return res.status(400).json({ error: "Empty reply" });
  const tmp = join(os.tmpdir(), `pr-reply-${comment_id}-${Date.now()}.json`);
  try {
    await writeFile(tmp, JSON.stringify({ body }));
    const out = await gh([
      "api",
      `repos/${repo}/pulls/comments/${comment_id}/replies`,
      "--method", "POST",
      "--input", tmp,
    ]);
    res.json({ ok: true, result: out.trim() ? JSON.parse(out) : null });
  } catch (err) {
    res.status(500).json({ error: err.message });
  } finally {
    unlink(tmp).catch(() => {});
  }
});

// Post a single plain PR-level comment (not inline).
app.post("/api/prs/:num/comment", async (req, res) => {
  const num = req.params.num;
  const { body } = req.body;
  if (!body) return res.status(400).json({ error: "Empty comment" });
  try {
    await gh(["pr", "comment", num, "--body", body]);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Serve the frontend.
app.get("/", async (_req, res) => {
  const html = await readFile(join(__dirname, "public", "index.html"), "utf8");
  res.type("html").send(html);
});

app.listen(PORT, () => {
  console.log(`PR viewer running at http://localhost:${PORT}`);
  console.log(`Make sure you've run \`gh auth login\` and are inside a repo,`);
  console.log(`or set GH_REPO / run from the repo directory.`);
});
