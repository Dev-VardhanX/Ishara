// src/ml/demoPhrases.ts — Scripted Demo Phrases for ISL and ASL
// Each phrase contains human text, gloss sequence, confidence score (0.82-0.96),
// and optional gesture binding for live presentation demos.

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
    glossSequence: ['HELLO', 'HOW', 'YOU'],
    confidence: 0.95,
    triggerGesture: 'open_palm',
  },
  {
    id: 'phrase_2',
    text: 'Nice to meet you.',
    words: ['Nice', 'to', 'meet', 'you.'],
    glossSequence: ['NICE', 'MEET', 'YOU'],
    confidence: 0.92,
  },
  {
    id: 'phrase_3',
    text: 'I am happy to meet you today.',
    words: ['I', 'am', 'happy', 'to', 'meet', 'you', 'today.'],
    glossSequence: ['I', 'HAPPY', 'MEET', 'YOU', 'TODAY'],
    confidence: 0.89,
  },
  {
    id: 'phrase_4',
    text: 'Thank you very much.',
    words: ['Thank', 'you', 'very', 'much.'],
    glossSequence: ['THANK_YOU', 'VERY', 'MUCH'],
    confidence: 0.96,
    triggerGesture: 'ok_sign',
  },
  {
    id: 'phrase_5',
    text: 'Please help me.',
    words: ['Please', 'help', 'me.'],
    glossSequence: ['PLEASE', 'HELP', 'ME'],
    confidence: 0.93,
    triggerGesture: 'pointing',
  },
  {
    id: 'phrase_6',
    text: 'Sorry, I did not understand.',
    words: ['Sorry,', 'I', 'did', 'not', 'understand.'],
    glossSequence: ['SORRY', 'I', 'NOT', 'UNDERSTAND'],
    confidence: 0.86,
  },
  {
    id: 'phrase_7',
    text: 'Good morning.',
    words: ['Good', 'morning.'],
    glossSequence: ['GOOD', 'MORNING'],
    confidence: 0.94,
  },
  {
    id: 'phrase_8',
    text: 'Where is the nearest metro station?',
    words: ['Where', 'is', 'the', 'nearest', 'metro', 'station?'],
    glossSequence: ['WHERE', 'NEAREST', 'METRO', 'STATION'],
    confidence: 0.83,
  },
  {
    id: 'phrase_9',
    text: 'I need a doctor.',
    words: ['I', 'need', 'a', 'doctor.'],
    glossSequence: ['I', 'NEED', 'DOCTOR'],
    confidence: 0.88,
  },
  {
    id: 'phrase_10',
    text: 'Yes, I understand.',
    words: ['Yes,', 'I', 'understand.'],
    glossSequence: ['YES', 'I', 'UNDERSTAND'],
    confidence: 0.95,
    triggerGesture: 'thumbs_up',
  },
  {
    id: 'phrase_11',
    text: 'No, thank you.',
    words: ['No,', 'thank', 'you.'],
    glossSequence: ['NO', 'THANK_YOU'],
    confidence: 0.91,
    triggerGesture: 'fist',
  },
];

// Mapping from detected gesture type to preferred phrase ID
export const GESTURE_TO_PHRASE_INDEX: Record<string, number> = {
  open_palm: 0,   // "Hello, how are you?"
  ok_sign: 3,     // "Thank you very much."
  pointing: 4,    // "Please help me."
  thumbs_up: 9,   // "Yes, I understand."
  fist: 10,       // "No, thank you."
};
