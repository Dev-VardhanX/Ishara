import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  Video,
  VideoOff,
  Circle,
  Square,
  RotateCcw,
  Download,
  Upload,
  Save,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  Info,
} from 'lucide-react';
import { SIGN_IDS, SignClip, SignFrame } from '../avatar/types';
import { saveLocalClip, getLocalClips, loadManifest } from '../avatar/clipStore';
import {
  handLandmarksToJoints,
  poseLandmarksToArmJoints,
  smoothAndResampleClip,
} from '../avatar/kinematics';
import { handTracker, HAND_CONNECTIONS, Landmark } from '../ml/handTracker';
import { SignAvatar } from '../avatar/SignAvatar';

export const SignRecorderPage: React.FC = () => {
  const [selectedSign, setSelectedSign] = useState<string>('HELLO');
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);
  const [isRecording, setIsRecording] = useState<boolean>(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [author, setAuthor] = useState<string>('ISL Contributor');
  const [verified, setVerified] = useState<boolean>(false);
  const [language, setLanguage] = useState<'ISL' | 'ASL'>('ISL');
  const [mirrorFix, setMirrorFix] = useState<boolean>(true);
  const [speed, setSpeed] = useState<0.5 | 1 | 1.5>(1);
  const [previewClip, setPreviewClip] = useState<SignClip | null>(null);
  const [savedStatus, setSavedStatus] = useState<string | null>(null);

  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animFrameRef = useRef<number | null>(null);
  const rawFramesRef = useRef<SignFrame[]>([]);
  const recordStartTimeRef = useRef<number>(0);

  // Initialize MediaPipe handTracker
  useEffect(() => {
    handTracker.init().catch((err) => {
      console.warn('Failed to pre-init hand tracker:', err);
    });
    return () => {
      stopCamera();
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false,
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }
      setIsCameraActive(true);
    } catch (err) {
      alert('Could not start camera. Please verify webcam permissions.');
    }
  };

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }
    setIsCameraActive(false);
    setIsRecording(false);
  };

  // Live detection & recording loop
  const runDetection = useCallback(() => {
    if (!videoRef.current || !canvasRef.current || !isCameraActive) {
      animFrameRef.current = requestAnimationFrame(runDetection);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState >= 2 && ctx) {
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const timestamp = performance.now();
      const detectedHands = handTracker.detect(video, timestamp);

      // Draw skeleton on overlay
      if (detectedHands && detectedHands.length > 0) {
        ctx.save();
        detectedHands.forEach((hand: Landmark[], idx: number) => {
          ctx.strokeStyle = idx === 0 ? '#7C9CFF' : '#A8E6A1';
          ctx.fillStyle = idx === 0 ? '#FFB59E' : '#D4A5FF';
          ctx.lineWidth = 3;

          HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
            const p1 = hand[startIdx];
            const p2 = hand[endIdx];
            if (p1 && p2) {
              ctx.beginPath();
              ctx.moveTo(p1.x * canvas.width, p1.y * canvas.height);
              ctx.lineTo(p2.x * canvas.width, p2.y * canvas.height);
              ctx.stroke();
            }
          });

          hand.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p.x * canvas.width, p.y * canvas.height, 4, 0, Math.PI * 2);
            ctx.fill();
          });
        });
        ctx.restore();
      }

      // Record frames if recording is active
      if (isRecording) {
        const t = (timestamp - recordStartTimeRef.current) / 1000;
        let joints = {};

        if (detectedHands && detectedHands.length > 0) {
          // Left hand & Right hand joints
          const leftHand = detectedHands[0];
          const rightHand = detectedHands.length > 1 ? detectedHands[1] : undefined;

          const leftJoints = handLandmarksToJoints(leftHand, 'Right', mirrorFix);
          const rightJoints = rightHand ? handLandmarksToJoints(rightHand, 'Left', mirrorFix) : {};

          joints = { ...leftJoints, ...rightJoints };
        }

        rawFramesRef.current.push({
          t: Number(t.toFixed(4)),
          joints,
          expression: 'neutral',
        });
      }
    }

    animFrameRef.current = requestAnimationFrame(runDetection);
  }, [isCameraActive, isRecording, mirrorFix]);

  useEffect(() => {
    if (isCameraActive) {
      animFrameRef.current = requestAnimationFrame(runDetection);
    }
    return () => {
      if (animFrameRef.current) cancelAnimationFrame(animFrameRef.current);
    };
  }, [isCameraActive, runDetection]);

  // Start recording with 3s countdown
  const handleStartRecording = () => {
    setCountdown(3);
    const interval = setInterval(() => {
      setCountdown((prev) => {
        if (prev === null || prev <= 1) {
          clearInterval(interval);
          rawFramesRef.current = [];
          recordStartTimeRef.current = performance.now();
          setIsRecording(true);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const handleStopRecording = () => {
    setIsRecording(false);
    const raw = rawFramesRef.current;
    if (raw.length === 0) return;

    // Resample to 30 fps and smooth jitter
    const smoothed = smoothAndResampleClip(raw, 30, 0.42);
    const duration = smoothed.length > 0 ? smoothed[smoothed.length - 1].t : 0;

    const clip: SignClip = {
      signId: selectedSign.toUpperCase().trim(),
      language,
      fps: 30,
      duration: Math.max(0.5, duration),
      author: author || 'ISL Contributor',
      verified,
      recordedAt: new Date().toISOString(),
      frames: smoothed,
    };

    setPreviewClip(clip);
    setSavedStatus('Recorded successfully! Preview active on the right.');
  };

  const handleSaveLocal = () => {
    if (!previewClip) return;
    saveLocalClip(previewClip);
    setSavedStatus(`Saved ${previewClip.signId} to local offline database!`);
  };

  const handleExportJson = () => {
    if (!previewClip) return;
    const blob = new Blob([JSON.stringify(previewClip, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${previewClip.signId}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleExportManifest = async () => {
    const baseManifest = await loadManifest();
    const localClips = getLocalClips();

    const mergedSigns = { ...baseManifest.signs };
    for (const [id, clip] of Object.entries(localClips)) {
      mergedSigns[id] = {
        file: `${id}.json`,
        language: clip.language,
        verified: clip.verified,
        author: clip.author,
      };
    }

    const manifestOutput = {
      version: 1,
      updatedAt: new Date().toISOString(),
      signs: mergedSigns,
    };

    const blob = new Blob([JSON.stringify(manifestOutput, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'manifest.json';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImportJson = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const parsed = JSON.parse(event.target?.result as string) as SignClip;
        if (parsed.signId && Array.isArray(parsed.frames)) {
          saveLocalClip(parsed);
          setPreviewClip(parsed);
          setSavedStatus(`Imported ${parsed.signId} (${parsed.frames.length} frames)!`);
        } else {
          alert('Invalid SignClip JSON format.');
        }
      } catch (err) {
        alert('Could not parse JSON file.');
      }
    };
    reader.readAsText(file);
  };

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-6 select-none font-sans">
      {/* Verification & Honesty Banner */}
      <div className="clay-card p-4 bg-amber-50/90 border border-amber-300 text-amber-900 rounded-2xl flex items-start gap-3 shadow-clay-raised-sm">
        <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-xs leading-relaxed">
          <p className="font-extrabold text-sm">Strict Sign Language Quality Rule:</p>
          <p>
            Record with a clear background and both hands visible. Have an ISL teacher verify each sign before marking it verified.
          </p>
        </div>
      </div>

      {/* Main Studio Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Left: Webcam Capture Stage */}
        <div className="lg:col-span-6 space-y-4">
          <div className="clay-card p-5 relative overflow-hidden bg-white/80 border border-slate-200/80">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Video className="w-4 h-4 text-[#7C9CFF]" />
                <h2 className="text-sm font-black text-[#2B2D42]">Webcam Input</h2>
              </div>

              {!isCameraActive ? (
                <button
                  type="button"
                  onClick={startCamera}
                  className="clay-button px-4 py-1.5 rounded-full text-xs font-black"
                >
                  Start Camera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="px-4 py-1.5 rounded-full bg-red-100 text-red-700 text-xs font-black hover:bg-red-200 transition-colors"
                >
                  Stop Camera
                </button>
              )}
            </div>

            {/* Video & Landmark Overlay Box */}
            <div className="relative aspect-video rounded-2xl bg-slate-900 overflow-hidden mt-3 flex items-center justify-center">
              <video
                ref={videoRef}
                className={`w-full h-full object-cover ${mirrorFix ? '-scale-x-100' : ''}`}
                playsInline
                muted
              />
              <canvas
                ref={canvasRef}
                className="absolute inset-0 w-full h-full pointer-events-none"
              />

              {!isCameraActive && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-white/60 space-y-2">
                  <VideoOff className="w-10 h-10" />
                  <span className="text-xs font-bold">Camera is inactive</span>
                </div>
              )}

              {/* Countdown overlay */}
              {countdown !== null && (
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                  <span className="text-6xl font-black text-white animate-ping">{countdown}</span>
                </div>
              )}

              {/* Live Recording Indicator */}
              {isRecording && (
                <div className="absolute top-3 left-3 flex items-center gap-2 px-3 py-1 rounded-full bg-red-600 text-white text-xs font-black animate-pulse">
                  <Circle className="w-3 h-3 fill-current" />
                  <span>RECORDING ({rawFramesRef.current.length} frames)</span>
                </div>
              )}
            </div>

            {/* Controls Bar */}
            <div className="pt-4 space-y-3">
              <div className="grid grid-cols-2 gap-3">
                {/* Sign Selection */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#6E7387] mb-1">
                    Select Target Sign
                  </label>
                  <select
                    value={selectedSign}
                    onChange={(e) => setSelectedSign(e.target.value)}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-[#2B2D42]"
                  >
                    {SIGN_IDS.map((id) => (
                      <option key={id} value={id}>
                        {id}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Sign Language System */}
                <div>
                  <label className="block text-[10px] font-black uppercase text-[#6E7387] mb-1">
                    Language
                  </label>
                  <select
                    value={language}
                    onChange={(e) => setLanguage(e.target.value as 'ISL' | 'ASL')}
                    className="w-full p-2.5 rounded-xl bg-slate-50 border border-slate-200 text-xs font-black text-[#2B2D42]"
                  >
                    <option value="ISL">ISL (Indian Sign Language)</option>
                    <option value="ASL">ASL (American Sign Language)</option>
                  </select>
                </div>
              </div>

              {/* Toggles */}
              <div className="flex items-center justify-between text-xs pt-1">
                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#2B2D42]">
                  <input
                    type="checkbox"
                    checked={mirrorFix}
                    onChange={(e) => setMirrorFix(e.target.checked)}
                    className="rounded text-[#7C9CFF]"
                  />
                  <span>Mirror Fix (Webcam Selfie)</span>
                </label>

                <label className="flex items-center gap-2 cursor-pointer font-bold text-[#2B2D42]">
                  <input
                    type="checkbox"
                    checked={verified}
                    onChange={(e) => setVerified(e.target.checked)}
                    className="rounded text-emerald-600"
                  />
                  <span>Mark as Verified by Teacher</span>
                </label>
              </div>

              {/* Record Action Buttons */}
              <div className="flex items-center gap-2 pt-2">
                {!isRecording ? (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    disabled={!isCameraActive || countdown !== null}
                    className="flex-1 clay-button py-2.5 rounded-xl font-black text-xs flex items-center justify-center gap-2 disabled:opacity-50"
                  >
                    <Circle className="w-4 h-4 fill-white" />
                    <span>Record Sign</span>
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={handleStopRecording}
                    className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white font-black text-xs flex items-center justify-center gap-2 shadow-lg"
                  >
                    <Square className="w-4 h-4 fill-white" />
                    <span>Stop Recording</span>
                  </button>
                )}

                {previewClip && (
                  <button
                    type="button"
                    onClick={handleStartRecording}
                    className="p-2.5 rounded-xl border border-slate-200 hover:bg-slate-100 text-[#2B2D42]"
                    title="Re-record"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Instant 3D Avatar Preview & Export */}
        <div className="lg:col-span-6 space-y-4">
          <div className="clay-card p-5 bg-white/80 border border-slate-200/80 space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-[#7C9CFF]" />
                <h2 className="text-sm font-black text-[#2B2D42]">3D Avatar Preview</h2>
              </div>

              {/* Playback Speed */}
              <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs">
                {[0.5, 1, 1.5].map((s) => (
                  <button
                    key={s}
                    type="button"
                    onClick={() => setSpeed(s as any)}
                    className={`px-2.5 py-0.5 rounded-full font-black ${
                      speed === s ? 'bg-[#7C9CFF] text-white shadow-xs' : 'text-[#6E7387]'
                    }`}
                  >
                    {s}x
                  </button>
                ))}
              </div>
            </div>

            {/* 3D Canvas Preview Window */}
            <div className="relative aspect-video rounded-2xl bg-[#E9EEF7] border border-slate-200/60 overflow-hidden flex items-center justify-center">
              {previewClip ? (
                <SignAvatar
                  previewClip={previewClip}
                  speed={speed}
                  playing={true}
                  className="w-full h-full"
                />
              ) : (
                <div className="text-center p-6 space-y-2 text-[#6E7387]">
                  <Info className="w-8 h-8 mx-auto text-[#7C9CFF]" />
                  <p className="text-xs font-black">No clip recorded yet</p>
                  <p className="text-[11px]">Record a sign on the left to preview it here.</p>
                </div>
              )}
            </div>

            {/* Status Alert */}
            {savedStatus && (
              <div className="p-2.5 rounded-xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-bold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-600" />
                <span>{savedStatus}</span>
              </div>
            )}

            {/* Clip Persistence & Export Hub */}
            <div className="pt-2 grid grid-cols-2 sm:grid-cols-4 gap-2">
              <button
                type="button"
                onClick={handleSaveLocal}
                disabled={!previewClip}
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[#2B2D42] text-xs font-black flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40"
              >
                <Save className="w-3.5 h-3.5 text-[#7C9CFF]" />
                <span>Save Local</span>
              </button>

              <button
                type="button"
                onClick={handleExportJson}
                disabled={!previewClip}
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[#2B2D42] text-xs font-black flex items-center justify-center gap-1.5 shadow-sm disabled:opacity-40"
              >
                <Download className="w-3.5 h-3.5 text-[#FFB59E]" />
                <span>Export Clip</span>
              </button>

              <button
                type="button"
                onClick={handleExportManifest}
                className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[#2B2D42] text-xs font-black flex items-center justify-center gap-1.5 shadow-sm"
              >
                <Download className="w-3.5 h-3.5 text-[#D4A5FF]" />
                <span>Export Manifest</span>
              </button>

              <label className="p-2.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-[#2B2D42] text-xs font-black flex items-center justify-center gap-1.5 shadow-sm cursor-pointer">
                <Upload className="w-3.5 h-3.5 text-[#A8E6A1]" />
                <span>Import JSON</span>
                <input
                  type="file"
                  accept=".json"
                  onChange={handleImportJson}
                  className="hidden"
                />
              </label>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignRecorderPage;
