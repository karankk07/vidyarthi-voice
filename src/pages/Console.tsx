import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { Issue, STATUS_LABEL, Status } from "../lib/types";
import { BODIES, GROUPS, bodyName, isOverdue, timeAgo } from "../lib/util";
import { Empty, OverduePill, StatusPill } from "../components";
import { useApp } from "../store";

const NEXT: Status[] = ["acknowledged", "taken_up", "in_progress", "resolved", "cant_fix", "redirected"];
const TEMPLATES: Partial<Record<Status, string>> = {
  acknowledged: "Thanks for raising this. We have seen it and are looking into it.",
  taken_up: "We are taking this up. Next step: ",
  in_progress: "Update: ",
  resolved: "This is now fixed. What changed: ",
  cant_fix: "We cannot fix this right now because ",
  redirected: "This sits with another body, so we are passing it on.",
};

export function RespondForm({ issue, asBody, onDone }: { issue: Issue; asBody: string; onDone: () => void }) {
  const { toast } = useApp();
  const firstValid = NEXT.find((s) => s !== issue.status) || "acknowledged";
  const [status, setStatus] = useState<Status>(firstValid);
  const [msg, setMsg] = useState(TEMPLATES[firstValid] || "");
  const [to, setTo] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit() {
    if (msg.trim().length < 2) return toast("Add a short message for students.");
    if (status === "redirected" && !to) return toast("Pick who should own it next.");
    setBusy(true);
    try {
      await api.addUpdate(issue.id, asBody, status, msg.trim(), status === "redirected" ? to : undefined);
      toast(`Marked ${STATUS_LABEL[status]}. Students can see it now.`);
      onDone();
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  }

  return (
    <div className="stack" style={{ ["--gap" as string]: "12px" }}>
      <div className="chips">
        {NEXT.map((s) => (
          <button key={s} type="button" className={`chip ${status === s ? "on" : ""}`}
            onClick={() => { setStatus(s); setMsg(TEMPLATES[s] || ""); }}>{STATUS_LABEL[s]}</button>
        ))}
      </div>
      {status === "redirected" && (
        <select className="input" value={to} onChange={(e) => setTo(e.target.value)}>
          <option value="">Pass to...</option>
          {GROUPS.map((g) => (
            <optgroup key={g.id} label={g.name}>
              {BODIES.filter((b) => b.group === g.id && b.id !== issue.bodyId).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </optgroup>
          ))}
        </select>
      )}
      <textarea className="textarea" style={{ minHeight: 90 }} maxLength={1500} value={msg} onChange={(e) => setMsg(e.target.value)} />
      <div className="row wrap-row">
        <button className="btn btn-dark" disabled={busy} onClick={submit}>{busy ? "Posting..." : "Post public update"}</button>
        <span className="faint">Posted as {bodyName(asBody)}. Visible to everyone.</span>
      </div>
    </div>
  );
}

type Tab = "action" | "motion" | "closed";

export default function Console() {
  const { user, issues, refresh } = useApp();
  const all = user?.responderFor.includes("*");
  const mine = useMemo(() => (all ? BODIES.map((b) => b.id) : user?.responderFor || []), [all, user]);
  const [body, setBody] = useState<string>(() => {
    if (!all) return mine[0] || "";
    // In the demo, start with the busiest body.
    const counts = new Map<string, number>();
    issues.forEach((i) => counts.set(i.bodyId, (counts.get(i.bodyId) || 0) + 1));
    return [...counts.entries()].sort((a, b) => b[1] - a[1])[0]?.[0] || "sports-council";
  });
  const [tab, setTab] = useState<Tab>("action");
  const [open, setOpen] = useState<string | null>(null);

  if (!user) return <div className="wrap" style={{ marginTop: 24 }}><Empty icon="✅" title="Sign in to respond"><a className="btn btn-primary" style={{ marginTop: 14 }} href="#/login?next=%2Fconsole">Sign in</a></Empty></div>;
  if (!mine.length) return <div className="wrap" style={{ marginTop: 24 }}><Empty icon="✅" title="You are not a verified responder yet">Council members and club leads are added by the moderators. Ask the President's office to verify your role email.</Empty></div>;

  const forBody = issues.filter((i) => i.bodyId === body);
  const groups: Record<Tab, Issue[]> = {
    action: forBody.filter((i) => i.status === "new" || i.status === "redirected"),
    motion: forBody.filter((i) => ["acknowledged", "taken_up", "in_progress"].includes(i.status)),
    closed: forBody.filter((i) => i.status === "resolved" || i.status === "cant_fix"),
  };
  const list = [...groups[tab]].sort((a, b) => Number(isOverdue(b)) - Number(isOverdue(a)) || b.supportCount - a.supportCount);

  return (
    <div className="wrap" style={{ maxWidth: 860 }}>
      <div className="page-title">
        <span className="eyebrow">Responder console</span>
        <h2 style={{ marginTop: 6 }}>Respond to students</h2>
        <p className="muted" style={{ marginTop: 8 }}>Every update you post shows on the issue and counts on the public scorecard. Overdue items are shown first.</p>
      </div>

      <div className="toolbar">
        <select className="select" value={body} onChange={(e) => { setBody(e.target.value); setOpen(null); }} aria-label="Responding for">
          {mine.map((b) => <option key={b} value={b}>{bodyName(b)}</option>)}
        </select>
        {all && <span className="faint">Demo: you can act as any body.</span>}
      </div>

      <div className="seg" role="group" style={{ marginBottom: 14 }}>
        <button className={tab === "action" ? "on" : ""} onClick={() => setTab("action")}>Needs action ({groups.action.length})</button>
        <button className={tab === "motion" ? "on" : ""} onClick={() => setTab("motion")}>In motion ({groups.motion.length})</button>
        <button className={tab === "closed" ? "on" : ""} onClick={() => setTab("closed")}>Closed ({groups.closed.length})</button>
      </div>

      {list.length === 0 ? <Empty icon="🎉" title="Nothing here">No issues in this list for {bodyName(body)}.</Empty> : (
        <div className="list">
          {list.map((i) => (
            <div key={i.id} className="card console-item stack" style={{ ["--gap" as string]: "10px" }}>
              <div className="row wrap-row" style={{ gap: 8 }}>
                <StatusPill status={i.status} /><OverduePill issue={i} />
                <span className="faint">▲ {i.supportCount} · raised {timeAgo(i.createdAt)}</span>
              </div>
              <a href={`#/issue/${i.id}`}><h3>{i.title}</h3></a>
              <p className="muted" style={{ fontSize: ".92rem" }}>{i.details}</p>
              {open === i.id
                ? <RespondForm issue={i} asBody={body} onDone={() => { setOpen(null); refresh(); }} />
                : <div><button className="btn btn-primary btn-sm" onClick={() => setOpen(i.id)}>Post an update</button></div>}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
