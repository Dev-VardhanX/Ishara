// src/ml/islClassifier.ts — Real-time Multi-Language ISL & ASL Sign Recognizer
// Supports exactly the 20 target vocabulary signs across Greetings, Basic, Needs, and Social categories.
// Maintains separate ISL and ASL gestures, geometric landmark feature extraction,
// 2-hand relation checks, kinematics buffer, candidate debouncing, and sentence formation.

import { Landmark, RecognitionResult, Recognizer } from '../lib/recognizer';
import { buildSentenceFromGlosses, SentenceTranslationResult, normalizeGloss } from './sentenceBuilder';

export type SupportedLanguage = 'ISL' | 'ASL';

export interface SignDefinition {
  id: string;
  gloss: string;
  islGloss: string;
  aslGloss: string;
  label: string;
  text: string;
  category: 'greetings' | 'basic' | 'needs' | 'social';
  twoHanded: boolean;
  description: string;
}

/**
 * Exact 20-word vocabulary contract for Ishara (ISL + ASL).
 */
export const SIGN_VOCABULARY: Record<string, SignDefinition> = {
  // --- Greetings & Everyday Communication ---
  HELLO: {
    id: 'HELLO',
    gloss: 'HELLO',
    islGloss: 'HELLO',
    aslGloss: 'HELLO',
    label: 'Hello',
    text: 'Hello',
    category: 'greetings',
    twoHanded: false,
    description: 'Open palm temple salute (ISL) / formal forehead salute (ASL)',
  },
  THANK_YOU: {
    id: 'THANK_YOU',
    gloss: 'THANK_YOU',
    islGloss: 'THANK_YOU',
    aslGloss: 'THANK_YOU',
    label: 'Thank You',
    text: 'thank you',
    category: 'greetings',
    twoHanded: false,
    description: 'Flat hand moving outward and down from chin',
  },
  PLEASE: {
    id: 'PLEASE',
    gloss: 'PLEASE',
    islGloss: 'PLEASE',
    aslGloss: 'PLEASE',
    label: 'Please',
    text: 'please',
    category: 'greetings',
    twoHanded: true,
    description: 'Two-hand Namaste folded palms (ISL) / flat circular chest rub (ASL)',
  },
  SORRY: {
    id: 'SORRY',
    gloss: 'SORRY',
    islGloss: 'SORRY',
    aslGloss: 'SORRY',
    label: 'Sorry',
    text: 'sorry',
    category: 'greetings',
    twoHanded: false,
    description: 'Closed fist moving in a circular motion on chest',
  },
  GOODBYE: {
    id: 'GOODBYE',
    gloss: 'GOODBYE',
    islGloss: 'GOODBYE',
    aslGloss: 'GOODBYE',
    label: 'Goodbye',
    text: 'Goodbye',
    category: 'greetings',
    twoHanded: false,
    description: 'Open hand facing camera waving side-to-side horizontally',
  },
  HOW_ARE_YOU: {
    id: 'HOW_ARE_YOU',
    gloss: 'HOW_ARE_YOU',
    islGloss: 'HOW_ARE_YOU',
    aslGloss: 'HOW_ARE_YOU',
    label: 'How Are You',
    text: 'how are you',
    category: 'greetings',
    twoHanded: true,
    description: 'Two cupped palms opening outward (ISL) / how + you curved hands (ASL)',
  },

  // --- Basic Needs & Responses ---
  YES: {
    id: 'YES',
    gloss: 'YES',
    islGloss: 'YES',
    aslGloss: 'YES',
    label: 'Yes',
    text: 'yes',
    category: 'basic',
    twoHanded: false,
    description: 'Closed fist or thumbs-up nodding up and down vertically',
  },
  NO: {
    id: 'NO',
    gloss: 'NO',
    islGloss: 'NO',
    aslGloss: 'NO',
    label: 'No',
    text: 'no',
    category: 'basic',
    twoHanded: false,
    description: 'Index finger wagging side-to-side (ISL) / index+middle snapping shut (ASL)',
  },
  GOOD: {
    id: 'GOOD',
    gloss: 'GOOD',
    islGloss: 'GOOD',
    aslGloss: 'GOOD',
    label: 'Good',
    text: 'good',
    category: 'basic',
    twoHanded: false,
    description: 'Upright steady thumbs-up (ISL) / chin to palm drop (ASL)',
  },
  BAD: {
    id: 'BAD',
    gloss: 'BAD',
    islGloss: 'BAD',
    aslGloss: 'BAD',
    label: 'Bad',
    text: 'bad',
    category: 'basic',
    twoHanded: false,
    description: 'Downward thumbs-down (ISL) / chin outward flip down (ASL)',
  },
  HELP: {
    id: 'HELP',
    gloss: 'HELP',
    islGloss: 'HELP',
    aslGloss: 'HELP',
    label: 'Help',
    text: 'help',
    category: 'basic',
    twoHanded: true,
    description: 'Closed fist resting on flat upward-facing palm, lifting together',
  },
  STOP: {
    id: 'STOP',
    gloss: 'STOP',
    islGloss: 'STOP',
    aslGloss: 'STOP',
    label: 'Stop',
    text: 'stop',
    category: 'basic',
    twoHanded: false,
    description: 'Vertical open flat palm barrier facing forward (ISL) / chopping palm (ASL)',
  },

  // --- Food & Drinks ---
  EAT: {
    id: 'EAT',
    gloss: 'EAT',
    islGloss: 'EAT',
    aslGloss: 'EAT',
    label: 'Eat',
    text: 'eat',
    category: 'needs',
    twoHanded: false,
    description: 'Bunched fingertips brought to mouth',
  },
  DRINK: {
    id: 'DRINK',
    gloss: 'DRINK',
    islGloss: 'DRINK',
    aslGloss: 'DRINK',
    label: 'Drink',
    text: 'drink',
    category: 'needs',
    twoHanded: false,
    description: 'C-handshape tilted toward mouth like drinking from a glass',
  },
  WATER: {
    id: 'WATER',
    gloss: 'WATER',
    islGloss: 'WATER',
    aslGloss: 'WATER',
    label: 'Water',
    text: 'water',
    category: 'needs',
    twoHanded: false,
    description: 'Cupped hand (ISL) / W-handshape tapped against chin (ASL)',
  },
  FOOD: {
    id: 'FOOD',
    gloss: 'FOOD',
    islGloss: 'FOOD',
    aslGloss: 'FOOD',
    label: 'Food',
    text: 'food',
    category: 'needs',
    twoHanded: false,
    description: 'Bunched fingertips tapping mouth/chin repeatedly',
  },

  // --- Social & Identity ---
  HOME: {
    id: 'HOME',
    gloss: 'HOME',
    islGloss: 'HOME',
    aslGloss: 'HOME',
    label: 'Home',
    text: 'home',
    category: 'social',
    twoHanded: true,
    description: 'Two hands forming roof gable inverted V (ISL) / cheek mouth to ear (ASL)',
  },
  FRIEND: {
    id: 'FRIEND',
    gloss: 'FRIEND',
    islGloss: 'FRIEND',
    aslGloss: 'FRIEND',
    label: 'Friend',
    text: 'friend',
    category: 'social',
    twoHanded: true,
    description: 'Clasped hands in front of chest (ISL) / interlocking index hooks (ASL)',
  },
  NAME: {
    id: 'NAME',
    gloss: 'NAME',
    islGloss: 'NAME',
    aslGloss: 'NAME',
    label: 'Name',
    text: 'name',
    category: 'social',
    twoHanded: false,
    description: 'H/U shape tapping chest (ISL) / crossed H-fingers tapping (ASL)',
  },
  LOVE: {
    id: 'LOVE',
    gloss: 'LOVE',
    islGloss: 'LOVE',
    aslGloss: 'LOVE',
    label: 'Love',
    text: 'love',
    category: 'social',
    twoHanded: false,
    description: 'Two wrists crossed over chest or ILY sign',
  },
};

