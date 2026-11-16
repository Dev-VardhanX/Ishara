// src/lib/textToGloss.ts — Multilingual Text to Sign Language Gloss Parsing Engine
// Normalizes natural speech/text into standard UPPERCASE_UNDERSCORE Gloss IDs across 10 Indian languages.
// Includes rule-based ISL grammatical reordering (SOV order, question words at end,
// dropping copulas and articles) while keeping ASL ordering intact.
// Supports Unicode script detection, nukta/chandrabindu normalisation, romanized transliteration,
// typo tolerance (1-edit distance for 4+ chars), and optional on-device Chrome translation.

import {
  getLoadedLexicon,
  detectScriptAndLocale,
  normalizeLinguisticText,
  levenshteinDistance,
  SupportedLocale,
} from '../data/lexicons';

export interface GlossToken {
  originalText: string;
  gloss: string | null;
  displayText: string;
  hasSign: boolean;
  isFingerspelled?: boolean;
  isTranslatedOnDevice?: boolean;
}

export interface TextToGlossDetails {
  tokens: GlossToken[];
  englishOrderText: string;
  islOrderText: string;
  reordered: boolean;
  detectedScript?: string;
  detectedLocale?: string;
  translatedOnDevice?: boolean;
}

/**
 * Normalizes text by lowercasing and stripping punctuation, preserving all Unicode letters
 */
export const normalizeText = (text: string): string => {
  return normalizeLinguisticText(text);
};

// Grammar stop words and copulas to drop in sign glossing across languages
const ARTICLES_AND_COPULAS = new Set([
  // English
  'a', 'an', 'the', 'is', 'are', 'am', 'was', 'were', 'be', 'been', 'being', 'to', 'of', 'in', 'at',
  // Hindi / Devanagari
  'है', 'हैं', 'हूँ', 'हो', 'था', 'थी', 'थे', 'का', 'की', 'के', 'में', 'पर', 'को', 'से',
  // Bengali
  'হয়', 'আছেন', 'আছি', 'হলো', 'ছিল', 'এর', 'তে',
  // Marathi
  'आहे', 'आहेत', 'होता', 'होती', 'होते', 'च्या', 'ला',
  // Tamil
  'உள்ளது', 'இருக்கின்றன', 'இருக்கிறார்', 'இருந்தது', 'இல்',
  // Telugu
  'ఉంది', 'ఉన్నారు', 'ఉన్నాడు', 'ఉన్నది', 'లోని',
  // Gujarati
  'છે', 'છો', 'હતા', 'હતી', 'નું', 'માં',
  // Kannada
  'ಇದೆ', 'ಇದ್ದಾರೆ', 'ಇತ್ತು', 'ಅಲ್ಲಿ', 'ರ',
  // Malayalam
  'ആണ്', 'ആകുന്നു', 'ഉണ്ടായിരുന്നു', 'ൽ',
  // Punjabi
  'ਹੈ', 'ਹਨ', 'ਸੀ', 'ਸਨ', 'ਦਾ', 'ਦੀ', 'ਦੇ', 'ਵਿੱਚ',
]);

const QUESTION_GLOSSES = new Set(['HOW_ARE_YOU', 'NAME', 'HELP']);
const VERB_GLOSSES = new Set(['EAT', 'DRINK', 'STOP', 'HELP', 'LOVE']);
const OBJECT_NOUN_GLOSSES = new Set(['WATER', 'FOOD', 'HOME', 'FRIEND']);

/**
 * Reorders an array of gloss tokens into ISL grammatical order:
 * 1. Drop articles and forms of "to be".
 * 2. Object before Verb (Subject-Object-Verb / SOV).
 * 3. Question words moved to the end of the sentence.
 */
