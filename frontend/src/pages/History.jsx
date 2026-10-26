import { useEffect, useMemo, useState } from "react";
import { api, openPdf } from "../api.js";
import { useToast, Icon, fmtMoney } from "../components/ui.jsx";
import { DateRangeBar, buildQuery } from "../components/filters.jsx";

function fmtDateTime(v) {
  if (!v) return "";
  return new Date(v).toLocaleString("en-US",
    { year: "numeric", month: "short", day: "2-digit", hour: "2-digit", minute: "2-digit" });
}

const STATUS_TABS = [["", "All"], ["sent", "Delivered"], ["failed", "Failed"]];

export default function History() {
  const toast = useToast();
  const [vendors, setVendors] = useState([]);
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });

  async function load() {
    setLoading(true);
    const query = buildQuery({ q, status, vendor_id: vendorId, date_from: range.from, date_to: range.to });
    try { setRows(await api.get(`/history${query}`)); }
    catch (e) { toast.err(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { api.get("/vendors").then(setVendors).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(load, 220); return () => clearTimeout(t); },
    [q, status, vendorId, range.from, range.to]);

  const totals = useMemo(() => {
    const sent = rows.filter((r) => r.status === "sent");
    return { events: rows.length, delivered: sent.length,
      failed: rows.filter((r) => r.status === "failed").length,
      amount: sent.reduce((a, r) => a + (r.amount || 0), 0) };
  }, [rows]);

  async function resend(r) {
    if (!confirm(`Resend confirmation ${r.confirmation_number} to ${r.to_email}?`)) return;
    try { const res = await api.post(`/confirmations/${r.confirmation_id}/send`); toast.ok(res.detail); load(); }
    catch (e) { toast.err(e.message); }
  }

  return (
    <>
      <div className="page-head">
        <div><h1>Send history</h1><p>Every email delivery is logged here. Filter and search by date range.</p></div>
      </div>

      <div className="stats">
        <div className="stat"><div className="label">Send events</div><div className="value">{totals.events}</div></div>
        <div className="stat"><div className="label">Delivered</div><div className="value">{totals.delivered}</div></div>
        <div className="stat"><div className="label">Failed</div><div className="value">{totals.failed}</div></div>
        <div className="stat"><div className="label">Amount delivered</div><div className="value accent">{fmtMoney(totals.amount)}</div></div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <DateRangeBar value={range} onChange={setRange} />
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon.search />
          <input className="input" placeholder="Search by vendor, confirmation # or email…"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" style={{ width: "auto" }} value={vendorId} onChange={(e) => setVendorId(e.target.value)}>
          <option value="">All vendors</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <div className="tabs">
          {STATUS_TABS.map(([val, label]) => (
            <button key={val} className={`chip ${status === val ? "chip-on" : ""}`} onClick={() => setStatus(val)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? <div className="center-spin"><span className="spinner" /></div> :
          rows.length === 0 ? <div className="empty"><Icon.send /><div>No send events in this range yet.</div></div> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr>
                  <th>Sent at</th><th>Vendor</th><th>To</th><th>Confirmation #</th>
                  <th style={{ textAlign: "right" }}>Amount</th><th>Result</th><th>By</th>
                  <th style={{ textAlign: "right" }}>Actions</th>
                </tr></thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{fmtDateTime(r.sent_at)}</td>
                      <td className="vname">{r.vendor_name || "—"}</td>
                      <td className="vsub">{r.to_email || "—"}</td>
                      <td className="mono">{r.confirmation_number || "—"}</td>
                      <td style={{ textAlign: "right" }} className="amount">{fmtMoney(r.amount)}</td>
                      <td>
                        <span className={`badge ${r.status === "sent" ? "badge-sent" : "badge-draft"}`}
                          title={r.error || ""} style={r.status === "failed" ? { background: "var(--danger-bg)", color: "var(--danger)" } : undefined}>
                          <span className="dot" />{r.status === "sent" ? "Delivered" : "Failed"}
                        </span>
                      </td>
                      <td className="vsub">{r.sent_by || "—"}</td>
                      <td>
                        <div className="rowactions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openPdf(r.confirmation_id).catch((e) => toast.err(e.message))}><Icon.doc /> PDF</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => resend(r)}>Resend</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>
    </>
  );
}
