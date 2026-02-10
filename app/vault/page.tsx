import { Lock } from "lucide-react";

export default function VaultPage() {
  return (
    <div className="vault-page">
      <div className="vault-card">
        <div className="vault-lock">
          <Lock size={28} />
        </div>
        <h1>Vault Locked</h1>
        <p>Enter your vault password to unlock encrypted memory.</p>
        <form className="vault-form">
          <input type="password" placeholder="••••••••" />
          <button type="button">Unlock</button>
        </form>
      </div>
    </div>
  );
}
