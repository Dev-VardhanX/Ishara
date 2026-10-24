// src/ml/islClassifier.ts — Real-time ISL 20-Sign Landmark & Kinematic Recognizer
// Provides accurate geometric feature extraction, 2-hand relation checks,
// motion buffer kinematics, candidate debouncing, and sentence-building logic.

import { Landmark, RecognitionResult, Recognizer } from '../lib/recognizer';

export interface ISLSignDefinition {
  gloss: string;
  label: string;
  text: string;
  description: string;
  category: 'greetings' | 'basic' | 'needs' | 'emergency' | 'social';
  twoHanded: boolean;
}

export const ISL_VOCABULARY: Record<string, ISLSignDefinition> = {
  HELLO: {
    gloss: 'HELLO',
    label: 'Hello',
    text: 'Hello',
    description: 'Open palm raised near temple/brow or saluting forward',
    category: 'greetings',
    twoHanded: false,
  },
  THANK_YOU: {
    gloss: 'THANK_YOU',
    label: 'Thank You',
    text: 'Thank you',
    description: 'Flat open hand moving outward and down from chin',
    category: 'greetings',
    twoHanded: false,
  },
  PLEASE: {
    gloss: 'PLEASE',
    label: 'Please',
    text: 'Please',
    description: 'Two hands pressed together in Namaste or flat hand on chest',
    category: 'greetings',
    twoHanded: true,
  },
  SORRY: {
    gloss: 'SORRY',
    label: 'Sorry',
    text: 'Sorry',
    description: 'Fist rubbing chest/heart in circular motion',
    category: 'greetings',
    twoHanded: false,
  },
  YES: {
    gloss: 'YES',
    label: 'Yes',
    text: 'Yes',
    description: 'Closed fist or thumbs-up nodding up and down',
    category: 'basic',
    twoHanded: false,
  },
  NO: {
    gloss: 'NO',
    label: 'No',
    text: 'No',
    description: 'Index finger wagging side-to-side or index+middle snapping shut',
    category: 'basic',
    twoHanded: false,
  },
  GOODBYE: {
    gloss: 'GOODBYE',
    label: 'Goodbye',
    text: 'Goodbye',
    description: 'Open palm facing camera waving horizontally side-to-side',
    category: 'greetings',
    twoHanded: false,
  },
  GOOD: {
    gloss: 'GOOD',
    label: 'Good',
    text: 'Good',
    description: 'Clear upright thumbs-up held steady',
    category: 'basic',
    twoHanded: false,
  },
  BAD: {
    gloss: 'BAD',
    label: 'Bad',
    text: 'Bad',
    description: 'Thumbs-down pointing downwards',
    category: 'basic',
    twoHanded: false,
  },
  HOW_ARE_YOU: {
    gloss: 'HOW_ARE_YOU',
    label: 'How Are You',
    text: 'How are you?',
    description: 'Two open palms cupped upward at chest opening outward',
    category: 'greetings',
    twoHanded: true,
  },
  HELP: {
    gloss: 'HELP',
    label: 'Help',
    text: 'Help',
    description: 'Closed fist resting on flat upward-facing palm, lifting together',
    category: 'emergency',
    twoHanded: true,
  },
  STOP: {
    gloss: 'STOP',
    label: 'Stop',
    text: 'Stop',
    description: 'Vertical open palm facing straight forward barrier',
    category: 'basic',
    twoHanded: false,
  },
  EAT: {
    gloss: 'EAT',
    label: 'Eat',
    text: 'Eat',
    description: 'Bunched fingertips (all 5 touching) brought toward mouth',
    category: 'needs',
    twoHanded: false,
  },
  DRINK: {
    gloss: 'DRINK',
    label: 'Drink',
    text: 'Drink',
    description: 'C-handshape cupped hand tilted towards mouth like drinking',
    category: 'needs',
    twoHanded: false,
  },
  WATER: {
    gloss: 'WATER',
    label: 'Water',
    text: 'Water',
    description: 'W-handshape (3 middle fingers extended) tapped against chin',
    category: 'needs',
    twoHanded: false,
  },
  FOOD: {
    gloss: 'FOOD',
    label: 'Food',
    text: 'Food',
    description: 'Bunched fingertips tapping mouth/chin repeatedly',
    category: 'needs',
    twoHanded: false,
  },
  HOME: {
    gloss: 'HOME',
    label: 'Home',
    text: 'Home',
    description: 'Two hands open with fingertips touching to form a roof gable',
    category: 'social',
    twoHanded: true,
  },
  FRIEND: {
    gloss: 'FRIEND',
    label: 'Friend',
    text: 'Friend',
    description: 'Two hands clasping or index fingers hooked together in front of chest',
    category: 'social',
    twoHanded: true,
  },
  NAME: {
    gloss: 'NAME',
    label: 'Name',
    text: 'Name',
    description: 'Index and middle fingers extended together (H/U shape) tapping',
    category: 'social',
    twoHanded: false,
  },
  LOVE: {
    gloss: 'LOVE',
    label: 'Love',
    text: 'Love',
    description: 'Two wrists crossed over chest OR ILY handshape (thumb, index, pinky)',
    category: 'social',
    twoHanded: false,
  },
};

