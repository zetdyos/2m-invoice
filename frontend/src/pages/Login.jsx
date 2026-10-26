import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../auth.jsx";

export default function Login() {
  const { login } = useAuth();
  const nav = useNavigate();
  const [username, setU] = useState("");
  const [password, setP] = useState("");
  const [err, setErr] = useState("");
  const [busy, setBusy] = useState(false);

  async function submit(e) {
    e.preventDefault();
    setErr(""); setBusy(true);
    try { await login(username, password); nav("/"); }
    catch (e) { setErr(e.message || "Login failed"); }
    finally { setBusy(false); }
  }

  return (
    <div className="login-wrap">
      <div className="login-art">
        <div className="logo"><span className="r">2</span>M</div>
        <div>
          <h2>ACH payment confirmations, sent in seconds.</h2>
          <p>Create, track and email ACH confirmations to your vendors with a professional PDF on every send.</p>
          <div className="feat">
            <div>✓ &nbsp;Vendor directory with account numbers</div>
            <div>✓ &nbsp;Searchable history by date range</div>
            <div>✓ &nbsp;Branded email + PDF, configured in-app</div>
          </div>
        </div>
        <div style={{ color: "#7f97bb", fontSize: 13 }}>2M Mower and Tool LLC · Invoicer</div>
      </div>
      <div className="login-form-side">
        <div className="login-card">
          <h1>Welcome back</h1>
          <p className="lead">Sign in to manage your ACH confirmations.</p>
          {err && <div className="alert">{err}</div>}
          <form onSubmit={submit}>
            <div className="field">
              <label>Username</label>
              <input className="input" value={username} onChange={(e) => setU(e.target.value)}
                autoFocus autoComplete="username" />
            </div>
            <div className="field">
              <label>Password</label>
              <input className="input" type="password" value={password}
                onChange={(e) => setP(e.target.value)} autoComplete="current-password" />
            </div>
            <button className="btn btn-primary btn-block" disabled={busy || !username || !password}>
              {busy ? <span className="spinner" /> : "Sign in"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
