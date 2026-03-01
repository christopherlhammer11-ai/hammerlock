/**
 * HammerLock AI — Chat Constants & Data Definitions
 *
 * Extracted from chat/page.tsx to reduce file size and improve maintainability.
 * Contains: action badges, nudge catalog, thinking messages, agent emoji map,
 * agent intro tips, workflow actions, workflow chains, voice/model options.
 */

import type { NudgeDef } from "@/lib/use-nudges";

// ---- OpenClaw Action Badge Display Maps ----

export const ACTION_BADGE_ICONS: Record<string, string> = {
  reminder: "⏰", email: "📧", message: "💬", notes: "📝",
  calendar: "📅", smart_home: "💡", github: "🐙", todo: "✅",
  camera: "📷", summarize_url: "🔗",
};

export const ACTION_BADGE_LABELS: Record<string, string> = {
  reminder: "Reminder", email: "Email", message: "Message Sent",
  notes: "Note Created", calendar: "Calendar", smart_home: "Smart Home",
  github: "GitHub", todo: "Todo", camera: "Camera", summarize_url: "Summarized",
};

// ---- Nudge Catalog ----

export const NUDGE_CATALOG: Record<string, NudgeDef> = {
  remember_tip: {
    id: "remember_tip",
    icon: "🧠",
    message: "Teach me about yourself! Say \"remember: I live in Denver\" or any detail — I'll use it to personalize every response.",
    ctaLabel: "Try it \u2192",
    ctaCommand: "remember: ",
  },
  search_tip: {
    id: "search_tip",
    icon: "🌐",
    message: "I can search the web! Try asking about weather, news, restaurants, or anything that needs real-time data.",
    ctaLabel: "Try a search \u2192",
    ctaCommand: "search ",
  },
  voice_tip: {
    id: "voice_tip",
    icon: "🎙\uFE0F",
    message: "You can talk to me! Click the mic button to use voice input, or say \"read it out loud\" to hear my response.",
  },
  vault_tip: {
    id: "vault_tip",
    icon: "📎",
    message: "Upload PDFs and images with the paperclip button — I'll analyze them and store them encrypted on your device.",
  },
  agents_tip: {
    id: "agents_tip",
    icon: "🤖",
    message: "You're chatting with the general assistant. Try a specialist! Strategist does competitive analysis, Counsel handles legal research, Analyst builds financial models, and Writer polishes your drafts.",
    ctaLabel: "Browse Agents \u2192",
    ctaCommand: "__open_agents_tab__",
  },
  agent_deep_tip: {
    id: "agent_deep_tip",
    icon: "📄",
    message: "Pro tip: Upload a PDF and switch to the right agent \u2014 Counsel for contracts, Analyst for financials, Researcher for academic papers. Each agent reads the file through its specialist lens.",
  },
};

// ---- Thinking Messages ----

export const THINKING_MESSAGES = [
  "Cooking up something good...",
  "Hmm, let me think about that...",
  "Crunching the numbers...",
  "Digging through the archives...",
  "Putting the pieces together...",
  "Working my magic...",
  "On it, one sec...",
  "Consulting the oracle...",
  "Brewing up an answer...",
  "Let me look into that...",
  "Neurons firing...",
  "Connecting the dots...",
  "Hold tight, almost there...",
  "Shuffling through the data...",
  "Thinking cap: ON...",
  "🔨 Hammering it out...",
  "🔨 Forging your answer...",
  "🔨 Nailing this down...",
  "🔨 Striking while the iron's hot...",
  "🔨 Drop the hammer in 3... 2...",
] as const;

export function getThinkingMessage() {
  return THINKING_MESSAGES[Math.floor(Math.random() * THINKING_MESSAGES.length)];
}

// ---- Agent Emoji Map ----

