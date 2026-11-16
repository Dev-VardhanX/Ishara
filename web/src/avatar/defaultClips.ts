import { SignClip, SignFrame, ArmPoseData, AvatarExpression, BoneName, QuatTuple, NEUTRAL_POSE_JOINTS } from './types';
import { getFingerPresetJoints, slerpJoints } from './kinematics';
import * as THREE from 'three';

export interface PoseKeyframe {
  t: number;
  wrist: [number, number, number];
  elbow: [number, number, number];
  fingerPreset: 'open' | 'fist' | 'point' | 'flat' | 'pinch' | 'c_shape' | 'thumbs_up' | 'ily';
  wristRot?: [number, number, number]; // Euler angles [rotX, rotY, rotZ] in radians
  isFaceAnchored?: boolean;
  wristToMouth?: [number, number, number];
  wristToNose?: [number, number, number];
  expression?: AvatarExpression;
}

/**
 * Interpolates authored keyframes into a 30 fps SignClip with smooth ease-in-out transitions
 */
export function interpolateKeyframesToClip(
  signId: string,
  language: 'ISL' | 'ASL',
  duration: number,
  keyframes: PoseKeyframe[],
  author = 'Ishara Hand-Authored Demo',
  verified = false
): SignClip {
  const fps = 30;
  const totalFrames = Math.max(2, Math.round(duration * fps));
  const sorted = [...keyframes].sort((a, b) => a.t - b.t);

  if (sorted[0].t > 0) {
    sorted.unshift({ ...sorted[0], t: 0 });
  }
  if (sorted[sorted.length - 1].t < duration) {
    sorted.push({ ...sorted[sorted.length - 1], t: duration });
  }

  const frames: SignFrame[] = [];

  for (let i = 0; i <= totalFrames; i++) {
    const t = Number(((i / totalFrames) * duration).toFixed(4));
    let kA = sorted[0];
    let kB = sorted[sorted.length - 1];

    for (let j = 0; j < sorted.length - 1; j++) {
      if (sorted[j].t <= t && sorted[j + 1].t >= t) {
        kA = sorted[j];
        kB = sorted[j + 1];
        break;
      }
    }

    const span = Math.max(1e-4, kB.t - kA.t);
    const alpha = Math.min(1, Math.max(0, (t - kA.t) / span));

    // Smooth sinusoidal ease-in-out interpolation
    const smoothAlpha = (1 - Math.cos(alpha * Math.PI)) / 2;

    const wrist: [number, number, number] = [
      kA.wrist[0] + (kB.wrist[0] - kA.wrist[0]) * smoothAlpha,
      kA.wrist[1] + (kB.wrist[1] - kA.wrist[1]) * smoothAlpha,
      kA.wrist[2] + (kB.wrist[2] - kA.wrist[2]) * smoothAlpha,
    ];

    const elbow: [number, number, number] = [
      kA.elbow[0] + (kB.elbow[0] - kA.elbow[0]) * smoothAlpha,
      kA.elbow[1] + (kB.elbow[1] - kA.elbow[1]) * smoothAlpha,
      kA.elbow[2] + (kB.elbow[2] - kA.elbow[2]) * smoothAlpha,
    ];

    const jointsA = getFingerPresetJoints(kA.fingerPreset, 'Right');
    const jointsB = getFingerPresetJoints(kB.fingerPreset, 'Right');
    const fingerJoints = slerpJoints(jointsA, jointsB, smoothAlpha);

    // Interpolate wrist orientation Euler angles
    const rotA = kA.wristRot || [0, 0, 0];
    const rotB = kB.wristRot || [0, 0, 0];
    const rx = rotA[0] + (rotB[0] - rotA[0]) * smoothAlpha;
    const ry = rotA[1] + (rotB[1] - rotA[1]) * smoothAlpha;
    const rz = rotA[2] + (rotB[2] - rotA[2]) * smoothAlpha;
    const qWrist = new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'XYZ'));

    const wristJoint: Partial<Record<BoneName, QuatTuple>> = {
      RightWrist: [qWrist.x, qWrist.y, qWrist.z, qWrist.w],
    };

    const rightArm: ArmPoseData = {
      wrist,
      elbow,
      isFaceAnchored: kA.isFaceAnchored || kB.isFaceAnchored,
    };

    if (kA.wristToMouth && kB.wristToMouth) {
      rightArm.wristToMouth = [
        kA.wristToMouth[0] + (kB.wristToMouth[0] - kA.wristToMouth[0]) * smoothAlpha,
        kA.wristToMouth[1] + (kB.wristToMouth[1] - kA.wristToMouth[1]) * smoothAlpha,
        kA.wristToMouth[2] + (kB.wristToMouth[2] - kA.wristToMouth[2]) * smoothAlpha,
      ];
    } else if (kA.wristToMouth ?? kB.wristToMouth) {
      rightArm.wristToMouth = kA.wristToMouth ?? kB.wristToMouth;
    }

    if (kA.wristToNose && kB.wristToNose) {
      rightArm.wristToNose = [
        kA.wristToNose[0] + (kB.wristToNose[0] - kA.wristToNose[0]) * smoothAlpha,
        kA.wristToNose[1] + (kB.wristToNose[1] - kA.wristToNose[1]) * smoothAlpha,
        kA.wristToNose[2] + (kB.wristToNose[2] - kA.wristToNose[2]) * smoothAlpha,
      ];
    } else if (kA.wristToNose ?? kB.wristToNose) {
      rightArm.wristToNose = kA.wristToNose ?? kB.wristToNose;
    }

    frames.push({
      t,
      joints: {
        ...NEUTRAL_POSE_JOINTS,
        ...fingerJoints,
        ...wristJoint,
      },
      rightArm,
      expression: alpha > 0.5 ? (kB.expression ?? 'neutral') : (kA.expression ?? 'neutral'),
    });
  }

  return {
    signId: signId.toUpperCase().trim(),
    language,
    fps,
    duration,
    author,
    verified,
    recordedAt: '2026-11-16T12:00:00.000Z',
    hasArmData: true,
    isAuthored: true,
    frames,
  };
}