// Backward-compatible alias
export const ISL_VOCABULARY = SIGN_VOCABULARY;

// 21 MediaPipe Landmark indices
const WRIST = 0;
const THUMB_MCP = 2;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_PIP = 6;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_PIP = 10;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_PIP = 14;
const RING_TIP = 16;
const PINKY_MCP = 17;
const PINKY_PIP = 18;
const PINKY_TIP = 20;

const dist2D = (a: Landmark, b: Landmark): number => {
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2));
};

const dist3D = (a: Landmark, b: Landmark): number => {
  const az = a.z ?? 0;
  const bz = b.z ?? 0;
  return Math.sqrt(Math.pow(a.x - b.x, 2) + Math.pow(a.y - b.y, 2) + Math.pow(az - bz, 2));
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
  pointingToChest: boolean;
  pointingToCamera: boolean;
  pointingToSide: boolean;
  fingersUp: boolean;
  isFaceZone: boolean;
  isChestZone: boolean;
  isLowerZone: boolean;
}

function extractHandFeatures(landmarks: Landmark[]): HandFeatures | null {
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[WRIST];
  const palmSize2D = dist2D(wrist, landmarks[MIDDLE_MCP]) || 0.15;
  const palmSize3D = dist3D(wrist, landmarks[MIDDLE_MCP]) || 0.15;
  const palmSize = Math.max(0.06, palmSize2D);
  const nDist2D = (i: number, j: number) => dist2D(landmarks[i], landmarks[j]) / palmSize;
  const nDist3D = (i: number, j: number) => dist3D(landmarks[i], landmarks[j]) / palmSize;

  const indexExtended =
    dist2D(landmarks[INDEX_TIP], wrist) > dist2D(landmarks[INDEX_PIP], wrist) * 1.04 &&
    (nDist2D(INDEX_TIP, INDEX_MCP) > 0.45 || nDist3D(INDEX_TIP, INDEX_MCP) > 0.45 || nDist2D(INDEX_TIP, WRIST) > 1.05);

  const middleExtended =
    dist2D(landmarks[MIDDLE_TIP], wrist) > dist2D(landmarks[MIDDLE_PIP], wrist) * 1.04 &&
    (nDist2D(MIDDLE_TIP, MIDDLE_MCP) > 0.45 || nDist3D(MIDDLE_TIP, MIDDLE_MCP) > 0.45 || nDist2D(MIDDLE_TIP, WRIST) > 1.05);

  const ringExtended =
    dist2D(landmarks[RING_TIP], wrist) > dist2D(landmarks[RING_PIP], wrist) * 1.04 &&
    (nDist2D(RING_TIP, RING_MCP) > 0.40 || nDist3D(RING_TIP, RING_MCP) > 0.40 || nDist2D(RING_TIP, WRIST) > 0.95);

  const pinkyExtended =
    dist2D(landmarks[PINKY_TIP], wrist) > dist2D(landmarks[PINKY_PIP], wrist) * 1.04 &&
    (nDist2D(PINKY_TIP, PINKY_MCP) > 0.36 || nDist3D(PINKY_TIP, PINKY_MCP) > 0.36 || nDist2D(PINKY_TIP, WRIST) > 0.90);

  const indexCurled = !indexExtended;
  const middleCurled = !middleExtended;
  const ringCurled = !ringExtended;
  const pinkyCurled = !pinkyExtended;

  const thumbExtended =
    nDist2D(THUMB_TIP, THUMB_MCP) > 0.48 &&
    (nDist2D(THUMB_TIP, MIDDLE_MCP) > 0.52 || nDist2D(THUMB_TIP, INDEX_MCP) > 0.48);

  const thumbUp =
    thumbExtended &&
    landmarks[THUMB_TIP].y < landmarks[THUMB_MCP].y - 0.025 &&
    indexCurled &&
    middleCurled;

  const thumbDown =
    thumbExtended &&
    landmarks[THUMB_TIP].y > landmarks[THUMB_MCP].y + 0.025 &&
    indexCurled &&
    middleCurled;

  const fist =
    indexCurled &&
    middleCurled &&
    (ringCurled || nDist2D(RING_TIP, WRIST) < 1.1) &&
    (pinkyCurled || nDist2D(PINKY_TIP, WRIST) < 1.1) &&
    !thumbUp &&
    !thumbDown;

  const bunchedTips =
    nDist2D(THUMB_TIP, INDEX_TIP) < 0.55 &&
    nDist2D(THUMB_TIP, MIDDLE_TIP) < 0.55 &&
    nDist2D(THUMB_TIP, RING_TIP) < 0.60 &&
    nDist2D(THUMB_TIP, PINKY_TIP) < 0.65;

  const extendedFingerCount =
    (indexExtended ? 1 : 0) +
    (middleExtended ? 1 : 0) +
    (ringExtended ? 1 : 0) +
    (pinkyExtended ? 1 : 0);

  const openPalm =
    (extendedFingerCount >= 3 || (extendedFingerCount >= 2 && thumbExtended)) &&
    !fist &&
    !bunchedTips;

  const cHandshape =
    nDist2D(THUMB_TIP, INDEX_TIP) > 0.55 &&
    nDist2D(THUMB_TIP, INDEX_TIP) < 1.5 &&
    landmarks[INDEX_TIP].y > landmarks[INDEX_PIP].y * 0.9 &&
    !fist &&
    !openPalm;

  const wHandshape =
    indexExtended &&
    middleExtended &&
    ringExtended &&
    pinkyCurled &&
    nDist2D(THUMB_TIP, PINKY_TIP) < 0.60;

  const ilySign =
    thumbExtended &&
    indexExtended &&
    pinkyExtended &&
    middleCurled &&
    ringCurled;

  const nameShape =
    indexExtended &&
    middleExtended &&
    ringCurled &&
    pinkyCurled &&
    nDist2D(INDEX_TIP, MIDDLE_TIP) < 0.45;

  const pointing =
    indexExtended &&
    middleCurled &&
    ringCurled &&
    pinkyCurled;

  const dxTipWrist = landmarks[INDEX_TIP].x - wrist.x;
  const dyTipWrist = landmarks[INDEX_TIP].y - wrist.y;
  const pointingToChest =
    pointing &&
    (dyTipWrist > 0.05 || (Math.abs(dxTipWrist) < 0.12 && Math.abs(dyTipWrist) < 0.15)) &&
    Math.abs(landmarks[INDEX_TIP].x - 0.5) < 0.25;

  const pointingToCamera =
    pointing &&
    !pointingToChest &&
    Math.abs(dxTipWrist) < 0.12 &&
    dyTipWrist < 0.08 &&
    nDist2D(INDEX_TIP, INDEX_MCP) < 0.95;

  const pointingToSide =
    pointing &&
    !pointingToChest &&
    Math.abs(dxTipWrist) >= 0.12;

  const fingersUp = landmarks[MIDDLE_TIP].y < wrist.y - 0.03;
  const isFaceZone = wrist.y < 0.45 || landmarks[INDEX_TIP].y < 0.38;
  const isChestZone = wrist.y >= 0.45 && wrist.y <= 0.85;
  const isLowerZone = wrist.y > 0.85;

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
    pointingToChest,
    pointingToCamera,
    pointingToSide,
    fingersUp,
    isFaceZone,
    isChestZone,
    isLowerZone,
  };
}

