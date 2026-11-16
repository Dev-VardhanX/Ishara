import * as THREE from 'three';
import { BoneName, QuatTuple, SignFrame, ArmPoseData } from './types';
import { Landmark } from '../ml/handTracker';

/**
 * Normalizes a vector or returns default unit vector
 */
export function normVec(v: THREE.Vector3): THREE.Vector3 {
  const len = v.length();
  if (len < 1e-6) return new THREE.Vector3(0, -1, 0);
  return v.multiplyScalar(1 / len);
}

/**
 * Calculates rotation quaternion from vector A to vector B
 */
export function quatFromUnitVectors(from: THREE.Vector3, to: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(from, to);
}

/**
 * One-Euro Filter for 1D signals
 */
export class OneEuroFilter1D {
  private minCutoff: number;
  private beta: number;
  private dCutoff: number;
  private xPrev: number | null = null;
  private dxPrev = 0;
  private tPrev: number | null = null;

  constructor(minCutoff = 1.2, beta = 0.05, dCutoff = 1.0) {
    this.minCutoff = minCutoff;
    this.beta = beta;
    this.dCutoff = dCutoff;
  }

  private alpha(cutoff: number, dt: number): number {
    const tau = 1.0 / (2 * Math.PI * cutoff);
    return 1.0 / (1.0 + tau / dt);
  }

  public filter(x: number, t: number): number {
    if (this.xPrev === null || this.tPrev === null) {
      this.xPrev = x;
      this.tPrev = t;
      this.dxPrev = 0;
      return x;
    }

    const dt = Math.max(1e-4, t - this.tPrev);
    this.tPrev = t;

    const dx = (x - this.xPrev) / dt;
    const aD = this.alpha(this.dCutoff, dt);
    const dxHat = aD * dx + (1 - aD) * this.dxPrev;
    this.dxPrev = dxHat;

    const cutoff = this.minCutoff + this.beta * Math.abs(dxHat);
    const a = this.alpha(cutoff, dt);
    const xHat = a * x + (1 - a) * this.xPrev;
    this.xPrev = xHat;

    return xHat;
  }

  public reset(): void {
    this.xPrev = null;
    this.dxPrev = 0;
    this.tPrev = null;
  }
}

/**
 * One-Euro Filter for 3D Points
 */
export class OneEuroFilter3D {
  private fx: OneEuroFilter1D;
  private fy: OneEuroFilter1D;
  private fz: OneEuroFilter1D;

  constructor(minCutoff = 1.2, beta = 0.05, dCutoff = 1.0) {
    this.fx = new OneEuroFilter1D(minCutoff, beta, dCutoff);
    this.fy = new OneEuroFilter1D(minCutoff, beta, dCutoff);
    this.fz = new OneEuroFilter1D(minCutoff, beta * 0.5, dCutoff); // Stronger filter on Z depth
  }

  public filter(p: [number, number, number], t: number): [number, number, number] {
    return [
      this.fx.filter(p[0], t),
      this.fy.filter(p[1], t),
      this.fz.filter(p[2], t),
    ];
  }

  public reset(): void {
    this.fx.reset();
    this.fy.reset();
    this.fz.reset();
  }
}

/**
 * Body-Relative Coordinate Frame computed from Pose landmarks
 */
export interface BodyFrame {
  origin: THREE.Vector3; // Midpoint between shoulders
  shoulderWidth: number;
  axisX: THREE.Vector3; // Right shoulder to left shoulder
  axisY: THREE.Vector3; // Up towards head
  axisZ: THREE.Vector3; // Forward
  nose: THREE.Vector3;
  mouth: THREE.Vector3;
}

/**
 * Build Body-Relative Coordinate Frame from MediaPipe Pose (33 points)
 */
