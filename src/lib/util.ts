import dir from "./directory.json";
import { CLOSED, Issue } from "./types";

export const ALLOWED_DOMAIN: string =
  (import.meta.env.VITE_ALLOWED_DOMAIN as string | undefined) || "email.iimcal.ac.in";

export const NO_RESPONSE_DAYS = 7;

export type Body = { id: string; name: string; group: string; email?: string };
export type Category = { id: string; name: string; icon: string; defaultBody: string };

export const BODIES: Body[] = dir.bodies;
export const GROUPS = dir.groups;
export const CATEGORIES: Category[] = dir.categories;
export const LOCATIONS: string[] = dir.locations;

const bodyMap = new Map(BODIES.map((b) => [b.id, b]));
const catMap = new Map(CATEGORIES.map((c) => [c.id, c]));

export const bodyName = (id: string | null | undefined) =>
  (id && bodyMap.get(id)?.name) || "Unassigned";
export const category = (id: string) =>
  catMap.get(id) || { id, name: id, icon: "💬", defaultBody: "president" };

export function isAllowedEmail(email: string) {
  const e = email.trim().toLowerCase();
  return /^[^\s@]+@[^\s@]+$/.test(e) && e.endsWith("@" + ALLOWED_DOMAIN);
}

export function daysSince(iso: string) {
  return (Date.now() - new Date(iso).getTime()) / 86_400_000;
}

export function timeAgo(iso: string) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return "just now";
  const m = s / 60;
  if (m < 60) return `${Math.floor(m)}m ago`;
  const h = m / 60;
  if (h < 24) return `${Math.floor(h)}h ago`;
  const d = h / 24;
  if (d < 30) return `${Math.floor(d)}d ago`;
  return new Date(iso).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function fmtDate(iso: string) {
  return new Date(iso).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

/** True when an issue has had no response from the tagged body for too long. */
export function isOverdue(i: Issue) {
  return i.status === "new" && daysSince(i.createdAt) > NO_RESPONSE_DAYS;
}

export const isClosed = (i: Issue) => CLOSED.includes(i.status);

/** Ranking used by the "Trending" sort: recent support counts more. */
export function trendScore(i: Issue) {
  const age = Math.max(daysSince(i.createdAt), 0.5);
  return (i.supports7d * 3 + i.supportCount) / Math.pow(age + 2, 0.8);
}

const STOP = new Set(
  "a an the is are was were be to of in on for and or but with at by from it this that there no not very too our we i my me so as can cant can't do does all any".split(
    " ",
  ),
);

function tokens(s: string) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 2 && !STOP.has(w))
    .map((w) => w.replace(/(ing|ed|es|s)$/, ""));
}

/** Finds existing open issues that look like the text being typed. */
export function findSimilar(text: string, issues: Issue[], limit = 3) {
  const q = new Set(tokens(text));
  if (q.size < 2) return [];
  return issues
    .filter((i) => !isClosed(i))
    .map((i) => {
      const t = new Set(tokens(i.title + " " + i.details));
      let hit = 0;
      q.forEach((w) => t.has(w) && hit++);
      return { issue: i, score: hit / q.size };
    })
    .filter((x) => x.score >= 0.34)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((x) => x.issue);
}

export interface Scorecard {
  bodyId: string;
  tagged: number;
  acknowledged: number;
  resolved: number;
  overdue: number;
  medianDaysToRespond: number | null;
}

export function buildScorecards(issues: Issue[]): Scorecard[] {
  const by = new Map<string, Issue[]>();
  issues.forEach((i) => by.set(i.bodyId, [...(by.get(i.bodyId) || []), i]));
  return [...by.entries()]
    .map(([bodyId, list]) => {
      const times = list
        .filter((i) => i.firstResponseAt)
        .map(
          (i) =>
            (new Date(i.firstResponseAt!).getTime() - new Date(i.createdAt).getTime()) /
            86_400_000,
        )
        .sort((a, b) => a - b);
      const mid = times.length
        ? times.length % 2
          ? times[(times.length - 1) / 2]
          : (times[times.length / 2 - 1] + times[times.length / 2]) / 2
        : null;
      return {
        bodyId,
        tagged: list.length,
        acknowledged: list.filter((i) => i.status !== "new").length,
        resolved: list.filter((i) => i.status === "resolved").length,
        overdue: list.filter(isOverdue).length,
        medianDaysToRespond: mid,
      };
    })
    .sort((a, b) => b.tagged - a.tagged);
}

export const pct = (n: number, d: number) => (d ? Math.round((n / d) * 100) : 0);
