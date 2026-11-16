// src/data/lexicons/index.ts — Central Lexicon Registry, Script Detector & Linguistic Normalizer
import { LanguageLexicon, SupportedLocale } from './types';
import enLexicon from './en.json';
import hiLexicon from './hi.json';
import bnLexicon from './bn.json';
import mrLexicon from './mr.json';
import taLexicon from './ta.json';
import teLexicon from './te.json';
import guLexicon from './gu.json';
import knLexicon from './kn.json';
import mlLexicon from './ml.json';
import paLexicon from './pa.json';

export * from './types';

// Pre-warmed in-memory cache of all 10 Indic lexicons for instantaneous zero-latency parsing
const loadedLexicons: Record<string, LanguageLexicon> = {
  en: enLexicon as unknown as LanguageLexicon,
  hi: hiLexicon as unknown as LanguageLexicon,
  bn: bnLexicon as unknown as LanguageLexicon,
  mr: mrLexicon as unknown as LanguageLexicon,
  ta: taLexicon as unknown as LanguageLexicon,
  te: teLexicon as unknown as LanguageLexicon,
  gu: guLexicon as unknown as LanguageLexicon,
  kn: knLexicon as unknown as LanguageLexicon,
  ml: mlLexicon as unknown as LanguageLexicon,
  pa: paLexicon as unknown as LanguageLexicon,
};

/**
 * Asynchronously load and cache a language lexicon
 */
export async function loadLexicon(locale: SupportedLocale | string): Promise<LanguageLexicon> {
  const norm = (locale || 'en').toLowerCase().split('-')[0] as SupportedLocale;
  return loadedLexicons[norm] || loadedLexicons.en;
}

/**
 * Synchronous getter: returns loaded lexicon if present, otherwise returns English baseline
 */
export function getLoadedLexicon(locale: SupportedLocale | string): LanguageLexicon {
  const norm = (locale || 'en').toLowerCase().split('-')[0] as SupportedLocale;
  return loadedLexicons[norm] || loadedLexicons.en;
}

/**
 * Detects the writing script of input text using Unicode code points.
 * Returns the script name and a detected primary locale.
 */
export function detectScriptAndLocale(text: string): { script: string; detectedLocale?: SupportedLocale } {
  if (!text) return { script: 'Unknown' };

  let devanagariCount = 0;
  let bengaliCount = 0;
  let gurmukhiCount = 0;
  let gujaratiCount = 0;
  let tamilCount = 0;
  let teluguCount = 0;
  let kannadaCount = 0;
  let malayalamCount = 0;
  let latinCount = 0;

  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code >= 0x0900 && code <= 0x097f) devanagariCount++;
    else if (code >= 0x0980 && code <= 0x09ff) bengaliCount++;
    else if (code >= 0x0a00 && code <= 0x0a7f) gurmukhiCount++;
    else if (code >= 0x0a80 && code <= 0x0aff) gujaratiCount++;
    else if (code >= 0x0b80 && code <= 0x0bff) tamilCount++;
    else if (code >= 0x0c00 && code <= 0x0c7f) teluguCount++;
    else if (code >= 0x0c80 && code <= 0x0cff) kannadaCount++;
    else if (code >= 0x0d00 && code <= 0x0d7f) malayalamCount++;
    else if ((code >= 0x0041 && code <= 0x005a) || (code >= 0x0061 && code <= 0x007a)) latinCount++;
  }

  const counts = [
    { script: 'Devanagari', count: devanagariCount, locale: 'hi' as SupportedLocale },
    { script: 'Bengali', count: bengaliCount, locale: 'bn' as SupportedLocale },
    { script: 'Gurmukhi', count: gurmukhiCount, locale: 'pa' as SupportedLocale },
    { script: 'Gujarati', count: gujaratiCount, locale: 'gu' as SupportedLocale },
    { script: 'Tamil', count: tamilCount, locale: 'ta' as SupportedLocale },
    { script: 'Telugu', count: teluguCount, locale: 'te' as SupportedLocale },
    { script: 'Kannada', count: kannadaCount, locale: 'kn' as SupportedLocale },
    { script: 'Malayalam', count: malayalamCount, locale: 'ml' as SupportedLocale },
    { script: 'Latin', count: latinCount, locale: 'en' as SupportedLocale },
  ];

  counts.sort((a, b) => b.count - a.count);
  const best = counts[0];
  if (best.count > 0) {
    return { script: best.script, detectedLocale: best.locale };
  }

  return { script: 'Unknown' };
}

