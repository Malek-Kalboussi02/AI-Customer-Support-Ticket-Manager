import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../api";
import { categories, label, type ChatTurn, type Ticket, type TicketMessage } from "../types";
import CustomerChat from "./CustomerChat";

const STORAGE_KEY = "support-desk-customer-ticket-ids";

function readRememberedIds(): number[] {
  try {
    const value = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? "[]");
    return Array.isArray(value) ? value.filter((id): id is number => Number.isInteger(id) && id > 0) : [];
  } catch { return []; }
}

function rememberIds(ids: number[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(ids)); } catch { /* The app still works for this session. */ }
}

function transcript(messages: ChatTurn[]) {
  return messages
    .map(message => `${message.role === "user" ? "Customer" : "AI assistant"}: ${message.content}`)
    .join("\n\n");
}

export default function CustomerPortal() {
  const [ids, setIds] = useState<number[]>(readRememberedIds);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [messages, setMessages] = useState<TicketMessage[]>([]);
  const [handoff, setHandoff] = useState<ChatTurn[] | null>(null);
  const [subject, setSubject] = useState("");
  const [category, setCategory] = useState<(typeof categories)[number]>("general");
  const [chatKey, setChatKey] = useState(0);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const handoffPanel = useRef<HTMLElement>(null);

  async function loadTickets(ticketIds = ids) {
    setLoading(true); setError("");
    const results = await Promise.allSettled(ticketIds.map(id => api.get(id)));
    const available = results.flatMap(result => result.status === "fulfilled" ? [result.value] : []);
    const availableIds = available.map(ticket => ticket.id);
    setTickets(available.sort((a, b) => b.id - a.id));
    if (availableIds.length !== ticketIds.length) { setIds(availableIds); rememberIds(availableIds); }
    setLoading(false);
  }

  useEffect(() => { void loadTickets(); }, []);
  useEffect(() => { if (handoff) handoffPanel.current?.scrollIntoView({behavior: "smooth", block: "start"}); }, [handoff]);

  async function openTicket(ticket: Ticket) {
    setSelected(ticket); setMessages([]); setError(""); setNotice("Loading conversation…");
    try { setMessages(await api.listMessages(ticket.id)); setNotice(""); }
    catch (error) { setError(error instanceof Error ? error.message : "Could not load the conversation."); setNotice(""); }
  }

  function prepareHandoff(chat: ChatTurn[]) {
    const firstQuestion = chat.find(message => message.role === "user")?.content ?? "Help requested from AI chat";
    setSubject(firstQuestion.slice(0, 200)); setCategory("general"); setHandoff(chat);
    setError(""); setNotice("Review the details, then send the conversation to a human agent.");
  }

  async function submitHandoff(event: FormEvent) {
    event.preventDefault();
    if (!handoff) return;
    setSubmitting(true); setError(""); setNotice("");
    const description = `Chat transcript before human handoff:\n\n${transcript(handoff)}`.slice(0, 10000);
    try {
      const ticket = await api.create({subject, description, category, priority: "medium", status: "open"});
      const nextIds = [ticket.id, ...ids.filter(id => id !== ticket.id)];
      setIds(nextIds); rememberIds(nextIds); setTickets(current => [ticket, ...current]);
      setHandoff(null); setSubject(""); setCategory("general"); setChatKey(value => value + 1);
      await openTicket(ticket); setNotice(`Ticket #${String(ticket.id).padStart(4, "0")} was sent to human support.`);
    } catch (error) { setError(error instanceof Error ? error.message : "Could not send the ticket to human support."); }
    finally { setSubmitting(false); }
  }

  async function refreshSelected() {
    if (!selected) return;
    setLoading(true); setError("");
    try {
      const [ticket, conversation] = await Promise.all([api.get(selected.id), api.listMessages(selected.id)]);
      setSelected(ticket); setMessages(conversation);
      setTickets(current => current.map(item => item.id === ticket.id ? ticket : item));
      setNotice("Request refreshed.");
    } catch (error) { setError(error instanceof Error ? error.message : "Could not refresh your request."); }
    finally { setLoading(false); }
  }

  return <main className="customer-main">
    <header><div><p className="eyebrow">CUSTOMER SUPPORT</p><h1>How can we help<span>?</span></h1><p className="subtitle">Ask the AI assistant first, or send the conversation to a human support agent.</p></div></header>
    <section className="customer-grid chat-first-grid">
      <CustomerChat key={chatKey} onEscalate={prepareHandoff}/>
      <section className="panel customer-requests" aria-labelledby="your-requests-heading">
        <div className="panel-heading"><div><p className="eyebrow">HUMAN SUPPORT</p><h2 id="your-requests-heading">Your tickets</h2></div><button className="secondary" onClick={() => void loadTickets()}>Refresh</button></div>
        {loading && tickets.length === 0 ? <p className="conversation-empty">Loading tickets…</p> : tickets.length === 0 ? <div className="empty"><h3>No human tickets yet</h3><p>Use “Talk to a human” in the chat when you need an agent.</p></div> : <div className="request-cards">{tickets.map(ticket => <button className={`request-card ${selected?.id === ticket.id ? "selected" : ""}`} key={ticket.id} onClick={() => void openTicket(ticket)}><span><small>#{String(ticket.id).padStart(4, "0")}</small><strong>{ticket.subject}</strong></span><span className={`badge ${ticket.status}`}>{label(ticket.status)}</span></button>)}</div>}
      </section>
    </section>

    {handoff && <section ref={handoffPanel} className="panel handoff-panel" aria-labelledby="handoff-heading">
      <div className="handoff-heading"><div><p className="eyebrow">AI → HUMAN HANDOFF</p><h2 id="handoff-heading">Send this conversation to support</h2><p>A human agent will receive the transcript and can reply through your ticket.</p></div><button className="secondary" onClick={() => setHandoff(null)}>Cancel</button></div>
      <form onSubmit={submitHandoff}>
        <label>Ticket subject<input required maxLength={200} value={subject} onChange={event => setSubject(event.target.value)} /></label>
        <label>Topic<select value={category} onChange={event => setCategory(event.target.value as typeof category)}>{categories.map(value => <option key={value} value={value}>{label(value)}</option>)}</select></label>
        <details><summary>Preview transcript sent to the agent</summary><pre>{transcript(handoff)}</pre></details>
        <div className="actions"><button type="button" className="secondary" onClick={() => setHandoff(null)}>Keep chatting</button><button disabled={submitting}>{submitting ? "Sending…" : "Send ticket to human support"}</button></div>
      </form>
    </section>}

    {notice && <p className="notice" role="status">{notice}</p>}{error && <p className="error" role="alert">{error}</p>}
    {selected && <section className="panel customer-detail" aria-labelledby="customer-detail-heading">
      <div className="panel-heading"><div><p className="eyebrow">HUMAN SUPPORT TICKET #{String(selected.id).padStart(4, "0")}</p><h2 id="customer-detail-heading">{selected.subject}</h2></div><button className="secondary" onClick={refreshSelected}>Refresh conversation</button></div>
      <div className="detail-tags"><span className={`badge ${selected.status}`}>{label(selected.status)}</span><span className="capitalize">{selected.category}</span></div>
      <article className="original-request"><strong>Conversation forwarded to support</strong><p>{selected.description}</p><time>{new Date(selected.created_at).toLocaleString()}</time></article>
      <section className="conversation" aria-labelledby="customer-conversation-heading"><h3 id="customer-conversation-heading">Messages from the human support team</h3>{messages.length === 0 ? <p className="conversation-empty">A human agent has not posted a reply yet. Use refresh to check again.</p> : <div className="message-list">{messages.map(message => <article className={`message ${message.sender}`} key={message.id}><div><strong>{message.sender === "agent" ? "Support agent" : "You"}</strong><time>{new Date(message.created_at).toLocaleString()}</time></div><p>{message.body}</p></article>)}</div>}</section>
    </section>}
    <footer>Support Desk <span>AI assistant + human support handoff simulation</span></footer>
  </main>;
}