// -----------------------------------------------------------------------------------
// The 6 Hand-Authored Demonstration Signs
// Hand-crafted keyframes tuned visually for natural arm kinematics, lateral elbow rotation,
// zero joint flips, accurate contact points (~3cm to lips/temple), and gentle facial expressions.
// -----------------------------------------------------------------------------------

// Shared Neutral Rest Pose: arms relaxed at sides, hands open, sleeve cuffs clean
const REST_WRIST: [number, number, number] = [0.45, -0.65, 0.05];
const REST_ELBOW: [number, number, number] = [0.55, -0.30, 0.02];

// 1. EAT: Hand shape = bunched fingertips (all 4 fingertips + thumb tip pinched together).
// Arm rises from the side with lateral elbow, forearm rotates via elbow inward to lips,
// taps mouth twice (touch, move away, touch), then lowers via side to rest.
export const EAT_KEYFRAMES: PoseKeyframe[] = [
  { t: 0.00, wrist: REST_WRIST, elbow: REST_ELBOW, fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
  { t: 0.22, wrist: [0.38, -0.05, 0.22], elbow: [0.72, -0.05, 0.16], fingerPreset: 'pinch', wristRot: [-2.0, 0.5, 0.9], expression: 'happy' },
  { t: 0.45, wrist: [0.08, 0.48, 0.38], elbow: [0.75, 0.08, 0.15], fingerPreset: 'pinch', isFaceAnchored: true, wristToMouth: [0, 0.01, 0.02], wristRot: [-2.3836, 0.7171, 1.0895], expression: 'happy' },
  { t: 0.65, wrist: [0.14, 0.42, 0.44], elbow: [0.75, 0.06, 0.15], fingerPreset: 'pinch', isFaceAnchored: true, wristToMouth: [0.03, -0.03, 0.06], wristRot: [-2.2, 0.6, 1.0], expression: 'happy' },
  { t: 0.85, wrist: [0.08, 0.48, 0.38], elbow: [0.75, 0.08, 0.15], fingerPreset: 'pinch', isFaceAnchored: true, wristToMouth: [0, 0.01, 0.02], wristRot: [-2.3836, 0.7171, 1.0895], expression: 'happy' },
  { t: 1.12, wrist: [0.38, -0.22, 0.18], elbow: [0.68, -0.15, 0.10], fingerPreset: 'pinch', wristRot: [-1.5, 0.3, 0.6], expression: 'happy' },
  { t: 1.40, wrist: REST_WRIST, elbow: REST_ELBOW, fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
];

// 2. DRINK: Hand shape = C-shape holding a glass.
// Arm rises from side with lateral elbow, forearm rotates via elbow inward to lips,
// tilts wrist back 45-60 deg tipping toward mouth, holds briefly, then lowers via side.
export const DRINK_KEYFRAMES: PoseKeyframe[] = [
  { t: 0.00, wrist: REST_WRIST, elbow: REST_ELBOW, fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
  { t: 0.28, wrist: [0.38, -0.02, 0.25], elbow: [0.72, -0.05, 0.16], fingerPreset: 'c_shape', wristRot: [2.3, 0.2, -2.8], expression: 'happy' },
  { t: 0.58, wrist: [0.08, 0.48, 0.38], elbow: [0.75, 0.08, 0.15], fingerPreset: 'c_shape', isFaceAnchored: true, wristToMouth: [0, 0.01, 0.03], wristRot: [2.4433, 0.2174, -2.9407], expression: 'happy' },
  { t: 0.85, wrist: [0.08, 0.50, 0.38], elbow: [0.75, 0.08, 0.15], fingerPreset: 'c_shape', isFaceAnchored: true, wristToMouth: [0, 0.02, 0.02], wristRot: [2.1138, 0.1026, 2.6157], expression: 'happy' },
  { t: 1.00, wrist: [0.08, 0.50, 0.38], elbow: [0.75, 0.08, 0.15], fingerPreset: 'c_shape', isFaceAnchored: true, wristToMouth: [0, 0.02, 0.02], wristRot: [2.1138, 0.1026, 2.6157], expression: 'happy' },
  { t: 1.20, wrist: [0.38, -0.22, 0.18], elbow: [0.68, -0.15, 0.10], fingerPreset: 'c_shape', wristRot: [2.3, 0.2, -2.8], expression: 'happy' },
  { t: 1.40, wrist: REST_WRIST, elbow: REST_ELBOW, fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
];

// 3. HELLO: Open hand waving beside the head (matches user reference image exactly!)
// Upper arm rotates out to side, elbow bends ~90 deg, forearm rises vertically beside head,
// hand performs a friendly side-to-side wave, then smoothly returns to rest.
export const HELLO_KEYFRAMES: PoseKeyframe[] = [
  { t: 0.00, wrist: REST_WRIST, elbow: REST_ELBOW, fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
  { t: 0.35, wrist: [0.745, 0.532, 0.106], elbow: [1.000, 0.064, 0.043], fingerPreset: 'open', isFaceAnchored: true, wristRot: [-3.0123, -0.4166, 2.6875], expression: 'happy' },
  { t: 0.60, wrist: [0.745, 0.532, 0.106], elbow: [1.000, 0.064, 0.043], fingerPreset: 'open', isFaceAnchored: true, wristRot: [-3.0123, -0.4166, 2.4375], expression: 'happy' }, // Wave left
  { t: 0.85, wrist: [0.745, 0.532, 0.106], elbow: [1.000, 0.064, 0.043], fingerPreset: 'open', isFaceAnchored: true, wristRot: [-3.0123, -0.4166, 2.9375], expression: 'happy' }, // Wave right
  { t: 1.10, wrist: [0.745, 0.532, 0.106], elbow: [1.000, 0.064, 0.043], fingerPreset: 'open', isFaceAnchored: true, wristRot: [-3.0123, -0.4166, 2.6875], expression: 'happy' }, // Center hold
  { t: 1.45, wrist: REST_WRIST, elbow: REST_ELBOW, fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
];

// 4. STOP: Open flat hand, fingers together, palm facing forward to camera, held vertical.
// Raised to shoulder height in front of right shoulder, elbow bent ~90 deg laterally, pushed forward and held steady, then lowered.
export const STOP_KEYFRAMES: PoseKeyframe[] = [
  { t: 0.00, wrist: REST_WRIST, elbow: REST_ELBOW, fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
  { t: 0.35, wrist: [0.42, 0.15, 0.40], elbow: [0.72, -0.05, 0.20], fingerPreset: 'flat', wristRot: [3.0406, -0.0711, -2.0532], expression: 'neutral' },
  { t: 0.65, wrist: [0.42, 0.15, 0.55], elbow: [0.72, -0.05, 0.22], fingerPreset: 'flat', wristRot: [3.0406, -0.0711, -2.0532], expression: 'neutral' },
  { t: 0.95, wrist: [0.42, 0.15, 0.55], elbow: [0.72, -0.05, 0.22], fingerPreset: 'flat', wristRot: [3.0406, -0.0711, -2.0532], expression: 'neutral' },
  { t: 1.15, wrist: [0.42, -0.25, 0.20], elbow: [0.65, -0.15, 0.10], fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
  { t: 1.30, wrist: REST_WRIST, elbow: REST_ELBOW, fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
];

// 5. YES: Closed fist (thumb over fingers) in front of right shoulder, nods wrist down and up twice (~26 deg), returns to rest.
export const YES_KEYFRAMES: PoseKeyframe[] = [
  { t: 0.00, wrist: REST_WRIST, elbow: REST_ELBOW, fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
  { t: 0.28, wrist: [0.38, 0.08, 0.38], elbow: [0.72, -0.08, 0.18], fingerPreset: 'fist', wristRot: [1.7236, 0.3780, -0.4819], expression: 'happy' },
  { t: 0.48, wrist: [0.38, 0.04, 0.38], elbow: [0.72, -0.08, 0.18], fingerPreset: 'fist', wristRot: [1.7236, 0.3780, -0.0319], expression: 'happy' },
  { t: 0.68, wrist: [0.38, 0.10, 0.38], elbow: [0.72, -0.08, 0.18], fingerPreset: 'fist', wristRot: [1.7236, 0.3780, -0.4819], expression: 'happy' },
  { t: 0.88, wrist: [0.38, 0.04, 0.38], elbow: [0.72, -0.08, 0.18], fingerPreset: 'fist', wristRot: [1.7236, 0.3780, -0.0319], expression: 'happy' },
  { t: 1.08, wrist: [0.38, 0.10, 0.38], elbow: [0.72, -0.08, 0.18], fingerPreset: 'fist', wristRot: [1.7236, 0.3780, -0.4819], expression: 'happy' },
  { t: 1.25, wrist: [0.40, -0.25, 0.20], elbow: [0.65, -0.15, 0.10], fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
  { t: 1.40, wrist: REST_WRIST, elbow: REST_ELBOW, fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
];

// 6. GOOD: Fist with thumb pointing straight up, raised in front of right shoulder, pushed slightly upward,
// held steady, then lowered to rest.
export const GOOD_KEYFRAMES: PoseKeyframe[] = [
  { t: 0.00, wrist: REST_WRIST, elbow: REST_ELBOW, fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
  { t: 0.32, wrist: [0.38, 0.12, 0.38], elbow: [0.72, -0.08, 0.18], fingerPreset: 'thumbs_up', wristRot: [1.7153, 0.4383, -0.3448], expression: 'happy' },
  { t: 0.65, wrist: [0.38, 0.24, 0.38], elbow: [0.72, -0.04, 0.18], fingerPreset: 'thumbs_up', wristRot: [1.6218, 0.5906, 0.0189], expression: 'happy' },
  { t: 0.95, wrist: [0.38, 0.24, 0.38], elbow: [0.72, -0.04, 0.18], fingerPreset: 'thumbs_up', wristRot: [1.6218, 0.5906, 0.0189], expression: 'happy' },
  { t: 1.15, wrist: [0.40, -0.25, 0.20], elbow: [0.65, -0.15, 0.10], fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
  { t: 1.30, wrist: REST_WRIST, elbow: REST_ELBOW, fingerPreset: 'open', wristRot: [0, 0, 0], expression: 'neutral' },
];

// The 6 hand-authored demonstration signs map
export const DEFAULT_KEYFRAMES_MAP: Record<string, { duration: number; keyframes: PoseKeyframe[] }> = {
  EAT: { duration: 1.40, keyframes: EAT_KEYFRAMES },
  DRINK: { duration: 1.40, keyframes: DRINK_KEYFRAMES },
  HELLO: { duration: 1.45, keyframes: HELLO_KEYFRAMES },
  STOP: { duration: 1.30, keyframes: STOP_KEYFRAMES },
  YES: { duration: 1.40, keyframes: YES_KEYFRAMES },
  GOOD: { duration: 1.30, keyframes: GOOD_KEYFRAMES },
};

// Pre-compiled 6 verified demonstration clips (verified: false, isAuthored: true)
export const DEFAULT_CLIPS: Record<string, SignClip> = {
  EAT: interpolateKeyframesToClip('EAT', 'ISL', 1.40, EAT_KEYFRAMES, 'Ishara Hand-Authored Demo', false),
  DRINK: interpolateKeyframesToClip('DRINK', 'ISL', 1.40, DRINK_KEYFRAMES, 'Ishara Hand-Authored Demo', false),
  HELLO: interpolateKeyframesToClip('HELLO', 'ISL', 1.45, HELLO_KEYFRAMES, 'Ishara Hand-Authored Demo', false),
  STOP: interpolateKeyframesToClip('STOP', 'ISL', 1.30, STOP_KEYFRAMES, 'Ishara Hand-Authored Demo', false),
  YES: interpolateKeyframesToClip('YES', 'ISL', 1.40, YES_KEYFRAMES, 'Ishara Hand-Authored Demo', false),
  GOOD: interpolateKeyframesToClip('GOOD', 'ISL', 1.30, GOOD_KEYFRAMES, 'Ishara Hand-Authored Demo', false),
};
