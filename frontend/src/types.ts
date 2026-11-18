export const statuses = ["open", "in_progress", "resolved"] as const;
export const priorities = ["low", "medium", "high"] as const;
export const categories = ["account", "billing", "technical", "general"] as const;
export type Status = typeof statuses[number];
export interface TicketInput {
  subject: string;
  description: string;
  category: typeof categories[number];
  priority: typeof priorities[number];
  status: Status;
}
export interface Ticket extends TicketInput {
  id: number;
  created_at: string;
  updated_at: string;
}
export interface DraftReply {
  reply: string;
  model: string;
}
export type ChatRole = "user" | "assistant";
export interface ChatTurn {
  role: ChatRole;
  content: string;
}
export interface ChatReply {
  reply: string;
  model: string;
}
export type MessageSender = "customer" | "agent";
export interface TicketMessage {
  id: number;
  ticket_id: number;
  sender: MessageSender;
  body: string;
  created_at: string;
}
export const label = (value: string) => value.replaceAll("_", " ");