export const AGENT_EMOJI: Record<string, string> = {
  Terminal: "\u2318", Target: "\uD83C\uDFAF", Scale: "\u2696\uFE0F", TrendingUp: "\uD83D\uDCC8",
  BookOpen: "\uD83D\uDCDA", Wrench: "\uD83D\uDD27", PenTool: "\u270D\uFE0F",
  Bot: "\uD83E\uDD16", Brain: "\uD83E\uDDE0", Cpu: "\uD83D\uDCBB", Flame: "\uD83D\uDD25",
  Heart: "\u2764\uFE0F", Lightbulb: "\uD83D\uDCA1", Rocket: "\uD83D\uDE80", Shield: "\uD83D\uDEE1\uFE0F",
  Star: "\u2B50", Wand2: "\u2728", Zap: "\u26A1",
  Wallet: "\uD83D\uDCB0", Megaphone: "\uD83D\uDCE3", Sword: "\u2694\uFE0F",
};

// ---- Agent Intro Tips ----

export const AGENT_INTRO_TIPS: Record<string, { tips: string[]; example: string }> = {
  coach: {
    tips: [
      "Tell Coach about your fitness level and any injuries — it'll customize everything for you",
      "Ask for quick workouts when you're short on time: \"Give me a 15-min full body workout\"",
      "Get meal plans based on what you have: \"I have chicken, rice, and veggies — plan my week\"",
    ],
    example: "I'm a beginner, no gym — just dumbbells at home. Build me a 4-week plan to get stronger, 30 min/day.",
  },
  money: {
    tips: [
      "Start with the basics: \"I make $X/month after taxes\" — Money does the math from there",
      "Be honest about debt — no judgment, just a plan: \"I owe $12K across 3 credit cards\"",
      "Ask it to find savings: \"Where am I overspending?\" — paste your expenses and let it analyze",
    ],
    example: "I make $4,200/mo after taxes. Rent is $1,400, car is $380. Help me budget the rest and start saving.",
  },
  content: {
    tips: [
      "Always mention the platform — Instagram captions are different from LinkedIn posts",
      "Describe your vibe: \"casual and funny\" vs \"professional and authoritative\" changes everything",
      "Ask for bulk content: \"Give me 10 hooks\" or \"Plan a week of posts\" to batch your content creation",
    ],
    example: "I run a small bakery. Give me 5 Instagram captions for this week — fun, casual, with CTAs to order online.",
  },
  strategist: {
    tips: [
      "Start by describing your business in 2\u20133 sentences \u2014 Strategist remembers context for the whole conversation",
      "Ask it to challenge your assumptions: \"What am I missing in this plan?\"",
      "Use it for framework-driven analysis: \"Run a SWOT\" or \"Map my competitive landscape\"",
    ],
    example: "I'm launching a B2B SaaS for compliance teams in fintech. Help me map the competitive landscape and find the gaps.",
  },
  counsel: {
    tips: [
      "Always specify the jurisdiction: \"Under California law...\" or \"Per EU GDPR requirements...\"",
      "Upload contracts as PDFs and ask: \"Flag any unusual clauses or missing protections\"",
      "Use it for research, not advice \u2014 it will always remind you to consult a licensed attorney",
    ],
    example: "Review this vendor agreement and flag any one-sided terms, missing IP protections, or liability concerns.",
  },
  analyst: {
    tips: [
      "Give it numbers first \u2014 the Analyst works best with specific data points",
      "Ask for structured scenarios: \"Build a bull/base/bear case for this acquisition\"",
      "Use it for quick market sizing: \"What's the TAM/SAM/SOM for [industry] in [region]?\"",
    ],
    example: "I'm raising a Series A at $15M pre. Our ARR is $1.2M growing 15% MoM. Help me build the financial model.",
  },
  researcher: {
    tips: [
      "Be specific about scope: \"Research the last 3 years of studies on [topic]\"",
      "Ask it to evaluate source quality: \"How credible is this? What's the methodology?\"",
      "Request structured outputs: \"Give me background, methodology, findings, analysis, and limitations\"",
    ],
    example: "Search for recent studies on employee retention in remote-first companies. Synthesize the findings.",
  },
  operator: {
    tips: [
      "Start with the outcome: \"I need to launch [X] by [date]. Break it down for me.\"",
      "Use it as a daily standup partner: \"Here's what I did today, what should I focus on tomorrow?\"",
      "Have it prioritize: \"I have 12 tasks. Help me rank them P0/P1/P2.\"",
    ],
    example: "I'm shipping a product update next Friday. Here's what's left: [list]. Help me prioritize and create a day-by-day plan.",
  },
  writer: {
    tips: [
      "Always state the audience: \"This is for our investors\" vs. \"This is for our engineering team\"",
      "Ask for drafts first, then iterate: \"Draft v1, then I'll give you feedback\"",
      "Specify tone: \"Write this like a CEO update \u2014 confident but not arrogant\"",
    ],
    example: "Draft a cold email to a potential enterprise customer. We sell compliance automation for fintech. Keep it under 150 words.",
  },
  director: {
    tips: [
      "Start with the platform and length: \"30-second TikTok\" vs. \"3-minute YouTube tutorial\" — Director optimizes for each",
      "Describe your product/demo: \"It's an encrypted AI chat app\" — Director builds the visual story around it",
      "Ask for complete packages: \"Give me the script, shot list, and voiceover\" — one prompt, everything you need",
    ],
    example: "Script a 60-second product demo video for a fitness app. Show the workout tracker, meal planner, and social features. Punchy and modern.",
  },
};

