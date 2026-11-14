import { ReactNode, useEffect, useState } from "react";
import { api } from "./lib/api";
import { Issue, STATUS_LABEL, STATUS_ORDER, Status } from "./lib/types";
import { bodyName, category, isOverdue, timeAgo, NO_RESPONSE_DAYS } from "./lib/util";
import { useApp } from "./store";

export function StatusPill({ status }: { status: Status }) {
  return <span className={`pill st-${status}`}>{STATUS_LABEL[status]}</span>;
}

export function OverduePill({ issue }: { issue: Issue }) {
  if (!isOverdue(issue)) return null;
  return (
    <span className="pill overdue" title={`No response for over ${NO_RESPONSE_DAYS} days`}>
      No response {Math.floor((Date.now() - new Date(issue.createdAt).getTime()) / 86_400_000)}d
    </span>
  );
}

/** Support button. Optimistic, so it feels instant. */
export function SupportButton({ issue, large, onChange }: { issue: Issue; large?: boolean; onChange?: () => void }) {
  const { requireLogin, patchIssue, toast } = useApp();
  const [busy, setBusy] = useState(false);
  const [pop, setPop] = useState(0);
  async function click(e: React.MouseEvent) {
    e.preventDefault();
    e.stopPropagation();
    if (!requireLogin(`/issue/${issue.id}`) || busy) return;
    const on = !issue.supportedByMe;
    const flip = (i: Issue) => ({
      ...i,
      supportedByMe: on,
      supportCount: i.supportCount + (on ? 1 : -1),
      supports7d: i.supports7d + (on ? 1 : -1),
    });
    patchIssue(issue.id, flip);
    if (on) setPop((n) => n + 1);
    setBusy(true);
    try {
      await api.toggleSupport(issue.id);
      toast(on ? "Supported. Your voice is counted." : "Support removed.");
      onChange?.();
    } catch (err) {
      patchIssue(issue.id, (i) => ({ ...i, supportedByMe: !on, supportCount: i.supportCount + (on ? -1 : 1) }));
      toast((err as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const on = issue.supportedByMe;
  const label = on ? "Supported" : large ? "I face this too" : "Support";
  return (
    <button
      className={`support ${large ? "support-lg" : ""} ${on ? "on" : ""}`}
      onClick={click}
      aria-pressed={on}
      title={on ? "Click to remove your support" : "Click if you face this too"}
      aria-label={`${on ? "Remove support" : "Support this issue"}. ${issue.supportCount} supporters`}
    >
      <span className="support-icon" aria-hidden>{on ? "✓" : "▲"}</span>
      <span className="support-count" key={issue.supportCount}>{issue.supportCount}</span>
      <span className="support-label">{label}</span>
      {pop > 0 && <span className="support-pop" key={pop} aria-hidden>+1</span>}
    </button>
  );
}

export function IssueCard({ issue }: { issue: Issue }) {
  const c = category(issue.category);
  return (
    <a className="card issue" href={`#/issue/${issue.id}`}>
      <SupportButton issue={issue} />
      <div>
        <div className="row wrap-row" style={{ gap: 8 }}>
          <StatusPill status={issue.status} />
          <OverduePill issue={issue} />
          <span className="pill cat">{c.icon} {c.name}</span>
        </div>
        <h3>{issue.title}</h3>
        <p className="snippet">{issue.details}</p>
        <div className="meta">
          <span>Tagged <span className="tag">{bodyName(issue.bodyId)}</span></span>
          <span>{issue.location}</span>
          <span>💬 {issue.commentCount}</span>
          <span>Raised {timeAgo(issue.createdAt)}</span>
          {issue.isMine && <span className="tag">· Raised by you</span>}
        </div>
      </div>
    </a>
  );
}

export function Progress({ status }: { status: Status }) {
  const idx = STATUS_ORDER.indexOf(status);
  const closed = status === "cant_fix";
  return (
    <div>
      <div className="progress" aria-hidden>
        {STATUS_ORDER.map((s, k) => (
          <div key={s} className={idx >= k || (closed && k === 0) ? "done" : ""} />
        ))}
      </div>
      <div className="progress-labels">
        {STATUS_ORDER.map((s) => <span key={s}>{STATUS_LABEL[s]}</span>)}
      </div>
    </div>
  );
}

export function Empty({ icon, title, children }: { icon: string; title: string; children?: ReactNode }) {
  return (
    <div className="card empty">
      <div className="big">{icon}</div>
      <h3>{title}</h3>
      {children && <div className="muted" style={{ marginTop: 8 }}>{children}</div>}
    </div>
  );
}

export function Skeletons({ n = 4 }: { n?: number }) {
  return <div className="list">{Array.from({ length: n }, (_, k) => <div key={k} className="skeleton" />)}</div>;
}

/** Scrambles digits so signed-out visitors see "live" numbers without real data. */
export function MorphNumber({ digits = 3, suffix = "" }: { digits?: number; suffix?: string }) {
  const rand = () => Array.from({ length: digits }, (_, k) => (k === 0 ? 1 + Math.floor(Math.random() * 9) : Math.floor(Math.random() * 10))).join("");
  const [v, setV] = useState(rand);
  useEffect(() => {
    if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) return;
    const t = window.setInterval(() => setV(rand()), 140);
    return () => window.clearInterval(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return <span className="morph" aria-hidden>{v}{suffix}</span>;
}

const TEASERS = [
  { cat: "🍛 Mess & Food", title: "Night mess ████████ every ████", n: 2 },
  { cat: "📶 Wi-Fi & IT", title: "Wi-Fi ██████ in ████ after ██ pm", n: 3 },
  { cat: "🏸 Sports & Fitness", title: "████ is too ██████ in the evenings", n: 3 },
  { cat: "📖 Library", title: "███████ seats run out ██████ exams", n: 2 },
];

/** Shown to signed-out visitors in live mode: a blurred, animated preview that invites sign-in. */
export function LockedTeaser({ next, compact }: { next: string; compact?: boolean }) {
  const href = `#/login?next=${encodeURIComponent(next)}`;
  return (
    <div className="teaser">
      {!compact && (
        <div className="stats teaser-stats">
          <div className="card stat"><b><MorphNumber digits={2} /></b><span>Issues raised</span></div>
          <div className="card stat"><b><MorphNumber digits={3} /></b><span>Supports given</span></div>
          <div className="card stat"><b><MorphNumber digits={2} suffix="%" /></b><span>Got a response</span></div>
          <div className="card stat"><b><MorphNumber digits={1} /></b><span>Resolved</span></div>
        </div>
      )}
      <p className="teaser-note">🔒 Live numbers and issues are hidden until you sign in</p>
      <div className="teaser-board">
        <div className="list teaser-list" aria-hidden>
          {TEASERS.map((t, k) => (
            <div key={k} className="card issue teaser-card">
              <div className="support"><span className="support-icon">▲</span><span className="support-count"><MorphNumber digits={t.n} /></span><span className="support-label">Support</span></div>
              <div>
                <div className="row wrap-row" style={{ gap: 8 }}>
                  <span className="pill st-new">New</span>
                  <span className="pill cat">{t.cat}</span>
                </div>
                <h3>{t.title}</h3>
                <p className="snippet">███████ ████ ██████████ ███ ████████ ████ ██ ██████ ████████ ████.</p>
              </div>
            </div>
          ))}
        </div>
        <div className="teaser-overlay">
          <div className="teaser-cta card">
            <div className="lock">🔒</div>
            <h3>Live issues from your batch are waiting</h3>
            <p className="muted">Sign in with your IIMC email to see what students are raising, add your support, and track responses.</p>
            <a className="btn btn-primary btn-lg" href={href}>Sign in to see live board</a>
            <span className="faint">Takes 30 seconds. Your name is never shown.</span>
          </div>
        </div>
      </div>
    </div>
  );
}

/** Kept for pages that only need the call to action. */
export function SignInWall({ next }: { next: string }) {
  return <LockedTeaser next={next} compact />;
}

export function Modal({ children, onClose }: { children: ReactNode; onClose: () => void }) {
  return (
    <div className="modal-back" onClick={onClose}>
      <div className="card pad modal" onClick={(e) => e.stopPropagation()} role="dialog" aria-modal>
        {children}
      </div>
    </div>
  );
}
