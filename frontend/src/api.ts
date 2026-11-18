import type { ChatReply, ChatTurn, DraftReply, MessageSender, Ticket, TicketInput, TicketMessage, Status } from "./types";

async function request<T>(path: string, options?: RequestInit): Promise<T> {
  const response = await fetch(`/api${path}`, options);
  if (!response.ok) {
    const body = await response.json().catch(() => null);
    const detail = body?.detail;
    const message = typeof detail === "string" ? detail : Array.isArray(detail)
      ? detail.map((item: { loc: string[]; msg: string }) => `${item.loc.slice(1).join(".")}: ${item.msg}`).join("; ")
      : `Request failed (${response.status})`;
    throw new Error(message);
  }
  if (response.status === 204) return undefined as T;
  return response.json();
}
const json = (method: string, body: unknown) => ({method, headers: {"Content-Type": "application/json"}, body: JSON.stringify(body)});
export const api = {
  chat: (messages: ChatTurn[]) => request<ChatReply>("/chat", json("POST", {messages})),
  // Fetch every page so the dashboard never silently omits tickets after the first 100.
  async list(status: Status | ""): Promise<Ticket[]> {
    const tickets: Ticket[] = [];
    for (let offset = 0; ; offset += 100) {
      const page = await request<Ticket[]>(`/tickets?limit=100&offset=${offset}${status ? `&status=${status}` : ""}`);
      tickets.push(...page);
      if (page.length < 100) return tickets;
    }
  },
  get: (id: number) => request<Ticket>(`/tickets/${id}`),
  create: (body: TicketInput) => request<Ticket>("/tickets", json("POST", body)),
  update: (id: number, body: Partial<TicketInput>) => request<Ticket>(`/tickets/${id}`, json("PATCH", body)),
  generateDraft: (id: number) => request<DraftReply>(`/tickets/${id}/draft-reply`, {method: "POST"}),
  listMessages: (id: number) => request<TicketMessage[]>(`/tickets/${id}/messages`),
  addMessage: (id: number, body: string, sender: MessageSender) =>
    request<TicketMessage>(`/tickets/${id}/messages`, json("POST", {body, sender})),
  remove: (id: number) => request<void>(`/tickets/${id}`, {method: "DELETE"}),
};