export function computeBodyFrame(
  poseLandmarks: Landmark[],
  mirrored = false
): BodyFrame | null {
  if (!poseLandmarks || poseLandmarks.length < 17) return null;

  const toVec = (lm: Landmark): THREE.Vector3 => {
    const x = mirrored ? -(lm.x - 0.5) : lm.x - 0.5;
    const y = -(lm.y - 0.5); // Invert Y so up is positive
    const z = -(lm.z ?? 0); // Forward positive
    return new THREE.Vector3(x, y, z);
  };

  const pLeftShoulder = toVec(poseLandmarks[11]);
  const pRightShoulder = toVec(poseLandmarks[12]);
  const pNose = toVec(poseLandmarks[0]);

  // Mouth center: midpoint of landmark 9 and 10
  const pMouthLeft = poseLandmarks[9] ? toVec(poseLandmarks[9]) : pNose.clone().add(new THREE.Vector3(0, -0.05, 0));
  const pMouthRight = poseLandmarks[10] ? toVec(poseLandmarks[10]) : pNose.clone().add(new THREE.Vector3(0, -0.05, 0));
  const pMouth = new THREE.Vector3().addVectors(pMouthLeft, pMouthRight).multiplyScalar(0.5);

  const origin = new THREE.Vector3().addVectors(pLeftShoulder, pRightShoulder).multiplyScalar(0.5);
  const shoulderVec = new THREE.Vector3().subVectors(pLeftShoulder, pRightShoulder);
  const shoulderWidth = Math.max(0.12, shoulderVec.length());

  const axisX = normVec(shoulderVec.clone());
  const upVec = new THREE.Vector3().subVectors(pNose, origin);
  const axisY = normVec(upVec.clone().sub(axisX.clone().multiplyScalar(upVec.dot(axisX))));
  const axisZ = normVec(new THREE.Vector3().crossVectors(axisX, axisY));

  return {
    origin,
    shoulderWidth,
    axisX,
    axisY,
    axisZ,
    nose: pNose,
    mouth: pMouth,
  };
}

/**
 * Transforms a world-space coordinate into shoulder-width body frame units
 */
export function toBodyCoords(point: THREE.Vector3, frame: BodyFrame): [number, number, number] {
  const d = new THREE.Vector3().subVectors(point, frame.origin);
  const x = d.dot(frame.axisX) / frame.shoulderWidth;
  const y = d.dot(frame.axisY) / frame.shoulderWidth;
  let z = d.dot(frame.axisZ) / frame.shoulderWidth;
  z = Math.max(-0.85, Math.min(0.85, z)); // Clamp noisy single-camera Z depth
  return [Number(x.toFixed(4)), Number(y.toFixed(4)), Number(z.toFixed(4))];
}

/**
 * Extract Arm Pose Data (wrist, elbow, face anchors) from Pose landmarks
 */
export function extractArmPose(
  poseLandmarks: Landmark[],
  side: 'Left' | 'Right',
  frame: BodyFrame,
  mirrored = false
): ArmPoseData | null {
  const toVec = (lm: Landmark): THREE.Vector3 => {
    const x = mirrored ? -(lm.x - 0.5) : lm.x - 0.5;
    const y = -(lm.y - 0.5);
    const z = -(lm.z ?? 0);
    return new THREE.Vector3(x, y, z);
  };

  const elbowIdx = side === 'Left' ? 13 : 14;
  const wristIdx = side === 'Left' ? 15 : 16;

  const lmElbow = poseLandmarks[elbowIdx];
  const lmWrist = poseLandmarks[wristIdx];
  if (!lmElbow || !lmWrist) return null;

  const pElbow = toVec(lmElbow);
  const pWrist = toVec(lmWrist);

  const wristBody = toBodyCoords(pWrist, frame);
  const elbowBody = toBodyCoords(pElbow, frame);

  // Wrist to mouth / nose offsets in shoulder widths
  const dMouth = new THREE.Vector3().subVectors(pWrist, frame.mouth);
  const dNose = new THREE.Vector3().subVectors(pWrist, frame.nose);

  const wristToMouth: [number, number, number] = [
    Number((dMouth.dot(frame.axisX) / frame.shoulderWidth).toFixed(4)),
    Number((dMouth.dot(frame.axisY) / frame.shoulderWidth).toFixed(4)),
    Number((dMouth.dot(frame.axisZ) / frame.shoulderWidth).toFixed(4)),
  ];

  const wristToNose: [number, number, number] = [
    Number((dNose.dot(frame.axisX) / frame.shoulderWidth).toFixed(4)),
    Number((dNose.dot(frame.axisY) / frame.shoulderWidth).toFixed(4)),
    Number((dNose.dot(frame.axisZ) / frame.shoulderWidth).toFixed(4)),
  ];

  const distMouth = Math.sqrt(wristToMouth[0] ** 2 + wristToMouth[1] ** 2 + wristToMouth[2] ** 2);
  const distNose = Math.sqrt(wristToNose[0] ** 2 + wristToNose[1] ** 2 + wristToNose[2] ** 2);
  const isFaceAnchored = distMouth < 0.48 || distNose < 0.48;

  return {
    wrist: wristBody,
    elbow: elbowBody,
    wristToMouth,
    wristToNose,
    isFaceAnchored,
  };
}

