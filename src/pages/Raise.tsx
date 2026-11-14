import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { Frequency } from "../lib/types";
import { BODIES, CATEGORIES, GROUPS, LOCATIONS, bodyName, findSimilar } from "../lib/util";
import { StatusPill } from "../components";
import { go, useApp } from "../store";

const FREQ: Frequency[] = ["Daily", "Weekly", "Monthly", "Occasional"];

export default function Raise() {
  const { user, issues, refresh, toast } = useApp();
  const [cat, setCat] = useState("");
  const [bodyId, setBodyId] = useState("");
  const [bodyTouched, setBodyTouched] = useState(false);
  const [title, setTitle] = useState("");
  const [details, setDetails] = useState("");
  const [fix, setFix] = useState("");
  const [location, setLocation] = useState("Campus-wide");
  const [frequency, setFrequency] = useState<Frequency>("Daily");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const similar = useMemo(() => findSimilar(title + " " + details.slice(0, 200), issues), [title, details, issues]);

  if (!user) {
    return (
      <div className="wrap">
        <div className="card pad auth stack" style={{ textAlign: "center" }}>
          <div style={{ fontSize: "2.4rem" }}>✍️</div>
          <h2>Sign in to raise an issue</h2>
          <p className="muted">We only ask for your IIM Calcutta email to keep the board real and spam-free. Your name is never shown on what you raise.</p>
          <a className="btn btn-primary btn-lg" href="#/login?next=%2Fraise">Sign in with IIMC email</a>
        </div>
      </div>
    );
  }

  function pickCat(id: string) {
    setCat(id);
    if (!bodyTouched) setBodyId(CATEGORIES.find((c) => c.id === id)?.defaultBody || "president");
  }

  const problems: string[] = [];
  if (!cat) problems.push("Pick a topic.");
  if (title.trim().length < 8) problems.push("Title needs at least 8 characters.");
  if (details.trim().length < 20) problems.push("Details need at least 20 characters.");
  if (fix.trim().length < 5) problems.push("Add a suggested fix, even a rough one.");
  if (!bodyId) problems.push("Tag who should own this.");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (problems.length) { setErr(problems[0]); return; }
    setBusy(true);
    try {
      const id = await api.createIssue({ title: title.trim(), details: details.trim(), suggestedFix: fix.trim(), category: cat, location, frequency, bodyId });
      await refresh();
      toast("Issue raised. Share it so others can support it.");
      go(`/issue/${id}`);
    } catch (e2) {
      setErr((e2 as Error).message);
    } finally { setBusy(false); }
  }

  return (
    <div className="wrap" style={{ maxWidth: 780 }}>
      <div className="page-title">
        <span className="eyebrow">Raise an issue</span>
        <h2 style={{ marginTop: 6 }}>What should be better on campus?</h2>
        <p className="muted" style={{ marginTop: 8 }}>Clear, specific issues with a suggested fix get support and answers fastest.</p>
      </div>

      <form className="card pad stack" style={{ marginTop: 20, ["--gap" as string]: "22px" }} onSubmit={submit} noValidate>
        <div className="field">
          <label>1. Topic</label>
          <div className="cat-grid">
            {CATEGORIES.map((c) => (
              <button type="button" key={c.id} className={`cat-opt ${cat === c.id ? "on" : ""}`} onClick={() => pickCat(c.id)} aria-pressed={cat === c.id}>
                <span>{c.icon}</span>{c.name}
              </button>
            ))}
          </div>
        </div>

        <div className="field">
          <label htmlFor="t">2. Title</label>
          <input id="t" className="input" maxLength={120} placeholder="e.g. Gym is too crowded between 6 and 9 pm" value={title} onChange={(e) => setTitle(e.target.value)} />
          <div className="count">{title.length}/120</div>
        </div>

        {similar.length > 0 && (
          <div className="similar">
            <b>Looks similar to existing issues.</b>
            <p className="faint" style={{ margin: "2px 0 6px" }}>Supporting an existing issue makes it stronger than a new duplicate.</p>
            {similar.map((s) => (
              <a key={s.id} href={`#/issue/${s.id}`}>
                <span className="sim-count">▲ {s.supportCount}</span>
                <span style={{ flex: 1, minWidth: 0 }}>
                  <b style={{ display: "block" }}>{s.title}</b>
                  <StatusPill status={s.status} />
                </span>
              </a>
            ))}
          </div>
        )}

        <div className="field">
          <label htmlFor="d">3. What is wrong?</label>
          <span className="hint">What happens, when, and how it affects students. Describe the issue, not individuals.</span>
          <textarea id="d" className="textarea" maxLength={2000} value={details} onChange={(e) => setDetails(e.target.value)} placeholder="Every evening the gym has a queue for benches and racks. Many of us skip workouts..." />
          <div className="count">{details.length}/2000</div>
        </div>

        <div className="field">
          <label htmlFor="f">4. Suggested fix</label>
          <span className="hint">Even a rough idea helps the owner act faster.</span>
          <textarea id="f" className="textarea" style={{ minHeight: 80 }} maxLength={1000} value={fix} onChange={(e) => setFix(e.target.value)} placeholder="Extend evening hours by one hour and share a live crowd count." />
        </div>

        <div className="grid-2">
          <div className="field">
            <label htmlFor="l">5. Where</label>
            <select id="l" className="input" value={location} onChange={(e) => setLocation(e.target.value)}>
              {LOCATIONS.map((l) => <option key={l}>{l}</option>)}
            </select>
          </div>
          <div className="field">
            <label htmlFor="fr">How often</label>
            <select id="fr" className="input" value={frequency} onChange={(e) => setFrequency(e.target.value as Frequency)}>
              {FREQ.map((f) => <option key={f}>{f}</option>)}
            </select>
          </div>
        </div>

        <div className="field">
          <label htmlFor="b">6. Who should own this?</label>
          <span className="hint">{cat ? <>Suggested for this topic: <b>{bodyName(CATEGORIES.find((c) => c.id === cat)?.defaultBody)}</b>. Change it if someone else fits better.</> : "Pick a topic first and we will suggest one."}</span>
          <select id="b" className="input" value={bodyId} onChange={(e) => { setBodyId(e.target.value); setBodyTouched(true); }}>
            <option value="">Select a council post, rep or club</option>
            {GROUPS.map((g) => (
              <optgroup key={g.id} label={g.name}>
                {BODIES.filter((b) => b.group === g.id).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
              </optgroup>
            ))}
          </select>
        </div>

        <div className="anon-note">
          <span>🕶️</span>
          <span>Your name and email are never shown on the board. Harassment, safety or personal health matters should go to the institute's formal committees, not here.</span>
        </div>

        {err && <div className="error">{err}</div>}
        <div className="row">
          <button className="btn btn-primary btn-lg" type="submit" disabled={busy}>{busy ? "Raising..." : "Raise issue"}</button>
          <span className="faint">{problems.length ? `${problems.length} thing${problems.length > 1 ? "s" : ""} left` : "Ready to go"}</span>
        </div>
      </form>
    </div>
  );
}
