"use client";

import { Lock } from "lucide-react";
import { useVault } from "@/lib/vault-store";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";

export default function VaultPage() {
  const { hasVault, isUnlocked, initializeVault, unlockVault, clearVault } = useVault();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const mode: "create" | "unlock" = hasVault ? "unlock" : "create";

  useEffect(() => {
    if (isUnlocked) {
      router.replace("/chat");
    }
  }, [isUnlocked, router]);

  const handleSubmit = async () => {
    setError(null);
    if (mode === "create" && password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }
    if (!password) {
      setError("Password is required.");
      return;
    }
    try {
      setLoading(true);
      if (mode === "create") {
        await initializeVault(password);
      } else {
        await unlockVault(password);
      }
      router.replace("/chat");
    } catch (err) {
      setError((err as Error).message || "Unable to unlock vault.");
    } finally {
      setLoading(false);
      setPassword("");
      setConfirmPassword("");
    }
  };

  const handleReset = () => {
    const confirmed = confirm("This permanently deletes all encrypted data. Continue?");
    if (confirmed) {
      clearVault();
      setPassword("");
      setConfirmPassword("");
    }
  };

  return (
    <div className="vault-page">
      <div className="vault-card">
        {mode === "unlock" && (
          <div className="lock-icon">
            <Lock size={32} />
          </div>
        )}
        <h1>{mode === "create" ? "Create Your Vault" : "Vault Locked"}</h1>
        <p className="vault-subtext">
          {mode === "create"
            ? "Choose a password. This becomes your encryption key. We never see it, store it, or recover it."
            : "Enter your password to decrypt."}
        </p>

        <div className="vault-form">
          <label>Password</label>
          <input
            type="password"
            value={password}
            onChange={(evt) => setPassword(evt.target.value)}
            className={error ? "error" : ""}
            placeholder="••••••••"
          />
          {mode === "create" && (
            <>
              <label>Confirm Password</label>
              <input
                type="password"
                value={confirmPassword}
                onChange={(evt) => setConfirmPassword(evt.target.value)}
                className={error ? "error" : ""}
                placeholder="••••••••"
              />
            </>
          )}
          {error && <p className="vault-error">{error}</p>}
        </div>

        <button className="vault-submit" onClick={handleSubmit} disabled={loading}>
          {loading ? "Processing..." : mode === "create" ? "Create Vault" : "Unlock"}
        </button>

        {mode === "unlock" && (
          <button className="vault-reset" onClick={handleReset}>
            Reset vault
          </button>
        )}
      </div>
    </div>
  );
}
