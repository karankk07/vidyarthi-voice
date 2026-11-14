/**
 * Demo backend. Keeps everything in the browser (localStorage when available)
 * so the site can be tried without Supabase. Sample data only.
 */
import { Api, Comment, Issue, IssueUpdate, NewIssue, Status, User } from "./types";
import { isAllowedEmail } from "./util";

interface RawIssue extends Omit<Issue,
  "supportCount" | "supports7d" | "commentCount" | "confirmYes" | "confirmNo" |
  "isMine" | "supportedByMe" | "myConfirmation"> {
  author: string;
}
interface Store {
  issues: RawIssue[];
  supports: { issueId: string; user: string; at: string }[];
  updates: IssueUpdate[];
  comments: (Omit<Comment, "isMine"> & { author: string })[];
  confirmations: { issueId: string; user: string; fixed: boolean }[];
  reports: { issueId: string; user: string; reason: string }[];
  user: string | null;
}

const KEY = "vv-demo-v1";
export const DEMO_CODE = "123456";
const day = 86_400_000;
const ago = (d: number) => new Date(Date.now() - d * day).toISOString();
const uid = () => Math.random().toString(36).slice(2, 10);

function seed(): Store {
  const mk = (
    id: string, d: number, category: string, bodyId: string, title: string,
    details: string, suggestedFix: string, location: string,
    frequency: Issue["frequency"], status: Status, supports: number, firstResp?: number,
  ) => ({
    issue: {
      id, title, details, suggestedFix, category, location, frequency, bodyId, status,
      createdAt: ago(d), updatedAt: ago(firstResp ?? d),
      firstResponseAt: firstResp !== undefined ? ago(firstResp) : null, author: `seed${id}`,
    } as RawIssue,
    supports,
  });
  const rows = [
    mk("s1", 9, "sports", "sports-council",
      "One multi-purpose court is shared by every sport",
      "Basketball, volleyball, badminton and futsal all use the same multi-court. It is occupied at every peak hour, so many students cannot play at all.",
      "Fixed time slots by sport with a simple booking sheet now. Make the case for a second court in the next campus plan.",
      "Sports Complex", "Daily", "taken_up", 142, 6),
    mk("s2", 8, "sports", "gym-rep",
      "Gym is too small for the number of users",
      "Evenings are packed. There is a queue for benches and racks and many people skip workouts.",
      "Share hourly crowd data, extend opening hours, and plan an outdoor calisthenics zone.",
      "Gym", "Daily", "in_progress", 118, 3),
    mk("s3", 8, "sports", "sports-council",
      "Poor ventilation in the indoor sports stadium",
      "The hall gets hot and stuffy during games. It is uncomfortable and risky during intense play.",
      "Ask Estate for an exhaust and air-flow audit. Industrial fans as a quick fix.",
      "Sports Complex", "Daily", "new", 64),
    mk("s4", 12, "sports", "sports-council",
      "No proper cricket ground on campus",
      "Cricket is played in shared or makeshift spaces, which limits practice before inter-IIM events.",
      "Identify an open area for a basic pitch and nets. Explore sponsor or alumni funding.",
      "Campus-wide", "Weekly", "new", 51),
    mk("s5", 5, "it", "it-rep",
      "Wi-Fi drops in hostel rooms after 11 pm",
      "Connection keeps dropping late at night, right when people work on submissions.",
      "Check access point load at night and add access points on the worst floors.",
      "New Hostel", "Daily", "acknowledged", 97, 2),
    mk("s6", 15, "mess", "nh-mess",
      "Night mess menu has had no change for weeks",
      "Same items every night. Prices also feel high for the portion size.",
      "Rotate the menu weekly and publish prices on a board.",
      "Mess", "Daily", "resolved", 76, 4),
    mk("s7", 3, "library", "library-rep",
      "Library seats run out during exam week",
      "All seats are taken by 9 am in exam week. People study on the floor.",
      "Open one extra reading room during exams and add a seat-hold limit.",
      "Library", "Occasional", "new", 39),
    mk("s8", 20, "academics", "mba-reps",
      "Two quizzes scheduled on the same morning",
      "Two sections had back-to-back quizzes with no gap, which clashes with club deadlines.",
      "Publish a shared quiz calendar and avoid same-day clashes.",
      "Academic Blocks", "Occasional", "cant_fix", 28, 5),
    mk("s9", 2, "transport", "gs-has",
      "Late evening auto availability at the main gate",
      "After 9 pm it is hard to get an auto back from the city side of the gate.",
      "Talk to the auto stand for a fixed late-evening slot or a campus shuttle.",
      "Campus-wide", "Weekly", "new", 22),
    mk("s10", 11, "brand-media", "er-secys",
      "Fest and talk highlights rarely reach national media",
      "Good events happen but almost nothing shows up in news or on social media outside campus.",
      "Send a press note and photos within 24 hours of every major event.",
      "Campus-wide", "Monthly", "acknowledged", 33, 8),
  ];
  const supports: Store["supports"] = [];
  rows.forEach(({ issue, supports: n }) => {
    for (let k = 0; k < n; k++) {
      const recent = k < n * 0.35;
      supports.push({ issueId: issue.id, user: `u${k}`, at: recent ? ago(Math.random() * 6) : issue.createdAt });
    }
  });
  const up = (issueId: string, bodyId: string, status: Status, message: string, d: number): IssueUpdate =>
    ({ id: uid(), issueId, bodyId, status, message, createdAt: ago(d) });
  return {
    issues: rows.map((r) => r.issue),
    supports,
    updates: [
      up("s1", "sports-council", "acknowledged", "Seen. We are collecting slot usage data this week.", 6),
      up("s1", "sports-council", "taken_up", "Draft time-slot schedule shared with sport captains for feedback.", 2),
      up("s2", "gym-rep", "acknowledged", "Agreed, evenings are the problem.", 3),
      up("s2", "gym-rep", "in_progress", "Extended evening hours by one hour from Monday. Crowd tracker sheet coming next.", 1),
      up("s5", "it-rep", "acknowledged", "Raised with the Computer Centre. They will check the night logs.", 2),
      up("s6", "nh-mess", "acknowledged", "Talking to the vendor.", 11),
      up("s6", "nh-mess", "resolved", "New rotating weekly menu is live and prices are on the board.", 4),
      up("s8", "mba-reps", "cant_fix", "This term's schedule is locked by the PGP office. We have asked for a shared calendar from next term.", 15),
      up("s10", "er-secys", "acknowledged", "Fair point. We will try a press note for the next big event.", 3),
    ],
    comments: [
      { id: uid(), issueId: "s1", message: "Even a simple Google Sheet booking would help a lot.", createdAt: ago(5), bodyId: null, author: "u3" },
      { id: uid(), issueId: "s1", message: "Captains, please send your preferred slots by Friday.", createdAt: ago(2), bodyId: "sports-council", author: "rep" },
      { id: uid(), issueId: "s2", message: "Mornings are fine, it is only 6 to 9 pm.", createdAt: ago(2), bodyId: null, author: "u5" },
    ],
    confirmations: [
      ...Array.from({ length: 41 }, (_, k) => ({ issueId: "s6", user: `u${k}`, fixed: true })),
      ...Array.from({ length: 6 }, (_, k) => ({ issueId: "s6", user: `x${k}`, fixed: false })),
    ],
    reports: [],
    user: null,
  };
}

