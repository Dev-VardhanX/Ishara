export const SIGN_IDS = [
  'HELLO', 'THANK_YOU', 'YES', 'NO', 'PLEASE',
  'GOOD_MORNING', 'GOOD_NIGHT', 'SORRY', 'HELP', 'WATER',
  'FOOD', 'BATHROOM', 'MORE', 'STOP', 'LOVE',
  'FRIEND', 'HAPPY', 'NAME', 'HOW_ARE_YOU', 'HOME'
] as const;

export type SignId = (typeof SIGN_IDS)[number] | string;
export type AvatarExpression = 'neutral' | 'happy' | 'questioning' | 'sad';
export type SkinToneId = 'warm-peach' | 'golden-ochre' | 'deep-umber';

export const SKIN_TONES: Record<SkinToneId, string> = {
  'warm-peach': '#F6C6B5',
  'golden-ochre': '#D99B72',
  'deep-umber': '#8D583E',
};

export type BoneName =
  | 'Torso' | 'Neck' | 'Head'
  | 'LeftShoulder' | 'LeftElbow' | 'LeftWrist'
  | 'RightShoulder' | 'RightElbow' | 'RightWrist'
  | 'LeftThumb1' | 'LeftThumb2'
  | 'LeftIndex1' | 'LeftIndex2' | 'LeftIndex3'
  | 'LeftMiddle1' | 'LeftMiddle2' | 'LeftMiddle3'
  | 'LeftRing1' | 'LeftRing2' | 'LeftRing3'
  | 'LeftPinky1' | 'LeftPinky2' | 'LeftPinky3'
  | 'RightThumb1' | 'RightThumb2'
  | 'RightIndex1' | 'RightIndex2' | 'RightIndex3'
  | 'RightMiddle1' | 'RightMiddle2' | 'RightMiddle3'
  | 'RightRing1' | 'RightRing2' | 'RightRing3'
  | 'RightPinky1' | 'RightPinky2' | 'RightPinky3';

export type QuatTuple = [number, number, number, number];

export const NEUTRAL_POSE_JOINTS: Partial<Record<BoneName, QuatTuple>> = {
  Torso: [0, 0, 0, 1],
  Neck: [0, 0, 0, 1],
  Head: [0, 0, 0, 1],
  LeftShoulder: [0.12, 0, 0.28, 0.952],
  LeftElbow: [-0.38, 0.15, -0.18, 0.895],
  LeftWrist: [0, 0, 0, 1],
  RightShoulder: [0.12, 0, -0.28, 0.952],
  RightElbow: [-0.38, -0.15, 0.18, 0.895],
  RightWrist: [0, 0, 0, 1],
};

export interface ArmPoseData {
  wrist: [number, number, number]; // [x, y, z] in body-frame shoulder-width units
  elbow: [number, number, number]; // [x, y, z] pole hint in body-frame shoulder-width units
  wristToMouth?: [number, number, number];
  wristToNose?: [number, number, number];
  isFaceAnchored?: boolean;
}

export interface SignFrame {
  t: number;
  joints: Partial<Record<BoneName, QuatTuple>>;
  expression?: AvatarExpression;
  leftArm?: ArmPoseData;
  rightArm?: ArmPoseData;
}

export interface SignClip {
  signId: string;
  language: 'ISL' | 'ASL';
  fps: 30;
  duration: number;
  author: string;
  verified: boolean;
  recordedAt: string;
  hasArmData?: boolean;
  isAuthored?: boolean;
  expressionTrack?: Array<{ t: number; expression: AvatarExpression }>;
  frames: SignFrame[];
}

export interface SignManifest {
  version: 1;
  updatedAt: string;
  signs: Record<string, { file: string; language: 'ISL' | 'ASL'; verified: boolean; author: string }>;
}

export interface StepStatus {
  gloss: string;
  resolvedType: 'clip' | 'builtin-wave' | 'fingerspelled' | 'missing';
  verified: boolean;
  missingMessage?: string;
}
