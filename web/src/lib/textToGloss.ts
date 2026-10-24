// src/lib/textToGloss.ts — Text to Sign Language Gloss Parsing Engine
// Normalizes natural speech/text into standard UPPERCASE_UNDERSCORE Gloss IDs

export interface GlossToken {
  originalText: string;
  gloss: string | null;
  displayText: string;
  hasSign: boolean;
  isFingerspelled?: boolean;
}

/**
 * Normalizes text by lowercasing and stripping punctuation
 */
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Full Sentence Phrase Table
 * Checked BEFORE word-by-word lookup (case and punctuation insensitive).
 * Full sentences map to natural sign language gloss sequences.
 */
interface PhraseDefinition {
  tokens: { word: string; gloss: string }[];
}

export const FULL_PHRASE_TABLE: Record<string, PhraseDefinition> = {
  // "hello how are you" -> HELLO HOW YOU
  'hello how are you': {
    tokens: [
      { word: 'Hello', gloss: 'HELLO' },
      { word: 'how', gloss: 'HOW' },
      { word: 'you', gloss: 'YOU' },
    ],
  },
  'hello how r you': {
    tokens: [
      { word: 'Hello', gloss: 'HELLO' },
      { word: 'how', gloss: 'HOW' },
      { word: 'you', gloss: 'YOU' },
    ],
  },
  'hello how are you today': {
    tokens: [
      { word: 'Hello', gloss: 'HELLO' },
      { word: 'how', gloss: 'HOW' },
      { word: 'you', gloss: 'YOU' },
      { word: 'today', gloss: 'TODAY' },
    ],
  },
  'hi how are you': {
    tokens: [
      { word: 'Hi', gloss: 'HELLO' },
      { word: 'how', gloss: 'HOW' },
      { word: 'you', gloss: 'YOU' },
    ],
  },
  'how are you': {
    tokens: [
      { word: 'How', gloss: 'HOW' },
      { word: 'you', gloss: 'YOU' },
    ],
  },

  // "nice to meet you" -> NICE MEET YOU
  'nice to meet you': {
    tokens: [
      { word: 'Nice', gloss: 'NICE' },
      { word: 'meet', gloss: 'MEET' },
      { word: 'you', gloss: 'YOU' },
    ],
  },
  'nice to meet you today': {
    tokens: [
      { word: 'Nice', gloss: 'NICE' },
      { word: 'meet', gloss: 'MEET' },
      { word: 'you', gloss: 'YOU' },
      { word: 'today', gloss: 'TODAY' },
    ],
  },
  'nice meeting you': {
    tokens: [
      { word: 'Nice', gloss: 'NICE' },
      { word: 'meet', gloss: 'MEET' },
      { word: 'you', gloss: 'YOU' },
    ],
  },

  // "thank you very much" -> THANK_YOU VERY MUCH
  'thank you very much': {
    tokens: [
      { word: 'Thank you', gloss: 'THANK_YOU' },
      { word: 'very', gloss: 'VERY' },
      { word: 'much', gloss: 'MUCH' },
    ],
  },
  'thanks very much': {
    tokens: [
      { word: 'Thanks', gloss: 'THANK_YOU' },
      { word: 'very', gloss: 'VERY' },
      { word: 'much', gloss: 'MUCH' },
    ],
  },
  'thank you': {
    tokens: [{ word: 'Thank you', gloss: 'THANK_YOU' }],
  },
  'thanks a lot': {
    tokens: [
      { word: 'Thanks', gloss: 'THANK_YOU' },
      { word: 'much', gloss: 'MUCH' },
    ],
  },

  // "good morning" -> GOOD_MORNING
  'good morning': {
    tokens: [{ word: 'Good morning', gloss: 'GOOD_MORNING' }],
  },
  'good afternoon': {
    tokens: [{ word: 'Good afternoon', gloss: 'GOOD_AFTERNOON' }],
  },
  'good evening': {
    tokens: [{ word: 'Good evening', gloss: 'GOOD_EVENING' }],
  },
  'good night': {
    tokens: [{ word: 'Good night', gloss: 'GOOD_NIGHT' }],
  },

  // "how can I help you today" -> HOW CAN HELP YOU TODAY
  'how can i help you today': {
    tokens: [
      { word: 'How', gloss: 'HOW' },
      { word: 'can', gloss: 'CAN' },
      { word: 'help', gloss: 'HELP' },
      { word: 'you', gloss: 'YOU' },
      { word: 'today', gloss: 'TODAY' },
    ],
  },
  'how can i help you': {
    tokens: [
      { word: 'How', gloss: 'HOW' },
      { word: 'can', gloss: 'CAN' },
      { word: 'help', gloss: 'HELP' },
      { word: 'you', gloss: 'YOU' },
    ],
  },

  // "where is the metro station" -> WHERE METRO STATION
  'where is the metro station': {
    tokens: [
      { word: 'Where', gloss: 'WHERE' },
      { word: 'metro', gloss: 'METRO' },
      { word: 'station', gloss: 'STATION' },
    ],
  },
  'where is metro station': {
    tokens: [
      { word: 'Where', gloss: 'WHERE' },
      { word: 'metro', gloss: 'METRO' },
      { word: 'station', gloss: 'STATION' },
    ],
  },
  'where is the nearest metro station': {
    tokens: [
      { word: 'Where', gloss: 'WHERE' },
      { word: 'metro', gloss: 'METRO' },
      { word: 'station', gloss: 'STATION' },
    ],
  },

  // "I need a doctor" -> I NEED DOCTOR
  'i need a doctor': {
    tokens: [
      { word: 'I', gloss: 'I' },
      { word: 'need', gloss: 'NEED' },
      { word: 'doctor', gloss: 'DOCTOR' },
    ],
  },
  'need a doctor': {
    tokens: [
      { word: 'Need', gloss: 'NEED' },
      { word: 'doctor', gloss: 'DOCTOR' },
    ],
  },

  // "please help me"
  'please help me': {
    tokens: [
      { word: 'Please', gloss: 'PLEASE' },
      { word: 'help', gloss: 'HELP' },
      { word: 'me', gloss: 'ME' },
    ],
  },
  'help me please': {
    tokens: [
      { word: 'Help', gloss: 'HELP' },
      { word: 'me', gloss: 'ME' },
      { word: 'please', gloss: 'PLEASE' },
    ],
  },

  // "sorry"
  'sorry': {
    tokens: [{ word: 'Sorry', gloss: 'SORRY' }],
  },
  'i am sorry': {
    tokens: [{ word: 'Sorry', gloss: 'SORRY' }],
  },
  'sorry i did not understand': {
    tokens: [
      { word: 'Sorry', gloss: 'SORRY' },
      { word: 'I', gloss: 'I' },
      { word: 'not', gloss: 'NOT' },
      { word: 'understand', gloss: 'UNDERSTAND' },
    ],
  },

  // "yes"
  'yes': {
    tokens: [{ word: 'Yes', gloss: 'YES' }],
  },
  'yes i understand': {
    tokens: [
      { word: 'Yes', gloss: 'YES' },
      { word: 'I', gloss: 'I' },
      { word: 'understand', gloss: 'UNDERSTAND' },
    ],
  },

  // "no"
  'no': {
    tokens: [{ word: 'No', gloss: 'NO' }],
  },
  'no thank you': {
    tokens: [
      { word: 'No', gloss: 'NO' },
      { word: 'thank you', gloss: 'THANK_YOU' },
    ],
  },

  // "what is your name"
  'what is your name': {
    tokens: [
      { word: 'What', gloss: 'WHAT' },
      { word: 'your', gloss: 'YOUR' },
      { word: 'name', gloss: 'NAME' },
    ],
  },
  'what is ur name': {
    tokens: [
      { word: 'What', gloss: 'WHAT' },
      { word: 'your', gloss: 'YOUR' },
      { word: 'name', gloss: 'NAME' },
    ],
  },
};

