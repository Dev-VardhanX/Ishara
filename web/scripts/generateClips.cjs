const fs = require('fs');
const path = require('path');

const NEUTRAL_POSE_JOINTS = {
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

function quatFromAxisAngle(axis, rad) {
  const half = rad / 2;
  const s = Math.sin(half);
  return [axis[0] * s, axis[1] * s, axis[2] * s, Math.cos(half)];
}

function slerpQuat(qa, qb, t) {
  let [ax, ay, az, aw] = qa;
  let [bx, by, bz, bw] = qb;
  let cosHalfTheta = ax * bx + ay * by + az * bz + aw * bw;
  if (cosHalfTheta < 0) {
    bx = -bx; by = -by; bz = -bz; bw = -bw;
    cosHalfTheta = -cosHalfTheta;
  }
  if (cosHalfTheta >= 1.0) return [...qa];
  const halfTheta = Math.acos(cosHalfTheta);
  const sinHalfTheta = Math.sqrt(1.0 - cosHalfTheta * cosHalfTheta);
  if (Math.abs(sinHalfTheta) < 0.001) {
    return [
      ax * (1 - t) + bx * t,
      ay * (1 - t) + by * t,
      az * (1 - t) + bz * t,
      aw * (1 - t) + bw * t,
    ];
  }
  const ratioA = Math.sin((1 - t) * halfTheta) / sinHalfTheta;
  const ratioB = Math.sin(t * halfTheta) / sinHalfTheta;
  return [
    ax * ratioA + bx * ratioB,
    ay * ratioA + by * ratioB,
    az * ratioA + bz * ratioB,
    aw * ratioA + bw * ratioB,
  ];
}

function getFingerPresetJoints(preset, side = 'Right') {
  const joints = {};
  const curlFinger = (finger, angles) => {
    joints[`${side}${finger}1`] = quatFromAxisAngle([1, 0, 0], angles[0]);
    joints[`${side}${finger}2`] = quatFromAxisAngle([1, 0, 0], angles[1]);
    joints[`${side}${finger}3`] = quatFromAxisAngle([1, 0, 0], angles[2]);
  };
  const curlThumb = (angles) => {
    joints[`${side}Thumb1`] = quatFromAxisAngle([0, 1, 0], angles[0]);
    joints[`${side}Thumb2`] = quatFromAxisAngle([1, 0, 0], angles[1]);
  };

  switch (preset) {
    case 'pinch':
      curlThumb([-0.4, 0.55]);
      curlFinger('Index', [0.85, 0.95, 0.75]);
      curlFinger('Middle', [1.1, 1.2, 0.9]);
      curlFinger('Ring', [1.2, 1.3, 0.9]);
      curlFinger('Pinky', [1.2, 1.3, 0.9]);
      break;
    case 'flat':
      curlThumb([0.15, 0.1]);
      curlFinger('Index', [0.02, 0.02, 0.02]);
      curlFinger('Middle', [0.02, 0.02, 0.02]);
      curlFinger('Ring', [0.02, 0.02, 0.02]);
      curlFinger('Pinky', [0.02, 0.02, 0.02]);
      break;
    case 'open':
    default:
      curlThumb([0.1, 0.1]);
      curlFinger('Index', [0.05, 0.05, 0.05]);
      curlFinger('Middle', [0.05, 0.05, 0.05]);
      curlFinger('Ring', [0.05, 0.05, 0.05]);
      curlFinger('Pinky', [0.05, 0.05, 0.05]);
      break;
  }
  return joints;
}

function slerpJoints(jA, jB, alpha) {
  const out = { ...jA };
  for (const k of Object.keys(jB)) {
    if (jA[k] && jB[k]) {
      out[k] = slerpQuat(jA[k], jB[k], alpha);
    } else if (jB[k]) {
      out[k] = jB[k];
    }
  }
  return out;
}

function interpolateKeyframesToClip(signId, language, duration, keyframes, author = 'Ishara Rig', verified = true) {
  const fps = 30;
  const totalFrames = Math.max(2, Math.round(duration * fps));
  const sorted = [...keyframes].sort((a, b) => a.t - b.t);

  if (sorted[0].t > 0) sorted.unshift({ ...sorted[0], t: 0 });
  if (sorted[sorted.length - 1].t < duration) sorted.push({ ...sorted[sorted.length - 1], t: duration });

  const frames = [];

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
    const smoothAlpha = (1 - Math.cos(alpha * Math.PI)) / 2;

    const wrist = [
      kA.wrist[0] + (kB.wrist[0] - kA.wrist[0]) * smoothAlpha,
      kA.wrist[1] + (kB.wrist[1] - kA.wrist[1]) * smoothAlpha,
      kA.wrist[2] + (kB.wrist[2] - kA.wrist[2]) * smoothAlpha,
    ];

    const elbow = [
      kA.elbow[0] + (kB.elbow[0] - kA.elbow[0]) * smoothAlpha,
      kA.elbow[1] + (kB.elbow[1] - kA.elbow[1]) * smoothAlpha,
      kA.elbow[2] + (kB.elbow[2] - kA.elbow[2]) * smoothAlpha,
    ];

    const jointsA = getFingerPresetJoints(kA.fingerPreset, 'Right');
    const jointsB = getFingerPresetJoints(kB.fingerPreset, 'Right');
    const fingerJoints = slerpJoints(jointsA, jointsB, smoothAlpha);

    const rightArm = {
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
    } else if (kA.wristToMouth || kB.wristToMouth) {
      rightArm.wristToMouth = kA.wristToMouth || kB.wristToMouth;
    }

    if (kA.wristToNose && kB.wristToNose) {
      rightArm.wristToNose = [
        kA.wristToNose[0] + (kB.wristToNose[0] - kA.wristToNose[0]) * smoothAlpha,
        kA.wristToNose[1] + (kB.wristToNose[1] - kA.wristToNose[1]) * smoothAlpha,
        kA.wristToNose[2] + (kB.wristToNose[2] - kA.wristToNose[2]) * smoothAlpha,
      ];
    } else if (kA.wristToNose || kB.wristToNose) {
      rightArm.wristToNose = kA.wristToNose || kB.wristToNose;
    }

    frames.push({
      t,
      joints: {
        ...NEUTRAL_POSE_JOINTS,
        ...fingerJoints,
      },
      rightArm,
      expression: alpha > 0.5 ? (kB.expression || 'neutral') : (kA.expression || 'neutral'),
    });
  }

  return {
    signId: signId.toUpperCase().trim(),
    language,
    fps,
    duration,
    author,
    verified,
    recordedAt: new Date().toISOString(),
    hasArmData: true,
    isAuthored: true,
    frames,
  };
}

