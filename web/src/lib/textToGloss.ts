// src/lib/textToGloss.ts — Text to Sign Language Gloss Parsing Engine
// Normalizes natural speech/text into standard UPPERCASE_UNDERSCORE Gloss IDs.
// Includes rule-based ISL grammatical reordering (SOV order, question words at end,
// dropping copulas and articles) while keeping ASL ordering intact.

export interface GlossToken {
  originalText: string;
  gloss: string | null;
  displayText: string;
  hasSign: boolean;
  isFingerspelled?: boolean;
}

export interface TextToGlossDetails {
  tokens: GlossToken[];
  englishOrderText: string;
  islOrderText: string;
  reordered: boolean;
}

/**
 * Normalizes text by lowercasing and stripping punctuation, preserving all Unicode letters
 */
export const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
};

/**
 * Indic Vocabulary Table: Maps Hindi, Bengali, Marathi, Tamil, etc. words to Gloss IDs
 */
export const INDIC_VOCABULARY_MAP: Record<string, string> = {
  // Hindi
  'नमस्ते': 'HELLO',
  'हेलो': 'HELLO',
  'प्रणाम': 'HELLO',
  'धन्यवाद': 'THANK_YOU',
  'शुक्रिया': 'THANK_YOU',
  'कृपया': 'PLEASE',
  'माफ़': 'SORRY',
  'माफी': 'SORRY',
  'सॉरी': 'SORRY',
  'अलविदा': 'GOODBYE',
  'हाँ': 'YES',
  'हा': 'YES',
  'नहीं': 'NO',
  'ना': 'NO',
  'अच्छा': 'GOOD',
  'बढ़िया': 'GOOD',
  'बुरा': 'BAD',
  'खराब': 'BAD',
  'मदद': 'HELP',
  'सहायता': 'HELP',
  'रुकिए': 'STOP',
  'रोको': 'STOP',
  'रुको': 'STOP',
  'खाना': 'EAT',
  'खाओ': 'EAT',
  'खा': 'EAT',
  'पीना': 'DRINK',
  'पियो': 'DRINK',
  'पी': 'DRINK',
  'पानी': 'WATER',
  'जल': 'WATER',
  'भोजन': 'FOOD',
  'घर': 'HOME',
  'दोस्त': 'FRIEND',
  'मित्र': 'FRIEND',
  'नाम': 'NAME',
  'प्यार': 'LOVE',
  'प्रेम': 'LOVE',

  // Bengali
  'নমস্কার': 'HELLO',
  'ধন্যবাদ': 'THANK_YOU',
  'দয়া': 'PLEASE',
  'দুঃখিত': 'SORRY',
  'বিদায়': 'GOODBYE',
  'হ্যাঁ': 'YES',
  'না': 'NO',
  'ভালো': 'GOOD',
  'খারাপ': 'BAD',
  'সাহায্য': 'HELP',
  'থামুন': 'STOP',
  'খাওয়া': 'EAT',
  'পান': 'DRINK',
  'জল': 'WATER',
  'খাবার': 'FOOD',
  'বাড়ি': 'HOME',
  'বন্ধু': 'FRIEND',
  'নাম': 'NAME',
  'ভালোবাসা': 'LOVE',

  // Marathi (Devanagari shared with Hindi)
  'नमस्कार': 'HELLO',
  'माफ': 'SORRY',
  'निरोप': 'GOODBYE',
  'होय': 'YES',
  'नाही': 'NO',
  'चांगले': 'GOOD',
  'वाईट': 'BAD',
  'थांबा': 'STOP',
  'अन्न': 'FOOD',
  'पाणी': 'WATER',
  'नाव': 'NAME',

  // Tamil
  'வணக்கம்': 'HELLO',
  'நன்றி': 'THANK_YOU',
  'தயவுசெய்து': 'PLEASE',
  'மன்னிக்கவும்': 'SORRY',
  'வருகிறேன்': 'GOODBYE',
  'ஆம்': 'YES',
  'இல்லை': 'NO',
  'நல்லது': 'GOOD',
  'கெட்டது': 'BAD',
  'உதவி': 'HELP',
  'நிறுத்து': 'STOP',
  'சாப்பிடு': 'EAT',
  'குடி': 'DRINK',
  'தண்ணீர்': 'WATER',
  'உணவு': 'FOOD',
  'வீடு': 'HOME',
  'நண்பர்': 'FRIEND',
  'பெயர்': 'NAME',
  'அன்பு': 'LOVE',
};

