// src/ml/demoPhrases.ts — Scripted Demo Phrases for ISL and ASL
// Restricts vocabulary strictly to the 20 target vocabulary words.

export interface DemoPhrase {
  id: string;
  text: string;
  words: string[];
  glossSequence: string[];
  confidence: number;
  triggerGesture?: 'open_palm' | 'thumbs_up' | 'fist' | 'pointing' | 'ok_sign';
}

export const DEMO_PHRASES: DemoPhrase[] = [
  {
    id: 'phrase_1',
    text: 'Hello, how are you?',
    words: ['Hello,', 'how', 'are', 'you?'],
    glossSequence: ['HELLO', 'HOW_ARE_YOU'],
    confidence: 0.95,
    triggerGesture: 'open_palm',
  },
  {
    id: 'phrase_2',
    text: 'Thank you, my friend!',
    words: ['Thank', 'you,', 'my', 'friend!'],
    glossSequence: ['THANK_YOU', 'FRIEND'],
    confidence: 0.96,
  },
  {
    id: 'phrase_3',
    text: 'Please help me!',
    words: ['Please', 'help', 'me!'],
    glossSequence: ['PLEASE', 'HELP'],
    confidence: 0.94,
    triggerGesture: 'pointing',
  },
  {
    id: 'phrase_4',
    text: 'Sorry, please forgive me.',
    words: ['Sorry,', 'please', 'forgive', 'me.'],
    glossSequence: ['SORRY', 'PLEASE'],
    confidence: 0.92,
  },
  {
    id: 'phrase_5',
    text: 'Yes, that is good.',
    words: ['Yes,', 'that', 'is', 'good.'],
    glossSequence: ['YES', 'GOOD'],
    confidence: 0.95,
    triggerGesture: 'thumbs_up',
  },
  {
    id: 'phrase_6',
    text: 'No, thank you.',
    words: ['No,', 'thank', 'you.'],
    glossSequence: ['NO', 'THANK_YOU'],
    confidence: 0.93,
    triggerGesture: 'fist',
  },
  {
    id: 'phrase_7',
    text: 'Goodbye, my friend!',
    words: ['Goodbye,', 'my', 'friend!'],
    glossSequence: ['GOODBYE', 'FRIEND'],
    confidence: 0.95,
  },
  {
    id: 'phrase_8',
    text: 'Please, I need water.',
    words: ['Please,', 'I', 'need', 'water.'],
    glossSequence: ['PLEASE', 'WATER'],
    confidence: 0.92,
  },
  {
    id: 'phrase_9',
    text: 'Eat food.',
    words: ['Eat', 'food.'],
    glossSequence: ['EAT', 'FOOD'],
    confidence: 0.94,
  },
  {
    id: 'phrase_10',
    text: 'Drink water.',
    words: ['Drink', 'water.'],
    glossSequence: ['DRINK', 'WATER'],
    confidence: 0.95,
  },
  {
    id: 'phrase_11',
    text: 'I love home.',
    words: ['I', 'love', 'home.'],
    glossSequence: ['LOVE', 'HOME'],
    confidence: 0.93,
  },
];

// Mapping from detected gesture type to preferred phrase index
export const GESTURE_TO_PHRASE_INDEX: Record<string, number> = {
  open_palm: 0,   // "Hello, how are you?"
  pointing: 2,    // "Please help me!"
  thumbs_up: 4,   // "Yes, that is good."
  fist: 5,        // "No, thank you."
};