// ---- Workflow Types ----

export type WorkflowAction = {
  id: string;
  icon: string;
  label: string;
  /** Command template — {content} is replaced with the AI response */
  command: string;
};

export type WorkflowChain = {
  id: string;
  icon: string;
  label: string;
  /** Steps described for the user */
  description: string;
  /** Array of commands to execute sequentially */
  steps: string[];
  /** Keywords that trigger this chain suggestion (matched against AI response) */
  triggers: string[];
};

// ---- Per-Agent Quick Actions ----

export const AGENT_ACTIONS: Record<string, WorkflowAction[]> = {
  analyst: [
    { id: "email_report", icon: "📧", label: "Email This", command: "Send email with subject 'Financial Analysis from HammerLock AI': {content}" },
    { id: "save_notes", icon: "📝", label: "Save to Notes", command: "Create note in Apple Notes: Financial Analysis\n\n{content}" },
    { id: "add_tasks", icon: "✅", label: "Create Tasks", command: "Add to my todo list: Review and validate the financial model assumptions, Update revenue forecast spreadsheet, Schedule review meeting" },
  ],
  strategist: [
    { id: "email_report", icon: "📧", label: "Email This", command: "Send email with subject 'Strategy Brief from HammerLock AI': {content}" },
    { id: "save_notes", icon: "📝", label: "Save to Notes", command: "Create note in Apple Notes: Strategy Brief\n\n{content}" },
    { id: "add_tasks", icon: "✅", label: "Action Items", command: "Add to my todo list: Execute on strategy recommendations, Research competitor moves, Schedule strategy review" },
  ],
  counsel: [
    { id: "email_report", icon: "📧", label: "Email Analysis", command: "Send email with subject 'Legal Analysis from HammerLock AI': {content}" },
    { id: "save_notes", icon: "📝", label: "Save to Notes", command: "Create note in Apple Notes: Legal Analysis\n\n{content}" },
    { id: "calendar_review", icon: "📅", label: "Schedule Review", command: "Schedule a meeting to review legal analysis findings" },
  ],
  researcher: [
    { id: "email_report", icon: "📧", label: "Email Research", command: "Send email with subject 'Research Brief from HammerLock AI': {content}" },
    { id: "save_notes", icon: "📝", label: "Save to Notes", command: "Create note in Apple Notes: Research Brief\n\n{content}" },
    { id: "add_tasks", icon: "✅", label: "Follow-ups", command: "Add to my todo list: Validate research sources, Deep-dive into key findings, Compile final research report" },
  ],
  operator: [
    { id: "add_tasks", icon: "✅", label: "Create Tasks", command: "Add to my todo list: {content}" },
    { id: "calendar", icon: "📅", label: "Schedule It", command: "Add to calendar: {content}" },
    { id: "email_team", icon: "📧", label: "Email Team", command: "Send email with subject 'Action Plan from HammerLock AI': {content}" },
  ],
  writer: [
    { id: "email_draft", icon: "📧", label: "Send as Email", command: "Send email: {content}" },
    { id: "save_notes", icon: "📝", label: "Save Draft", command: "Create note in Apple Notes: Draft\n\n{content}" },
    { id: "copy_clean", icon: "📋", label: "Copy Clean", command: "__copy_clean__" },
  ],
  coach: [
    { id: "save_plan", icon: "📝", label: "Save Plan", command: "Create note in Apple Notes: Fitness & Wellness Plan\n\n{content}" },
    { id: "set_reminder", icon: "⏰", label: "Set Reminder", command: "Set a reminder: Time for your workout! Here's the plan: {content}" },
    { id: "grocery_list", icon: "🛒", label: "Grocery List", command: "Create note in Apple Notes: Grocery List\n\n{content}" },
  ],
  money: [
    { id: "save_budget", icon: "📝", label: "Save Budget", command: "Create note in Apple Notes: Budget Plan\n\n{content}" },
    { id: "set_reminder", icon: "⏰", label: "Bill Reminder", command: "Set a reminder: Budget check-in — {content}" },
    { id: "email_it", icon: "📧", label: "Email Summary", command: "Send email with subject 'Budget Summary from HammerLock AI': {content}" },
  ],
  content: [
    { id: "copy_post", icon: "📋", label: "Copy Post", command: "__copy_clean__" },
    { id: "save_calendar", icon: "📝", label: "Save Calendar", command: "Create note in Apple Notes: Content Calendar\n\n{content}" },
    { id: "schedule_post", icon: "⏰", label: "Schedule Post", command: "Set a reminder: Time to post! Content ready: {content}" },
  ],
  director: [
    { id: "copy_script", icon: "📋", label: "Copy Script", command: "__copy_clean__" },
    { id: "save_script", icon: "📝", label: "Save Script", command: "Create note in Apple Notes: Video Script\n\n{content}" },
    { id: "email_script", icon: "📧", label: "Email Script", command: "Send email with subject 'Video Script from HammerLock AI': {content}" },
  ],
  general: [
    { id: "email_it", icon: "📧", label: "Email This", command: "Send email with subject 'From HammerLock AI': {content}" },
    { id: "save_notes", icon: "📝", label: "Save to Notes", command: "Create note in Apple Notes: {content}" },
    { id: "remind_me", icon: "⏰", label: "Remind Me", command: "Set a reminder: Follow up on this — {content}" },
  ],
};