export function reorderGlossTokensToISL(tokens: GlossToken[]): GlossToken[] {
  if (tokens.length <= 1) return [...tokens];

  const working = [...tokens];

  // 1. Separate question words (WH-words must move to the end in ISL)
  const nonQuestions: GlossToken[] = [];
  const questions: GlossToken[] = [];

  for (const token of working) {
    if (token.gloss && QUESTION_GLOSSES.has(token.gloss)) {
      questions.push(token);
    } else {
      nonQuestions.push(token);
    }
  }

  // 2. SOV Reordering: If verb appears before an object noun, place object before verb
  // e.g. [EAT, FOOD] -> [FOOD, EAT]; [DRINK, WATER] -> [WATER, DRINK]
  const reorderedClause = [...nonQuestions];
  for (let i = 0; i < reorderedClause.length - 1; i++) {
    const curr = reorderedClause[i];
    const next = reorderedClause[i + 1];

    if (
      curr.gloss &&
      VERB_GLOSSES.has(curr.gloss) &&
      next.gloss &&
      OBJECT_NOUN_GLOSSES.has(next.gloss)
    ) {
      // Swap verb and object
      reorderedClause[i] = next;
      reorderedClause[i + 1] = curr;
      i++; // step forward
    }
  }

  // 3. Question words placed at the end
  return [...reorderedClause, ...questions];
}

/**
 * Matches a single word token against a language lexicon.
 * Tries:
 * 1. Main spoken form
 * 2. Alternative forms (synonyms, polite/casual, inflections)
 * 3. Romanized forms
 * 4. Typo tolerance (Levenshtein distance <= 1 for 4+ letter words)
 */
function matchWordInLexicon(
  token: string,
  locale: string
): { gloss: string; exact: boolean } | null {
  const normToken = token.trim();
  if (!normToken) return null;

  const lex = getLoadedLexicon(locale);
  if (!lex || !lex.glosses) return null;

  // 1. Exact match on main, alternatives, or romanized
  for (const [glossId, entry] of Object.entries(lex.glosses)) {
    if (normalizeLinguisticText(entry.main) === normToken) {
      return { gloss: glossId, exact: true };
    }
    if (entry.alternatives?.some((alt) => normalizeLinguisticText(alt) === normToken)) {
      return { gloss: glossId, exact: true };
    }
    if (entry.romanized?.some((rom) => normalizeLinguisticText(rom) === normToken)) {
      return { gloss: glossId, exact: true };
    }
  }

  // 2. Typo tolerance: 1 character difference for words with 4+ characters
  if (normToken.length >= 4) {
    for (const [glossId, entry] of Object.entries(lex.glosses)) {
      const candidates = [
        normalizeLinguisticText(entry.main),
        ...(entry.alternatives || []).map(normalizeLinguisticText),
        ...(entry.romanized || []).map(normalizeLinguisticText),
      ];

      for (const cand of candidates) {
        if (cand && Math.abs(cand.length - normToken.length) <= 1) {
          if (levenshteinDistance(normToken, cand) <= 1) {
            return { gloss: glossId, exact: false };
          }
        }
      }
    }
  }

  return null;
}

/**
 * Parses plain text input into sequential gloss tokens.
 * Inspects phrase rules first, then individual word tokens with typo tolerance and fallback.
 */