/**
 * Full Sentence Phrase Table
 * Checked BEFORE word-by-word lookup (case and punctuation insensitive).
 */
interface PhraseDefinition {
  islTokens: { word: string; gloss: string }[];
  aslTokens?: { word: string; gloss: string }[];
}

export const FULL_PHRASE_TABLE: Record<string, PhraseDefinition> = {
  // "what is your name" -> ISL: YOUR NAME WHAT / ASL: YOUR NAME WHAT
  'what is your name': {
    islTokens: [
      { word: 'your', gloss: 'YOUR' },
      { word: 'name', gloss: 'NAME' },
      { word: 'what', gloss: 'WHAT' },
    ],
    aslTokens: [
      { word: 'your', gloss: 'YOUR' },
      { word: 'name', gloss: 'NAME' },
      { word: 'what', gloss: 'WHAT' },
    ],
  },
  'what your name': {
    islTokens: [
      { word: 'your', gloss: 'YOUR' },
      { word: 'name', gloss: 'NAME' },
      { word: 'what', gloss: 'WHAT' },
    ],
  },
  'whats your name': {
    islTokens: [
      { word: 'your', gloss: 'YOUR' },
      { word: 'name', gloss: 'NAME' },
      { word: 'what', gloss: 'WHAT' },
    ],
  },

  // "i eat food" -> ISL: I FOOD EAT / ASL: I EAT FOOD
  'i eat food': {
    islTokens: [
      { word: 'I', gloss: 'I' },
      { word: 'food', gloss: 'FOOD' },
      { word: 'eat', gloss: 'EAT' },
    ],
    aslTokens: [
      { word: 'I', gloss: 'I' },
      { word: 'eat', gloss: 'EAT' },
      { word: 'food', gloss: 'FOOD' },
    ],
  },

  // "hello how are you"
  'hello how are you': {
    islTokens: [
      { word: 'Hello', gloss: 'HELLO' },
      { word: 'how are you', gloss: 'HOW_ARE_YOU' },
    ],
  },
  'hello how r you': {
    islTokens: [
      { word: 'Hello', gloss: 'HELLO' },
      { word: 'how are you', gloss: 'HOW_ARE_YOU' },
    ],
  },
  'hi how are you': {
    islTokens: [
      { word: 'Hi', gloss: 'HELLO' },
      { word: 'how are you', gloss: 'HOW_ARE_YOU' },
    ],
  },
  'how are you': {
    islTokens: [{ word: 'How are you', gloss: 'HOW_ARE_YOU' }],
  },
  'how r u': {
    islTokens: [{ word: 'How are you', gloss: 'HOW_ARE_YOU' }],
  },

  // "thank you"
  'thank you': {
    islTokens: [{ word: 'Thank you', gloss: 'THANK_YOU' }],
  },
  'thank you very much': {
    islTokens: [{ word: 'Thank you', gloss: 'THANK_YOU' }],
  },
  'thanks a lot': {
    islTokens: [{ word: 'Thanks', gloss: 'THANK_YOU' }],
  },

  // "goodbye"
  goodbye: {
    islTokens: [{ word: 'Goodbye', gloss: 'GOODBYE' }],
  },
  'good bye': {
    islTokens: [{ word: 'Goodbye', gloss: 'GOODBYE' }],
  },
  'bye bye': {
    islTokens: [{ word: 'Goodbye', gloss: 'GOODBYE' }],
  },
  bye: {
    islTokens: [{ word: 'Goodbye', gloss: 'GOODBYE' }],
  },
  'goodbye friend': {
    islTokens: [
      { word: 'Goodbye', gloss: 'GOODBYE' },
      { word: 'friend', gloss: 'FRIEND' },
    ],
  },
  'hello friend': {
    islTokens: [
      { word: 'Hello', gloss: 'HELLO' },
      { word: 'friend', gloss: 'FRIEND' },
    ],
  },

  // "please help"
  'please help': {
    islTokens: [
      { word: 'Please', gloss: 'PLEASE' },
      { word: 'help', gloss: 'HELP' },
    ],
  },
  'please help me': {
    islTokens: [
      { word: 'Please', gloss: 'PLEASE' },
      { word: 'me', gloss: 'I' },
      { word: 'help', gloss: 'HELP' },
    ],
    aslTokens: [
      { word: 'Please', gloss: 'PLEASE' },
      { word: 'help', gloss: 'HELP' },
      { word: 'me', gloss: 'I' },
    ],
  },
  'help me please': {
    islTokens: [
      { word: 'me', gloss: 'I' },
      { word: 'help', gloss: 'HELP' },
      { word: 'please', gloss: 'PLEASE' },
    ],
  },
  'help me': {
    islTokens: [
      { word: 'me', gloss: 'I' },
      { word: 'help', gloss: 'HELP' },
    ],
  },

  // "sorry"
  sorry: {
    islTokens: [{ word: 'Sorry', gloss: 'SORRY' }],
  },
  'i am sorry': {
    islTokens: [{ word: 'Sorry', gloss: 'SORRY' }],
  },

  // "yes" / "no"
  yes: {
    islTokens: [{ word: 'Yes', gloss: 'YES' }],
  },
  'yes please': {
    islTokens: [
      { word: 'Yes', gloss: 'YES' },
      { word: 'please', gloss: 'PLEASE' },
    ],
  },
  no: {
    islTokens: [{ word: 'No', gloss: 'NO' }],
  },
  'no thank you': {
    islTokens: [
      { word: 'No', gloss: 'NO' },
      { word: 'thank you', gloss: 'THANK_YOU' },
    ],
  },
  'no thanks': {
    islTokens: [
      { word: 'No', gloss: 'NO' },
      { word: 'thanks', gloss: 'THANK_YOU' },
    ],
  },

  // Needs
  'i want water': {
    islTokens: [
      { word: 'I', gloss: 'I' },
      { word: 'water', gloss: 'WATER' },
      { word: 'want', gloss: 'PLEASE' },
    ],
  },
  'i need water': {
    islTokens: [
      { word: 'I', gloss: 'I' },
      { word: 'water', gloss: 'WATER' },
    ],
  },
  'drink water': {
    islTokens: [
      { word: 'water', gloss: 'WATER' },
      { word: 'drink', gloss: 'DRINK' },
    ],
    aslTokens: [
      { word: 'drink', gloss: 'DRINK' },
      { word: 'water', gloss: 'WATER' },
    ],
  },
  'eat food': {
    islTokens: [
      { word: 'food', gloss: 'FOOD' },
      { word: 'eat', gloss: 'EAT' },
    ],
    aslTokens: [
      { word: 'eat', gloss: 'EAT' },
      { word: 'food', gloss: 'FOOD' },
    ],
  },
  'i want food': {
    islTokens: [
      { word: 'I', gloss: 'I' },
      { word: 'food', gloss: 'FOOD' },
    ],
  },

  // Stop
  'please stop': {
    islTokens: [
      { word: 'Please', gloss: 'PLEASE' },
      { word: 'stop', gloss: 'STOP' },
    ],
  },
  'stop please': {
    islTokens: [
      { word: 'Stop', gloss: 'STOP' },
      { word: 'please', gloss: 'PLEASE' },
    ],
  },
};