const EAT_KEYFRAMES = [
  { t: 0.0, wrist: [0.22, -0.32, 0.05], elbow: [0.26, -0.15, -0.05], fingerPreset: 'open', expression: 'neutral' },
  { t: 0.45, wrist: [0.12, 0.12, 0.22], elbow: [0.20, 0.02, 0.12], fingerPreset: 'pinch', expression: 'neutral' },
  { t: 0.75, wrist: [0.04, 0.28, 0.23], elbow: [0.18, 0.08, 0.14], fingerPreset: 'pinch', isFaceAnchored: true, wristToMouth: [0, 0.02, 0.03], expression: 'happy' },
  { t: 1.05, wrist: [0.08, 0.22, 0.26], elbow: [0.19, 0.06, 0.13], fingerPreset: 'pinch', expression: 'happy' },
  { t: 1.35, wrist: [0.04, 0.28, 0.23], elbow: [0.18, 0.08, 0.14], fingerPreset: 'pinch', isFaceAnchored: true, wristToMouth: [0, 0.02, 0.03], expression: 'happy' },
  { t: 1.85, wrist: [0.22, -0.32, 0.05], elbow: [0.26, -0.15, -0.05], fingerPreset: 'open', expression: 'neutral' },
];

const HELLO_KEYFRAMES = [
  { t: 0.0, wrist: [0.22, -0.32, 0.05], elbow: [0.26, -0.15, -0.05], fingerPreset: 'open', expression: 'neutral' },
  { t: 0.45, wrist: [0.16, 0.20, 0.18], elbow: [0.26, 0.06, 0.10], fingerPreset: 'flat', expression: 'happy' },
  { t: 0.80, wrist: [0.16, 0.35, 0.20], elbow: [0.28, 0.12, 0.12], fingerPreset: 'flat', isFaceAnchored: true, wristToNose: [0.08, 0.08, 0.04], expression: 'happy' },
  { t: 1.10, wrist: [0.24, 0.37, 0.22], elbow: [0.30, 0.14, 0.12], fingerPreset: 'flat', expression: 'happy' },
  { t: 1.35, wrist: [0.20, 0.35, 0.20], elbow: [0.28, 0.12, 0.12], fingerPreset: 'flat', expression: 'happy' },
  { t: 1.80, wrist: [0.22, -0.32, 0.05], elbow: [0.26, -0.15, -0.05], fingerPreset: 'open', expression: 'neutral' },
];

