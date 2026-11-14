import { api } from "../lib/api";
import { bodyName, buildScorecards, NO_RESPONSE_DAYS, pct } from "../lib/util";
import { Empty, SignInWall, Skeletons } from "../components";
import { useApp } from "../store";

function Metric({ n, l, bar, tone }: { n: string; l: string; bar?: number; tone?: string }) {
  return (
    <div>
      <div className="n">{n}</div>
      <div className="l">{l}</div>
      {bar !== undefined && <div className={`bar ${tone || ""}`}><i style={{ width: `${bar}%` }} /></div>}
    </div>
  );
}

export default function Scorecard() {
  const { issues, loading, user } = useApp();
  if (api.mode === "live" && !user) return <div className="wrap" style={{ marginTop: 24 }}><SignInWall next="/scorecard" /></div>;
  const cards = buildScorecards(issues);
  const all = issues.length;
  const acked = issues.filter((i) => i.status !== "new").length;
  const resolved = issues.filter((i) => i.status === "resolved").length;
  const tone = (p: number) => (p >= 70 ? "" : p >= 40 ? "warn" : "bad");

  return (
    <div className="wrap">
      <div className="page-title">
        <span className="eyebrow">Accountability</span>
        <h2 style={{ marginTop: 6 }}>Who is responding, and how fast</h2>
        <p className="muted" style={{ marginTop: 8, maxWidth: "62ch" }}>
          Every council post, rep and club tagged on the board, ranked by issues received. Issues with no reply after {NO_RESPONSE_DAYS} days count as overdue.
          This page holds everyone accountable, including the President.
        </p>
      </div>

      <div className="stats" style={{ marginTop: 22 }}>
        <div className="card stat"><b>{all}</b><span>Issues tagged</span></div>
        <div className="card stat"><b>{pct(acked, all)}%</b><span>Got a response</span></div>
        <div className="card stat"><b>{pct(resolved, all)}%</b><span>Resolved</span></div>
        <div className="card stat"><b>{issues.filter((i) => i.status === "new" && (Date.now() - new Date(i.createdAt).getTime()) / 86_400_000 > NO_RESPONSE_DAYS).length}</b><span>Overdue now</span></div>
      </div>

      <div className="list" style={{ marginTop: 20 }}>
        {loading ? <Skeletons /> : cards.length === 0 ? <Empty icon="📊" title="No issues tagged yet" /> : cards.map((c) => {
          const ap = pct(c.acknowledged, c.tagged);
          const rp = pct(c.resolved, c.tagged);
          return (
            <a key={c.bodyId} className="card score" href={`#/board?body=${c.bodyId}`}>
              <div>
                <h3>{bodyName(c.bodyId)}</h3>
                <span className="faint">{c.tagged} issue{c.tagged > 1 ? "s" : ""} tagged · view on board →</span>
              </div>
              <div className="score-metrics">
                <Metric n={`${ap}%`} l="Responded" bar={ap} tone={tone(ap)} />
                <Metric n={`${rp}%`} l="Resolved" bar={rp} tone={tone(rp)} />
                <Metric n={c.medianDaysToRespond === null ? "–" : `${c.medianDaysToRespond.toFixed(1)}d`} l="Median reply" />
                <Metric n={String(c.overdue)} l="Overdue" />
              </div>
            </a>
          );
        })}
      </div>
    </div>
  );
}
