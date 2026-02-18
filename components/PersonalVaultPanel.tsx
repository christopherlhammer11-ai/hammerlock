"use client";

import { useState, useMemo } from "react";
import {
  X, Lock, ShieldCheck, Key, User, Archive, Shield, StickyNote, File,
  Plus, Eye, EyeOff, Copy, Trash2, Edit3, Check, Search,
} from "lucide-react";
import { usePersonalVault, type PiiCategory } from "@/lib/personal-vault-store";

type PersonalVaultPanelProps = {
  open: boolean;
  onClose: () => void;
};

const CATEGORY_META: Record<PiiCategory, { icon: typeof Key; label: string; color: string }> = {
  password: { icon: Key, label: "Password", color: "#f59e0b" },
  identity: { icon: User, label: "Identity", color: "#8b5cf6" },
  financial: { icon: Archive, label: "Financial", color: "#22c55e" },
  medical: { icon: Shield, label: "Medical", color: "#ef4444" },
  note: { icon: StickyNote, label: "Secure Note", color: "#3b82f6" },
  other: { icon: File, label: "Other", color: "#6b7280" },
};

const ALL_CATEGORIES: PiiCategory[] = ["password", "identity", "financial", "medical", "note", "other"];

export default function PersonalVaultPanel({ open, onClose }: PersonalVaultPanelProps) {
  const {
    pvIsUnlocked, pvHasVault, pvEntries,
    initializePersonalVault, unlockPersonalVault, lockPersonalVault,
    addEntry, updateEntry, deleteEntry,
  } = usePersonalVault();

  // Auth state
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [authError, setAuthError] = useState("");
  const [authLoading, setAuthLoading] = useState(false);

  // Entry form state
  const [showForm, setShowForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formCategory, setFormCategory] = useState<PiiCategory>("password");
  const [formLabel, setFormLabel] = useState("");
  const [formValue, setFormValue] = useState("");
  const [formNotes, setFormNotes] = useState("");

  // UI state
  const [searchQuery, setSearchQuery] = useState("");
  const [filterCategory, setFilterCategory] = useState<PiiCategory | "all">("all");
  const [revealedIds, setRevealedIds] = useState<Set<string>>(new Set());
  const [copiedId, setCopiedId] = useState<string | null>(null);

  if (!open) return null;

  // Filter entries
  const filtered = pvEntries.filter(e => {
    if (filterCategory !== "all" && e.category !== filterCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      return (
        e.label.toLowerCase().includes(q) ||
        e.category.toLowerCase().includes(q) ||
        (e.notes?.toLowerCase().includes(q)) ||
        e.tags.some(t => t.toLowerCase().includes(q))
        // Intentionally NOT searching e.value
      );
    }
    return true;
  });

  // Handlers
  const handleCreate = async () => {
    setAuthError("");
    if (!password) return setAuthError("Password required");
    if (password !== confirmPassword) return setAuthError("Passwords don't match");
    if (password.length < 4) return setAuthError("Password too short (min 4 chars)");
    setAuthLoading(true);
    try {
      await initializePersonalVault(password);
      setPassword("");
      setConfirmPassword("");
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleUnlock = async () => {
    setAuthError("");
    if (!password) return setAuthError("Password required");
    setAuthLoading(true);
    try {
      await unlockPersonalVault(password);
      setPassword("");
    } catch (err) {
      setAuthError((err as Error).message);
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLock = () => {
    lockPersonalVault();
    setRevealedIds(new Set());
    setShowForm(false);
    setEditingId(null);
  };

  const resetForm = () => {
    setShowForm(false);
    setEditingId(null);
    setFormCategory("password");
    setFormLabel("");
    setFormValue("");
    setFormNotes("");
  };

  const handleSaveEntry = async () => {
    if (!formLabel.trim() || !formValue.trim()) return;
    if (editingId) {
      await updateEntry(editingId, {
        category: formCategory,
        label: formLabel.trim(),
        value: formValue.trim(),
        notes: formNotes.trim() || undefined,
        tags: [formCategory],
      });
    } else {
      await addEntry({
        category: formCategory,
        label: formLabel.trim(),
        value: formValue.trim(),
        notes: formNotes.trim() || undefined,
        tags: [formCategory],
      });
    }
    resetForm();
  };

  const handleEdit = (e: typeof pvEntries[number]) => {
    setEditingId(e.id);
    setFormCategory(e.category);
    setFormLabel(e.label);
    setFormValue(e.value);
    setFormNotes(e.notes || "");
    setShowForm(true);
  };

  const handleCopy = (id: string, value: string) => {
    navigator.clipboard.writeText(value);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1500);
  };

  const toggleReveal = (id: string) => {
    setRevealedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  // ── Render: No vault yet (setup) ──
  if (!pvHasVault) {
    return (
      <div className="onboarding-overlay" onClick={onClose}>
        <div className="onboarding-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 420 }} role="dialog" aria-label="Create Personal Vault">
          <div className="pv-header">
            <Lock size={18} style={{ color: "#ef4444" }} />
            <h3>Create Personal Vault</h3>
            <button className="ghost-btn" onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", padding: "4px 8px" }}><X size={16} /></button>
          </div>
          <div className="pv-body">
            <p className="pv-desc">Keep your most sensitive data locked with a <strong>separate password</strong>. SSNs, bank accounts, medical records, passwords — all AES-256 encrypted on your device. Never sent to any server or AI.</p>
            <div className="pv-form-group">
              <label className="pv-label">Vault Password</label>
              <input type="password" className="pv-input" placeholder="Choose a strong password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreate()} autoFocus />
            </div>
            <div className="pv-form-group">
              <label className="pv-label">Confirm Password</label>
              <input type="password" className="pv-input" placeholder="Type it again" value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleCreate()} />
            </div>
            {authError && <div className="pv-error">{authError}</div>}
            <button className="pv-btn-primary" onClick={handleCreate} disabled={authLoading}>
              {authLoading ? "Encrypting..." : "Create Personal Vault"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Locked ──
  if (!pvIsUnlocked) {
    return (
      <div className="onboarding-overlay" onClick={onClose}>
        <div className="onboarding-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 400 }} role="dialog" aria-label="Unlock Personal Vault">
          <div className="pv-header">
            <Lock size={18} style={{ color: "#ef4444" }} />
            <h3>Personal Vault</h3>
            <button className="ghost-btn" onClick={onClose} aria-label="Close" style={{ marginLeft: "auto", padding: "4px 8px" }}><X size={16} /></button>
          </div>
          <div className="pv-body">
            <p className="pv-desc">Enter your Personal Vault password to access your private data.</p>
            <div className="pv-form-group">
              <input type="password" className="pv-input" placeholder="Personal Vault password" value={password} onChange={e => setPassword(e.target.value)} onKeyDown={e => e.key === "Enter" && handleUnlock()} autoFocus />
            </div>
            {authError && <div className="pv-error">{authError}</div>}
            <button className="pv-btn-primary" onClick={handleUnlock} disabled={authLoading}>
              {authLoading ? "Decrypting..." : "Unlock"}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Render: Unlocked ──
  return (
    <div className="onboarding-overlay" onClick={onClose}>
      <div className="pv-panel" onClick={e => e.stopPropagation()} role="dialog" aria-label="Personal Vault">
        {/* Header */}
        <div className="pv-header">
          <ShieldCheck size={18} style={{ color: "var(--accent)" }} />
          <h3>Personal Vault</h3>
          <span className="pv-count">{pvEntries.length} {pvEntries.length === 1 ? "entry" : "entries"}</span>
          <div style={{ marginLeft: "auto", display: "flex", gap: 6 }}>
            <button className="pv-btn-lock" onClick={handleLock} title="Lock vault">
              <Lock size={14} /> Lock
            </button>
            <button className="ghost-btn" onClick={onClose} aria-label="Close" style={{ padding: "4px 8px" }}><X size={16} /></button>
          </div>
        </div>

        <div className="pv-subtitle">AES-256 encrypted on your device. Never sent to servers or AI.</div>

        {/* Search + Add */}
        <div className="pv-toolbar">
          <div className="pv-search-wrap">
            <Search size={14} />
            <input type="text" className="pv-search" placeholder="Search entries..." value={searchQuery} onChange={e => setSearchQuery(e.target.value)} />
          </div>
          <button className="pv-btn-add" onClick={() => { resetForm(); setShowForm(true); }}>
            <Plus size={14} /> Add
          </button>
        </div>

        {/* Category filter chips */}
        <div className="pv-chips">
          <button className={`pv-chip ${filterCategory === "all" ? "pv-chip-active" : ""}`} onClick={() => setFilterCategory("all")}>All</button>
          {ALL_CATEGORIES.map(cat => {
            const meta = CATEGORY_META[cat];
            const count = pvEntries.filter(e => e.category === cat).length;
            if (count === 0 && filterCategory !== cat) return null;
            return (
              <button key={cat} className={`pv-chip ${filterCategory === cat ? "pv-chip-active" : ""}`} onClick={() => setFilterCategory(cat)} style={filterCategory === cat ? { borderColor: meta.color } : undefined}>
                {meta.label} ({count})
              </button>
            );
          })}
        </div>

        {/* Entry form (inline) */}
        {showForm && (
          <div className="pv-entry-form">
            <div className="pv-form-row">
              <select className="pv-select" value={formCategory} onChange={e => setFormCategory(e.target.value as PiiCategory)}>
                {ALL_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{CATEGORY_META[cat].label}</option>
                ))}
              </select>
              <input type="text" className="pv-input" placeholder="Label (e.g. Chase Checking, SSN)" value={formLabel} onChange={e => setFormLabel(e.target.value)} autoFocus />
            </div>
            <input type="password" className="pv-input pv-input-value" placeholder="Sensitive value" value={formValue} onChange={e => setFormValue(e.target.value)} />
            <input type="text" className="pv-input" placeholder="Notes (optional)" value={formNotes} onChange={e => setFormNotes(e.target.value)} />
            <div className="pv-form-actions">
              <button className="pv-btn-primary" onClick={handleSaveEntry} disabled={!formLabel.trim() || !formValue.trim()}>
                {editingId ? "Update" : "Save Entry"}
              </button>
              <button className="pv-btn-secondary" onClick={resetForm}>Cancel</button>
            </div>
          </div>
        )}

        {/* Entry list */}
        <div className="pv-entries">
          {filtered.length === 0 && (
            <div className="pv-empty">
              {pvEntries.length === 0
                ? "No entries yet. Click \"Add\" to store your first piece of private data."
                : "No entries match your search."}
            </div>
          )}
          {filtered.map(entry => {
            const meta = CATEGORY_META[entry.category];
            const Icon = meta.icon;
            const isRevealed = revealedIds.has(entry.id);
            const isCopied = copiedId === entry.id;
            return (
              <div key={entry.id} className="pv-entry-card">
                <div className="pv-entry-left">
                  <div className="pv-entry-icon" style={{ color: meta.color }}>
                    <Icon size={16} />
                  </div>
                  <div className="pv-entry-info">
                    <div className="pv-entry-label">{entry.label}</div>
                    <div className="pv-entry-value">
                      {isRevealed ? entry.value : "\u2022\u2022\u2022\u2022\u2022\u2022\u2022\u2022"}
                    </div>
                    {entry.notes && <div className="pv-entry-notes">{entry.notes}</div>}
                  </div>
                </div>
                <div className="pv-entry-actions">
                  <button className="pv-icon-btn" onClick={() => toggleReveal(entry.id)} title={isRevealed ? "Hide" : "Reveal"}>
                    {isRevealed ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button className="pv-icon-btn" onClick={() => handleCopy(entry.id, entry.value)} title="Copy">
                    {isCopied ? <Check size={14} style={{ color: "var(--accent)" }} /> : <Copy size={14} />}
                  </button>
                  <button className="pv-icon-btn" onClick={() => handleEdit(entry)} title="Edit">
                    <Edit3 size={14} />
                  </button>
                  <button className="pv-icon-btn pv-icon-danger" onClick={() => deleteEntry(entry.id)} title="Delete">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