// 21 MediaPipe Landmark indices
const WRIST = 0;
const THUMB_CMC = 1;
const THUMB_MCP = 2;
const THUMB_IP = 3;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_DIP = 7;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_DIP = 11;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_PIP = 14;
const RING_DIP = 15;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_DIP = 19;
const PINKY_TIP = 20;

const dist2D = (a: Landmark, b: Landmark): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

interface HandFeatures {
  wrist: Landmark;
  palmSize: number;
  thumbExtended: boolean;
  thumbUp: boolean;
  thumbDown: boolean;
  indexExtended: boolean;
  indexCurled: boolean;
  middleExtended: boolean;
  middleCurled: boolean;
  ringExtended: boolean;
  ringCurled: boolean;
  pinkyExtended: boolean;
  pinkyCurled: boolean;
  openPalm: boolean;
  fist: boolean;
  bunchedTips: boolean;
  cHandshape: boolean;
  wHandshape: boolean;
  ilySign: boolean;
  nameShape: boolean;
  pointing: boolean;
  isFaceZone: boolean;
  isChestZone: boolean;
  isLowerZone: boolean;
}

function extractHandFeatures(landmarks: Landmark[]): HandFeatures | null {
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[WRIST];
  const palmSize = dist2D(wrist, landmarks[MIDDLE_MCP]) || 0.15;
  const nDist = (i: number, j: number) => dist2D(landmarks[i], landmarks[j]) / palmSize;

  // Finger extensions (scale normalized)
  const thumbExtended = nDist(THUMB_TIP, THUMB_MCP) > 0.65 && nDist(THUMB_TIP, MIDDLE_MCP) > 0.72;
  const indexExtended = nDist(INDEX_TIP, WRIST) > 1.25 && nDist(INDEX_TIP, INDEX_MCP) > 0.60;
  const middleExtended = nDist(MIDDLE_TIP, WRIST) > 1.25 && nDist(MIDDLE_TIP, MIDDLE_MCP) > 0.60;
  const ringExtended = nDist(RING_TIP, WRIST) > 1.25 && nDist(RING_TIP, RING_MCP) > 0.60;
  const pinkyExtended = nDist(PINKY_TIP, WRIST) > 1.20 && nDist(PINKY_TIP, PINKY_MCP) > 0.55;

  // Finger curls
  const indexCurled = nDist(INDEX_TIP, WRIST) < 1.15 || nDist(INDEX_TIP, INDEX_MCP) < 0.45;
  const middleCurled = nDist(MIDDLE_TIP, WRIST) < 1.15 || nDist(MIDDLE_TIP, MIDDLE_MCP) < 0.45;
  const ringCurled = nDist(RING_TIP, WRIST) < 1.15 || nDist(RING_TIP, RING_MCP) < 0.45;
  const pinkyCurled = nDist(PINKY_TIP, WRIST) < 1.15 || nDist(PINKY_TIP, PINKY_MCP) < 0.45;

  // Thumb directions (in screen coords, smaller y is higher up)
  const thumbUp = thumbExtended && landmarks[THUMB_TIP].y < landmarks[THUMB_MCP].y - 0.04;
  const thumbDown = thumbExtended && landmarks[THUMB_TIP].y > landmarks[THUMB_MCP].y + 0.04;

  // Compound Shapes
  const openPalm = indexExtended && middleExtended && ringExtended && pinkyExtended;
  const fist = indexCurled && middleCurled && ringCurled && pinkyCurled && !thumbUp;

  // Bunched fingertips: all 5 tips close together (eating/food handshape)
  const bunchedTips =
    nDist(THUMB_TIP, INDEX_TIP) < 0.45 &&
    nDist(THUMB_TIP, MIDDLE_TIP) < 0.45 &&
    nDist(THUMB_TIP, RING_TIP) < 0.50 &&
    nDist(THUMB_TIP, PINKY_TIP) < 0.55;

  // C-handshape: curved hand as if holding a glass
  const cHandshape =
    !openPalm &&
    !fist &&
    !bunchedTips &&
    nDist(THUMB_TIP, INDEX_TIP) >= 0.38 &&
    nDist(THUMB_TIP, INDEX_TIP) <= 1.15 &&
    landmarks[THUMB_TIP].y < landmarks[WRIST].y + 0.08;

  // W-handshape: index, middle, ring extended, thumb holding pinky
  const wHandshape =
    indexExtended &&
    middleExtended &&
    ringExtended &&
    (pinkyCurled || nDist(THUMB_TIP, PINKY_TIP) < 0.60);

  // ILY (I Love You) handshape: thumb, index, pinky extended; middle and ring curled
  const ilySign = thumbExtended && indexExtended && pinkyExtended && middleCurled && ringCurled;

  // Name shape: index + middle extended together (H/U shape)
  const nameShape =
    indexExtended &&
    middleExtended &&
    ringCurled &&
    pinkyCurled &&
    nDist(INDEX_TIP, MIDDLE_TIP) < 0.35;

  // Pointing: only index extended
  const pointing = indexExtended && middleCurled && ringCurled && pinkyCurled && !thumbExtended;

  // Hand height zones in frame
  const avgY = (wrist.y + landmarks[MIDDLE_MCP].y) / 2;
  const isFaceZone = avgY < 0.42;
  const isChestZone = avgY >= 0.38 && avgY <= 0.72;
  const isLowerZone = avgY > 0.70;

  return {
    wrist,
    palmSize,
    thumbExtended,
    thumbUp,
    thumbDown,
    indexExtended,
    indexCurled,
    middleExtended,
    middleCurled,
    ringExtended,
    ringCurled,
    pinkyExtended,
    pinkyCurled,
    openPalm,
    fist,
    bunchedTips,
    cHandshape,
    wHandshape,
    ilySign,
    nameShape,
    pointing,
    isFaceZone,
    isChestZone,
    isLowerZone,
  };
}

