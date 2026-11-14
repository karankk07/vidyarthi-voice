import { Empty, IssueCard, Skeletons } from "../components";
import { useApp } from "../store";

export default function Mine() {
  const { user, issues, loading } = useApp();
  if (!user) {
    return (
      <div className="wrap" style={{ marginTop: 24 }}>
        <Empty icon="👤" title="Sign in to see your activity">
          <a className="btn btn-primary" style={{ marginTop: 14 }} href="#/login?next=%2Fmine">Sign in</a>
        </Empty>
      </div>
    );
  }
  const raised = issues.filter((i) => i.isMine).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  const supported = issues.filter((i) => i.supportedByMe && !i.isMine).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
  return (
    <div className="wrap">
      <div className="page-title">
        <span className="eyebrow">My activity</span>
        <h2 style={{ marginTop: 6 }}>Issues you raised and back</h2>
        <p className="muted" style={{ marginTop: 8 }}>Only you can see this list. Newest updates first.</p>
      </div>
      <section className="section" style={{ paddingTop: 24 }}>
        <h3 style={{ marginBottom: 12 }}>Raised by you ({raised.length})</h3>
        {loading ? <Skeletons n={2} /> : raised.length ? <div className="list">{raised.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
          : <Empty icon="✍️" title="You have not raised anything yet"><a className="link" href="#/raise">Raise your first issue</a></Empty>}
      </section>
      <section style={{ paddingBottom: 40 }}>
        <h3 style={{ marginBottom: 12 }}>Supported by you ({supported.length})</h3>
        {loading ? <Skeletons n={2} /> : supported.length ? <div className="list">{supported.map((i) => <IssueCard key={i.id} issue={i} />)}</div>
          : <Empty icon="▲" title="No supports yet"><a className="link" href="#/board">Browse the board</a></Empty>}
      </section>
    </div>
  );
}
