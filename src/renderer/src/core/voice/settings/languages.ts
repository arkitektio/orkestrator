/**
 * The languages offered in settings. Whisper knows 99; this is the short
 * list a lab is likely to speak, plus "auto". Codes are ISO-639-1, which is
 * what sherpa-onnx's whisper config takes and what the Parakeet catalog
 * entry lists.
 */
export type VoiceLanguage = { code: string; label: string };

export const AUTO_LANGUAGE = "auto";

export const VOICE_LANGUAGES: readonly VoiceLanguage[] = [
  { code: AUTO_LANGUAGE, label: "Detect automatically" },
  { code: "en", label: "English" },
  { code: "de", label: "Deutsch" },
  { code: "fr", label: "Français" },
  { code: "es", label: "Español" },
  { code: "it", label: "Italiano" },
  { code: "nl", label: "Nederlands" },
  { code: "pt", label: "Português" },
  { code: "pl", label: "Polski" },
  { code: "sv", label: "Svenska" },
  { code: "da", label: "Dansk" },
  { code: "no", label: "Norsk" },
  { code: "fi", label: "Suomi" },
  { code: "cs", label: "Čeština" },
  { code: "hu", label: "Magyar" },
  { code: "el", label: "Ελληνικά" },
  { code: "ru", label: "Русский" },
  { code: "uk", label: "Українська" },
  { code: "tr", label: "Türkçe" },
  { code: "ar", label: "العربية" },
  { code: "hi", label: "हिन्दी" },
  { code: "ja", label: "日本語" },
  { code: "ko", label: "한국어" },
  { code: "zh", label: "中文" },
];

/** Same rule as `modelSupportsLanguage` in the main catalog, for the picker. */
export const languageFitsModel = (
  model: { languages: "multi" | readonly string[] },
  language: string,
): boolean =>
  model.languages === "multi" || language === AUTO_LANGUAGE || model.languages.includes(language);