// ---- Smart Workflow Chains ----

export const WORKFLOW_CHAINS: Record<string, WorkflowChain[]> = {
  analyst: [
    {
      id: "full_report_flow",
      icon: "🔄",
      label: "Full Report Pipeline",
      description: "Save analysis → Create review tasks → Email to stakeholders",
      steps: [
        "Create note in Apple Notes: Financial Analysis Report\n\n{content}",
        "Add to my todo list: Review financial model assumptions, Validate conversion rate estimates, Update P&L spreadsheet with new projections",
        "Send email with subject 'Financial Analysis Ready for Review': I've completed a financial analysis. Key findings are saved in Notes. Please review when you have a chance.",
      ],
      triggers: ["revenue", "forecast", "model", "scenario", "bull", "bear", "base case", "projection", "financial"],
    },
    {
      id: "investor_prep",
      icon: "💰",
      label: "Investor Prep Pipeline",
      description: "Save model → Draft investor email → Schedule pitch prep",
      steps: [
        "Create note in Apple Notes: Investor-Ready Financial Model\n\n{content}",
        "Add to my todo list: Polish financial model for investors, Prepare Q&A for tough questions, Update pitch deck with new numbers",
        "Schedule a meeting for pitch deck review and investor prep session",
      ],
      triggers: ["series", "fundrais", "investor", "valuation", "pitch", "raise", "round"],
    },
  ],
  strategist: [
    {
      id: "strategy_exec",
      icon: "🔄",
      label: "Strategy → Execution",
      description: "Save strategy → Create action items → Email team → Schedule kickoff",
      steps: [
        "Create note in Apple Notes: Strategy Document\n\n{content}",
        "Add to my todo list: Execute top 3 strategic priorities, Assign ownership for each initiative, Set 30/60/90 day milestones",
        "Schedule a meeting for strategy kickoff and team alignment",
      ],
      triggers: ["strategy", "competitive", "swot", "market entry", "go-to-market", "positioning", "roadmap"],
    },
  ],
  counsel: [
    {
      id: "legal_review_flow",
      icon: "🔄",
      label: "Legal Review Pipeline",
      description: "Save findings → Flag action items → Schedule attorney review",
      steps: [
        "Create note in Apple Notes: Legal Review Findings\n\n{content}",
        "Add to my todo list: Address flagged contract issues, Consult with licensed attorney on key concerns, Prepare revised contract draft",
        "Schedule a meeting for legal review with outside counsel",
      ],
      triggers: ["contract", "clause", "liability", "indemnif", "warrant", "breach", "compliance", "risk", "legal"],
    },
  ],
  researcher: [
    {
      id: "research_to_action",
      icon: "🔄",
      label: "Research → Report → Share",
      description: "Save research → Compile report → Email findings",
      steps: [
        "Create note in Apple Notes: Research Findings\n\n{content}",
        "Add to my todo list: Validate key research sources, Identify gaps for follow-up research, Draft executive summary of findings",
        "Send email with subject 'Research Findings Summary': Research is complete. Key findings have been saved to Notes. Summary attached.",
      ],
      triggers: ["study", "research", "finding", "evidence", "literature", "source", "methodology", "paper"],
    },
  ],
  operator: [
    {
      id: "plan_to_calendar",
      icon: "🔄",
      label: "Plan → Tasks → Calendar",
      description: "Create all tasks → Block calendar time → Email team the plan",
      steps: [
        "Add to my todo list: {content}",
        "Schedule a meeting for weekly sprint review and progress check",
        "Send email with subject 'This Week\\'s Plan': Here\\'s the execution plan for this week. Tasks have been created and calendar time blocked.",
      ],
      triggers: ["plan", "sprint", "priorit", "p0", "p1", "task", "deadline", "milestone", "checklist", "standup"],
    },
  ],
  writer: [
    {
      id: "publish_flow",
      icon: "🔄",
      label: "Draft → Review → Send",
      description: "Save draft → Create review task → Send when ready",
      steps: [
        "Create note in Apple Notes: Content Draft\n\n{content}",
        "Add to my todo list: Proofread and polish the draft, Get feedback from team, Schedule publication date",
      ],
      triggers: ["draft", "blog", "post", "article", "email", "copy", "pitch", "newsletter", "script"],
    },
  ],
  coach: [
    {
      id: "fitness_routine",
      icon: "💪",
      label: "Save Plan → Set Reminders",
      description: "Save workout plan → Create grocery list → Set daily reminder",
      steps: [
        "Create note in Apple Notes: Workout & Meal Plan\n\n{content}",
        "Set a reminder for tomorrow at 7am: Time for your workout! Check your plan in Notes.",
      ],
      triggers: ["workout", "exercise", "meal plan", "calories", "protein", "sets", "reps", "cardio", "strength", "routine"],
    },
  ],
  money: [
    {
      id: "budget_pipeline",
      icon: "💰",
      label: "Save Budget → Set Bill Reminders",
      description: "Save budget to Notes → Set reminder for monthly check-in",
      steps: [
        "Create note in Apple Notes: Monthly Budget Plan\n\n{content}",
        "Set a reminder: Monthly budget review — check spending against plan and adjust for next month",
      ],
      triggers: ["budget", "expense", "income", "debt", "saving", "payoff", "interest", "monthly", "credit card", "loan"],
    },
  ],
  content: [
    {
      id: "content_pipeline",
      icon: "📱",
      label: "Save Calendar → Schedule Posts",
      description: "Save content calendar → Set posting reminders",
      steps: [
        "Create note in Apple Notes: Content Calendar\n\n{content}",
        "Set a reminder: Content posting day! Check your calendar in Notes for today's post.",
      ],
      triggers: ["post", "caption", "content", "instagram", "tiktok", "linkedin", "twitter", "hook", "carousel", "reel", "thread"],
    },
  ],
  director: [
    {
      id: "script_to_production",
      icon: "🎬",
      label: "Script → Save → Schedule Shoot",
      description: "Save video script → Create shot list tasks → Schedule shoot day",
      steps: [
        "Create note in Apple Notes: Video Script\n\n{content}",
        "Add to my todo list: Review and finalize script, Prep set and props, Record B-roll footage, Film main takes, Edit and add music",
        "Set a reminder: Video shoot day! Script is saved in Notes — review it before you start.",
      ],
      triggers: ["script", "scene", "shot", "take", "voiceover", "b-roll", "hook", "cta", "demo", "tutorial", "walkthrough"],
    },
    {
      id: "video_series_plan",
      icon: "📺",
      label: "Plan Series → Save → Remind",
      description: "Save video series plan → Set weekly filming reminders",
      steps: [
        "Create note in Apple Notes: Video Series Plan\n\n{content}",
        "Set a reminder: Video content day! Check your series plan in Notes and film the next episode.",
      ],
      triggers: ["series", "episode", "weekly", "campaign", "launch", "funnel", "playlist"],
    },
  ],
};