/**
 * Analytical Two-Bone Inverse Kinematics (IK) Solver
 * Solves Shoulder and Elbow rotations to reach target wrist with 0.00cm error while pointing elbow toward pole hint.
 */
export function solveTwoBoneIK(
  shoulderPos: THREE.Vector3,
  targetWristPos: THREE.Vector3,
  poleHintPos: THREE.Vector3,
  upperArmLen: number,
  foreArmLen: number,
  side: 'Left' | 'Right'
): { shoulderQuat: THREE.Quaternion; elbowQuat: THREE.Quaternion } {
  const toW = new THREE.Vector3().subVectors(targetWristPos, shoulderPos);
  let d = toW.length();
  const minD = Math.abs(upperArmLen - foreArmLen) + 0.002;
  const maxD = (upperArmLen + foreArmLen) * 0.998;
  d = Math.max(minD, Math.min(maxD, d));

  const u = toW.clone().normalize();
  const toP = new THREE.Vector3().subVectors(poleHintPos, shoulderPos);

  let n = new THREE.Vector3().crossVectors(u, toP);
  if (n.lengthSq() < 1e-6) {
    n = new THREE.Vector3(0, 0, side === 'Left' ? 1 : -1);
  } else {
    n.normalize();
  }

  let v = new THREE.Vector3().crossVectors(n, u).normalize();
  if (v.dot(toP) < 0) {
    v.negate();
    n.negate();
  }

  // S-E-W triangle (Law of Cosines)
  const cosS = (upperArmLen * upperArmLen + d * d - foreArmLen * foreArmLen) / (2 * upperArmLen * d);
  const clampedCosS = Math.max(-1, Math.min(1, cosS));
  const Eu = upperArmLen * clampedCosS;
  const Ev = Math.sqrt(Math.max(0, upperArmLen * upperArmLen - Eu * Eu));

  // Exact elbow position in 3D world space
  const E = shoulderPos.clone().add(u.clone().multiplyScalar(Eu)).add(v.clone().multiplyScalar(Ev));

  const d1 = new THREE.Vector3().subVectors(E, shoulderPos).normalize();
  const d2 = new THREE.Vector3().subVectors(targetWristPos, E).normalize();

  // Shoulder quaternion rotates rest upper arm (0, -1, 0) into d1
  const shoulderQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), d1);

  // Forearm quaternion rotates in elbow's parent (upper-arm) space into d2
  const d2Local = d2.clone().applyQuaternion(shoulderQuat.clone().invert()).normalize();
  const elbowQuat = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, -1, 0), d2Local);

  return { shoulderQuat, elbowQuat };
}

/**
 * SLERP low-pass exponential filter on joint quaternions
 */
