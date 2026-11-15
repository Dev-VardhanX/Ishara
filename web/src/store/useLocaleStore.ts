import { create } from 'zustand';
import enTranslations from '../locales/en.json';

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

interface LocaleState {
  locale: AppLocale;
  voiceCode: string;
  loading: boolean;
  setLocale: (locale: AppLocale) => Promise<void>;
  t: (key: string, params?: Record<string, string | number>) => string;
}

const getInitialLocale = (): AppLocale => {
  if (typeof window === 'undefined') return 'en';
  const saved = localStorage.getItem(STORAGE_KEY) as AppLocale;
  if (saved && SUPPORTED_LOCALES.some((l) => l.code === saved)) {
    return saved;
  }
  return 'en';
};

export const useLocaleStore = create<LocaleState>((set, get) => {
  const initial = getInitialLocale();

  // Set document lang attribute on startup
  if (typeof document !== 'undefined') {
    document.documentElement.lang = initial;
  }

  // Pre-fetch initial non-en locale if needed
  if (initial !== 'en') {
    localeLoaders[initial]().then((mod) => {
      loadedTranslations[initial] = mod.default || mod;
      set({ loading: false });
    }).catch((err) => {
      console.warn('Failed to load initial locale:', err);
    });
  }

  return {
    locale: initial,
    voiceCode: SUPPORTED_LOCALES.find((l) => l.code === initial)?.voiceCode || 'en-IN',
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
        set({
          locale: newLocale,
          voiceCode: meta?.voiceCode || 'en-IN',
          loading: false,
        });
      } catch (err) {
        console.error(`Failed to load locale '${newLocale}':`, err);
        set({ loading: false });
      }
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
  };
});

// Standalone non-hook translator for libraries / scripts
export const t = (key: string, params?: Record<string, string | number>): string => {
  return useLocaleStore.getState().t(key, params);
};