let mem: Store | null = null;
function load(): Store {
  if (mem) return mem;
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return (mem = JSON.parse(raw));
  } catch { /* storage unavailable */ }
  return (mem = seed());
}
function save() {
  try { localStorage.setItem(KEY, JSON.stringify(mem)); } catch { /* ignore */ }
}

const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());
const wait = (ms = 120) => new Promise((r) => setTimeout(r, ms));

function shape(s: Store, r: RawIssue): Issue {
  const sup = s.supports.filter((x) => x.issueId === r.id);
  const conf = s.confirmations.filter((x) => x.issueId === r.id);
  const mine = conf.find((c) => c.user === s.user);
  return {
    ...r,
    supportCount: sup.length,
    supports7d: sup.filter((x) => Date.now() - new Date(x.at).getTime() < 7 * day).length,
    commentCount: s.comments.filter((c) => c.issueId === r.id).length,
    confirmYes: conf.filter((c) => c.fixed).length,
    confirmNo: conf.filter((c) => !c.fixed).length,
    isMine: !!s.user && r.author === s.user,
    supportedByMe: !!s.user && sup.some((x) => x.user === s.user),
    myConfirmation: mine ? mine.fixed : null,
  };
}

function needUser(s: Store) {
  if (!s.user) throw new Error("Please sign in first.");
  return s.user;
}