export function slerpJoints(
  current: Partial<Record<BoneName, QuatTuple>>,
  target: Partial<Record<BoneName, QuatTuple>>,
  alpha = 0.42
): Partial<Record<BoneName, QuatTuple>> {
  const result: Partial<Record<BoneName, QuatTuple>> = {};
  const allBones = new Set([...Object.keys(current), ...Object.keys(target)]) as Set<BoneName>;

  const qA = new THREE.Quaternion();
  const qB = new THREE.Quaternion();

  for (const bone of allBones) {
    const tupleA = current[bone];
    const tupleB = target[bone];

    if (tupleA && tupleB) {
      qA.set(tupleA[0], tupleA[1], tupleA[2], tupleA[3]);
      qB.set(tupleB[0], tupleB[1], tupleB[2], tupleB[3]);
      qA.slerp(qB, alpha);
      result[bone] = [qA.x, qA.y, qA.z, qA.w];
    } else if (tupleB) {
      result[bone] = tupleB;
    } else if (tupleA) {
      result[bone] = tupleA;
    }
  }

  return result;
}

/**
 * Convert MediaPipe 21 Hand Landmarks into local finger Bone QuatTuples
 */
export function handLandmarksToJoints(
  landmarks: Landmark[],
  side: 'Left' | 'Right',
  mirrored = false
): Partial<Record<BoneName, QuatTuple>> {
  const joints: Partial<Record<BoneName, QuatTuple>> = {};
  if (!landmarks || landmarks.length < 21) return joints;

  const points = landmarks.map((l) => {
    const x = mirrored ? -(l.x - 0.5) : l.x - 0.5;
    const y = -(l.y - 0.5);
    const z = (l.z ?? 0) * (mirrored ? -1 : 1);
    return new THREE.Vector3(x, y, z);
  });

  const restDown = new THREE.Vector3(0, -1, 0);

  const fingerDefs: Array<{
    name: string;
    joints: [number, number][];
  }> = [
    {
      name: `${side}Thumb`,
      joints: [
        [1, 2],
        [2, 4],
      ],
    },
    {
      name: `${side}Index`,
      joints: [
        [5, 6],
        [6, 7],
        [7, 8],
      ],
    },
    {
      name: `${side}Middle`,
      joints: [
        [9, 10],
        [10, 11],
        [11, 12],
      ],
    },
    {
      name: `${side}Ring`,
      joints: [
        [13, 14],
        [14, 15],
        [15, 16],
      ],
    },
    {
      name: `${side}Pinky`,
      joints: [
        [17, 18],
        [18, 19],
        [19, 20],
      ],
    },
  ];

  for (const finger of fingerDefs) {
    finger.joints.forEach(([pStart, pEnd], idx) => {
      const boneName = `${finger.name}${idx + 1}` as BoneName;
      const v = new THREE.Vector3().subVectors(points[pEnd], points[pStart]);
      const dir = normVec(v);
      const q = quatFromUnitVectors(restDown, dir);
      joints[boneName] = [q.x, q.y, q.z, q.w];
    });
  }

  // Estimate wrist tilt relative to palm plane (landmarks 0, 5, 17)
  const p0 = points[0];
  const p5 = points[5];
  const p17 = points[17];
  const palmCenter = new THREE.Vector3().add(p5).add(p17).multiplyScalar(0.5);
  const wristDir = normVec(new THREE.Vector3().subVectors(palmCenter, p0));
  const wristQ = quatFromUnitVectors(restDown, wristDir);
  joints[`${side}Wrist` as BoneName] = [wristQ.x, wristQ.y, wristQ.z, wristQ.w];

  return joints;
}

/**
 * Handcrafted Finger Presets for manual clip authoring or fallback
 */
