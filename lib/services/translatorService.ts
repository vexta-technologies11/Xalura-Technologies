export interface Language {
  code: string;
  name: string;
  nativeName: string;
  flag: string;
  rtl: boolean;
}

export const LANGUAGES: Language[] = [
  { code: "en", name: "English", nativeName: "English", flag: "🇬🇧", rtl: false },
  { code: "es", name: "Spanish", nativeName: "Español", flag: "🇪🇸", rtl: false },
  { code: "fr", name: "French", nativeName: "Français", flag: "🇫🇷", rtl: false },
  { code: "de", name: "German", nativeName: "Deutsch", flag: "🇩🇪", rtl: false },
  { code: "it", name: "Italian", nativeName: "Italiano", flag: "🇮🇹", rtl: false },
  { code: "pt", name: "Portuguese", nativeName: "Português", flag: "🇵🇹", rtl: false },
  { code: "ru", name: "Russian", nativeName: "Русский", flag: "🇷🇺", rtl: false },
  { code: "ja", name: "Japanese", nativeName: "日本語", flag: "🇯🇵", rtl: false },
  { code: "ko", name: "Korean", nativeName: "한국어", flag: "🇰🇷", rtl: false },
  { code: "zh", name: "Chinese (Simplified)", nativeName: "简体中文", flag: "🇨🇳", rtl: false },
  { code: "ar", name: "Arabic", nativeName: "العربية", flag: "🇸🇦", rtl: true },
  { code: "he", name: "Hebrew", nativeName: "עברית", flag: "🇮🇱", rtl: true },
  { code: "hi", name: "Hindi", nativeName: "हिन्दी", flag: "🇮🇳", rtl: false },
  { code: "bn", name: "Bengali", nativeName: "বাংলা", flag: "🇧🇩", rtl: false },
  { code: "pa", name: "Punjabi", nativeName: "ਪੰਜਾਬੀ", flag: "🇮🇳", rtl: false },
  { code: "ta", name: "Tamil", nativeName: "தமிழ்", flag: "🇮🇳", rtl: false },
  { code: "te", name: "Telugu", nativeName: "తెలుగు", flag: "🇮🇳", rtl: false },
  { code: "th", name: "Thai", nativeName: "ไทย", flag: "🇹🇭", rtl: false },
  { code: "vi", name: "Vietnamese", nativeName: "Tiếng Việt", flag: "🇻🇳", rtl: false },
  { code: "nl", name: "Dutch", nativeName: "Nederlands", flag: "🇳🇱", rtl: false },
  { code: "pl", name: "Polish", nativeName: "Polski", flag: "🇵🇱", rtl: false },
  { code: "tr", name: "Turkish", nativeName: "Türkçe", flag: "🇹🇷", rtl: false },
  { code: "sv", name: "Swedish", nativeName: "Svenska", flag: "🇸🇪", rtl: false },
  { code: "da", name: "Danish", nativeName: "Dansk", flag: "🇩🇰", rtl: false },
  { code: "fi", name: "Finnish", nativeName: "Suomi", flag: "🇫🇮", rtl: false },
  { code: "no", name: "Norwegian", nativeName: "Norsk", flag: "🇳🇴", rtl: false },
  { code: "cs", name: "Czech", nativeName: "Čeština", flag: "🇨🇿", rtl: false },
  { code: "hu", name: "Hungarian", nativeName: "Magyar", flag: "🇭🇺", rtl: false },
  { code: "ro", name: "Romanian", nativeName: "Română", flag: "🇷🇴", rtl: false },
  { code: "el", name: "Greek", nativeName: "Ελληνικά", flag: "🇬🇷", rtl: false },
  { code: "uk", name: "Ukrainian", nativeName: "Українська", flag: "🇺🇦", rtl: false },
];

export interface TranslationOptions {
  formality: "formal" | "informal";
  preserveFormatting: boolean;
}

export interface TranslationResult {
  translated: string;
  detectedLanguage?: string;
}

export async function translateText(
  text: string,
  from: string | "auto",
  to: string,
  options: TranslationOptions,
): Promise<TranslationResult> {
  const res = await fetch("/api/tools/translator", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ params: { text, from, to, ...options } }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error || "Translation failed");
  const parsed = JSON.parse(json.text);
  return {
    translated: parsed.translated,
    detectedLanguage: parsed.detectedLanguage ?? undefined,
  };
}

export async function detectLanguage(text: string): Promise<string> {
  // Client-side heuristic fallback — try the API but fall back to simple detection
  try {
    const res = await fetch("/api/tools/translator", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        params: { text, from: "auto", to: "en", formality: "informal", preserveFormatting: false },
      }),
    });
    const json = await res.json();
    if (json.ok) {
      const parsed = JSON.parse(json.text);
      if (parsed.detectedLanguage) return parsed.detectedLanguage;
    }
  } catch {
    // fall through
  }
  // Basic heuristic
  const latinChars = (text.match(/[a-zA-Z]/g) || []).length;
  return latinChars > text.length * 0.5 ? "en" : "auto";
}
