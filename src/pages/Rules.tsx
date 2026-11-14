import { NO_RESPONSE_DAYS } from "../lib/util";

export default function Rules() {
  return (
    <div className="wrap" style={{ maxWidth: 820 }}>
      <div className="page-title">
        <span className="eyebrow">How it works</span>
        <h2 style={{ marginTop: 6 }}>A simple tool with clear rules</h2>
        <p className="muted" style={{ marginTop: 8 }}>
          Vidyarthi Voice turns scattered complaints into a few clear, well-supported issues. It routes each one to
          the right council post, rep or club, and keeps every response visible until it is resolved.
        </p>
      </div>

      <section className="card pad stack" style={{ marginTop: 22 }}>
        <h3>The journey of an issue</h3>
        <ol className="rules muted" style={{ paddingLeft: 20, margin: 0 }}>
          <li><b>Raised.</b> A student describes the problem, suggests a fix and tags an owner.</li>
          <li><b>Supported.</b> Others back it. The most supported issues sit at the top of the board.</li>
          <li><b>Acknowledged.</b> The tagged body replies publicly. If they do not within {NO_RESPONSE_DAYS} days, the issue is flagged as overdue.</li>
          <li><b>Taken up and in progress.</b> The owner posts what they are doing, with dates.</li>
          <li><b>Resolved or can't fix.</b> Either way, students get a reason. Resolved issues are confirmed by students.</li>
        </ol>
      </section>

      <section className="card pad stack" style={{ marginTop: 16 }}>
        <h3>Community rules</h3>
        <ul className="rules muted" style={{ paddingLeft: 20, margin: 0 }}>
          <li><b>Issues, not people.</b> Do not name or target individual students, staff or faculty.</li>
          <li><b>Be specific.</b> Say what happens, where and how often. Add a suggested fix.</li>
          <li><b>Support before you duplicate.</b> If someone already raised it, back their issue instead.</li>
          <li><b>Keep it respectful.</b> No abuse, slurs or personal attacks.</li>
          <li><b>Sensitive matters go to formal channels.</b> Harassment, safety, health or personal grievances belong with the institute's committees and offices, not on a public board.</li>
          <li><b>Reports are reviewed.</b> Issues reported by several students are hidden until a moderator reviews them.</li>
        </ul>
      </section>

      <section className="card pad faq" style={{ marginTop: 16 }}>
        <h3 style={{ marginBottom: 6 }}>Questions</h3>
        <details><summary>Can anyone see who raised an issue?</summary><p>No. Your sign-in is only used to confirm you are from IIMC and to stop spam. The board never shows who raised or supported anything.</p></details>
        <details><summary>Who can see the board?</summary><p>Only people signed in with an IIM Calcutta email address.</p></details>
        <details><summary>Who replies to issues?</summary><p>Verified members of each council post, rep role or club. Their replies carry the body's name, so you know the answer is official.</p></details>
        <details><summary>What if nobody responds?</summary><p>After {NO_RESPONSE_DAYS} days with no reply, the issue gets an overdue flag on the board and counts against that body on the public scorecard.</p></details>
        <details><summary>Is this an official institute body?</summary><p>No. It is an independent student initiative that makes it easier for students to raise issues and for council members to respond in the open.</p></details>
        <details><summary>How many issues can I raise?</summary><p>Up to five a day. Most of the time, supporting an existing issue is more powerful.</p></details>
      </section>
    </div>
  );
}