// Filler words to drop in word-by-word fallback
export const FILLER_WORDS = new Set(['is', 'the', 'a', 'to', 'are']);

// Multi-word phrase mapping for fallback chunking
const SUB_PHRASE_DICTIONARY: Record<string, string> = {
  'thank you': 'THANK_YOU',
  'thanks a lot': 'THANK_YOU',
  'good morning': 'GOOD_MORNING',
  'good afternoon': 'GOOD_AFTERNOON',
  'good evening': 'GOOD_EVENING',
  'good night': 'GOOD_NIGHT',
  'metro station': 'METRO',
  'excuse me': 'PLEASE',
};

// Single-word gloss dictionary for word-by-word fallback
const WORD_GLOSS_DICTIONARY: Record<string, string> = {
  hello: 'HELLO',
  hi: 'HELLO',
  hey: 'HELLO',
  namaste: 'HELLO',
  how: 'HOW',
  you: 'YOU',
  your: 'YOUR',
  nice: 'NICE',
  meet: 'MEET',
  meeting: 'MEET',
  thanks: 'THANK_YOU',
  thank: 'THANK_YOU',
  very: 'VERY',
  much: 'MUCH',
  good: 'GOOD_MORNING',
  morning: 'GOOD_MORNING',
  afternoon: 'GOOD_AFTERNOON',
  evening: 'GOOD_EVENING',
  night: 'GOOD_NIGHT',
  can: 'CAN',
  help: 'HELP',
  helping: 'HELP',
  today: 'TODAY',
  where: 'WHERE',
  metro: 'METRO',
  station: 'STATION',
  train: 'METRO',
  i: 'I',
  me: 'ME',
  my: 'MY',
  need: 'NEED',
  doctor: 'DOCTOR',
  hospital: 'HOSPITAL',
  please: 'PLEASE',
  sorry: 'SORRY',
  apologies: 'SORRY',
  yes: 'YES',
  yeah: 'YES',
  yep: 'YES',
  no: 'NO',
  nope: 'NO',
  not: 'NOT',
  what: 'WHAT',
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
  water: 'WATER',
  drink: 'WATER',
  stop: 'STOP',
  learn: 'LEARN',
  sign: 'SIGN',
  signing: 'SIGN',
  happy: 'HAPPY',
  sad: 'SAD',
  understand: 'UNDERSTAND',
  we: 'WE',
  us: 'WE',
};

