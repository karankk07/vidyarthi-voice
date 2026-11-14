import { useCallback, useEffect, useState } from "react";
import { api } from "../lib/api";
import { IssueDetail, STATUS_LABEL } from "../lib/types";
import { bodyName, category, fmtDate, pct, timeAgo } from "../lib/util";
import { Empty, Modal, OverduePill, Progress, SignInWall, StatusPill, SupportButton } from "../components";
import { useApp } from "../store";
import { RespondForm } from "./Console";

export default function IssuePage({ id }: { id: string }) {
  const { user, refresh, issues, toast, requireLogin } = useApp();
  const [d, setD] = useState<IssueDetail | null | undefined>(undefined);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [reporting, setReporting] = useState(false);

  const load = useCallback(async () => {
    try { setD(await api.getIssue(id)); } catch { setD(null); }
  }, [id]);
  useEffect(() => { load(); }, [load, user]);

  // Keep the support count in sync with the board after an optimistic toggle.
  const live = issues.find((i) => i.id === id);
  const issue = d?.issue && live ? { ...d.issue, ...live } : d?.issue;

  if (api.mode === "live" && !user) return <div className="wrap" style={{ marginTop: 24 }}><SignInWall next={`/issue/${id}`} /></div>;
  if (d === undefined) return <div className="wrap"><div className="skeleton" style={{ marginTop: 24, height: 260 }} /></div>;
  if (!d || !issue) return <div className="wrap" style={{ marginTop: 24 }}><Empty icon="🔍" title="Issue not found">It may have been removed after review.</Empty></div>;

  const c = category(issue.category);
  const canRespond = !!user && (user.responderFor.includes("*") || user.responderFor.includes(issue.bodyId) || user.isModerator);
  const responderBody = user?.responderFor.includes(issue.bodyId) || user?.responderFor.includes("*") ? issue.bodyId : null;
  const firstResponseDays = issue.firstResponseAt
    ? Math.max(0, Math.round((new Date(issue.firstResponseAt).getTime() - new Date(issue.createdAt).getTime()) / 86_400_000))
    : null;

  async function postComment(asBody: string | null) {
    if (!requireLogin(`/issue/${id}`)) return;
    if (comment.trim().length < 2) return;
    setBusy(true);
    try {
      await api.addComment(id, comment.trim(), asBody);
      setComment("");
      await load(); refresh();
    } catch (e) { toast((e as Error).message); } finally { setBusy(false); }
  }

  async function confirm(fixed: boolean) {
    if (!requireLogin(`/issue/${id}`)) return;
    try { await api.confirmFix(id, fixed); toast("Thanks. Your confirmation is counted."); await load(); refresh(); }
    catch (e) { toast((e as Error).message); }
  }

  const totalConfirm = issue.confirmYes + issue.confirmNo;

  return (
    <div className="wrap">
      <a className="back" href="#/board">← Back to board</a>
      <div className="detail">
        <div className="stack">
          <article className="card pad stack">
            <div className="row wrap-row" style={{ gap: 8 }}>
              <StatusPill status={issue.status} />
              <OverduePill issue={issue} />
              <span className="pill cat">{c.icon} {c.name}</span>
            </div>
            <h1 style={{ fontSize: "clamp(1.6rem, 4.5vw, 2.3rem)" }}>{issue.title}</h1>
            <p style={{ whiteSpace: "pre-wrap" }}>{issue.details}</p>
            {issue.suggestedFix && (
              <div className="fix"><span className="eyebrow">Suggested fix</span><p>{issue.suggestedFix}</p></div>
            )}
            <div className="row wrap-row">
              <SupportButton issue={issue} large />
              <span className="muted" style={{ fontSize: ".92rem" }}>
                {issue.supportedByMe ? "You support this issue." : "Share this problem? Add your support."}
              </span>
            </div>
          </article>

          {issue.status === "resolved" && (
            <div className="confirm stack" style={{ ["--gap" as string]: "10px" }}>
              <h3>Marked resolved. Is it actually fixed?</h3>
              <p className="muted" style={{ fontSize: ".92rem" }}>
                A fix counts once students confirm it.
                {totalConfirm > 0 && <> {pct(issue.confirmYes, totalConfirm)}% of {totalConfirm} students say yes.</>}
              </p>
              <div className="row">
                <button className={`btn btn-sm ${issue.myConfirmation === true ? "btn-dark" : "btn-ghost"}`} onClick={() => confirm(true)}>👍 Yes, fixed</button>
                <button className={`btn btn-sm ${issue.myConfirmation === false ? "btn-dark" : "btn-ghost"}`} onClick={() => confirm(false)}>👎 Not really</button>
              </div>
            </div>
          )}

          <section className="card pad stack">
            <div className="row"><h3>Progress</h3><span className="spacer" /><span className="faint">Owner: {bodyName(issue.bodyId)}</span></div>
            <Progress status={issue.status} />
            <div className="timeline" style={{ marginTop: 18 }}>
              <div className="tl first">
                <div className="who-line"><b>A student</b> raised this · {fmtDate(issue.createdAt)}</div>
              </div>
              {d.updates.map((u) => (
                <div key={u.id} className={`tl ${u.status === "resolved" ? "st-resolved-dot" : ""}`}>
                  <div className="who-line">
                    <b>{bodyName(u.bodyId)}</b> marked <StatusPill status={u.status} /> · {timeAgo(u.createdAt)}
                  </div>
                  <p>{u.message}</p>
                </div>
              ))}
              {d.updates.length === 0 && (
                <div className="tl"><div className="who-line">Waiting for <b>{bodyName(issue.bodyId)}</b> to respond.</div></div>
              )}
            </div>
          </section>

          {canRespond && (
            <section className="card pad stack" style={{ borderColor: "var(--navy-3)" }}>
              <h3>Respond as {responderBody ? bodyName(responderBody) : "moderator"}</h3>
              <RespondForm issue={issue} asBody={responderBody || issue.bodyId} onDone={() => { load(); refresh(); }} />
            </section>
          )}

          <section className="card pad">
            <h3 style={{ marginBottom: 6 }}>Discussion ({d.comments.length})</h3>
            {d.comments.length === 0 && <p className="faint" style={{ padding: "10px 0" }}>No comments yet. Add context that helps the owner act.</p>}
            {d.comments.map((cm) => (
              <div key={cm.id} className="comment">
                <div className="who-line">
                  {cm.bodyId ? <span className="responder-badge">{bodyName(cm.bodyId)}</span> : <b>{cm.isMine ? "You" : "A student"}</b>}
                  {" "}· {timeAgo(cm.createdAt)}
                </div>
                <p style={{ whiteSpace: "pre-wrap" }}>{cm.message}</p>
              </div>
            ))}
            <div className="stack" style={{ marginTop: 14, ["--gap" as string]: "10px" }}>
              <textarea className="textarea" style={{ minHeight: 80 }} maxLength={1000} placeholder={user ? "Add useful detail. Keep it about the issue, not people." : "Sign in to comment"} value={comment} onChange={(e) => setComment(e.target.value)} onFocus={() => requireLogin(`/issue/${id}`)} />
              <div className="row wrap-row">
                <button className="btn btn-dark btn-sm" disabled={busy || comment.trim().length < 2} onClick={() => postComment(null)}>Comment anonymously</button>
                {responderBody && (
                  <button className="btn btn-ghost btn-sm" disabled={busy || comment.trim().length < 2} onClick={() => postComment(responderBody)}>Reply as {bodyName(responderBody)}</button>
                )}
              </div>
            </div>
          </section>
        </div>

        <aside className="stack">
          <div className="card pad">
            <dl className="kv">
              <dt>Tagged</dt><dd>{bodyName(issue.bodyId)}</dd>
              <dt>Topic</dt><dd>{c.name}</dd>
              <dt>Where</dt><dd>{issue.location}</dd>
              <dt>How often</dt><dd>{issue.frequency}</dd>
              <dt>Raised</dt><dd>{fmtDate(issue.createdAt)}</dd>
              <dt>First reply</dt><dd>{firstResponseDays === null ? "Not yet" : firstResponseDays === 0 ? "Same day" : `${firstResponseDays} day${firstResponseDays > 1 ? "s" : ""}`}</dd>
              <dt>Status</dt><dd>{STATUS_LABEL[issue.status]}</dd>
            </dl>
          </div>
          <div className="card pad stack" style={{ ["--gap" as string]: "10px" }}>
            <h3>Share this issue</h3>
            <p className="faint">Send it to batchmates who face the same problem.</p>
            <button className="btn btn-ghost btn-sm" onClick={() => {
              const url = window.location.href;
              (navigator.clipboard?.writeText(url) || Promise.reject()).then(() => toast("Link copied"), () => toast(url));
            }}>Copy link</button>
          </div>
          <button className="btn btn-ghost btn-sm" onClick={() => requireLogin(`/issue/${id}`) && setReporting(true)}>⚑ Report this issue</button>
        </aside>
      </div>
      {reporting && <ReportModal id={id} onClose={() => setReporting(false)} />}
    </div>
  );
}

function ReportModal({ id, onClose }: { id: string; onClose: () => void }) {
  const { toast } = useApp();
  const [reason, setReason] = useState("Names or targets a person");
  const reasons = ["Names or targets a person", "Abusive or offensive", "Spam or duplicate", "Sensitive matter that belongs with a formal committee", "Other"];
  return (
    <Modal onClose={onClose}>
      <div className="stack">
        <h3>Report this issue</h3>
        <p className="muted" style={{ fontSize: ".92rem" }}>Moderators review reports. Issues with several reports are hidden until reviewed.</p>
        <div className="stack" style={{ ["--gap" as string]: "8px" }}>
          {reasons.map((r) => (
            <label key={r} className="row" style={{ gap: 10 }}>
              <input type="radio" name="reason" checked={reason === r} onChange={() => setReason(r)} /> {r}
            </label>
          ))}
        </div>
        <div className="row">
          <button className="btn btn-ghost" onClick={onClose}>Cancel</button>
          <button className="btn btn-dark" onClick={async () => {
            try { await api.report(id, reason); toast("Reported. Thank you."); onClose(); }
            catch (e) { toast((e as Error).message); }
          }}>Submit report</button>
        </div>
      </div>
    </Modal>
  );
}
