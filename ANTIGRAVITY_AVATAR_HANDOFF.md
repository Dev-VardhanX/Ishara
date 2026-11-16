# Antigravity Task: Build & Integrate the Offline 3D Sign Avatar + Recorder into "Ishara"

## Context & Workspace Rules
- **Project**: `Ishara` (React 18 + TypeScript + Vite + Tailwind CSS in `web/`).
- **First Action**: Read `README.md`, `AGENTS.md`, `web/package.json`, `web/design/tokens.css` (or `src/design/tokens.css`), `web/src/components/AvatarStage.tsx`, and the Voice to Sign page + router + service worker files before modifying anything.
- **Installed Packages**: `three` (`0.164`) and `@pixiv/three-vrm` are already installed. **Do NOT install any new heavy dependencies.**
- **Design System (Claymorphism — apply ONLY to new avatar/recorder UI, do NOT restyle existing pages)**:
  - Background: `#E9EEF7` | Primary Blue: `#7C9CFF` | Coral: `#FFB59E` | Lavender: `#D4A5FF` | Mint: `#A8E6A1` | Slate text: `#2B2D42`
  - Font: `Nunito` | Border radius: `28px` | Dual soft clay shadows: `8px 8px 16px rgba(163,177,198,0.5), -8px -8px 16px rgba(255,255,255,0.85)`
- **Performance & Offline**: Must work 100% offline, run smoothly (target 60 fps) on mid-range mobile browsers, make zero network/CDN/telemetry calls, lazy-load Three.js chunks, and dispose of all WebGL geometries/materials/renderers on unmount.

---

## Strict Honesty Rules (Must Enforce in Code & UI)
1. **No Fake Signs**: Never invent sign language animations procedurally. Every real sign must come from a recorded JSON clip.
2. **Only Two Built-in Motions**:
   - Neutral rest pose (`NEUTRAL_POSE_JOINTS`)
   - Simple wave (`__BUILTIN_WAVE__`)
3. **Missing Clip Behavior**: If a gloss word has no recorded clip (and cannot be fingerspelled from recorded `LETTER_A`..`LETTER_Z` clips), display `"sign not recorded yet"` on screen and skip it cleanly after holding rest pose briefly.
4. **Verification Labels**: Every recorded clip defaults to `"verified": false`. In the Voice to Sign page, display a `"Not verified yet"` badge under any unverified sign.
5. **No Buzzwords**: Never claim the avatar is "AI-generated" or "100% accurate" anywhere in the UI.

---

## Files to Create & Modify

### 1. Create `web/public/signs/manifest.json`
```json
{
  "version": 1,
  "updatedAt": "2026-11-16T00:00:00.000Z",
  "signs": {}
}
```

### 2. Create `web/src/avatar/types.ts`
```typescript
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

export interface SignFrame {
  t: number;
  joints: Partial<Record<BoneName, QuatTuple>>;
  expression?: AvatarExpression;
}

export interface SignClip {
  signId: string;
  language: 'ISL' | 'ASL';
  fps: 30;
  duration: number;
  author: string;
  verified: boolean;
  recordedAt: string;
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
```

### 3. Create `web/src/avatar/clipStore.ts`
```typescript
import { BoneName, QuatTuple, SignClip, SignManifest } from './types';

const LS_KEY = 'ishara_recorded_signs_v1';
let manifestCache: SignManifest | null = null;
const runtimeClipCache = new Map<string, SignClip>();

export function getLocalClips(): Record<string, SignClip> {
  try {
    const raw = localStorage.getItem(LS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
}

export function saveLocalClip(clip: SignClip): void {
  const all = getLocalClips();
  const id = clip.signId.toUpperCase();
  all[id] = clip;
  localStorage.setItem(LS_KEY, JSON.stringify(all));
  runtimeClipCache.set(id, clip);
}

export async function loadManifest(): Promise<SignManifest> {
  if (manifestCache) return manifestCache;
  try {
    const res = await fetch('/signs/manifest.json', { cache: 'force-cache' });
    if (!res.ok) throw new Error('Manifest unavailable');
    manifestCache = (await res.json()) as SignManifest;
    return manifestCache;
  } catch {
    manifestCache = { version: 1, updatedAt: new Date().toISOString(), signs: {} };
    return manifestCache;
  }
}

export async function loadSignClip(signId: string): Promise<SignClip | null> {
  const id = signId.toUpperCase().trim();
  if (runtimeClipCache.has(id)) return runtimeClipCache.get(id)!;

  const local = getLocalClips()[id];
  if (local) {
    runtimeClipCache.set(id, local);
    return local;
  }

  const manifest = await loadManifest();
  const entry = manifest.signs[id];
  if (!entry) return null;

  try {
    const res = await fetch(`/signs/${entry.file}`);
    if (!res.ok) return null;
    const clip = (await res.json()) as SignClip;
    runtimeClipCache.set(id, clip);
    return clip;
  } catch {
    return null;
  }
}

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

export function createBuiltInWaveClip(): SignClip {
  const fps = 30;
  const duration = 1.5;
  const totalFrames = Math.round(duration * fps);
  const frames = [];
  for (let i = 0; i <= totalFrames; i++) {
    const t = Number((i / fps).toFixed(4));
    const wave = Math.sin((i / totalFrames) * Math.PI * 4) * 0.22;
    frames.push({
      t,
      joints: {
        ...NEUTRAL_POSE_JOINTS,
        RightShoulder: [-0.25, 0, -0.55, 0.796] as QuatTuple,
        RightElbow: [-0.85, 0, wave, 0.48] as QuatTuple,
        RightWrist: [0, 0, wave * 0.6, 0.98] as QuatTuple,
      },
      expression: 'happy' as const,
    });
  }
  return {
    signId: '__BUILTIN_WAVE__',
    language: 'ISL',
    fps: 30,
    duration,
    author: 'built-in',
    verified: true,
    recordedAt: '2026-01-01T00:00:00.000Z',
    frames,
  };
}
```

