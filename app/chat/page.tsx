// HammerLock AI — Chat Console
// Privacy-first AI chat interface with encrypted local memory.
"use client";
import {
  Lock, Mic, MicOff, Paperclip, Send, Square, Terminal, X, ChevronRight, Trash2,
  FileText, Share2, User, Search, BarChart3, Bot, Zap, Globe, Settings, Key,
  Plus, FolderPlus, MessageSquare, ChevronDown, Check, Download,
  Copy, Volume2, VolumeX, RefreshCw, Menu, PanelLeftClose, Archive,
  Shield, StickyNote, File, Image, Cpu,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import NextImage from "next/image";
import { useCallback, useEffect, useRef, useState } from "react";
import { useSubscription, FREE_MESSAGE_LIMIT } from "@/lib/subscription-store";
import { useVault, type VaultMessage, type VaultFile } from "@/lib/vault-store";
import { useRouter } from "next/navigation";
import { useI18n, LOCALE_LABELS, type Locale } from "@/lib/i18n";
import {
  BUILT_IN_AGENTS, DEFAULT_AGENT_ID, getAgentById, buildCustomAgent,
  CUSTOM_AGENT_ICONS, CUSTOM_AGENT_COLORS,
  type AgentDef, type CustomAgentInput,
} from "@/lib/agents";
import { useNudges, type NudgeDef } from "@/lib/use-nudges";
import NudgeToast from "@/components/NudgeToast";
import SettingsPanel from "@/components/SettingsPanel";
import SourcesAccordion from "@/components/SourcesAccordion";
import PersonalVaultPanel from "@/components/PersonalVaultPanel";
import IntegrationSetup from "@/components/IntegrationSetup";
import PermissionsSetup from "@/components/PermissionsSetup";
import { usePersonalVault } from "@/lib/personal-vault-store";
import { type ScheduledTask } from "@/lib/schedules";
import {
  ACTION_BADGE_ICONS, ACTION_BADGE_LABELS,
  NUDGE_CATALOG, THINKING_MESSAGES, getThinkingMessage,
  AGENT_EMOJI, AGENT_INTRO_TIPS, AGENT_INTRO_SEEN_KEY,
  AGENT_ACTIONS, WORKFLOW_CHAINS, VOICE_OPTIONS, MODEL_OPTIONS,
  detectRelevantChains, isElectron,
  type WorkflowAction, type WorkflowChain,
} from "@/lib/chat-constants";

type GatewayStatus = "connected" | "connecting" | "offline";

// Constants imported from @/lib/chat-constants


function AgentIcon({ name, size = 14 }: { name: string; size?: number }) {
  const emoji = AGENT_EMOJI[name] || "\uD83E\uDD16";
  return <span style={{ fontSize: size * 0.9, lineHeight: 1 }}>{emoji}</span>;
}





// ---- Multi-conversation types ----
type Conversation = {
  id: string;
  name: string;
  groupId: string | null;
  messages: VaultMessage[];
  createdAt: string;
  updatedAt: string;
};

type ConversationGroup = {
  id: string;
  name: string;
  collapsed: boolean;
};

function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

export default function ChatPage() {
  const router = useRouter();
  const { lockVault, vaultData, updateVaultData, isUnlocked } = useVault();
  const { pvIsUnlocked, pvHasVault } = usePersonalVault();
  const { subscription, messageCount, canSendMessage, incrementMessageCount, isFeatureAvailable, setUsingOwnKey } = useSubscription();
  const { t, locale, setLocale } = useI18n();

  // ---- Multi-conversation state ----
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [groups, setGroups] = useState<ConversationGroup[]>([]);
  const [activeConvoId, setActiveConvoId] = useState<string | null>(null);
  const [renamingId, setRenamingId] = useState<string | null>(null);
  const [renameValue, setRenameValue] = useState("");
  const [showNewGroup, setShowNewGroup] = useState(false);
  const [newGroupName, setNewGroupName] = useState("");
  const [showLangPicker, setShowLangPicker] = useState(false);

  // ---- Chat state (for active conversation) ----
  const [messages, setMessages] = useState<VaultMessage[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const [showPaywall, setShowPaywall] = useState(false);
  const [paywallFeature, setPaywallFeature] = useState("");
  const [gatewayStatus, setGatewayStatus] = useState<GatewayStatus>("connecting");
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [isListening, setIsListening] = useState(false);
  const [audioLevel, setAudioLevel] = useState(0); // 0-100 normalized audio level for visual feedback
  const [recordingTime, setRecordingTime] = useState(0); // seconds elapsed
  const recordingTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  // Voice selector — persisted to localStorage
  const [selectedVoice, setSelectedVoice] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("hammerlock_voice") || "nova";
    return "nova";
  });
  const [showVoiceMenu, setShowVoiceMenu] = useState(false);
  const voiceMenuRef = useRef<HTMLDivElement>(null);
  const selectedVoiceRef = useRef(selectedVoice);
  selectedVoiceRef.current = selectedVoice;
  // ---- Model selector state ----
  const [selectedModel, setSelectedModel] = useState<string>(() => {
    if (typeof window !== "undefined") return localStorage.getItem("hammerlock_model") || "auto";
    return "auto";
  });
  const [showModelMenu, setShowModelMenu] = useState(false);
  const modelMenuRef = useRef<HTMLDivElement>(null);
  const [uploadedPdf, setUploadedPdf] = useState<{ name: string; text: string } | null>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const dragCounterRef = useRef(0);
  const [sidebarTab, setSidebarTab] = useState<"chats" | "tools" | "settings">("chats");
  // ---- @mention agent picker state ----
  const [mentionQuery, setMentionQuery] = useState("");
  const [showMentionMenu, setShowMentionMenu] = useState(false);
  const [mentionIndex, setMentionIndex] = useState(0);
  // ---- Agent state ----
  const [activeAgentId, setActiveAgentId] = useState<string>(DEFAULT_AGENT_ID);
  const [customAgents, setCustomAgents] = useState<AgentDef[]>([]);
  const [showCreateAgent, setShowCreateAgent] = useState(false);
  const [newAgent, setNewAgent] = useState<CustomAgentInput>({
    name: "", tagline: "", icon: "Bot", color: "#00ff88",
    expertise: "", personality: "", instructions: "",
  });

  // ---- File Vault state ----
  const [showVaultPanel, setShowVaultPanel] = useState(false);
  const [showPersonalVaultPanel, setShowPersonalVaultPanel] = useState(false);
  const [vaultSearchQuery, setVaultSearchQuery] = useState("");
  const [showNewNote, setShowNewNote] = useState(false);
  const [newNoteTitle, setNewNoteTitle] = useState("");
  const [newNoteContent, setNewNoteContent] = useState("");

  const [showApiKeyModal, setShowApiKeyModal] = useState(false);
  const [apiKeys, setApiKeys] = useState({ openai: "", anthropic: "", gemini: "", groq: "", mistral: "", deepseek: "", brave: "" });
  const [onboardingStep, setOnboardingStep] = useState(-1);
  // ---- UI enhancements ----
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [speakingMsgId, setSpeakingMsgId] = useState<string | null>(null);
  const [copiedToast, setCopiedToast] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showIntegrationSetup, setShowIntegrationSetup] = useState(false);
  const [integrationSetupMode, setIntegrationSetupMode] = useState<"onboarding" | "settings">("onboarding");
  const [showPermissionsSetup, setShowPermissionsSetup] = useState(false);
  const [permissionsSetupMode, setPermissionsSetupMode] = useState<"onboarding" | "settings">("onboarding");
  const [chainRunning, setChainRunning] = useState(false);
  const [chainStep, setChainStep] = useState(0);
  const [chainTotal, setChainTotal] = useState(0);
  const [workflowToast, setWorkflowToast] = useState<string | null>(null);
  const [activeNudge, setActiveNudge] = useState<NudgeDef | null>(null);
  const nudgeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const { shouldShow: shouldShowNudge, dismissNudge, disableAll: disableAllNudges } = useNudges();
  const [tutorialStep, setTutorialStep] = useState(-1);
  const [onboardingAnswers, setOnboardingAnswers] = useState<Record<string, string>>({});
  const [onboardingInput, setOnboardingInput] = useState("");
  const [computeUnits, setComputeUnits] = useState<{ remaining: number; total: number; usingOwnKey: boolean; periodEnd?: string; monthlyAllocation?: number; boosterUnits?: number } | null>(null);
  const [ollamaDetected, setOllamaDetected] = useState<boolean | null>(null); // null = unknown/loading
  const [ollamaBannerDismissed, setOllamaBannerDismissed] = useState(false);
  const feedRef = useRef<HTMLDivElement>(null);
  const errorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  /** True when the current message was triggered via voice input — auto-play TTS on reply */
  const voiceInputRef = useRef(false);
  /** True when in "talk to me" live conversation mode — auto-restart mic after TTS */
  const liveConvoRef = useRef(false);
  /** Stable ref to sendCommand for use in voice callbacks (avoids stale closure) */
  const sendCommandRef = useRef<(preset?: string) => void>(() => {});
  /** Stable ref to handleVoice for use in TTS callbacks */
  const handleVoiceRef = useRef<() => void>(() => {});
  /** Callback invoked when TTS audio finishes — used by "talk to me" to auto-restart mic */
  const ttsFinishedCallbackRef = useRef<(() => void) | null>(null);

  const ONBOARDING_STEPS = [
    { key: "name", q: t.onboarding_q_name, placeholder: t.onboarding_q_name_placeholder },
    { key: "role", q: t.onboarding_q_role, placeholder: t.onboarding_q_role_placeholder },
    { key: "use_case", q: t.onboarding_q_use, placeholder: t.onboarding_q_use_placeholder },
    { key: "style", q: t.onboarding_q_style, placeholder: t.onboarding_q_style_placeholder },
  ];

  // ---- @mention filtered agents ----
  const allAgents = [...BUILT_IN_AGENTS, ...customAgents];
  const mentionAgents = showMentionMenu
    ? allAgents.filter(a =>
        a.name.toLowerCase().includes(mentionQuery.toLowerCase()) ||
        a.id.toLowerCase().includes(mentionQuery.toLowerCase())
      ).slice(0, 6)
    : [];

  // Auto-focus input on mount
  useEffect(() => { inputRef.current?.focus(); }, []);

  // ---- VAULT GATE: redirect to /vault if not unlocked ----
  // This prevents the chat UI from being used in a broken state when
  // accessed directly via URL without going through the vault unlock flow.
  useEffect(() => {
    if (typeof window === "undefined") return;
    // Small delay to allow session restore from storage to complete
    const timer = setTimeout(() => {
      if (!isUnlocked) {
        router.replace("/vault");
      }
    }, 1500);
    return () => clearTimeout(timer);
  }, [isUnlocked, router]);

  useEffect(() => { if (feedRef.current) feedRef.current.scrollTop = feedRef.current.scrollHeight; }, [messages]);

  // Close voice selector menu on click outside
  useEffect(() => {
    if (!showVoiceMenu) return;
    const handleDown = (e: MouseEvent) => {
      if (voiceMenuRef.current && !voiceMenuRef.current.contains(e.target as Node)) {
        setShowVoiceMenu(false);
      }
    };
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [showVoiceMenu]);

  // Close model selector menu on click outside
  useEffect(() => {
    if (!showModelMenu) return;
    const handleDown = (e: MouseEvent) => {
      if (modelMenuRef.current && !modelMenuRef.current.contains(e.target as Node)) {
        setShowModelMenu(false);
      }
    };
    document.addEventListener("mousedown", handleDown);
    return () => document.removeEventListener("mousedown", handleDown);
  }, [showModelMenu]);

  // ---- REMINDER SCHEDULER: check persona reminders against system clock ----
  const firedRemindersRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    // Request notification permission on mount
    if (typeof Notification !== "undefined" && Notification.permission === "default") {
      Notification.requestPermission();
    }

    const interval = setInterval(() => {
      const personaText = vaultData?.persona || "";
      if (!personaText) return;

      const now = new Date();
      const currentH = now.getHours();
      const currentM = now.getMinutes();

      // Prune old entries to prevent unbounded memory growth
      const todayStr = now.toDateString();
      for (const key of firedRemindersRef.current) {
        if (!key.endsWith(todayStr)) firedRemindersRef.current.delete(key);
      }

      // Parse reminder lines: "Reminder: drink water (daily at 10am)"
      const reminderLines = personaText.split("\n").filter((l: string) => /^Reminder:/i.test(l.trim()));
      for (const line of reminderLines) {
        const match = line.match(/^Reminder:\s*(.+?)\s*\(daily\s+at\s+(\d{1,2})(?::(\d{2}))?\s*(am|pm)?\)/i);
        if (!match) continue;
        const task = match[1].trim();
        let hour = parseInt(match[2], 10);
        const minute = match[3] ? parseInt(match[3], 10) : 0;
        const ampm = (match[4] || "").toLowerCase();
        if (ampm === "pm" && hour < 12) hour += 12;
        if (ampm === "am" && hour === 12) hour = 0;

        if (currentH === hour && currentM === minute) {
          const key = `${task}-${currentH}:${currentM}-${now.toDateString()}`;
          if (firedRemindersRef.current.has(key)) continue;
          firedRemindersRef.current.add(key);

          // Get user's name from persona
          const nameMatch = personaText.match(/^Name:\s*(.+)/im);
          const name = nameMatch ? nameMatch[1].trim() : "";
          const greeting = name ? `Hey ${name}, ` : "Hey, ";
          const alertText = `${greeting}${task}!`;

          // 1. In-app message
          const rid = `reminder-${Date.now()}`;
          setMessages(prev => [...prev, {
            id: rid, role: "ai" as const, content: `🔔 **Reminder:** ${alertText}`,
            timestamp: now.toISOString(), pending: false,
          }]);

          // 2. Browser notification
          if (typeof Notification !== "undefined" && Notification.permission === "granted") {
            new Notification("HammerLock AI Reminder", { body: alertText, icon: "/icon-512.png" });
          }

          // 3. TTS if available
          try {
            fetch("/api/tts", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ text: alertText, voice: selectedVoiceRef.current }),
            }).then(res => {
              if (res.ok && res.headers.get("content-type")?.includes("audio")) {
                res.blob().then(blob => {
                  const url = URL.createObjectURL(blob);
                  const audio = new Audio(url);
                  audio.onended = () => URL.revokeObjectURL(url);
                  audio.onerror = () => URL.revokeObjectURL(url);
                  audio.play();
                });
              }
            }).catch(() => {
              // Fallback to browser TTS
              if (typeof window !== "undefined" && window.speechSynthesis) {
                const utter = new SpeechSynthesisUtterance(alertText);
                window.speechSynthesis.speak(utter);
              }
            });
          } catch { /* silent */ }
        }
      }
    }, 30000); // Check every 30 seconds

    return () => clearInterval(interval);
  }, [vaultData?.persona]);

  // ---- SCHEDULED AGENT TASKS: check /api/schedules and execute due tasks ----
  const scheduleFiredRef = useRef<Set<string>>(new Set());
  useEffect(() => {
    if (!isUnlocked) return;

    const checkSchedules = async () => {
      try {
        const res = await fetch("/api/schedules");
        if (!res.ok) return;
        const { due } = await res.json() as { due: ScheduledTask[] };

        // Prune old entries to prevent unbounded memory growth
        const cutoff = new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString().slice(0, 16);
        for (const key of scheduleFiredRef.current) {
          const parts = key.split("-");
          const ts = parts.slice(-2).join("-");
          if (ts < cutoff) scheduleFiredRef.current.delete(key);
        }

        for (const task of due) {
          // Skip if already fired this cycle
          const fireKey = `${task.id}-${new Date().toISOString().slice(0, 16)}`;
          if (scheduleFiredRef.current.has(fireKey)) continue;
          scheduleFiredRef.current.add(fireKey);

          // Mark as fired on the server
          await fetch("/api/schedules", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ taskId: task.id }),
          });

          // Get agent definition for system prompt
          const agent = getAgentById(task.agentId);
          const agentName = agent?.name || task.agentId;
          const agentSystemPrompt = agent?.systemPrompt || "";

          // Add a "running" message to chat
          const schedMsgId = `sched-${Date.now()}-${task.id}`;
          setMessages(prev => [...prev, {
            id: schedMsgId,
            role: "ai" as const,
            content: `⏰ **Scheduled Task Running** — ${agentName} agent\n\n_${task.task}_\n\n⏳ Working on it...`,
            timestamp: new Date().toISOString(),
            pending: true,
          }]);

          // Execute the agent prompt via /api/execute
          try {
            const execRes = await fetch("/api/execute", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({
                command: task.prompt,
                agentSystemPrompt,
                locale: "en",
                history: [],
              }),
            });
            const data = await execRes.json();
            const response = data.response || data.error || "Task completed but returned no output.";

            // Update the message with the result
            setMessages(prev => prev.map(m =>
              m.id === schedMsgId ? {
                ...m,
                content: `⏰ **Scheduled Task Complete** — ${agentName} agent\n📋 _${task.task}_\n\n---\n\n${response}`,
                pending: false,
              } : m
            ));

            // Browser notification
            if (typeof Notification !== "undefined" && Notification.permission === "granted") {
              new Notification(`HammerLock AI — ${agentName}`, {
                body: `Scheduled task complete: ${task.task}`,
                icon: "/icon-512.png",
              });
            }

            // TTS notification
            try {
              const ttsText = `Your scheduled ${agentName} task is complete: ${task.task}`;
              fetch("/api/tts", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ text: ttsText, voice: selectedVoiceRef.current }),
              }).then(r => {
                if (r.ok && r.headers.get("content-type")?.includes("audio")) {
                  r.blob().then(blob => {
                    const url = URL.createObjectURL(blob);
                    const audio = new Audio(url);
                    audio.onended = () => URL.revokeObjectURL(url);
                    audio.onerror = () => URL.revokeObjectURL(url);
                    audio.play();
                  });
                }
              }).catch(() => {
                if (typeof window !== "undefined" && window.speechSynthesis) {
                  const utter = new SpeechSynthesisUtterance(`Scheduled task complete: ${task.task}`);
                  window.speechSynthesis.speak(utter);
                }
              });
            } catch { /* silent */ }

          } catch (err) {
            // Execution failed — update message with error
            setMessages(prev => prev.map(m =>
              m.id === schedMsgId ? {
                ...m,
                content: `⏰ **Scheduled Task Failed** — ${agentName} agent\n📋 _${task.task}_\n\n❌ ${(err as Error).message || "Unknown error"}`,
                pending: false,
              } : m
            ));
          }
        }
      } catch { /* silent — API might not be ready */ }
    };

    // Check immediately on mount, then every 30 seconds
    checkSchedules();
    const scheduleInterval = setInterval(checkSchedules, 30000);
    return () => clearInterval(scheduleInterval);
  }, [isUnlocked]);

  // Listen for Electron menu bar events (refs for stable callbacks)
  const createNewConversationRef = useRef<(() => void) | null>(null);
  useEffect(() => {
    const onNewChat = () => createNewConversationRef.current?.();
    const onToggleSidebar = () => setSidebarOpen(prev => !prev);
    const onOpenSettings = () => setShowApiKeyModal(true);
    window.addEventListener("hammerlock:new-chat", onNewChat);
    window.addEventListener("hammerlock:toggle-sidebar", onToggleSidebar);
    window.addEventListener("hammerlock:open-settings", onOpenSettings);
    return () => {
      window.removeEventListener("hammerlock:new-chat", onNewChat);
      window.removeEventListener("hammerlock:toggle-sidebar", onToggleSidebar);
      window.removeEventListener("hammerlock:open-settings", onOpenSettings);
    };
  }, []);

  // ---- Load conversations from vault ----
  const historyLoadedRef = useRef(false);
  useEffect(() => {
    if (!isUnlocked || historyLoadedRef.current) return;
    historyLoadedRef.current = true;

    // Load multi-conversation data
    const savedConvos = (vaultData?.settings?.conversations as Conversation[] | undefined) || [];
    const savedGroups = (vaultData?.settings?.conversation_groups as ConversationGroup[] | undefined) || [];

    if (savedConvos.length > 0) {
      setConversations(savedConvos);
      setGroups(savedGroups);
      // Activate most recently updated
      const sorted = [...savedConvos].sort((a, b) => b.updatedAt.localeCompare(a.updatedAt));
      setActiveConvoId(sorted[0].id);
      // Clear any stale pending messages left from interrupted streaming
      const cleanedMsgs = sorted[0].messages.map(m =>
        m.pending ? { ...m, pending: false, content: m.content || "(interrupted)" } : m
      );
      setMessages(cleanedMsgs);
    } else if (vaultData?.chatHistory?.length) {
      // Migrate legacy single-chat to multi-conversation
      const legacy: Conversation = {
        id: generateId(),
        name: `${t.chat_default_name} 1`,
        groupId: null,
        messages: vaultData.chatHistory,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations([legacy]);
      setActiveConvoId(legacy.id);
      // Clear any stale pending messages left from interrupted streaming
      setMessages(legacy.messages.map((m: VaultMessage) =>
        m.pending ? { ...m, pending: false, content: m.content || "(interrupted)" } : m
      ));
    } else {
      // Fresh vault — create first conversation
      const first: Conversation = {
        id: generateId(),
        name: `${t.chat_default_name} 1`,
        groupId: null,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setConversations([first]);
      setActiveConvoId(first.id);
    }
  }, [isUnlocked, vaultData]);

  // Load saved API keys from vault data and push to server
  useEffect(() => {
    if (isUnlocked && vaultData?.settings) {
      const keys = {
        openai: String(vaultData.settings.openai_api_key || ""),
        anthropic: String(vaultData.settings.anthropic_api_key || ""),
        gemini: String(vaultData.settings.gemini_api_key || ""),
        groq: String(vaultData.settings.groq_api_key || ""),
        mistral: String(vaultData.settings.mistral_api_key || ""),
        deepseek: String(vaultData.settings.deepseek_api_key || ""),
        brave: String(vaultData.settings.brave_api_key || ""),
      };
      setApiKeys(keys);
      const hasAnyKey = Object.values(keys).some(k => !!k);
      // Immediately tell subscription store this user has their own keys → bypass paywall
      if (hasAnyKey) setUsingOwnKey(true);
      if (hasAnyKey) {
        fetch("/api/configure", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            openai_api_key: keys.openai,
            anthropic_api_key: keys.anthropic,
            gemini_api_key: keys.gemini,
            groq_api_key: keys.groq,
            mistral_api_key: keys.mistral,
            deepseek_api_key: keys.deepseek,
            brave_api_key: keys.brave,
          }),
        }).catch(() => {});
      }
    }
  }, [isUnlocked, vaultData]);

  // Fetch compute unit balance on launch (desktop only)
  const creditsChecked = useRef(false);
  useEffect(() => {
    if (!isUnlocked || creditsChecked.current) return;
    creditsChecked.current = true;
    if (isElectron()) {
      fetch("/api/credits", { signal: AbortSignal.timeout(5000) })
        .then(res => res.json())
        .then(data => {
          if (data.remainingUnits !== undefined) {
            setComputeUnits({ remaining: data.remainingUnits, total: data.totalUnits, usingOwnKey: data.usingOwnKey, periodEnd: data.periodEnd, monthlyAllocation: data.monthlyAllocation, boosterUnits: data.boosterUnits });
          }
          if (data.usingOwnKey) setUsingOwnKey(true);
        })
        .catch(() => {});
    }
  }, [isUnlocked]);

  // For non-desktop (web) users without a provider, show API key setup
  // Desktop premium users get bundled key + compute units, so no key entry needed
  const setupPromptShown = useRef(false);
  const [needsApiKeys, setNeedsApiKeys] = useState(false);
  useEffect(() => {
    if (!isUnlocked || setupPromptShown.current) return;
    setupPromptShown.current = true;
    fetch("/api/health", { signal: AbortSignal.timeout(5000) })
      .then(res => res.json())
      .then(data => {
        if (data.status === "no_provider" && !isElectron()) {
          // Web users with no provider need to add keys
          setNeedsApiKeys(true);
          setShowApiKeyModal(true);
        }
        // Track Ollama status for setup banner
        if (data.providers) setOllamaDetected(!!data.providers.ollama);
        // Desktop users: bundled key from .env.local handles it — no modal needed
      })
      .catch(() => {});
  }, [isUnlocked]);

  // Show persona onboarding AFTER API key check resolves
  const onboardingChecked = useRef(false);
  useEffect(() => {
    if (!isUnlocked || onboardingChecked.current) return;
    if (needsApiKeys) return;
    if (showApiKeyModal) return;
    onboardingChecked.current = true;
    if (!vaultData?.persona
        && (!vaultData?.chatHistory || vaultData.chatHistory.length === 0)
        && !vaultData?.settings?.onboarding_completed) {
      setOnboardingStep(0);
    }
  }, [isUnlocked, vaultData, needsApiKeys, showApiKeyModal]);

  const handleOnboardingSubmit = useCallback(async () => {
    const answer = onboardingInput.trim();
    if (!answer) return;

    const currentStep = ONBOARDING_STEPS[onboardingStep];
    if (!currentStep) return;

    const newAnswers = { ...onboardingAnswers, [currentStep.key]: answer };
    setOnboardingAnswers(newAnswers);
    setOnboardingInput("");

    const nextStep = onboardingStep + 1;
    if (nextStep < ONBOARDING_STEPS.length) {
      setOnboardingStep(nextStep);
    } else {
      setOnboardingStep(-1);

      const personaText = [
        `Name: ${newAnswers.name || ""}`,
        `Role: ${newAnswers.role || ""}`,
        `Uses HammerLock AI for: ${newAnswers.use_case || ""}`,
        `Communication style: ${newAnswers.style || ""}`,
      ].join("\n");

      await updateVaultData(prev => ({
        ...prev,
        persona: personaText,
        settings: {
          ...(prev.settings || {}),
          user_name: newAnswers.name,
          user_role: newAnswers.role,
          user_use_case: newAnswers.use_case,
          user_style: newAnswers.style,
          onboarding_completed: new Date().toISOString(),
        }
      }));

      try {
        await fetch("/api/save-persona", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ persona: personaText }),
        });
      } catch { /* ok if fails */ }

      // Don't add a welcome message — let the empty state greet the user
      // with prompt suggestions (like ChatGPT / Claude). The empty-state
      // will show "Welcome back, <name>" with suggestion cards.
      setMessages([]);

      // Show permissions setup first, then integration setup on desktop
      if (isElectron() && !vaultData?.settings?.permissions_explored) {
        setTimeout(() => {
          setPermissionsSetupMode("onboarding");
          setShowPermissionsSetup(true);
        }, 600);
      } else if (isElectron() && !vaultData?.settings?.integrations_explored) {
        setTimeout(() => {
          setIntegrationSetupMode("onboarding");
          setShowIntegrationSetup(true);
        }, 600);
      } else {
        setTimeout(() => inputRef.current?.focus(), 100);
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [onboardingStep, onboardingInput, onboardingAnswers, updateVaultData, activeConvoId]);

  // Load custom agents from vault
  const agentsLoadedRef = useRef(false);
  useEffect(() => {
    if (!isUnlocked || agentsLoadedRef.current) return;
    agentsLoadedRef.current = true;
    const saved = (vaultData?.settings?.custom_agents as AgentDef[] | undefined) || [];
    if (saved.length > 0) setCustomAgents(saved);
    const savedAgentId = vaultData?.settings?.active_agent_id as string | undefined;
    if (savedAgentId) setActiveAgentId(savedAgentId);
  }, [isUnlocked, vaultData]);

  // Persist conversations + agents to encrypted vault
  const persistTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(() => {
    if (!isUnlocked || conversations.length === 0) return;
    if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current);
    persistTimeoutRef.current = setTimeout(() => {
      updateVaultData(prev => ({
        ...prev,
        settings: {
          ...(prev.settings || {}),
          conversations: conversations,
          conversation_groups: groups,
          custom_agents: customAgents,
          active_agent_id: activeAgentId,
        }
      })).catch(() => {});
    }, 800);
    return () => { if (persistTimeoutRef.current) clearTimeout(persistTimeoutRef.current); };
  }, [conversations, groups, customAgents, activeAgentId, isUnlocked, updateVaultData]);

  const freeLeft = FREE_MESSAGE_LIMIT - messageCount;
  const desktop = isElectron();

  // Gateway status polling
  useEffect(() => {
    let mounted = true;
    const checkHealth = async () => {
      try {
        const res = await fetch("/api/health", { signal: AbortSignal.timeout(5000) });
        const data = await res.json();
        if (!mounted) return;
        setGatewayStatus(data.status === "ready" ? "connected" : data.status === "no_provider" ? "offline" : "connecting");
        if (data.providers) setOllamaDetected(!!data.providers.ollama);
      } catch {
        if (mounted) setGatewayStatus("offline");
      }
    };
    checkHealth();
    const interval = setInterval(checkHealth, 10000);
    return () => { mounted = false; clearInterval(interval); };
  }, []);

  const showError = useCallback((msg: string) => {
    setErrorBanner(msg);
    if (errorTimerRef.current) clearTimeout(errorTimerRef.current);
    errorTimerRef.current = setTimeout(() => setErrorBanner(null), 10000);
  }, []);

  const handleLock = useCallback(() => {
    lockVault();
    router.push("/vault");
  }, [lockVault, router]);

  // ---- AUTO-LOCK ON INACTIVITY ----
  // Desktop (Electron): 24 hours — user locks manually when desired, vault session
  // persists in localStorage across window close/reopen.
  // Browser: 15 minutes — more aggressive since session is in sessionStorage.
  const AUTO_LOCK_MS = isElectron() ? 24 * 60 * 60 * 1000 : 15 * 60 * 1000;
  const autoLockTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const resetAutoLock = useCallback(() => {
    if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    if (!isUnlocked) return;
    autoLockTimerRef.current = setTimeout(() => {
      handleLock();
    }, AUTO_LOCK_MS);
  }, [isUnlocked, handleLock, AUTO_LOCK_MS]);

  useEffect(() => {
    if (!isUnlocked) return;
    const events = ["mousedown", "keydown", "scroll", "touchstart", "mousemove"];
    const handler = () => resetAutoLock();
    events.forEach(e => window.addEventListener(e, handler, { passive: true }));
    resetAutoLock(); // start timer on mount
    return () => {
      events.forEach(e => window.removeEventListener(e, handler));
      if (autoLockTimerRef.current) clearTimeout(autoLockTimerRef.current);
    };
  }, [isUnlocked, resetAutoLock]);

  // ---- MULTI-CONVERSATION HANDLERS ----
  const switchConversation = useCallback((id: string) => {
    // Save current messages to current conversation
    setConversations(prev => prev.map(c =>
      c.id === activeConvoId ? { ...c, messages, updatedAt: new Date().toISOString() } : c
    ));
    // Switch
    setActiveConvoId(id);
    const target = conversations.find(c => c.id === id);
    // Clear any stale pending messages left from interrupted streaming
    const targetMsgs = target?.messages || [];
    setMessages(targetMsgs.map(m =>
      m.pending ? { ...m, pending: false, content: m.content || "(interrupted)" } : m
    ));
    setUploadedPdf(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [activeConvoId, messages, conversations]);

  const createNewConversation = useCallback((groupId: string | null = null) => {
    // Save current conversation, then create new one
    setConversations(prev => {
      const updated = prev.map(c =>
        c.id === activeConvoId ? { ...c, messages, updatedAt: new Date().toISOString() } : c
      );
      const newConvo: Conversation = {
        id: generateId(),
        name: `${t.chat_default_name} ${updated.length + 1}`,
        groupId,
        messages: [],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      setActiveConvoId(newConvo.id);
      return [...updated, newConvo];
    });
    // Reset state OUTSIDE the setConversations callback to ensure it fires
    setMessages([]);
    setActiveAgentId(DEFAULT_AGENT_ID);
    setUploadedPdf(null);
    setTimeout(() => inputRef.current?.focus(), 50);
  }, [activeConvoId, messages]);

  // Keep ref in sync for Electron menu events
  createNewConversationRef.current = createNewConversation;

  const deleteConversation = useCallback((id: string) => {
    setConversations(prev => {
      const filtered = prev.filter(c => c.id !== id);
      if (filtered.length === 0) {
        // Always keep at least one
        const fresh: Conversation = {
          id: generateId(), name: "Chat 1", groupId: null, messages: [],
          createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
        };
        setActiveConvoId(fresh.id);
        setMessages([]);
        return [fresh];
      }
      if (id === activeConvoId) {
        const next = filtered[0];
        setActiveConvoId(next.id);
        setMessages(next.messages.map(m =>
          m.pending ? { ...m, pending: false, content: m.content || "(interrupted)" } : m
        ));
      }
      return filtered;
    });
  }, [activeConvoId]);

  const renameConversation = useCallback((id: string, name: string) => {
    setConversations(prev => prev.map(c => c.id === id ? { ...c, name } : c));
    setRenamingId(null);
    setRenameValue("");
  }, []);

  const createGroup = useCallback(() => {
    if (!newGroupName.trim()) return;
    const g: ConversationGroup = { id: generateId(), name: newGroupName.trim(), collapsed: false };
    setGroups(prev => [...prev, g]);
    setNewGroupName("");
    setShowNewGroup(false);
  }, [newGroupName]);

  const toggleGroupCollapse = useCallback((id: string) => {
    setGroups(prev => prev.map(g => g.id === id ? { ...g, collapsed: !g.collapsed } : g));
  }, []);

  const deleteGroup = useCallback((id: string) => {
    setGroups(prev => prev.filter(g => g.id !== id));
    // Ungroup conversations in that group
    setConversations(prev => prev.map(c => c.groupId === id ? { ...c, groupId: null } : c));
  }, []);

  // ---- AGENT HANDLERS ----
  const handleCreateAgent = useCallback(() => {
    if (!newAgent.name.trim() || !newAgent.expertise.trim()) return;
    const agent = buildCustomAgent(newAgent);
    setCustomAgents(prev => [...prev, agent]);
    setActiveAgentId(agent.id);
    setShowCreateAgent(false);
    setNewAgent({ name: "", tagline: "", icon: "Bot", color: "#00ff88", expertise: "", personality: "", instructions: "" });
  }, [newAgent]);

  const handleDeleteCustomAgent = useCallback((id: string) => {
    setCustomAgents(prev => prev.filter(a => a.id !== id));
    if (activeAgentId === id) setActiveAgentId(DEFAULT_AGENT_ID);
  }, [activeAgentId]);

  // ---- SAVE API KEYS ----
  const handleSaveApiKeys = useCallback(async () => {
    // Persist to vault (may fail if vault is locked — non-fatal)
    try {
      await updateVaultData(prev => ({
        ...prev,
        settings: {
          ...(prev.settings || {}),
          openai_api_key: apiKeys.openai.trim(),
          anthropic_api_key: apiKeys.anthropic.trim(),
          gemini_api_key: apiKeys.gemini.trim(),
          groq_api_key: apiKeys.groq.trim(),
          mistral_api_key: apiKeys.mistral.trim(),
          deepseek_api_key: apiKeys.deepseek.trim(),
          brave_api_key: apiKeys.brave.trim(),
        }
      }));
    } catch { /* vault may be locked — keys still sent to /api/configure below */ }

    // Send keys to server (configures process.env for LLM providers)
    try {
      const cfgRes = await fetch("/api/configure", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          openai_api_key: apiKeys.openai.trim(),
          anthropic_api_key: apiKeys.anthropic.trim(),
          gemini_api_key: apiKeys.gemini.trim(),
          groq_api_key: apiKeys.groq.trim(),
          mistral_api_key: apiKeys.mistral.trim(),
          deepseek_api_key: apiKeys.deepseek.trim(),
          brave_api_key: apiKeys.brave.trim(),
        }),
      });
      const cfgData = await cfgRes.json().catch(() => ({}));
      if (cfgData.usingOwnKey) setUsingOwnKey(true);
    } catch { /* ok */ }

    // Always close modal and clear paywall state
    setShowApiKeyModal(false);
    setNeedsApiKeys(false);

    // Check gateway health
    try {
      const res = await fetch("/api/health", { signal: AbortSignal.timeout(5000) });
      const data = await res.json();
      setGatewayStatus(data.status === "ready" ? "connected" : "offline");
    } catch { /* ignore */ }
  }, [apiKeys, updateVaultData, setUsingOwnKey]);

  // ---- AUTO-TITLE GENERATOR (non-blocking) ----
  const generateConvoTitle = useCallback(async (userMsg: string, aiReply: string, convoId: string) => {
    try {
      // Read current conversations for dedup (use functional update to avoid stale closure)
      let existingNames: string[] = [];
      setConversations(cs => { existingNames = cs.map(c => c.name).filter(n => !n.startsWith(t.chat_default_name)); return cs; });
      const avoidList = existingNames.length > 0 ? `\nExisting titles (DO NOT reuse these): ${existingNames.slice(0, 10).join(", ")}` : "";
      const res = await fetch("/api/execute", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          command: `Title this chat in 2-5 words. Be SPECIFIC to the content. No quotes, no period, no emoji.\nBAD (too generic): "Casual Greeting Exchange", "General Conversation", "Chat Session", "Friendly Chat"\nGOOD (specific): "Sushi Near Downtown", "Weekly Weather Check", "Pizza Recommendations", "Summer Camp Ideas"${avoidList}\n\nChat:\nUser: ${userMsg.slice(0, 200)}\nAI: ${aiReply.slice(0, 200)}\n\nTitle:`,
          locale,
        }),
        signal: AbortSignal.timeout(8000),
      });
      const data = await res.json();
      let title = (data.response || data.reply || "").replace(/^["']|["']$/g, "").replace(/\.+$/, "").trim();
      if (title && title.length > 2 && title.length < 60) {
        // Dedup: if this title already exists, append a number
        if (existingNames.includes(title)) {
          let n = 2;
          while (existingNames.includes(`${title} ${n}`)) n++;
          title = `${title} ${n}`;
        }
        setConversations(cs => cs.map(c => c.id === convoId ? { ...c, name: title } : c));
      }
    } catch { /* non-critical, keep truncated user message */ }
  }, [locale, t.chat_default_name]);

  // ---- SEND MESSAGE ----
  const sendCommand = useCallback(async (preset?: string) => {
    const text = (preset || input).trim();
    if (text === "" || sending) return;
    // Limit input to 50KB to prevent oversized requests and UI freeze
    if (text.length > 50000) {
      showError("Message is too long. Please shorten it and try again.");
      return;
    }
    if (!isUnlocked) {
      showError("Vault is locked. Please unlock to continue.");
      router.replace("/vault");
      return;
    }
    if (!canSendMessage) {
      // Desktop users who added API keys: check server before showing paywall
      if (isElectron()) {
        try {
          const cr = await fetch("/api/credits", { signal: AbortSignal.timeout(3000) });
          const cd = await cr.json();
          if (cd.usingOwnKey) { setUsingOwnKey(true); /* fall through — allow send */ }
          else { setPaywallFeature("messages"); setShowPaywall(true); return; }
        } catch { setPaywallFeature("messages"); setShowPaywall(true); return; }
      } else {
        setPaywallFeature("messages"); setShowPaywall(true); return;
      }
    }

    let fullText = text;
    const currentPdf = uploadedPdf;
    if (currentPdf) {
      const isImage = currentPdf.text.includes("data:image/");
      // Don't truncate images — the full base64 data URL is needed for vision
      const pdfSnippet = isImage ? currentPdf.text
        : (currentPdf.text.length > 8000
          ? currentPdf.text.slice(0, 8000) + t.chat_pdf_truncated
          : currentPdf.text);
      fullText = `${t.chat_pdf_attached(currentPdf.name)}\n\n${pdfSnippet}\n\n---\n\nUser question: ${text}`;
      setUploadedPdf(null);
    }

    const ts = new Date().toISOString();
    const uid = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pid = `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const userMsg: VaultMessage = {id:uid,role:"user",content:text + (currentPdf ? t.chat_pdf_ref(currentPdf.name) : ""),timestamp:ts};
    const pendingMsg: VaultMessage = {id:pid,role:"ai",content:getThinkingMessage(),timestamp:ts,pending:true};
    setMessages(prev => [...prev, userMsg, pendingMsg]);
    setInput(""); setSending(true);
    const abortController = new AbortController();
    abortControllerRef.current = abortController;
    setTimeout(() => inputRef.current?.focus(), 0);

    try {
      const currentAgent = getAgentById(activeAgentId, customAgents);
      // Token-aware conversation history: walk backward with a ~3 000-token budget
      // (~12 000 chars). Always keep at least the last 2 messages for context.
      const TOKEN_BUDGET = 3000;          // rough token limit for history
      const MAX_MSG_CHARS = 2000;         // truncate individual long messages
      const MIN_MSGS = 2;                 // always include at least 2 messages
      const eligibleMsgs = messages
        .filter(m => !m.pending && (m.role === "user" || m.role === "ai"));
      const recentHistory: { role: string; content: string }[] = [];
      let tokenBudgetLeft = TOKEN_BUDGET;
      for (let i = eligibleMsgs.length - 1; i >= 0 && (tokenBudgetLeft > 0 || recentHistory.length < MIN_MSGS); i--) {
        let txt = eligibleMsgs[i].content;
        if (txt.length > MAX_MSG_CHARS) txt = txt.slice(0, MAX_MSG_CHARS) + "…[truncated]";
        const estTokens = Math.ceil(txt.length / 4);
        recentHistory.unshift({ role: eligibleMsgs[i].role === "user" ? "user" : "assistant", content: txt });
        tokenBudgetLeft -= estTokens;
      }
      // Build user profile from vault persona data so the LLM knows who the user is
      const personaText = vaultData?.persona || "";
      const personaParts: Record<string, string> = {};
      personaText.split("\n").filter((l: string) => l.trim()).forEach((line: string) => {
        const colonIdx = line.indexOf(":");
        if (colonIdx > 0 && colonIdx < 30) {
          const key = line.slice(0, colonIdx).trim().toLowerCase();
          const val = line.slice(colonIdx + 1).trim();
          if (key === "name") personaParts.name = val;
          else if (key === "role" || key === "job" || key === "occupation") personaParts.role = val;
          else if (key === "industry" || key === "field") personaParts.industry = val;
          else personaParts.context = (personaParts.context ? personaParts.context + "; " : "") + line.trim();
        }
      });
      const userProfile = Object.keys(personaParts).length > 0 ? personaParts : undefined;
      // In voice mode, inject concise-response prompt so AI gives spoken-friendly answers
      const voiceModePrompt = voiceInputRef.current
        ? "\n\n[VOICE MODE] The user is speaking to you via voice. Keep responses concise and conversational — 2-3 sentences unless they ask for detail. Avoid markdown, bullet points, code blocks, or visual formatting. Use natural speech patterns. Say \"first, second, third\" instead of bullet lists."
        : "";
      const agentPrompt = (currentAgent?.systemPrompt || "") + voiceModePrompt;
      const res = await fetch("/api/execute", {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({command:fullText,persona:"operator",userProfile,agentSystemPrompt:agentPrompt,locale,history:recentHistory,stream:true,selectedProvider:selectedModel !== "auto" ? selectedModel : undefined}),signal:abortController.signal});

      // ---- STREAMING PATH: read SSE tokens as they arrive ----
      const contentType = res.headers.get("content-type") || "";
      let reply = "";
      let msgFollowUps: string[] | undefined;
      let msgSources: any[] | undefined;
      let msgSourcesSummary: string | undefined;
      let msgActionType: string | undefined;
      let msgActionStatus: "success" | "error" | undefined;
      let msgDeepLink: string | undefined;

      if (contentType.includes("text/event-stream") && res.body) {
        // Streaming response — display tokens progressively
        const reader = res.body.getReader();
        const decoder = new TextDecoder();
        let sseBuffer = "";
        let accumulated = "";
        let rafPending = false;

        // Stale-stream watchdog: if no data arrives for 30s, abort
        const STREAM_STALE_MS = 30_000;
        let staleTimer = setTimeout(() => { try { abortController.abort(); reader.cancel(); } catch {} }, STREAM_STALE_MS);

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          // Reset stale timer on each chunk
          clearTimeout(staleTimer);
          staleTimer = setTimeout(() => { try { abortController.abort(); reader.cancel(); } catch {} }, STREAM_STALE_MS);
          sseBuffer += decoder.decode(value, { stream: true });
          const sseLines = sseBuffer.split("\n\n");
          sseBuffer = sseLines.pop() || "";

          for (const block of sseLines) {
            const dataLine = block.split("\n").find(l => l.startsWith("data: "));
            if (!dataLine) continue;
            try {
              const json = JSON.parse(dataLine.slice(6));
              if (json.token) {
                accumulated += json.token;
                // Throttle UI updates to ~60fps with requestAnimationFrame
                if (!rafPending) {
                  rafPending = true;
                  const snapshot = accumulated;
                  requestAnimationFrame(() => {
                    setMessages(prev => prev.map(m => m.id === pid ? { ...m, content: snapshot, pending: true } : m));
                    rafPending = false;
                  });
                }
              }
              if (json.done) {
                reply = json.response || accumulated;
                msgFollowUps = Array.isArray(json.followUps) ? json.followUps : undefined;
              }
              if (json.error) {
                reply = `Error: ${json.error}`;
                // Error is also a terminal event — ensure message finalizes
                if (!json.done) json.done = true;
              }
            } catch { /* skip malformed SSE chunks */ }
          }
        }
        clearTimeout(staleTimer); // Clean up stale-stream watchdog
        if (!reply) reply = accumulated;
      } else {
        // ---- JSON FALLBACK: non-streaming response (search, actions, special commands) ----
        const data = await res.json();
        if (!res.ok) {
          showError(`Gateway error: ${data.response || data.error || t.error_unknown}`);
          setMessages(prev => prev.map(m => m.id===pid ? {...m,role:"error",content:data.response || data.error || t.error_request_failed,pending:false} : m));
          return;
        }
        if (data.creditExhausted) {
          setMessages(prev => prev.map(m => m.id===pid ? {...m,content:data.response,pending:false,timestamp:new Date().toISOString()} : m));
          setComputeUnits(prev => prev ? { ...prev, remaining: 0 } : null);
          return;
        }
        if (data.switchLocale) setLocale(data.switchLocale as Locale);
        if (data.setNudges !== undefined) {
          updateVaultData((prev) => ({ ...prev, settings: { ...prev.settings, nudges_enabled: data.setNudges } }));
        }
        reply = data.reply || data.response || data.result || t.chat_no_response;
        msgSources = Array.isArray(data.sources) ? data.sources : undefined;
        msgSourcesSummary = data.sourcesSummary || undefined;
        msgFollowUps = Array.isArray(data.followUps) ? data.followUps : undefined;
        msgActionType = typeof data.actionType === "string" ? data.actionType : undefined;
        msgActionStatus = (data.actionStatus === "success" || data.actionStatus === "error") ? data.actionStatus as "success" | "error" : undefined;
        msgDeepLink = typeof data.deepLink === "string" ? data.deepLink : undefined;
      }

      // Finalize message with full response
      setMessages(prev => {
        const updated = prev.map(m => m.id===pid ? {...m,content:reply,pending:false,timestamp:new Date().toISOString(),sources:msgSources,sourcesSummary:msgSourcesSummary,followUps:msgFollowUps,actionType:msgActionType,actionStatus:msgActionStatus,deepLink:msgDeepLink} : m);
        const isFirstExchange = prev.filter(m => m.role === "user").length <= 1;
        setConversations(cs => cs.map(c => {
          if (c.id !== activeConvoId) return c;
          if (isFirstExchange && c.name.startsWith(t.chat_default_name)) {
            const tempName = text.replace(/\n/g, " ").trim().slice(0, 45) + (text.length > 45 ? "…" : "");
            generateConvoTitle(text, reply, c.id);
            return { ...c, name: tempName, messages: updated, updatedAt: new Date().toISOString() };
          }
          return { ...c, messages: updated, updatedAt: new Date().toISOString() };
        }));
        return updated;
      });
      incrementMessageCount();

      // Contextual nudges — show tips at the right moment
      // Suppress for short utility queries (time, date, status) — don't interrupt quick checks
      const isQuickUtility = /^(wh?at\s*(?:time|tim)|w(?:hat)?t\s*(?:rn)?|time\s*(?:rn|now)?|(?:the\s+)?date|status)[\s?!.]*$/i.test(text.trim());
      if (!isQuickUtility) {
        const msgCount = messageCount + 1;
        if (msgCount === 2) triggerNudge("remember_tip");
        else if (msgCount === 5) triggerNudge("agents_tip");
        else if (msgCount === 8) triggerNudge("search_tip");
        else if (msgCount === 10) triggerNudge("voice_tip");
        else if (msgCount === 15) triggerNudge("agent_deep_tip");
        else if (msgCount === 20) triggerNudge("vault_tip");
      }

      // Auto-play TTS if user said "read this out loud", "talk to me", or if input came from voice
      const ttsExact = /^(talk\s+to\s+me|read\s+it\s+(?:out\s+)?(?:loud|aloud)|say\s+it)[\s.!?]*$/i;
      const ttsPrefix = /^(read\s+(?:this\s+)?out\s+loud|say\s+this|speak|read\s+aloud|talk\s+to\s+me)[:\s]/i;
      const isTalkToMe = /^talk\s+to\s+me[\s.!?]*$/i.test(text.trim());
      const shouldAutoTTS = voiceInputRef.current || ttsExact.test(text.trim()) || ttsPrefix.test(text.trim());

      // "talk to me" = live conversation mode
      if (isTalkToMe) liveConvoRef.current = true;

      if (shouldAutoTTS) {
        voiceInputRef.current = false;
        // In live convo mode, set a callback that fires when TTS audio actually ends
        // (replaces the old brittle word-count * 350ms estimate)
        if (liveConvoRef.current) {
          ttsFinishedCallbackRef.current = () => {
            if (liveConvoRef.current && !isListening) {
              setTimeout(() => handleVoiceRef.current(), 300); // small buffer before re-listening
            }
          };
        }
        setTimeout(() => handleReadAloud(pid, reply), 300);
      }

      // Refresh compute units balance (desktop only, non-blocking)
      if (isElectron()) {
        fetch("/api/credits", { signal: AbortSignal.timeout(3000) })
          .then(r => r.json())
          .then(d => {
            if (d.remainingUnits !== undefined) {
              setComputeUnits({ remaining: d.remainingUnits, total: d.totalUnits, usingOwnKey: d.usingOwnKey });
            }
            if (d.usingOwnKey) setUsingOwnKey(true);
          })
          .catch(() => {});
      }
    } catch(e) {
      if (abortController.signal.aborted) {
        // User cancelled or stream timed out — keep whatever we streamed so far
        setMessages(prev => prev.map(m => {
          if (m.id !== pid) return m;
          const hasContent = m.content && !(THINKING_MESSAGES as readonly string[]).includes(m.content) && m.content.length > 5;
          return {
            ...m,
            pending: false,
            content: hasContent ? m.content : "*(Connection timed out. Please try again.)*",
            timestamp: new Date().toISOString(),
          };
        }));
      } else {
        const errMsg = String(e);
        setMessages(prev => prev.map(m => m.id===pid ? {...m,role:"error",content:errMsg,pending:false} : m));
        showError(errMsg);
      }
    } finally {
      abortControllerRef.current = null;
      setSending(false);
      // Safety net: force-clear any stuck pending messages (e.g. if catch block also failed)
      setMessages(prev => {
        const hasPending = prev.some(m => m.pending);
        if (!hasPending) return prev;
        return prev.map(m => m.pending ? { ...m, pending: false, content: m.content || "(interrupted)" } : m);
      });
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }, [input, sending, isUnlocked, canSendMessage, incrementMessageCount, showError, uploadedPdf, activeConvoId, router, t.chat_processing]);

  // ---- STOP / CANCEL ----
  const stopResponse = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
  }, []);

  // Keep sendCommand ref in sync so voice callbacks always use latest version
  sendCommandRef.current = sendCommand;

  // ---- VOICE INPUT with silence detection + audio level visualization ----
  const silenceTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const silenceFrameRef = useRef(0);

  // Cleanup helper — stops all recording resources
  const cleanupRecording = useCallback(() => {
    if (silenceTimerRef.current) { clearInterval(silenceTimerRef.current); silenceTimerRef.current = null; }
    if (recordingTimerRef.current) { clearInterval(recordingTimerRef.current); recordingTimerRef.current = null; }
    if (audioContextRef.current) { audioContextRef.current.close().catch(() => {}); audioContextRef.current = null; }
    analyserRef.current = null;
    setAudioLevel(0);
    setRecordingTime(0);
  }, []);

  const handleVoice = useCallback(async () => {
    if (!isFeatureAvailable("voice_input")) {
      setPaywallFeature("Voice Input"); setShowPaywall(true); return;
    }
    // Barge-in: if TTS is playing, stop it immediately and start listening
    if (ttsAudioRef.current) {
      ttsAudioRef.current.pause();
      ttsAudioRef.current = null;
    }
    window.speechSynthesis?.cancel();
    if (speakingMsgId) setSpeakingMsgId(null);
    // Cancel any pending TTS callbacks
    ttsFinishedCallbackRef.current = null;

    if (isListening && mediaRecorderRef.current) {
      // Toggle off — stop recording
      cleanupRecording();
      mediaRecorderRef.current.stop();
      return;
    }
    try {
      // Request audio with quality hints for better transcription
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
          sampleRate: { ideal: 16000 }, // Whisper optimal sample rate
          channelCount: { ideal: 1 },   // Mono is better for speech
        }
      });

      // Pick best available codec
      const mimeType = MediaRecorder.isTypeSupported("audio/webm;codecs=opus")
        ? "audio/webm;codecs=opus"
        : MediaRecorder.isTypeSupported("audio/webm") ? "audio/webm" : "audio/mp4";
      const recorder = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 });
      audioChunksRef.current = [];
      mediaRecorderRef.current = recorder;

      // Set up Web Audio API for silence detection + level visualization
      const audioCtx = new AudioContext({ sampleRate: 16000 });
      audioContextRef.current = audioCtx;
      const source = audioCtx.createMediaStreamSource(stream);
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 1024;
      analyser.smoothingTimeConstant = 0.4;
      source.connect(analyser);
      analyserRef.current = analyser;
      silenceFrameRef.current = 0;
      let hasSpeech = false;
      let peakLevel = 0; // Track peak for auto-calibration

      const SILENCE_THRESHOLD = 12;       // RMS below this = silence
      const SPEECH_THRESHOLD = 20;        // RMS above this = definitely speech
      const SILENCE_FRAMES_TO_STOP = 25;  // 25 × 80ms = 2s of silence to auto-stop
      const MAX_RECORDING_MS = 60000;     // 60s max recording (safety limit)
      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      // Audio level check every 80ms (slightly faster for smoother visual)
      silenceTimerRef.current = setInterval(() => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        // Calculate RMS
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) sum += dataArray[i] * dataArray[i];
        const rms = Math.sqrt(sum / dataArray.length);

        // Track peak for normalization
        if (rms > peakLevel) peakLevel = rms;

        // Normalize audio level to 0-100 for visualization
        const normalizedLevel = peakLevel > 0 ? Math.min(100, Math.round((rms / Math.max(peakLevel, 40)) * 100)) : 0;
        setAudioLevel(normalizedLevel);

        if (rms > SPEECH_THRESHOLD) {
          hasSpeech = true;
          silenceFrameRef.current = 0;
        } else if (rms > SILENCE_THRESHOLD) {
          // Ambiguous zone — don't count as silence if user was speaking
          if (hasSpeech) silenceFrameRef.current = Math.max(0, silenceFrameRef.current - 1);
        } else {
          silenceFrameRef.current++;
        }

        // Auto-stop after sustained silence (only after user has spoken)
        if (hasSpeech && silenceFrameRef.current >= SILENCE_FRAMES_TO_STOP) {
          if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
            mediaRecorderRef.current.stop();
          }
          cleanupRecording();
        }
      }, 80) as unknown as ReturnType<typeof setTimeout>;

      // Recording time counter (updates every second)
      setRecordingTime(0);
      recordingTimerRef.current = setInterval(() => {
        setRecordingTime(prev => prev + 1);
      }, 1000);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      const recordingStartTime = Date.now();

      // Safety: auto-stop at max duration
      const maxRecordingTimer = setTimeout(() => {
        if (mediaRecorderRef.current && mediaRecorderRef.current.state === "recording") {
          mediaRecorderRef.current.stop();
          cleanupRecording();
        }
      }, MAX_RECORDING_MS);

      recorder.onstop = async () => {
        clearTimeout(maxRecordingTimer);
        stream.getTracks().forEach(track => track.stop());
        cleanupRecording();
        setIsListening(false);
        mediaRecorderRef.current = null;
        const audioBlob = new Blob(audioChunksRef.current, { type: mimeType });
        audioChunksRef.current = [];
        const recordingDuration = Date.now() - recordingStartTime;

        // Minimum duration check — 0.5s
        if (audioBlob.size < 1000 || recordingDuration < 500) {
          showError("Keep talking — I'm listening! Tap the mic and speak for at least a second.");
          return;
        }

        setInput("🎙️ Transcribing...");
        try {
          const formData = new FormData();
          const ext = mimeType.includes("mp4") ? "mp4" : "webm";
          formData.append("audio", audioBlob, `recording.${ext}`);
          formData.append("locale", locale);
          const res = await fetch("/api/transcribe", { method: "POST", body: formData });
          const data = await res.json();
          if (res.ok && data.text) {
            // Auto-send voice input and flag for auto-TTS reply
            voiceInputRef.current = true;
            setInput("");
            sendCommandRef.current(data.text);
          } else {
            showError(data.error || t.error_transcription_failed);
            setInput("");
          }
        } catch (err) {
          showError(t.error_transcription_error + ": " + String(err));
          setInput("");
        }
      };

      recorder.onerror = () => {
        clearTimeout(maxRecordingTimer);
        stream.getTracks().forEach(track => track.stop());
        cleanupRecording();
        setIsListening(false); mediaRecorderRef.current = null;
        showError(t.error_voice_recording);
      };

      // Start recording — collect data in 200ms chunks for responsiveness
      recorder.start(200);
      setIsListening(true);
    } catch (err) {
      const msg = (err as Error).message || String(err);
      if (msg.includes("Permission denied") || msg.includes("NotAllowedError")) {
        showError(t.error_voice_denied);
      } else {
        showError(t.error_voice_mic + ": " + msg);
      }
    }
  }, [isFeatureAvailable, isListening, showError, t, cleanupRecording, speakingMsgId]);

  // Keep handleVoice ref in sync
  handleVoiceRef.current = handleVoice;

  // ---- COPY TO CLIPBOARD ----
  // ---- WORKFLOW ENGINE HANDLERS ----
  /** Execute a single workflow action (sends command through OpenClaw) */
  const handleWorkflowAction = useCallback((action: WorkflowAction, msgContent: string) => {
    if (action.command === "__copy_clean__") {
      // Special: strip markdown and copy clean text
      const clean = msgContent.replace(/[#*_`~\[\]()>]/g, "").replace(/\n{3,}/g, "\n\n").trim();
      navigator.clipboard.writeText(clean).then(() => {
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2000);
      }).catch(() => {});
      return;
    }
    const truncated = msgContent.length > 2000 ? msgContent.slice(0, 2000) + "..." : msgContent;
    const cmd = action.command.replace(/\{content\}/g, truncated);
    sendCommand(cmd);
  }, [sendCommand]);

  /** Execute a multi-step workflow chain sequentially */
  const handleWorkflowChain = useCallback(async (chain: WorkflowChain, msgContent: string) => {
    if (chainRunning) return;
    setChainRunning(true);
    setChainTotal(chain.steps.length);
    const truncated = msgContent.length > 2000 ? msgContent.slice(0, 2000) + "..." : msgContent;

    try {
      for (let i = 0; i < chain.steps.length; i++) {
        setChainStep(i + 1);
        setWorkflowToast(`🔨 Hammering step ${i + 1}/${chain.steps.length}...`);
        const cmd = chain.steps[i].replace(/\{content\}/g, truncated);
        await sendCommand(cmd);
        // Wait between steps to let streaming finish
        if (i < chain.steps.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 4000));
        }
      }
      setWorkflowToast("🔨 Nailed it! Workflow complete.");
    } catch {
      setWorkflowToast("⚠️ Workflow interrupted.");
    }
    setTimeout(() => {
      setWorkflowToast(null);
      setChainRunning(false);
      setChainStep(0);
      setChainTotal(0);
    }, 2500);
  }, [chainRunning, sendCommand]);

  const handleCopy = useCallback((text: string) => {
    navigator.clipboard.writeText(text)
      .then(() => {
        setCopiedToast(true);
        setTimeout(() => setCopiedToast(false), 2000);
      })
      .catch(() => {
        // Fallback for sandboxed Electron / non-secure contexts
        try {
          const ta = document.createElement("textarea");
          ta.value = text;
          ta.style.position = "fixed";
          ta.style.opacity = "0";
          document.body.appendChild(ta);
          ta.select();
          document.execCommand("copy");
          document.body.removeChild(ta);
          setCopiedToast(true);
          setTimeout(() => setCopiedToast(false), 2000);
        } catch {
          showError("Couldn't copy to clipboard");
        }
      });
  }, [showError]);

  // ---- NUDGE SYSTEM ----
  const triggerNudge = useCallback((nudgeId: string) => {
    if (!shouldShowNudge(nudgeId)) return;
    const nudge = NUDGE_CATALOG[nudgeId];
    if (!nudge) return;
    // Don't stack nudges — dismiss any existing one first
    if (activeNudge) return;
    // Small delay so it doesn't feel intrusive
    if (nudgeTimerRef.current) clearTimeout(nudgeTimerRef.current);
    nudgeTimerRef.current = setTimeout(() => setActiveNudge(nudge), 1200);
  }, [shouldShowNudge, activeNudge]);

  const handleNudgeDismiss = useCallback(() => {
    setActiveNudge(null);
  }, []);

  const handleNudgeDismissPermanent = useCallback(() => {
    if (activeNudge) {
      dismissNudge(activeNudge.id);
    }
    setActiveNudge(null);
  }, [activeNudge, dismissNudge]);

  const handleNudgeDisableAll = useCallback(() => {
    disableAllNudges();
    setActiveNudge(null);
  }, [disableAllNudges]);

  const handleNudgeCta = useCallback((command: string) => {
    // Special command: open the agents section in sidebar
    if (command === "__open_agents_tab__") {
      setSidebarOpen(true);
      setSidebarTab("tools");
      setActiveNudge(null);
      return;
    }
    // If command ends with space, put it in input box
    if (command.endsWith(" ")) {
      setInput(command);
      inputRef.current?.focus();
    } else {
      sendCommand(command);
    }
    setActiveNudge(null);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const [vaultSaved, setVaultSaved] = useState(false);

  // ---- FILE VAULT OPERATIONS ----
  const vaultFiles: VaultFile[] = (vaultData?.vaultFiles || []) as VaultFile[];

  const addVaultFile = useCallback(async (file: Omit<VaultFile, "id" | "createdAt" | "updatedAt">) => {
    const now = new Date().toISOString();
    const newFile: VaultFile = {
      ...file,
      id: generateId(),
      createdAt: now,
      updatedAt: now,
    };
    await updateVaultData(prev => ({
      ...prev,
      vaultFiles: [...(prev.vaultFiles || []), newFile],
    }));
    return newFile;
  }, [updateVaultData]);

  const deleteVaultFile = useCallback(async (fileId: string) => {
    await updateVaultData(prev => ({
      ...prev,
      vaultFiles: (prev.vaultFiles || []).filter(f => f.id !== fileId),
    }));
  }, [updateVaultData]);

  const saveSnippetToVault = useCallback(async (text: string, title?: string) => {
    const name = title || text.replace(/\n/g, " ").trim().slice(0, 60) + (text.length > 60 ? "..." : "");
    await addVaultFile({
      name,
      type: "snippet",
      content: text,
      tags: ["chat-snippet"],
      size: new Blob([text]).size,
    });
    setVaultSaved(true);
    setTimeout(() => setVaultSaved(false), 2000);
  }, [addVaultFile]);

  const saveNoteToVault = useCallback(async () => {
    if (!newNoteContent.trim()) return;
    const name = newNoteTitle.trim() || newNoteContent.trim().slice(0, 60) + (newNoteContent.length > 60 ? "..." : "");
    await addVaultFile({
      name,
      type: "note",
      content: newNoteContent,
      tags: ["note"],
      size: new Blob([newNoteContent]).size,
    });
    setNewNoteTitle("");
    setNewNoteContent("");
    setShowNewNote(false);
  }, [addVaultFile, newNoteTitle, newNoteContent]);

  const savePdfToVault = useCallback(async (fileName: string, text: string, size?: number) => {
    await addVaultFile({
      name: fileName,
      type: "pdf",
      content: text,
      mimeType: "application/pdf",
      tags: ["pdf", "document"],
      size,
    });
  }, [addVaultFile]);

  const filteredVaultFiles = vaultSearchQuery.trim()
    ? vaultFiles.filter(f =>
        f.name.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
        f.content.toLowerCase().includes(vaultSearchQuery.toLowerCase()) ||
        f.tags.some(tag => tag.toLowerCase().includes(vaultSearchQuery.toLowerCase()))
      )
    : vaultFiles;

  // ---- READ ALOUD (TTS) — OpenAI TTS with browser fallback ----
  const ttsAudioRef = useRef<HTMLAudioElement | null>(null);
  const handleReadAloud = useCallback(async (msgId: string, text: string) => {
    // Toggle off if already speaking this message
    if (speakingMsgId === msgId) {
      window.speechSynthesis.cancel();
      if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
      setSpeakingMsgId(null);
      return;
    }
    // Stop any current speech
    window.speechSynthesis.cancel();
    if (ttsAudioRef.current) { ttsAudioRef.current.pause(); ttsAudioRef.current = null; }
    setSpeakingMsgId(msgId);

    try {
      // Try OpenAI TTS first (much better voice quality)
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text, voice: selectedVoiceRef.current }),
      });

      if (res.ok) {
        const contentType = res.headers.get("content-type") || "";
        if (contentType.includes("audio")) {
          // Got audio back — play it
          const blob = await res.blob();
          const url = URL.createObjectURL(blob);
          const audio = new Audio(url);
          ttsAudioRef.current = audio;
          audio.onended = () => {
            setSpeakingMsgId(null); URL.revokeObjectURL(url); ttsAudioRef.current = null;
            // "Talk to me" mode: auto-restart mic when TTS finishes
            ttsFinishedCallbackRef.current?.();
            ttsFinishedCallbackRef.current = null;
          };
          audio.onerror = () => {
            setSpeakingMsgId(null); URL.revokeObjectURL(url); ttsAudioRef.current = null;
            ttsFinishedCallbackRef.current?.();
            ttsFinishedCallbackRef.current = null;
          };
          audio.play();
          return;
        }
        // JSON response means fallback needed
      }
    } catch {
      // Network error — fall through to browser TTS
    }

    // Fallback: browser Web Speech API
    const cleanText = text.replace(/[#*_`~\[\]()]/g, "").replace(/!\[.*?\]\(.*?\)/g, "").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
    const utterance = new SpeechSynthesisUtterance(cleanText);
    utterance.onend = () => {
      setSpeakingMsgId(null);
      ttsFinishedCallbackRef.current?.();
      ttsFinishedCallbackRef.current = null;
    };
    utterance.onerror = () => {
      setSpeakingMsgId(null);
      ttsFinishedCallbackRef.current?.();
      ttsFinishedCallbackRef.current = null;
    };
    window.speechSynthesis.speak(utterance);
  }, [speakingMsgId]);

  // ---- REGENERATE LAST RESPONSE ----
  const handleRegenerate = useCallback(() => {
    const lastUserMsg = [...messages].reverse().find(m => m.role === "user");
    if (lastUserMsg) {
      // Remove the last assistant message
      setMessages(prev => {
        const copy = [...prev];
        while (copy.length > 0 && copy[copy.length - 1].role === "ai") copy.pop();
        return copy;
      });
      // Re-send the last user message
      setTimeout(() => sendCommand(lastUserMsg.content), 100);
    }
  }, [messages, sendCommand]);

  // ---- TUTORIAL (first launch) ----
  const TUTORIAL_STEPS = [
    { icon: "🔐", title: t.tutorial_title || "Get the Most Out of HammerLock AI", desc: t.tutorial_step1_desc || "HammerLock AI encrypts everything on your device. Your conversations, personas, and files never leave your machine." },
    { icon: "🤖", title: t.tutorial_step2_title || `${BUILT_IN_AGENTS.length} Specialized Agents`, desc: t.tutorial_step2_desc || "Switch between specialized agents in the sidebar — each one is optimized for different tasks. Create your own custom agents too." },
    { icon: "🎙️", title: t.tutorial_step3_title || "Voice & Web Search", desc: t.tutorial_step3_desc || "Click the microphone to dictate. Type 'search' to find anything on the web with cited sources. All queries are PII-scrubbed." },
    { icon: "🧠", title: t.tutorial_step4_title || "Teach It About You", desc: t.tutorial_step4_desc || "Say 'remember that...' to store preferences. Load your persona each session. HammerLock AI gets smarter the more you use it." },
    { icon: "🚀", title: t.tutorial_done_title || "You're All Set!", desc: t.tutorial_done_desc || "Start chatting, upload PDFs, run searches, or switch agents. Everything stays encrypted on your machine." },
  ];

  useEffect(() => {
    if (!isUnlocked) return;
    if (onboardingStep >= 0) return; // Don't show during onboarding
    if (showApiKeyModal) return;
    if (typeof window === "undefined") return;
    if (!localStorage.getItem("hammerlock_tutorial_seen") && vaultData?.persona) {
      setTutorialStep(0);
    }
  }, [isUnlocked, onboardingStep, showApiKeyModal, vaultData]);

  const handleTutorialNext = useCallback(() => {
    if (tutorialStep >= TUTORIAL_STEPS.length - 1) {
      localStorage.setItem("hammerlock_tutorial_seen", "1");
      setTutorialStep(-1);
    } else {
      setTutorialStep(prev => prev + 1);
    }
  }, [tutorialStep, TUTORIAL_STEPS.length]);

  const handleTutorialSkip = useCallback(() => {
    localStorage.setItem("hammerlock_tutorial_seen", "1");
    setTutorialStep(-1);
  }, []);

  // ---- PDF UPLOAD ----
  const handleUpload = useCallback(() => {
    if (!isFeatureAvailable("pdf_upload")) {
      setPaywallFeature("PDF Upload"); setShowPaywall(true); return;
    }
    fileInputRef.current?.click();
  }, [isFeatureAvailable]);

  const handleFileChange = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 10 * 1024 * 1024) { showError(t.error_pdf_large || "File too large (max 10MB)"); return; }

    const name = file.name.toLowerCase();
    const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(name);
    const isPdf = name.endsWith(".pdf");

    if (!isPdf && !isImage) {
      showError("Supported formats: PDF, PNG, JPG, GIF, WebP");
      if (fileInputRef.current) fileInputRef.current.value = "";
      return;
    }

    try {
      if (isPdf) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/pdf-parse", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) { showError(data.error || t.error_pdf_parse_failed); return; }
        setUploadedPdf({ name: file.name, text: data.text });
        setInput(prev => prev || t.chat_summarize_pdf);
        // Also save to vault for persistent access
        savePdfToVault(file.name, data.text, file.size).catch(() => {});
      } else {
        // Image: read as data URL and attach as context
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setUploadedPdf({ name: file.name, text: `[Image attached: ${file.name}]\n${dataUrl}` });
          setInput(prev => prev || "Describe this image");
        };
        reader.onerror = () => showError("Failed to read image file");
        reader.readAsDataURL(file);
      }
      inputRef.current?.focus();
    } catch (err) {
      showError((t.error_pdf_upload_failed || "Upload failed") + ": " + String(err));
    } finally {
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  }, [showError, t]);

  // ---- DRAG & DROP file upload ----
  const handleDragEnter = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current++;
    if (e.dataTransfer?.types?.includes("Files")) {
      setIsDraggingFile(true);
    }
  }, []);

  const handleDragLeave = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current--;
    if (dragCounterRef.current === 0) {
      setIsDraggingFile(false);
    }
  }, []);

  const handleDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  }, []);

  const handleDrop = useCallback(async (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    dragCounterRef.current = 0;
    setIsDraggingFile(false);

    const file = e.dataTransfer?.files?.[0];
    if (!file) return;

    if (!isFeatureAvailable("pdf_upload")) {
      setPaywallFeature("PDF Upload"); setShowPaywall(true); return;
    }

    if (file.size > 10 * 1024 * 1024) { showError("File too large (max 10MB)"); return; }

    const name = file.name.toLowerCase();
    const isImage = /\.(png|jpg|jpeg|gif|webp|bmp|svg)$/.test(name);
    const isPdf = name.endsWith(".pdf");

    if (!isPdf && !isImage) {
      showError("Supported formats: PDF, PNG, JPG, GIF, WebP");
      return;
    }

    try {
      if (isPdf) {
        const formData = new FormData();
        formData.append("file", file);
        const res = await fetch("/api/pdf-parse", { method: "POST", body: formData });
        const data = await res.json();
        if (!res.ok) { showError(data.error || "Failed to parse PDF"); return; }
        setUploadedPdf({ name: file.name, text: data.text });
        setInput(prev => prev || t.chat_summarize_pdf);
        savePdfToVault(file.name, data.text, file.size).catch(() => {});
      } else {
        const reader = new FileReader();
        reader.onload = () => {
          const dataUrl = reader.result as string;
          setUploadedPdf({ name: file.name, text: `[Image attached: ${file.name}]\n${dataUrl}` });
          setInput(prev => prev || "Describe this image");
        };
        reader.onerror = () => showError("Failed to read image file");
        reader.readAsDataURL(file);
      }
      inputRef.current?.focus();
    } catch (err) {
      showError("Upload failed: " + String(err));
    }
  }, [isFeatureAvailable, showError, t]);

  // ---- GENERATE REPORT ----
  const handleGenerateReport = useCallback(async () => {
    if (!isFeatureAvailable("reports")) { setPaywallFeature("Reports"); setShowPaywall(true); return; }
    if (messages.length === 0) { showError(t.error_no_conversation); return; }
    const ts = new Date().toISOString();
    const uid = `u-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    const pid = `p-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    setMessages(prev => [...prev,
      {id:uid,role:"user",content:t.chat_generate_report,timestamp:ts},
      {id:pid,role:"ai",content:t.chat_generating_report,timestamp:ts,pending:true}
    ]);
    try {
      const completed = messages.filter(m => !m.pending && m.role !== "error");
      const res = await fetch("/api/report", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ messages: completed, reportType: "summary", timeRange: "this session" }),
      });
      const data = await res.json();
      if (res.ok && data.report) {
        setMessages(prev => prev.map(m => m.id===pid ? {...m,content:data.report,pending:false,timestamp:new Date().toISOString()} : m));
      } else {
        setMessages(prev => prev.map(m => m.id===pid ? {...m,role:"error",content:data.error || t.error_report_failed,pending:false} : m));
      }
    } catch(e) {
      setMessages(prev => prev.map(m => m.id===pid ? {...m,role:"error",content:String(e),pending:false} : m));
    }
  }, [messages, isFeatureAvailable, showError, t]);

  // ---- SHARE ----
  const handleShare = useCallback(async () => {
    if (!isFeatureAvailable("share")) { setPaywallFeature("Share"); setShowPaywall(true); return; }
    if (messages.length === 0) { showError(t.error_no_share); return; }
    try {
      const completed = messages.filter(m => !m.pending);
      const res = await fetch("/api/share", {
        method: "POST", headers: {"Content-Type":"application/json"},
        body: JSON.stringify({ entries: completed.map(m => ({ role: m.role, content: m.content, timestamp: m.timestamp })), expiresIn: 24 }),
      });
      const data = await res.json();
      if (res.ok && data.shareUrl) {
        const ts = new Date().toISOString();
        setMessages(prev => [...prev, {
          id: Date.now().toString(), role: "ai",
          content: t.chat_share_success(data.shareUrl, data.entryCount),
          timestamp: ts,
        }]);
        try { await navigator.clipboard.writeText(data.shareUrl); } catch { /* ok */ }
      } else { showError(data.error || t.chat_share_failed); }
    } catch(e) { showError(t.chat_share_error(String(e))); }
  }, [messages, isFeatureAvailable, showError, t]);

  // ---- EXPORT CHAT ----
  const handleExportChat = useCallback(() => {
    if (messages.length === 0) { showError(t.error_no_share); return; }
    const lines = messages.filter(m => !m.pending).map(m => {
      const who = m.role === "user" ? t.chat_sender_you : t.chat_sender_ai;
      const time = m.timestamp ? new Date(m.timestamp).toLocaleString() : "";
      return `[${who}] ${time}\n${m.content}\n`;
    });
    const text = `${t.chat_export_header}\n${"=".repeat(40)}\n\n${lines.join("\n")}`;
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `hammerlock-chat-${new Date().toISOString().slice(0, 10)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  }, [messages, showError, t]);

  // ---- CLEAR / NEW CHAT ----
  const handleClearChat = useCallback(() => {
    createNewConversation(null);
  }, [createNewConversation]);

  const statusDotClass = gatewayStatus === "connected" ? "dot connected" : gatewayStatus === "connecting" ? "dot connecting" : "dot offline";
  const statusLabel = gatewayStatus === "connected" ? t.topbar_connected : gatewayStatus === "connecting" ? t.topbar_connecting : t.topbar_offline;
  const hasMessages = messages.length > 0;

  // Date bucket helper for sidebar section headers
  const getDateBucket = (isoDate: string): string => {
    const d = new Date(isoDate);
    const now = new Date();
    const startOfToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const startOfYesterday = new Date(startOfToday.getTime() - 86400000);
    const startOf7DaysAgo = new Date(startOfToday.getTime() - 7 * 86400000);
    if (d >= startOfToday) return "Today";
    if (d >= startOfYesterday) return "Yesterday";
    if (d >= startOf7DaysAgo) return "Previous 7 Days";
    return "Older";
  };

  // Group conversations for sidebar rendering
  const ungrouped = conversations.filter(c => !c.groupId).sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const grouped = groups.map(g => ({
    ...g,
    convos: conversations.filter(c => c.groupId === g.id),
  }));

  return (
    <div
      className="console-layout"
      onDragEnter={handleDragEnter}
      onDragLeave={handleDragLeave}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
    >
      {/* Drop zone overlay */}
      {isDraggingFile && (
        <div className="drop-overlay">
          <div className="drop-overlay-content">
            <Paperclip size={48} />
            <span>Drop file here</span>
            <span className="drop-hint">PDF, PNG, JPG, GIF, WebP</span>
          </div>
        </div>
      )}
      <aside className={`console-sidebar${sidebarOpen ? "" : " collapsed"}`} role="navigation" aria-label="Chat sidebar">
        {/* New Chat — always at top */}
        <div className="sidebar-section" style={{ flexShrink: 0 }}>
          <button className="sidebar-item" onClick={handleClearChat}><Plus size={16} /> {t.sidebar_new_chat}</button>
        </div>

        {/* Tab bar */}
        <div className="sidebar-tabs">
          <button className={`sidebar-tab${sidebarTab === "chats" ? " active" : ""}`} onClick={() => setSidebarTab("chats")}>
            <MessageSquare size={13} /> Chats
          </button>
          <button className={`sidebar-tab${sidebarTab === "tools" ? " active" : ""}`} onClick={() => setSidebarTab("tools")}>
            <Zap size={13} /> Tools
          </button>
          <button className={`sidebar-tab${sidebarTab === "settings" ? " active" : ""}`} onClick={() => setSidebarTab("settings")}>
            <Settings size={13} /> Settings
          </button>
        </div>

        {/* Tab content — scrollable */}
        <div className="sidebar-scroll">

        {/* ═══ CHATS TAB ═══ */}
        {sidebarTab === "chats" && (
          <div className="sidebar-section" style={{ flex: 1, minHeight: 80, display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "flex-end", marginBottom: 4, gap: 2 }}>
              <button
                className="ghost-btn"
                onClick={() => {
                  if (conversations.length <= 1) return;
                  if (confirm("Clear all chats? This can't be undone.")) {
                    setConversations([{
                      id: generateId(), name: `${t.chat_default_name} 1`, groupId: null, messages: [],
                      createdAt: new Date().toISOString(), updatedAt: new Date().toISOString(),
                    }]);
                    setMessages([]);
                    setGroups([]);
                  }
                }}
                title="Clear all chats"
                style={{ padding: 2, opacity: conversations.length > 1 ? 0.5 : 0.2 }}
              >
                <Trash2 size={13} />
              </button>
              <button
                className="ghost-btn"
                onClick={() => setShowNewGroup(true)}
                title={t.sidebar_new_group}
                style={{ padding: 2 }}
              >
                <FolderPlus size={14} />
              </button>
            </div>

            {/* New group inline input */}
            {showNewGroup && (
              <div style={{ display: "flex", gap: 4, marginBottom: 6 }}>
                <input
                  autoFocus
                  type="text"
                  placeholder={t.sidebar_group_placeholder}
                  value={newGroupName}
                  onChange={e => setNewGroupName(e.target.value)}
                  onKeyDown={e => { if (e.key === "Enter") createGroup(); if (e.key === "Escape") setShowNewGroup(false); }}
                  style={{
                    flex: 1, padding: "4px 8px", background: "var(--bg-tertiary, #111)",
                    border: "1px solid var(--border-subtle, #222)", borderRadius: 6,
                    color: "var(--text-primary)", fontSize: "0.75rem",
                  }}
                />
                <button className="ghost-btn" onClick={createGroup} style={{ padding: 2 }}><Check size={14} /></button>
                <button className="ghost-btn" onClick={() => setShowNewGroup(false)} style={{ padding: 2 }}><X size={14} /></button>
              </div>
            )}

            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 2 }}>
              {/* Ungrouped conversations with date section headers */}
              {(() => {
                let lastBucket = "";
                return ungrouped.map(convo => {
                  const bucket = getDateBucket(convo.updatedAt);
                  const showHeader = bucket !== lastBucket;
                  lastBucket = bucket;
                  return (
                    <div key={convo.id}>
                      {showHeader && (
                        <div style={{
                          fontSize: "0.65rem", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.05em",
                          color: "var(--text-muted, #666)", padding: "8px 12px 2px", marginTop: 4,
                        }}>{bucket}</div>
                      )}
                      <div
                        className={"sidebar-item" + (convo.id === activeConvoId ? " active" : "")}
                        onClick={() => switchConversation(convo.id)}
                        onContextMenu={e => { e.preventDefault(); setRenamingId(convo.id); setRenameValue(convo.name); }}
                        style={{ padding: "8px 12px", fontSize: "0.85rem", position: "relative", gap: 6 }}
                      >
                        <MessageSquare size={13} />
                        {renamingId === convo.id ? (
                          <input
                            autoFocus
                            value={renameValue}
                            onChange={e => setRenameValue(e.target.value)}
                            onKeyDown={e => { if (e.key === "Enter") renameConversation(convo.id, renameValue); if (e.key === "Escape") setRenamingId(null); }}
                            onBlur={() => renameConversation(convo.id, renameValue)}
                            onClick={e => e.stopPropagation()}
                            style={{
                              flex: 1, background: "transparent", border: "none", borderBottom: "1px solid var(--accent)",
                              color: "var(--text-primary)", fontSize: "0.85rem", padding: 0, outline: "none",
                            }}
                          />
                        ) : (
                          <span title={convo.name} style={{
                            flex: 1, overflow: "hidden", textOverflow: "ellipsis",
                            whiteSpace: "nowrap", lineHeight: 1.3,
                          }}>{convo.name}</span>
                        )}
                        {conversations.length > 1 && (
                          <button
                            className="ghost-btn sidebar-delete-btn"
                            onClick={e => { e.stopPropagation(); deleteConversation(convo.id); }}
                            style={{ padding: 1 }}
                          ><X size={12} /></button>
                        )}
                      </div>
                    </div>
                  );
                });
              })()}

              {/* Grouped conversations */}
              {grouped.map(g => (
                <div key={g.id} style={{ marginTop: 4 }}>
                  <div
                    style={{
                      display: "flex", alignItems: "center", gap: 4, padding: "4px 8px",
                      fontSize: "0.7rem", color: "var(--text-muted)", cursor: "pointer",
                      textTransform: "uppercase", letterSpacing: "0.1em", fontWeight: 600,
                    }}
                    onClick={() => toggleGroupCollapse(g.id)}
                  >
                    <ChevronDown size={12} style={{ transform: g.collapsed ? "rotate(-90deg)" : "none", transition: "transform 0.15s" }} />
                    <span style={{ flex: 1 }}>{g.name}</span>
                    <button
                      className="ghost-btn"
                      onClick={e => { e.stopPropagation(); createNewConversation(g.id); }}
                      style={{ padding: 1 }}
                    ><Plus size={11} /></button>
                    <button
                      className="ghost-btn"
                      onClick={e => { e.stopPropagation(); deleteGroup(g.id); }}
                      style={{ padding: 1, opacity: 0.4 }}
                    ><X size={11} /></button>
                  </div>
                  {!g.collapsed && g.convos.map(convo => (
                    <div
                      key={convo.id}
                      className={"sidebar-item" + (convo.id === activeConvoId ? " active" : "")}
                      onClick={() => switchConversation(convo.id)}
                      onContextMenu={e => { e.preventDefault(); setRenamingId(convo.id); setRenameValue(convo.name); }}
                      style={{ padding: "7px 12px 7px 24px", fontSize: "0.83rem", gap: 6 }}
                    >
                      <MessageSquare size={12} />
                      {renamingId === convo.id ? (
                        <input
                          autoFocus
                          value={renameValue}
                          onChange={e => setRenameValue(e.target.value)}
                          onKeyDown={e => { if (e.key === "Enter") renameConversation(convo.id, renameValue); if (e.key === "Escape") setRenamingId(null); }}
                          onBlur={() => renameConversation(convo.id, renameValue)}
                          onClick={e => e.stopPropagation()}
                          style={{
                            flex: 1, background: "transparent", border: "none", borderBottom: "1px solid var(--accent)",
                            color: "var(--text-primary)", fontSize: "0.83rem", padding: 0, outline: "none",
                          }}
                        />
                      ) : (
                        <span title={convo.name} style={{
                          flex: 1, overflow: "hidden", textOverflow: "ellipsis",
                          whiteSpace: "nowrap", lineHeight: 1.3,
                        }}>{convo.name}</span>
                      )}
                      <button
                        className="ghost-btn"
                        onClick={e => { e.stopPropagation(); deleteConversation(convo.id); }}
                        style={{ padding: 1, opacity: 0.4 }}
                      ><X size={12} /></button>
                    </div>
                  ))}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ═══ TOOLS TAB ═══ */}
        {sidebarTab === "tools" && (
          <div className="sidebar-section" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div className="sidebar-label">{t.sidebar_tools_label}</div>
            <button className="sidebar-item" onClick={() => sendCommand("status")}><Settings size={14} /> {t.sidebar_system_status}</button>
            <button className="sidebar-item" onClick={() => sendCommand("!load-persona")}><User size={14} /> {t.sidebar_my_persona}</button>
            <button className="sidebar-item" onClick={handleGenerateReport}><BarChart3 size={14} /> {t.sidebar_generate_report}</button>
            <button className="sidebar-item" onClick={handleShare}><Share2 size={14} /> {t.sidebar_share_chat}</button>
            <button className="sidebar-item" onClick={handleExportChat}><Download size={14} /> {t.sidebar_export_chat}</button>
            <button className="sidebar-item" onClick={handleUpload}><Paperclip size={14} /> {t.sidebar_upload_pdf}</button>
            <button className="sidebar-item" onClick={() => setShowVaultPanel(true)}><Shield size={14} /> My Files {vaultFiles.length > 0 && <span style={{ marginLeft: "auto", fontSize: "0.7rem", opacity: 0.5 }}>{vaultFiles.length}</span>}</button>
            <button className="sidebar-item" onClick={() => setShowPersonalVaultPanel(true)}><Lock size={14} /> Personal Vault {pvHasVault && <span style={{ marginLeft: "auto", fontSize: "0.65rem", opacity: 0.6 }}>{pvIsUnlocked ? "Open" : "Locked"}</span>}</button>
            <button className="sidebar-item" onClick={() => setShowApiKeyModal(true)}><Key size={14} /> {t.sidebar_api_keys}</button>

            {/* Agent-specific quick commands */}
            {(() => {
              const agent = getAgentById(activeAgentId, customAgents);
              if (agent && agent.id !== "general" && agent.quickCommands.length > 0) {
                return (
                  <>
                    <div style={{ height: 12 }} />
                    <div className="sidebar-label" style={{ color: agent.color }}>{agent.name.toUpperCase()}</div>
                    {agent.quickCommands.map(qc => (
                      <button key={qc.label} className="sidebar-item" onClick={() => {
                        if (qc.cmd.endsWith(" ")) { setInput(qc.cmd); inputRef.current?.focus(); }
                        else sendCommand(qc.cmd);
                      }}>
                        <ChevronRight size={14} /> {qc.label}
                      </button>
                    ))}
                  </>
                );
              }
              return null;
            })()}

            {/* Agents section */}
            <div style={{ height: 12 }} />
            <div className="sidebar-label">{t.sidebar_agents_label}</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 2 }}>
              {[...BUILT_IN_AGENTS, ...customAgents].map(agent => (
                <div
                  key={agent.id}
                  onClick={() => setActiveAgentId(agent.id)}
                  title={agent.tagline}
                  style={{
                    display: "flex", alignItems: "center", gap: 8,
                    padding: "6px 10px", borderRadius: 8, cursor: "pointer",
                    background: activeAgentId === agent.id ? "var(--bg-tertiary)" : "transparent",
                    border: activeAgentId === agent.id ? `1px solid ${agent.color}33` : "1px solid transparent",
                    transition: "all 0.15s",
                  }}
                >
                  <div style={{
                    width: 24, height: 24, borderRadius: 6, display: "flex", alignItems: "center", justifyContent: "center",
                    background: `${agent.color}18`, color: agent.color, flexShrink: 0,
                  }}>
                    <AgentIcon name={agent.icon} size={13} />
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{
                      fontSize: "0.75rem", fontWeight: 600,
                      color: activeAgentId === agent.id ? "var(--text-primary)" : "var(--text-secondary)",
                      overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                    }}>
                      {agent.name}
                    </div>
                    {activeAgentId === agent.id && agent.id !== "general" && (
                      <div style={{
                        fontSize: "0.65rem", color: "var(--text-muted)",
                        overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
                        marginTop: 1, lineHeight: 1.2,
                      }}>
                        {agent.tagline}
                      </div>
                    )}
                  </div>
                  {activeAgentId === agent.id && (
                    <div style={{ width: 5, height: 5, borderRadius: 3, background: agent.color, flexShrink: 0 }} />
                  )}
                  {agent.custom && (
                    <button
                      className="ghost-btn"
                      onClick={e => { e.stopPropagation(); handleDeleteCustomAgent(agent.id); }}
                      style={{ padding: 2, opacity: 0.4 }}
                    ><X size={11} /></button>
                  )}
                </div>
              ))}
            </div>
            <button
              className="sidebar-item"
              onClick={() => setShowCreateAgent(true)}
              style={{ marginTop: 4, color: "var(--accent)", fontSize: "0.78rem" }}
            >
              <Plus size={14} /> {t.sidebar_create_agent}
            </button>
          </div>
        )}

        {/* ═══ SETTINGS TAB ═══ */}
        {sidebarTab === "settings" && (
          <div className="sidebar-section" style={{ flex: 1, display: "flex", flexDirection: "column", gap: 2 }}>
            <div style={{ position: "relative" }}>
              <button
                className="sidebar-item"
                onClick={() => setShowLangPicker(!showLangPicker)}
                style={{ fontSize: "0.85rem", padding: "8px 12px" }}
              >
                <Globe size={14} /> {t.sidebar_language}: {LOCALE_LABELS[locale]}
              </button>
              {showLangPicker && (
                <div style={{
                  background: "var(--bg-card, #111)", border: "1px solid var(--border-color, #1a1a1a)",
                  borderRadius: 8, padding: 4, maxHeight: 240, overflowY: "auto",
                  boxShadow: "0 4px 16px rgba(0,0,0,0.4)", marginTop: 2,
                }}>
                  {(Object.keys(LOCALE_LABELS) as Locale[]).map(loc => (
                    <button
                      key={loc}
                      onClick={() => { setLocale(loc); setShowLangPicker(false); }}
                      style={{
                        display: "block", width: "100%", padding: "6px 10px", background: loc === locale ? "var(--accent-subtle)" : "transparent",
                        border: "none", color: loc === locale ? "var(--accent)" : "var(--text-secondary)",
                        fontSize: "0.8rem", textAlign: "left", borderRadius: 6, cursor: "pointer",
                      }}
                    >
                      {LOCALE_LABELS[loc]}
                    </button>
                  ))}
                </div>
              )}
            </div>
            <button className="sidebar-item" onClick={() => setShowSettings(true)} style={{ fontSize: "0.85rem", padding: "8px 12px" }}><Settings size={14} /> Settings</button>
            <button className="sidebar-item" onClick={() => setShowApiKeyModal(true)} style={{ fontSize: "0.85rem", padding: "8px 12px" }}><Key size={14} /> {t.sidebar_api_keys}</button>
          </div>
        )}

        </div>{/* end sidebar-scroll */}

        {/* Pinned bottom: Lock button always visible */}
        <div className="sidebar-bottom">
          <button className="sidebar-lock" onClick={handleLock}><Lock size={16} /> {t.sidebar_lock}</button>
        </div>
      </aside>
      <div className="console-main" style={{position:"relative"}}>
        {/* Floating sidebar reopen button — only visible when sidebar is collapsed */}
        {!sidebarOpen && (
          <button
            className="sidebar-reopen-btn"
            onClick={() => setSidebarOpen(true)}
            title="Open sidebar"
          >
            <Menu size={18} />
          </button>
        )}
        <header className="console-topbar">
          <div className="topbar-brand" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <button className="sidebar-toggle" onClick={() => setSidebarOpen(prev => !prev)} title={sidebarOpen ? "Hide sidebar" : "Show sidebar"}>
              {sidebarOpen ? <PanelLeftClose size={16} /> : <Menu size={16} />}
            </button>
            <NextImage src="/brand/hammerlock-icon-192.png" alt="" width={20} height={20} style={{ borderRadius: 3 }} /><span>HAMMERLOCK AI</span>
          </div>
          <div className="topbar-title" style={{ display: "flex", alignItems: "center", gap: 8 }}>
            {(() => {
              const agent = getAgentById(activeAgentId, customAgents);
              if (agent && agent.id !== "general") {
                return (
                  <button
                    className="topbar-agent-badge"
                    onClick={() => setActiveAgentId(DEFAULT_AGENT_ID)}
                    title="Click to switch back to General"
                    style={{ borderColor: `${agent.color}40`, color: agent.color }}
                  >
                    <AgentIcon name={agent.icon} size={14} />
                    <span>{agent.name}</span>
                    <X size={12} style={{ opacity: 0.5, marginLeft: 2 }} />
                  </button>
                );
              }
              return <span>{t.chat_title}</span>;
            })()}
          </div>
          <div className="topbar-actions">
            <div className="status-badge"><span className={statusDotClass} /><span className="status-label">{statusLabel}</span></div>
          </div>
        </header>
        {errorBanner && (
          <div className="error-banner" onClick={() => setErrorBanner(null)}>
            {errorBanner}
          </div>
        )}
        <div className="console-feed" ref={feedRef} role="log" aria-live="polite" aria-label="Chat messages">
          {/* Onboarding flow — premium first-run experience */}
          {onboardingStep >= 0 && (
            <div className="empty-state" style={{ gap: 0, paddingTop: 40 }}>
              {/* Animated lock with glow ring */}
              <div style={{
                width: 72, height: 72, borderRadius: 20,
                background: "rgba(0,255,136,0.06)", border: "1px solid rgba(0,255,136,0.12)",
                display: "grid", placeItems: "center", marginBottom: 20,
                position: "relative",
                animation: "lockBounce 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.1s both",
              }}>
                <Lock size={32} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                <div style={{
                  position: "absolute", inset: -6, borderRadius: 24,
                  background: "radial-gradient(circle, rgba(0,255,136,0.08), transparent 70%)",
                  animation: "vaultIconGlow 3s ease-in-out infinite",
                  zIndex: -1,
                }} />
              </div>

              <h2 className="empty-title" style={{ marginBottom: 6, fontSize: "1.4rem" }}>{t.onboarding_title}</h2>

              {/* Progress dots */}
              <div style={{ display: "flex", gap: 6, marginBottom: 28 }}>
                {ONBOARDING_STEPS.map((_, i) => (
                  <div key={i} style={{
                    width: i <= onboardingStep ? 20 : 8, height: 4,
                    borderRadius: 4,
                    background: i < onboardingStep ? "var(--accent)" : i === onboardingStep ? "rgba(0,255,136,0.5)" : "rgba(255,255,255,0.08)",
                    transition: "all 0.3s ease",
                  }} />
                ))}
              </div>

              {/* Previous answers shown as compact chips */}
              {onboardingStep > 0 && (
                <div style={{ width: "100%", maxWidth: 460, display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 20, justifyContent: "center" }}>
                  {ONBOARDING_STEPS.slice(0, onboardingStep).map(step => (
                    <div key={step.key} style={{
                      padding: "6px 14px",
                      background: "rgba(0,255,136,0.04)",
                      border: "1px solid rgba(0,255,136,0.08)",
                      borderRadius: 20, fontSize: "0.8rem", color: "var(--accent-muted)",
                      display: "inline-flex", alignItems: "center", gap: 6,
                    }}>
                      <span style={{ color: "var(--text-muted)", fontSize: "0.7rem" }}>{step.key}:</span>
                      {onboardingAnswers[step.key]}
                    </div>
                  ))}
                </div>
              )}

              {/* Current question */}
              <div style={{ width: "100%", maxWidth: 460 }}>
                <p style={{
                  fontSize: "1.15rem", fontWeight: 600, color: "var(--text-primary)",
                  marginBottom: 14, lineHeight: 1.4,
                }}>
                  {ONBOARDING_STEPS[onboardingStep].q}
                </p>
                <div style={{ display: "flex", gap: 8 }}>
                  <input
                    autoFocus
                    type="text"
                    placeholder={ONBOARDING_STEPS[onboardingStep].placeholder}
                    value={onboardingInput}
                    onChange={e => setOnboardingInput(e.target.value)}
                    onKeyDown={e => { if (e.key === "Enter") handleOnboardingSubmit(); }}
                    style={{
                      flex: 1, padding: "12px 16px",
                      background: "rgba(255,255,255,0.03)",
                      border: "1px solid rgba(255,255,255,0.08)",
                      borderRadius: 12,
                      color: "var(--text-primary)", fontSize: "0.92rem",
                      transition: "border-color 0.2s ease, box-shadow 0.2s ease",
                      outline: "none",
                    }}
                    onFocus={e => {
                      e.target.style.borderColor = "rgba(0,255,136,0.3)";
                      e.target.style.boxShadow = "0 0 0 2px rgba(0,255,136,0.08)";
                    }}
                    onBlur={e => {
                      e.target.style.borderColor = "rgba(255,255,255,0.08)";
                      e.target.style.boxShadow = "none";
                    }}
                  />
                  <button
                    onClick={handleOnboardingSubmit}
                    disabled={!onboardingInput.trim()}
                    style={{
                      padding: "12px 18px", background: "var(--accent)", color: "#000",
                      border: "none", borderRadius: 12, fontWeight: 600,
                      cursor: onboardingInput.trim() ? "pointer" : "not-allowed",
                      opacity: onboardingInput.trim() ? 1 : 0.3,
                      transition: "all 0.2s ease",
                      boxShadow: onboardingInput.trim() ? "0 2px 12px rgba(0,255,136,0.2)" : "none",
                    }}
                  >
                    <Send size={16} />
                  </button>
                </div>
                {onboardingStep > 0 && (
                  <button
                    onClick={() => {
                      setOnboardingStep(-1);
                      updateVaultData(prev => ({
                        ...prev,
                        settings: { ...prev.settings, onboarding_completed: new Date().toISOString() }
                      }));
                    }}
                    style={{
                      marginTop: 18, background: "none", border: "none",
                      color: "var(--text-muted)", fontSize: "0.75rem",
                      cursor: "pointer", letterSpacing: "0.05em",
                      transition: "color 0.2s ease",
                    }}
                    onMouseEnter={e => (e.target as HTMLElement).style.color = "var(--text-secondary)"}
                    onMouseLeave={e => (e.target as HTMLElement).style.color = "var(--text-muted)"}
                  >
                    {t.onboarding_skip}
                  </button>
                )}
              </div>
            </div>
          )}

          {onboardingStep < 0 && !hasMessages && (
            <div className="empty-state">
              {(() => {
                const agent = getAgentById(activeAgentId, customAgents);
                if (agent && agent.id !== "general") {
                  const introTips = AGENT_INTRO_TIPS[agent.id];
                  const seenAgents = Array.isArray(vaultData?.settings?.[AGENT_INTRO_SEEN_KEY])
                    ? (vaultData.settings[AGENT_INTRO_SEEN_KEY] as string[])
                    : [];
                  const hasSeenIntro = seenAgents.includes(agent.id);
                  const markIntroSeen = () => {
                    if (hasSeenIntro || !updateVaultData) return;
                    updateVaultData((prev) => {
                      const settings = prev.settings || {};
                      const existing = Array.isArray(settings[AGENT_INTRO_SEEN_KEY])
                        ? (settings[AGENT_INTRO_SEEN_KEY] as string[])
                        : [];
                      if (existing.includes(agent.id)) return prev;
                      return { ...prev, settings: { ...prev.settings, [AGENT_INTRO_SEEN_KEY]: [...existing, agent.id] } };
                    });
                  };

                  // First time seeing this agent — show expanded intro card
                  if (!hasSeenIntro && introTips) {
                    return (
                      <>
                        <div className="welcome-icon-wrap" style={{ background: `${agent.color}18`, color: agent.color }}>
                          <AgentIcon name={agent.icon} size={32} />
                        </div>
                        <h2 className="empty-title" style={{ color: agent.color }}>{agent.name}</h2>
                        <p className="empty-subtitle">{agent.tagline}</p>

                        {/* Getting started tips */}
                        <div style={{
                          background: "var(--bg-card, #0a0a0a)", border: `1px solid ${agent.color}22`,
                          borderRadius: 12, padding: "16px 20px", width: "100%", maxWidth: 520,
                          marginTop: 12, marginBottom: 16, textAlign: "left",
                        }}>
                          <div style={{
                            fontSize: "0.7rem", fontWeight: 700, textTransform: "uppercase",
                            letterSpacing: "0.06em", color: agent.color, marginBottom: 10,
                          }}>
                            Getting Started
                          </div>
                          <ul style={{
                            margin: 0, paddingLeft: 16, listStyle: "disc",
                            color: "var(--text-secondary)", fontSize: "0.82rem", lineHeight: 1.7,
                          }}>
                            {introTips.tips.map((tip, i) => (
                              <li key={i}>{tip}</li>
                            ))}
                          </ul>
                          {/* Example prompt */}
                          <div style={{
                            marginTop: 12, background: "var(--bg-tertiary, #111)",
                            borderRadius: 8, padding: "10px 14px",
                            fontSize: "0.82rem", color: "var(--text-secondary)", fontStyle: "italic",
                          }}>
                            <span style={{ color: agent.color, marginRight: 4, fontStyle: "normal" }}>&rsaquo;</span>
                            <strong style={{ color: "var(--text-primary)", fontStyle: "normal" }}>Try:</strong>{" "}
                            &quot;{introTips.example}&quot;
                          </div>
                        </div>

                        {/* Quick commands */}
                        <div className="suggestion-grid">
                          {agent.quickCommands.slice(0, 4).map(qc => (
                            <button key={qc.label} className="suggestion-card" onClick={() => {
                              markIntroSeen();
                              if (qc.cmd.endsWith(" ")) { setInput(qc.cmd); inputRef.current?.focus(); }
                              else sendCommand(qc.cmd);
                            }}>
                              <span className="suggestion-icon">💬</span>
                              <span className="suggestion-text">{qc.label}</span>
                            </button>
                          ))}
                        </div>

                        <button
                          onClick={markIntroSeen}
                          style={{
                            marginTop: 8, padding: "6px 18px", borderRadius: 8,
                            background: "transparent", border: `1px solid ${agent.color}44`,
                            color: agent.color, fontSize: "0.78rem", fontWeight: 600,
                            cursor: "pointer", transition: "all 0.15s",
                          }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.background = `${agent.color}12`; }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.background = "transparent"; }}
                        >
                          Got it
                        </button>
                      </>
                    );
                  }

                  // Already seen intro — compact view (existing behavior)
                  return (
                    <>
                      <div className="welcome-icon-wrap" style={{ background: `${agent.color}18`, color: agent.color }}>
                        <AgentIcon name={agent.icon} size={32} />
                      </div>
                      <h2 className="empty-title" style={{ color: agent.color }}>{agent.name}</h2>
                      <p className="empty-subtitle">{agent.tagline}</p>
                      <div className="suggestion-grid">
                        {agent.quickCommands.slice(0, 4).map(qc => (
                          <button key={qc.label} className="suggestion-card" onClick={() => {
                            if (qc.cmd.endsWith(" ")) { setInput(qc.cmd); inputRef.current?.focus(); }
                            else sendCommand(qc.cmd);
                          }}>
                            <span className="suggestion-icon">💬</span>
                            <span className="suggestion-text">{qc.label}</span>
                          </button>
                        ))}
                      </div>
                    </>
                  );
                }
                const userName = vaultData?.settings?.user_name as string | undefined;
                const heroAgents = BUILT_IN_AGENTS.filter(a => a.id !== "general").slice(0, 10);
                return (
                  <>
                    {/* Hero lock with orbital ring */}
                    <div className="welcome-hero">
                      <div className="welcome-orbit-ring" />
                      <div className="welcome-icon-wrap">
                        <Shield size={28} strokeWidth={1.5} style={{ color: "var(--accent)" }} />
                        <div className="welcome-glow" />
                      </div>
                    </div>

                    {/* Title + animated tagline */}
                    <h2 className="empty-title">
                      {userName ? `${t.welcome_back || "Welcome back"}, ${userName}` : t.chat_empty_title}
                    </h2>
                    <p className="empty-tagline">{(t as any).chat_empty_tagline || "Your AI. Your Data. Your Rules."}</p>
                    <p className="empty-subtitle">{t.chat_empty_subtitle}</p>

                    {/* Agent showcase — color dots */}
                    <div className="agent-showcase">
                      {heroAgents.map((agent, i) => (
                        <button
                          key={agent.id}
                          className="agent-dot"
                          title={`${agent.name} — ${agent.tagline}`}
                          onClick={() => { setActiveAgentId(agent.id); }}
                          style={{ "--dot-color": agent.color, "--dot-delay": `${i * 0.06}s` } as React.CSSProperties}
                        >
                          <span className="agent-dot-pip" />
                          <span className="agent-dot-name">{agent.name}</span>
                        </button>
                      ))}
                    </div>

                    {/* Quick action cards */}
                    <div className="suggestion-grid">
                      <button className="suggestion-card" style={{ "--card-delay": "0.1s" } as React.CSSProperties} onClick={() => sendCommand(t.pill_status)}>
                        <span className="suggestion-icon"><Zap size={18} /></span>
                        <span className="suggestion-label">{t.sidebar_system_status || "System Status"}</span>
                        <span className="suggestion-text">Check connections</span>
                      </button>
                      <button className="suggestion-card" style={{ "--card-delay": "0.15s" } as React.CSSProperties} onClick={() => sendCommand(t.pill_persona)}>
                        <span className="suggestion-icon"><User size={18} /></span>
                        <span className="suggestion-label">{t.sidebar_my_persona || "My Persona"}</span>
                        <span className="suggestion-text">View your profile</span>
                      </button>
                      <button className="suggestion-card" style={{ "--card-delay": "0.2s" } as React.CSSProperties} onClick={() => { setInput("search "); inputRef.current?.focus(); }}>
                        <span className="suggestion-icon"><Globe size={18} /></span>
                        <span className="suggestion-label">{t.site_feat_search_title || "Web Search"}</span>
                        <span className="suggestion-text">Search privately</span>
                      </button>
                      <button className="suggestion-card" style={{ "--card-delay": "0.25s" } as React.CSSProperties} onClick={() => sendCommand(t.pill_report)}>
                        <span className="suggestion-icon"><BarChart3 size={18} /></span>
                        <span className="suggestion-label">{t.sidebar_generate_report || "Generate Report"}</span>
                        <span className="suggestion-text">Build a report</span>
                      </button>
                    </div>

                    {/* Trust bar */}
                    <div className="trust-bar">
                      <div className="trust-item"><Lock size={12} /> AES-256</div>
                      <div className="trust-divider" />
                      <div className="trust-item"><Shield size={12} /> Local-First</div>
                      <div className="trust-divider" />
                      <div className="trust-item"><Terminal size={12} /> {BUILT_IN_AGENTS.length} Agents</div>
                    </div>

                    {/* Ollama setup banner — shown on desktop when Ollama not detected */}
                    {desktop && ollamaDetected === false && !ollamaBannerDismissed && (
                      <div className="ollama-setup-banner" style={{
                        marginTop: 24, maxWidth: 520, width: "100%",
                        padding: "20px 24px", borderRadius: "var(--radius-lg, 12px)",
                        background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.15)",
                        textAlign: "left", position: "relative",
                      }}>
                        <button onClick={() => setOllamaBannerDismissed(true)} style={{
                          position: "absolute", top: 10, right: 12, background: "none", border: "none",
                          color: "var(--text-muted)", cursor: "pointer", padding: 4,
                        }}><X size={14} /></button>
                        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 10 }}>
                          <span style={{ fontSize: "1.3rem" }}>🦙</span>
                          <strong style={{ fontSize: "0.95rem", color: "var(--text-primary)" }}>
                            Want free, unlimited local AI?
                          </strong>
                        </div>
                        <p style={{ margin: "0 0 12px", color: "var(--text-secondary)", fontSize: "0.85rem", lineHeight: 1.5 }}>
                          Install <strong>Ollama</strong> to run AI models directly on your Mac — no cloud, no credits, completely private. It takes 2 minutes:
                        </p>
                        <div style={{
                          display: "flex", flexDirection: "column", gap: 8,
                          padding: "12px 16px", background: "var(--bg-secondary, rgba(255,255,255,0.03))",
                          borderRadius: "var(--radius-md, 8px)", fontSize: "0.82rem", color: "var(--text-secondary)",
                        }}>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "var(--accent)", fontWeight: 700, minWidth: 16 }}>1.</span>
                            <span>Download Ollama from <a href="https://ollama.com" target="_blank" rel="noopener noreferrer" style={{ color: "var(--accent)", textDecoration: "underline" }}>ollama.com</a></span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "var(--accent)", fontWeight: 700, minWidth: 16 }}>2.</span>
                            <span>Open Terminal and run: <code style={{ background: "rgba(0,255,136,0.08)", color: "var(--accent)", padding: "2px 6px", borderRadius: 4 }}>ollama pull llama3.1</code></span>
                          </div>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ color: "var(--accent)", fontWeight: 700, minWidth: 16 }}>3.</span>
                            <span>Restart HammerLock AI — Ollama connects automatically</span>
                          </div>
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 12, marginTop: 14 }}>
                          <a href="https://ollama.com/download" target="_blank" rel="noopener noreferrer" style={{
                            display: "inline-flex", alignItems: "center", gap: 6,
                            padding: "8px 16px", background: "var(--accent)", color: "#000",
                            borderRadius: "var(--radius-md, 8px)", fontWeight: 600, fontSize: "0.82rem",
                            textDecoration: "none", transition: "opacity 0.15s",
                          }}>
                            <Download size={14} /> Download Ollama
                          </a>
                          <button onClick={() => setOllamaBannerDismissed(true)} style={{
                            background: "none", border: "1px solid var(--border-color, rgba(255,255,255,0.1))",
                            color: "var(--text-muted)", padding: "8px 14px", borderRadius: "var(--radius-md, 8px)",
                            cursor: "pointer", fontSize: "0.82rem",
                          }}>
                            I already have it
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Ollama connected confirmation — brief success state */}
                    {desktop && ollamaDetected === true && (
                      <div style={{
                        marginTop: 16, display: "inline-flex", alignItems: "center", gap: 8,
                        padding: "6px 14px", borderRadius: 20, fontSize: "0.78rem",
                        background: "rgba(0,255,136,0.06)", color: "var(--accent)",
                        border: "1px solid rgba(0,255,136,0.12)",
                      }}>
                        <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)" }} />
                        Ollama connected — local AI active
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
          )}
          {messages.map((msg, idx) => (
            <div key={msg.id} className={"console-message " + msg.role + (msg.pending ? " pending" : "")}>
              <div className="message-meta">
                <span className="message-sender">{msg.role==="user" ? t.chat_you : (getAgentById(activeAgentId, customAgents)?.name || t.chat_ai)}</span>
                <span className="message-time">{new Date(msg.timestamp || Date.now()).toLocaleTimeString([], {hour:"2-digit", minute:"2-digit"})}</span>
              </div>
              <div className="message-content"><ReactMarkdown remarkPlugins={[remarkGfm]} components={{
                a: ({node, ...props}: any) => <a {...props} target="_blank" rel="noopener noreferrer" />,
                code: ({node, inline, className, children, ...props}: any) => {
                  if (inline) return <code className={className} {...props}>{children}</code>;
                  const text = String(children).replace(/\n$/, "");
                  return (
                    <div className="code-block-wrap">
                      <button className="code-copy-btn" onClick={() => { navigator.clipboard.writeText(text); }}>
                        <Copy size={13} /> Copy
                      </button>
                      <pre><code className={className} {...props}>{children}</code></pre>
                    </div>
                  );
                },
              }}>{msg.content}</ReactMarkdown></div>
              {msg.sources && msg.sources.length > 0 && (
                <SourcesAccordion sources={msg.sources} summary={msg.sourcesSummary} />
              )}
              {msg.actionType && !msg.pending && (
                msg.deepLink && /^https?:\/\//i.test(msg.deepLink) ? (
                  <a href={msg.deepLink} target="_blank" rel="noopener noreferrer"
                    className="action-badge action-badge-link" data-status={msg.actionStatus || "success"}>
                    <span>{msg.actionStatus === "error" ? "⚠️" : ACTION_BADGE_ICONS[msg.actionType] || "⚡"}</span>
                    <span>{ACTION_BADGE_LABELS[msg.actionType] || msg.actionType}{msg.actionStatus === "error" ? " Failed" : ""}</span>
                    <span className="action-badge-open">Open ↗</span>
                  </a>
                ) : (
                  <div className="action-badge" data-status={msg.actionStatus || "success"}>
                    <span>{msg.actionStatus === "error" ? "⚠️" : ACTION_BADGE_ICONS[msg.actionType] || "⚡"}</span>
                    <span>{ACTION_BADGE_LABELS[msg.actionType] || msg.actionType}{msg.actionStatus === "error" ? " Failed" : ""}</span>
                  </div>
                )
              )}
              {msg.followUps && msg.followUps.length > 0 && !msg.pending && msg.role === "ai"
                && idx === messages.length - 1 && !sending && (
                <div className="followup-chips">
                  {msg.followUps.map((q, i) => (
                    <button key={i} className="followup-chip" onClick={() => sendCommand(q)}>
                      {q}
                    </button>
                  ))}
                </div>
              )}
              {msg.pending && <div className="message-status">{t.chat_processing}</div>}

              {/* ─── WORKFLOW ACTIONS — agent-aware action buttons on AI responses ─── */}
              {!msg.pending && msg.role === "ai" && idx === messages.length - 1 && !sending && !chainRunning && (AGENT_ACTIONS[activeAgentId] || AGENT_ACTIONS.general || []).length > 0 && (
                <div className="workflow-actions" style={{
                  display: "flex", flexDirection: "column", gap: 8,
                  marginTop: 8, paddingTop: 8,
                  borderTop: "1px solid rgba(255,255,255,0.04)",
                }}>
                  {/* Quick actions row */}
                  <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                    {(AGENT_ACTIONS[activeAgentId] || AGENT_ACTIONS.general || []).map(action => (
                      <button
                        key={action.id}
                        className="workflow-action-btn"
                        onClick={() => handleWorkflowAction(action, msg.content)}
                        style={{
                          display: "flex", alignItems: "center", gap: 5,
                          padding: "5px 10px", borderRadius: 6,
                          background: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.08)",
                          color: "var(--text-secondary)", fontSize: "0.72rem", fontWeight: 500,
                          cursor: "pointer", transition: "all 0.15s",
                        }}
                        onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(0,255,136,0.08)"; (e.target as HTMLElement).style.borderColor = "rgba(0,255,136,0.2)"; (e.target as HTMLElement).style.color = "var(--text-primary)"; }}
                        onMouseLeave={e => { (e.target as HTMLElement).style.background = "rgba(255,255,255,0.04)"; (e.target as HTMLElement).style.borderColor = "rgba(255,255,255,0.08)"; (e.target as HTMLElement).style.color = "var(--text-secondary)"; }}
                      >
                        <span>{action.icon}</span> {action.label}
                      </button>
                    ))}
                  </div>

                  {/* Workflow chain suggestions — multi-step pipelines */}
                  {detectRelevantChains(activeAgentId, msg.content).length > 0 && (
                    <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                      {detectRelevantChains(activeAgentId, msg.content).map(chain => (
                        <button
                          key={chain.id}
                          className="workflow-chain-btn"
                          onClick={() => handleWorkflowChain(chain, msg.content)}
                          style={{
                            display: "flex", alignItems: "center", gap: 8,
                            padding: "8px 12px", borderRadius: 8,
                            background: "rgba(0,255,136,0.04)", border: "1px solid rgba(0,255,136,0.12)",
                            color: "var(--accent)", fontSize: "0.75rem", fontWeight: 600,
                            cursor: "pointer", transition: "all 0.15s",
                            textAlign: "left" as const,
                          }}
                          onMouseEnter={e => { (e.target as HTMLElement).style.background = "rgba(0,255,136,0.1)"; (e.target as HTMLElement).style.borderColor = "rgba(0,255,136,0.25)"; }}
                          onMouseLeave={e => { (e.target as HTMLElement).style.background = "rgba(0,255,136,0.04)"; (e.target as HTMLElement).style.borderColor = "rgba(0,255,136,0.12)"; }}
                        >
                          <span style={{ fontSize: "1rem" }}>{chain.icon}</span>
                          <div style={{ flex: 1, minWidth: 0 }}>
                            <div>{chain.label}</div>
                            <div style={{ fontSize: "0.65rem", color: "var(--text-muted)", fontWeight: 400, marginTop: 1 }}>
                              {chain.description}
                            </div>
                          </div>
                          <Zap size={12} style={{ opacity: 0.5, flexShrink: 0 }} />
                        </button>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Message action buttons — copy on all messages, extra actions on AI */}
              {!msg.pending && msg.role !== "error" && (
                <div className="message-actions">
                  <button onClick={() => handleCopy(msg.content)} title={t.msg_copy || "Copy"}>
                    <Copy size={14} />
                  </button>
                  {msg.role === "ai" && (
                    <>
                      <button
                        onClick={() => handleReadAloud(msg.id, msg.content)}
                        title={speakingMsgId === msg.id ? (t.msg_stop_reading || "Stop") : (t.msg_read_aloud || "Read aloud")}
                        className={speakingMsgId === msg.id ? "active" : ""}
                      >
                        {speakingMsgId === msg.id ? <VolumeX size={14} /> : <Volume2 size={14} />}
                      </button>
                      <button onClick={() => saveSnippetToVault(msg.content)} title={t.msg_save_vault || "Save to HammerLock"}>
                        <Archive size={14} />
                      </button>
                      {idx === messages.length - 1 && (
                        <button onClick={handleRegenerate} title={t.msg_regenerate || "Regenerate"}>
                          <RefreshCw size={14} />
                        </button>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
        {/* Copied / Saved toasts */}
        {copiedToast && <div className="copied-toast">🔨 {t.msg_copied || "Nailed it! Copied."}</div>}
        {vaultSaved && <div className="copied-toast">🔐 {t.msg_saved_vault || "Hammered into the vault!"}</div>}
        {workflowToast && (
          <div className="copied-toast" style={{ background: "rgba(0,255,136,0.15)", borderColor: "rgba(0,255,136,0.3)" }}>
            🔨 {workflowToast === "Workflow complete!" ? "Nailed it! Workflow complete." : workflowToast} {chainRunning && <span style={{ fontSize: "0.7rem", opacity: 0.7 }}>({chainStep}/{chainTotal})</span>}
          </div>
        )}

        {/* Nudge toast — contextual tips with opt-out */}
        {activeNudge && (
          <NudgeToast
            nudge={activeNudge}
            onDismiss={handleNudgeDismiss}
            onDismissPermanent={handleNudgeDismissPermanent}
            onDisableAll={handleNudgeDisableAll}
            onCta={handleNudgeCta}
          />
        )}

        {/* Settings Panel */}
        <SettingsPanel
          open={showSettings}
          onClose={() => setShowSettings(false)}
          onOpenIntegrations={() => {
            setIntegrationSetupMode("settings");
            setShowIntegrationSetup(true);
          }}
          onOpenPermissions={() => {
            setPermissionsSetupMode("settings");
            setShowPermissionsSetup(true);
          }}
        />

        {/* API Key Configuration Modal — premium welcome flow */}
        {showApiKeyModal && (
          <div className="onboarding-overlay" onClick={() => { if (!needsApiKeys) setShowApiKeyModal(false); }}>
            <div className="onboarding-modal" onClick={e => e.stopPropagation()} style={{maxWidth:520}}>
              {/* Welcome header for first-time setup */}
              {needsApiKeys && (
                <div style={{ textAlign: "center", marginBottom: 20 }}>
                  <Lock size={36} strokeWidth={1.5} style={{ color: "var(--accent)", marginBottom: 12 }} />
                  <h2 style={{ fontSize: "1.3rem", fontWeight: 700, color: "var(--text-primary)", margin: "0 0 6px" }}>
                    {t.apikeys_welcome_title}
                  </h2>
                  <p style={{ fontSize: "0.85rem", color: "var(--text-secondary)", margin: 0, lineHeight: 1.5 }}>
                    {t.apikeys_welcome_subtitle}
                    <br />{t.apikeys_welcome_keys_note}
                  </p>
                </div>
              )}
              {/* Regular header for manual key config */}
              {!needsApiKeys && (
                <div className="onboarding-header">
                  <Key size={20} />
                  <h3>{t.apikeys_title}</h3>
                  <button className="ghost-btn" onClick={() => setShowApiKeyModal(false)}><X size={16} /></button>
                </div>
              )}
              {!needsApiKeys && <p className="onboarding-subtitle" style={{marginBottom:16}}>{t.apikeys_subtitle}</p>}

              <div style={{display:"flex",flexDirection:"column",gap:14}}>
                <div>
                  <label style={{display:"block",fontSize:"0.8rem",color:"var(--text-secondary)",marginBottom:4,fontWeight:600}}>
                    {t.apikeys_openai_label} <span style={{color:"var(--accent)",fontSize:"0.7rem"}}>{t.apikeys_openai_rec}</span>
                  </label>
                  <input type="password" placeholder="sk-..." value={apiKeys.openai}
                    autoFocus={needsApiKeys}
                    onChange={e => setApiKeys(prev => ({...prev, openai: e.target.value}))}
                    style={{ width:"100%",padding:"10px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-md)",color:"var(--text-primary)",fontSize:"0.85rem",fontFamily:"var(--font-mono)" }} />
                  <span style={{fontSize:"0.7rem",color:"var(--text-secondary)"}}>{t.apikeys_openai_hint}</span>
                </div>
                <div>
                  <label style={{display:"block",fontSize:"0.8rem",color:"var(--text-secondary)",marginBottom:4,fontWeight:600}}>
                    {t.apikeys_anthropic_label} <span style={{fontSize:"0.7rem"}}>{t.apikeys_anthropic_opt}</span>
                  </label>
                  <input type="password" placeholder="sk-ant-..." value={apiKeys.anthropic}
                    onChange={e => setApiKeys(prev => ({...prev, anthropic: e.target.value}))}
                    style={{ width:"100%",padding:"10px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-md)",color:"var(--text-primary)",fontSize:"0.85rem",fontFamily:"var(--font-mono)" }} />
                  <span style={{fontSize:"0.7rem",color:"var(--text-secondary)"}}>{t.apikeys_anthropic_hint}</span>
                </div>
                <div>
                  <label style={{display:"block",fontSize:"0.8rem",color:"var(--text-secondary)",marginBottom:4,fontWeight:600}}>
                    {t.apikeys_gemini_label} <span style={{fontSize:"0.7rem"}}>{t.apikeys_gemini_opt}</span>
                  </label>
                  <input type="password" placeholder="AIza..." value={apiKeys.gemini}
                    onChange={e => setApiKeys(prev => ({...prev, gemini: e.target.value}))}
                    style={{ width:"100%",padding:"10px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-md)",color:"var(--text-primary)",fontSize:"0.85rem",fontFamily:"var(--font-mono)" }} />
                  <span style={{fontSize:"0.7rem",color:"var(--text-secondary)"}}>{t.apikeys_gemini_hint}</span>
                </div>
                <div>
                  <label style={{display:"block",fontSize:"0.8rem",color:"var(--text-secondary)",marginBottom:4,fontWeight:600}}>
                    {t.apikeys_groq_label} <span style={{fontSize:"0.7rem"}}>{t.apikeys_groq_opt}</span>
                  </label>
                  <input type="password" placeholder="gsk_..." value={apiKeys.groq}
                    onChange={e => setApiKeys(prev => ({...prev, groq: e.target.value}))}
                    style={{ width:"100%",padding:"10px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-md)",color:"var(--text-primary)",fontSize:"0.85rem",fontFamily:"var(--font-mono)" }} />
                  <span style={{fontSize:"0.7rem",color:"var(--text-secondary)"}}>{t.apikeys_groq_hint}</span>
                </div>
                <div>
                  <label style={{display:"block",fontSize:"0.8rem",color:"var(--text-secondary)",marginBottom:4,fontWeight:600}}>
                    {t.apikeys_mistral_label} <span style={{fontSize:"0.7rem"}}>{t.apikeys_mistral_opt}</span>
                  </label>
                  <input type="password" placeholder="..." value={apiKeys.mistral}
                    onChange={e => setApiKeys(prev => ({...prev, mistral: e.target.value}))}
                    style={{ width:"100%",padding:"10px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-md)",color:"var(--text-primary)",fontSize:"0.85rem",fontFamily:"var(--font-mono)" }} />
                  <span style={{fontSize:"0.7rem",color:"var(--text-secondary)"}}>{t.apikeys_mistral_hint}</span>
                </div>
                <div>
                  <label style={{display:"block",fontSize:"0.8rem",color:"var(--text-secondary)",marginBottom:4,fontWeight:600}}>
                    {t.apikeys_deepseek_label} <span style={{fontSize:"0.7rem"}}>{t.apikeys_deepseek_opt}</span>
                  </label>
                  <input type="password" placeholder="sk-..." value={apiKeys.deepseek}
                    onChange={e => setApiKeys(prev => ({...prev, deepseek: e.target.value}))}
                    style={{ width:"100%",padding:"10px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-md)",color:"var(--text-primary)",fontSize:"0.85rem",fontFamily:"var(--font-mono)" }} />
                  <span style={{fontSize:"0.7rem",color:"var(--text-secondary)"}}>{t.apikeys_deepseek_hint}</span>
                </div>
                <div>
                  <label style={{display:"block",fontSize:"0.8rem",color:"var(--text-secondary)",marginBottom:4,fontWeight:600}}>
                    {t.apikeys_brave_label} <span style={{fontSize:"0.7rem"}}>{t.apikeys_brave_opt}</span>
                  </label>
                  <input type="password" placeholder="BSA..." value={apiKeys.brave}
                    onChange={e => setApiKeys(prev => ({...prev, brave: e.target.value}))}
                    style={{ width:"100%",padding:"10px 12px",background:"var(--bg-tertiary)",border:"1px solid var(--border-subtle)",borderRadius:"var(--radius-md)",color:"var(--text-primary)",fontSize:"0.85rem",fontFamily:"var(--font-mono)" }} />
                  <span style={{fontSize:"0.7rem",color:"var(--text-secondary)"}}>{t.apikeys_brave_hint}</span>
                </div>
              </div>
              <div style={{display:"flex",gap:12,marginTop:18}}>
                <button className="share-create-btn" onClick={handleSaveApiKeys} style={{flex:1, padding: needsApiKeys ? "12px 0" : undefined, fontSize: needsApiKeys ? "0.95rem" : undefined}}
                  disabled={!apiKeys.openai.trim() && !apiKeys.anthropic.trim() && !apiKeys.gemini.trim() && !apiKeys.groq.trim() && !apiKeys.mistral.trim() && !apiKeys.deepseek.trim()}>
                  {needsApiKeys ? t.apikeys_connect_start : t.apikeys_save}
                </button>
                {!needsApiKeys && (
                  <button className="ghost-btn" onClick={() => setShowApiKeyModal(false)} style={{flex:1}}>
                    {t.apikeys_later}
                  </button>
                )}
              </div>
              {needsApiKeys && (
                <button
                  onClick={() => { setShowApiKeyModal(false); setNeedsApiKeys(false); }}
                  style={{
                    display: "block", width: "100%", marginTop: 12, background: "none", border: "none",
                    color: "var(--text-secondary)", fontSize: "0.75rem", cursor: "pointer", textDecoration: "underline",
                  }}
                >
                  {t.apikeys_skip_later}
                </button>
              )}
              <p style={{fontSize:"0.7rem",color:"var(--text-secondary)",marginTop:12,textAlign:"center"}}>
                {t.apikeys_footer}
              </p>
            </div>
          </div>
        )}

        {/* Paywall Modal */}
        {showPaywall && (
          <div className="onboarding-overlay" onClick={() => setShowPaywall(false)}>
            <div className="onboarding-modal" onClick={e => e.stopPropagation()} style={{maxWidth:420}}>
              <div className="onboarding-header"><Lock size={20} /><h3>{t.paywall_title}</h3><button className="ghost-btn" onClick={() => setShowPaywall(false)}><X size={16} /></button></div>
              <p className="onboarding-subtitle" style={{marginBottom:16}}>
                {paywallFeature==="messages" ? t.paywall_messages : t.paywall_feature(paywallFeature)}
              </p>
              <div style={{display:"flex",gap:12}}>
                <a href="/#pricing" target="_blank" rel="noopener noreferrer" className="share-create-btn" style={{flex:1,textAlign:"center",textDecoration:"none"}}>{t.paywall_view}</a>
                <button className="ghost-btn" onClick={() => setShowPaywall(false)} style={{flex:1}}>{t.paywall_later}</button>
              </div>
            </div>
          </div>
        )}

        {/* Create Custom Agent Modal */}
        {showCreateAgent && (
          <div className="onboarding-overlay" onClick={() => setShowCreateAgent(false)}>
            <div className="onboarding-modal" onClick={e => e.stopPropagation()} style={{ maxWidth: 520 }}>
              <div className="onboarding-header">
                <Bot size={20} />
                <h3>{t.agent_create_title}</h3>
                <button className="ghost-btn" onClick={() => setShowCreateAgent(false)}><X size={16} /></button>
              </div>
              <p className="onboarding-subtitle" style={{ marginBottom: 16 }}>
                {t.agent_create_subtitle}
              </p>
              <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4, fontWeight: 600 }}>
                    {t.agent_name_label} <span style={{ color: "var(--accent)", fontSize: "0.7rem" }}>{t.agent_required}</span>
                  </label>
                  <input
                    type="text" placeholder={t.agent_name_placeholder}
                    value={newAgent.name}
                    onChange={e => setNewAgent(prev => ({ ...prev, name: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4, fontWeight: 600 }}>
                    {t.agent_tagline_label}
                  </label>
                  <input
                    type="text" placeholder={t.agent_tagline_placeholder}
                    value={newAgent.tagline}
                    onChange={e => setNewAgent(prev => ({ ...prev, tagline: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4, fontWeight: 600 }}>
                    {t.agent_expertise_label} <span style={{ color: "var(--accent)", fontSize: "0.7rem" }}>{t.agent_required}</span>
                  </label>
                  <textarea
                    placeholder={t.agent_expertise_placeholder}
                    value={newAgent.expertise}
                    onChange={e => setNewAgent(prev => ({ ...prev, expertise: e.target.value }))}
                    rows={2}
                    style={{ width: "100%", padding: "10px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontSize: "0.85rem", resize: "vertical" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4, fontWeight: 600 }}>
                    {t.agent_personality_label}
                  </label>
                  <input
                    type="text" placeholder={t.agent_personality_placeholder}
                    value={newAgent.personality}
                    onChange={e => setNewAgent(prev => ({ ...prev, personality: e.target.value }))}
                    style={{ width: "100%", padding: "10px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontSize: "0.85rem" }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4, fontWeight: 600 }}>
                    {t.agent_instructions_label}
                  </label>
                  <textarea
                    placeholder={t.agent_instructions_placeholder}
                    value={newAgent.instructions}
                    onChange={e => setNewAgent(prev => ({ ...prev, instructions: e.target.value }))}
                    rows={2}
                    style={{ width: "100%", padding: "10px 12px", background: "var(--bg-tertiary)", border: "1px solid var(--border-subtle)", borderRadius: "var(--radius-md)", color: "var(--text-primary)", fontSize: "0.85rem", resize: "vertical" }}
                  />
                </div>
                {/* Icon + Color picker */}
                <div style={{ display: "flex", gap: 16 }}>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4, fontWeight: 600 }}>{t.agent_icon_label}</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {CUSTOM_AGENT_ICONS.map(iconName => (
                        <button
                          key={iconName}
                          onClick={() => setNewAgent(prev => ({ ...prev, icon: iconName }))}
                          style={{
                            width: 32, height: 32, borderRadius: 6, border: newAgent.icon === iconName ? `2px solid ${newAgent.color}` : "1px solid var(--border-subtle)",
                            background: newAgent.icon === iconName ? `${newAgent.color}18` : "var(--bg-tertiary)",
                            color: newAgent.icon === iconName ? newAgent.color : "var(--text-secondary)",
                            cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center",
                          }}
                        >
                          <AgentIcon name={iconName} size={14} />
                        </button>
                      ))}
                    </div>
                  </div>
                  <div style={{ flex: 1 }}>
                    <label style={{ display: "block", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: 4, fontWeight: 600 }}>{t.agent_color_label}</label>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                      {CUSTOM_AGENT_COLORS.map(c => (
                        <button
                          key={c}
                          onClick={() => setNewAgent(prev => ({ ...prev, color: c }))}
                          style={{
                            width: 28, height: 28, borderRadius: 14, border: newAgent.color === c ? "2px solid var(--text-primary)" : "2px solid transparent",
                            background: c, cursor: "pointer",
                          }}
                        />
                      ))}
                    </div>
                  </div>
                </div>
              </div>
              <div style={{ display: "flex", gap: 12, marginTop: 18 }}>
                <button
                  className="share-create-btn"
                  onClick={handleCreateAgent}
                  disabled={!newAgent.name.trim() || !newAgent.expertise.trim()}
                  style={{ flex: 1 }}
                >
                  {t.agent_create_btn}
                </button>
                <button className="ghost-btn" onClick={() => setShowCreateAgent(false)} style={{ flex: 1 }}>
                  {t.agent_cancel}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Hidden file input for PDF + image upload */}
        <input ref={fileInputRef} type="file" accept=".pdf,.png,.jpg,.jpeg,.gif,.webp,.bmp,.svg" style={{ display: "none" }} onChange={handleFileChange} />
        <div className="console-input">
          {uploadedPdf && (
            <div className="input-attachment-chip">
              <Paperclip size={14} />
              <span>{uploadedPdf.name}</span>
              <button onClick={() => setUploadedPdf(null)} className="attachment-remove"><X size={12} /></button>
            </div>
          )}
          {/* @mention agent picker dropdown */}
          {showMentionMenu && mentionAgents.length > 0 && (
            <div className="mention-menu" role="listbox" aria-label="Select an agent">
              {mentionAgents.map((agent, i) => (
                <button
                  key={agent.id}
                  role="option"
                  aria-selected={i === mentionIndex}
                  className={`mention-item${i === mentionIndex ? " active" : ""}`}
                  onMouseDown={e => {
                    e.preventDefault();
                    setActiveAgentId(agent.id);
                    setInput(prev => prev.replace(/@\w*$/, "").trim());
                    setShowMentionMenu(false);
                    setMentionQuery("");
                    inputRef.current?.focus();
                  }}
                  onMouseEnter={() => setMentionIndex(i)}
                >
                  <span className="mention-dot" style={{ background: agent.color }} />
                  <span className="mention-name">{agent.name}</span>
                  <span className="mention-tagline">{agent.tagline}</span>
                </button>
              ))}
              <div className="mention-hint" role="status">↑↓ navigate · Enter to select · Esc to close</div>
            </div>
          )}
          <div className="input-bar">
            <button type="button" className="input-icon-btn" onClick={handleUpload} title={t.sidebar_upload_pdf}>
              <Plus size={18} />
            </button>
            <button type="button" className={`input-icon-btn voice-btn${isListening ? " listening" : ""}`}
              onClick={handleVoice} title={isListening ? t.voice_stop : t.voice_start}
              style={isListening ? { "--audio-level": `${audioLevel}%` } as React.CSSProperties : undefined}>
              {isListening ? (
                <>
                  <span className="voice-rings">
                    <span className="voice-ring ring-1" />
                    <span className="voice-ring ring-2" />
                    <span className="voice-ring ring-3" />
                  </span>
                  <MicOff size={18} className="voice-icon-active" />
                </>
              ) : <Mic size={18} />}
            </button>
            {isListening && (
              <span className="voice-timer">{recordingTime}s</span>
            )}
            {/* Agent chip — shows current agent, click to switch back to general */}
            {(() => {
              const agent = getAgentById(activeAgentId, customAgents);
              if (agent && agent.id !== "general") {
                return (
                  <button
                    type="button"
                    className="input-agent-chip"
                    onClick={() => setActiveAgentId(DEFAULT_AGENT_ID)}
                    title={`Using ${agent.name} — click to switch to General`}
                    style={{ borderColor: `${agent.color}40`, color: agent.color }}
                  >
                    <AgentIcon name={agent.icon} size={12} />
                    <span>{agent.name}</span>
                    <X size={10} style={{ opacity: 0.6 }} />
                  </button>
                );
              }
              return null;
            })()}
            <textarea
              ref={inputRef}
              placeholder={isListening ? "🎙️ Listening... speak now (auto-stops after silence)" : (sending ? "🔨 Hammering out a response..." : t.chat_placeholder)}
              value={input}
              onChange={e => {
                const val = e.target.value;
                setInput(val);
                // Detect @mention trigger
                const atMatch = val.match(/@(\w*)$/);
                if (atMatch) {
                  setMentionQuery(atMatch[1]);
                  setShowMentionMenu(true);
                  setMentionIndex(0);
                } else {
                  setShowMentionMenu(false);
                  setMentionQuery("");
                }
              }}
              onKeyDown={e => {
                if (showMentionMenu && mentionAgents.length > 0) {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setMentionIndex(i => (i + 1) % mentionAgents.length);
                    return;
                  }
                  if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setMentionIndex(i => (i - 1 + mentionAgents.length) % mentionAgents.length);
                    return;
                  }
                  if (e.key === "Enter" || e.key === "Tab") {
                    e.preventDefault();
                    const agent = mentionAgents[mentionIndex];
                    if (agent) {
                      setActiveAgentId(agent.id);
                      // Strip @query from input
                      setInput(prev => prev.replace(/@\w*$/, "").trim());
                      setShowMentionMenu(false);
                      setMentionQuery("");
                    }
                    return;
                  }
                  if (e.key === "Escape") {
                    e.preventDefault();
                    setShowMentionMenu(false);
                    setMentionQuery("");
                    return;
                  }
                }
                if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); sendCommand(); }
              }}
            />
            {sending ? (
              <button type="button" className="stop-btn" onClick={stopResponse} title="Stop generating" aria-label="Stop generating">
                <Square size={14} />
              </button>
            ) : (
              <button type="button" className="send-btn" onClick={() => sendCommand()} disabled={!input.trim()} aria-label="Send message">
                <Send size={16} />
              </button>
            )}
          </div>
          {/* Voice selector — below input bar */}
          <div className="input-sub-row" ref={voiceMenuRef}>
            <button
              type="button"
              className="voice-selector-pill"
              onClick={() => setShowVoiceMenu(v => !v)}
              title="Change voice"
            >
              <Volume2 size={11} />
              <span>{VOICE_OPTIONS.find(v => v.id === selectedVoice)?.label || "Nova"}</span>
            </button>
            {showVoiceMenu && (
              <div className="voice-selector-menu">
                {VOICE_OPTIONS.map(v => (
                  <button
                    key={v.id}
                    type="button"
                    className={`voice-option${selectedVoice === v.id ? " active" : ""}`}
                    onClick={() => {
                      setSelectedVoice(v.id);
                      localStorage.setItem("hammerlock_voice", v.id);
                      setShowVoiceMenu(false);
                      fetch("/api/tts", {
                        method: "POST",
                        headers: { "Content-Type": "application/json" },
                        body: JSON.stringify({ text: `Hi, I'm ${v.label}.`, voice: v.id }),
                      }).then(r => {
                        if (r.ok && r.headers.get("content-type")?.includes("audio")) {
                          r.blob().then(blob => {
                            const url = URL.createObjectURL(blob);
                            const audio = new Audio(url);
                            audio.onended = () => URL.revokeObjectURL(url);
                            audio.onerror = () => URL.revokeObjectURL(url);
                            audio.play();
                          });
                        }
                      }).catch(() => {});
                    }}
                  >
                    <span className="voice-option-name">{v.label}</span>
                    <span className="voice-option-desc">{v.desc}</span>
                    {selectedVoice === v.id && <span className="voice-option-check">✓</span>}
                  </button>
                ))}
              </div>
            )}
            {/* Model selector */}
            <div style={{ position: "relative" }} ref={modelMenuRef}>
              <button
                type="button"
                className="voice-selector-pill"
                onClick={() => { setShowModelMenu(v => !v); setShowVoiceMenu(false); }}
                title="Change AI model"
              >
                <Cpu size={11} />
                <span>{MODEL_OPTIONS.find(m => m.id === selectedModel)?.label || "Auto"}</span>
              </button>
              {showModelMenu && (
                <div className="voice-selector-menu">
                  {MODEL_OPTIONS.map(m => (
                    <button
                      key={m.id}
                      type="button"
                      className={`voice-option${selectedModel === m.id ? " active" : ""}`}
                      onClick={() => {
                        setSelectedModel(m.id);
                        localStorage.setItem("hammerlock_model", m.id);
                        setShowModelMenu(false);
                      }}
                    >
                      <span className="voice-option-name">{m.label}</span>
                      <span className="voice-option-desc">{m.desc}</span>
                      {selectedModel === m.id && <span className="voice-option-check">✓</span>}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
          <div className="console-footer">
            <span className="dot" /> {t.chat_footer_encrypted}
            {desktop
              ? <>
                  <span style={{marginLeft:12,color:"var(--accent)"}}>{t.chat_footer_premium}</span>
                  {computeUnits && !computeUnits.usingOwnKey && (
                    <span style={{
                      marginLeft: 12,
                      display: 'inline-flex', alignItems: 'center', gap: 6,
                      color: computeUnits.remaining <= 50 ? "var(--danger, #ff4444)" : "var(--text-secondary)",
                    }}>
                      <span style={{
                        display: 'inline-block', width: 48, height: 4, borderRadius: 2,
                        background: 'rgba(255,255,255,0.08)', overflow: 'hidden', verticalAlign: 'middle',
                      }}>
                        <span style={{
                          display: 'block', height: '100%', borderRadius: 2,
                          width: `${Math.min(100, Math.round((computeUnits.remaining / Math.max(computeUnits.total, 1)) * 100))}%`,
                          background: computeUnits.remaining / computeUnits.total > 0.5 ? 'var(--accent, #00ff88)'
                            : computeUnits.remaining / computeUnits.total > 0.2 ? '#f59e0b' : '#ff4444',
                          transition: 'width 0.3s ease',
                        }} />
                      </span>
                      {computeUnits.remaining} / {computeUnits.total} {t.compute_units}
                      {computeUnits.remaining <= 50 && computeUnits.remaining > 0 && ` — ${t.compute_running_low}`}
                      {computeUnits.remaining <= 0 && ` — ${t.compute_add_key}`}
                    </span>
                  )}
                  {computeUnits?.usingOwnKey && (
                    <span style={{ marginLeft: 12, color: 'var(--accent)' }}>{t.compute_own_key}</span>
                  )}
                </>
              : subscription.active
                ? <span style={{marginLeft:12,color:"var(--accent)"}}>{` ${subscription.tier.charAt(0).toUpperCase() + subscription.tier.slice(1)}`}</span>
                : FREE_MESSAGE_LIMIT > 9999 ? null : <span style={{marginLeft:12}}>{freeLeft > 0 ? t.chat_footer_free_left(freeLeft) : t.chat_footer_free_limit}</span>
            }
          </div>
        </div>
      </div>

      {/* ---- PERSONAL VAULT PANEL ---- */}
      <PersonalVaultPanel open={showPersonalVaultPanel} onClose={() => setShowPersonalVaultPanel(false)} />

      {/* ---- PERMISSIONS SETUP PANEL ---- */}
      {showPermissionsSetup && (
        <PermissionsSetup
          mode={permissionsSetupMode}
          onClose={() => {
            setShowPermissionsSetup(false);
            // Mark as explored
            updateVaultData(prev => ({
              ...prev,
              settings: { ...(prev.settings || {}), permissions_explored: new Date().toISOString() }
            })).catch(() => {});
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          onComplete={() => {
            setShowPermissionsSetup(false);
            // Mark permissions as explored
            updateVaultData(prev => ({
              ...prev,
              settings: { ...(prev.settings || {}), permissions_explored: new Date().toISOString() }
            })).catch(() => {});
            // Chain to Integration Setup if not yet explored
            if (!vaultData?.settings?.integrations_explored) {
              setTimeout(() => {
                setIntegrationSetupMode("onboarding");
                setShowIntegrationSetup(true);
              }, 300);
            } else {
              setTimeout(() => inputRef.current?.focus(), 100);
            }
          }}
        />
      )}

      {/* ---- INTEGRATION SETUP PANEL ---- */}
      {showIntegrationSetup && (
        <IntegrationSetup
          mode={integrationSetupMode}
          onClose={() => {
            setShowIntegrationSetup(false);
            // Mark as explored so we don't show again on next launch
            updateVaultData(prev => ({
              ...prev,
              settings: { ...(prev.settings || {}), integrations_explored: new Date().toISOString() }
            })).catch(() => {});
            setTimeout(() => inputRef.current?.focus(), 100);
          }}
          onSetupSkill={(_skillName, message) => {
            setShowIntegrationSetup(false);
            // Mark as explored
            updateVaultData(prev => ({
              ...prev,
              settings: { ...(prev.settings || {}), integrations_explored: new Date().toISOString() }
            })).catch(() => {});
            // Send the setup/test message directly into the chat
            setTimeout(() => sendCommand(message), 300);
          }}
        />
      )}

      {/* ---- FILE VAULT PANEL ---- */}
      {showVaultPanel && (
        <div className="vault-panel-overlay" onClick={() => setShowVaultPanel(false)}>
          <div className="vault-panel" onClick={e => e.stopPropagation()}>
            <div className="vault-panel-header">
              <Shield size={18} />
              <h3>My Files</h3>
              <span className="vault-count">{vaultFiles.length} items</span>
              <button className="ghost-btn" onClick={() => setShowVaultPanel(false)} style={{marginLeft:"auto"}}><X size={16} /></button>
            </div>
            <p style={{fontSize:"0.75rem",color:"var(--text-muted)",padding:"0 16px 8px",margin:0,lineHeight:1.5}}>
              Your encrypted vault — save chat responses, upload PDFs, and create notes. Everything is AES-256 encrypted on your device.
            </p>

            {/* Search + Actions */}
            <div className="vault-panel-actions">
              <div className="vault-search-bar">
                <Search size={14} />
                <input
                  type="text"
                  placeholder="Search files..."
                  value={vaultSearchQuery}
                  onChange={e => setVaultSearchQuery(e.target.value)}
                />
              </div>
              <button className="vault-action-btn" onClick={() => setShowNewNote(true)}>
                <StickyNote size={14} /> New Note
              </button>
            </div>

            {/* New Note Form */}
            {showNewNote && (
              <div className="vault-new-note">
                <input
                  type="text"
                  placeholder="Note title (optional)"
                  value={newNoteTitle}
                  onChange={e => setNewNoteTitle(e.target.value)}
                  className="vault-note-title-input"
                />
                <textarea
                  placeholder="Write your note..."
                  value={newNoteContent}
                  onChange={e => setNewNoteContent(e.target.value)}
                  className="vault-note-textarea"
                  rows={4}
                />
                <div style={{display:"flex",gap:8}}>
                  <button className="vault-save-btn" onClick={saveNoteToVault} disabled={!newNoteContent.trim()}>
                    <Check size={14} /> Save
                  </button>
                  <button className="ghost-btn" onClick={() => { setShowNewNote(false); setNewNoteTitle(""); setNewNoteContent(""); }} style={{fontSize:"0.8rem"}}>
                    Cancel
                  </button>
                </div>
              </div>
            )}

            {/* File List */}
            <div className="vault-file-list">
              {filteredVaultFiles.length === 0 ? (
                <div className="vault-empty">
                  <Shield size={32} style={{opacity:0.2}} />
                  <p>{vaultSearchQuery ? "No matching files" : "No files yet"}</p>
                  <p style={{fontSize:"0.75rem",color:"var(--text-muted)"}}>
                    {vaultSearchQuery ? "Try a different search" : "Save chat responses, upload PDFs, or create notes to store them securely."}
                  </p>
                </div>
              ) : (
                filteredVaultFiles.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).map(file => (
                  <div key={file.id} className="vault-file-item">
                    <div className="vault-file-icon">
                      {file.type === "pdf" ? <FileText size={16} /> :
                       file.type === "image" ? <Image size={16} /> :
                       file.type === "note" ? <StickyNote size={16} /> :
                       <File size={16} />}
                    </div>
                    <div className="vault-file-info">
                      <div className="vault-file-name">{file.name}</div>
                      <div className="vault-file-meta">
                        <span className="vault-file-type">{file.type}</span>
                        {file.size && <span>{(file.size / 1024).toFixed(1)}KB</span>}
                        <span>{new Date(file.createdAt).toLocaleDateString()}</span>
                      </div>
                      {file.tags.length > 0 && (
                        <div className="vault-file-tags">
                          {file.tags.map(tag => <span key={tag} className="vault-tag">{tag}</span>)}
                        </div>
                      )}
                    </div>
                    <div className="vault-file-actions">
                      <button
                        className="ghost-btn"
                        title="Copy content"
                        onClick={() => handleCopy(file.content)}
                      >
                        <Copy size={13} />
                      </button>
                      <button
                        className="ghost-btn"
                        title="Use in chat"
                        onClick={() => {
                          setUploadedPdf({ name: file.name, text: file.content.slice(0, 8000) });
                          setShowVaultPanel(false);
                        }}
                      >
                        <Send size={13} />
                      </button>
                      <button
                        className="ghost-btn vault-delete-btn"
                        title="Remove file"
                        onClick={() => deleteVaultFile(file.id)}
                      >
                        <Trash2 size={13} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {/* Tutorial Modal */}
      {tutorialStep >= 0 && (
        <div className="tutorial-overlay" onClick={handleTutorialSkip}>
          <div className="tutorial-modal" onClick={e => e.stopPropagation()}>
            <div className="tutorial-icon">{TUTORIAL_STEPS[tutorialStep]?.icon}</div>
            <div className="tutorial-progress">
              {TUTORIAL_STEPS.map((_, i) => (
                <div key={i} className={`dot${i === tutorialStep ? " active" : i < tutorialStep ? " done" : ""}`} />
              ))}
            </div>
            <h2 className="tutorial-title">{TUTORIAL_STEPS[tutorialStep]?.title}</h2>
            <p className="tutorial-desc">{TUTORIAL_STEPS[tutorialStep]?.desc}</p>
            <div className="tutorial-actions">
              {tutorialStep < TUTORIAL_STEPS.length - 1 && (
                <button className="tutorial-skip-btn" onClick={handleTutorialSkip}>
                  {t.tutorial_skip || "Skip"}
                </button>
              )}
              <button className="tutorial-next-btn" onClick={handleTutorialNext}>
                {tutorialStep >= TUTORIAL_STEPS.length - 1 ? (t.tutorial_done || "Let's Go!") : (t.tutorial_next || "Next")}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