interface FrameRecord {
  time: number;
  wristX: number;
  wristY: number;
  tipX: number;
  tipY: number;
  handCount: number;
}

export interface ISLClassificationResult {
  gloss: string;
  label: string;
  text: string;
  confidence: number;
  category: string;
}

export class ISLClassifier {
  private history: FrameRecord[] = [];
  private readonly maxHistoryLength = 25; // ~0.8s at 30fps

  public recordFrame(hands: Landmark[][], timestamp: number = performance.now()): void {
    if (!hands || hands.length === 0 || !hands[0] || hands[0].length < 21) {
      return;
    }
    const h0 = hands[0];
    this.history.push({
      time: timestamp,
      wristX: h0[WRIST].x,
      wristY: h0[WRIST].y,
      tipX: h0[MIDDLE_TIP].x,
      tipY: h0[MIDDLE_TIP].y,
      handCount: hands.length,
    });

    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
  }

  public classify(hands: Landmark[][]): ISLClassificationResult | null {
    if (!hands || hands.length === 0) return null;

    const f0 = extractHandFeatures(hands[0]);
    if (!f0) return null;

    const f1 = hands.length > 1 && hands[1] ? extractHandFeatures(hands[1]) : null;

    // Movement analysis from history window
    let dx = 0;
    let dy = 0;
    let oscillationsX = 0;
    let oscillationsY = 0;

    if (this.history.length >= 6) {
      const recent = this.history.slice(-15);
      const first = recent[0];
      const last = recent[recent.length - 1];
      dx = last.wristX - first.wristX;
      dy = last.wristY - first.wristY;

      // Count horizontal direction reversals for waving
      let prevDirX = 0;
      for (let i = 1; i < recent.length; i++) {
        const step = recent[i].wristX - recent[i - 1].wristX;
        if (Math.abs(step) > 0.008) {
          const dir = Math.sign(step);
          if (prevDirX !== 0 && dir !== prevDirX) {
            oscillationsX++;
          }
          prevDirX = dir;
        }
      }

      // Count vertical direction reversals for nodding
      let prevDirY = 0;
      for (let i = 1; i < recent.length; i++) {
        const step = recent[i].wristY - recent[i - 1].wristY;
        if (Math.abs(step) > 0.008) {
          const dir = Math.sign(step);
          if (prevDirY !== 0 && dir !== prevDirY) {
            oscillationsY++;
          }
          prevDirY = dir;
        }
      }
    }

    // ==========================================
    // 1. TWO-HANDED ISL SIGNS (when hands.length >= 2)
    // ==========================================
    if (f1 && hands.length >= 2) {
      const wristDist = dist2D(f0.wrist, f1.wrist);
      const tipDist = dist2D(hands[0][MIDDLE_TIP], hands[1][MIDDLE_TIP]);
      const indexTipDist = dist2D(hands[0][INDEX_TIP], hands[1][INDEX_TIP]);

      // 1.1 PLEASE (Namaste / Folded prayer hands in front of chest)
      const fingersUp0 = hands[0][MIDDLE_TIP].y < f0.wrist.y - 0.08;
      const fingersUp1 = hands[1][MIDDLE_TIP].y < f1.wrist.y - 0.08;
      if (
        (f0.openPalm || (f0.indexExtended && f0.middleExtended)) &&
        (f1.openPalm || (f1.indexExtended && f1.middleExtended)) &&
        fingersUp0 &&
        fingersUp1 &&
        tipDist < 0.18 &&
        wristDist < 0.28 &&
        (f0.isChestZone || f0.isFaceZone)
      ) {
        return {
          gloss: 'PLEASE',
          label: 'Please',
          text: 'Please',
          confidence: 0.96,
          category: 'greetings',
        };
      }

      // 1.2 HOME (Roof / Inverted V: tips touching at top, wrists spread wider apart)
      if (
        (f0.openPalm || (f0.indexExtended && f0.middleExtended)) &&
        (f1.openPalm || (f1.indexExtended && f1.middleExtended)) &&
        tipDist < 0.14 &&
        wristDist > tipDist * 1.5 &&
        wristDist > 0.15 &&
        f0.isChestZone
      ) {
        return {
          gloss: 'HOME',
          label: 'Home',
          text: 'Home',
          confidence: 0.95,
          category: 'social',
        };
      }

      // 1.3 HELP (Base horizontal flat palm supporting a fist/thumbs-up)
      const f0IsFist = f0.fist || f0.thumbUp;
      const f1IsFist = f1.fist || f1.thumbUp;
      const f0IsPalm = f0.openPalm;
      const f1IsPalm = f1.openPalm;
      if (
        ((f0IsFist && f1IsPalm) || (f1IsFist && f0IsPalm)) &&
        wristDist < 0.24
      ) {
        return {
          gloss: 'HELP',
          label: 'Help',
          text: 'Help',
          confidence: 0.94,
          category: 'emergency',
        };
      }

      // 1.4 FRIEND (Hands clasped or index fingers hooked together in front of body)
      if (
        (indexTipDist < 0.14 || tipDist < 0.14) &&
        wristDist < 0.30 &&
        !fingersUp0 &&
        !fingersUp1 &&
        f0.isChestZone
      ) {
        return {
          gloss: 'FRIEND',
          label: 'Friend',
          text: 'Friend',
          confidence: 0.92,
          category: 'social',
        };
      }

      // 1.5 HOW_ARE_YOU (Two cupped / open palms facing upward in front of chest)
      if (
        f0.openPalm &&
        f1.openPalm &&
        wristDist >= 0.16 &&
        wristDist <= 0.65 &&
        tipDist > 0.20 &&
        f0.isChestZone &&
        f1.isChestZone
      ) {
        return {
          gloss: 'HOW_ARE_YOU',
          label: 'How Are You',
          text: 'How are you?',
          confidence: 0.93,
          category: 'greetings',
        };
      }

      // 1.6 LOVE (Two hands crossed at wrists over chest)
      if (wristDist < 0.16 && f0.isChestZone && f1.isChestZone) {
        return {
          gloss: 'LOVE',
          label: 'Love',
          text: 'Love',
          confidence: 0.92,
          category: 'social',
        };
      }
    }

    // ==========================================
    // 2. SINGLE-HANDED / PRIMARY HAND ISL SIGNS
    // ==========================================

    // 2.1 LOVE (ILY handshape: thumb, index, pinky extended)
    if (f0.ilySign) {
      return {
        gloss: 'LOVE',
        label: 'Love',
        text: 'Love',
        confidence: 0.96,
        category: 'social',
      };
    }

    // 2.2 GOODBYE (Open palm waving horizontally side-to-side)
    if (f0.openPalm && oscillationsX >= 2 && hands[0][MIDDLE_TIP].y < f0.wrist.y) {
      return {
        gloss: 'GOODBYE',
        label: 'Goodbye',
        text: 'Goodbye',
        confidence: 0.94,
        category: 'greetings',
      };
    }

    // 2.3 HELLO (Open palm raised high near temple/brow)
    if (
      f0.openPalm &&
      hands[0][MIDDLE_TIP].y < 0.35 &&
      f0.wrist.y < 0.55 &&
      oscillationsX < 2
    ) {
      return {
        gloss: 'HELLO',
        label: 'Hello',
        text: 'Hello',
        confidence: 0.93,
        category: 'greetings',
      };
    }

    // 2.4 THANK_YOU (Open flat hand near chin/mouth moving forward/down)
    if (
      f0.openPalm &&
      hands[0][INDEX_TIP].y < 0.44 &&
      (dy > 0.015 || hands[0][INDEX_TIP].y > 0.32)
    ) {
      return {
        gloss: 'THANK_YOU',
        label: 'Thank You',
        text: 'Thank you',
        confidence: 0.92,
        category: 'greetings',
      };
    }

    // 2.5 STOP (Open vertical palm held steady facing camera like a barrier)
    if (
      f0.openPalm &&
      hands[0][MIDDLE_TIP].y < f0.wrist.y - 0.12 &&
      f0.isChestZone &&
      oscillationsX < 2
    ) {
      return {
        gloss: 'STOP',
        label: 'Stop',
        text: 'Stop',
        confidence: 0.91,
        category: 'basic',
      };
    }

    // 2.6 EAT (Bunched fingertips brought toward mouth)
    if (f0.bunchedTips && f0.isFaceZone) {
      return {
        gloss: 'EAT',
        label: 'Eat',
        text: 'Eat',
        confidence: 0.94,
        category: 'needs',
      };
    }

    // 2.7 FOOD (Bunched fingertips tapping near mouth or flat hand at mouth)
    if (f0.bunchedTips && f0.isFaceZone && oscillationsY >= 1) {
      return {
        gloss: 'FOOD',
        label: 'Food',
        text: 'Food',
        confidence: 0.93,
        category: 'needs',
      };
    }

    // 2.8 DRINK (C-handshape held like a cup tilted toward mouth)
    if (f0.cHandshape && f0.isFaceZone) {
      return {
        gloss: 'DRINK',
        label: 'Drink',
        text: 'Drink',
        confidence: 0.93,
        category: 'needs',
      };
    }

    // 2.9 WATER (W-handshape tapped against chin)
    if (f0.wHandshape && (f0.isFaceZone || hands[0][INDEX_TIP].y < 0.45)) {
      return {
        gloss: 'WATER',
        label: 'Water',
        text: 'Water',
        confidence: 0.95,
        category: 'needs',
      };
    }

    // 2.10 YES (Closed fist or thumbs-up nodding up and down vertically)
    if ((f0.fist || f0.thumbUp) && oscillationsY >= 1) {
      return {
        gloss: 'YES',
        label: 'Yes',
        text: 'Yes',
        confidence: 0.94,
        category: 'basic',
      };
    }

    // 2.11 GOOD (Clear steady upright thumbs-up)
    if (f0.thumbUp && f0.indexCurled && f0.middleCurled && f0.ringCurled && f0.pinkyCurled) {
      return {
        gloss: 'GOOD',
        label: 'Good',
        text: 'Good',
        confidence: 0.95,
        category: 'basic',
      };
    }

    // 2.12 BAD (Clear steady thumbs-down)
    if (f0.thumbDown && f0.indexCurled && f0.middleCurled && f0.ringCurled && f0.pinkyCurled) {
      return {
        gloss: 'BAD',
        label: 'Bad',
        text: 'Bad',
        confidence: 0.95,
        category: 'basic',
      };
    }

    // 2.13 NO (Index finger wagging side to side OR index+middle snapping shut)
    if (
      (f0.pointing && oscillationsX >= 2) ||
      (f0.nameShape && oscillationsX >= 2)
    ) {
      return {
        gloss: 'NO',
        label: 'No',
        text: 'No',
        confidence: 0.92,
        category: 'basic',
      };
    }

    // 2.14 NAME (Index + Middle extended together like H/U shape held near chest)
    if (f0.nameShape && f0.isChestZone) {
      return {
        gloss: 'NAME',
        label: 'Name',
        text: 'Name',
        confidence: 0.91,
        category: 'social',
      };
    }

    // 2.15 SORRY (Fist held against chest/heart area)
    if (f0.fist && f0.isChestZone) {
      return {
        gloss: 'SORRY',
        label: 'Sorry',
        text: 'Sorry',
        confidence: 0.90,
        category: 'greetings',
      };
    }

    // 2.16 PLEASE (Single-hand fallback: flat open palm gently placed over chest/heart)
    if (f0.openPalm && f0.isChestZone && Math.abs(dx) < 0.05 && Math.abs(dy) < 0.05) {
      return {
        gloss: 'PLEASE',
        label: 'Please',
        text: 'Please',
        confidence: 0.84,
        category: 'greetings',
      };
    }

    // Unknown or low-confidence gesture -> Return null (don't display random words)
    return null;
  }

