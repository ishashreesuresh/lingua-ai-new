export type LanguageCode =
  | 'en'
  | 'ta'
  | 'hi'
  | 'ml'
  | 'te'
  | 'kn'
  | 'fr'
  | 'de'
  | 'es'
  | 'ja';

export type SourceLanguageCode = LanguageCode | 'auto';

export interface LanguageInfo {
  code: LanguageCode;
  name: string;
  nativeName: string;
  speechLocale: string;
}

export const SUPPORTED_LANGUAGES: Record<LanguageCode, LanguageInfo> = {
  en: {
    code: 'en',
    name: 'English',
    nativeName: 'English',
    speechLocale: 'en-US',
  },
  ta: {
    code: 'ta',
    name: 'Tamil',
    nativeName: 'தமிழ்',
    speechLocale: 'ta-IN',
  },
  hi: {
    code: 'hi',
    name: 'Hindi',
    nativeName: 'हिन्दी',
    speechLocale: 'hi-IN',
  },
  ml: {
    code: 'ml',
    name: 'Malayalam',
    nativeName: 'മലയാളം',
    speechLocale: 'ml-IN',
  },
  te: {
    code: 'te',
    name: 'Telugu',
    nativeName: 'తెలుగు',
    speechLocale: 'te-IN',
  },
  kn: {
    code: 'kn',
    name: 'Kannada',
    nativeName: 'ಕನ್ನಡ',
    speechLocale: 'kn-IN',
  },
  fr: {
    code: 'fr',
    name: 'French',
    nativeName: 'Français',
    speechLocale: 'fr-FR',
  },
  de: {
    code: 'de',
    name: 'German',
    nativeName: 'Deutsch',
    speechLocale: 'de-DE',
  },
  es: {
    code: 'es',
    name: 'Spanish',
    nativeName: 'Español',
    speechLocale: 'es-ES',
  },
  ja: {
    code: 'ja',
    name: 'Japanese',
    nativeName: '日本語',
    speechLocale: 'ja-JP',
  },
};

export const LANGUAGE_LIST = Object.values(SUPPORTED_LANGUAGES);

export const LANGUAGE_SCRIPT_LABELS: Record<LanguageCode, string> = {
  en: 'EN',
  ta: 'தமிழ்',
  hi: 'हिन्दी',
  ml: 'മലയാളം',
  te: 'తెలుగు',
  kn: 'ಕನ್ನಡ',
  fr: 'FR',
  de: 'DE',
  es: 'ES',
  ja: '日本語',
};

export type TranslationMode = 'Translate' | 'Formal' | 'Casual' | 'Professional' | 'Simple';

export interface HistoryItem {
  id: string;
  sourceLanguage: SourceLanguageCode;
  targetLanguage: LanguageCode;
  originalText: string;
  translatedText: string;
  timestamp: number;
  detectedLanguage?: LanguageCode;
}

export interface FavoriteItem {
  id: string;
  sourceLanguage: SourceLanguageCode;
  targetLanguage: LanguageCode;
  originalText: string;
  translatedText: string;
  timestamp: number;
}
