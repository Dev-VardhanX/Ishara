// src/ml/sentenceBuilder.ts — Sign-to-Text Grammar & Sentence Builder
// Clearly distinguishes raw sign-by-sign gloss sequences from natural-language English translations.

export interface SentenceTranslationResult {
  rawGlosses: string[];
  cleanGlosses: string[];
  distinctGlosses: string[];
  language: 'ISL' | 'ASL';
  glossDisplay: string;
  naturalSentence: string;
  ruleApplied: string;
}

// Strip language prefixes like "ISL_" or "ASL_"
export function normalizeGloss(gloss: string): string {
  return gloss.replace(/^(ISL_|ASL_)/, '').toUpperCase().trim();
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
    case 'THANK_YOU':
      return 'thank you';
    case 'DONT_UNDERSTAND':
      return "don't understand";
    case 'HOW_ARE_YOU':
      return 'how are you';
    default:
      return norm.toLowerCase().replace(/_/g, ' ');
  }
}

/**
 * High-priority multi-sign phrase grammar patterns.
 * Matched against normalized gloss keys (e.g. "I WANT WATER").
 */
const SENTENCE_GRAMMAR_RULES: Record<string, string> = {
  // Single Signs (standalone confirmations)
  'HELLO': 'Hello!',
  'GOODBYE': 'Goodbye!',
  'YES': 'Yes.',
  'NO': 'No.',
  'I': 'I.',
  'ME': 'Me.',
  'YOU': 'You.',
  'WE': 'We.',
  'THEY': 'They.',
  'HE': 'He.',
  'SHE': 'She.',
  'MY': 'My.',
  'YOUR': 'Your.',
  'THANK_YOU': 'Thank you!',
  'PLEASE': 'Please.',
  'SORRY': 'Sorry.',
  'WELCOME': 'Welcome!',
  'HELP': 'Help!',
  'WATER': 'Water.',
  'FOOD': 'Food.',
  'EAT': 'Eat.',
  'DRINK': 'Drink.',
  'BATHROOM': 'Bathroom.',
  'BOOK': 'Book.',
  'HOME': 'Home.',
  'SCHOOL': 'School.',
  'SLEEP': 'Sleep.',
  'HAPPY': 'Happy.',
  'SAD': 'Sad.',
  'GOOD': 'Good.',
  'BAD': 'Bad.',

  // Needs & Requests
  'I WANT WATER': 'I want water.',
  'I NEED WATER': 'I need water.',
  'I DRINK WATER': 'I want to drink water.',
  'I EAT FOOD': 'I am eating food.',
  'I WANT FOOD': 'I want food.',
  'I NEED FOOD': 'I need food.',
  'I NEED HELP': 'I need help.',
  'PLEASE HELP ME': 'Please help me.',
  'YOU HELP ME': 'You help me.',
  'I HELP YOU': 'I will help you.',
  'CAN YOU HELP ME': 'Can you please help me?',
  'PLEASE WAIT': 'Please wait a moment.',

  // Introductions & People
  'MY NAME FRIEND': 'My name is Friend.',
  'HELLO MY NAME': 'Hello, my name is...',
  'HELLO FRIEND': 'Hello, my friend!',
  'GOODBYE FRIEND': 'Goodbye, my friend!',
  'THANK_YOU FRIEND': 'Thank you, friend.',
  'YOU MY FRIEND': 'You are my friend.',
  'WE FRIENDS': 'We are friends.',
  'YOUR NAME WHAT': 'What is your name?',

  // Greetings & Status
  'HELLO HOW_ARE_YOU': 'Hello, how are you?',
  'HOW_ARE_YOU': 'How are you?',
  'I GOOD': 'I am doing good.',
  'I BAD': 'I am feeling bad.',
  'I HAPPY': 'I am happy today.',
  'I SAD': 'I am feeling sad.',
  'I UNDERSTAND': 'I understand.',
  'I DONT_UNDERSTAND': 'I do not understand.',
  'SORRY I DONT_UNDERSTAND': 'Sorry, I do not understand.',
  'YES I UNDERSTAND': 'Yes, I understand.',
  'NO I DONT_UNDERSTAND': 'No, I do not understand.',
  'WELCOME HOME': 'Welcome home!',

  // Navigation & Activities
  'I GO HOME': 'I am going home.',
  'I GO SCHOOL': 'I am going to school.',
  'I GO BATHROOM': 'I need to use the bathroom.',
  'WHERE BATHROOM': 'Where is the bathroom?',
  'I READ BOOK': 'I am reading a book.',
  'I WRITE': 'I am writing.',
  'I SLEEP': 'I am going to sleep.',
  'I TIRED SLEEP': 'I am tired and want to sleep.',
  'I LOVE YOU': 'I love you.',
  'LOVE YOU': 'Love you!',
  'STOP PLEASE': 'Please stop.',
};

