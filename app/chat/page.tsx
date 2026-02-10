"use client";

import Image from "next/image";
import { Lock, Menu, Send } from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { useEffect, useRef, useState } from "react";
import { useVault, VaultMessage } from "@/lib/vault-store";
import { useRouter } from "next/navigation";

type Message = VaultMessage;

const defaultMessage: Message = {
  id: "welcome",
  role: "ai",
  content: "VaultAI ready. Try 'status' or 'tell me about myself'."
};

export default function ChatPage() {
  const { isUnlocked, vaultData, updateVaultData, lockVault } = useVault();
  const router = useRouter();
  const [messages, setMessages] = useState<Message[]>([defaultMessage]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!isUnlocked) {
      router.replace("/vault");
      return;
    }
    if (vaultData?.chatHistory?.length) {
      setMessages(vaultData.chatHistory);
    } else {
      setMessages([defaultMessage]);
    }
  }, [isUnlocked, vaultData, router]);

  useEffect(() => {
    if (logRef.current) {
      logRef.current.scrollTop = logRef.current.scrollHeight;
    }
  }, [messages]);

  const persistMessages = async (nextMessages: Message[]) => {
    setMessages(nextMessages);
    await updateVaultData((prev) => ({
      ...prev,
      chatHistory: nextMessages
    }));
  };

  const sendCommand = async () => {
    const trimmed = input.trim();
    if (!trimmed || sending || !isUnlocked) return;
    const userMessage: Message = { id: crypto.randomUUID(), role: "user", content: trimmed };
    const pendingId = crypto.randomUUID();
    const pendingMessage: Message = { id: pendingId, role: "ai", pending: true, content: "Processing..." };

    const inFlight = [...messages, userMessage, pendingMessage];
    await persistMessages(inFlight);
    setInput("");
    setSending(true);

    try {
      const response = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ command: trimmed })
      });
      const data = await response.json();
      const reply = data?.reply || data?.response || "(no response)";
      const resolved = inFlight.map((msg) =>
        msg.id === pendingId ? { ...msg, content: reply, pending: false, role: "ai" } : msg
      );
      await persistMessages(resolved);
    } catch (error) {
      const failed = inFlight.map((msg) =>
        msg.id === pendingId
          ? { id: pendingId, role: "error", content: (error as Error).message || "Command failed" }
          : msg
      );
      await persistMessages(failed);
    } finally {
      setSending(false);
    }
  };

  const handleLock = () => {
    lockVault();
    router.replace("/vault");
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
        <button className="sidebar-lock" onClick={handleLock}>
          <Lock size={16} /> Lock Vault
        </button>
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
