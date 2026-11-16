// src/ml/sentenceBuilder.ts — Multilingual Sign-to-Text Grammar & Sentence Builder
// Maps recognized sign sequences to natural language across all 10 supported Indian languages,
// backed by language-neutral 20-word gloss vocabulary and linguistic lexicons.

import { getLoadedLexicon, SupportedLocale } from '../data/lexicons';

export interface SentenceTranslationResult {
  rawGlosses: string[];
  cleanGlosses: string[];
  distinctGlosses: string[];
  language: 'ISL' | 'ASL';
  glossDisplay: string;
  naturalSentence: string;
  englishSentence: string;
  targetLocale: string;
  ruleApplied: string;
}

// 20 Target Vocabulary Words Set
export const VALID_GLOSS_SET = new Set([
  'HELLO',
  'THANK_YOU',
  'PLEASE',
  'SORRY',
  'YES',
  'NO',
  'GOODBYE',
  'GOOD',
  'BAD',
  'HOW_ARE_YOU',
  'HELP',
  'STOP',
  'EAT',
  'DRINK',
  'WATER',
  'FOOD',
  'HOME',
  'FRIEND',
  'NAME',
  'LOVE',
]);

// Strip language prefixes like "ISL_" or "ASL_" and filter out raw "ISL" or "ASL" tokens
export function normalizeGloss(gloss: string): string {
  if (!gloss) return '';
  const trimmed = gloss.trim().toUpperCase();
  if (trimmed === 'ISL' || trimmed === 'ASL') {
    return '';
  }
  const stripped = trimmed.replace(/^(ISL_|ASL_)/, '').trim();
  if (stripped === 'ISL' || stripped === 'ASL') {
    return '';
  }
  return stripped;
}

// Extract language indicator from gloss
export function extractLanguage(gloss: string, fallback: 'ISL' | 'ASL' = 'ISL'): 'ISL' | 'ASL' {
  if (gloss.startsWith('ASL_')) return 'ASL';
  if (gloss.startsWith('ISL_')) return 'ISL';
  return fallback;
}

// Convert gloss ID to human readable word in chosen locale (defaults to English)
export function glossToWord(gloss: string, locale: string = 'en'): string {
  const norm = normalizeGloss(gloss);
  if (!norm) return '';
  const lex = getLoadedLexicon(locale as SupportedLocale);
  if (lex.glosses && lex.glosses[norm]?.main) {
    return lex.glosses[norm].main;
  }
  const enLex = getLoadedLexicon('en');
  return enLex.glosses[norm]?.main || norm.toLowerCase().replace(/_/g, ' ');
}

/**
 * Builds a natural sentence from recognized sign language glosses for all 10 supported languages.
 * Provides both the primary sentence in `targetLocale` and the `englishSentence` reference.
 */
export function buildSentenceFromGlosses(
  glosses: string[],
  activeLanguage: 'ISL' | 'ASL' = 'ISL',
  targetLocale: string = 'en'
): SentenceTranslationResult {
  if (!glosses || glosses.length === 0) {
    return {
      rawGlosses: [],
      cleanGlosses: [],
      distinctGlosses: [],
      language: activeLanguage,
      glossDisplay: '',
      naturalSentence: '',
      englishSentence: '',
      targetLocale,
      ruleApplied: 'empty',
    };
  }

  const rawGlosses = [...glosses];
  const detectedLanguage: 'ISL' | 'ASL' = rawGlosses.some((g) => g.startsWith('ASL_'))
    ? 'ASL'
    : activeLanguage;

  // Clean, normalize, and restrict strictly to valid 20 words
  const cleanGlosses = rawGlosses
    .map(normalizeGloss)
    .filter((g) => g && VALID_GLOSS_SET.has(g));

  if (cleanGlosses.length === 0) {
    return {
      rawGlosses,
      cleanGlosses: [],
      distinctGlosses: [],
      language: detectedLanguage,
      glossDisplay: '',
      naturalSentence: '',
      englishSentence: '',
      targetLocale,
      ruleApplied: 'none_valid',
    };
  }

  // Consecutive deduplication: collapse adjacent repeated identical glosses
  const distinctGlosses: string[] = [];
  for (const g of cleanGlosses) {
    if (distinctGlosses.length === 0 || distinctGlosses[distinctGlosses.length - 1] !== g) {
      distinctGlosses.push(g);
    }
  }

  const glossDisplay = distinctGlosses.join(' • ');
  const distinctKey = distinctGlosses.join(' ');
  const fullKey = cleanGlosses.join(' ');

  // 1. Build English sentence first (as reference)
  const enLex = getLoadedLexicon('en');
  let englishSentence =
    enLex.sentenceTemplates[distinctKey] ||
    enLex.sentenceTemplates[fullKey] ||
    '';

  if (!englishSentence) {
    const enWords = distinctGlosses.map((g) => glossToWord(g, 'en')).filter(Boolean);
    englishSentence = enWords.join(' ');
    if (englishSentence.length > 0) {
      englishSentence = englishSentence.charAt(0).toUpperCase() + englishSentence.slice(1);
      if (!englishSentence.endsWith('.') && !englishSentence.endsWith('!') && !englishSentence.endsWith('?')) {
        englishSentence += '.';
      }
    }
  }

  // 2. Build target locale sentence
  const targetLex = getLoadedLexicon(targetLocale as SupportedLocale);
  let naturalSentence = '';
  let ruleApplied = 'synthesized_fallback';

  if (targetLex.sentenceTemplates[distinctKey]) {
    naturalSentence = targetLex.sentenceTemplates[distinctKey];
    ruleApplied = `lexicon_template_${targetLex.locale}`;
  } else if (targetLex.sentenceTemplates[fullKey]) {
    naturalSentence = targetLex.sentenceTemplates[fullKey];
    ruleApplied = `lexicon_template_${targetLex.locale}`;
  } else if (targetLocale === 'en') {
    naturalSentence = englishSentence;
    ruleApplied = 'english_rule';
  } else {
    // Synthesize grammatically from the target lexicon's word stems
    const words = distinctGlosses.map((g) => {
      return targetLex.glosses[g]?.main || glossToWord(g, 'en');
    }).filter(Boolean);

    naturalSentence = words.join(' ');
    if (naturalSentence.length > 0) {
      const endPunct = targetLex.punctuation?.sentenceEnd || '.';
      if (!naturalSentence.endsWith(endPunct) && !naturalSentence.endsWith('!') && !naturalSentence.endsWith('?')) {
        naturalSentence += endPunct;
      }
    }
  }

  return {
    rawGlosses,
    cleanGlosses,
    distinctGlosses,
    language: detectedLanguage,
    glossDisplay,
    naturalSentence,
    englishSentence,
    targetLocale,
    ruleApplied,
  };
}
