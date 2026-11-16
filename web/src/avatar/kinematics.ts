import * as THREE from 'three';
import { BoneName, QuatTuple, SignFrame } from './types';
import { Landmark } from '../ml/handTracker';

/**
 * Normalizes a vector or returns default unit vector
 */
function normVec(v: THREE.Vector3): THREE.Vector3 {
  const len = v.length();
  if (len < 1e-6) return new THREE.Vector3(0, -1, 0);
  return v.multiplyScalar(1 / len);
}

/**
 * Calculates rotation quaternion from vector A to vector B
 */
function quatFromUnitVectors(from: THREE.Vector3, to: THREE.Vector3): THREE.Quaternion {
  return new THREE.Quaternion().setFromUnitVectors(from, to);
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

  // Finger landmark indices mapping
  const fingerDefs: Array<{
    name: string;
    joints: [number, number][];
  }> = [
    {
      name: `${side}Thumb`,
      joints: [
        [1, 2], // Thumb1
        [2, 4], // Thumb2
      ],
    },
    {
      name: `${side}Index`,
      joints: [
        [5, 6], // Index1
        [6, 7], // Index2
        [7, 8], // Index3
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

  // Estimate wrist tilt relative to palm center (landmarks 0, 5, 17)
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
 * Convert Pose Landmarks (33 points) into Shoulder/Elbow QuatTuples
 */
export function poseLandmarksToArmJoints(
  poseLandmarks: Landmark[],
  mirrored = false
): Partial<Record<BoneName, QuatTuple>> {
  const joints: Partial<Record<BoneName, QuatTuple>> = {};
  if (!poseLandmarks || poseLandmarks.length < 17) return joints;

  const pts = poseLandmarks.map((l) => {
    const x = mirrored ? -(l.x - 0.5) : l.x - 0.5;
    const y = -(l.y - 0.5);
    const z = (l.z ?? 0);
    return new THREE.Vector3(x, y, z);
  });

  const restDown = new THREE.Vector3(0, -1, 0);

  // Left arm (landmarks: 11 shoulder, 13 elbow, 15 wrist)
  if (pts[11] && pts[13]) {
    const vUpper = normVec(new THREE.Vector3().subVectors(pts[13], pts[11]));
    const qShoulder = quatFromUnitVectors(restDown, vUpper);
    joints['LeftShoulder'] = [qShoulder.x, qShoulder.y, qShoulder.z, qShoulder.w];
  }
  if (pts[13] && pts[15]) {
    const vFore = normVec(new THREE.Vector3().subVectors(pts[15], pts[13]));
    const qElbow = quatFromUnitVectors(restDown, vFore);
    joints['LeftElbow'] = [qElbow.x, qElbow.y, qElbow.z, qElbow.w];
  }

  // Right arm (landmarks: 12 shoulder, 14 elbow, 16 wrist)
  if (pts[12] && pts[14]) {
    const vUpper = normVec(new THREE.Vector3().subVectors(pts[14], pts[12]));
    const qShoulder = quatFromUnitVectors(restDown, vUpper);
    joints['RightShoulder'] = [qShoulder.x, qShoulder.y, qShoulder.z, qShoulder.w];
  }
  if (pts[14] && pts[16]) {
    const vFore = normVec(new THREE.Vector3().subVectors(pts[16], pts[14]));
    const qElbow = quatFromUnitVectors(restDown, vFore);
    joints['RightElbow'] = [qElbow.x, qElbow.y, qElbow.z, qElbow.w];
  }

  return joints;
}

/**
 * Smooth and resample recorded frames to exact 30 FPS, trimming dead frames
 */
export function smoothAndResampleClip(
  rawFrames: SignFrame[],
  targetFps = 30,
  alpha = 0.42
): SignFrame[] {
  if (rawFrames.length === 0) return [];
  if (rawFrames.length === 1) return [{ ...rawFrames[0], t: 0 }];

  // 1. Calculate velocity across frames to detect static dead frames at start & end
  const qA = new THREE.Quaternion();
  const qB = new THREE.Quaternion();

  const velocities: number[] = [0];
  for (let i = 1; i < rawFrames.length; i++) {
    const prev = rawFrames[i - 1].joints;
    const curr = rawFrames[i].joints;
    let delta = 0;
    let count = 0;

    for (const [k, v] of Object.entries(curr)) {
      const prevV = (prev as any)[k];
      if (prevV && v) {
        qA.set(prevV[0], prevV[1], prevV[2], prevV[3]);
        qB.set(v[0], v[1], v[2], v[3]);
        delta += qA.angleTo(qB);
        count++;
      }
    }
    velocities.push(count > 0 ? delta / count : 0);
  }

  // Threshold for motion
  const MOTION_THRESHOLD = 0.015;
  let startIndex = 0;
  while (startIndex < velocities.length - 1 && velocities[startIndex] < MOTION_THRESHOLD) {
    startIndex++;
  }
  startIndex = Math.max(0, startIndex - 2); // Keep small lead-in

  let endIndex = velocities.length - 1;
  while (endIndex > startIndex && velocities[endIndex] < MOTION_THRESHOLD) {
    endIndex--;
  }
  endIndex = Math.min(rawFrames.length - 1, endIndex + 2); // Keep small lead-out

  const trimmed = rawFrames.slice(startIndex, endIndex + 1);
  if (trimmed.length === 0) return rawFrames;

  const startTime = trimmed[0].t;
  const duration = Math.max(0.1, trimmed[trimmed.length - 1].t - startTime);
  const totalFrames = Math.max(2, Math.round(duration * targetFps));

  // 2. Resample at uniform 30 fps grid with exponential SLERP smoothing
  const resampled: SignFrame[] = [];
  let prevSmoothedJoints: Partial<Record<BoneName, QuatTuple>> = trimmed[0].joints;

  for (let i = 0; i <= totalFrames; i++) {
    const targetT = (i / totalFrames) * duration;
    const actualT = startTime + targetT;

    // Find bounding frames in trimmed array
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

    // Linear interpolate / slerp raw frames
    const rawInterpolated = slerpJoints(fA.joints, fB.joints, factor);

    // Exponential filter against previous smoothed joint
    const smoothed = i === 0 ? rawInterpolated : slerpJoints(prevSmoothedJoints, rawInterpolated, alpha);
    prevSmoothedJoints = smoothed;

    resampled.push({
      t: Number((i / targetFps).toFixed(4)),
      joints: smoothed,
      expression: fA.expression || fB.expression || 'neutral',
    });
  }

  return resampled;
}