  public reset(): void {
    this.history = [];
  }
}

export interface ISLRecognizerCallbacks {
  onWordRecognized?: (gloss: string, text: string, confidence: number) => void;
  onSentenceUpdated?: (fullSentence: string, words: string[]) => void;
  onCandidateUpdate?: (gloss: string | null, progress: number) => void;
  onProgressUpdated?: (progress: number) => void;
  onWordRevealed?: (word: string, currentText: string) => void;
  onPhraseCompleted?: (phrase: any, fullText: string) => void;
}

/**
 * ISLRecognizer
 * Main recognizer engine for the Ishara application.
 * Manages real-time multi-hand classification, candidate stability debouncing,
 * cooldown prevention, and continuous sentence building.
 */
export class ISLRecognizer implements Recognizer {
  public name = 'Ishara ISL 20-Sign Realtime Recognizer (v1)';

  private classifier = new ISLClassifier();
  private callbacks: ISLRecognizerCallbacks = {};

  // Sentence & word accumulation state
  private sentenceWords: string[] = [];
  private candidateGloss: string | null = null;
  private candidateConfidence: number = 0;
  private candidateStableFrames: number = 0;
  private readonly requiredStableFrames: number = 5; // ~160ms stability threshold

  // Cooldown to avoid duplicate continuous triggers of the same sign
  private lastConfirmedGloss: string | null = null;
  private lastConfirmedTime: number = 0;
  private readonly wordCooldownMs: number = 1400; // 1.4s cooldown for identical word

  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(callbacks?: ISLRecognizerCallbacks) {
    if (callbacks) {
      this.callbacks = callbacks;
    }
    this.setupShortcuts();
  }