export const demoApi: Api = {
  mode: "demo",
  async getUser(): Promise<User | null> {
    const s = load();
    // In the demo every signed-in user can try the responder console for any body.
    return s.user ? { email: s.user, responderFor: ["*"], isModerator: true } : null;
  },
  onAuthChange(cb) { listeners.add(cb); return () => listeners.delete(cb); },
  async sendCode(email) {
    await wait(300);
    if (!isAllowedEmail(email)) throw new Error("Use your IIM Calcutta email address.");
  },
  async verifyCode(email, code) {
    await wait(300);
    if (code.trim() !== DEMO_CODE) throw new Error("That code is not right. In the demo it is 123456.");
    load().user = email.trim().toLowerCase(); save(); emit();
  },
  async signOut() { load().user = null; save(); emit(); },
  async listIssues() {
    await wait();
    const s = load();
    return s.issues.filter((i) => s.reports.filter((r) => r.issueId === i.id).length < 5).map((i) => shape(s, i));
  },
  async getIssue(id) {
    await wait();
    const s = load();
    const r = s.issues.find((i) => i.id === id);
    if (!r) return null;
    return {
      issue: shape(s, r),
      updates: s.updates.filter((u) => u.issueId === id).sort((a, b) => a.createdAt.localeCompare(b.createdAt)),
      comments: s.comments.filter((c) => c.issueId === id)
        .sort((a, b) => a.createdAt.localeCompare(b.createdAt))
        .map(({ author, ...c }) => ({ ...c, isMine: author === s.user })),
    };
  },
  async createIssue(input: NewIssue) {
    await wait(250);
    const s = load(); const user = needUser(s);
    const now = new Date().toISOString();
    const id = uid();
    s.issues.push({ ...input, id, status: "new", createdAt: now, updatedAt: now, firstResponseAt: null, author: user });
    s.supports.push({ issueId: id, user, at: now });
    save();
    return id;
  },
  async toggleSupport(issueId) {
    const s = load(); const user = needUser(s);
    const k = s.supports.findIndex((x) => x.issueId === issueId && x.user === user);
    if (k >= 0) s.supports.splice(k, 1);
    else s.supports.push({ issueId, user, at: new Date().toISOString() });
    save();
  },
  async addComment(issueId, message, asBody) {
    const s = load(); const user = needUser(s);
    s.comments.push({ id: uid(), issueId, message, createdAt: new Date().toISOString(), bodyId: asBody, author: user });
    save();
  },
  async addUpdate(issueId, asBody, status, message, redirectTo) {
    const s = load(); needUser(s);
    const now = new Date().toISOString();
    s.updates.push({ id: uid(), issueId, bodyId: asBody, status, message, createdAt: now });
    const i = s.issues.find((x) => x.id === issueId)!;
    i.status = status; i.updatedAt = now;
    if (status === "redirected" && redirectTo) i.bodyId = redirectTo;
    if (!i.firstResponseAt) i.firstResponseAt = now;
    save();
  },
  async confirmFix(issueId, fixed) {
    const s = load(); const user = needUser(s);
    s.confirmations = s.confirmations.filter((c) => !(c.issueId === issueId && c.user === user));
    s.confirmations.push({ issueId, user, fixed });
    save();
  },
  async report(issueId, reason) {
    const s = load(); const user = needUser(s);
    if (!s.reports.some((r) => r.issueId === issueId && r.user === user)) s.reports.push({ issueId, user, reason });
    save();
  },
};

export function resetDemo() {
  mem = seed(); save(); emit();
}
