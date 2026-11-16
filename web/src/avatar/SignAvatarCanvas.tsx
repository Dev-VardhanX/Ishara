import React, {
  useEffect,
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
  useCallback,
} from 'react';
import * as THREE from 'three';
import {
  AvatarExpression,
  SkinToneId,
  SignClip,
  BoneName,
  QuatTuple,
} from './types';
import { ClayAvatarRig } from './ClayAvatarRig';
import {
  loadSignClip,
  NEUTRAL_POSE_JOINTS,
  createBuiltInWaveClip,
} from './clipStore';
import { slerpJoints } from './kinematics';

export interface SignAvatarHandle {
  restart: () => void;
  stepNext: () => void;
  stepPrev: () => void;
}

export interface SignAvatarProps {
  signs?: string[];
  speed?: 0.5 | 1 | 1.5;
  playing?: boolean;
  expression?: AvatarExpression;
  skinTone?: SkinToneId;
  mirrored?: boolean;
  stepByStep?: boolean;
  vrmUrl?: string | null;
  previewClip?: SignClip | null;
  onSignStarted?: (sign: string, index: number) => void;
  onSequenceFinished?: () => void;
  onWebGLFallback?: () => void;
  className?: string;
}

export const SignAvatarCanvas = forwardRef<SignAvatarHandle, SignAvatarProps>(
  (
    {
      signs = [],
      speed = 1,
      playing = true,
      expression = 'neutral',
      skinTone = 'warm-peach',
      mirrored = false,
      stepByStep = false,
      vrmUrl = null,
      previewClip = null,
      onSignStarted,
      onSequenceFinished,
      onWebGLFallback,
      className = '',
    },
    ref
  ) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State for UI overlay warnings
    const [missingNotice, setMissingNotice] = useState<string | null>(null);
    const [currentClipMeta, setCurrentClipMeta] = useState<{
      signId: string;
      verified: boolean;
    } | null>(null);

    // Sequence playback state
    const signIndexRef = useRef<number>(0);
    const clipLocalTimeRef = useRef<number>(0);
    const activeClipRef = useRef<SignClip | null>(null);
    const prevEndJointsRef = useRef<Partial<Record<BoneName, QuatTuple>>>(NEUTRAL_POSE_JOINTS);
    const isPausedRef = useRef<boolean>(!playing);
    const speedRef = useRef<number>(speed);
    const stepByStepRef = useRef<boolean>(stepByStep);
    const missingTimeoutRef = useRef<number | null>(null);

    // Three.js instances
    const rigRef = useRef<ClayAvatarRig | null>(null);
    const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
    const sceneRef = useRef<THREE.Scene | null>(null);
    const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
    const animIdRef = useRef<number | null>(null);

    // Sync refs with props
    useEffect(() => {
      isPausedRef.current = !playing;
    }, [playing]);

    useEffect(() => {
      speedRef.current = speed;
    }, [speed]);

    useEffect(() => {
      stepByStepRef.current = stepByStep;
    }, [stepByStep]);

    useEffect(() => {
      if (rigRef.current) {
        rigRef.current.setSkinTone(skinTone);
      }
    }, [skinTone]);

    useEffect(() => {
      if (rigRef.current) {
        rigRef.current.setExpression(expression);
      }
    }, [expression]);

    useEffect(() => {
      if (rigRef.current) {
        rigRef.current.group.scale.x = mirrored ? -1 : 1;
      }
    }, [mirrored]);

    useEffect(() => {
      if (vrmUrl && rigRef.current) {
        rigRef.current.loadVRM(vrmUrl);
      }
    }, [vrmUrl]);

    // Handle single preview clip if provided
    useEffect(() => {
      if (previewClip) {
        activeClipRef.current = previewClip;
        clipLocalTimeRef.current = 0;
        setCurrentClipMeta({
          signId: previewClip.signId,
          verified: previewClip.verified,
        });
        setMissingNotice(null);
      }
    }, [previewClip]);

    // Load and transition to a specific sign in sequence
    const loadSignAtIndex = useCallback(
      async (idx: number) => {
        if (idx < 0 || idx >= signs.length) {
          activeClipRef.current = null;
          setCurrentClipMeta(null);
          setMissingNotice(null);
          onSequenceFinished?.();
          return;
        }

        const rawSign = signs[idx].trim().toUpperCase().replace(/^(ISL_|ASL_)/, '');
        signIndexRef.current = idx;
        clipLocalTimeRef.current = 0;
        onSignStarted?.(rawSign, idx);

        // Check for preview clip first
        if (previewClip && previewClip.signId.toUpperCase() === rawSign) {
          activeClipRef.current = previewClip;
          setCurrentClipMeta({
            signId: previewClip.signId,
            verified: previewClip.verified,
          });
          setMissingNotice(null);
          return;
        }

        // 1. Try loading recorded clip from local or manifest
        let clip = await loadSignClip(rawSign);

        // 2. Built-in wave fallback only for HELLO if no recorded clip
        if (!clip && rawSign === 'HELLO') {
          clip = createBuiltInWaveClip();
        }

        // 3. Fingerspelling fallback: check if each letter has LETTER_<CH> or <CH>
        if (!clip && rawSign.length > 1 && /^[A-Z]+$/.test(rawSign)) {
          let canFingerspell = true;
          for (const ch of rawSign) {
            const letterClip = (await loadSignClip(`LETTER_${ch}`)) || (await loadSignClip(ch));
            if (!letterClip) {
              canFingerspell = false;
              break;
            }
          }
          if (canFingerspell) {
            // Can be fingerspelled letter-by-letter
            // Load first letter
            clip = (await loadSignClip(`LETTER_${rawSign[0]}`)) || (await loadSignClip(rawSign[0]));
          }
        }

        if (clip) {
          activeClipRef.current = clip;
          setCurrentClipMeta({
            signId: clip.signId,
            verified: clip.verified,
          });
          setMissingNotice(null);
        } else {
          // Missing clip rule: display "sign not recorded yet" and skip cleanly after 1.2s
          activeClipRef.current = null;
          setCurrentClipMeta(null);
          setMissingNotice(`${rawSign} — sign not recorded yet (skipping)`);

          if (missingTimeoutRef.current) {
            window.clearTimeout(missingTimeoutRef.current);
          }
          missingTimeoutRef.current = window.setTimeout(() => {
            setMissingNotice(null);
            loadSignAtIndex(idx + 1);
          }, 1200);
        }
      },
      [signs, previewClip, onSignStarted, onSequenceFinished]
    );

    // Trigger load when signs array changes
    useEffect(() => {
      if (!previewClip && signs.length > 0) {
        signIndexRef.current = 0;
        loadSignAtIndex(0);
      } else if (!previewClip) {
        activeClipRef.current = null;
        setCurrentClipMeta(null);
        setMissingNotice(null);
      }
    }, [signs, previewClip, loadSignAtIndex]);

    // Imperative controller interface
    useImperativeHandle(
      ref,
      () => ({
        restart: () => {
          signIndexRef.current = 0;
          clipLocalTimeRef.current = 0;
          if (signs.length > 0) {
            loadSignAtIndex(0);
          }
        },
        stepNext: () => {
          if (signIndexRef.current + 1 < signs.length) {
            loadSignAtIndex(signIndexRef.current + 1);
          }
        },
        stepPrev: () => {
          if (signIndexRef.current > 0) {
            loadSignAtIndex(signIndexRef.current - 1);
          }
        },
      }),
      [signs, loadSignAtIndex]
    );

    // Initialize WebGL Scene
    useEffect(() => {
      const container = mountRef.current;
      const canvas = canvasRef.current;
      if (!container || !canvas) return;

      // WebGL capability check
      let renderer: THREE.WebGLRenderer;
      try {
        renderer = new THREE.WebGLRenderer({
          canvas,
          antialias: true,
          alpha: true,
          powerPreference: 'high-performance',
        });
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        renderer.toneMapping = THREE.ACESFilmicToneMapping;
        renderer.toneMappingExposure = 1.05;
        rendererRef.current = renderer;
      } catch (err) {
        console.warn('WebGL initialization failed, falling back:', err);
        onWebGLFallback?.();
        return;
      }

      const scene = new THREE.Scene();
      sceneRef.current = scene;

      // Fixed front camera framed on upper body and hands
      const aspect = container.clientWidth / (container.clientHeight || 1);
      const camera = new THREE.PerspectiveCamera(34, aspect, 0.1, 20);
      camera.position.set(0, 0.05, 1.95);
      camera.lookAt(0, 0.04, 0);
      cameraRef.current = camera;

      // Lighting: Warm clay lighting with lavender/blue rim accents
      const ambientLight = new THREE.AmbientLight(0xffffff, 1.3);
      scene.add(ambientLight);

      const keyLight = new THREE.DirectionalLight(0xffffff, 1.2);
      keyLight.position.set(1.5, 3, 2.5);
      keyLight.castShadow = true;
      keyLight.shadow.mapSize.width = 1024;
      keyLight.shadow.mapSize.height = 1024;
      keyLight.shadow.bias = -0.0005;
      scene.add(keyLight);

      const fillLight = new THREE.DirectionalLight(0xd4a5ff, 0.45);
      fillLight.position.set(-2, 1, 1);
      scene.add(fillLight);

      const rimLight = new THREE.DirectionalLight(0x7c9cff, 0.4);
      rimLight.position.set(0, 2, -2);
      scene.add(rimLight);

      // Create procedural clay avatar rig
      const rig = new ClayAvatarRig(skinTone);
      rig.setExpression(expression);
      rig.group.scale.x = mirrored ? -1 : 1;

      // Enable castShadow & receiveShadow across all clay meshes for soft stop-motion self-shadows
      rig.root.traverse((obj) => {
        if ((obj as THREE.Mesh).isMesh) {
          obj.castShadow = true;
          obj.receiveShadow = true;
        }
      });

      scene.add(rig.group);
      rigRef.current = rig;

      // Resize observer
      const handleResize = () => {
        if (!container || !renderer || !camera) return;
        const w = container.clientWidth;
        const h = container.clientHeight;
        if (w === 0 || h === 0) return;
        camera.aspect = w / h;
        camera.updateProjectionMatrix();
        renderer.setSize(w, h, false);
      };
      handleResize();

      const resizeObserver = new ResizeObserver(() => handleResize());
      resizeObserver.observe(container);

      // Main Animation Render Loop
      let lastTime = performance.now();
      let totalElapsed = 0;

      const animate = (now: number) => {
        animIdRef.current = requestAnimationFrame(animate);
        const dt = Math.min((now - lastTime) / 1000, 0.1);
        lastTime = now;
        totalElapsed += dt;

        // Apply idle breathing animation
        rig.updateIdleBreathing(totalElapsed);

        const currentClip = activeClipRef.current;
        if (currentClip && !isPausedRef.current) {
          const effectiveSpeed = speedRef.current;
          clipLocalTimeRef.current += dt * effectiveSpeed;
          const t = clipLocalTimeRef.current;

          // Find current frame in clip
          const frames = currentClip.frames;
          if (frames.length > 0) {
            let fA = frames[0];
            let fB = frames[frames.length - 1];

            for (let i = 0; i < frames.length - 1; i++) {
              if (frames[i].t <= t && frames[i + 1].t >= t) {
                fA = frames[i];
                fB = frames[i + 1];
                break;
              }
            }

            const span = Math.max(1e-4, fB.t - fA.t);
            const factor = Math.min(1, Math.max(0, (t - fA.t) / span));
            let jointPose = slerpJoints(fA.joints, fB.joints, factor);

            // Smooth SLERP blending (0.22s window) between consecutive signs
            const BLEND_WINDOW = 0.22;
            if (t < BLEND_WINDOW) {
              const blendFactor = Math.min(1, t / BLEND_WINDOW);
              jointPose = slerpJoints(prevEndJointsRef.current, jointPose, blendFactor);
            }

            rig.applyPose(jointPose);

            // Expression track update
            if (fA.expression) {
              rig.setExpression(fA.expression);
            }

            // Check if clip has finished
            if (t >= currentClip.duration) {
              prevEndJointsRef.current = jointPose;

              if (stepByStepRef.current) {
                // Pause at sign end in step-by-step mode
                isPausedRef.current = true;
              } else if (previewClip) {
                // Loop single preview clip smoothly
                clipLocalTimeRef.current = 0;
              } else {
                // Move to next sign in sequence
                loadSignAtIndex(signIndexRef.current + 1);
              }
            }
          }
        } else if (!currentClip) {
          // Return smoothly to neutral rest pose
          const rest = NEUTRAL_POSE_JOINTS;
          rig.applyPose(rest);
        }

        renderer.render(scene, camera);
      };

      animIdRef.current = requestAnimationFrame(animate);

      // Disposal and cleanup
      return () => {
        if (animIdRef.current) {
          cancelAnimationFrame(animIdRef.current);
        }
        if (missingTimeoutRef.current) {
          clearTimeout(missingTimeoutRef.current);
        }
        resizeObserver.disconnect();
        rig.dispose();
        renderer.dispose();
      };
    }, [skinTone, expression, mirrored, onWebGLFallback, loadSignAtIndex, previewClip]);

    return (
      <div
        ref={mountRef}
        className={`relative w-full h-full min-h-[380px] flex items-center justify-center select-none overflow-hidden ${className}`}
      >
        <canvas ref={canvasRef} className="w-full h-full block" />

        {/* Missing Sign Warning Overlay */}
        {missingNotice && (
          <div className="absolute top-4 left-4 right-4 z-20 flex justify-center animate-fade-in pointer-events-none">
            <div className="px-4 py-2 rounded-2xl bg-amber-500/90 text-white backdrop-blur text-xs font-black shadow-lg border border-amber-300">
              {missingNotice}
            </div>
          </div>
        )}

        {/* Verification Status Pill */}
        {currentClipMeta && !currentClipMeta.verified && (
          <div className="absolute bottom-4 left-4 z-20 pointer-events-none">
            <span className="px-3 py-1 rounded-full bg-amber-100 text-amber-900 border border-amber-300 text-[10px] font-black uppercase tracking-wider shadow-sm">
              Not verified yet
            </span>
          </div>
        )}
      </div>
    );
  }
);

SignAvatarCanvas.displayName = 'SignAvatarCanvas';
export default SignAvatarCanvas;