function parseTokensInternal(
  inputText: string,
  targetLocale: string = 'en'
): { tokens: GlossToken[]; detectedLocale?: string; detectedScript?: string } {
  const rawTrimmed = inputText.trim();
  if (!rawTrimmed) return { tokens: [] };

  const { script, detectedLocale } = detectScriptAndLocale(rawTrimmed);
  const effectiveLocale =
    targetLocale && (targetLocale === 'mr' || targetLocale === 'hi') && script === 'Devanagari'
      ? targetLocale
      : (detectedLocale && detectedLocale !== 'en' ? detectedLocale : targetLocale) || 'en';

  const normalizedInput = normalizeLinguisticText(rawTrimmed);
  const lex = getLoadedLexicon(effectiveLocale);
  const enLex = getLoadedLexicon('en');

  // Check phrase rules first (longest match priority)
  const allPhraseRules = [
    ...(lex.phraseRules || []),
    ...(effectiveLocale !== 'en' ? enLex.phraseRules || [] : []),
  ];

  // Try entire input exact phrase match
  for (const rule of allPhraseRules) {
    if (normalizeLinguisticText(rule.phrase) === normalizedInput) {
      const tokens: GlossToken[] = rule.glosses.map((gloss) => ({
        originalText: rawTrimmed,
        gloss,
        displayText: gloss,
        hasSign: true,
      }));
      return { tokens, detectedLocale: effectiveLocale, detectedScript: script };
    }
  }

  // Tokenize words
  const rawWords = rawTrimmed.split(/\s+/);
  const tokens: GlossToken[] = [];
  let i = 0;

  while (i < rawWords.length) {
    // Check 3-word and 2-word phrase chunks
    let matchedChunk = false;
    for (const chunkSize of [3, 2]) {
      if (i + chunkSize <= rawWords.length) {
        const chunkWords = rawWords.slice(i, i + chunkSize);
        const chunkNorm = normalizeLinguisticText(chunkWords.join(' '));

        for (const rule of allPhraseRules) {
          if (normalizeLinguisticText(rule.phrase) === chunkNorm) {
            for (const gloss of rule.glosses) {
              tokens.push({
                originalText: chunkWords.join(' '),
                gloss,
                displayText: gloss,
                hasSign: true,
              });
            }
            i += chunkSize;
            matchedChunk = true;
            break;
          }
        }
        if (matchedChunk) break;
      }
    }

    if (matchedChunk) continue;

    const rawWord = rawWords[i];
    const normWord = normalizeLinguisticText(rawWord);

    if (!normWord) {
      i++;
      continue;
    }

    // Drop copulas and grammatical articles
    if (ARTICLES_AND_COPULAS.has(normWord)) {
      i++;
      continue;
    }

    // 1. Try effective locale lexicon
    let match = matchWordInLexicon(normWord, effectiveLocale);

    // 2. If not found and not English, check English lexicon
    if (!match && effectiveLocale !== 'en') {
      match = matchWordInLexicon(normWord, 'en');
    }

    // 3. If still not found and Devanagari, cross-check Hindi / Marathi
    if (!match && script === 'Devanagari') {
      match = matchWordInLexicon(normWord, effectiveLocale === 'hi' ? 'mr' : 'hi');
    }

    if (match) {
      tokens.push({
        originalText: rawWord,
        gloss: match.gloss,
        displayText: match.gloss,
        hasSign: true,
      });
    } else {
      // Fingerspelling fallback for names/unrecognized Latin words
      if (normWord.length <= 8 && /^[a-z]+$/.test(normWord)) {
        for (const letter of normWord.toUpperCase()) {
          tokens.push({
            originalText: letter,
            gloss: letter,
            displayText: letter,
            hasSign: true,
            isFingerspelled: true,
          });
        }
      } else {
        // Required contract: show "<word> (not in vocabulary yet)" and never guess
        tokens.push({
          originalText: rawWord,
          gloss: null,
          displayText: `${rawWord} (not in vocabulary yet)`,
          hasSign: false,
        });
      }
    }

    i++;
  }

  return { tokens, detectedLocale: effectiveLocale, detectedScript: script };
}

/**
 * Public parser: converts natural language input string into ordered gloss tokens.
 */
export function parseTextToGlosses(
  text: string,
  language: 'ISL' | 'ASL' = 'ISL',
  targetLocale: string = 'en'
): GlossToken[] {
  const { tokens } = parseTokensInternal(text, targetLocale);
  return language === 'ISL' ? reorderGlossTokensToISL(tokens) : tokens;
}

/**
 * Returns full parse details including English and ISL order comparisons.
 */
export function getTextToGlossDetails(
  inputText: string,
  language: 'ISL' | 'ASL' = 'ISL',
  targetLocale: string = 'en'
): TextToGlossDetails {
  if (!inputText || !inputText.trim()) {
    return {
      tokens: [],
      englishOrderText: '',
      islOrderText: '',
      reordered: false,
    };
  }

  const { tokens, detectedLocale, detectedScript } = parseTokensInternal(inputText, targetLocale);

  const englishOrderTokens = [...tokens];
  const islOrderTokens = reorderGlossTokensToISL(tokens);

  const englishOrderText = englishOrderTokens
    .map((t) => t.gloss || `[${t.originalText}]`)
    .join(' ');
  const islOrderText = islOrderTokens
    .map((t) => t.gloss || `[${t.originalText}]`)
    .join(' ');

  const reordered = language === 'ISL' && englishOrderText !== islOrderText;
  const finalTokens = language === 'ISL' ? islOrderTokens : englishOrderTokens;

  return {
    tokens: finalTokens,
    englishOrderText,
    islOrderText,
    reordered,
    detectedScript,
    detectedLocale,
  };
}