  public setCallbacks(callbacks: ISLRecognizerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  /**
   * Hidden presenter/testing shortcuts: Keys '1' to '9' trigger the corresponding sign directly.
   */
  private setupShortcuts(): void {
    if (typeof window === 'undefined') return;

    this.keydownHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const quickGlosses = [
        'HELLO',
        'THANK_YOU',
        'PLEASE',
        'SORRY',
        'YES',
        'NO',
        'HOW_ARE_YOU',
        'HELP',
        'FRIEND',
      ];

      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        const gloss = quickGlosses[index];
        if (gloss && ISL_VOCABULARY[gloss]) {
          this.triggerManualSign(gloss);
        }
      }
    };

    window.addEventListener('keydown', this.keydownHandler);
  }

  /**
   * Trigger a sign manually (used by gesture simulator chips or presenter shortcuts).
   */
  public triggerManualSign(gloss: string): void {
    const def = ISL_VOCABULARY[gloss];
    if (!def) return;

    this.confirmWord(def.gloss, def.text, 0.95);
  }

  /**
   * Main recognize loop called every video frame.
   * Accepts either Landmark[] (single hand) or Landmark[][] (up to two hands).
   */
  public recognize(
    input: Landmark[] | Landmark[][],
    timestamp: number = performance.now()
  ): RecognitionResult | null {
    // Normalise input to Landmark[][]
    let hands: Landmark[][] = [];
    if (!input || input.length === 0) {
      hands = [];
    } else if (Array.isArray(input[0]) && typeof (input[0] as any).x === 'undefined') {
      hands = input as Landmark[][];
    } else {
      hands = [input as Landmark[]];
    }

    if (hands.length === 0 || !hands[0] || hands[0].length < 21) {
      // No hands in frame: reset candidate
      if (this.candidateStableFrames > 0) {
        this.candidateStableFrames--;
      } else {
        this.candidateGloss = null;
      }
      this.callbacks.onCandidateUpdate?.(null, 0);
      this.callbacks.onProgressUpdated?.(0);
      return null;
    }

    // Update temporal buffer
    this.classifier.recordFrame(hands, timestamp);

    // Classify current gesture
    const result = this.classifier.classify(hands);

    if (!result) {
      // Unknown gesture: decrease stability counter
      if (this.candidateStableFrames > 0) {
        this.candidateStableFrames--;
      } else {
        this.candidateGloss = null;
      }
      const progress = this.candidateStableFrames / this.requiredStableFrames;
      this.callbacks.onCandidateUpdate?.(this.candidateGloss, progress);
      this.callbacks.onProgressUpdated?.(progress);
      return null;
    }

    // Hand held with active candidate
    const isSameAsLastConfirmed =
      result.gloss === this.lastConfirmedGloss &&
      timestamp - this.lastConfirmedTime < this.wordCooldownMs;

    if (result.gloss === this.candidateGloss) {
      if (!isSameAsLastConfirmed) {
        this.candidateStableFrames++;
      }
    } else {
      this.candidateGloss = result.gloss;
      this.candidateConfidence = result.confidence;
      this.candidateStableFrames = isSameAsLastConfirmed ? 0 : 1;
    }

    const progress = Math.min(1.0, this.candidateStableFrames / this.requiredStableFrames);
    this.callbacks.onCandidateUpdate?.(result.gloss, progress);
    this.callbacks.onProgressUpdated?.(progress);

    // If held stable for required frames, commit word to sentence!
    if (this.candidateStableFrames >= this.requiredStableFrames && !isSameAsLastConfirmed) {
      this.confirmWord(result.gloss, result.text, result.confidence, timestamp);
    }

    return {
      gloss: result.gloss,
      confidence: result.confidence,
      landmarksDetected: hands.reduce((sum, h) => sum + h.length, 0),
    };
  }

  private confirmWord(
    gloss: string,
    text: string,
    confidence: number,
    timestamp: number = performance.now()
  ): void {
    this.sentenceWords.push(text);
    this.lastConfirmedGloss = gloss;
    this.lastConfirmedTime = timestamp;
    this.candidateStableFrames = 0;

    const fullSentence = this.sentenceWords.join(' ');

    this.callbacks.onWordRecognized?.(gloss, text, confidence);
    this.callbacks.onSentenceUpdated?.(fullSentence, [...this.sentenceWords]);
    this.callbacks.onWordRevealed?.(text, fullSentence);
    this.callbacks.onPhraseCompleted?.({ text: fullSentence }, fullSentence);
    this.callbacks.onCandidateUpdate?.(gloss, 1.0);
    this.callbacks.onProgressUpdated?.(0);
  }

  public getHoldProgress(): number {
    return Math.min(1.0, this.candidateStableFrames / this.requiredStableFrames);
  }

  public getSentenceWords(): string[] {
    return [...this.sentenceWords];
  }

  public getFullSentence(): string {
    return this.sentenceWords.join(' ');
  }

  public clearSentence(): void {
    this.sentenceWords = [];
    this.candidateGloss = null;
    this.candidateStableFrames = 0;
    this.lastConfirmedGloss = null;
    this.lastConfirmedTime = 0;
    this.callbacks.onSentenceUpdated?.('', []);
    this.callbacks.onCandidateUpdate?.(null, 0);
    this.callbacks.onProgressUpdated?.(0);
  }

  public reset(): void {
    this.classifier.reset();
    this.clearSentence();
  }

  public isCurrentlyRevealing(): boolean {
    return false;
  }

  public triggerPhraseByIndex(index: number): void {
    const quickGlosses = [
      'HELLO',
      'THANK_YOU',
      'PLEASE',
      'SORRY',
      'YES',
      'NO',
      'HOW_ARE_YOU',
      'HELP',
      'FRIEND',
      'WATER',
    ];
    const gloss = quickGlosses[index % quickGlosses.length];
    if (gloss) {
      this.triggerManualSign(gloss);
    }
  }

  public destroy(): void {
    this.reset();
    if (this.keydownHandler && typeof window !== 'undefined') {
      window.removeEventListener('keydown', this.keydownHandler);
      this.keydownHandler = null;
    }
  }
}
