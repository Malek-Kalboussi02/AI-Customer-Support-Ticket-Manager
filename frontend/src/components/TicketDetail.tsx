import { useEffect, useState } from "react";
import { api } from "../api";
import { label, type Ticket, type TicketInput, type TicketMessage } from "../types";
import TicketForm from "./TicketForm";

export default function TicketDetail({ ticket, onClose, onChanged }: {ticket: Ticket; onClose: () => void; onChanged: (ticket?: Ticket) => void}) {
  const [editing, setEditing] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [draft, setDraft] = useState("");
  const [draftModel, setDraftModel] = useState("");
  const [generating, setGenerating] = useState(false);
  const [copyNotice, setCopyNotice] = useState("");
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [messagesLoading, setMessagesLoading] = useState(true);
  const [posting, setPosting] = useState(false);
  useEffect(() => {
    let active = true;
    setMessagesLoading(true);
    api.listMessages(ticket.id)
      .then(data => { if (active) setMessages(data); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : "Could not load messages."); })
      .finally(() => { if (active) setMessagesLoading(false); });
    return () => { active = false; };
  }, [ticket.id]);
  async function save(input: TicketInput) {
    const updated = await api.update(ticket.id, input);
    onChanged(updated); setEditing(false);
  }
  async function remove() {
    setBusy(true); setError("");
    try { await api.remove(ticket.id); onChanged(); } catch (error) { setError(error instanceof Error ? error.message : "Could not delete ticket."); }
    finally { setBusy(false); }
  }
  async function generateDraft() {
    setGenerating(true); setError(""); setCopyNotice("");
    try {
      const result = await api.generateDraft(ticket.id);
      setDraft(result.reply); setDraftModel(result.model);
    } catch (error) {
      setError(error instanceof Error ? error.message : "Could not generate a reply.");
    } finally { setGenerating(false); }
  }
  async function copyDraft() {
    try {
      await navigator.clipboard.writeText(draft);
      setCopyNotice("Copied to clipboard.");
    } catch { setError("Could not copy automatically. Select the draft and copy it manually."); }
  }
  async function postReply() {
    if (!draft.trim()) return;
    setPosting(true); setError(""); setCopyNotice("");
    try {
      const message = await api.addMessage(ticket.id, draft, "agent");
      setMessages(current => [...current, message]);
      setDraft(""); setDraftModel(""); setCopyNotice("Reply posted to the customer portal.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not post the reply."); }
    finally { setPosting(false); }
  }
  return <section className="panel" aria-labelledby="detail-heading"><div className="panel-heading"><p className="eyebrow">TICKET #{String(ticket.id).padStart(4, "0")}</p><button className="secondary" onClick={onClose}>Close details</button></div>
    <h2 id="detail-heading">{editing ? "Edit ticket" : ticket.subject}</h2>
    {editing ? <TicketForm initial={ticket} submitLabel="Save changes" onSave={save} onCancel={() => setEditing(false)}/> : <>
      <div className="detail-tags"><span className={`badge ${ticket.status}`}>{label(ticket.status)}</span><span className={`priority ${ticket.priority}`}>{ticket.priority} priority</span><span className="capitalize">{ticket.category}</span></div>
      <p className="description">{ticket.description}</p>
      <dl><dt>Created</dt><dd>{new Date(ticket.created_at).toLocaleString()}</dd><dt>Last updated</dt><dd>{new Date(ticket.updated_at).toLocaleString()}</dd></dl>
      <section className="ai-reply" aria-labelledby="ai-reply-heading">
        <div className="ai-reply-heading"><div><p className="eyebrow">LOCAL AI · OLLAMA</p><h3 id="ai-reply-heading">Draft a customer reply</h3></div><button disabled={generating} onClick={generateDraft}>{generating ? "Writing…" : draft ? "Regenerate draft" : "Generate draft"}</button></div>
        <p className="ai-help">Review and edit every draft before sending it to a customer. Nothing is sent automatically.</p>
        {draft && <><label>Editable response<textarea rows={8} value={draft} onChange={event => { setDraft(event.target.value); setCopyNotice(""); }}/></label><div className="draft-footer"><small>Generated locally with {draftModel}</small><div className="inline-actions"><button className="secondary" onClick={copyDraft}>Copy response</button><button disabled={posting || !draft.trim()} onClick={postReply}>{posting ? "Posting…" : "Post to customer"}</button></div></div></>}
        {copyNotice && <p className="success" role="status">{copyNotice}</p>}
      </section>
      <section className="conversation" aria-labelledby="conversation-heading">
        <div className="conversation-heading"><div><p className="eyebrow">CUSTOMER CONVERSATION</p><h3 id="conversation-heading">Posted replies</h3></div><button className="secondary" onClick={async () => { setMessagesLoading(true); try { setMessages(await api.listMessages(ticket.id)); } catch (error) { setError(error instanceof Error ? error.message : "Could not refresh messages."); } finally { setMessagesLoading(false); } }}>Refresh</button></div>
        {messagesLoading ? <p className="conversation-empty">Loading messages…</p> : messages.length === 0 ? <p className="conversation-empty">No replies have been posted yet.</p> : <div className="message-list">{messages.map(message => <article className={`message ${message.sender}`} key={message.id}><div><strong>{message.sender === "agent" ? "Support agent" : "Customer"}</strong><time>{new Date(message.created_at).toLocaleString()}</time></div><p>{message.body}</p></article>)}</div>}
      </section>
      {error && <p className="error" role="alert">{error}</p>}
      {confirmDelete ? <div className="delete-confirm"><p>Delete this ticket permanently?</p><div className="actions"><button disabled={busy} className="secondary" onClick={() => setConfirmDelete(false)}>Keep ticket</button><button disabled={busy} className="danger" onClick={remove}>{busy ? "Deleting…" : "Confirm deletion"}</button></div></div> : <div className="actions"><button className="secondary danger-text" onClick={() => setConfirmDelete(true)}>Delete ticket</button><button onClick={() => setEditing(true)}>Edit ticket</button></div>}
    </>}
  </section>;
}
