import { BoneName, QuatTuple, SignClip, SignManifest, NEUTRAL_POSE_JOINTS } from './types';
export { NEUTRAL_POSE_JOINTS } from './types';
import { DEFAULT_CLIPS } from './defaultClips';

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
  if (entry) {
    try {
      const res = await fetch(`/signs/${entry.file}`);
      if (res.ok) {
        const clip = (await res.json()) as SignClip;
        runtimeClipCache.set(id, clip);
        return clip;
      }
    } catch {
      // fallback
    }
  }

  // Built-in verified authored clips with Two-Bone arm kinematics
  if (DEFAULT_CLIPS[id]) {
    runtimeClipCache.set(id, DEFAULT_CLIPS[id]);
    return DEFAULT_CLIPS[id];
  }

  // If no recorded or authored clip exists, return null so caller visibly skips it
  return null;
}

// NEUTRAL_POSE_JOINTS re-exported above from ./types

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