export function getFingerPresetJoints(
  preset: 'open' | 'fist' | 'point' | 'flat' | 'pinch' | 'c_shape' | 'thumbs_up' | 'ily',
  side: 'Left' | 'Right'
): Partial<Record<BoneName, QuatTuple>> {
  const joints: Partial<Record<BoneName, QuatTuple>> = {};
  const dir = side === 'Left' ? 1 : -1;

  const qCurl = (angle: number, axisX = 1): QuatTuple => {
    const q = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(axisX, 0, 0), angle);
    return [q.x, q.y, q.z, q.w];
  };

  const curlFinger = (name: string, angles: [number, number, number], splayZ = 0) => {
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(angles[0], 0, splayZ));
    joints[`${side}${name}1` as BoneName] = [q1.x, q1.y, q1.z, q1.w];
    joints[`${side}${name}2` as BoneName] = qCurl(angles[1]);
    joints[`${side}${name}3` as BoneName] = qCurl(angles[2]);
  };

  const curlThumb = (angles: [number, number], splayZ = dir * 0.4) => {
    const q1 = new THREE.Quaternion().setFromEuler(new THREE.Euler(angles[0], 0, splayZ));
    joints[`${side}Thumb1` as BoneName] = [q1.x, q1.y, q1.z, q1.w];
    joints[`${side}Thumb2` as BoneName] = qCurl(angles[1]);
  };

  switch (preset) {
    case 'fist':
      curlThumb([0.8, 1.1], dir * 0.3);
      curlFinger('Index', [1.5, 1.6, 1.2]);
      curlFinger('Middle', [1.55, 1.65, 1.25]);
      curlFinger('Ring', [1.5, 1.6, 1.2]);
      curlFinger('Pinky', [1.45, 1.5, 1.1]);
      break;

    case 'point':
      curlThumb([0.85, 1.1], dir * 0.35);
      curlFinger('Index', [0.0, 0.0, 0.0]); // Straight
      curlFinger('Middle', [1.5, 1.6, 1.2]);
      curlFinger('Ring', [1.5, 1.6, 1.2]);
      curlFinger('Pinky', [1.45, 1.5, 1.1]);
      break;

    case 'pinch':
      // Bunched fingertips: all 4 fingertips converge tightly together with the thumb tip (morsel of food)
      curlThumb([0.9, 0.7], -dir * 0.5); // Adduct thumb towards center
      curlFinger('Index', [1.1, 1.2, 0.8], -dir * 0.22); // Splay inward towards center
      curlFinger('Middle', [1.15, 1.25, 0.85], 0);
      curlFinger('Ring', [1.1, 1.2, 0.8], dir * 0.22); // Splay inward towards center
      curlFinger('Pinky', [1.05, 1.15, 0.75], dir * 0.42); // Splay inward towards center
      break;

    case 'c_shape':
      // C-shape: smooth arc holding a cylindrical glass
      curlThumb([-0.2, 0.55], dir * 0.7); // Spread thumb opposite the fingers
      curlFinger('Index', [0.55, 0.65, 0.45]);
      curlFinger('Middle', [0.58, 0.68, 0.48]);
      curlFinger('Ring', [0.55, 0.65, 0.45]);
      curlFinger('Pinky', [0.50, 0.60, 0.40]);
      break;

    case 'thumbs_up':
      // Thumb straight upright with fingers tightly closed into a firm fist
      curlThumb([0.0, 0.0], dir * 2.8); // Points straight UP in hand space
      curlFinger('Index', [1.5, 1.6, 1.2]);
      curlFinger('Middle', [1.55, 1.65, 1.25]);
      curlFinger('Ring', [1.5, 1.6, 1.2]);
      curlFinger('Pinky', [1.45, 1.5, 1.1]);
      break;

    case 'ily': // I Love You
      curlThumb([-0.3, 0.0], dir * 0.6); // Out
      curlFinger('Index', [0.0, 0.0, 0.0]); // Up
      curlFinger('Middle', [1.5, 1.6, 1.2]); // Down
      curlFinger('Ring', [1.5, 1.6, 1.2]); // Down
      curlFinger('Pinky', [0.0, 0.0, 0.0]); // Up
      break;

    case 'flat':
      // Flat hand: 4 fingers completely straight and held together, thumb adducted alongside index
      curlThumb([0.15, 0.1], dir * 0.35);
      curlFinger('Index', [0.0, 0.0, 0.0], 0);
      curlFinger('Middle', [0.0, 0.0, 0.0], 0);
      curlFinger('Ring', [0.0, 0.0, 0.0], 0);
      curlFinger('Pinky', [0.0, 0.0, 0.0], 0);
      break;

    case 'open':
    default:
      curlThumb([0.1, 0.1], dir * 0.4);
      curlFinger('Index', [0.05, 0.05, 0.05]);
      curlFinger('Middle', [0.05, 0.05, 0.05]);
      curlFinger('Ring', [0.05, 0.05, 0.05]);
      curlFinger('Pinky', [0.05, 0.05, 0.05]);
      break;
  }

  return joints;
}

