import type { Commit, BlockerSignal } from "./types";

/** Phrases in a commit message that hint the developer is stuck. */
const BLOCKER_KEYWORDS = [
  "wip",
  "revert",
  "fix broken",
  "still failing",
  "still broken",
  "not working",
  "doesn't work",
  "does not work",
  "todo",
  "fixme",
  "hack",
  "temporarily",
  "workaround",
  "stuck",
  "blocked",
  "debugging",
  "try again",
  "retry",
  "give up",
];

/**
 * Heuristic blocker detection over parsed commits. Two signals:
 *  1. Keyword hits in the message (WIP / revert / still failing / ...).
 *  2. The same file touched 3+ times — thrashing on one spot.
 * Returns one signal per commit hit plus synthetic "repeated file" signals.
 */
export function detectBlockers(commits: Commit[]): BlockerSignal[] {
  const signals: BlockerSignal[] = [];

  for (const commit of commits) {
    const lower = commit.message.toLowerCase();
    for (const kw of BLOCKER_KEYWORDS) {
      if (lower.includes(kw)) {
        signals.push({ keyword: kw, hash: commit.hash, message: commit.message });
        break; // one keyword signal per commit is enough
      }
    }
  }

  // Repeated touches to the same file across commits.
  const fileCounts = new Map<string, number>();
  for (const commit of commits) {
    for (const file of commit.files) {
      fileCounts.set(file, (fileCounts.get(file) ?? 0) + 1);
    }
  }
  for (const [file, count] of fileCounts) {
    if (count >= 3) {
      signals.push({
        keyword: "repeated file",
        hash: "",
        message: `${file} touched in ${count} commits — possible thrashing`,
      });
    }
  }

  return signals;
}

export function hasBlockerSignals(commits: Commit[]): boolean {
  return detectBlockers(commits).length > 0;
}
