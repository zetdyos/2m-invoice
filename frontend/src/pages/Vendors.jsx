import { useEffect, useState } from "react";
import { api } from "../api.js";
import { useToast, Modal, Icon } from "../components/ui.jsx";

export default function Vendors() {
  const toast = useToast();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [q, setQ] = useState("");
  const [editing, setEditing] = useState(null);

  async function load() {
    setLoading(true);
    try { setRows(await api.get(`/vendors${q ? `?q=${encodeURIComponent(q)}` : ""}`)); }
    catch (e) { toast.err(e.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { const t = setTimeout(load, 220); return () => clearTimeout(t); }, [q]);

  async function remove(v) {
    if (!confirm(`Delete vendor "${v.name}"?`)) return;
    try { await api.del(`/vendors/${v.id}`); toast.ok("Vendor deleted"); load(); }
    catch (e) { toast.err(e.message); load(); }  // 409 -> deactivated; reload to reflect
  }

  return (
    <>
      <div className="page-head">
        <div><h1>Vendors</h1><p>Your vendor directory. Email and account number are used on every confirmation.</p></div>
        <button className="btn btn-primary" onClick={() => setEditing({})}><Icon.plus /> New vendor</button>
      </div>

      <div className="toolbar">
        <div className="search">
          <Icon.search />
          <input className="input" placeholder="Search vendors…" value={q} onChange={(e) => setQ(e.target.value)} />
        </div>
      </div>

      <div className="card">
        {loading ? <div className="center-spin"><span className="spinner" /></div> :
          rows.length === 0 ? <div className="empty"><Icon.vendors /><div>No vendors yet.</div></div> : (
            <div className="table-wrap">
              <table className="data">
                <thead><tr><th>Name</th><th>Email</th><th>Account #</th><th>Status</th><th style={{ textAlign: "right" }}>Actions</th></tr></thead>
                <tbody>
                  {rows.map((v) => (
                    <tr key={v.id}>
                      <td className="vname">{v.name}</td>
                      <td className="vsub">{v.email || "—"}</td>
                      <td className="mono">{v.account || "—"}</td>
                      <td>
                        <span className={`badge ${v.active ? "badge-sent" : "badge-draft"}`}>
                          <span className="dot" />{v.active ? "Active" : "Inactive"}
                        </span>
                      </td>
                      <td>
                        <div className="rowactions">
                          <button className="btn btn-ghost btn-sm" onClick={() => setEditing(v)}>Edit</button>
                          <button className="btn btn-danger btn-sm" onClick={() => remove(v)}>Delete</button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
      </div>

      {editing && <VendorForm vendor={editing.id ? editing : null} onClose={() => setEditing(null)}
        onSaved={() => { setEditing(null); load(); }} />}
    </>
  );
}

function VendorForm({ vendor, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!vendor;
  const [form, setForm] = useState({
    name: vendor?.name || "", email: vendor?.email || "",
    account: vendor?.account || "", active: vendor?.active ?? true,
  });
  const [busy, setBusy] = useState(false);
  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function save() {
    if (!form.name.trim()) { toast.err("Name is required."); return; }
    setBusy(true);
    try {
      if (isEdit) await api.put(`/vendors/${vendor.id}`, form);
      else await api.post("/vendors", form);
      toast.ok(isEdit ? "Vendor updated" : "Vendor created");
      onSaved();
    } catch (e) { toast.err(e.message); }
    finally { setBusy(false); }
  }

  return (
    <Modal title={isEdit ? "Edit vendor" : "New vendor"} onClose={onClose}
      footer={<>
        <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
        <button className="btn btn-primary" onClick={save} disabled={busy}>{busy ? <span className="spinner" /> : "Save"}</button>
      </>}>
      <div className="field"><label>Name</label>
        <input className="input" value={form.name} onChange={(e) => set("name", e.target.value)} autoFocus /></div>
      <div className="field"><label>Email</label>
        <input className="input" type="email" value={form.email} onChange={(e) => set("email", e.target.value)}
          placeholder="ap@vendor.com" /></div>
      <div className="field"><label>Account #</label>
        <input className="input" value={form.account} onChange={(e) => set("account", e.target.value)}
          placeholder="Your account number with this vendor" /></div>
      <div className="field">
        <label style={{ display: "flex", alignItems: "center", gap: 10, cursor: "pointer" }}>
          <input type="checkbox" checked={form.active} onChange={(e) => set("active", e.target.checked)} />
          Active (available when creating confirmations)
        </label>
      </div>
    </Modal>
  );
}
