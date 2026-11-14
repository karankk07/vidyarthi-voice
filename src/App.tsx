import { api } from "./lib/api";
import { resetDemo } from "./lib/demoApi";
import { go, useApp, useRoute } from "./store";
import Home from "./pages/Home";
import Board from "./pages/Board";
import IssuePage from "./pages/IssuePage";
import Raise from "./pages/Raise";
import Login from "./pages/Login";
import Scorecard from "./pages/Scorecard";
import Mine from "./pages/Mine";
import Console from "./pages/Console";
import Rules from "./pages/Rules";

function Header({ path }: { path: string }) {
  const { user } = useApp();
  const on = (p: string) => (path === p || (p !== "/" && path.startsWith(p)) ? "on" : "");
  return (
    <header className="top">
      <div className="wrap">
        <a className="brand" href="#/"><span className="brand-mark">VV</span>Vidyarthi Voice</a>
        <nav className="nav" aria-label="Main">
          <a className={on("/board")} href="#/board">Board</a>
          <a className={on("/scorecard")} href="#/scorecard">Scorecard</a>
          <a className={on("/mine")} href="#/mine">My activity</a>
          {user && user.responderFor.length > 0 && <a className={on("/console")} href="#/console">Respond</a>}
          <a className={on("/rules")} href="#/rules">How it works</a>
        </nav>
        <div className="spacer" />
        <a className="btn btn-primary btn-sm hide-sm" href="#/raise">Raise an issue</a>
        {user ? (
          <>
            <span className="who hide-sm" title={user.email}>{user.email.split("@")[0]}</span>
            <button className="btn btn-ghost btn-sm" onClick={() => api.signOut().then(() => go("/"))}>Sign out</button>
          </>
        ) : (
          <a className="btn btn-ghost btn-sm" href={`#/login?next=${encodeURIComponent(path)}`}>Sign in</a>
        )}
      </div>
    </header>
  );
}

function Tabs({ path }: { path: string }) {
  const { user } = useApp();
  const on = (p: string) => (path === p || (p !== "/" && path.startsWith(p)) ? "on" : "");
  const fifth = user && user.responderFor.length > 0
    ? { href: "#/console", p: "/console", ic: "✅", t: "Respond" }
    : { href: "#/mine", p: "/mine", ic: "👤", t: "Mine" };
  return (
    <nav className="tabs" aria-label="Tabs">
      <a className={on("/")} href="#/"><span className="ic">🏠</span>Home</a>
      <a className={on("/board")} href="#/board"><span className="ic">📋</span>Board</a>
      <a className={`raise ${on("/raise")}`} href="#/raise"><span className="ic">+</span>Raise</a>
      <a className={on("/scorecard")} href="#/scorecard"><span className="ic">📊</span>Scorecard</a>
      <a className={on(fifth.p)} href={fifth.href}><span className="ic">{fifth.ic}</span>{fifth.t}</a>
    </nav>
  );
}

export default function App() {
  const path = useRoute();
  let page;
  if (path === "/") page = <Home />;
  else if (path === "/board") page = <Board />;
  else if (path.startsWith("/issue/")) page = <IssuePage id={path.slice(7)} />;
  else if (path === "/raise") page = <Raise />;
  else if (path === "/login") page = <Login />;
  else if (path === "/scorecard") page = <Scorecard />;
  else if (path === "/mine") page = <Mine />;
  else if (path === "/console") page = <Console />;
  else if (path === "/rules") page = <Rules />;
  else page = <div className="wrap section"><h2>Page not found</h2><p className="muted" style={{ marginTop: 8 }}><a className="link" href="#/">Go home</a></p></div>;

  return (
    <>
      {api.mode === "demo" && (
        <div className="demo-bar">
          Demo with sample data. Sign in with any @email.iimcal.ac.in address and code 123456.
          <button onClick={() => { resetDemo(); go("/"); }}>Reset demo</button>
        </div>
      )}
      <Header path={path} />
      <main>{page}</main>
      <footer className="footer">
        <div className="wrap row wrap-row">
          <span>Vidyarthi Voice · An independent student initiative at IIM Calcutta</span>
          <span className="spacer" />
          <a className="link" href="#/rules">Community rules</a>
        </div>
      </footer>
      <Tabs path={path} />
    </>
  );
}