/**
 * Smooth and resample recorded frames with One-Euro style filter & dead-frame trimming
 */
export function smoothAndResampleClip(
  rawFrames: SignFrame[],
  targetFps = 30,
  alpha = 0.42
): SignFrame[] {
  if (rawFrames.length === 0) return [];
  if (rawFrames.length === 1) return [{ ...rawFrames[0], t: 0 }];

  // 1. Detect dead start / end frames using movement speed
  let startIndex = 0;
  while (startIndex < rawFrames.length - 1) {
    const curr = rawFrames[startIndex];
    const next = rawFrames[startIndex + 1];
    let movement = 0;

    if (curr.rightArm && next.rightArm) {
      const dx = next.rightArm.wrist[0] - curr.rightArm.wrist[0];
      const dy = next.rightArm.wrist[1] - curr.rightArm.wrist[1];
      const dz = next.rightArm.wrist[2] - curr.rightArm.wrist[2];
      movement = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    if (movement > 0.015) break;
    startIndex++;
  }
  startIndex = Math.max(0, startIndex - 2);

  let endIndex = rawFrames.length - 1;
  while (endIndex > startIndex) {
    const curr = rawFrames[endIndex];
    const prev = rawFrames[endIndex - 1];
    let movement = 0;

    if (curr.rightArm && prev.rightArm) {
      const dx = curr.rightArm.wrist[0] - prev.rightArm.wrist[0];
      const dy = curr.rightArm.wrist[1] - prev.rightArm.wrist[1];
      const dz = curr.rightArm.wrist[2] - prev.rightArm.wrist[2];
      movement = Math.sqrt(dx * dx + dy * dy + dz * dz);
    }
    if (movement > 0.015) break;
    endIndex--;
  }
  endIndex = Math.min(rawFrames.length - 1, endIndex + 2);

  const trimmed = rawFrames.slice(startIndex, endIndex + 1);
  if (trimmed.length === 0) return rawFrames;

  const startTime = trimmed[0].t;
  const duration = Math.max(0.1, trimmed[trimmed.length - 1].t - startTime);
  const totalFrames = Math.max(2, Math.round(duration * targetFps));

  const filterRight = new OneEuroFilter3D(1.2, 0.05);
  const filterLeft = new OneEuroFilter3D(1.2, 0.05);

  const resampled: SignFrame[] = [];
  let prevJoints = trimmed[0].joints;

  for (let i = 0; i <= totalFrames; i++) {
    const targetT = (i / totalFrames) * duration;
    const actualT = startTime + targetT;

    let fA = trimmed[0];
    let fB = trimmed[trimmed.length - 1];
    for (let j = 0; j < trimmed.length - 1; j++) {
      if (trimmed[j].t <= actualT && trimmed[j + 1].t >= actualT) {
        fA = trimmed[j];
        fB = trimmed[j + 1];
        break;
      }
    }

    const span = Math.max(1e-4, fB.t - fA.t);
    const factor = Math.min(1, Math.max(0, (actualT - fA.t) / span));

    // SLERP interpolate joints
    const rawJoints = slerpJoints(fA.joints, fB.joints, factor);
    const smoothedJoints = i === 0 ? rawJoints : slerpJoints(prevJoints, rawJoints, alpha);
    prevJoints = smoothedJoints;

    // Linear interpolate arm targets + OneEuro filter
    let rightArm: ArmPoseData | undefined = undefined;
    if (fA.rightArm && fB.rightArm) {
      const rawW: [number, number, number] = [
        fA.rightArm.wrist[0] + (fB.rightArm.wrist[0] - fA.rightArm.wrist[0]) * factor,
        fA.rightArm.wrist[1] + (fB.rightArm.wrist[1] - fA.rightArm.wrist[1]) * factor,
        fA.rightArm.wrist[2] + (fB.rightArm.wrist[2] - fA.rightArm.wrist[2]) * factor,
      ];
      const filteredW = filterRight.filter(rawW, targetT);
      const filteredE: [number, number, number] = [
        fA.rightArm.elbow[0] + (fB.rightArm.elbow[0] - fA.rightArm.elbow[0]) * factor,
        fA.rightArm.elbow[1] + (fB.rightArm.elbow[1] - fA.rightArm.elbow[1]) * factor,
        fA.rightArm.elbow[2] + (fB.rightArm.elbow[2] - fA.rightArm.elbow[2]) * factor,
      ];

      rightArm = {
        wrist: [Number(filteredW[0].toFixed(3)), Number(filteredW[1].toFixed(3)), Number(filteredW[2].toFixed(3))],
        elbow: [Number(filteredE[0].toFixed(3)), Number(filteredE[1].toFixed(3)), Number(filteredE[2].toFixed(3))],
        wristToMouth: fA.rightArm.wristToMouth,
        wristToNose: fA.rightArm.wristToNose,
        isFaceAnchored: fA.rightArm.isFaceAnchored || fB.rightArm.isFaceAnchored,
      };
    }

    let leftArm: ArmPoseData | undefined = undefined;
    if (fA.leftArm && fB.leftArm) {
      const rawW: [number, number, number] = [
        fA.leftArm.wrist[0] + (fB.leftArm.wrist[0] - fA.leftArm.wrist[0]) * factor,
        fA.leftArm.wrist[1] + (fB.leftArm.wrist[1] - fA.leftArm.wrist[1]) * factor,
        fA.leftArm.wrist[2] + (fB.leftArm.wrist[2] - fA.leftArm.wrist[2]) * factor,
      ];
      const filteredW = filterLeft.filter(rawW, targetT);
      const filteredE: [number, number, number] = [
        fA.leftArm.elbow[0] + (fB.leftArm.elbow[0] - fA.leftArm.elbow[0]) * factor,
        fA.leftArm.elbow[1] + (fB.leftArm.elbow[1] - fA.leftArm.elbow[1]) * factor,
        fA.leftArm.elbow[2] + (fB.leftArm.elbow[2] - fA.leftArm.elbow[2]) * factor,
      ];

      leftArm = {
        wrist: [Number(filteredW[0].toFixed(3)), Number(filteredW[1].toFixed(3)), Number(filteredW[2].toFixed(3))],
        elbow: [Number(filteredE[0].toFixed(3)), Number(filteredE[1].toFixed(3)), Number(filteredE[2].toFixed(3))],
        wristToMouth: fA.leftArm.wristToMouth,
        wristToNose: fA.leftArm.wristToNose,
        isFaceAnchored: fA.leftArm.isFaceAnchored || fB.leftArm.isFaceAnchored,
      };
    }

    resampled.push({
      t: Number((i / targetFps).toFixed(4)),
      joints: smoothedJoints,
      expression: fA.expression || fB.expression || 'neutral',
      rightArm,
      leftArm,
    });
  }

  return resampled;
}
