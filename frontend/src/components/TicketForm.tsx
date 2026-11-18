import { useState, type FormEvent } from "react";
import { categories, priorities, statuses, label, type TicketInput } from "../types";

export default function TicketForm({ initial, submitLabel, onSave, onCancel }: {
  initial?: TicketInput; submitLabel: string;
  onSave: (input: TicketInput) => Promise<void>; onCancel: () => void;
}) {
  const [form, setForm] = useState<TicketInput>({
    // A retrieved Ticket also has IDs/timestamps; send only editable fields.
    subject: initial?.subject ?? "", description: initial?.description ?? "",
    category: initial?.category ?? "general", priority: initial?.priority ?? "medium",
    status: initial?.status ?? "open",
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError("");
    try { await onSave(form); } catch (error) { setError(error instanceof Error ? error.message : "Could not save ticket."); }
    finally { setBusy(false); }
  }
  return <form onSubmit={submit}>
    <fieldset disabled={busy}>
      <label>Subject<input autoFocus required maxLength={200} value={form.subject} onChange={e => setForm({...form, subject: e.target.value})}/></label>
      <label>Description<textarea required maxLength={10000} rows={6} value={form.description} onChange={e => setForm({...form, description: e.target.value})}/></label>
      <div className="form-grid">
        <label>Category<select value={form.category} onChange={e => setForm({...form, category: e.target.value as TicketInput["category"]})}>{categories.map(v => <option key={v} value={v}>{label(v)}</option>)}</select></label>
        <label>Priority<select value={form.priority} onChange={e => setForm({...form, priority: e.target.value as TicketInput["priority"]})}>{priorities.map(v => <option key={v} value={v}>{label(v)}</option>)}</select></label>
        <label>Status<select value={form.status} onChange={e => setForm({...form, status: e.target.value as TicketInput["status"]})}>{statuses.map(v => <option key={v} value={v}>{label(v)}</option>)}</select></label>
      </div>
      {error && <p role="alert" className="error">{error}</p>}
      <div className="actions"><button type="button" className="secondary" onClick={onCancel}>Cancel</button><button type="submit">{busy ? "Saving…" : submitLabel}</button></div>
    </fieldset>
  </form>;
}