interface KinematicFrame {
  timestamp: number;
  wristX: number;
  wristY: number;
  tipX: number;
  tipY: number;
}

export interface ClassificationResult {
  signId: string;
  gloss: string;
  label: string;
  text: string;
  confidence: number;
  category: string;
  similarGlosses: AlternativeCandidate[];
}

export interface AlternativeCandidate {
  signId: string;
  gloss: string;
  label: string;
  confidence: number;
  language: SupportedLanguage;
}

/**
 * MultiLanguageClassifier
 * Classifies 2D/3D landmarks into exactly the 20 target vocabulary signs.
 * Distinguishes ISL and ASL gestures accurately.
 */
export class MultiLanguageClassifier {
  private activeLanguage: SupportedLanguage = 'ISL';
  private history: KinematicFrame[] = [];
  private readonly historyWindowMs = 600;

  public setLanguage(lang: SupportedLanguage): void {
    this.activeLanguage = lang;
    this.history = [];
  }

  public getLanguage(): SupportedLanguage {
    return this.activeLanguage;
  }

  public recordFrame(hands: Landmark[][], timestamp: number = performance.now()): void {
    if (!hands || hands.length === 0 || !hands[0] || hands[0].length < 21) {
      return;
    }
    const h0 = hands[0];
    this.history.push({
      timestamp,
      wristX: h0[WRIST].x,
      wristY: h0[WRIST].y,
      tipX: h0[MIDDLE_TIP]?.x ?? h0[INDEX_TIP]?.x ?? h0[WRIST].x,
      tipY: h0[MIDDLE_TIP]?.y ?? h0[INDEX_TIP]?.y ?? h0[WRIST].y,
    });

    const cutoff = timestamp - this.historyWindowMs;
    while (this.history.length > 0 && this.history[0].timestamp < cutoff) {
      this.history.shift();
    }
  }

