"use client";

import Image from "next/image";
import { Menu, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useState } from "react";

type Message = {
  id: string;
  role: "user" | "ai" | "error";
  content: string;
  pending?: boolean;
};

const welcomeMessage: Message = {
  id: "welcome",
  role: "ai",
  content: "VaultAI ready. Try 'status' or 'tell me about myself'."
};

export default function ChatPage() {
  const [messages, setMessages] = useState<Message[]>([welcomeMessage]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  const appendMessage = (message: Message) => {
    setMessages((prev) => [...prev, message]);
  };

  const replaceMessage = (id: string, content: string, role: Message["role"] = "ai") => {
    setMessages((prev) =>
      prev.map((msg) => (msg.id === id ? { ...msg, content, role, pending: false } : msg))
    );
  };

  const sendCommand = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending) return;

    appendMessage({ id: crypto.randomUUID(), role: "user", content: trimmed });
    setInput("");
    setSending(true);

    const pendingId = crypto.randomUUID();
    appendMessage({ id: pendingId, role: "ai", pending: true, content: "Processing..." });

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: trimmed })
      });
      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.response || "Command failed");
      }
      replaceMessage(pendingId, data?.response || "(no response)");
    } catch (error) {
      replaceMessage(
        pendingId,
        (error as Error).message || "Command failed",
        "error"
      );
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="chat-shell">
      <aside className="chat-sidebar">
        <div className="chat-logo">
          <Image src="/vaultai-logo.png" alt="VaultAI" width={40} height={40} />
          <span>VaultAI</span>
        </div>
        <nav>
          <a>Persona</a>
          <a>Plan</a>
          <a>Commands</a>
          <a>Settings</a>
        </nav>
      </aside>
      <main className="chat-main">
        <header className="chat-main-header">
          <button className="chat-menu">
            <Menu size={18} />
          </button>
          <div>
            <div className="section-label">LIVE SESSION</div>
            <h1>Operator Console</h1>
          </div>
        </header>
        <div className="chat-feed" ref={logRef}>
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.role}${msg.pending ? " pending" : ""}`}>
              <ReactMarkdown remarkPlugins={[remarkGfm]}>{msg.content}</ReactMarkdown>
            </div>
          ))}
        </div>
        <form
          className="chat-input-bar"
          onSubmit={(evt) => {
            evt.preventDefault();
            sendCommand();
          }}
        >
          <textarea
            placeholder="Type a command or question..."
            value={input}
            onChange={(evt) => setInput(evt.target.value)}
            onKeyDown={(evt) => {
              if (evt.key === "Enter" && !evt.shiftKey) {
                evt.preventDefault();
                sendCommand();
              }
            }}
            disabled={sending}
          />
          <button type="submit" disabled={sending}>
            {sending ? "Sending" : "Send"} <Send size={16} />
          </button>
        </form>
      </main>
    </div>
  );
}