### 4. Create `web/src/avatar/ClayAvatarRig.ts`
Build a procedural Three.js Bone skeleton driving rounded CapsuleGeometry and SphereGeometry meshes with soft matte clay MeshStandardMaterial (roughness: 0.88, metalness: 0.02).

Include: Torso (pastel blue #7C9CFF shirt + #D4A5FF collar), Neck, Head (3 selectable skin tones #F6C6B5, #D99B72, #8D583E, clay hair cap #2B2D42, coral cheeks #FFB59E, eyes, brows, and 4 mouth/brow states: neutral, happy, questioning, sad).

Both arms (Shoulder, Elbow, Wrist) + enlarged hands (1.28x scale so finger shapes are readable on mobile) with 5 fingers (Thumb: 2 joints; Index, Middle, Ring, Pinky: 3 joints each).

Idle breathing animation on Torso (Math.sin(elapsedSec * 2.1) * 0.008).

Optional license-safe VRM loading via @pixiv/three-vrm (VRMLoaderPlugin) retargeted from the same bone quaternions.

Full .dispose() method freeing all geometries and materials.

### 5. Create `web/src/avatar/SignAvatarCanvas.tsx` & `web/src/avatar/SignAvatar.tsx`
SignAvatar.tsx must be the default export using React.lazy(() => import('./SignAvatarCanvas')) so Three.js is code-split and never blocks initial page load.

Props: signs: string[], speed?: 0.5 | 1 | 1.5, playing?: boolean, expression?: AvatarExpression, skinTone?: SkinToneId, mirrored?: boolean, stepByStep?: boolean, vrmUrl?: string | null, previewClip?: SignClip | null, onSignStarted, onSequenceFinished, onWebGLFallback. Expose imperative restart(), stepNext(), and stepPrev() methods via useImperativeHandle.

Fixed front camera (PerspectiveCamera(34, aspect, 0.1, 20) at [0, 0.02, 1.55]) framed on upper body and hands.

Smooth SLERP blending (0.22s transition window) between consecutive signs.

If a word has no clip, check if all letters have LETTER_<CH> or <CH> clips for fingerspelling; otherwise show "<WORD> — sign not recorded yet (skipping)" and skip after 1.2s.

If WebGL context fails, render nothing broken and immediately call onWebGLFallback().

### 6. Create `web/src/avatar/kinematics.ts`
Convert local MediaPipe Pose (33 landmarks) + Hand (21 landmarks/hand) coordinates into local bone QuatTuples for shoulders, elbows, wrists, and all finger joints.

Apply an exponential SLERP low-pass filter (alpha = 0.42) to smooth webcam jitter, trim static start/end dead frames, and resample to fixed 30 fps.

### 7. Create `web/src/pages/SignRecorderPage.tsx` & `web/src/pages/AvatarDemoPage.tsx`
Wire routes /dev/sign-recorder and /dev/avatar-demo in the app's existing router (without adding links to main user navigation).

Mandatory Recorder UI:
- Banner: "Record with a clear background and both hands visible. Have an ISL teacher verify each sign before marking it verified."
- Dropdown for the 20 signs (HELLO, THANK_YOU, YES, NO, PLEASE, GOOD_MORNING, GOOD_NIGHT, SORRY, HELP, WATER, FOOD, BATHROOM, MORE, STOP, LOVE, FRIEND, HAPPY, NAME, HOW_ARE_YOU, HOME).
- Record / Stop / Re-record buttons, Mirror Fix toggle, Speed adjust (0.5x, 1x, 1.5x), instant 3D avatar preview, Save to localStorage, Export <SIGN_ID>.json, Export manifest.json, and Import JSON.
- Hook into the app's existing local MediaPipe landmark output so no external network calls occur.

### 8. Integrate into Existing AvatarStage & Service Worker
- Inspect web/src/components/AvatarStage.tsx and the Voice to Sign page.
- Update AvatarStage to render <SignAvatar> with the gloss list from Voice to Sign, highlight the active gloss pill, show "Not verified yet" under any unverified sign, provide Replay, Pause/Play, Speed (0.5x, 1x, 1.5x), Mirror, Skin Tone, and a reduced-motion Step-by-Step toggle (prefers-reduced-motion: reduce), and keep the existing icon card as the onWebGLFallback UI.
- Update the Service Worker (web/public/sw.js or Vite PWA/Workbox config) to precache /signs/manifest.json and runtime-cache /signs/*.json + Three.js / SignAvatarCanvas chunks for offline playback.
- Add a concise Sign Clip Format section to README.md.

---

## Final Verification Checklist for Antigravity
- Run npm run build inside web/ and confirm 0 TypeScript or Vite bundling errors.
- Verify Three.js splits into a separate lazy chunk in dist/assets/.
- Report all files created/modified, the clip JSON schema, exact steps to record & commit clips, and any known limitations.