  public classify(hands: Landmark[][]): ClassificationResult | null {
    if (!hands || hands.length === 0 || !hands[0] || hands[0].length < 21) {
      return null;
    }

    const f0 = extractHandFeatures(hands[0]);
    if (!f0) return null;

    const f1 = hands.length > 1 && hands[1] && hands[1].length >= 21 ? extractHandFeatures(hands[1]) : null;
    const lang = this.activeLanguage;

    // Kinematic motion calculation
    let dx = 0;
    let dy = 0;
    let tipSpanX = 0;
    let tipSpanY = 0;
    let wristOscillationsX = 0;
    let tipOscillationsX = 0;
    let oscillationsY = 0;

    if (this.history.length >= 3) {
      const recent = this.history;
      const first = recent[0];
      const last = recent[recent.length - 1];
      dx = last.wristX - first.wristX;
      dy = last.wristY - first.wristY;

      let minTipX = 1;
      let maxTipX = 0;
      let minTipY = 1;
      let maxTipY = 0;
      for (const pt of recent) {
        if (pt.tipX < minTipX) minTipX = pt.tipX;
        if (pt.tipX > maxTipX) maxTipX = pt.tipX;
        if (pt.tipY < minTipY) minTipY = pt.tipY;
        if (pt.tipY > maxTipY) maxTipY = pt.tipY;
      }
      tipSpanX = maxTipX - minTipX;
      tipSpanY = maxTipY - minTipY;

      let prevDirX = 0;
      for (let i = 1; i < recent.length; i++) {
        const step = recent[i].wristX - recent[i - 1].wristX;
        if (Math.abs(step) > 0.008) {
          const dir = Math.sign(step);
          if (prevDirX !== 0 && dir !== prevDirX) {
            wristOscillationsX++;
          }
          prevDirX = dir;
        }
      }

      let prevTipDirX = 0;
      for (let i = 1; i < recent.length; i++) {
        const tipStep = recent[i].tipX - recent[i - 1].tipX;
        if (Math.abs(tipStep) > 0.006) {
          const dir = Math.sign(tipStep);
          if (prevTipDirX !== 0 && dir !== prevTipDirX) {
            tipOscillationsX++;
          }
          prevTipDirX = dir;
        }
      }

      let prevDirY = 0;
      for (let i = 1; i < recent.length; i++) {
        const step = recent[i].wristY - recent[i - 1].wristY;
        if (Math.abs(step) > 0.007) {
          const dir = Math.sign(step);
          if (prevDirY !== 0 && dir !== prevDirY) {
            oscillationsY++;
          }
          prevDirY = dir;
        }
      }
    }

    const isWaving = tipSpanX > 0.045 || tipOscillationsX >= 1 || Math.abs(dx) > 0.04;
    const isNodding = oscillationsY >= 1 || tipSpanY > 0.035 || Math.abs(dy) > 0.02;
    const isWagging = tipOscillationsX >= 1 || (f0.pointing && tipSpanX > 0.035);
    const isCircular = (Math.abs(dx) > 0.015 || tipSpanX > 0.025) && (Math.abs(dy) > 0.015 || oscillationsY >= 1);

    const formatResult = (signId: string, confidence: number): ClassificationResult => {
      const def = SIGN_VOCABULARY[signId];
      const gloss = def.gloss;
      const similarGlosses = this.calculateSimilarGlosses(signId, f0, f1, hands, lang);
      return {
        signId,
        gloss,
        label: def.label,
        text: def.text,
        confidence,
        category: def.category,
        similarGlosses,
      };
    };

    // ==========================================
    // 1. TWO-HANDED SIGNS (when hands.length >= 2)
    // ==========================================
    if (f1 && hands.length >= 2) {
      const palmScale = Math.max(0.08, (f0.palmSize + f1.palmSize) / 2);
      const wristDist = dist2D(f0.wrist, f1.wrist) / palmScale;
      const tipDist = dist2D(hands[0][MIDDLE_TIP], hands[1][MIDDLE_TIP]) / palmScale;
      const indexTipDist = dist2D(hands[0][INDEX_TIP], hands[1][INDEX_TIP]) / palmScale;
      const fingersUp0 = hands[0][MIDDLE_TIP].y < f0.wrist.y - 0.03;
      const fingersUp1 = hands[1][MIDDLE_TIP].y < f1.wrist.y - 0.03;

      // 1.1 PLEASE in ISL (Namaste / Folded prayer hands in front of chest)
      if (
        lang === 'ISL' &&
        (f0.openPalm || (f0.indexExtended && f0.middleExtended)) &&
        (f1.openPalm || (f1.indexExtended && f1.middleExtended)) &&
        fingersUp0 &&
        fingersUp1 &&
        tipDist < 1.8 &&
        wristDist < 2.5 &&
        (f0.isChestZone || f0.isFaceZone)
      ) {
        return formatResult('PLEASE', 0.96);
      }

      // 1.2 HOME in ISL (Roof / Inverted V: tips touching at apex, wrists spread apart)
      if (
        lang === 'ISL' &&
        (f0.openPalm || (f0.indexExtended && f0.middleExtended)) &&
        (f1.openPalm || (f1.indexExtended && f1.middleExtended)) &&
        tipDist < 1.4 &&
        wristDist > tipDist * 1.3 &&
        wristDist > 1.2 &&
        f0.isChestZone
      ) {
        return formatResult('HOME', 0.95);
      }

      // 1.3 HELP (Fist on top of flat horizontal palm lifting together)
      const f0IsFist = f0.fist || f0.thumbUp;
      const f1IsFist = f1.fist || f1.thumbUp;
      const f0IsPalm = f0.openPalm;
      const f1IsPalm = f1.openPalm;
      if (
        ((f0IsFist && f1IsPalm) || (f1IsFist && f0IsPalm)) &&
        wristDist < 2.2
      ) {
        return formatResult('HELP', 0.95);
      }

      // 1.4 FRIEND (Clasped hands in ISL / interlocking index hooks in ASL)
      if (
        (indexTipDist < 1.4 || tipDist < 1.4) &&
        wristDist < 2.6 &&
        f0.isChestZone
      ) {
        return formatResult('FRIEND', 0.94);
      }

      // 1.5 HOW_ARE_YOU (Two cupped / open palms facing upward opening outward)
      if (
        (f0.openPalm || f0.cHandshape) &&
        (f1.openPalm || f1.cHandshape) &&
        wristDist >= 1.0 &&
        wristDist <= 4.5 &&
        f0.isChestZone &&
        f1.isChestZone
      ) {
        return formatResult('HOW_ARE_YOU', 0.94);
      }

      // 1.6 NAME in ASL (Two H-hands tapped across each other)
      if (
        lang === 'ASL' &&
        f0.nameShape &&
        f1.nameShape &&
        wristDist < 2.2
      ) {
        return formatResult('NAME', 0.94);
      }

      // 1.7 STOP in ASL (Dominant flat hand chopping down onto flat open palm)
      if (
        lang === 'ASL' &&
        f0.openPalm &&
        f1.openPalm &&
        wristDist < 2.0 &&
        f0.isChestZone
      ) {
        return formatResult('STOP', 0.94);
      }

      // 1.8 LOVE (Two hands crossed at wrists over chest)
      if (wristDist < 1.6 && f0.isChestZone && f1.isChestZone) {
        return formatResult('LOVE', 0.94);
      }
    }

    // ==========================================
    // 2. SINGLE-HANDED / PRIMARY HAND SIGNS
    // ==========================================

    // 2.1 LOVE (ILY handshape: thumb, index, pinky extended)
    if (f0.ilySign) {
      return formatResult('LOVE', 0.96);
    }

    // 2.2 STOP (Vertical open flat palm facing camera like a barrier held steady in chest zone)
    if (
      f0.openPalm &&
      f0.isChestZone &&
      f0.fingersUp &&
      !isWaving
    ) {
      return formatResult('STOP', 0.95);
    }

    // 2.3 THANK_YOU (Open flat hand starting near chin/mouth moving forward/down)
    if (
      f0.openPalm &&
      (f0.isFaceZone || hands[0][INDEX_TIP].y < 0.48) &&
      (dy > 0.012 || (Math.abs(dy) > 0.01 && hands[0][INDEX_TIP].y > 0.30)) &&
      !isWaving
    ) {
      return formatResult('THANK_YOU', 0.95);
    }

    // 2.4 HELLO (Salute greeting near temple/forehead, OR greeting wave near face)
    if (
      f0.openPalm &&
      (hands[0][MIDDLE_TIP].y < 0.35 || f0.isFaceZone)
    ) {
      return formatResult('HELLO', 0.95);
    }

    // 2.5 GOODBYE (Open hand waving side-to-side at chest or general level)
    if (f0.openPalm && isWaving) {
      return formatResult('GOODBYE', 0.95);
    }

    // 2.6 FOOD (Bunched fingertips tapping repeatedly near mouth)
    if (f0.bunchedTips && f0.isFaceZone && (oscillationsY >= 1 || isNodding)) {
      return formatResult('FOOD', 0.95);
    }

    // 2.7 EAT (Bunched fingertips brought to or held at mouth)
    if (f0.bunchedTips && f0.isFaceZone) {
      return formatResult('EAT', 0.94);
    }

    // 2.8 WATER (W-handshape near chin/mouth OR drinking cup tilt)
    if (
      (f0.wHandshape && (f0.isFaceZone || hands[0][INDEX_TIP].y < 0.48)) ||
      (f0.cHandshape && f0.isFaceZone && Math.abs(dy) < 0.02)
    ) {
      return formatResult('WATER', 0.95);
    }

    // 2.9 DRINK (C-handshape held like a glass tilted toward mouth)
    if (f0.cHandshape && f0.isFaceZone) {
      return formatResult('DRINK', 0.94);
    }

    // 2.10 YES (Closed fist or thumbs-up nodding up and down vertically)
    if ((f0.fist || f0.thumbUp) && isNodding) {
      return formatResult('YES', 0.95);
    }

    // 2.11 GOOD (Clear steady upright thumbs-up)
    if (f0.thumbUp && f0.indexCurled && f0.middleCurled && !isNodding) {
      return formatResult('GOOD', 0.96);
    }

    // 2.12 BAD (Clear steady thumbs-down)
    if (f0.thumbDown && f0.indexCurled && f0.middleCurled) {
      return formatResult('BAD', 0.95);
    }

    // 2.13 NO (Index finger wagging side to side OR index+middle snapping shut)
    if (
      (f0.pointing && isWagging) ||
      (f0.nameShape && (isWagging || isNodding))
    ) {
      return formatResult('NO', 0.95);
    }

    // 2.14 HOW_ARE_YOU (Single hand fallback: cupped palm facing up in chest zone)
    if (
      f0.openPalm &&
      f0.indexExtended &&
      f0.middleExtended &&
      !f0.thumbDown &&
      !f0.fist &&
      f0.isChestZone &&
      hands[0][MIDDLE_TIP].y > f0.wrist.y - 0.08 &&
      Math.abs(dx) < 0.05 &&
      !isWaving
    ) {
      return formatResult('HOW_ARE_YOU', 0.92);
    }

    // 2.15 SORRY (Closed fist moving in circular/rubbing motion on chest)
    if (
      (f0.fist || (f0.indexCurled && f0.middleCurled)) &&
      f0.isChestZone &&
      (isCircular || isNodding || Math.abs(dx) > 0.012)
    ) {
      return formatResult('SORRY', 0.94);
    }

    // 2.16 NAME (Index + Middle extended together held or tapped near chest)
    if (f0.nameShape && f0.isChestZone) {
      return formatResult('NAME', 0.93);
    }

    // 2.17 PLEASE in ASL (Flat open hand rubbing chest in circular motion)
    if (lang === 'ASL' && f0.openPalm && f0.isChestZone && (Math.abs(dx) > 0.015 || Math.abs(dy) > 0.015 || isCircular)) {
      return formatResult('PLEASE', 0.93);
    }

    // 2.18 HOME in ASL (Bunched/flat hand moving cheek mouth to ear)
    if (lang === 'ASL' && (f0.bunchedTips || f0.openPalm) && f0.isFaceZone && Math.abs(dx) > 0.02) {
      return formatResult('HOME', 0.92);
    }

    // Unknown or low-confidence gesture -> Return null
    return null;
  }

