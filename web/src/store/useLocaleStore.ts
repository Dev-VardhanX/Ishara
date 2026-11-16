import { create } from 'zustand';
import enTranslations from '../locales/en.json';
import { loadLexicon } from '../data/lexicons';

export type AppLocale = 'en' | 'hi' | 'bn' | 'mr' | 'ta' | 'te' | 'gu' | 'kn' | 'ml' | 'pa';

export interface LocaleMeta {
  code: AppLocale;
  name: string;
  nativeName: string;
  voiceCode: string;
  script: string;
}

export const SUPPORTED_LOCALES: LocaleMeta[] = [
  { code: 'en', name: 'English', nativeName: 'English', voiceCode: 'en-IN', script: 'Latin' },
  { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', voiceCode: 'hi-IN', script: 'Devanagari' },
  { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', voiceCode: 'bn-IN', script: 'Bengali' },
  { code: 'mr', name: 'Marathi', nativeName: 'मराठी', voiceCode: 'mr-IN', script: 'Devanagari' },
  { code: 'ta', name: 'Tamil', nativeName: 'தமிழ்', voiceCode: 'ta-IN', script: 'Tamil' },
  { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', voiceCode: 'te-IN', script: 'Telugu' },
  { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', voiceCode: 'gu-IN', script: 'Gujarati' },
  { code: 'kn', name: 'Kannada', nativeName: 'ಕನ್ನಡ', voiceCode: 'kn-IN', script: 'Kannada' },
  { code: 'ml', name: 'Malayalam', nativeName: 'മലയാളം', voiceCode: 'ml-IN', script: 'Malayalam' },
  { code: 'pa', name: 'Punjabi', nativeName: 'ਪੰਜਾਬੀ', voiceCode: 'pa-IN', script: 'Gurmukhi' },
];

// Lazy-load loaders map so each language is split into a separate bundle chunk
const localeLoaders: Record<AppLocale, () => Promise<{ default: Record<string, any> }>> = {
  en: () => Promise.resolve({ default: enTranslations }),
  hi: () => import('../locales/hi.json'),
  bn: () => import('../locales/bn.json'),
  mr: () => import('../locales/mr.json'),
  ta: () => import('../locales/ta.json'),
  te: () => import('../locales/te.json'),
  gu: () => import('../locales/gu.json'),
  kn: () => import('../locales/kn.json'),
  ml: () => import('../locales/ml.json'),
  pa: () => import('../locales/pa.json'),
};

// In-memory cache of loaded locale dictionaries
const loadedTranslations: Record<string, Record<string, any>> = {
  en: enTranslations,
};

const STORAGE_KEY = 'ishara_app_locale';
const TRANSLATION_LOCALE_STORAGE_KEY = 'ishara_translation_locale';
const SUBTITLE_STORAGE_KEY = 'ishara_show_english_subtitle';

// Helper to access nested keys like 'nav.dashboard'
function getNestedValue(obj: any, path: string): any {
  if (!obj) return undefined;
  const parts = path.split('.');
  let current = obj;
  for (const part of parts) {
    if (current && typeof current === 'object' && part in current) {
      current = current[part];
    } else {
      return undefined;
    }
  }
  return current;
}

export interface LocaleState {
  locale: AppLocale;
  voiceCode: string;
  translationLocale: AppLocale;
  translationVoiceCode: string;
  showEnglishSubtitle: boolean;
  loading: boolean;
  setLocale: (locale: AppLocale) => Promise<void>;
  setTranslationLocale: (locale: AppLocale) => Promise<void>;
  setShowEnglishSubtitle: (show: boolean) => void;
  t: (key: string, params?: Record<string, string | number>) => string;
  formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions) => string;
  formatNumber: (num: number, options?: Intl.NumberFormatOptions) => string;
}

const getInitialLocale = (): AppLocale => {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(STORAGE_KEY) as AppLocale;
  if (saved && SUPPORTED_LOCALES.some((l) => l.code === saved)) {
    return saved;
  }
  return 'en';
};

const getInitialTranslationLocale = (interfaceLoc: AppLocale): AppLocale => {
  if (typeof window === 'undefined') return interfaceLoc;
  const saved = localStorage.getItem(TRANSLATION_LOCALE_STORAGE_KEY) as AppLocale;
  if (saved && SUPPORTED_LOCALES.some((l) => l.code === saved)) {
    return saved;
  }
  return interfaceLoc;
};

const getInitialSubtitlePreference = (): boolean => {
  if (typeof window === 'undefined') return true;
  const saved = localStorage.getItem(SUBTITLE_STORAGE_KEY);
  return saved !== null ? saved === 'true' : true;
};

export const useLocaleStore = create<LocaleState>((set, get) => {
  const initial = getInitialLocale();
  const initialTransLocale = getInitialTranslationLocale(initial);
  const initialSubtitles = getInitialSubtitlePreference();

  // Set document lang attribute on startup
  if (typeof document !== 'undefined') {
    document.documentElement.lang = initial;
  }

  // Pre-fetch initial non-en locale & lexicon
  if (initial !== 'en') {
    localeLoaders[initial]()
      .then((mod) => {
        loadedTranslations[initial] = mod.default || mod;
        set({ loading: false });
      })
      .catch((err) => {
        console.warn('Failed to load initial locale:', err);
      });
  }
  loadLexicon(initialTransLocale).catch(() => {});

  return {
    locale: initial,
    voiceCode: SUPPORTED_LOCALES.find((l) => l.code === initial)?.voiceCode || 'en-IN',
    translationLocale: initialTransLocale,
    translationVoiceCode:
      SUPPORTED_LOCALES.find((l) => l.code === initialTransLocale)?.voiceCode || 'en-IN',
    showEnglishSubtitle: initialSubtitles,
    loading: false,

    setLocale: async (newLocale: AppLocale) => {
      if (newLocale === get().locale && loadedTranslations[newLocale]) {
        return;
      }

      set({ loading: true });

      try {
        if (!loadedTranslations[newLocale]) {
          const mod = await localeLoaders[newLocale]();
          loadedTranslations[newLocale] = mod.default || mod;
        }

        if (typeof window !== 'undefined') {
          localStorage.setItem(STORAGE_KEY, newLocale);
          document.documentElement.lang = newLocale;
        }

        const meta = SUPPORTED_LOCALES.find((l) => l.code === newLocale);
        const currentTrans = get().translationLocale;
        // If user hasn't explicitly set a custom translation locale, follow interface locale
        const savedExplicit =
          typeof window !== 'undefined'
            ? localStorage.getItem(TRANSLATION_LOCALE_STORAGE_KEY)
            : null;
        const nextTrans = savedExplicit ? currentTrans : newLocale;
        const nextTransMeta = SUPPORTED_LOCALES.find((l) => l.code === nextTrans);

        loadLexicon(nextTrans).catch(() => {});

        set({
          locale: newLocale,
          voiceCode: meta?.voiceCode || 'en-IN',
          translationLocale: nextTrans,
          translationVoiceCode: nextTransMeta?.voiceCode || meta?.voiceCode || 'en-IN',
          loading: false,
        });
      } catch (err) {
        console.error(`Failed to load locale '${newLocale}':`, err);
        set({ loading: false });
      }
    },

    setTranslationLocale: async (newLocale: AppLocale) => {
      try {
        await loadLexicon(newLocale);
        if (typeof window !== 'undefined') {
          localStorage.setItem(TRANSLATION_LOCALE_STORAGE_KEY, newLocale);
        }
        const meta = SUPPORTED_LOCALES.find((l) => l.code === newLocale);
        set({
          translationLocale: newLocale,
          translationVoiceCode: meta?.voiceCode || 'en-IN',
        });
      } catch (err) {
        console.error(`Failed to load lexicon for '${newLocale}':`, err);
      }
    },

    setShowEnglishSubtitle: (show: boolean) => {
      if (typeof window !== 'undefined') {
        localStorage.setItem(SUBTITLE_STORAGE_KEY, String(show));
      }
      set({ showEnglishSubtitle: show });
    },

    t: (key: string, params?: Record<string, string | number>): string => {
      const currentLocale = get().locale;
      const dict = loadedTranslations[currentLocale];
      let val = getNestedValue(dict, key);

      // Fallback to English dictionary if missing in current locale
      if (val === undefined && currentLocale !== 'en') {
        val = getNestedValue(enTranslations, key);
      }

      if (typeof val !== 'string') {
        return key;
      }

      // Parameter replacement: "Hello, {name}" -> "Hello, Ananya"
      if (params) {
        return Object.entries(params).reduce((str, [pKey, pVal]) => {
          return str.replace(new RegExp(`\\{${pKey}\\}`, 'g'), String(pVal));
        }, val);
      }

      return val;
    },

    formatDate: (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
      try {
        const d = typeof date === 'string' || typeof date === 'number' ? new Date(date) : date;
        return new Intl.DateTimeFormat(get().locale, options).format(d);
      } catch {
        return String(date);
      }
    },

    formatNumber: (num: number, options?: Intl.NumberFormatOptions): string => {
      try {
        return new Intl.NumberFormat(get().locale, options).format(num);
      } catch {
        return String(num);
      }
    },
  };
});

// Standalone non-hook translator for libraries / scripts
export const t = (key: string, params?: Record<string, string | number>): string => {
  return useLocaleStore.getState().t(key, params);
};

export const formatDate = (date: Date | string | number, options?: Intl.DateTimeFormatOptions): string => {
  return useLocaleStore.getState().formatDate(date, options);
};

export const formatNumber = (num: number, options?: Intl.NumberFormatOptions): string => {
  return useLocaleStore.getState().formatNumber(num, options);
};
