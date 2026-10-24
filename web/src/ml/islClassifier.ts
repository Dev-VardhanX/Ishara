// src/ml/islClassifier.ts — Real-time Multi-Language ISL & ASL Sign Recognizer
// Supports 43 signs across Pronouns, Everyday Communication, and Basic Needs.
// Treats ISL and ASL separately with language prefixes ("ISL_...", "ASL_..."),
// geometric landmark feature extraction, 2-hand relation checks, kinematics,
// and grammatical sentence formation.

import { Landmark, RecognitionResult, Recognizer } from '../lib/recognizer';
import { buildSentenceFromGlosses, SentenceTranslationResult, normalizeGloss } from './sentenceBuilder';

export type SupportedLanguage = 'ISL' | 'ASL';

export interface SignDefinition {
  id: string;
  islGloss: string;
  aslGloss: string;
  label: string;
  text: string;
  category: 'pronouns' | 'communication' | 'needs';
  twoHanded: boolean;
  description: string;
}

export const SIGN_VOCABULARY: Record<string, SignDefinition> = {
  // --- Pronouns & People ---
  I: {
    id: 'I',
    islGloss: 'ISL_I',
    aslGloss: 'ASL_I',
    label: 'I',
    text: 'I',
    category: 'pronouns',
    twoHanded: false,
    description: 'Index pointing to chest (ISL) / I-handshape to chest (ASL)',
  },
  ME: {
    id: 'ME',
    islGloss: 'ISL_ME',
    aslGloss: 'ASL_ME',
    label: 'Me',
    text: 'me',
    category: 'pronouns',
    twoHanded: false,
    description: 'Index finger pointing to center of chest',
  },
  YOU: {
    id: 'YOU',
    islGloss: 'ISL_YOU',
    aslGloss: 'ASL_YOU',
    label: 'You',
    text: 'you',
    category: 'pronouns',
    twoHanded: false,
    description: 'Index finger pointing forward towards conversational partner',
  },
  WE: {
    id: 'WE',
    islGloss: 'ISL_WE',
    aslGloss: 'ASL_WE',
    label: 'We',
    text: 'we',
    category: 'pronouns',
    twoHanded: false,
    description: 'Index/W-shape sweeping from right to left shoulder',
  },
  THEY: {
    id: 'THEY',
    islGloss: 'ISL_THEY',
    aslGloss: 'ASL_THEY',
    label: 'They',
    text: 'they',
    category: 'pronouns',
    twoHanded: false,
    description: 'Index pointing to side and sweeping in horizontal arc',
  },
  HE: {
    id: 'HE',
    islGloss: 'ISL_HE',
    aslGloss: 'ASL_HE',
    label: 'He',
    text: 'he',
    category: 'pronouns',
    twoHanded: false,
    description: 'Index finger pointing slightly to the side (male reference)',
  },
  SHE: {
    id: 'SHE',
    islGloss: 'ISL_SHE',
    aslGloss: 'ASL_SHE',
    label: 'She',
    text: 'she',
    category: 'pronouns',
    twoHanded: false,
    description: 'Index finger pointing slightly to the side (female reference)',
  },
  MY: {
    id: 'MY',
    islGloss: 'ISL_MY',
    aslGloss: 'ASL_MY',
    label: 'My',
    text: 'my',
    category: 'pronouns',
    twoHanded: false,
    description: 'Flat open palm placed against center of chest',
  },
  YOUR: {
    id: 'YOUR',
    islGloss: 'ISL_YOUR',
    aslGloss: 'ASL_YOUR',
    label: 'Your',
    text: 'your',
    category: 'pronouns',
    twoHanded: false,
    description: 'Flat open palm pushed forward towards other person',
  },
  FRIEND: {
    id: 'FRIEND',
    islGloss: 'ISL_FRIEND',
    aslGloss: 'ASL_FRIEND',
    label: 'Friend',
    text: 'friend',
    category: 'pronouns',
    twoHanded: true,
    description: 'Clasped hands (ISL) / interlocking index finger hooks (ASL)',
  },
  NAME: {
    id: 'NAME',
    islGloss: 'ISL_NAME',
    aslGloss: 'ASL_NAME',
    label: 'Name',
    text: 'name',
    category: 'pronouns',
    twoHanded: false,
    description: 'H/U shape tapping chest (ISL) / crossed H-fingers tapping (ASL)',
  },

  // --- Everyday Communication ---
  HELLO: {
    id: 'HELLO',
    islGloss: 'ISL_HELLO',
    aslGloss: 'ASL_HELLO',
    label: 'Hello',
    text: 'Hello',
    category: 'communication',
    twoHanded: false,
    description: 'Open palm brow salute (ISL) / formal forehead salute (ASL)',
  },
  GOODBYE: {
    id: 'GOODBYE',
    islGloss: 'ISL_GOODBYE',
    aslGloss: 'ASL_GOODBYE',
    label: 'Goodbye',
    text: 'Goodbye',
    category: 'communication',
    twoHanded: false,
    description: 'Open palm facing camera waving side-to-side horizontally',
  },
  THANK_YOU: {
    id: 'THANK_YOU',
    islGloss: 'ISL_THANK_YOU',
    aslGloss: 'ASL_THANK_YOU',
    label: 'Thank You',
    text: 'thank you',
    category: 'communication',
    twoHanded: false,
    description: 'Flat hand moving outward and down from chin',
  },
  PLEASE: {
    id: 'PLEASE',
    islGloss: 'ISL_PLEASE',
    aslGloss: 'ASL_PLEASE',
    label: 'Please',
    text: 'please',
    category: 'communication',
    twoHanded: true,
    description: 'Two-hand Namaste (ISL) / flat hand circular chest rub (ASL)',
  },
  SORRY: {
    id: 'SORRY',
    islGloss: 'ISL_SORRY',
    aslGloss: 'ASL_SORRY',
    label: 'Sorry',
    text: 'sorry',
    category: 'communication',
    twoHanded: false,
    description: 'Closed fist moving in a circular motion on chest',
  },
  WELCOME: {
    id: 'WELCOME',
    islGloss: 'ISL_WELCOME',
    aslGloss: 'ASL_WELCOME',
    label: 'Welcome',
    text: 'welcome',
    category: 'communication',
    twoHanded: false,
    description: 'Both hands sweeping inward (ISL) / one-hand inward sweep (ASL)',
  },
  HELP: {
    id: 'HELP',
    islGloss: 'ISL_HELP',
    aslGloss: 'ASL_HELP',
    label: 'Help',
    text: 'help',
    category: 'communication',
    twoHanded: true,
    description: 'Closed fist on flat upward palm lifting together',
  },
  STOP: {
    id: 'STOP',
    islGloss: 'ISL_STOP',
    aslGloss: 'ASL_STOP',
    label: 'Stop',
    text: 'stop',
    category: 'communication',
    twoHanded: false,
    description: 'Vertical flat palm barrier (ISL) / chopping onto palm (ASL)',
  },
  WAIT: {
    id: 'WAIT',
    islGloss: 'ISL_WAIT',
    aslGloss: 'ASL_WAIT',
    label: 'Wait',
    text: 'wait',
    category: 'communication',
    twoHanded: false,
    description: 'Open palms hovering/fluttering at chest level',
  },
  COME: {
    id: 'COME',
    islGloss: 'ISL_COME',
    aslGloss: 'ASL_COME',
    label: 'Come',
    text: 'come',
    category: 'communication',
    twoHanded: false,
    description: 'Beckoning hands moving inward toward body',
  },
  GO: {
    id: 'GO',
    islGloss: 'ISL_GO',
    aslGloss: 'ASL_GO',
    label: 'Go',
    text: 'go',
    category: 'communication',
    twoHanded: false,
    description: 'Index fingers pointing and moving abruptly outward',
  },
  UNDERSTAND: {
    id: 'UNDERSTAND',
    islGloss: 'ISL_UNDERSTAND',
    aslGloss: 'ASL_UNDERSTAND',
    label: 'Understand',
    text: 'understand',
    category: 'communication',
    twoHanded: false,
    description: 'Index tapping temple (ISL) / index flick from fist at temple (ASL)',
  },
  DONT_UNDERSTAND: {
    id: 'DONT_UNDERSTAND',
    islGloss: 'ISL_DONT_UNDERSTAND',
    aslGloss: 'ASL_DONT_UNDERSTAND',
    label: "Don't Understand",
    text: "don't understand",
    category: 'communication',
    twoHanded: false,
    description: 'Index near temple with hand/head shaking no',
  },
  GOOD: {
    id: 'GOOD',
    islGloss: 'ISL_GOOD',
    aslGloss: 'ASL_GOOD',
    label: 'Good',
    text: 'good',
    category: 'communication',
    twoHanded: false,
    description: 'Upright thumbs up (ISL) / chin to palm drop (ASL)',
  },
  BAD: {
    id: 'BAD',
    islGloss: 'ISL_BAD',
    aslGloss: 'ASL_BAD',
    label: 'Bad',
    text: 'bad',
    category: 'communication',
    twoHanded: false,
    description: 'Thumbs down (ISL) / chin outward flip down (ASL)',
  },
  HOW_ARE_YOU: {
    id: 'HOW_ARE_YOU',
    islGloss: 'ISL_HOW_ARE_YOU',
    aslGloss: 'ASL_HOW_ARE_YOU',
    label: 'How Are You',
    text: 'how are you',
    category: 'communication',
    twoHanded: true,
    description: 'Two cupped palms opening outward (ISL) / how + you (ASL)',
  },

  // --- Basic Needs ---
  YES: {
    id: 'YES',
    islGloss: 'ISL_YES',
    aslGloss: 'ASL_YES',
    label: 'Yes',
    text: 'yes',
    category: 'needs',
    twoHanded: false,
    description: 'Closed fist nodding up and down vertically',
  },
  NO: {
    id: 'NO',
    islGloss: 'ISL_NO',
    aslGloss: 'ASL_NO',
    label: 'No',
    text: 'no',
    category: 'needs',
    twoHanded: false,
    description: 'Index wagging (ISL) / index+middle snapping shut (ASL)',
  },
  EAT: {
    id: 'EAT',
    islGloss: 'ISL_EAT',
    aslGloss: 'ASL_EAT',
    label: 'Eat',
    text: 'eat',
    category: 'needs',
    twoHanded: false,
    description: 'Bunched fingertips brought toward mouth',
  },
  DRINK: {
    id: 'DRINK',
    islGloss: 'ISL_DRINK',
    aslGloss: 'ASL_DRINK',
    label: 'Drink',
    text: 'drink',
    category: 'needs',
    twoHanded: false,
    description: 'C-hand tilted toward mouth like drinking',
  },
  WATER: {
    id: 'WATER',
    islGloss: 'ISL_WATER',
    aslGloss: 'ASL_WATER',
    label: 'Water',
    text: 'water',
    category: 'needs',
    twoHanded: false,
    description: 'W-shape tapped on chin / cupped hand',
  },
  FOOD: {
    id: 'FOOD',
    islGloss: 'ISL_FOOD',
    aslGloss: 'ASL_FOOD',
    label: 'Food',
    text: 'food',
    category: 'needs',
    twoHanded: false,
    description: 'Bunched fingertips tapping mouth repeatedly',
  },
  LOVE: {
    id: 'LOVE',
    islGloss: 'ISL_LOVE',
    aslGloss: 'ASL_LOVE',
    label: 'Love',
    text: 'love',
    category: 'needs',
    twoHanded: false,
    description: 'Crossed arms/wrists over chest or ILY sign',
  },
  READ: {
    id: 'READ',
    islGloss: 'ISL_READ',
    aslGloss: 'ASL_READ',
    label: 'Read',
    text: 'read',
    category: 'needs',
    twoHanded: true,
    description: 'V-fingers scanning down open palm like reading text',
  },
  WRITE: {
    id: 'WRITE',
    islGloss: 'ISL_WRITE',
    aslGloss: 'ASL_WRITE',
    label: 'Write',
    text: 'write',
    category: 'needs',
    twoHanded: true,
    description: 'Pinching pen grip writing across flat palm',
  },
  HOME: {
    id: 'HOME',
    islGloss: 'ISL_HOME',
    aslGloss: 'ASL_HOME',
    label: 'Home',
    text: 'home',
    category: 'needs',
    twoHanded: true,
    description: 'Roof gable inverted V (ISL) / cheek mouth to ear (ASL)',
  },
  SCHOOL: {
    id: 'SCHOOL',
    islGloss: 'ISL_SCHOOL',
    aslGloss: 'ASL_SCHOOL',
    label: 'School',
    text: 'school',
    category: 'needs',
    twoHanded: true,
    description: 'Book opening to roof (ISL) / clapping palms horizontally (ASL)',
  },
  BOOK: {
    id: 'BOOK',
    islGloss: 'ISL_BOOK',
    aslGloss: 'ASL_BOOK',
    label: 'Book',
    text: 'book',
    category: 'needs',
    twoHanded: true,
    description: 'Two flat hands opening like a book',
  },
  BATHROOM: {
    id: 'BATHROOM',
    islGloss: 'ISL_BATHROOM',
    aslGloss: 'ASL_BATHROOM',
    label: 'Bathroom',
    text: 'bathroom',
    category: 'needs',
    twoHanded: false,
    description: 'Pinky finger upright shaken (ISL) / T-handshape shaken (ASL)',
  },
  SLEEP: {
    id: 'SLEEP',
    islGloss: 'ISL_SLEEP',
    aslGloss: 'ASL_SLEEP',
    label: 'Sleep',
    text: 'sleep',
    category: 'needs',
    twoHanded: false,
    description: 'Hands against tilted cheek / head resting',
  },
  HAPPY: {
    id: 'HAPPY',
    islGloss: 'ISL_HAPPY',
    aslGloss: 'ASL_HAPPY',
    label: 'Happy',
    text: 'happy',
    category: 'needs',
    twoHanded: false,
    description: 'Open flat hands brushing upward repeatedly against chest',
  },
  SAD: {
    id: 'SAD',
    islGloss: 'ISL_SAD',
    aslGloss: 'ASL_SAD',
    label: 'Sad',
    text: 'sad',
    category: 'needs',
    twoHanded: false,
    description: 'Open hands with fingers drooping downward in front of face',
  },
};