  /**
   * Calculates similar alternative candidates restricted strictly to the 20-word vocabulary.
   */
  private calculateSimilarGlosses(
    activeSignId: string,
    f0: ReturnType<typeof extractHandFeatures>,
    f1: ReturnType<typeof extractHandFeatures> | null,
    hands: Landmark[][],
    lang: SupportedLanguage
  ): AlternativeCandidate[] {
    if (!f0) return [];
    const candidates: Array<{ signId: string; score: number }> = [];

    // Open palm family
    if (f0.openPalm) {
      if (activeSignId !== 'HELLO') candidates.push({ signId: 'HELLO', score: f0.isFaceZone ? 0.84 : 0.58 });
      if (activeSignId !== 'GOODBYE') candidates.push({ signId: 'GOODBYE', score: 0.80 });
      if (activeSignId !== 'STOP') candidates.push({ signId: 'STOP', score: f0.isChestZone ? 0.80 : 0.54 });
      if (activeSignId !== 'THANK_YOU') candidates.push({ signId: 'THANK_YOU', score: f0.isFaceZone ? 0.78 : 0.50 });
      if (activeSignId !== 'PLEASE' && lang === 'ASL') candidates.push({ signId: 'PLEASE', score: f0.isChestZone ? 0.75 : 0.48 });
    }

    // Fist and thumb family
    if (f0.fist || f0.thumbUp || f0.thumbDown) {
      if (activeSignId !== 'YES') candidates.push({ signId: 'YES', score: 0.82 });
      if (activeSignId !== 'GOOD') candidates.push({ signId: 'GOOD', score: f0.thumbUp ? 0.86 : 0.52 });
      if (activeSignId !== 'BAD') candidates.push({ signId: 'BAD', score: f0.thumbDown ? 0.86 : 0.52 });
      if (activeSignId !== 'SORRY') candidates.push({ signId: 'SORRY', score: f0.isChestZone ? 0.76 : 0.50 });
      if (activeSignId !== 'HELP') candidates.push({ signId: 'HELP', score: 0.62 });
    }

    // Bunched and curved handshapes
    if (f0.bunchedTips || f0.cHandshape || f0.wHandshape) {
      if (activeSignId !== 'EAT') candidates.push({ signId: 'EAT', score: f0.isFaceZone ? 0.82 : 0.52 });
      if (activeSignId !== 'FOOD') candidates.push({ signId: 'FOOD', score: f0.isFaceZone ? 0.80 : 0.50 });
      if (activeSignId !== 'DRINK') candidates.push({ signId: 'DRINK', score: f0.cHandshape ? 0.84 : 0.52 });
      if (activeSignId !== 'WATER') candidates.push({ signId: 'WATER', score: f0.wHandshape ? 0.86 : 0.50 });
    }

    // Pointing / index shape
    if (f0.pointing || f0.nameShape) {
      if (activeSignId !== 'NO') candidates.push({ signId: 'NO', score: 0.78 });
      if (activeSignId !== 'NAME') candidates.push({ signId: 'NAME', score: 0.74 });
    }

    // Two-handed signs
    if (hands.length >= 2 && f1) {
      if (activeSignId !== 'PLEASE' && lang === 'ISL') candidates.push({ signId: 'PLEASE', score: 0.82 });
      if (activeSignId !== 'HELP') candidates.push({ signId: 'HELP', score: 0.80 });
      if (activeSignId !== 'HOW_ARE_YOU') candidates.push({ signId: 'HOW_ARE_YOU', score: 0.78 });
      if (activeSignId !== 'HOME' && lang === 'ISL') candidates.push({ signId: 'HOME', score: 0.76 });
      if (activeSignId !== 'FRIEND') candidates.push({ signId: 'FRIEND', score: 0.74 });
      if (activeSignId !== 'LOVE') candidates.push({ signId: 'LOVE', score: 0.72 });
    }

    // Filter, sort, and deduplicate to top 3 candidates (strictly within 20 words)
    const results: AlternativeCandidate[] = [];
    const seen = new Set<string>();

    const sorted = candidates
      .filter((c) => c.signId !== activeSignId && SIGN_VOCABULARY[c.signId] && c.score >= 0.48)
      .sort((a, b) => b.score - a.score);

    for (const item of sorted) {
      if (seen.has(item.signId)) continue;
      seen.add(item.signId);
      const def = SIGN_VOCABULARY[item.signId];
      results.push({
        signId: item.signId,
        gloss: def.gloss,
        label: def.label,
        confidence: Math.round(item.score * 100) / 100,
        language: lang,
      });
      if (results.length >= 3) break;
    }

    return results;
  }

