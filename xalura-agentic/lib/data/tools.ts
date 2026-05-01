export type ToolTier = "free" | "starter" | "pro";

export interface ToolConfig {
  id: string;
  name: string;
  description: string;
  route: string;
  tier: ToolTier;
  hasUpload: boolean;
  badge: string | null;
  iconColor: string;
  icon: string;
}

export const TOOLS: ToolConfig[] = [
  {
    id: "letter",
    name: "Letter Writer",
    description: "Any letter for any occasion — complaint, request, appeal, thank you, and more",
    route: "/ai-tools/letter",
    tier: "free",
    hasUpload: true,
    badge: null,
    iconColor: "#6b1f2a",
    icon: "✍️",
  },
  {
    id: "summarizer",
    name: "Document Summarizer",
    description: "Compress any document into key insights, key points, and takeaways",
    route: "/ai-tools/summarizer",
    tier: "free",
    hasUpload: true,
    badge: null,
    iconColor: "#1a4a2e",
    icon: "🔍",
  },
  {
    id: "captions",
    name: "Caption Generator",
    description: "Platform-optimized captions for Instagram, TikTok, LinkedIn, and more",
    route: "/ai-tools/captions",
    tier: "free",
    hasUpload: true,
    badge: null,
    iconColor: "#f72585",
    icon: "📱",
  },
  {
    id: "translator",
    name: "AI Translator",
    description: "Translate text across 130+ languages while preserving tone and context",
    route: "/ai-tools/translator",
    tier: "free",
    hasUpload: false,
    badge: null,
    iconColor: "#0d2137",
    icon: "🌐",
  },
  {
    id: "invoice",
    name: "Invoice Generator",
    description: "Professional invoices and business letters with auto-calculations",
    route: "/ai-tools/invoice",
    tier: "starter",
    hasUpload: true,
    badge: "POPULAR",
    iconColor: "#10b981",
    icon: "🧾",
  },
  {
    id: "study",
    name: "Study Guide + Quiz",
    description: "Study guides, flashcards with 3D flip, and practice quizzes",
    route: "/ai-tools/study",
    tier: "free",
    hasUpload: true,
    badge: "NEW",
    iconColor: "#e8a838",
    icon: "🎓",
  },
  {
    id: "presentation",
    name: "Presentation Builder",
    description: "Full slide decks from any topic with 7 layout types",
    route: "/ai-tools/presentation",
    tier: "starter",
    hasUpload: true,
    badge: null,
    iconColor: "#ff6b6b",
    icon: "📊",
  },
  {
    id: "resume",
    name: "Resume Builder",
    description: "ATS-optimized resumes with live scoring and cover letters",
    route: "/ai-tools/resume",
    tier: "starter",
    hasUpload: true,
    badge: "POPULAR",
    iconColor: "#a8e63d",
    icon: "🧑‍💼",
  },
];