// Pure filler words dropped in word-by-word analysis (articles and copulas)
export const ARTICLES_AND_COPULAS = new Set([
  'the',
  'a',
  'an',
  'is',
  'am',
  'are',
  'was',
  'were',
  'be',
  'been',
  'being',
  'to',
  'of',
  'do',
  'does',
  'did',
]);

// Multi-word phrase mapping for fallback chunking
const SUB_PHRASE_DICTIONARY: Record<string, string> = {
  'thank you': 'THANK_YOU',
  'thanks a lot': 'THANK_YOU',
  'how are you': 'HOW_ARE_YOU',
  'good bye': 'GOODBYE',
  'bye bye': 'GOODBYE',
  'my name': 'NAME',
  'your name': 'NAME',
};

// Single-word gloss dictionary
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
  // Pronouns
  i: 'I',
  me: 'I',
  my: 'MY',
  you: 'YOU',
  u: 'YOU',
  your: 'YOUR',
  ur: 'YOUR',
  we: 'WE',
  us: 'WE',
  // Question words
  what: 'WHAT',
  where: 'WHERE',
  who: 'WHO',
  why: 'WHY',
  when: 'WHEN',
  how: 'HOW',
  which: 'WHICH',
  // Essentials
  hospital: 'HOSPITAL',
  doctor: 'DOCTOR',
  police: 'POLICE',
  ambulance: 'AMBULANCE',
  family: 'FAMILY',
};

