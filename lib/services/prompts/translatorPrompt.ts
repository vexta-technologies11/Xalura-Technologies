import type { TranslationOptions } from "@/lib/services/translatorService";

const LANGUAGES_JSON = `[
  {"code":"en","name":"English"},{"code":"es","name":"Spanish"},
  {"code":"fr","name":"French"},{"code":"de","name":"German"},
  {"code":"it","name":"Italian"},{"code":"pt","name":"Portuguese"},
  {"code":"ru","name":"Russian"},{"code":"ja","name":"Japanese"},
  {"code":"ko","name":"Korean"},{"code":"zh","name":"Chinese (Simplified)"},
  {"code":"ar","name":"Arabic","rtl":true},{"code":"he","name":"Hebrew","rtl":true},
  {"code":"hi","name":"Hindi"},{"code":"bn","name":"Bengali"},
  {"code":"pa","name":"Punjabi"},{"code":"ta","name":"Tamil"},
  {"code":"te","name":"Telugu"},{"code":"th","name":"Thai"},
  {"code":"vi","name":"Vietnamese"},{"code":"nl","name":"Dutch"},
  {"code":"pl","name":"Polish"},{"code":"tr","name":"Turkish"},
  {"code":"sv","name":"Swedish"},{"code":"da","name":"Danish"},
  {"code":"fi","name":"Finnish"},{"code":"no","name":"Norwegian"},
  {"code":"cs","name":"Czech"},{"code":"hu","name":"Hungarian"},
  {"code":"ro","name":"Romanian"},{"code":"el","name":"Greek"},
  {"code":"uk","name":"Ukrainian"}
]`;

export function buildTranslatePrompt(
  text: string,
  from: string,
  to: string,
  options: TranslationOptions,
): string {
  const langList = JSON.parse(LANGUAGES_JSON) as { code: string; name: string; rtl?: boolean }[];
  const targetLang = langList.find((l) => l.code === to)?.name || to;
  const sourceLang = langList.find((l) => l.code === from)?.name || from;

  return `You are a professional translator. Translate the following text.

SOURCE LANGUAGE: ${from === "auto" ? "Auto-detect" : sourceLang}
TARGET LANGUAGE: ${targetLang}
FORMALITY: ${options.formality} (formal or informal)
PRESERVE FORMATTING: ${options.formality === "formal" ? "Yes, keep original formatting" : "No, adapt naturally"}

TEXT TO TRANSLATE:
${text.slice(0, 10000)}

${
  from === "auto"
    ? `Also detect the source language code and include it as "detectedLanguage".`
    : ""
}

Return valid JSON only:
{
  "translated": "string (the translated text)",
  ${from === "auto" ? '"detectedLanguage": "string (language code, e.g. en)",' : ""}
  "detectedLanguage": ${from === "auto" ? '"string"' : "null"}
}`;
}
