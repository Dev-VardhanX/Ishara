// src/lib/textToGloss.ts — Text to Sign Language Gloss Parsing Engine
// Normalizes natural speech/text into standard UPPERCASE_UNDERSCORE Gloss IDs

export interface GlossToken {
  originalText: string;
  gloss: string | null;
  displayText: string;
  hasSign: boolean;
}

// Multi-word phrase mapping (checked with higher precedence)
const PHRASE_GLOSS_DICTIONARY: Record<string, string> = {
  'how are you': 'HOW_ARE_YOU',
  'how are u': 'HOW_ARE_YOU',
  'thank you': 'THANK_YOU',
  'thanks a lot': 'THANK_YOU',
  'good morning': 'GOOD_MORNING',
  'good afternoon': 'GOOD_AFTERNOON',
  'good evening': 'GOOD_EVENING',
  'good night': 'GOOD_NIGHT',
  'nice to meet you': 'NICE_TO_MEET_YOU',
  'see you later': 'SEE_YOU_LATER',
  'excuse me': 'PLEASE',
};

// Single-word gloss mapping
const WORD_GLOSS_DICTIONARY: Record<string, string> = {
  hello: 'HELLO',
  hi: 'HELLO',
  hey: 'HELLO',
  namaste: 'HELLO',
  thanks: 'THANK_YOU',
  thank: 'THANK_YOU',
  yes: 'YES',
  yeah: 'YES',
  yep: 'YES',
  no: 'NO',
  nope: 'NO',
  not: 'NO',
  please: 'PLEASE',
  sorry: 'SORRY',
  apologies: 'SORRY',
  help: 'HELP',
  name: 'NAME',
  welcome: 'WELCOME',
  friend: 'FRIEND',
  friends: 'FRIEND',
  love: 'LOVE',
  family: 'FAMILY',
  home: 'HOME',
  house: 'HOME',
  food: 'FOOD',
  eat: 'FOOD',
  eating: 'FOOD',
  water: 'WATER',
  drink: 'WATER',
  where: 'WHERE',
  doctor: 'DOCTOR',
  hospital: 'HOSPITAL',
  stop: 'STOP',
  today: 'TODAY',
  i: 'ME',
  me: 'ME',
  my: 'ME',
  you: 'YOU',
  your: 'YOU',
  we: 'WE',
  us: 'WE',
  happy: 'HAPPY',
  sad: 'SAD',
  good: 'GOOD_MORNING',
  learn: 'LEARN',
  learning: 'LEARN',
  sign: 'SIGN',
  signing: 'SIGN',
  time: 'TODAY',
  day: 'TODAY',
};

/**
 * Parses a plain text input into an array of sequential gloss tokens.
 * Multi-word phrases are matched first, followed by single words.
 * Unknown words that have no gesture mapping receive "(no sign yet)".
 */
export const parseTextToGlosses = (inputText: string): GlossToken[] => {
  if (!inputText || !inputText.trim()) {
    return [];
  }

  // Clean and split words while preserving original tokens
  const cleanText = inputText.trim();
  const rawWords = cleanText.split(/\s+/);
  const normalizedWords = rawWords.map((w) =>
    w.toLowerCase().replace(/[^a-z0-9']/g, '')
  );

  const tokens: GlossToken[] = [];
  let i = 0;

  while (i < rawWords.length) {
    let matched = false;

    // Check for 3-word phrase match
    if (i + 2 < rawWords.length) {
      const threeWord = `${normalizedWords[i]} ${normalizedWords[i + 1]} ${normalizedWords[i + 2]}`;
      if (PHRASE_GLOSS_DICTIONARY[threeWord]) {
        const originalPhrase = `${rawWords[i]} ${rawWords[i + 1]} ${rawWords[i + 2]}`;
        const gloss = PHRASE_GLOSS_DICTIONARY[threeWord];
        tokens.push({
          originalText: originalPhrase,
          gloss,
          displayText: gloss,
          hasSign: true,
        });
        i += 3;
        matched = true;
        continue;
      }
    }

    // Check for 2-word phrase match
    if (i + 1 < rawWords.length) {
      const twoWord = `${normalizedWords[i]} ${normalizedWords[i + 1]}`;
      if (PHRASE_GLOSS_DICTIONARY[twoWord]) {
        const originalPhrase = `${rawWords[i]} ${rawWords[i + 1]}`;
        const gloss = PHRASE_GLOSS_DICTIONARY[twoWord];
        tokens.push({
          originalText: originalPhrase,
          gloss,
          displayText: gloss,
          hasSign: true,
        });
        i += 2;
        matched = true;
        continue;
      }
    }

    // Check single word match
    const currentWord = normalizedWords[i];
    const originalWord = rawWords[i];

    if (WORD_GLOSS_DICTIONARY[currentWord]) {
      const gloss = WORD_GLOSS_DICTIONARY[currentWord];
      tokens.push({
        originalText: originalWord,
        gloss,
        displayText: gloss,
        hasSign: true,
      });
    } else {
      // Unknown word without sign
      tokens.push({
        originalText: originalWord,
        gloss: null,
        displayText: '(no sign yet)',
        hasSign: false,
      });
    }

    i++;
  }

  return tokens;
};
