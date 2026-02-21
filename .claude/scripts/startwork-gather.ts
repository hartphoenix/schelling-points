#!/usr/bin/env bun
/**
 * startwork-gather.ts
 *
 * Pre-digests project board + issue data for the /startwork workflow.
 * Outputs a compact JSON summary with candidates, active work, flags,
 * and pre-resolved dependency statuses.
 *
 * Usage: bun .claude/scripts/startwork-gather.ts
 */

import { $ } from "bun";

// ── Types ──────────────────────────────────────────────────────────

interface BoardItem {
  number: number | null;
  title: string;
  status: string;
  labels: string[];
  assignees: string[];
}

interface Issue {
  number: number;
  title: string;
  body: string;
  labels: { name: string }[];
  assignees: { login: string }[];
  state: string;
}

interface DepRef {
  type: "depends_on" | "blocks";
  issueNumber: number;
  resolved: boolean; // true if the referenced issue is closed
  title: string;
}

interface Flag {
  type: "dependency" | "decision" | "external" | "conflict" | "review";
  detail: string;
}

interface Candidate {
  number: number;
  title: string;
  status: string;
  labels: string[];
  assignees: string[];
  dependencies: DepRef[];
  flags: Flag[];
}

interface GatherOutput {
  timestamp: string;
  activeWork: {
    inProgress: BoardItem[];
    inReview: BoardItem[];
    openPRs: { number: number; title: string; branch: string; author: string; files: string[] }[];
  };
  candidates: Candidate[];
  staleTodos: string[];
  warnings: string[];
}

// ── Helpers ────────────────────────────────────────────────────────

