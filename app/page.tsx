'use client';

import Image from "next/image";
import { useState } from "react";

const sidebarActions = [
  { label: "Status", payload: "vaultai status" },
  { label: "Load persona", payload: "vaultai load persona" },
  { label: "Load plan", payload: "vaultai load plan" },
  { label: "Execute step", payload: "vaultai execute step" },
  { label: "Write file", payload: "vaultai write file" }
];

export default function Home() {
  const [chatLog, setChatLog] = useState<string[]>([
    "vaultai ready. local memory mounted."
  ]);
  const [input, setInput] = useState("");

  const appendLog = (line: string) => {
    setChatLog((prev) => [...prev, line]);
  };

  const handleSubmit = (evt: React.FormEvent) => {
    evt.preventDefault();
    if (!input.trim()) return;
    appendLog(`> ${input.trim()}`);
    setInput("");
  };

  return (
    <div className="main-shell">
      <header className="header">
        <Image src="/vaultai-logo.svg" alt="VaultAI" width={56} height={56} />
        <div className="header-title">VAULTAI</div>
      </header>
      <div className="app-content">
        <aside className="sidebar">
          {sidebarActions.map((action) => (
            <button key={action.label} onClick={() => appendLog(action.payload)}>
              {action.label}
            </button>
          ))}
        </aside>
        <main className="main-panel">
          <div className="chat-log">
            {chatLog.map((line, idx) => (
              <div className="chat-bubble" key={idx}>
                {line}
              </div>
            ))}
          </div>
          <form className="input-row" onSubmit={handleSubmit}>
            <input
              placeholder="Type a command..."
              value={input}
              onChange={(evt) => setInput(evt.target.value)}
            />
            <button type="submit">Run</button>
          </form>
        </main>
      </div>
      <div className="footer-tag">VAULTAI</div>
    </div>
  );
}
