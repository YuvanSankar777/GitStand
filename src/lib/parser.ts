import type { Commit } from "./types";

const HEX = /^[0-9a-f]{7,40}$/i;

/** Strip decoration refs like "(HEAD -> main, origin/main)" from a message. */
function stripRefs(msg: string): string {
  return msg.replace(/^\(([^)]*)\)\s*/, "").trim();
}

/** Remove leading graph glyphs from `git log --graph` output: "* | ", "| * ", etc. */
function stripGraph(line: string): string {
  return line.replace(/^[\s*|\\/_.-]*(?=[0-9a-f]{7,}|commit\b)/i, "");
}

/**
 * Parse pasted `git log` output into structured commits.
 * Supports the two formats a developer will realistically paste:
 *   - `git log --oneline`  ->  "abc1234 message"
 *   - default `git log`     ->  "commit <hash>" / "Author:" / "Date:" / indented body
 * Also tolerates `--graph` glyphs and `--stat` file lines.
 */
export function parseGitLog(raw: string): Commit[] {
  const text = raw.trim();
  if (!text) return [];

  // Default/full format detection: presence of standalone "commit <hash>" lines.
  const hasFullBlocks = /^\s*[*|\\/ ]*commit\s+[0-9a-f]{7,40}/im.test(text);
  return hasFullBlocks ? parseFull(text) : parseOneline(text);
}

function parseOneline(text: string): Commit[] {
  const commits: Commit[] = [];
  for (const rawLine of text.split("\n")) {
    const line = stripGraph(rawLine).trim();
    if (!line) continue;
    const spaceIdx = line.indexOf(" ");
    if (spaceIdx === -1) continue;
    const hash = line.slice(0, spaceIdx);
    if (!HEX.test(hash)) continue;
    const message = stripRefs(line.slice(spaceIdx + 1));
    if (!message) continue;
    commits.push({ hash: hash.slice(0, 10), message, timestamp: null, author: null, files: [] });
  }
  return commits;
}

function parseFull(text: string): Commit[] {
  const commits: Commit[] = [];
  const lines = text.split("\n");
  let current: Commit | null = null;
  const bodyLines: string[] = [];

  const flush = () => {
    if (!current) return;
    const message = bodyLines.map((l) => l.trim()).filter(Boolean).join(" — ").trim();
    if (message) current.message = message;
    commits.push(current);
    bodyLines.length = 0;
  };

  for (const rawLine of lines) {
    const line = stripGraph(rawLine);
    const commitMatch = line.match(/^commit\s+([0-9a-f]{7,40})/i);
    if (commitMatch) {
      flush();
      current = { hash: commitMatch[1].slice(0, 10), message: "", timestamp: null, author: null, files: [] };
      continue;
    }
    if (!current) continue;

    const authorMatch = line.match(/^Author:\s*(.+?)\s*<[^>]*>/i);
    if (authorMatch) {
      current.author = authorMatch[1].trim();
      continue;
    }
    const dateMatch = line.match(/^Date:\s*(.+)$/i);
    if (dateMatch) {
      current.timestamp = dateMatch[1].trim();
      continue;
    }
    // --stat file line: " src/foo.ts | 12 +++---"
    const statMatch = rawLine.match(/^\s+(\S.*?)\s+\|\s+\d+/);
    if (statMatch && !/^\s{4}/.test(rawLine)) {
      current.files.push(statMatch[1].trim());
      continue;
    }
    // Indented commit body (4 spaces per git convention).
    if (/^\s{4}\S/.test(rawLine)) {
      bodyLines.push(rawLine);
    }
  }
  flush();
  return commits;
}
