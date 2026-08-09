export type Commit = {
  hash: string;
  message: string; // subject line only — used for display + blocker heuristics
  body: string; // remaining commit body, if any — passed to the LLM for richer summaries
  timestamp: string | null;
  author: string | null;
  files: string[];
};

export type BlockerSignal = {
  keyword: string;
  hash: string;
  message: string;
};

export type Standup = {
  yesterday: string[];
  today: string[];
  blockers: string[];
};

export type StandupFormat = "bullets" | "changelog" | "exec";

export const FORMAT_LABELS: Record<StandupFormat, string> = {
  bullets: "Bullets",
  changelog: "Changelog",
  exec: "Exec summary",
};