/**
 * Linguistic normalizer:
 * 1. Unicode NFC normalisation
 * 2. Nukta normalization for Indic scripts (क़ -> क, फ़ -> फ, etc.)
 * 3. Chandrabindu / Anusvara normalization
 * 4. Punctuation stripping (including danda '।' and '॥')
 * 5. Honorific suffix stripping (जी, garu, avargal, etc.)
 * 6. Latin case folding
 */
export function normalizeLinguisticText(text: string): string {
  if (!text) return '';

  let res = text.normalize('NFC');

  // Devanagari / Gurmukhi Nukta folding
  res = res
    .replace(/\u0958/g, '\u0915') // क़ -> क
    .replace(/\u0959/g, '\u0916') // ख़ -> ख
    .replace(/\u095a/g, '\u0917') // ग़ -> ग
    .replace(/\u095b/g, '\u091c') // ज़ -> ज
    .replace(/\u095c/g, '\u0921') // ड़ -> ड
    .replace(/\u095d/g, '\u0922') // ढ़ -> ढ
    .replace(/\u095e/g, '\u092b') // फ़ -> फ
    .replace(/\u095f/g, '\u092f') // य़ -> य
    .replace(/\u093c/g, ''); // strip standalone nukta

  // Gurmukhi nukta folding
  res = res.replace(/\u0a3c/g, '');

  // Chandrabindu -> Anusvara folding (e.g. हाँ -> हां for matching uniformity)
  res = res.replace(/\u0901/g, '\u0902').replace(/\u0981/g, '\u0982');

  // Strip punctuation, including Indic dandas (।, ॥) and typical punctuation
  res = res.replace(/[.,\/#!$%\^&\*;:{}=\-_`~()?"'।॥+—–]/g, ' ');

  // Strip common honorific suffixes
  res = res
    .replace(/\bजी\b/gu, ' ')
    .replace(/\bగారు\b/gu, ' ')
    .replace(/\bஅவர்கள்\b/gu, ' ')
    .replace(/\bಅವರು\b/gu, ' ')
    .replace(/\bഅവർകൾ\b/gu, ' ')
    .replace(/\bবাবু\b/gu, ' ')
    .replace(/\bji\b/gi, ' ');

  // Lowercase & collapse whitespace
  return res.toLowerCase().replace(/\s+/g, ' ').trim();
}

/**
 * Computes Levenshtein distance between two strings
 */
export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (!a.length) return b.length;
  if (!b.length) return a.length;

  const row = Array.from({ length: b.length + 1 }, (_, i) => i);
  for (let i = 1; i <= a.length; i++) {
    let prev = i;
    for (let j = 1; j <= b.length; j++) {
      const val = a[i - 1] === b[j - 1] ? row[j - 1] : Math.min(row[j - 1], prev, row[j]) + 1;
      row[j - 1] = prev;
      prev = val;
    }
    row[b.length] = prev;
  }
  return row[b.length];
}

/**
 * On-device Chrome Translation API integration (Client-side offline AI translation).
 * Safely feature-detects `(window as any).translation` or `(window as any).ai.translator`.
 * Never calls remote services.
 */
export async function tryOnDeviceTranslate(
  text: string,
  sourceLang: string,
  targetLang: string = 'en'
): Promise<{ translatedText: string; success: boolean } | null> {
  if (typeof window === 'undefined') return null;

  try {
    const ai = (window as any).ai || (window as any).translation;
    if (!ai || !ai.translator) return null;

    const translatorCap = await ai.translator.capabilities?.();
    const canTrans = translatorCap?.languagePairAvailable?.(sourceLang, targetLang);
    if (canTrans !== 'readily' && canTrans !== 'after-download') {
      return null;
    }

    const translator = await ai.translator.create({
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
    });

    const res = await translator.translate(text);
    return { translatedText: res, success: true };
  } catch (err) {
    // Non-blocking graceful exit
    return null;
  }
}
