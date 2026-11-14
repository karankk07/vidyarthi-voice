import { useState } from "react";
import { api } from "../lib/api";
import { ALLOWED_DOMAIN, isAllowedEmail } from "../lib/util";
import { go, queryParam, useApp } from "../store";

export default function Login() {
  const { user, refresh } = useApp();
  const [email, setEmail] = useState("");
  const [code, setCode] = useState("");
  const [step, setStep] = useState<"email" | "code">("email");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const next = queryParam("next") || "/board";

  if (user) {
    return (
      <div className="wrap">
        <div className="card pad auth stack" style={{ textAlign: "center" }}>
          <h2>You are signed in</h2>
          <p className="muted">{user.email}</p>
          <a className="btn btn-primary" href={`#${next}`}>Continue</a>
        </div>
      </div>
    );
  }

  async function send(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!isAllowedEmail(email)) { setErr(`Use your @${ALLOWED_DOMAIN} address.`); return; }
    setBusy(true);
    try { await api.sendCode(email); setStep("code"); }
    catch (e2) { setErr((e2 as Error).message); }
    finally { setBusy(false); }
  }

  async function verify(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setBusy(true);
    try { await api.verifyCode(email, code); await refresh(); go(next); }
    catch (e2) { setErr((e2 as Error).message); }
    finally { setBusy(false); }
  }

  return (
    <div className="wrap">
      <div className="card pad auth stack">
        <div className="brand-mark" style={{ width: 46, height: 46, fontSize: "1.1rem", borderRadius: 14 }}>VV</div>
        {step === "email" ? (
          <form className="stack" onSubmit={send} noValidate>
            <div>
              <h2>Sign in</h2>
              <p className="muted" style={{ marginTop: 6 }}>Only for the IIM Calcutta community. We will email you a one-time code. No password needed.</p>
            </div>
            <div className="field">
              <label htmlFor="em">IIMC email</label>
              <input id="em" className="input" type="email" inputMode="email" autoComplete="email" autoFocus
                placeholder={`yourname@${ALLOWED_DOMAIN}`} value={email} onChange={(e) => setEmail(e.target.value)} />
            </div>
            {err && <div className="error">{err}</div>}
            <button className="btn btn-primary btn-lg" disabled={busy}>{busy ? "Sending..." : "Send code"}</button>
            <p className="faint">Your email is only used to verify you are from IIMC. It is never shown on the board.</p>
          </form>
        ) : (
          <form className="stack" onSubmit={verify} noValidate>
            <div>
              <h2>Check your inbox</h2>
              <p className="muted" style={{ marginTop: 6 }}>We sent a sign-in code to <b>{email}</b>.{api.mode === "demo" && " In this demo, the code is 123456."}</p>
            </div>
            <div className="field">
              <label htmlFor="code">Code</label>
              <input id="code" className="input code-input" inputMode="numeric" autoComplete="one-time-code" autoFocus maxLength={10}
                value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} />
            </div>
            {err && <div className="error">{err}</div>}
            <button className="btn btn-primary btn-lg" disabled={busy || code.length < 6}>{busy ? "Checking..." : "Verify and continue"}</button>
            <button type="button" className="btn btn-ghost btn-sm" onClick={() => { setStep("email"); setCode(""); }}>Use a different email</button>
          </form>
        )}
      </div>
    </div>
  );
}
