import { ReactNode, useState } from "react";
import { api } from "./lib/api";
import { Issue, STATUS_LABEL, STATUS_ORDER, Status } from "./lib/types";
import { bodyName, category, isOverdue, timeAgo, NO_RESPONSE_DAYS } from "./lib/util";
import { go, useApp } from "./store";

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
  return (
    <button
      className={`vote ${large ? "vote-lg" : ""} ${issue.supportedByMe ? "on" : ""}`}
      onClick={click}
      aria-pressed={issue.supportedByMe}
      aria-label={`${issue.supportedByMe ? "Remove support" : "Support"}: ${issue.supportCount} supporters`}
    >
      <span className="arrow">▲</span>
      <b>{issue.supportCount}</b>
      <small>{issue.supportedByMe ? "Supported" : "Support"}</small>
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

/** Live mode keeps everything behind login. Shown in place of data to signed-out visitors. */
export function SignInWall({ next }: { next: string }) {
  return (
    <Empty icon="🔒" title="Sign in to see the board">
      <p>Vidyarthi Voice is only for the IIM Calcutta community.</p>
      <button className="btn btn-primary" style={{ marginTop: 16 }} onClick={() => go(`/login?next=${encodeURIComponent(next)}`)}>
        Sign in with IIMC email
      </button>
    </Empty>
  );
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