// ---- Voice Options ----

export const VOICE_OPTIONS = [
  { id: "nova", label: "Nova", desc: "Warm female" },
  { id: "alloy", label: "Alloy", desc: "Neutral" },
  { id: "echo", label: "Echo", desc: "Male" },
  { id: "fable", label: "Fable", desc: "British" },
  { id: "onyx", label: "Onyx", desc: "Deep male" },
  { id: "shimmer", label: "Shimmer", desc: "Soft female" },
] as const;

// ---- Model Options ----

export const MODEL_OPTIONS = [
  { id: "auto", label: "Auto", desc: "Fastest available" },
  { id: "Gemini", label: "Gemini", desc: "2.5 Flash" },
  { id: "OpenAI", label: "OpenAI", desc: "GPT-4o" },
  { id: "Anthropic", label: "Claude", desc: "Sonnet" },
  { id: "Groq", label: "Groq", desc: "Llama 3.3" },
  { id: "DeepSeek", label: "DeepSeek", desc: "Chat" },
  { id: "Mistral", label: "Mistral", desc: "Small" },
] as const;

// ---- Utility Functions ----

/** Detect which workflow chains are relevant based on AI response content */
export function detectRelevantChains(agentId: string, responseText: string): WorkflowChain[] {
  const chains = WORKFLOW_CHAINS[agentId] || [];
  const lower = responseText.toLowerCase();
  return chains.filter(chain =>
    chain.triggers.some(trigger => lower.includes(trigger))
  );
}

/** Detect if running inside Electron desktop app */
export function isElectron(): boolean {
  if (typeof window === "undefined") return false;
  return !!(window as unknown as Record<string, unknown>).electron ||
    (typeof navigator !== "undefined" && (
      navigator.userAgent.includes("Electron") ||
      navigator.userAgent.includes("HammerLock")
    ));
}

/** Vault settings key for tracking which agents have been introduced */
export const AGENT_INTRO_SEEN_KEY = "agent_intro_seen";