/**
 * Builds a natural English sentence from recognized sign language glosses.
 * Enforces grammatical agreement, inserts necessary copula/articles,
 * deduplicates consecutive raw glosses, and separates language tags.
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

  const cleanGlosses = rawGlosses.map(normalizeGloss);

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

  // 3. Sub-phrase pattern matching: check if starts with "MY NAME ..."
  if (cleanGlosses[0] === 'MY' && cleanGlosses[1] === 'NAME') {
    const rest = cleanGlosses.slice(2).map(g => g.charAt(0) + g.slice(1).toLowerCase()).join(' ');
    const sentence = rest ? `My name is ${rest}.` : 'My name is...';
    return {
      rawGlosses,
      cleanGlosses,
      distinctGlosses,
      language: detectedLanguage,
      glossDisplay,
      naturalSentence: sentence,
      ruleApplied: 'name_intro_rule',
    };
  }

  // 4. Pronoun + Copula + Predicate rule:
  // e.g. "I + HAPPY" -> "I am happy.", "YOU + GOOD" -> "You are good."
  const pronouns = new Set(['I', 'ME', 'YOU', 'WE', 'THEY', 'HE', 'SHE']);
  const adjectives = new Set(['HAPPY', 'SAD', 'GOOD', 'BAD', 'TIRED', 'FINE']);

  const targetTokens = distinctGlosses.length > 0 ? distinctGlosses : cleanGlosses;

  if (targetTokens.length === 2 && pronouns.has(targetTokens[0]) && adjectives.has(targetTokens[1])) {
    const subj = targetTokens[0];
    const adj = targetTokens[1].toLowerCase();
    let copula = 'am';
    if (subj === 'YOU' || subj === 'WE' || subj === 'THEY') copula = 'are';
    else if (subj === 'HE' || subj === 'SHE') copula = 'is';
    const subjWord = subj === 'I' || subj === 'ME' ? 'I' : subj.charAt(0) + subj.slice(1).toLowerCase();

    return {
      rawGlosses,
      cleanGlosses,
      distinctGlosses,
      language: detectedLanguage,
      glossDisplay,
      naturalSentence: `${subjWord} ${copula} ${adj}.`,
      ruleApplied: 'pronoun_copula_adjective',
    };
  }

  // 5. Fallback Rule-Based Sentence Synthesis:
  // Maps individual words, capitalizes the first word, ensures 'I' is uppercase,
  // and adds terminal punctuation.
  const words = targetTokens.map((g, idx) => {
    let word = glossToWord(g);
    if (idx === 0) {
      word = word.charAt(0).toUpperCase() + word.slice(1);
    }
    if (word === 'i') word = 'I';
    return word;
  });

  let natural = words.join(' ');

  // Add question mark if starts with question words
  if (/^(How|What|Where|Why|When|Who|Can)/i.test(natural)) {
    if (!natural.endsWith('?')) natural += '?';
  } else if (!/[.!?]$/.test(natural)) {
    natural += '.';
  }

  return {
    rawGlosses,
    cleanGlosses,
    distinctGlosses,
    language: detectedLanguage,
    glossDisplay,
    naturalSentence: natural,
    ruleApplied: 'general_synthesizer',
  };
}
