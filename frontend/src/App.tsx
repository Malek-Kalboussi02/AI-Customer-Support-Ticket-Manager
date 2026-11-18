import { useEffect, useRef, useState } from "react";
import { api } from "./api";
import { statuses, label, type Status, type Ticket } from "./types";
import CustomerPortal from "./components/CustomerPortal";
import TicketDetail from "./components/TicketDetail";
import TicketForm from "./components/TicketForm";
import TicketTable from "./components/TicketTable";

type View = "customer" | "agent";

export default function App() {
  const [view, setView] = useState<View>("customer");
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [filter, setFilter] = useState<Status | "">("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [creating, setCreating] = useState(false);
  const [selected, setSelected] = useState<Ticket | null>(null);
  const [revision, setRevision] = useState(0);
  const selectionRequest = useRef(0);
  const panel = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (view !== "agent") return;
    let active = true;
    setLoading(true); setError("");
    api.list(filter)
      .then(data => { if (active) setTickets(data); })
      .catch(error => { if (active) setError(error instanceof Error ? error.message : "Could not load tickets."); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [filter, revision, view]);

  useEffect(() => {
    if (creating || selected) panel.current?.scrollIntoView({behavior: "smooth", block: "start"});
  }, [creating, selected?.id]);

  async function openTicket(id: number) {
    const request = ++selectionRequest.current;
    setError(""); setNotice("Loading ticket details…");
    try {
      const ticket = await api.get(id);
      if (request === selectionRequest.current) {
        setSelected(ticket); setCreating(false); setNotice("");
      }
    } catch (error) {
      if (request === selectionRequest.current) {
        setError(error instanceof Error ? error.message : "Could not load ticket."); setNotice("");
      }
    }
  }

  return <div className="app-shell">
    <aside>
      <button className="brand brand-button" onClick={() => setView("customer")}>S<span>Support Desk</span></button>
      <div className="workspace-label">VIEWS</div>
      <nav className="view-nav" aria-label="Application view">
        <button className={view === "customer" ? "nav-active" : "nav-link"} onClick={() => setView("customer")}>◎ &nbsp; Customer portal</button>
        <button className={view === "agent" ? "nav-active" : "nav-link"} onClick={() => setView("agent")}>▤ &nbsp; Agent dashboard</button>
      </nav>
      <div className="milestone"><span className="dot"/> Milestone 04<p>AI first, human when needed.</p><small>Customers chat with a local AI, then explicitly forward the transcript to an agent.</small></div>
    </aside>

    {view === "customer" ? <CustomerPortal/> : <main>
      <header>
        <div><p className="eyebrow">CUSTOMER SUPPORT / AGENT OVERVIEW</p><h1>Ticket manager<span>.</span></h1><p className="subtitle">Keep requests organized. Give every customer a next step.</p></div>
        <button onClick={() => { ++selectionRequest.current; setSelected(null); setCreating(true); }}>＋ New ticket</button>
      </header>
      <section className="intro"><div><span className="dot"/><strong>Your support workspace</strong><p>Create, track, draft, and post replies to customer requests.</p></div><span className="local-label">LOCAL · SQLITE + OLLAMA</span></section>
      <section className="ticket-section" aria-labelledby="tickets-heading">
        <div className="section-heading"><h2 id="tickets-heading">All tickets</h2><span>{loading ? "Loading…" : error ? "Unavailable" : `${tickets.length} ${filter ? label(filter) + " " : ""}tickets`}</span></div>
        <div className="filters" aria-label="Filter by status">
          {(["", ...statuses] as const).map(value => <button key={value} className={filter === value ? "filter active" : "filter"} aria-pressed={filter === value} onClick={() => setFilter(value)}>{value ? label(value) : "All statuses"}</button>)}
          <button className="refresh secondary" onClick={() => setRevision(value => value + 1)}>Refresh</button>
        </div>
        {error && <p className="error" role="alert">{error} <button className="secondary" onClick={() => setRevision(value => value + 1)}>Retry list</button></p>}
        {loading ? <p className="empty" role="status">Loading tickets…</p> : !error && <TicketTable tickets={tickets} onSelect={openTicket}/>} 
      </section>
      <p role="status" className="notice">{notice}</p>
      <div ref={panel}>
        {creating && <section className="panel" aria-labelledby="create-heading"><p className="eyebrow">NEW REQUEST</p><h2 id="create-heading">Create a ticket</h2><TicketForm submitLabel="Create ticket" onCancel={() => setCreating(false)} onSave={async input => { const ticket = await api.create(input); setCreating(false); setSelected(ticket); setRevision(value => value + 1); setNotice("Ticket created."); }}/></section>}
        {selected && <TicketDetail key={selected.id} ticket={selected} onClose={() => setSelected(null)} onChanged={ticket => { setSelected(ticket ?? null); setRevision(value => value + 1); setNotice(ticket ? "Ticket updated." : "Ticket deleted."); }}/>} 
      </div>
      <footer>Support Desk <span>AI Customer Support Ticket Manager · Milestone 04</span></footer>
    </main>}
  </div>;
}