const THANK_YOU_KEYFRAMES = [
  { t: 0.0, wrist: [0.22, -0.32, 0.05], elbow: [0.26, -0.15, -0.05], fingerPreset: 'flat', expression: 'neutral' },
  { t: 0.40, wrist: [0.03, 0.24, 0.22], elbow: [0.16, 0.04, 0.12], fingerPreset: 'flat', isFaceAnchored: true, wristToMouth: [0, -0.03, 0.03], expression: 'happy' },
  { t: 0.75, wrist: [0.03, 0.24, 0.22], elbow: [0.16, 0.04, 0.12], fingerPreset: 'flat', isFaceAnchored: true, expression: 'happy' },
  { t: 1.15, wrist: [0.06, 0.08, 0.40], elbow: [0.14, 0.02, 0.22], fingerPreset: 'flat', isFaceAnchored: false, expression: 'happy' },
  { t: 1.40, wrist: [0.07, 0.05, 0.38], elbow: [0.14, 0.01, 0.22], fingerPreset: 'flat', expression: 'happy' },
  { t: 1.85, wrist: [0.22, -0.32, 0.05], elbow: [0.26, -0.15, -0.05], fingerPreset: 'open', expression: 'neutral' },
];

const signsDir = path.resolve(__dirname, '../public/signs');
if (!fs.existsSync(signsDir)) {
  fs.mkdirSync(signsDir, { recursive: true });
}

const clips = {
  EAT: interpolateKeyframesToClip('EAT', 'ISL', 1.85, EAT_KEYFRAMES),
  HELLO: interpolateKeyframesToClip('HELLO', 'ISL', 1.80, HELLO_KEYFRAMES),
  THANK_YOU: interpolateKeyframesToClip('THANK_YOU', 'ISL', 1.85, THANK_YOU_KEYFRAMES),
};

const manifestSigns = {};
for (const [signId, clip] of Object.entries(clips)) {
  const filePath = path.join(signsDir, `${signId}.json`);
  fs.writeFileSync(filePath, JSON.stringify(clip, null, 2), 'utf8');
  console.log(`Saved ${signId}.json (${clip.frames.length} frames)`);
  manifestSigns[signId] = {
    file: `${signId}.json`,
    language: clip.language,
    verified: clip.verified,
    author: clip.author,
  };
}

const manifestPath = path.join(signsDir, 'manifest.json');
const manifest = {
  version: 1,
  updatedAt: new Date().toISOString(),
  signs: manifestSigns,
};
fs.writeFileSync(manifestPath, JSON.stringify(manifest, null, 2), 'utf8');
console.log('Updated manifest.json with EAT, HELLO, THANK_YOU!');
