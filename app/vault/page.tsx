"use client";

import { Eye, EyeOff, Lock } from "lucide-react";
import { useVault } from "@/lib/vault-store";
import { useRouter } from "next/navigation";
import { useEffect, useMemo, useState } from "react";

function getPasswordStrength(pw: string): "weak" | "medium" | "strong" {
  if (!pw || pw.length < 6) return "weak";
  let score = 0;
  if (pw.length >= 8) score++;
  if (pw.length >= 12) score++;
  if (/[A-Z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  if (score >= 4) return "strong";
  if (score >= 2) return "medium";
  return "weak";
}

export default function VaultPage() {
  const { hasVault, isUnlocked, initializeVault, unlockVault, clearVault } = useVault();
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const mode: "create" | "unlock" = hasVault ? "unlock" : "create";

  const strength = useMemo(() => getPasswordStrength(password), [password]);

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
          <div className="vault-input-wrap">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(evt) => setPassword(evt.target.value)}
              onKeyDown={(evt) => {
                if (evt.key === "Enter" && mode === "unlock") handleSubmit();
              }}
              className={error ? "error" : ""}
              placeholder="••••••••"
            />
            <button
              type="button"
              className="vault-toggle-pw"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {mode === "create" && password.length > 0 && (
            <>
              <div className="pw-strength">
                <div className={`pw-strength-bar ${strength}`} />
              </div>
              <div className={`pw-strength-label ${strength}`}>
                {strength === "weak" ? "Weak" : strength === "medium" ? "Medium" : "Strong"}
              </div>
            </>
          )}

          {mode === "create" && (
            <>
              <label>Confirm Password</label>
              <div className="vault-input-wrap">
                <input
                  type={showConfirm ? "text" : "password"}
                  value={confirmPassword}
                  onChange={(evt) => setConfirmPassword(evt.target.value)}
                  onKeyDown={(evt) => {
                    if (evt.key === "Enter") handleSubmit();
                  }}
                  className={error ? "error" : ""}
                  placeholder="••••••••"
                />
                <button
                  type="button"
                  className="vault-toggle-pw"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label={showConfirm ? "Hide password" : "Show password"}
                >
                  {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
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
