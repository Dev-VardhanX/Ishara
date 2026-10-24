// src/lib/textToGloss.ts — Text to Sign Language Gloss Parsing Engine
// Normalizes natural speech/text into standard UPPERCASE_UNDERSCORE Gloss IDs
// Restricts vocabulary strictly to the exact 20 target words.

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
 * Full sentences map to natural sign language gloss sequences within the 20-word vocabulary.
 */
interface PhraseDefinition {
  tokens: { word: string; gloss: string }[];
}

export const FULL_PHRASE_TABLE: Record<string, PhraseDefinition> = {
  // "hello how are you" -> HELLO HOW_ARE_YOU
  'hello how are you': {
    tokens: [
      { word: 'Hello', gloss: 'HELLO' },
      { word: 'how are you', gloss: 'HOW_ARE_YOU' },
    ],
  },
  'hello how r you': {
    tokens: [
      { word: 'Hello', gloss: 'HELLO' },
      { word: 'how are you', gloss: 'HOW_ARE_YOU' },
    ],
  },
  'hi how are you': {
    tokens: [
      { word: 'Hi', gloss: 'HELLO' },
      { word: 'how are you', gloss: 'HOW_ARE_YOU' },
    ],
  },
  'how are you': {
    tokens: [{ word: 'How are you', gloss: 'HOW_ARE_YOU' }],
  },
  'how r u': {
    tokens: [{ word: 'How are you', gloss: 'HOW_ARE_YOU' }],
  },

  // "thank you"
  'thank you': {
    tokens: [{ word: 'Thank you', gloss: 'THANK_YOU' }],
  },
  'thank you very much': {
    tokens: [{ word: 'Thank you', gloss: 'THANK_YOU' }],
  },
  'thanks a lot': {
    tokens: [{ word: 'Thanks', gloss: 'THANK_YOU' }],
  },

  // "goodbye"
  'goodbye': {
    tokens: [{ word: 'Goodbye', gloss: 'GOODBYE' }],
  },
  'good bye': {
    tokens: [{ word: 'Goodbye', gloss: 'GOODBYE' }],
  },
  'bye bye': {
    tokens: [{ word: 'Goodbye', gloss: 'GOODBYE' }],
  },
  'bye': {
    tokens: [{ word: 'Goodbye', gloss: 'GOODBYE' }],
  },
  'goodbye friend': {
    tokens: [
      { word: 'Goodbye', gloss: 'GOODBYE' },
      { word: 'friend', gloss: 'FRIEND' },
    ],
  },

  // "hello friend"
  'hello friend': {
    tokens: [
      { word: 'Hello', gloss: 'HELLO' },
      { word: 'friend', gloss: 'FRIEND' },
    ],
  },

  // "please help"
  'please help': {
    tokens: [
      { word: 'Please', gloss: 'PLEASE' },
      { word: 'help', gloss: 'HELP' },
    ],
  },
  'please help me': {
    tokens: [
      { word: 'Please', gloss: 'PLEASE' },
      { word: 'help', gloss: 'HELP' },
    ],
  },
  'help me please': {
    tokens: [
      { word: 'Help', gloss: 'HELP' },
      { word: 'please', gloss: 'PLEASE' },
    ],
  },
  'help me': {
    tokens: [{ word: 'Help', gloss: 'HELP' }],
  },

  // "sorry"
  'sorry': {
    tokens: [{ word: 'Sorry', gloss: 'SORRY' }],
  },
  'i am sorry': {
    tokens: [{ word: 'Sorry', gloss: 'SORRY' }],
  },

  // "yes"
  'yes': {
    tokens: [{ word: 'Yes', gloss: 'YES' }],
  },
  'yes please': {
    tokens: [
      { word: 'Yes', gloss: 'YES' },
      { word: 'please', gloss: 'PLEASE' },
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
  'no thanks': {
    tokens: [
      { word: 'No', gloss: 'NO' },
      { word: 'thanks', gloss: 'THANK_YOU' },
    ],
  },

  // Needs
  'i want water': {
    tokens: [
      { word: 'Please', gloss: 'PLEASE' },
      { word: 'water', gloss: 'WATER' },
    ],
  },
  'i need water': {
    tokens: [{ word: 'Water', gloss: 'WATER' }],
  },
  'drink water': {
    tokens: [
      { word: 'Drink', gloss: 'DRINK' },
      { word: 'water', gloss: 'WATER' },
    ],
  },
  'eat food': {
    tokens: [
      { word: 'Eat', gloss: 'EAT' },
      { word: 'food', gloss: 'FOOD' },
    ],
  },
  'i want food': {
    tokens: [{ word: 'Food', gloss: 'FOOD' }],
  },

  // Stop
  'please stop': {
    tokens: [
      { word: 'Please', gloss: 'PLEASE' },
      { word: 'stop', gloss: 'STOP' },
    ],
  },
  'stop please': {
    tokens: [
      { word: 'Stop', gloss: 'STOP' },
      { word: 'please', gloss: 'PLEASE' },
    ],
  },
};

// Filler words to drop in word-by-word fallback
export const FILLER_WORDS = new Set(['is', 'the', 'a', 'an', 'to', 'are', 'am', 'was', 'were', 'do', 'did', 'does', 'i', 'me', 'you', 'my', 'your', 'very', 'much', 'a', 'lot', 'of']);

// Multi-word phrase mapping for fallback chunking
const SUB_PHRASE_DICTIONARY: Record<string, string> = {
  'thank you': 'THANK_YOU',
  'thanks a lot': 'THANK_YOU',
  'how are you': 'HOW_ARE_YOU',
  'good bye': 'GOODBYE',
  'bye bye': 'GOODBYE',
  'drink water': 'WATER',
  'eat food': 'FOOD',
  'my name': 'NAME',
};

// Single-word gloss dictionary for word-by-word fallback (20-word restricted)
const WORD_GLOSS_DICTIONARY: Record<string, string> = {
  hello: 'HELLO',
  hi: 'HELLO',
  hey: 'HELLO',
  namaste: 'HELLO',
  thanks: 'THANK_YOU',
  thank: 'THANK_YOU',
  please: 'PLEASE',
  sorry: 'SORRY',
  apologies: 'SORRY',
  apologize: 'SORRY',
  yes: 'YES',
  yeah: 'YES',
  yep: 'YES',
  no: 'NO',
  nope: 'NO',
  goodbye: 'GOODBYE',
  bye: 'GOODBYE',
  farewell: 'GOODBYE',
  good: 'GOOD',
  well: 'GOOD',
  bad: 'BAD',
  poor: 'BAD',
  help: 'HELP',
  helping: 'HELP',
  stop: 'STOP',
  halt: 'STOP',
  eat: 'EAT',
  eating: 'EAT',
  drink: 'DRINK',
  drinking: 'DRINK',
  water: 'WATER',
  food: 'FOOD',
  meal: 'FOOD',
  home: 'HOME',
  house: 'HOME',
  friend: 'FRIEND',
  friends: 'FRIEND',
  name: 'NAME',
  love: 'LOVE',
  caring: 'LOVE',
};

/**
 * Parses a plain text input into an array of sequential gloss tokens strictly mapped
 * to the 20-word vocabulary.
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

  // 2. Fallback: Word-by-word with filler words dropped and unknown words as "(no sign yet)"
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

    // Drop filler words
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
