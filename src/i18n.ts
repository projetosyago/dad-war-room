import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import en from './locales/en.json'
import pt from './locales/pt.json'
import es from './locales/es.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import ru from './locales/ru.json'
import tr from './locales/tr.json'
import ar from './locales/ar.json'
import zh from './locales/zh.json'
import ko from './locales/ko.json'
import ja from './locales/ja.json'

export const LANGUAGE_STORAGE_KEY = 'dad-war-room.lang'

/** Languages we ship today. EN is the universal fallback. */
export const SUPPORTED_LANGUAGES = [
  'en', 'pt', 'es', 'fr', 'de', 'ru', 'tr', 'ar', 'zh', 'ko', 'ja',
] as const

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      pt: { translation: pt },
      es: { translation: es },
      fr: { translation: fr },
      de: { translation: de },
      ru: { translation: ru },
      tr: { translation: tr },
      ar: { translation: ar },
      zh: { translation: zh },
      ko: { translation: ko },
      ja: { translation: ja },
    },
    fallbackLng: 'en',
    supportedLngs: [...SUPPORTED_LANGUAGES],
    interpolation: { escapeValue: false },
    // English is the universal default. Once a user picks a language from
    // the selector, the choice is cached in localStorage and survives across
    // sessions (including a PWA install).
    detection: {
      order: ['localStorage', 'htmlTag'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
    returnNull: false,
  })

// Flip <html dir> for RTL languages so layouts mirror automatically.
const RTL_LANGS = new Set<string>(['ar'])
function syncHtmlDir(lng: string | undefined): void {
  if (typeof document === 'undefined') return
  document.documentElement.lang = lng ?? 'en'
  document.documentElement.dir = lng && RTL_LANGS.has(lng) ? 'rtl' : 'ltr'
}
syncHtmlDir(i18n.language)
i18n.on('languageChanged', syncHtmlDir)

export default i18n
