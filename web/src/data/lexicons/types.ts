// src/data/lexicons/types.ts — Linguistic Lexicon Contract for Ishara
// Defines the neutral 20-sign gloss contract and per-language translation metadata.

export type SupportedLocale = 'en' | 'hi' | 'bn' | 'mr' | 'ta' | 'te' | 'gu' | 'kn' | 'ml' | 'pa';

export interface GlossLexiconEntry {
  gloss: string;          // Upper-case Gloss ID, e.g. "HELLO"
  main: string;           // Main spoken and written form, e.g. "नमस्ते"
  alternatives: string[]; // At least 4 alternative input forms (synonyms, polite/casual, inflections, spellings)
  romanized: string[];    // Latin-letter transliterated forms, e.g. ["namaste", "namaskar"]
}

export interface PhraseRule {
  phrase: string;         // Input phrase in native script or romanized
  glosses: string[];      // Target sequence of glosses, e.g. ["HELLO", "HOW_ARE_YOU"]
}

export interface LanguageLexicon {
  locale: SupportedLocale;
  languageName: string;
  nativeName: string;
  voiceCode: string;
  script: string;
  annotation: string;     // e.g. "Needs review by a native speaker"
  punctuation: {
    sentenceEnd: string;  // "।" for Devanagari/Bengali/Gurmukhi, "." for others
    questionEnd: string;  // "?"
  };
  glosses: Record<string, GlossLexiconEntry>;
  phraseRules: PhraseRule[];
  grammarWords: Record<string, string>;
  sentenceTemplates: Record<string, string>;
}
