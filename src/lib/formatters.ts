import type { Standup, StandupFormat } from "./types";

/** Classic Slack-ready bullets: Yesterday / Today / Blockers. */
function toBullets(s: Standup): string {
  const section = (title: string, items: string[]) => {
    const body = items.length ? items.map((i) => `• ${i}`).join("\n") : "• —";
    return `*${title}*\n${body}`;
  };
  return [
    section("Yesterday", s.yesterday),
    section("Today", s.today),
    section("Blockers", s.blockers.length ? s.blockers : ["None 🎉"]),
  ].join("\n\n");
}

/** Changelog-style: flat list of shipped items, blockers as a footnote. */
function toChangelog(s: Standup): string {
  const lines = s.yesterday.map((i) => `- ${i}`);
  const out = ["### Changes", ...lines];
  if (s.blockers.length) {
    out.push("", "### Known issues", ...s.blockers.map((b) => `- ${b}`));
  }
  return out.join("\n");
}

/** One-paragraph exec summary — manager-ready, no jargon. */
function toExec(s: Standup): string {
  const did = s.yesterday.join("; ");
  const next = s.today.join("; ");
  const parts: string[] = [];
  if (did) parts.push(`Yesterday: ${did}.`);
  if (next) parts.push(`Today, focus shifts to ${next.toLowerCase()}.`);
  if (s.blockers.length) {
    parts.push(`⚠️ Blocked on: ${s.blockers.join("; ")}.`);
  } else {
    parts.push("No blockers.");
  }
  return parts.join(" ");
}

export function formatStandup(s: Standup, format: StandupFormat): string {
  switch (format) {
    case "changelog":
      return toChangelog(s);
    case "exec":
      return toExec(s);
    case "bullets":
    default:
      return toBullets(s);
  }
}
