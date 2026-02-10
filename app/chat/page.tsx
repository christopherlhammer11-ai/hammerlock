"use client";

import Image from "next/image";
import { Menu, Send } from "lucide-react";
import { useState } from "react";

const sampleMessages = [
  { id: 1, role: "ai", content: "VaultAI kernel online. Vault mounted." },
  { id: 2, role: "user", content: "Summarize today's hemp regulation updates." },
  { id: 3, role: "ai", content: "Pulled 4 sources. Colorado finalized HB-1220, California extended SB512. All notes stored locally." }
];

export default function ChatPage() {
  const [messages] = useState(sampleMessages);

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
        <div className="chat-feed">
          {messages.map((msg) => (
            <div key={msg.id} className={`chat-bubble ${msg.role}`}>
              {msg.content}
            </div>
          ))}
        </div>
        <form className="chat-input-bar">
          <textarea placeholder="Type a command or question..." />
          <button type="button">
            Send <Send size={16} />
          </button>
        </form>
      </main>
    </div>
  );
}
