import { api } from "../lib/api";
import { isClosed, pct } from "../lib/util";
import { IssueCard, LockedTeaser, Skeletons } from "../components";
import { useApp } from "../store";

export default function Home() {
  const { issues, user, loading } = useApp();
  const locked = api.mode === "live" && !user;
  const open = issues.filter((i) => !isClosed(i));
  const supports = issues.reduce((n, i) => n + i.supportCount, 0);
  const acked = issues.filter((i) => i.status !== "new").length;
  const resolved = issues.filter((i) => i.status === "resolved").length;
  const top = [...open].sort((a, b) => b.supportCount - a.supportCount).slice(0, 4);

  return (
    <>
      <section className="hero">
        <div className="wrap hero-grid">
          <div>
            <span className="eyebrow">For every student at IIM Calcutta</span>
            <h1 style={{ marginTop: 12 }}>One voice. <em>Many students.</em></h1>
            <p className="lede">
              Vidyarthi Voice is an open board for campus issues. Raise a concern, back the ones you share,
              and see exactly how the responsible council member, rep or club responds. Every step is visible to the whole batch.
            </p>
            <div className="cta">
              <a className="btn btn-primary btn-lg" href="#/raise">Raise an issue</a>
              <a className="btn btn-ghost btn-lg" href="#/board">See the board</a>
            </div>
          </div>
          <div className="bubbles" aria-hidden>
            <div className="bubble" style={{ left: "4%", top: "62%", animationDelay: "0s" }}>Gym is packed after 6 pm</div>
            <div className="bubble" style={{ left: "46%", top: "74%", animationDelay: "1.2s" }}>Wi-Fi drops at night</div>
            <div className="bubble" style={{ left: "12%", top: "36%", animationDelay: "2.1s" }}>Library seats in exams</div>
            <div className="bubble" style={{ left: "56%", top: "46%", animationDelay: "0.6s" }}>Need a cricket pitch</div>
            <div className="bubble big" style={{ left: "22%", top: "4%", animationDelay: "1.6s" }}>One clear ask, backed by the batch</div>
          </div>
        </div>
      </section>

      <div className="wrap">
        {locked ? <div style={{ marginTop: -32, position: "relative" }}><LockedTeaser next="/board" /></div> : (
          <div className="stats">
            <div className="card stat"><b>{issues.length}</b><span>Issues raised</span></div>
            <div className="card stat"><b>{supports}</b><span>Supports given</span></div>
            <div className="card stat"><b>{pct(acked, issues.length)}%</b><span>Got a response</span></div>
            <div className="card stat"><b>{resolved}</b><span>Resolved</span></div>
          </div>
        )}

        <section className="section">
          <div className="section-head">
            <div className="stack" style={{ ["--gap" as string]: "8px" }}>
              <span className="eyebrow">How it works</span>
              <h2>Three steps. Fully in the open.</h2>
            </div>
          </div>
          <div className="steps">
            <div className="card step">
              <div className="num">1</div>
              <h3>Raise</h3>
              <p className="muted">Describe the problem in a few lines, suggest a fix, and tag who owns it. Your name is never shown.</p>
            </div>
            <div className="card step">
              <div className="num">2</div>
              <h3>Support</h3>
              <p className="muted">Back issues you share. The more support an issue gets, the higher it rises and the harder it is to ignore.</p>
            </div>
            <div className="card step">
              <div className="num">3</div>
              <h3>Track</h3>
              <p className="muted">The tagged body replies on the issue itself. Watch it move from Acknowledged to Resolved, then confirm the fix.</p>
            </div>
          </div>
        </section>

        {!locked && (
        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-head">
            <div className="stack" style={{ ["--gap" as string]: "8px" }}>
              <span className="eyebrow">Right now</span>
              <h2>Most supported open issues</h2>
            </div>
            <div className="spacer" />
            <a className="link" href="#/board">View all →</a>
          </div>
          {loading ? <Skeletons n={3} /> : (
            <div className="list">{top.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
          )}
        </section>
        )}

        <section className="section" style={{ paddingTop: 0 }}>
          <div className="section-head">
            <div className="stack" style={{ ["--gap" as string]: "8px" }}>
              <span className="eyebrow">Our promise</span>
              <h2>Built for trust</h2>
            </div>
          </div>
          <div className="promise">
            <div className="card"><span className="ic">🕶️</span><div><h3>Safe to speak</h3><p className="muted">Sign-in keeps it IIMC-only and spam-free. Who raised or supported an issue is never shown.</p></div></div>
            <div className="card"><span className="ic">🔎</span><div><h3>Transparent by default</h3><p className="muted">Every reply and status change is public to the batch, with dates.</p></div></div>
            <div className="card"><span className="ic">⏱️</span><div><h3>No silent drops</h3><p className="muted">If nobody responds within 7 days, the issue is flagged on the board and the scorecard.</p></div></div>
            <div className="card"><span className="ic">🤝</span><div><h3>Constructive, always</h3><p className="muted">Issues, not people. Every issue carries a suggested fix, so the conversation starts with solutions.</p></div></div>
          </div>
        </section>

        <section className="card pad row wrap-row" style={{ background: "var(--navy)", color: "#fff", border: 0 }}>
          <div style={{ flex: 1, minWidth: 240 }}>
            <h2 style={{ color: "#fff" }}>Something bothering you on campus?</h2>
            <p style={{ color: "rgba(255,255,255,.8)", marginTop: 8 }}>It takes two minutes. Chances are, others feel the same.</p>
          </div>
          <a className="btn btn-primary btn-lg" href="#/raise">Raise an issue</a>
        </section>
      </div>
    </>
  );
}