function extractDeps(body: string): { dependsOn: number[]; blocks: number[] } {
  const dependsOn: number[] = [];
  const blocks: number[] = [];

  if (!body) return { dependsOn, blocks };

  // Match "Depends on #N" patterns (case-insensitive)
  for (const m of body.matchAll(/depends\s+on\s+#(\d+)/gi)) {
    dependsOn.push(parseInt(m[1], 10));
  }

  // Match "Blocks #N" patterns (case-insensitive)
  for (const m of body.matchAll(/blocks\s+#(\d+)/gi)) {
    blocks.push(parseInt(m[1], 10));
  }

  return { dependsOn, blocks };
}

function hasLabel(labels: string[] | { name: string }[], name: string): boolean {
  if (labels.length === 0) return false;
  if (typeof labels[0] === "string") {
    return (labels as string[]).includes(name);
  }
  return (labels as { name: string }[]).some((l) => l.name === name);
}

// ── Main ───────────────────────────────────────────────────────────

async function main() {
  const warnings: string[] = [];

  // 1. Fetch board items (compact, no bodies)
  let boardItems: BoardItem[] = [];
  try {
    const boardRaw =
      await $`gh project item-list 1 --owner thrialectics --format json --limit 200`.text();
    const board = JSON.parse(boardRaw);
    boardItems = board.items.map((i: any) => ({
      number: i.content?.number ?? null,
      title: i.title,
      status: i.status,
      labels: i.labels ?? [],
      assignees: i.assignees ?? [],
    }));
  } catch (e) {
    warnings.push("Board fetch failed: " + String(e));
  }

  // 2. Fetch all open issues (with bodies for dependency parsing)
  let openIssues: Issue[] = [];
  try {
    const issuesRaw =
      await $`gh issue list --state open --json number,title,body,labels,assignees,state --limit 200`.text();
    openIssues = JSON.parse(issuesRaw);
  } catch (e) {
    warnings.push("Issue list fetch failed: " + String(e));
  }

  // 3. Fetch all closed issues (just numbers + state, for dependency resolution)
  let closedIssueNumbers = new Set<number>();
  try {
    const closedRaw =
      await $`gh issue list --state closed --json number --limit 500`.text();
    const closed = JSON.parse(closedRaw);
    closedIssueNumbers = new Set(closed.map((i: any) => i.number));
  } catch (e) {
    warnings.push("Closed issue fetch failed — dependency resolution may be incomplete: " + String(e));
  }

  // 4. Fetch open PRs
  let openPRs: GatherOutput["activeWork"]["openPRs"] = [];
  try {
    const prRaw =
      await $`gh pr list --json number,title,headRefName,files,author`.text();
    const prs = JSON.parse(prRaw);
    openPRs = prs.map((pr: any) => ({
      number: pr.number,
      title: pr.title,
      branch: pr.headRefName,
      author: pr.author?.login ?? "unknown",
      files: (pr.files ?? []).map((f: any) => f.path),
    }));
  } catch (e) {
    warnings.push("PR fetch failed: " + String(e));
  }

  // 5. Check for stale agent todos
  const staleTodos: string[] = [];
  try {
    const glob = new Bun.Glob("*.md");
    const todoDir = ".claude/todos/agent";
    for await (const file of glob.scan(todoDir)) {
      const stat = await Bun.file(`${todoDir}/${file}`).stat();
      if (!stat) continue;
      const ageMs = Date.now() - stat.mtime.getTime();
      const ageHours = ageMs / (1000 * 60 * 60);
      if (ageHours > 24) {
        staleTodos.push(`${file} (${Math.round(ageHours)}h old)`);
      }
    }
  } catch {
    // no agent todos dir — fine
  }

  // ── Build lookup maps ────────────────────────────────────────────

  const openIssueMap = new Map(openIssues.map((i) => [i.number, i]));
  const boardStatusMap = new Map(
    boardItems.filter((i) => i.number !== null).map((i) => [i.number!, i])
  );

  // ── Classify board items ─────────────────────────────────────────

  const candidateStatuses = new Set(["Ready", "Backlog"]);
  const activeStatuses = new Set(["In progress", "In Progress", "In review", "In Review"]);

  const inProgress = boardItems.filter((i) =>
    i.status === "In progress" || i.status === "In Progress"
  );
  const inReview = boardItems.filter((i) =>
    i.status === "In review" || i.status === "In Review"
  );

  const candidateBoard = boardItems.filter((i) =>
    candidateStatuses.has(i.status) && i.number !== null
  );

  // ── Build candidates with flags ──────────────────────────────────

  const candidates: Candidate[] = candidateBoard.map((board) => {
    const issue = openIssueMap.get(board.number!);
    const body = issue?.body ?? "";
    const { dependsOn, blocks } = extractDeps(body);
    const labels = board.labels;

    // Resolve dependencies
    const dependencies: DepRef[] = dependsOn.map((depNum) => {
      const depIssue = openIssueMap.get(depNum);
      const resolved = !depIssue; // if not in open issues, it's resolved
      return {
        type: "depends_on" as const,
        issueNumber: depNum,
        resolved,
        title: depIssue?.title ?? `#${depNum} (closed)`,
      };
    });

    // Build flags
    const flags: Flag[] = [];

    // Unresolved dependencies
    for (const dep of dependencies) {
      if (!dep.resolved) {
        flags.push({
          type: "dependency",
          detail: `#${dep.issueNumber} (open) — ${dep.title}`,
        });
      }
    }

    // human-decision label = needs team decision
    if (hasLabel(labels, "human-decision")) {
      flags.push({
        type: "decision",
        detail: `#${board.number} is labeled human-decision`,
      });
    }

    // blocked label
    if (hasLabel(labels, "blocked")) {
      flags.push({
        type: "external",
        detail: `#${board.number} has blocked label`,
      });
    }

    return {
      number: board.number!,
      title: board.title,
      status: board.status,
      labels,
      assignees: board.assignees,
      dependencies,
      flags,
    };
  });

  // ── Output ───────────────────────────────────────────────────────

  const output: GatherOutput = {
    timestamp: new Date().toISOString(),
    activeWork: { inProgress, inReview, openPRs },
    candidates,
    staleTodos,
    warnings,
  };

  console.log(JSON.stringify(output, null, 2));
}

main().catch((e) => {
  console.error("startwork-gather failed:", e);
  process.exit(1);
});