// Backward-compatible alias for existing imports
export const ISL_VOCABULARY = SIGN_VOCABULARY;

// 21 MediaPipe Landmark indices
const WRIST = 0;
const THUMB_MCP = 2;
const THUMB_TIP = 4;
const INDEX_MCP = 5;
const INDEX_TIP = 8;
const MIDDLE_MCP = 9;
const MIDDLE_TIP = 12;
const RING_MCP = 13;
const RING_TIP = 16;
const PINKY_MCP = 17;
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
  tHandshape: boolean; // ASL Bathroom
  isFaceZone: boolean;
  isChestZone: boolean;
  isLowerZone: boolean;
}

function extractHandFeatures(landmarks: Landmark[]): HandFeatures | null {
  if (!landmarks || landmarks.length < 21) return null;

  const wrist = landmarks[WRIST];
  const palmSize2D = dist2D(wrist, landmarks[MIDDLE_MCP]) || 0.15;
  const palmSize3D = dist3D(wrist, landmarks[MIDDLE_MCP]) || 0.15;
  const palmSize = palmSize2D;
  const nDist2D = (i: number, j: number) => dist2D(landmarks[i], landmarks[j]) / palmSize2D;
  const nDist3D = (i: number, j: number) => dist3D(landmarks[i], landmarks[j]) / palmSize3D;

  // Finger 3D extension tests (scale normalized, depth-invariant to camera foreshortening)
  const indexExtended3D = nDist3D(INDEX_TIP, INDEX_MCP) > 0.48 || nDist3D(INDEX_TIP, WRIST) > 0.85;
  const middleExtended3D = nDist3D(MIDDLE_TIP, MIDDLE_MCP) > 0.48 || nDist3D(MIDDLE_TIP, WRIST) > 0.85;
  const ringExtended3D = nDist3D(RING_TIP, RING_MCP) > 0.48 || nDist3D(RING_TIP, WRIST) > 0.85;
  const pinkyExtended3D = nDist3D(PINKY_TIP, PINKY_MCP) > 0.44 || nDist3D(PINKY_TIP, WRIST) > 0.80;

  // Finger 3D curls (joints folded inward toward palm)
  const indexCurled3D = nDist3D(INDEX_TIP, INDEX_MCP) < 0.38;
  const middleCurled3D = nDist3D(MIDDLE_TIP, MIDDLE_MCP) < 0.38;
  const ringCurled3D = nDist3D(RING_TIP, RING_MCP) < 0.38;
  const pinkyCurled3D = nDist3D(PINKY_TIP, PINKY_MCP) < 0.38;

  // Finger 2D extensions (planar view)
  const indexExtended2D = nDist2D(INDEX_TIP, WRIST) > 1.25 && nDist2D(INDEX_TIP, INDEX_MCP) > 0.58;
  const middleExtended2D = nDist2D(MIDDLE_TIP, WRIST) > 1.25 && nDist2D(MIDDLE_TIP, MIDDLE_MCP) > 0.58;
  const ringExtended2D = nDist2D(RING_TIP, WRIST) > 1.25 && nDist2D(RING_TIP, RING_MCP) > 0.58;
  const pinkyExtended2D = nDist2D(PINKY_TIP, WRIST) > 1.20 && nDist2D(PINKY_TIP, PINKY_MCP) > 0.52;

  // Unified finger extensions
  const thumbExtended = nDist2D(THUMB_TIP, THUMB_MCP) > 0.65 && nDist2D(THUMB_TIP, MIDDLE_MCP) > 0.70;
  const indexExtended = indexExtended2D || indexExtended3D;
  const middleExtended = middleExtended2D || middleExtended3D;
  const ringExtended = ringExtended2D || ringExtended3D;
  const pinkyExtended = pinkyExtended2D || pinkyExtended3D;

  // Finger curls (strictly false if finger is extended)
  const indexCurled = !indexExtended && (indexCurled3D || nDist2D(INDEX_TIP, WRIST) < 1.10);
  const middleCurled = !middleExtended && (middleCurled3D || nDist2D(MIDDLE_TIP, WRIST) < 1.10);
  const ringCurled = !ringExtended && (ringCurled3D || nDist2D(RING_TIP, WRIST) < 1.10);
  const pinkyCurled = !pinkyExtended && (pinkyCurled3D || nDist2D(PINKY_TIP, WRIST) < 1.10);

  // Thumb directions (in screen coords, smaller y is higher up)
  const thumbUp = thumbExtended && landmarks[THUMB_TIP].y < landmarks[THUMB_MCP].y - 0.04 && indexCurled && middleCurled;
  const thumbDown = thumbExtended && landmarks[THUMB_TIP].y > landmarks[THUMB_MCP].y + 0.04 && indexCurled && middleCurled;

  // Compound Shapes
  const openPalm = indexExtended && middleExtended && ringExtended && pinkyExtended;
  const fist = indexCurled && middleCurled && ringCurled && pinkyCurled && !thumbUp && !thumbDown;

  // Bunched fingertips: all 5 tips close together (eating/food handshape)
  const bunchedTips =
    nDist2D(THUMB_TIP, INDEX_TIP) < 0.45 &&
    nDist2D(THUMB_TIP, MIDDLE_TIP) < 0.45 &&
    nDist2D(THUMB_TIP, RING_TIP) < 0.50 &&
    nDist2D(THUMB_TIP, PINKY_TIP) < 0.55;

  // C-handshape: curved hand as if holding a glass
  const cHandshape =
    !openPalm &&
    !fist &&
    !bunchedTips &&
    nDist2D(THUMB_TIP, INDEX_TIP) >= 0.38 &&
    nDist2D(THUMB_TIP, INDEX_TIP) <= 1.15 &&
    landmarks[THUMB_TIP].y < landmarks[WRIST].y + 0.08;

  // W-handshape: index, middle, ring extended, thumb holding pinky
  const wHandshape =
    indexExtended &&
    middleExtended &&
    ringExtended &&
    (pinkyCurled || nDist2D(THUMB_TIP, PINKY_TIP) < 0.60);

  // ILY (I Love You) handshape: thumb, index, pinky extended; middle and ring curled
  const ilySign = thumbExtended && indexExtended && pinkyExtended && middleCurled && ringCurled;

  // Name shape: index + middle extended together (H/U shape)
  const nameShape =
    indexExtended &&
    middleExtended &&
    ringCurled &&
    pinkyCurled &&
    nDist2D(INDEX_TIP, MIDDLE_TIP) < 0.35;

  // Pointing: only index extended, other 3 fingers curled, thumb not interfering
  const pointing = indexExtended && middleCurled && ringCurled && pinkyCurled && !thumbUp && !thumbDown;

  // 3D Pointing Direction vectors
  const indexTipZ = landmarks[INDEX_TIP].z ?? 0;
  const indexMcpZ = landmarks[INDEX_MCP].z ?? 0;
  const deltaZ = indexTipZ - indexMcpZ;
  const deltaX = landmarks[INDEX_TIP].x - landmarks[INDEX_MCP].x;

  // Pointing towards camera (tip closer to camera than knuckle)
  const pointingToCamera = pointing && deltaZ < -0.02;

  // Pointing towards chest / self (tip directed toward body/chest)
  const pointingToChest = pointing && deltaZ >= -0.02 && Math.abs(deltaX) < 0.12;

  // Pointing laterally sideways
  const pointingToSide = pointing && Math.abs(deltaX) >= 0.10;

  // T-handshape (ASL Bathroom): thumb tucked between index and middle
  const tHandshape =
    indexCurled &&
    middleCurled &&
    ringCurled &&
    pinkyCurled &&
    nDist2D(THUMB_TIP, INDEX_MCP) < 0.45;

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
    pointingToChest,
    pointingToCamera,
    pointingToSide,
    tHandshape,
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

export interface ClassificationResult {
  signId: string;
  gloss: string;
  label: string;
  text: string;
  confidence: number;
  category: string;
}

export class MultiLanguageClassifier {
  private history: FrameRecord[] = [];
  private readonly maxHistoryLength = 25; // ~0.8s at 30fps
  private activeLanguage: SupportedLanguage = 'ISL';

  public setLanguage(lang: SupportedLanguage): void {
    this.activeLanguage = lang;
  }

  public getLanguage(): SupportedLanguage {
    return this.activeLanguage;
  }

  public recordFrame(hands: Landmark[][], timestamp: number = performance.now()): void {
    if (!hands || hands.length === 0 || !hands[0] || hands[0].length < 21) {
      return;
    }
    const h0 = hands[0];
    // Track the leading extended fingertip: if index is extended further than middle, track index tip
    const isIndexLeading =
      h0[INDEX_TIP].y < h0[MIDDLE_TIP].y - 0.03 ||
      Math.abs(h0[INDEX_TIP].x - h0[WRIST].x) > Math.abs(h0[MIDDLE_TIP].x - h0[WRIST].x) + 0.05 ||
      (h0[INDEX_TIP].z !== undefined && h0[MIDDLE_TIP].z !== undefined && h0[INDEX_TIP].z < h0[MIDDLE_TIP].z - 0.04);

    const activeTip = isIndexLeading ? h0[INDEX_TIP] : h0[MIDDLE_TIP];

    this.history.push({
      time: timestamp,
      wristX: h0[WRIST].x,
      wristY: h0[WRIST].y,
      tipX: activeTip.x,
      tipY: activeTip.y,
      handCount: hands.length,
    });

    if (this.history.length > this.maxHistoryLength) {
      this.history.shift();
    }
  }

  public classify(hands: Landmark[][]): ClassificationResult | null {
    if (!hands || hands.length === 0) return null;

    const f0 = extractHandFeatures(hands[0]);
    if (!f0) return null;

    const f1 = hands.length > 1 && hands[1] ? extractHandFeatures(hands[1]) : null;
    const lang = this.activeLanguage;

    // Movement analysis from history window
    let dx = 0;
    let dy = 0;
    let wristOscillationsX = 0;
    let tipOscillationsX = 0;
    let oscillationsY = 0;
    let tipSpanX = 0;

    if (this.history.length >= 6) {
      const recent = this.history.slice(-15);
      const first = recent[0];
      const last = recent[recent.length - 1];
      dx = last.wristX - first.wristX;
      dy = last.wristY - first.wristY;

      let minTipX = recent[0].tipX;
      let maxTipX = recent[0].tipX;

      // Count horizontal direction reversals for wrist
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

      // Count horizontal direction reversals & lateral span for fingertips (vital for waving / wagging)
      let prevTipDirX = 0;
      for (let i = 1; i < recent.length; i++) {
        if (recent[i].tipX < minTipX) minTipX = recent[i].tipX;
        if (recent[i].tipX > maxTipX) maxTipX = recent[i].tipX;

        const tipStep = recent[i].tipX - recent[i - 1].tipX;
        if (Math.abs(tipStep) > 0.006) {
          const dir = Math.sign(tipStep);
          if (prevTipDirX !== 0 && dir !== prevTipDirX) {
            tipOscillationsX++;
          }
          prevTipDirX = dir;
        }
      }
      tipSpanX = maxTipX - minTipX;

      // Count vertical direction reversals for nodding/tapping
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

    // Unified horizontal oscillation count (considers both wrist and fingertip)
    const oscillationsX = Math.max(wristOscillationsX, tipOscillationsX);

    const formatResult = (signId: string, confidence: number): ClassificationResult => {
      const def = SIGN_VOCABULARY[signId];
      const gloss = lang === 'ISL' ? def.islGloss : def.aslGloss;
      return {
        signId,
        gloss,
        label: def.label,
        text: def.text,
        confidence,
        category: def.category,
      };
    };

    // ==========================================
    // 1. TWO-HANDED SIGNS (when hands.length >= 2)
    // ==========================================
    if (f1 && hands.length >= 2) {
      const wristDist = dist2D(f0.wrist, f1.wrist);
      const tipDist = dist2D(hands[0][MIDDLE_TIP], hands[1][MIDDLE_TIP]);
      const indexTipDist = dist2D(hands[0][INDEX_TIP], hands[1][INDEX_TIP]);
      const fingersUp0 = hands[0][MIDDLE_TIP].y < f0.wrist.y - 0.08;
      const fingersUp1 = hands[1][MIDDLE_TIP].y < f1.wrist.y - 0.08;

      // 1.1 BOOK (Two flat hands open side-by-side like an open book)
      if (
        f0.openPalm &&
        f1.openPalm &&
        wristDist < 0.22 &&
        dist2D(hands[0][PINKY_TIP], hands[1][PINKY_TIP]) < 0.20 &&
        f0.isChestZone
      ) {
        return formatResult('BOOK', 0.95);
      }

      // 1.2 READ (V-fingers scanning down open non-dominant flat palm)
      if (
        ((f0.nameShape && f1.openPalm) || (f1.nameShape && f0.openPalm)) &&
        wristDist < 0.26
      ) {
        return formatResult('READ', 0.94);
      }

      // 1.3 WRITE (Pinching pen grip writing across flat non-dominant palm)
      if (
        ((f0.bunchedTips && f1.openPalm) || (f1.bunchedTips && f0.openPalm)) &&
        wristDist < 0.25
      ) {
        return formatResult('WRITE', 0.94);
      }

      // 1.4 SCHOOL (ISL: book to roof; ASL: clapping flat palms horizontally)
      if (
        f0.openPalm &&
        f1.openPalm &&
        wristDist < 0.24 &&
        oscillationsY >= 1 &&
        f0.isChestZone
      ) {
        return formatResult('SCHOOL', 0.93);
      }

      // 1.5 PLEASE in ISL (Namaste / Folded prayer hands in front of chest)
      if (
        lang === 'ISL' &&
        (f0.openPalm || (f0.indexExtended && f0.middleExtended)) &&
        (f1.openPalm || (f1.indexExtended && f1.middleExtended)) &&
        fingersUp0 &&
        fingersUp1 &&
        tipDist < 0.18 &&
        wristDist < 0.28 &&
        (f0.isChestZone || f0.isFaceZone)
      ) {
        return formatResult('PLEASE', 0.96);
      }

      // 1.6 HOME in ISL (Roof / Inverted V: tips touching at apex, wrists spread apart)
      if (
        lang === 'ISL' &&
        (f0.openPalm || (f0.indexExtended && f0.middleExtended)) &&
        (f1.openPalm || (f1.indexExtended && f1.middleExtended)) &&
        tipDist < 0.14 &&
        wristDist > tipDist * 1.5 &&
        wristDist > 0.15 &&
        f0.isChestZone
      ) {
        return formatResult('HOME', 0.95);
      }

      // 1.7 HELP (Base horizontal flat palm supporting a fist/thumbs-up)
      const f0IsFist = f0.fist || f0.thumbUp;
      const f1IsFist = f1.fist || f1.thumbUp;
      const f0IsPalm = f0.openPalm;
      const f1IsPalm = f1.openPalm;
      if (
        ((f0IsFist && f1IsPalm) || (f1IsFist && f0IsPalm)) &&
        wristDist < 0.24
      ) {
        return formatResult('HELP', 0.94);
      }

      // 1.8 FRIEND (Clasped hands in ISL / interlocking index hooks in ASL)
      if (
        (indexTipDist < 0.15 || tipDist < 0.15) &&
        wristDist < 0.30 &&
        !fingersUp0 &&
        !fingersUp1 &&
        f0.isChestZone
      ) {
        return formatResult('FRIEND', 0.92);
      }

      // 1.9 HOW_ARE_YOU (Two cupped / open palms facing upward opening outward)
      if (
        f0.openPalm &&
        f1.openPalm &&
        wristDist >= 0.16 &&
        wristDist <= 0.65 &&
        tipDist > 0.20 &&
        f0.isChestZone &&
        f1.isChestZone
      ) {
        return formatResult('HOW_ARE_YOU', 0.93);
      }

      // 1.10 WELCOME in ISL (Both open hands sweeping inward toward chest)
      if (
        lang === 'ISL' &&
        f0.openPalm &&
        f1.openPalm &&
        (dy > 0.02 || dx > 0.02) &&
        wristDist < 0.45 &&
        f0.isChestZone
      ) {
        return formatResult('WELCOME', 0.91);
      }

      // 1.11 LOVE (Two hands crossed at wrists over chest)
      if (wristDist < 0.16 && f0.isChestZone && f1.isChestZone) {
        return formatResult('LOVE', 0.92);
      }
    }

    // ==========================================
    // 2. SINGLE-HANDED / PRIMARY HAND SIGNS
    // ==========================================

    // 2.1 LOVE (ILY handshape: thumb, index, pinky extended)
    if (f0.ilySign) {
      return formatResult('LOVE', 0.96);
    }

    // 2.2 BATHROOM
    // In ISL: Pinky extended upright shaken side-to-side (traditional Indian sign)
    if (
      lang === 'ISL' &&
      f0.pinkyExtended &&
      f0.indexCurled &&
      f0.middleCurled &&
      f0.ringCurled &&
      oscillationsX >= 1
    ) {
      return formatResult('BATHROOM', 0.95);
    }
    // In ASL: T-handshape (thumb under index) shaken side-to-side
    if (
      lang === 'ASL' &&
      f0.tHandshape &&
      oscillationsX >= 1
    ) {
      return formatResult('BATHROOM', 0.94);
    }

    // 2.3 GOODBYE (Open palm waving horizontally side-to-side)
    const isWaving = tipOscillationsX >= 2 || (tipOscillationsX >= 1 && tipSpanX > 0.055);
    if (f0.openPalm && isWaving && hands[0][MIDDLE_TIP].y < f0.wrist.y) {
      return formatResult('GOODBYE', 0.95);
    }

    // 2.4 HELLO (Open palm raised high near temple/brow held steady without waving)
    if (
      f0.openPalm &&
      (hands[0][MIDDLE_TIP].y < 0.40 || f0.isFaceZone) &&
      !isWaving &&
      tipSpanX < 0.045
    ) {
      return formatResult('HELLO', 0.94);
    }

    // 2.5 SLEEP (Hand tilted against cheek / face, steady without waving)
    if (
      (f0.openPalm || f0.bunchedTips) &&
      f0.isFaceZone &&
      Math.abs(hands[0][INDEX_TIP].x - f0.wrist.x) > 0.08 &&
      !isWaving &&
      tipSpanX < 0.045 &&
      Math.abs(dx) < 0.03
    ) {
      return formatResult('SLEEP', 0.92);
    }

    // 2.6 HAPPY (Open flat hand brushing upward repeatedly on chest)
    if (
      f0.openPalm &&
      f0.isChestZone &&
      oscillationsY >= 1 &&
      dy < 0
    ) {
      return formatResult('HAPPY', 0.93);
    }

    // 2.7 SAD (Open hand in front of face with drooping fingers moving downward)
    if (
      f0.openPalm &&
      f0.isFaceZone &&
      dy > 0.02
    ) {
      return formatResult('SAD', 0.93);
    }

    // 2.8 THANK_YOU (Open flat hand near chin/mouth moving forward/down)
    if (
      f0.openPalm &&
      hands[0][INDEX_TIP].y < 0.44 &&
      (dy > 0.015 || hands[0][INDEX_TIP].y > 0.32)
    ) {
      return formatResult('THANK_YOU', 0.92);
    }

    // 2.9 STOP (Open vertical palm held steady facing camera like a barrier)
    if (
      f0.openPalm &&
      hands[0][MIDDLE_TIP].y < f0.wrist.y - 0.12 &&
      f0.isChestZone &&
      !isWaving &&
      oscillationsX < 2
    ) {
      return formatResult('STOP', 0.92);
    }

    // 2.10 WAIT (Open palm hovering at chest level with low movement)
    if (
      f0.openPalm &&
      f0.isChestZone &&
      Math.abs(dx) < 0.03 &&
      Math.abs(dy) < 0.03 &&
      !isWaving &&
      hands[0][MIDDLE_TIP].y > f0.wrist.y - 0.10
    ) {
      return formatResult('WAIT', 0.90);
    }

    // 2.11 COME (Beckoning inward toward body)
    if (
      (f0.pointing || f0.openPalm) &&
      dy < -0.02 &&
      f0.isChestZone
    ) {
      return formatResult('COME', 0.91);
    }

    // 2.12 GO (Pointing forward and moving outward abruptly)
    if (
      f0.pointing &&
      (dy > 0.03 || Math.abs(dx) > 0.04) &&
      f0.isChestZone
    ) {
      return formatResult('GO', 0.92);
    }

    // 2.13 UNDERSTAND (Index finger tapping temple / flicking near forehead)
    if (
      f0.pointing &&
      f0.isFaceZone &&
      hands[0][INDEX_TIP].y < 0.32 &&
      oscillationsX < 2
    ) {
      return formatResult('UNDERSTAND', 0.93);
    }

    // 2.14 DONT_UNDERSTAND (Index finger near temple with wagging or head shake)
    if (
      f0.pointing &&
      f0.isFaceZone &&
      hands[0][INDEX_TIP].y < 0.34 &&
      oscillationsX >= 2
    ) {
      return formatResult('DONT_UNDERSTAND', 0.92);
    }

    // 2.15 EAT (Bunched fingertips brought toward mouth)
    if (f0.bunchedTips && f0.isFaceZone) {
      return formatResult('EAT', 0.94);
    }

    // 2.16 FOOD (Bunched fingertips tapping near mouth repeatedly)
    if (f0.bunchedTips && f0.isFaceZone && oscillationsY >= 1) {
      return formatResult('FOOD', 0.93);
    }

    // 2.17 DRINK (C-handshape held like a cup tilted toward mouth)
    if (f0.cHandshape && f0.isFaceZone) {
      return formatResult('DRINK', 0.93);
    }

    // 2.18 WATER (W-handshape tapped against chin)
    if (f0.wHandshape && (f0.isFaceZone || hands[0][INDEX_TIP].y < 0.45)) {
      return formatResult('WATER', 0.95);
    }

    // 2.19 YES (Closed fist or thumbs-up nodding up and down vertically)
    if ((f0.fist || f0.thumbUp) && (oscillationsY >= 1 || Math.abs(dy) > 0.025)) {
      return formatResult('YES', 0.94);
    }

    // 2.20 GOOD (Clear steady upright thumbs-up)
    if (f0.thumbUp && f0.indexCurled && f0.middleCurled && f0.ringCurled && f0.pinkyCurled) {
      return formatResult('GOOD', 0.95);
    }

    // 2.21 BAD (Clear steady thumbs-down)
    if (f0.thumbDown && f0.indexCurled && f0.middleCurled && f0.ringCurled && f0.pinkyCurled) {
      return formatResult('BAD', 0.95);
    }

    // 2.22 NO (Index finger wagging side to side OR index+middle snapping shut)
    const isWagging = tipOscillationsX >= 2 || (f0.pointing && tipSpanX > 0.04);
    if (
      (f0.pointing && isWagging) ||
      (f0.nameShape && (isWagging || oscillationsY >= 1))
    ) {
      return formatResult('NO', 0.94);
    }

    // 2.23 WE (Index finger or open hand sweeping across chest in horizontal arc)
    if (
      (f0.pointing || f0.openPalm) &&
      f0.isChestZone &&
      Math.abs(dx) >= 0.065 &&
      tipOscillationsX <= 1
    ) {
      return formatResult('WE', 0.93);
    }

    // 2.24 THEY (Index finger pointing laterally to the side)
    if (
      f0.pointing &&
      f0.isChestZone &&
      (f0.pointingToSide || Math.abs(dx) > 0.05) &&
      tipOscillationsX < 2
    ) {
      return formatResult('THEY', 0.92);
    }

    // 2.25 HE (Index finger pointing sideways at upper face / temple level)
    if (
      f0.pointing &&
      f0.isFaceZone &&
      f0.pointingToSide &&
      tipOscillationsX < 2
    ) {
      return formatResult('HE', 0.92);
    }

    // 2.26 SHE (Index finger pointing sideways at lower face / chin level)
    if (
      f0.pointing &&
      f0.isChestZone &&
      f0.pointingToSide &&
      tipOscillationsX < 2
    ) {
      return formatResult('SHE', 0.92);
    }

    // 2.27 YOU (Index finger pointing forward towards camera at chest level)
    if (
      f0.pointing &&
      f0.isChestZone &&
      (f0.pointingToCamera || (!f0.pointingToChest && !f0.pointingToSide)) &&
      Math.abs(dx) < 0.05 &&
      tipOscillationsX < 2
    ) {
      return formatResult('YOU', 0.94);
    }

    // 2.28 I / ME (Index finger pointing directly to chest)
    if (
      f0.pointing &&
      f0.isChestZone &&
      (f0.pointingToChest || hands[0][INDEX_TIP].y > 0.38) &&
      Math.abs(dx) < 0.05 &&
      tipOscillationsX < 2
    ) {
      return formatResult('I', 0.94);
    }

    // 2.29 MY (Flat open palm resting on center of chest)
    if (
      f0.openPalm &&
      f0.isChestZone &&
      Math.abs(dx) < 0.035 &&
      Math.abs(dy) < 0.035 &&
      !isWaving
    ) {
      return formatResult('MY', 0.93);
    }

    // 2.30 YOUR (Flat open palm pushed forward towards other person)
    if (
      f0.openPalm &&
      f0.isChestZone &&
      hands[0][MIDDLE_TIP].y < f0.wrist.y - 0.06 &&
      Math.abs(dx) < 0.04 &&
      !isWaving
    ) {
      return formatResult('YOUR', 0.92);
    }

    // 2.31 NAME (Index + Middle extended together held or tapped near chest)
    if (f0.nameShape && f0.isChestZone) {
      return formatResult('NAME', 0.91);
    }

    // 2.32 SORRY (Closed fist moving in a circular motion on chest)
    if (
      f0.fist &&
      f0.isChestZone &&
      (Math.abs(dx) > 0.02 || tipSpanX > 0.03) &&
      oscillationsX >= 1 &&
      (Math.abs(dy) > 0.02 || oscillationsY >= 1)
    ) {
      return formatResult('SORRY', 0.90);
    }

    // 2.33 PLEASE in ASL (Flat open hand rubbing chest in circular motion)
    if (
      lang === 'ASL' &&
      f0.openPalm &&
      f0.isChestZone &&
      (Math.abs(dx) > 0.02 || Math.abs(dy) > 0.02)
    ) {
      return formatResult('PLEASE', 0.92);
    }

    // Unknown or low-confidence gesture -> Return null
    return null;
  }

  public reset(): void {
    this.history = [];
  }
}

export interface ISLRecognizerCallbacks {
  onWordRecognized?: (gloss: string, text: string, confidence: number) => void;
  onSentenceUpdated?: (fullSentence: string, words: string[], translation: SentenceTranslationResult) => void;
  onCandidateUpdate?: (gloss: string | null, progress: number) => void;
  onProgressUpdated?: (progress: number) => void;
  onWordRevealed?: (word: string, currentText: string) => void;
  onPhraseCompleted?: (phrase: any, fullText: string) => void;
}

/**
 * ISLRecognizer
 * Main recognizer engine for the Ishara application.
 * Supports both ISL and ASL with separate language profiles,
 * candidate debouncing, duplicate cooldown, and sentence builder integration.
 */
export class ISLRecognizer implements Recognizer {
  public name = 'Ishara ISL + ASL Realtime Recognizer (v2)';

  private classifier = new MultiLanguageClassifier();
  private callbacks: ISLRecognizerCallbacks = {};

  // Accumulated raw sign glosses (e.g. ['ISL_I', 'ISL_WANT', 'ISL_WATER'])
  private rawGlosses: string[] = [];
  private sentenceWords: string[] = [];

  private candidateGloss: string | null = null;
  private candidateConfidence: number = 0;
  private candidateStableFrames: number = 0;
  private readonly requiredStableFrames: number = 5; // ~160ms stability threshold

  // Cooldown to avoid duplicate continuous triggers of the same sign
  private lastConfirmedGloss: string | null = null;
  private lastConfirmedTime: number = 0;
  private readonly wordCooldownMs: number = 1400; // 1.4s cooldown for identical sign

  private keydownHandler: ((e: KeyboardEvent) => void) | null = null;

  constructor(callbacks?: ISLRecognizerCallbacks) {
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
        'I',
        'YOU',
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

  /**
   * Trigger a sign manually (used by gesture simulator chips or presenter shortcuts).
   */
  public triggerManualSign(signIdOrGloss: string): void {
    const cleanId = normalizeGloss(signIdOrGloss);
    const def = SIGN_VOCABULARY[cleanId];
    if (!def) return;

    const lang = this.classifier.getLanguage();
    const gloss = lang === 'ISL' ? def.islGloss : def.aslGloss;
    this.confirmWord(gloss, def.text, 0.95);
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
    this.callbacks.onCandidateUpdate?.(gloss, 1.0);
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

  public getFullSentence(): string {
    return buildSentenceFromGlosses(this.rawGlosses, this.classifier.getLanguage()).naturalSentence;
  }

  public clearSentence(): void {
    this.rawGlosses = [];
    this.sentenceWords = [];
    this.candidateGloss = null;
    this.candidateStableFrames = 0;
    this.lastConfirmedGloss = null;
    this.lastConfirmedTime = 0;
    const emptyTranslation = buildSentenceFromGlosses([], this.classifier.getLanguage());
    this.callbacks.onSentenceUpdated?.('', [], emptyTranslation);
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
    const keys = Object.keys(SIGN_VOCABULARY);
    const key = keys[index % keys.length];
    if (key) {
      this.triggerManualSign(key);
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
