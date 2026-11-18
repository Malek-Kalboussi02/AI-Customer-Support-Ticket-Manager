import { label, type Ticket } from "../types";

export default function TicketTable({ tickets, onSelect }: { tickets: Ticket[]; onSelect: (id: number) => void }) {
  if (!tickets.length) return <div className="empty"><h3>No tickets here yet</h3><p>Create a ticket or choose another status.</p></div>;
  return <div className="table-wrap"><table><caption className="sr-only">Support tickets matching the selected status</caption><thead><tr><th>Ticket</th><th>Category</th><th>Priority</th><th>Status</th><th>Created</th></tr></thead><tbody>
    {tickets.map(ticket => <tr key={ticket.id}>
      <td><span className="ticket-id">#{String(ticket.id).padStart(4, "0")}</span><button className="ticket-link" onClick={() => onSelect(ticket.id)}>{ticket.subject}</button></td>
      <td className="capitalize">{ticket.category}</td><td><span className={`priority ${ticket.priority}`}>{ticket.priority}</span></td>
      <td><span className={`badge ${ticket.status}`}>{label(ticket.status)}</span></td><td>{new Date(ticket.created_at).toLocaleDateString()}</td>
    </tr>)}
  </tbody></table></div>;
}