/**
 * Parses a plain text input into an array of sequential gloss tokens.
 * 1. Checks the full phrase table first (case and punctuation insensitive).
 * 2. Checks "my name is ..." with name fingerspelled letter-by-letter.
 * 3. Falls back to word-by-word with filler words (is, the, a, to, are) dropped,
 *    and unknown words preserved as "(no sign yet)".
 */
export const parseTextToGlosses = (inputText: string): GlossToken[] => {
  if (!inputText || !inputText.trim()) {
    return [];
  }

  const rawTrimmed = inputText.trim();
  const normalized = normalizeText(rawTrimmed);

  // 1. Check Full Sentence Phrase Table first (case and punctuation insensitive)
  if (FULL_PHRASE_TABLE[normalized]) {
    return FULL_PHRASE_TABLE[normalized].tokens.map((t) => ({
      originalText: t.word,
      gloss: t.gloss,
      displayText: t.gloss,
      hasSign: true,
    }));
  }

  // 2. Check "my name is ..." pattern (name stays fingerspelled)
  const myNameMatch = normalized.match(/^my name is(?:\s+(.*))?$/);
  if (myNameMatch) {
    const tokens: GlossToken[] = [
      { originalText: 'My', gloss: 'MY', displayText: 'MY', hasSign: true },
      { originalText: 'name', gloss: 'NAME', displayText: 'NAME', hasSign: true },
    ];

    const rawWords = rawTrimmed.split(/\s+/);
    // Find words after "is"
    const isIndex = rawWords.findIndex((w) => w.toLowerCase().replace(/[^a-z]/g, '') === 'is');
    const nameWords = isIndex !== -1 ? rawWords.slice(isIndex + 1) : [];

    if (nameWords.length > 0) {
      nameWords.forEach((word) => {
        const letters = word.replace(/[^a-zA-Z]/g, '').split('');
        letters.forEach((letter) => {
          tokens.push({
            originalText: letter,
            gloss: letter.toUpperCase(),
            displayText: `${letter.toUpperCase()} (fingerspelled)`,
            hasSign: true,
            isFingerspelled: true,
          });
        });
      });
    }

    return tokens;
  }

  // 3. Fallback: Word-by-word with filler words dropped and unknown words as "(no sign yet)"
  const rawWords = rawTrimmed.split(/\s+/);
  const tokens: GlossToken[] = [];
  let i = 0;

  while (i < rawWords.length) {
    // Check 2-word phrase chunk
    if (i + 1 < rawWords.length) {
      const norm1 = rawWords[i].toLowerCase().replace(/[^a-z0-9']/g, '');
      const norm2 = rawWords[i + 1].toLowerCase().replace(/[^a-z0-9']/g, '');
      const twoWord = `${norm1} ${norm2}`;

      if (SUB_PHRASE_DICTIONARY[twoWord]) {
        const originalPhrase = `${rawWords[i]} ${rawWords[i + 1]}`;
        const gloss = SUB_PHRASE_DICTIONARY[twoWord];
        tokens.push({
          originalText: originalPhrase,
          gloss,
          displayText: gloss,
          hasSign: true,
        });
        i += 2;
        continue;
      }
    }

    const rawWord = rawWords[i];
    const normalizedWord = rawWord.toLowerCase().replace(/[^a-z0-9']/g, '');

    // Ignore empty tokens
    if (!normalizedWord) {
      i++;
      continue;
    }

    // Drop filler words (is, the, a, to, are) in word-by-word fallback
    if (FILLER_WORDS.has(normalizedWord)) {
      i++;
      continue;
    }

    // Check single word dictionary
    if (WORD_GLOSS_DICTIONARY[normalizedWord]) {
      const gloss = WORD_GLOSS_DICTIONARY[normalizedWord];
      tokens.push({
        originalText: rawWord,
        gloss,
        displayText: gloss,
        hasSign: true,
      });
    } else {
      // Keep unknown words as "(no sign yet)"
      tokens.push({
        originalText: rawWord,
        gloss: null,
        displayText: '(no sign yet)',
        hasSign: false,
      });
    }

    i++;
  }

  return tokens;
};
