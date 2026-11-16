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
  ArmPoseData,
  NEUTRAL_POSE_JOINTS,
} from './types';
import { ClayAvatarRig } from './ClayAvatarRig';
import {
  loadSignClip,
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
  showGhostMarker?: boolean;
  onArmTelemetry?: (stats: { avgError: number; minFaceDist: number }) => void;
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
      showGhostMarker = false,
      onArmTelemetry,
      className = '',
    },
    ref
  ) => {
    const mountRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    // State for UI overlay warnings
    const [missingNotice, setMissingNotice] = useState<string | null>(null);
    const [armDataMissing, setArmDataMissing] = useState<boolean>(false);
    const [currentClipMeta, setCurrentClipMeta] = useState<{
      signId: string;
      verified: boolean;
    } | null>(null);

    const ghostMarkerRightRef = useRef<THREE.Mesh | null>(null);
    const showGhostMarkerRef = useRef(showGhostMarker);
    showGhostMarkerRef.current = showGhostMarker;
    const onArmTelemetryRef = useRef(onArmTelemetry);
    onArmTelemetryRef.current = onArmTelemetry;

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
        const hasArm = Boolean(
          previewClip.hasArmData || previewClip.frames.some((f) => f.rightArm || f.leftArm)
        );
        setArmDataMissing(!hasArm);
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
          const hasArm = Boolean(clip.hasArmData || clip.frames.some(f => f.rightArm || f.leftArm));
          setArmDataMissing(!hasArm);
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

      // 3D Ghost target marker for arm tracking visual feedback
      const ghostGeo = new THREE.SphereGeometry(0.024, 16, 16);
      const ghostMat = new THREE.MeshBasicMaterial({
        color: 0xff6b81,
        transparent: true,
        opacity: 0.65,
      });
      const ghostMarker = new THREE.Mesh(ghostGeo, ghostMat);
      ghostMarker.visible = false;
      scene.add(ghostMarker);
      ghostMarkerRightRef.current = ghostMarker;

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

            rig.applyPose(jointPose, 0.95);

            // Arm IK targets: interpolate left & right arm
            let interpRightArm: ArmPoseData | undefined = undefined;
            if (fA.rightArm && fB.rightArm) {
              const elbowA = fA.rightArm.elbow || [0.22, -0.05, 0.1];
              const elbowB = fB.rightArm.elbow || [0.22, -0.05, 0.1];
              interpRightArm = {
                wrist: [
                  fA.rightArm.wrist[0] + (fB.rightArm.wrist[0] - fA.rightArm.wrist[0]) * factor,
                  fA.rightArm.wrist[1] + (fB.rightArm.wrist[1] - fA.rightArm.wrist[1]) * factor,
                  fA.rightArm.wrist[2] + (fB.rightArm.wrist[2] - fA.rightArm.wrist[2]) * factor,
                ],
                elbow: [
                  elbowA[0] + (elbowB[0] - elbowA[0]) * factor,
                  elbowA[1] + (elbowB[1] - elbowA[1]) * factor,
                  elbowA[2] + (elbowB[2] - elbowA[2]) * factor,
                ],
                wristToMouth: fA.rightArm.wristToMouth && fB.rightArm.wristToMouth ? [
                  fA.rightArm.wristToMouth[0] + (fB.rightArm.wristToMouth[0] - fA.rightArm.wristToMouth[0]) * factor,
                  fA.rightArm.wristToMouth[1] + (fB.rightArm.wristToMouth[1] - fA.rightArm.wristToMouth[1]) * factor,
                  fA.rightArm.wristToMouth[2] + (fB.rightArm.wristToMouth[2] - fA.rightArm.wristToMouth[2]) * factor,
                ] : fA.rightArm.wristToMouth ?? fB.rightArm.wristToMouth,
                wristToNose: fA.rightArm.wristToNose && fB.rightArm.wristToNose ? [
                  fA.rightArm.wristToNose[0] + (fB.rightArm.wristToNose[0] - fA.rightArm.wristToNose[0]) * factor,
                  fA.rightArm.wristToNose[1] + (fB.rightArm.wristToNose[1] - fA.rightArm.wristToNose[1]) * factor,
                  fA.rightArm.wristToNose[2] + (fB.rightArm.wristToNose[2] - fA.rightArm.wristToNose[2]) * factor,
                ] : fA.rightArm.wristToNose ?? fB.rightArm.wristToNose,
                isFaceAnchored: fA.rightArm.isFaceAnchored || fB.rightArm.isFaceAnchored,
              };
            } else if (fA.rightArm) {
              interpRightArm = fA.rightArm;
            } else if (fB.rightArm) {
              interpRightArm = fB.rightArm;
            }

            let interpLeftArm: ArmPoseData | undefined = undefined;
            if (fA.leftArm && fB.leftArm) {
              const elbowA = fA.leftArm.elbow || [-0.22, -0.05, 0.1];
              const elbowB = fB.leftArm.elbow || [-0.22, -0.05, 0.1];
              interpLeftArm = {
                wrist: [
                  fA.leftArm.wrist[0] + (fB.leftArm.wrist[0] - fA.leftArm.wrist[0]) * factor,
                  fA.leftArm.wrist[1] + (fB.leftArm.wrist[1] - fA.leftArm.wrist[1]) * factor,
                  fA.leftArm.wrist[2] + (fB.leftArm.wrist[2] - fA.leftArm.wrist[2]) * factor,
                ],
                elbow: [
                  elbowA[0] + (elbowB[0] - elbowA[0]) * factor,
                  elbowA[1] + (elbowB[1] - elbowA[1]) * factor,
                  elbowA[2] + (elbowB[2] - elbowA[2]) * factor,
                ],
                wristToMouth: fA.leftArm.wristToMouth && fB.leftArm.wristToMouth ? [
                  fA.leftArm.wristToMouth[0] + (fB.leftArm.wristToMouth[0] - fA.leftArm.wristToMouth[0]) * factor,
                  fA.leftArm.wristToMouth[1] + (fB.leftArm.wristToMouth[1] - fA.leftArm.wristToMouth[1]) * factor,
                  fA.leftArm.wristToMouth[2] + (fB.leftArm.wristToMouth[2] - fA.leftArm.wristToMouth[2]) * factor,
                ] : fA.leftArm.wristToMouth ?? fB.leftArm.wristToMouth,
                wristToNose: fA.leftArm.wristToNose && fB.leftArm.wristToNose ? [
                  fA.leftArm.wristToNose[0] + (fB.leftArm.wristToNose[0] - fA.leftArm.wristToNose[0]) * factor,
                  fA.leftArm.wristToNose[1] + (fB.leftArm.wristToNose[1] - fA.leftArm.wristToNose[1]) * factor,
                  fA.leftArm.wristToNose[2] + (fB.leftArm.wristToNose[2] - fA.leftArm.wristToNose[2]) * factor,
                ] : fA.leftArm.wristToNose ?? fB.leftArm.wristToNose,
                isFaceAnchored: fA.leftArm.isFaceAnchored || fB.leftArm.isFaceAnchored,
              };
            } else if (fA.leftArm) {
              interpLeftArm = fA.leftArm;
            } else if (fB.leftArm) {
              interpLeftArm = fB.leftArm;
            }

            // Apply Two-Bone analytical IK to the clay avatar arms (1.0 = exact analytical solution)
            rig.applyArmIK('Right', interpRightArm, currentClip.signId, 1.0);
            rig.applyArmIK('Left', interpLeftArm, currentClip.signId, 1.0);

            // Update ghost marker for visual feedback if enabled
            if (ghostMarkerRightRef.current) {
              if (showGhostMarkerRef.current && interpRightArm) {
                ghostMarkerRightRef.current.visible = true;
                const torsoPos = new THREE.Vector3();
                rig.bones['Torso']?.getWorldPosition(torsoPos);
                ghostMarkerRightRef.current.position.set(
                  torsoPos.x + interpRightArm.wrist[0] * (mirrored ? -1 : 1),
                  torsoPos.y + interpRightArm.wrist[1],
                  torsoPos.z + interpRightArm.wrist[2]
                );
              } else {
                ghostMarkerRightRef.current.visible = false;
              }
            }

            // Report telemetry if callback provided
            if (onArmTelemetryRef.current && interpRightArm) {
              const actualWrist = new THREE.Vector3();
              rig.bones['RightWrist']?.getWorldPosition(actualWrist);
              const targetPos = new THREE.Vector3(
                interpRightArm.wrist[0],
                interpRightArm.wrist[1],
                interpRightArm.wrist[2]
              );
              const errorCm = Math.round(actualWrist.distanceTo(targetPos) * 100);
              const mouthOffset = interpRightArm.wristToMouth;
              const faceDistCm = mouthOffset
                ? Math.round(Math.sqrt(mouthOffset[0] ** 2 + mouthOffset[1] ** 2 + mouthOffset[2] ** 2) * 47)
                : 30;
              onArmTelemetryRef.current({ avgError: errorCm, minFaceDist: faceDistCm });
            }

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
          rig.applyArmIK('Right', null);
          rig.applyArmIK('Left', null);
          if (ghostMarkerRightRef.current) {
            ghostMarkerRightRef.current.visible = false;
          }
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
        ghostGeo.dispose();
        ghostMat.dispose();
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

        {/* Arm Data Missing Warning Overlay */}
        {armDataMissing && (
          <div className="absolute top-4 right-4 z-20 pointer-events-none">
            <span className="px-2.5 py-1 rounded-full bg-slate-200/90 text-slate-600 border border-slate-300 text-[10px] font-bold shadow-sm backdrop-blur">
              arm data missing
            </span>
          </div>
        )}

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
