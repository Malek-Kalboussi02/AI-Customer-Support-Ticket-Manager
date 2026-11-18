import { useEffect, useRef, useState, type FormEvent } from "react";
import { api } from "../api";
import type { ChatTurn } from "../types";

const greeting: ChatTurn = {
  role: "assistant",
  content: "Hi! I’m the Support Desk AI assistant. Ask me a question and I’ll try to help. You can send the conversation to a human agent at any time.",
};

export default function CustomerChat({onEscalate}: {onEscalate: (messages: ChatTurn[]) => void}) {
  const [messages, setMessages] = useState<ChatTurn[]>([greeting]);
  const [input, setInput] = useState("");
  const [model, setModel] = useState("");
  const [sending, setSending] = useState(false);
  const [error, setError] = useState("");
  const end = useRef<HTMLDivElement>(null);
  const hasCustomerMessage = messages.some(message => message.role === "user");

  useEffect(() => { end.current?.scrollIntoView({behavior: "smooth", block: "nearest"}); }, [messages]);

  async function send(event: FormEvent) {
    event.preventDefault();
    const content = input.trim();
    if (!content || sending) return;
    const nextMessages = [...messages, {role: "user", content} satisfies ChatTurn];
    setMessages(nextMessages); setInput(""); setSending(true); setError("");
    try {
      const context = nextMessages.slice(-20);
      const result = await api.chat(context);
      setMessages(current => [...current, {role: "assistant", content: result.reply}]);
      setModel(result.model);
    } catch (error) {
      setError(error instanceof Error ? error.message : "The AI assistant could not answer.");
    } finally { setSending(false); }
  }

  function startOver() {
    setMessages([greeting]); setInput(""); setError(""); setModel("");
  }

  return <section className="panel chat-panel" aria-labelledby="assistant-heading">
    <div className="chat-header"><div><p className="eyebrow">LOCAL AI · OLLAMA</p><h2 id="assistant-heading">Chat with support AI</h2></div><span className="online-indicator"><i/> AI assistant</span></div>
    <div className="chat-window" aria-live="polite" aria-label="Chat conversation">
      {messages.map((message, index) => <article className={`chat-bubble ${message.role}`} key={index}><strong>{message.role === "assistant" ? "Support AI" : "You"}</strong><p>{message.content}</p></article>)}
      {sending && <article className="chat-bubble assistant typing" role="status"><strong>Support AI</strong><p>Thinking<span>…</span></p></article>}
      <div ref={end}/>
    </div>
    {error && <div className="chat-error" role="alert"><span>{error}</span><button className="secondary" onClick={() => setError("")}>Dismiss</button></div>}
    <form className="chat-composer" onSubmit={send}>
      <label className="sr-only" htmlFor="customer-chat-message">Your question</label>
      <textarea id="customer-chat-message" rows={2} maxLength={4000} value={input} onChange={event => setInput(event.target.value)} onKeyDown={event => { if (event.key === "Enter" && !event.shiftKey) { event.preventDefault(); event.currentTarget.form?.requestSubmit(); } }} placeholder="Ask a support question…"/>
      <button disabled={sending || !input.trim()}>{sending ? "Sending…" : "Send"}</button>
    </form>
    <div className="chat-footer"><small>{model ? `Answering locally with ${model}` : "AI answers can be inaccurate. Review important information."}</small><div className="inline-actions"><button className="secondary" onClick={startOver}>New chat</button><button className="handoff-button" disabled={!hasCustomerMessage || sending} onClick={() => onEscalate(messages)}>Talk to a human</button></div></div>
  </section>;
}
