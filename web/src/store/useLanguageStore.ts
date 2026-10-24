import { create } from 'zustand';
import { persist } from 'zustand/middleware';

export type SignLanguage = 'ISL' | 'ASL';

interface LanguageState {
  language: SignLanguage;
  setLanguage: (lang: SignLanguage) => void;
  toggleLanguage: () => void;
  hasAslSupport: (featureId: 'sign-to-voice' | 'voice-to-sign' | 'learn' | 'history' | 'dashboard') => boolean;
}

export const useLanguageStore = create<LanguageState>()(
  persist(
    (set, get) => ({
      language: 'ISL',
      setLanguage: (language: SignLanguage) => set({ language }),
      toggleLanguage: () =>
        set((state) => ({ language: state.language === 'ISL' ? 'ASL' : 'ISL' })),
      // ASL data availability flags based on Hackathon Roadmap (ISL has full v1 data, ASL is Phase 4)
      hasAslSupport: (featureId) => {
        if (get().language === 'ISL') return true;
        // In ASL mode:
        switch (featureId) {
          case 'dashboard':
          case 'history':
            return true; // General framework works
          case 'voice-to-sign':
            return true; // Basic greetings preview available
          case 'sign-to-voice':
          case 'learn':
          default:
            return false; // Vision classifier & full lessons are Phase 4
        }
      },
    }),
    {
      name: 'ishara-language-storage',
    }
  )
);
