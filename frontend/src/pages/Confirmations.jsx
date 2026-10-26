import { useEffect, useMemo, useState } from "react";
import { api, openPdf } from "../api.js";
import { useToast, Modal, Icon, fmtMoney, fmtDate } from "../components/ui.jsx";
import { DateRangeBar, buildQuery } from "../components/filters.jsx";
import ConfirmationForm from "./ConfirmationForm.jsx";

const STATUS_TABS = [["", "All"], ["sent", "Sent"], ["draft", "Draft"]];

export default function Confirmations() {
  const toast = useToast();
  const [vendors, setVendors] = useState([]);
  const [rows, setRows] = useState([]);
  const [summary, setSummary] = useState(null);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [status, setStatus] = useState("");
  const [vendorId, setVendorId] = useState("");
  const [range, setRange] = useState({ from: "", to: "" });
  const [editing, setEditing] = useState(null);   // confirmation object or {} for new
  const [sendingId, setSendingId] = useState(null);

  async function load() {
    setLoading(true);
    const query = buildQuery({ q, status, vendor_id: vendorId, date_from: range.from, date_to: range.to });
    try {
      const [list, sum] = await Promise.all([
        api.get(`/confirmations${query}`),
        api.get(`/confirmations/summary${buildQuery({ vendor_id: vendorId, date_from: range.from, date_to: range.to })}`),
      ]);
      setRows(list); setSummary(sum);
    } catch (e) { toast.err(e.message); }
    finally { setLoading(false); }
  }

  useEffect(() => { api.get("/vendors").then(setVendors).catch(() => {}); }, []);
  useEffect(() => { const t = setTimeout(load, 220); return () => clearTimeout(t); },
    [q, status, vendorId, range.from, range.to]);

  async function send(row) {
    if (!row.vendor_email) { toast.err("This vendor has no email address."); return; }
    if (!confirm(`Send ACH confirmation ${row.confirmation_number} to ${row.vendor_email}?`)) return;
    setSendingId(row.id);
    try { const r = await api.post(`/confirmations/${row.id}/send`); toast.ok(r.detail); load(); }
    catch (e) { toast.err(e.message); }
    finally { setSendingId(null); }
  }

  async function remove(row) {
    if (!confirm(`Delete confirmation ${row.confirmation_number}? This cannot be undone.`)) return;
    try { await api.del(`/confirmations/${row.id}`); toast.ok("Deleted"); load(); }
    catch (e) { toast.err(e.message); }
  }

  const stats = useMemo(() => summary || { count: 0, total: 0, sent: 0, draft: 0 }, [summary]);

  return (
    <>
      <div className="page-head">
        <div>
          <h1>ACH Confirmations</h1>
          <p>Create confirmations, generate the PDF and email them to your vendors.</p>
        </div>
        <button className="btn btn-primary" onClick={() => setEditing({})}>
          <Icon.plus /> New confirmation
        </button>
      </div>

      <div className="stats">
        <div className="stat"><div className="label">Confirmations</div><div className="value">{stats.count}</div></div>
        <div className="stat"><div className="label">Total amount</div><div className="value accent">{fmtMoney(stats.total)}</div></div>
        <div className="stat"><div className="label">Sent</div><div className="value">{stats.sent}</div></div>
        <div className="stat"><div className="label">Pending</div><div className="value">{stats.draft}</div></div>
      </div>

      <div className="card card-pad" style={{ marginBottom: 18 }}>
        <DateRangeBar value={range} onChange={setRange} />
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon.search />
          <input className="input" placeholder="Search by vendor, confirmation # or invoice…"
            value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
        <select className="select" style={{ width: "auto" }} value={vendorId}
          onChange={(e) => setVendorId(e.target.value)}>
          <option value="">All vendors</option>
          {vendors.map((v) => <option key={v.id} value={v.id}>{v.name}</option>)}
        </select>
        <div className="tabs">
          {STATUS_TABS.map(([val, label]) => (
            <button key={val} className={`chip ${status === val ? "chip-on" : ""}`}
              onClick={() => setStatus(val)}>{label}</button>
          ))}
        </div>
      </div>

      <div className="card">
        {loading ? <div className="center-spin"><span className="spinner" /></div> :
          rows.length === 0 ? (
            <div className="empty"><Icon.empty /><div>No confirmations match your filters.</div></div>
          ) : (
            <div className="table-wrap">
              <table className="data">
                <thead>
                  <tr>
                    <th>Date</th><th>Vendor</th><th>Confirmation #</th>
                    <th>Invoices</th><th style={{ textAlign: "right" }}>Amount</th>
                    <th>Status</th><th style={{ textAlign: "right" }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.id}>
                      <td className="mono">{fmtDate(r.date)}</td>
                      <td>
                        <div className="vname">{r.vendor_name || "—"}</div>
                        <div className="vsub">{r.vendor_email || "no email"}</div>
                      </td>
                      <td className="mono">{r.confirmation_number || "—"}</td>
                      <td className="vsub">{(r.invoices || "").split("\n").filter(Boolean).length} invoice(s)</td>
                      <td style={{ textAlign: "right" }} className="amount">{fmtMoney(r.amount)}</td>
                      <td>
                        <span className={`badge ${r.status === "sent" ? "badge-sent" : "badge-draft"}`}>
                          <span className="dot" />{r.status === "sent" ? "Sent" : "Draft"}
                        </span>
                      </td>
                      <td>
                        <div className="rowactions">
                          <button className="btn btn-ghost btn-sm" onClick={() => openPdf(r.id).catch((e) => toast.err(e.message))}><Icon.doc /> PDF</button>
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(r)}>Edit</button>
                          <button className="btn btn-primary btn-sm" disabled={sendingId === r.id} onClick={() => send(r)}>
                            {sendingId === r.id ? <span className="spinner" /> : <><Icon.send /> Send</>}
                          </button>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(r)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {editing && (
        <ConfirmationForm
          vendors={vendors}
          confirmation={editing.id ? editing : null}
          onClose={() => setEditing(null)}
          onSaved={() => { setEditing(null); load(); }}
          onSavedAndSend={() => { setEditing(null); load(); }}
        />
      )}
    </>
  );
}