  public reset(): void {
    this.history = [];
  }
}

export interface ISLRecognizerCallbacks {
  onWordRecognized?: (gloss: string, text: string, confidence: number) => void;
  onSentenceUpdated?: (fullSentence: string, words: string[], translation: SentenceTranslationResult) => void;
  onCandidateUpdate?: (gloss: string | null, progress: number, similarGlosses?: AlternativeCandidate[]) => void;
  onSimilarGlossesUpdated?: (candidates: AlternativeCandidate[]) => void;
  onProgressUpdated?: (progress: number) => void;
  onWordRevealed?: (word: string, fullText: string) => void;
  onPhraseCompleted?: (phrase: { text: string }, fullText: string) => void;
}

/**
 * ISLRecognizer
 * Main in-browser recognizer instance coordinating MediaPipe landmarker feeds,
 * hold stability filtering, word commitment, sentence translation, and UI callbacks.
 */
export class ISLRecognizer implements Recognizer {
  public name = 'Ishara 20-Sign ISL & ASL Recognizer';
  private classifier: MultiLanguageClassifier;
  private callbacks: ISLRecognizerCallbacks = {};

  // Temporal candidate holding buffer
  private candidateGloss: string | null = null;
  private candidateConfidence: number = 0;
  private candidateStableFrames: number = 0;
  private readonly requiredStableFrames: number = 3; // ~100ms snappy response threshold
  private missedFrames: number = 0;
  private readonly maxMissedFrames: number = 3; // Allow up to 3 frames of camera jitter without resetting

