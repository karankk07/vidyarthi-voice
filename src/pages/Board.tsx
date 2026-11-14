import { useMemo, useState } from "react";
import { api } from "../lib/api";
import { BODIES, CATEGORIES, bodyName, isClosed, isOverdue, trendScore } from "../lib/util";
import { Empty, IssueCard, SignInWall, Skeletons } from "../components";
import { queryParam, useApp } from "../store";

type Sort = "top" | "trending" | "new" | "updated";
type View = "open" | "needs" | "resolved" | "all";

export default function Board() {
  const { issues, loading, user, error } = useApp();
  const [sort, setSort] = useState<Sort>("top");
  const [view, setView] = useState<View>("open");
  const [cat, setCat] = useState<string>("all");
  const [body, setBody] = useState<string>(queryParam("body") || "all");
  const [q, setQ] = useState("");

  const list = useMemo(() => {
    const term = q.trim().toLowerCase();
    let l = issues.filter((i) => {
      if (view === "open" && isClosed(i)) return false;
      if (view === "needs" && !isOverdue(i)) return false;
      if (view === "resolved" && !isClosed(i)) return false;
      if (cat !== "all" && i.category !== cat) return false;
      if (body !== "all" && i.bodyId !== body) return false;
      if (term && !(i.title + " " + i.details + " " + bodyName(i.bodyId)).toLowerCase().includes(term)) return false;
      return true;
    });
    const by: Record<Sort, (a: typeof l[0], b: typeof l[0]) => number> = {
      top: (a, b) => b.supportCount - a.supportCount || b.createdAt.localeCompare(a.createdAt),
      trending: (a, b) => trendScore(b) - trendScore(a),
      new: (a, b) => b.createdAt.localeCompare(a.createdAt),
      updated: (a, b) => b.updatedAt.localeCompare(a.updatedAt),
    };
    l = [...l].sort(by[sort]);
    return l;
  }, [issues, sort, view, cat, body, q]);

  const usedBodies = useMemo(() => new Set(issues.map((i) => i.bodyId)), [issues]);
  const locked = api.mode === "live" && !user;

  return (
    <div className="wrap">
      <div className="page-title row wrap-row">
        <div>
          <span className="eyebrow">The board</span>
          <h2 style={{ marginTop: 6 }}>What students are raising</h2>
        </div>
        <div className="spacer" />
        <a className="btn btn-primary" href="#/raise">+ Raise an issue</a>
      </div>

      {locked ? <div style={{ marginTop: 20 }}><SignInWall next="/board" /></div> : (
        <>
          <div className="toolbar">
            <div className="search">
              <label className="sr" htmlFor="q">Search issues</label>
              <input id="q" className="input" placeholder="Search issues, e.g. wifi, gym, mess" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <div className="seg" role="group" aria-label="Sort">
              {(["top", "trending", "new", "updated"] as Sort[]).map((s) => (
                <button key={s} className={sort === s ? "on" : ""} onClick={() => setSort(s)}>
                  {{ top: "Most supported", trending: "Trending", new: "Newest", updated: "Updated" }[s]}
                </button>
              ))}
            </div>
          </div>

          <div className="toolbar" style={{ marginTop: 0 }}>
            <select className="select" value={view} onChange={(e) => setView(e.target.value as View)} aria-label="Status filter">
              <option value="open">Open issues</option>
              <option value="needs">Awaiting response (7d+)</option>
              <option value="resolved">Closed</option>
              <option value="all">All</option>
            </select>
            <select className="select" value={body} onChange={(e) => setBody(e.target.value)} aria-label="Tagged body">
              <option value="all">Any tagged body</option>
              {BODIES.filter((b) => usedBodies.has(b.id)).map((b) => <option key={b.id} value={b.id}>{b.name}</option>)}
            </select>
          </div>

          <div className="chips" style={{ marginBottom: 16 }}>
            <button className={`chip ${cat === "all" ? "on" : ""}`} onClick={() => setCat("all")}>All topics</button>
            {CATEGORIES.map((c) => (
              <button key={c.id} className={`chip ${cat === c.id ? "on" : ""}`} onClick={() => setCat(c.id)}>
                {c.icon} {c.name}
              </button>
            ))}
          </div>

          {error && <div className="error" style={{ marginBottom: 12 }}>{error}</div>}
          {loading ? <Skeletons /> : list.length ? (
            <div className="list">{list.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
          ) : (
            <Empty icon="🌱" title="Nothing here yet">
              <p>No issues match these filters. Be the first to raise one.</p>
              <a className="btn btn-primary" style={{ marginTop: 14 }} href="#/raise">Raise an issue</a>
            </Empty>
          )}
          <p className="faint" style={{ marginTop: 14 }}>{list.length} of {issues.length} issues shown</p>
        </>
      )}
    </div>
  );
}
