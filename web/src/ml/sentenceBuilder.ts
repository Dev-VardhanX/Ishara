// src/ml/sentenceBuilder.ts — Sign-to-Text Grammar & Sentence Builder
// Clearly distinguishes raw sign-by-sign gloss sequences from natural-language English translations.
// Restricts vocabulary strictly to the exact 20 target words.

export interface SentenceTranslationResult {
  rawGlosses: string[];
  cleanGlosses: string[];
  distinctGlosses: string[];
  language: 'ISL' | 'ASL';
  glossDisplay: string;
  naturalSentence: string;
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
    return ''; // Fix: Prevent raw language identifiers from appearing as a gloss
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

// Convert gloss ID to human readable word
export function glossToWord(gloss: string): string {
  const norm = normalizeGloss(gloss);
  switch (norm) {
    case 'HELLO':
      return 'Hello';
    case 'THANK_YOU':
      return 'thank you';
    case 'PLEASE':
      return 'please';
    case 'SORRY':
      return 'sorry';
    case 'YES':
      return 'yes';
    case 'NO':
      return 'no';
    case 'GOODBYE':
      return 'goodbye';
    case 'GOOD':
      return 'good';
    case 'BAD':
      return 'bad';
    case 'HOW_ARE_YOU':
      return 'how are you';
    case 'HELP':
      return 'help';
    case 'STOP':
      return 'stop';
    case 'EAT':
      return 'eat';
    case 'DRINK':
      return 'drink';
    case 'WATER':
      return 'water';
    case 'FOOD':
      return 'food';
    case 'HOME':
      return 'home';
    case 'FRIEND':
      return 'friend';
    case 'NAME':
      return 'name';
    case 'LOVE':
      return 'love';
    default:
      return norm ? norm.toLowerCase().replace(/_/g, ' ') : '';
  }
}

/**
 * High-priority multi-sign phrase grammar patterns.
 * Composed strictly using the 20 target vocabulary words.
 */
const SENTENCE_GRAMMAR_RULES: Record<string, string> = {
  // Single Signs (standalone confirmations)
  'HELLO': 'Hello!',
  'THANK_YOU': 'Thank you!',
  'PLEASE': 'Please.',
  'SORRY': 'Sorry.',
  'YES': 'Yes.',
  'NO': 'No.',
  'GOODBYE': 'Goodbye!',
  'GOOD': 'Good.',
  'BAD': 'Bad.',
  'HOW_ARE_YOU': 'How are you?',
  'HELP': 'Help!',
  'STOP': 'Stop.',
  'EAT': 'Eat.',
  'DRINK': 'Drink.',
  'WATER': 'Water, please.',
  'FOOD': 'Food, please.',
  'HOME': 'Home.',
  'FRIEND': 'Friend.',
  'NAME': 'Name.',
  'LOVE': 'Love.',

  // Conversational Multi-Sign Phrases
  'HELLO HOW_ARE_YOU': 'Hello, how are you?',
  'HOW_ARE_YOU GOOD': 'How are you? I am good.',
  'HOW_ARE_YOU BAD': 'How are you? I am not feeling good.',
  'GOOD THANK_YOU': 'Good, thank you!',
  'THANK_YOU FRIEND': 'Thank you, my friend!',
  'HELLO FRIEND': 'Hello, my friend!',
  'GOODBYE FRIEND': 'Goodbye, my friend!',
  'HELLO GOODBYE': 'Hello and goodbye!',
  'SORRY FRIEND': 'Sorry, my friend.',
  'PLEASE HELP': 'Please, help me!',
  'HELP PLEASE': 'Help, please!',
  'PLEASE STOP': 'Please stop.',
  'STOP PLEASE': 'Stop, please.',
  'SORRY PLEASE': 'Sorry, please forgive me.',
  'YES PLEASE': 'Yes, please.',
  'NO THANK_YOU': 'No, thank you.',
  'YES THANK_YOU': 'Yes, thank you!',
  'YES GOOD': 'Yes, that is good.',
  'NO BAD': 'No, that is bad.',
  'PLEASE WATER': 'Please, I need water.',
  'PLEASE FOOD': 'Please, I need food.',
  'EAT FOOD': 'Eat food.',
  'DRINK WATER': 'Drink water.',
  'FOOD EAT': 'Eat food.',
  'WATER DRINK': 'Drink water.',
  'GOOD FOOD': 'The food is good.',
  'BAD FOOD': 'The food is bad.',
  'FRIEND HELP': 'Friend, please help!',
  'HELP FRIEND': 'Help my friend!',
  'FRIEND LOVE': 'Much love to my friend!',
  'LOVE FRIEND': 'Love my friend!',
  'GOOD FRIEND': 'You are a good friend.',
  'GOOD HOME': 'Good home.',
  'LOVE HOME': 'I love home.',
  'NAME FRIEND': 'What is your name, my friend?',
  'HELLO NAME': 'Hello, my name is...',
};

/**
 * Builds a natural English sentence from recognized sign language glosses.
 * Enforces grammatical agreement, inserts necessary copula/articles,
 * deduplicates consecutive raw glosses, filters out language tags,
 * and restricts predictions strictly to the 20 target vocabulary signs.
 */
export function buildSentenceFromGlosses(
  glosses: string[],
  activeLanguage: 'ISL' | 'ASL' = 'ISL'
): SentenceTranslationResult {
  if (!glosses || glosses.length === 0) {
    return {
      rawGlosses: [],
      cleanGlosses: [],
      distinctGlosses: [],
      language: activeLanguage,
      glossDisplay: '',
      naturalSentence: '',
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

  // 1. Direct rule match on distinct sequence
  const distinctKey = distinctGlosses.join(' ');
  if (SENTENCE_GRAMMAR_RULES[distinctKey]) {
    return {
      rawGlosses,
      cleanGlosses,
      distinctGlosses,
      language: detectedLanguage,
      glossDisplay,
      naturalSentence: SENTENCE_GRAMMAR_RULES[distinctKey],
      ruleApplied: 'exact_phrase_rule',
    };
  }

  // 2. Direct rule match on full sequence
  const fullKey = cleanGlosses.join(' ');
  if (SENTENCE_GRAMMAR_RULES[fullKey]) {
    return {
      rawGlosses,
      cleanGlosses,
      distinctGlosses,
      language: detectedLanguage,
      glossDisplay,
      naturalSentence: SENTENCE_GRAMMAR_RULES[fullKey],
      ruleApplied: 'exact_phrase_rule',
    };
  }

  // 3. Fallback: synthesize readable English from the 20 words
  const words = distinctGlosses.map(glossToWord).filter(Boolean);
  let sentence = words.join(' ');
  if (sentence.length > 0) {
    sentence = sentence.charAt(0).toUpperCase() + sentence.slice(1);
    if (!sentence.endsWith('.') && !sentence.endsWith('!') && !sentence.endsWith('?')) {
      sentence += '.';
    }
  }

  return {
    rawGlosses,
    cleanGlosses,
    distinctGlosses,
    language: detectedLanguage,
    glossDisplay,
    naturalSentence: sentence,
    ruleApplied: 'synthesized_fallback',
  };
}
