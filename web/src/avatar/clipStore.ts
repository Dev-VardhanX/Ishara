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