  // Cooldown to avoid duplicate continuous triggers of the same sign
  private lastConfirmedGloss: string | null = null;
  private lastConfirmedTime: number = 0;
  private readonly wordCooldownMs: number = 1200; // 1.2s cooldown for identical sign

  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  // Accumulated sentence buffer
  private rawGlosses: string[] = [];
  private sentenceWords: string[] = [];

  constructor(callbacks?: ISLRecognizerCallbacks) {
    this.classifier = new MultiLanguageClassifier();
    if (callbacks) {
      this.callbacks = callbacks;
    }
    this.setupShortcuts();
  }

  public setLanguage(lang: SupportedLanguage): void {
    this.classifier.setLanguage(lang);
  }

  public getLanguage(): SupportedLanguage {
    return this.classifier.getLanguage();
  }

  public setCallbacks(callbacks: ISLRecognizerCallbacks): void {
    this.callbacks = { ...this.callbacks, ...callbacks };
  }

  private setupShortcuts(): void {
    if (typeof window === 'undefined') return;

    this.keydownHandler = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      if (target && (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA')) {
        return;
      }

      const quickKeys = [
        'HELLO',
        'THANK_YOU',
        'PLEASE',
        'HELP',
        'YES',
        'NO',
        'GOODBYE',
        'GOOD',
        'WATER',
      ];

      if (e.key >= '1' && e.key <= '9') {
        const index = parseInt(e.key, 10) - 1;
        const signId = quickKeys[index];
        if (signId && SIGN_VOCABULARY[signId]) {
          this.triggerManualSign(signId);
        }
      }
    };

    window.addEventListener('keydown', this.keydownHandler);
  }