// Grammatical role sets for rule-based ISL reordering
const QUESTION_GLOSSES = new Set(['WHAT', 'WHERE', 'WHO', 'WHY', 'WHEN', 'HOW', 'WHICH']);
const VERB_GLOSSES = new Set(['EAT', 'DRINK', 'HELP', 'STOP', 'LOVE', 'NAME', 'SEE', 'MEET']);
const OBJECT_NOUN_GLOSSES = new Set([
  'FOOD',
  'WATER',
  'HOME',
  'FRIEND',
  'NAME',
  'HOSPITAL',
  'DOCTOR',
  'POLICE',
  'AMBULANCE',
  'FAMILY',
]);
const SUBJECT_PRONOUNS = new Set(['I', 'YOU', 'YOUR', 'MY', 'WE', 'HE', 'SHE']);

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
  // e.g. [I, EAT, FOOD] -> [I, FOOD, EAT]; [DRINK, WATER] -> [WATER, DRINK]
  let reorderedClause = [...nonQuestions];
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
 * Parses plain text input into sequential gloss tokens with fingerspelling fallback.
 */
function parseTokensRaw(rawTrimmed: string): GlossToken[] {
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
    const normalizedWord = rawWord.toLowerCase().replace(/[^\p{L}\p{N}']/gu, '');

    if (!normalizedWord) {
      i++;
      continue;
    }

    // Drop pure articles and copula forms ("is", "are", "the", "a")
    if (ARTICLES_AND_COPULAS.has(normalizedWord)) {
      i++;
      continue;
    }

    // Check single word dictionary (English or Indic language tables)
    const matchedGloss =
      WORD_GLOSS_DICTIONARY[normalizedWord] || INDIC_VOCABULARY_MAP[normalizedWord];

    if (matchedGloss) {
      tokens.push({
        originalText: rawWord,
        gloss: matchedGloss,
        displayText: matchedGloss,
        hasSign: true,
      });
    } else {
      // Fingerspelling fallback for names/unrecognized words in Latin script
      if (normalizedWord.length <= 8 && /^[a-z]+$/.test(normalizedWord)) {
        for (const letter of normalizedWord.toUpperCase()) {
          tokens.push({
            originalText: letter,
            gloss: letter,
            displayText: letter,
            hasSign: true,
            isFingerspelled: true,
          });
        }
      } else {
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

  return tokens;
}

/**
 * Returns full parse details including English and ISL order comparisons.
 */
export function getTextToGlossDetails(
  inputText: string,
  language: 'ISL' | 'ASL' = 'ISL'
): TextToGlossDetails {
  if (!inputText || !inputText.trim()) {
    return {
      tokens: [],
      englishOrderText: '',
      islOrderText: '',
      reordered: false,
    };
  }

  const rawTrimmed = inputText.trim();
  const normalized = normalizeText(rawTrimmed);

  // Check Full Phrase Table
  if (FULL_PHRASE_TABLE[normalized]) {
    const entry = FULL_PHRASE_TABLE[normalized];
    const phraseTokens =
      language === 'ASL' && entry.aslTokens ? entry.aslTokens : entry.islTokens;

    const tokens: GlossToken[] = phraseTokens.map((t) => ({
      originalText: t.word,
      gloss: t.gloss,
      displayText: t.gloss,
      hasSign: true,
    }));

    const englishOrder = (entry.aslTokens || entry.islTokens).map((t) => t.gloss).join(' ');
    const islOrder = entry.islTokens.map((t) => t.gloss).join(' ');

    return {
      tokens,
      englishOrderText: englishOrder,
      islOrderText: islOrder,
      reordered: englishOrder !== islOrder,
    };
  }

  // Parse raw English-ordered tokens
  const englishTokens = parseTokensRaw(rawTrimmed);
  const englishOrderText = englishTokens
    .map((t) => t.gloss || t.originalText)
    .filter(Boolean)
    .join(' ');

  if (language === 'ISL') {
    const islTokens = reorderGlossTokensToISL(englishTokens);
    const islOrderText = islTokens
      .map((t) => t.gloss || t.originalText)
      .filter(Boolean)
      .join(' ');

    return {
      tokens: islTokens,
      englishOrderText,
      islOrderText,
      reordered: englishOrderText !== islOrderText,
    };
  }

  // ASL remains in natural direct order
  return {
    tokens: englishTokens,
    englishOrderText,
    islOrderText: englishOrderText,
    reordered: false,
  };
}

/**
 * Main parser entry point returning sequential GlossToken array for the avatar stage.
 */
export const parseTextToGlosses = (
  inputText: string,
  language: 'ISL' | 'ASL' = 'ISL'
): GlossToken[] => {
  return getTextToGlossDetails(inputText, language).tokens;
};
