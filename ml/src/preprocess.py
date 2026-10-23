"""Reference preprocessing for the model input (the contract).

Android (Kotlin) and the web (TypeScript) must produce the same tensor as this code.
Landmark order: pose (33), left hand (21), right hand (21) -> 75 landmarks x (x, y, z).
"""
import numpy as np

NUM_FRAMES = 64
NUM_LANDMARKS = 75
L_SHOULDER, R_SHOULDER = 11, 12  # MediaPipe pose indices


def resample_frames(seq: np.ndarray, n: int = NUM_FRAMES) -> np.ndarray:
    """Resample a (T, 75, 3) sequence to exactly n frames (linear index sampling)."""
    t = seq.shape[0]
    if t == 0:
        return np.zeros((n, NUM_LANDMARKS, 3), dtype=np.float32)
    idx = np.linspace(0, t - 1, n).round().astype(int)
    return seq[idx]


def normalise(seq: np.ndarray) -> np.ndarray:
    """Subtract the shoulder midpoint and divide by shoulder width, per frame.

    Missing landmarks must already be filled with zeros (e.g. a hand that is not visible).
    """
    out = seq.astype(np.float32).copy()
    for i in range(out.shape[0]):
        ls, rs = out[i, L_SHOULDER], out[i, R_SHOULDER]
        mid = (ls + rs) / 2.0
        width = np.linalg.norm(ls[:2] - rs[:2])
        if width < 1e-6:
            width = 1.0
        visible = np.any(out[i] != 0, axis=1)
        out[i, visible] = (out[i, visible] - mid) / width
    return out


def to_model_input(seq: np.ndarray) -> np.ndarray:
    """(T, 75, 3) landmarks -> (1, 64, 225) float32 model input."""
    seq = resample_frames(seq)
    seq = normalise(seq)
    return seq.reshape(1, NUM_FRAMES, NUM_LANDMARKS * 3).astype(np.float32)
