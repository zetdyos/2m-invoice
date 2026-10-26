import { useState } from "react";
import { api } from "../api.js";
import { useToast, Modal } from "../components/ui.jsx";

function today() { return new Date().toISOString().slice(0, 10); }

export default function ConfirmationForm({ vendors, confirmation, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!confirmation;
  const [form, setForm] = useState({
    vendor_id: confirmation?.vendor_id || "",
    confirmation_number: confirmation?.confirmation_number || "",
    invoices: confirmation?.invoices || "",
    date: confirmation?.date || today(),
    amount: confirmation?.amount ?? "",
  });
  const [busy, setBusy] = useState(false);

  function set(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  function validate() {
    if (!form.vendor_id) return "Please select a vendor.";
    if (form.amount === "" || isNaN(Number(form.amount)) || Number(form.amount) < 0) return "Enter a valid amount.";
    if (!form.date) return "Please choose a date.";
    return null;
  }

  async function save(thenSend) {
    const err = validate();
    if (err) { toast.err(err); return; }
    setBusy(true);
    const payload = {
      vendor_id: Number(form.vendor_id),
      confirmation_number: form.confirmation_number.trim(),
      invoices: form.invoices.replace(/\r/g, ""),
      date: form.date,
      amount: Number(form.amount),
    };
    try {
      const saved = isEdit
        ? await api.put(`/confirmations/${confirmation.id}`, payload)
        : await api.post("/confirmations", payload);
      if (thenSend) {
        try { const r = await api.post(`/confirmations/${saved.id}/send`); toast.ok(r.detail); }
        catch (e) { toast.err(`Saved, but email failed: ${e.message}`); onSaved(); return; }
      } else {
        toast.ok(isEdit ? "Confirmation updated" : "Confirmation created");
      }
      onSaved();
    } catch (e) { toast.err(e.message); }
    finally { setBusy(false); }
  }

  const invoiceCount = form.invoices.split("\n").map((s) => s.trim()).filter(Boolean).length;

  return (
    <Modal
      title={isEdit ? `Edit confirmation #${confirmation.confirmation_number || confirmation.id}` : "New ACH confirmation"}
      onClose={onClose}
      footer={
        <>
          <button className="btn btn-ghost" onClick={onClose} disabled={busy}>Cancel</button>
          <button className="btn btn-ghost" onClick={() => save(false)} disabled={busy}>
            {busy ? <span className="spinner" /> : isEdit ? "Save" : "Create"}
          </button>
          <button className="btn btn-primary" onClick={() => save(true)} disabled={busy}>
            {isEdit ? "Save & Send" : "Create & Send"}
          </button>
        </>
      }
    >
      <div className="field">
        <label>Vendor</label>
        <select className="select" value={form.vendor_id} onChange={(e) => set("vendor_id", e.target.value)}>
          <option value="">Select a vendor…</option>
          {vendors.filter((v) => v.active || v.id === confirmation?.vendor_id).map((v) => (
            <option key={v.id} value={v.id}>{v.name}{v.account ? ` · acct ${v.account}` : ""}</option>
          ))}
        </select>
      </div>
      <div className="row">
        <div className="field">
          <label>Date</label>
          <input type="date" className="input" value={form.date} onChange={(e) => set("date", e.target.value)} />
        </div>
        <div className="field">
          <label>Confirmation #</label>
          <input className="input" value={form.confirmation_number}
            onChange={(e) => set("confirmation_number", e.target.value)} placeholder="e.g. 629353" />
        </div>
      </div>
      <div className="field">
        <label>Amount (USD)</label>
        <input className="input" inputMode="decimal" value={form.amount}
          onChange={(e) => set("amount", e.target.value.replace(/[^0-9.]/g, ""))} placeholder="0.00" />
      </div>
      <div className="field">
        <label>Invoices <span style={{ color: "var(--muted)", fontWeight: 400 }}>· one per line ({invoiceCount})</span></label>
        <textarea className="textarea" value={form.invoices} onChange={(e) => set("invoices", e.target.value)}
          placeholder={"41379056\n41381096\n41379394"} rows={5} />
        <div className="hint">Each line becomes a row on the PDF and in the email.</div>
      </div>
    </Modal>
  );
}
