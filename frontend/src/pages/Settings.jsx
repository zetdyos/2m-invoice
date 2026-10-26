import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useAuth } from "../auth.jsx";
import { useToast } from "../components/ui.jsx";

export default function Settings() {
  const toast = useToast();
  const [s, setS] = useState(null);
  const [busy, setBusy] = useState(false);
  const [testTo, setTestTo] = useState("");
  const [testing, setTesting] = useState(false);

  useEffect(() => {
    api.get("/settings").then((d) => { setS(d); setTestTo(d.company_email || d.smtp_from || ""); })
      .catch((e) => toast.err(e.message));
  }, []);

  function set(k, v) { setS((p) => ({ ...p, [k]: v })); }

  async function save() {
    setBusy(true);
    const payload = { ...s };
    delete payload.smtp_password_set;
    if (!payload.smtp_password) delete payload.smtp_password; // keep stored one
    try {
      const updated = await api.put("/settings", payload);
      setS(updated);
      toast.ok("Settings saved");
    } catch (e) { toast.err(e.message); }
    finally { setBusy(false); }
  }

  async function sendTest() {
    if (!testTo) { toast.err("Enter a recipient for the test email."); return; }
    setTesting(true);
    try { const r = await api.post("/settings/test-email", { to: testTo }); toast.ok(r.detail); }
    catch (e) { toast.err(e.message); }
    finally { setTesting(false); }
  }

  if (!s) return <div className="center-spin"><span className="spinner" /></div>;

  return (
    <>
      <div className="page-head">
        <div><h1>Settings</h1><p>Mail server, company details and email content. All stored inside the app.</p></div>
        <button className="btn btn-primary" onClick={save} disabled={busy}>
          {busy ? <span className="spinner" /> : "Save changes"}
        </button>
      </div>

      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <div className="section-title">Mail server (SMTP)</div>
        <div className="row">
          <div className="field"><label>SMTP host</label>
            <input className="input" value={s.smtp_host} onChange={(e) => set("smtp_host", e.target.value)} placeholder="smtp.office365.com" /></div>
          <div className="field"><label>Port</label>
            <input className="input" type="number" value={s.smtp_port} onChange={(e) => set("smtp_port", Number(e.target.value))} /></div>
        </div>
        <div className="row">
          <div className="field"><label>Security</label>
            <select className="select" value={s.smtp_security} onChange={(e) => set("smtp_security", e.target.value)}>
              <option value="starttls">STARTTLS (port 587)</option>
              <option value="ssl">SSL/TLS (port 465)</option>
              <option value="none">None</option>
            </select></div>
          <div className="field"><label>SMTP username</label>
            <input className="input" value={s.smtp_user} onChange={(e) => set("smtp_user", e.target.value)} placeholder="invoice@2mmowertool.com" autoComplete="off" /></div>
        </div>
        <div className="row">
          <div className="field"><label>SMTP password</label>
            <input className="input" type="password" value={s.smtp_password || ""}
              onChange={(e) => set("smtp_password", e.target.value)}
              placeholder={s.smtp_password_set ? "•••••••• (unchanged)" : "Enter password"} autoComplete="new-password" />
            <div className="hint">{s.smtp_password_set ? "Leave blank to keep the current password." : "No password stored yet."}</div></div>
          <div className="field"><label>From name</label>
            <input className="input" value={s.smtp_from_name} onChange={(e) => set("smtp_from_name", e.target.value)} placeholder="2M Mower and Tool LLC" /></div>
        </div>
        <div className="field"><label>From / sender address</label>
          <input className="input" value={s.smtp_from} onChange={(e) => set("smtp_from", e.target.value)} placeholder="invoice@2mmowertool.com" /></div>

        <div className="section-title">Send a test email</div>
        <div className="toolbar" style={{ marginBottom: 0 }}>
          <input className="input" style={{ maxWidth: 320 }} value={testTo}
            onChange={(e) => setTestTo(e.target.value)} placeholder="you@example.com" />
          <button className="btn btn-ghost" onClick={sendTest} disabled={testing}>
            {testing ? <span className="spinner" /> : "Send test"}
          </button>
          <span className="hint" style={{ alignSelf: "center" }}>Save your changes first, then test.</span>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <div className="section-title">Company details (shown on the PDF and email)</div>
        <div className="row">
          <div className="field"><label>Company name</label>
            <input className="input" value={s.company_name} onChange={(e) => set("company_name", e.target.value)} /></div>
          <div className="field"><label>DBA / trade name</label>
            <input className="input" value={s.company_dba} onChange={(e) => set("company_dba", e.target.value)} /></div>
        </div>
        <div className="row">
          <div className="field"><label>Street address</label>
            <input className="input" value={s.company_address} onChange={(e) => set("company_address", e.target.value)} /></div>
          <div className="field"><label>City, State ZIP</label>
            <input className="input" value={s.company_city} onChange={(e) => set("company_city", e.target.value)} /></div>
        </div>
        <div className="row">
          <div className="field"><label>Phone</label>
            <input className="input" value={s.company_phone} onChange={(e) => set("company_phone", e.target.value)} /></div>
          <div className="field"><label>Reply-to / contact email</label>
            <input className="input" value={s.company_email} onChange={(e) => set("company_email", e.target.value)} placeholder="invoice@2mmowertool.com" /></div>
        </div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 20 }}>
        <div className="section-title">Email content</div>
        <div className="field"><label>Subject line</label>
          <input className="input" value={s.email_subject} onChange={(e) => set("email_subject", e.target.value)} /></div>
        <div className="field"><label>Intro message</label>
          <textarea className="textarea" rows={4} value={s.email_intro} onChange={(e) => set("email_intro", e.target.value)} />
          <div className="hint">This paragraph appears below the greeting in every confirmation email.</div></div>
      </div>

      <ChangePassword />
    </>
  );
}

function ChangePassword() {
  const toast = useToast();
  const { user } = useAuth();
  const [cur, setCur] = useState("");
  const [nw, setNw] = useState("");
  const [busy, setBusy] = useState(false);

  async function change() {
    if (nw.length < 6) { toast.err("New password must be at least 6 characters."); return; }
    setBusy(true);
    try {
      await api.post("/auth/change-password", { current_password: cur, new_password: nw });
      toast.ok("Password changed");
      setCur(""); setNw("");
    } catch (e) { toast.err(e.message); }
    finally { setBusy(false); }
  }

  return (
    <div className="card card-pad">
      <div className="section-title">Your account — @{user?.username}</div>
      <div className="row">
        <div className="field"><label>Current password</label>
          <input className="input" type="password" value={cur} onChange={(e) => setCur(e.target.value)} autoComplete="current-password" /></div>
        <div className="field"><label>New password</label>
          <input className="input" type="password" value={nw} onChange={(e) => setNw(e.target.value)} autoComplete="new-password" /></div>
      </div>
      <button className="btn btn-ghost" onClick={change} disabled={busy || !cur || !nw}>
        {busy ? <span className="spinner" /> : "Change password"}
      </button>
    </div>
  );
}