  public destroy(): void {
    if (typeof window !== 'undefined' && this.keydownHandler) {
      window.removeEventListener('keydown', this.keydownHandler);
    }
  }

  /**
   * Trigger a sign manually (used by gesture simulator chips or presenter shortcuts).
   */
  public triggerManualSign(signIdOrGloss: string): void {
    const cleanId = normalizeGloss(signIdOrGloss);
    const def = SIGN_VOCABULARY[cleanId];
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
    let hands: Landmark[][] = [];
    if (!input || input.length === 0) {
      hands = [];
    } else if (Array.isArray(input[0]) && typeof (input[0] as any).x === 'undefined') {
      hands = input as Landmark[][];
    } else {
      hands = [input as Landmark[]];
    }

    if (hands.length === 0 || !hands[0] || hands[0].length < 21) {
      this.missedFrames++;
      if (this.missedFrames > this.maxMissedFrames) {
        if (this.candidateStableFrames > 0) {
          this.candidateStableFrames--;
        } else {
          this.candidateGloss = null;
        }
      }
      this.callbacks.onCandidateUpdate?.(null, 0, []);
      this.callbacks.onSimilarGlossesUpdated?.([]);
      this.callbacks.onProgressUpdated?.(0);
      return null;
    }

    // Update temporal buffer
    this.classifier.recordFrame(hands, timestamp);

    // Classify current gesture
    const result = this.classifier.classify(hands);

    if (!result) {
      this.missedFrames++;
      if (this.missedFrames > this.maxMissedFrames) {
        if (this.candidateStableFrames > 0) {
          this.candidateStableFrames--;
        } else {
          this.candidateGloss = null;
        }
      }
      const progress = this.candidateStableFrames / this.requiredStableFrames;
      this.callbacks.onCandidateUpdate?.(this.candidateGloss, progress, []);
      this.callbacks.onProgressUpdated?.(progress);
      return null;
    }

    this.missedFrames = 0;

    const isSameAsLastConfirmed =
      result.gloss === this.lastConfirmedGloss &&
      timestamp - this.lastConfirmedTime < this.wordCooldownMs;

    // Check candidate stability
    if (result.gloss === this.candidateGloss) {
      this.candidateStableFrames++;
      this.candidateConfidence = Math.max(this.candidateConfidence, result.confidence);
    } else {
      this.candidateGloss = result.gloss;
      this.candidateConfidence = result.confidence;
      this.candidateStableFrames = 1;
    }

    const progress = Math.min(1.0, this.candidateStableFrames / this.requiredStableFrames);
    this.callbacks.onCandidateUpdate?.(result.gloss, progress, result.similarGlosses);
    this.callbacks.onSimilarGlossesUpdated?.(result.similarGlosses);
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
    this.rawGlosses.push(gloss);
    this.sentenceWords.push(text);
    this.lastConfirmedGloss = gloss;
    this.lastConfirmedTime = timestamp;
    this.candidateStableFrames = 0;

    const translation = buildSentenceFromGlosses(this.rawGlosses, this.classifier.getLanguage());

    this.callbacks.onWordRecognized?.(gloss, text, confidence);
    this.callbacks.onSentenceUpdated?.(translation.naturalSentence, [...this.sentenceWords], translation);
    this.callbacks.onWordRevealed?.(text, translation.naturalSentence);
    this.callbacks.onPhraseCompleted?.({ text: translation.naturalSentence }, translation.naturalSentence);
    this.callbacks.onCandidateUpdate?.(gloss, 1.0, []);
    this.callbacks.onSimilarGlossesUpdated?.([]);
    this.callbacks.onProgressUpdated?.(0);
  }

  public getHoldProgress(): number {
    return Math.min(1.0, this.candidateStableFrames / this.requiredStableFrames);
  }

  public getRawGlosses(): string[] {
    return [...this.rawGlosses];
  }

  public getSentenceWords(): string[] {
    return [...this.sentenceWords];
  }

  public getSentenceTranslation(): SentenceTranslationResult {
    return buildSentenceFromGlosses(this.rawGlosses, this.classifier.getLanguage());
  }

  public resetSentence(): void {
    this.rawGlosses = [];
    this.sentenceWords = [];
    this.candidateGloss = null;
    this.candidateStableFrames = 0;
    this.lastConfirmedGloss = null;
    this.classifier.reset();
  }

  public clearSentence(): void {
    this.resetSentence();
  }

  public triggerRandomDemoSign(): void {
    const keys = Object.keys(SIGN_VOCABULARY);
    const key = keys[Math.floor(Math.random() * keys.length)];
    if (key) {
      this.triggerManualSign(key);
    }
  }
}
