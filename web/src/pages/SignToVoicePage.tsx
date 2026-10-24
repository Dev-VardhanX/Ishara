import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Header } from '../components/Header';
import { Badge } from '../components/Badge';
import { useLanguageStore } from '../store/useLanguageStore';
import {
  HAND_CONNECTIONS,
  Landmark,
} from '../lib/recognizer';
import {
  init as initHandTracker,
  detect as detectHands,
  close as closeHandTracker,
  handTracker,
  createActiveRecognizer,
  ISLRecognizer,
  SIGN_VOCABULARY,
  SentenceTranslationResult,
  AlternativeCandidate,
} from '../ml';
import { addRecentConversation } from '../data/store';
import { useSpeech, SpeechEmotion, SPEECH_EMOTIONS, recordUserInteraction } from '../lib/speech';
import {
  Video,
  Play,
  Pause,
  RotateCcw,
  Volume2,
  Copy,
  Bookmark,
  Sparkles,
  Camera,
  Check,
  AlertCircle,
  ShieldCheck,
  Eye,
  RefreshCw,
  ExternalLink,
  ChevronDown,
  VolumeX,
} from 'lucide-react';

// Emotion presets matching docs/contracts/model-contract.md
export type EmotionType = SpeechEmotion;


interface EmotionPreset {
  name: string;
  emoji: string;
  pitch: number;
  rate: number;
  volume: number;
  bgClass: string;
  textClass: string;
}

const EMOTION_PRESETS: Record<EmotionType, EmotionPreset> = {
  happy: { name: 'Happy', emoji: '😊', pitch: 1.2, rate: 1.1, volume: 1.0, bgClass: 'bg-[#FFE8E2]', textClass: 'text-[#FF8A8A]' },
  neutral: { name: 'Neutral', emoji: '😐', pitch: 1.0, rate: 1.0, volume: 1.0, bgClass: 'bg-slate-100', textClass: 'text-[#6E7387]' },
  sad: { name: 'Sad', emoji: '😢', pitch: 0.8, rate: 0.85, volume: 0.8, bgClass: 'bg-blue-100', textClass: 'text-[#7C9CFF]' },
  angry: { name: 'Angry', emoji: '😠', pitch: 1.0, rate: 1.15, volume: 1.0, bgClass: 'bg-red-100', textClass: 'text-red-600' },
  surprised: { name: 'Surprised', emoji: '😲', pitch: 1.3, rate: 1.1, volume: 1.0, bgClass: 'bg-amber-100', textClass: 'text-amber-600' },
};

export const SignToVoicePage: React.FC = () => {
  const { language } = useLanguageStore();

  // Video & Canvas references
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);

  // HandLandmarker offline status & state
  const [modelLoading, setModelLoading] = useState<boolean>(true);
  const [modelError, setModelError] = useState<string | null>(null);
  const [modelDelegate, setModelDelegate] = useState<'GPU' | 'CPU' | null>(null);

  // Recognizer instance (uses ISLRecognizer from src/ml/index.ts)
  const recognizerRef = useRef<ISLRecognizer>(createActiveRecognizer() as ISLRecognizer);

  // Camera & Stream Status
  const [cameraActive, setCameraActive] = useState<boolean>(false);
  const [isPaused, setIsPaused] = useState<boolean>(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [useSimulation, setUseSimulation] = useState<boolean>(false);

  // Live Recognition & Translation Output
  const [liveCandidate, setLiveCandidate] = useState<string | null>(null);
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const [acceptedWords, setAcceptedWords] = useState<string[]>([]);
  const [rawGlosses, setRawGlosses] = useState<string[]>([]);
  const [distinctGlosses, setDistinctGlosses] = useState<string[]>([]);
  const [naturalSentence, setNaturalSentence] = useState<string>('');
  const [similarGlosses, setSimilarGlosses] = useState<AlternativeCandidate[]>([]);
  const [simCategory, setSimCategory] = useState<'all' | 'pronouns' | 'communication' | 'needs'>('all');
  const [currentEmotion, setCurrentEmotion] = useState<EmotionType>('happy');
  const [selectedVoice, setSelectedVoice] = useState<string>('Standard Natural');
  const [copied, setCopied] = useState<boolean>(false);
  const [autoSpeak, setAutoSpeak] = useState<boolean>(true);

  // Shared text-to-speech engine
  const speech = useSpeech();

  // Transcript History
  const [transcripts, setTranscripts] = useState<{ id: string; time: string; text: string }[]>([
    { id: '1', time: '12:44', text: 'Hello, how are you?' },
    { id: '2', time: '12:45', text: 'Nice to meet you today.' },
  ]);

  // Load offline HandLandmarker model using local WASM and /models/hand_landmarker.task
  const loadModel = useCallback(async () => {
    setModelLoading(true);
    setModelError(null);
    try {
      await initHandTracker();
      setModelLoading(false);
      setModelDelegate(handTracker.getActiveDelegate());
    } catch (err: any) {
      console.error('Failed to load HandLandmarker model:', err);
      setModelError(err?.message || 'Could not load hand landmark model. Please check file access.');
      setModelLoading(false);
    }
  }, []);

  useEffect(() => {
    document.title = 'Sign to Voice — Ishara';
    loadModel();

    return () => {
      stopCamera();
      closeHandTracker();
      recognizerRef.current.destroy();
    };
  }, [loadModel]);

  // Synchronize language (ISL / ASL) with active recognizer
  useEffect(() => {
    recognizerRef.current.setLanguage(language);
  }, [language]);

  // Start Camera
  const startCamera = async () => {
    recordUserInteraction();
    setCameraError(null);
    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera device access is not supported by this browser.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          width: { ideal: 640 },
          height: { ideal: 480 },
          facingMode: 'user',
        },
        audio: false,
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();
      }

      setCameraActive(true);
      setIsPaused(false);
      setUseSimulation(false);
    } catch (err: any) {
      console.warn('Camera stream error:', err);
      let message = 'Could not access camera.';
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        message = 'Camera permission was denied. Please allow camera permissions in your browser bar.';
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        message = 'No video camera detected on your system. You can test using simulation mode.';
      } else {
        message = `Camera error: ${err.message || 'Unknown error'}`;
      }
      setCameraError(message);
      setCameraActive(false);
    }
  };

  // Stop Camera
  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((track) => track.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    setCameraActive(false);
    setIsPaused(false);

    // Clear canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }
  };

  // Toggle Pause
  const togglePause = () => {
    setIsPaused((prev) => !prev);
  };

  // Main Detection Loop with HandLandmarker
  const runDetection = useCallback(() => {
    if (!cameraActive || isPaused || !videoRef.current || !canvasRef.current) {
      animationFrameRef.current = requestAnimationFrame(runDetection);
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');

    if (video.readyState >= 2 && ctx) {
      // Sync canvas dimensions
      if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
        canvas.width = video.videoWidth || 640;
        canvas.height = video.videoHeight || 480;
      }

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      const startTimeMs = performance.now();
      const hands = detectHands(video, startTimeMs);

      if (hands && hands.length > 0) {
        // 1. Draw Hand Skeleton and Joints on Canvas Overlay for up to two hands
        ctx.save();
        hands.forEach((hand, handIdx) => {
          const boneColor = handIdx === 0 ? '#FF8A8A' : '#A8E6A1';
          const jointColor = handIdx === 0 ? '#7C9CFF' : '#D4A5FF';

          // Draw skeleton connection lines
          ctx.lineWidth = 3;
          ctx.strokeStyle = boneColor;
          HAND_CONNECTIONS.forEach(([startIdx, endIdx]) => {
            const start = hand[startIdx];
            const end = hand[endIdx];
            if (start && end) {
              ctx.beginPath();
              ctx.moveTo(start.x * canvas.width, start.y * canvas.height);
              ctx.lineTo(end.x * canvas.width, end.y * canvas.height);
              ctx.stroke();
            }
          });

          // Draw landmark joint points
          hand.forEach((point) => {
            ctx.beginPath();
            ctx.arc(point.x * canvas.width, point.y * canvas.height, 5, 0, 2 * Math.PI);
            ctx.fillStyle = jointColor;
            ctx.fill();
            ctx.lineWidth = 1.5;
            ctx.strokeStyle = '#FFFFFF';
            ctx.stroke();
          });
        });
        ctx.restore();

        // 2. Classify with active Recognizer (passes all detected hands)
        recognizerRef.current.recognize(hands, startTimeMs);
      } else {
        recognizerRef.current.recognize([], performance.now());
      }
    }

    animationFrameRef.current = requestAnimationFrame(runDetection);
  }, [cameraActive, isPaused]);

  // Wire ISLRecognizer callbacks for sentence building & optional speech
  useEffect(() => {
    recognizerRef.current.setCallbacks({
      onWordRecognized: (_gloss: string, text: string, confidence: number = 0.95) => {
        if (autoSpeak && confidence >= 0.85) {
          speech.speak(text, {
            emotion: currentEmotion,
            lang: language === 'ISL' ? 'en-IN' : 'en-US',
            isAutoSpeak: true,
          });
        }
      },
      onSentenceUpdated: (fullText: string, words: string[], translation?: SentenceTranslationResult) => {
        setAcceptedWords(words);
        setRawGlosses(translation?.rawGlosses || []);
        setDistinctGlosses(translation?.distinctGlosses || []);
        const finalSentence = translation?.naturalSentence || fullText;
        setNaturalSentence(finalSentence);

        const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        const newEntry = {
          id: String(Date.now()),
          time: timeStr,
          text: finalSentence,
        };
        setTranscripts((prev) => [newEntry, ...prev.slice(0, 4)]);

        try {
          addRecentConversation(
            {
              title: `Sign: "${finalSentence.slice(0, 24)}${finalSentence.length > 24 ? '...' : ''}"`,
              mode: `Sign to Voice (${language})`,
              timestamp: 'Just now',
              snippet: finalSentence,
              language,
              iconEmoji: '🤟',
              direction: 'sign_to_voice',
            },
            {
              direction: 'sign_to_voice',
              text: finalSentence,
              translatedText: finalSentence,
              emotion: currentEmotion,
            }
          );
        } catch (err) {
          console.warn('Failed to save to history', err);
        }
      },
      onCandidateUpdate: (gloss: string | null, progress: number, similar?: AlternativeCandidate[]) => {
        setLiveCandidate(gloss);
        setHoldProgress(progress);
        if (similar) {
          setSimilarGlosses(similar);
        }
      },
      onSimilarGlossesUpdated: (candidates: AlternativeCandidate[]) => {
        setSimilarGlosses(candidates);
      },
      onProgressUpdated: (progress: number) => {
        setHoldProgress(progress);
      },
    });
  }, [autoSpeak, currentEmotion, language, speech]);

  // Start / restart detection loop
  useEffect(() => {
    if (cameraActive) {
      animationFrameRef.current = requestAnimationFrame(runDetection);
    }
    return () => {
      if (animationFrameRef.current) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, [cameraActive, runDetection]);

  // Simulation Mode Trigger for testing without camera
  const triggerSimulatedSign = (gloss: string) => {
    recordUserInteraction();
    recognizerRef.current.triggerManualSign(gloss);
  };

  // Full translated sentence with natural grammar synthesis
  const translatedSentence =
    naturalSentence ||
    (acceptedWords.length > 0
      ? acceptedWords.join(' ')
      : 'Frame your hands in front of the camera and begin signing...');

  // Speak with Emotion Modulation via shared speech helper
  const handleSpeak = () => {
    if (!translatedSentence || translatedSentence.includes('Frame your hands')) {
      return;
    }
    recordUserInteraction();
    speech.speak(translatedSentence, {
      emotion: currentEmotion,
      lang: language === 'ISL' ? 'en-IN' : 'en-US',
      isUserClick: true,
    });
  };

  // Copy to clipboard
  const handleCopy = () => {
    navigator.clipboard?.writeText(translatedSentence);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  // Save to history store
  const handleSave = () => {
    const timeStr = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    const newEntry = {
      id: String(Date.now()),
      time: timeStr,
      text: translatedSentence,
    };

    setTranscripts((prev) => [newEntry, ...prev.slice(0, 4)]);

    // Persist to central history store
    try {
      addRecentConversation({
        title: `Sign: "${translatedSentence.slice(0, 24)}${translatedSentence.length > 24 ? '...' : ''}"`,
        mode: `Sign to Voice (${language})`,
        timestamp: 'Just now',
        snippet: translatedSentence,
        language,
        iconEmoji: '🤟',
      });
    } catch (err) {
      console.warn('Failed to save to history', err);
    }
  };

  // Reset words and sentence builder
  const handleResetWords = () => {
    setAcceptedWords([]);
    setRawGlosses([]);
    setDistinctGlosses([]);
    setNaturalSentence('');
    setSimilarGlosses([]);
    recognizerRef.current.clearSentence();
    setLiveCandidate(null);
    setHoldProgress(0);
  };

  return (
    <div className="space-y-6 select-none">
      {/* Header with offline indicator and ISL/ASL switcher */}
      <Header
        title="Live Translator"
        subtitle="Real-time in-browser sign language classification into speech and subtitles"
        badge={
          <Badge
            tooltip={`Real-time ${language} 43-sign geometric & kinematic recognition with natural sentence formation.`}
            variant="blue"
          >
            {language} • 43 Signs
          </Badge>
        }
      />

      {/* Camera Permission / Device Error Banner */}
      {cameraError && (
        <div className="p-4 rounded-2xl bg-[#FFE8E2] border border-[#FF8A8A]/50 text-[#2B2D42] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#FF8A8A] shrink-0" />
            <p className="text-xs font-bold leading-relaxed">{cameraError}</p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={startCamera}
              className="clay-button clay-button-white px-3 py-1.5 text-xs font-black flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#7C9CFF]" />
              <span>Retry Camera</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setCameraError(null);
                setUseSimulation(true);
              }}
              className="clay-button px-3 py-1.5 text-xs font-black"
            >
              Use Gesture Simulator
            </button>
          </div>
        </div>
      )}

      {/* Model Loading / Initialization Error Banner */}
      {modelError && (
        <div className="p-4 rounded-2xl bg-[#FFE8E2] border border-[#FF8A8A]/50 text-[#2B2D42] flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#FF8A8A] shrink-0" />
            <div>
              <p className="text-xs font-black text-[#2B2D42]">HandLandmarker Offline Load Error</p>
              <p className="text-xs font-medium text-[#6E7387]">{modelError}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={loadModel}
              className="clay-button clay-button-white px-3 py-1.5 text-xs font-black flex items-center gap-1.5"
            >
              <RefreshCw className="w-3.5 h-3.5 text-[#7C9CFF]" />
              <span>Retry Model</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setModelError(null);
                setUseSimulation(true);
              }}
              className="clay-button px-3 py-1.5 text-xs font-black"
            >
              Use Gesture Simulator
            </button>
          </div>
        </div>
      )}

      {/* Main Grid: Left Camera & Live Recognition, Right Audio Output & History */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column (Webcam Preview & Controls) */}
        <div className="lg:col-span-7 space-y-6">
          {/* Webcam Viewport Card */}
          <div className="clay-card p-4 relative overflow-hidden bg-[#2B2D42] text-white min-h-[440px] flex flex-col justify-between">
            {/* Camera Status Bar */}
            <div className="flex items-center justify-between z-10 flex-wrap gap-2">
              <div className="flex items-center gap-2 px-3 py-1 rounded-full bg-black/50 backdrop-blur text-xs font-bold shadow-sm">
                <span
                  className={`w-2.5 h-2.5 rounded-full ${
                    cameraActive && !isPaused ? 'bg-[#FF8A8A] animate-pulse' : 'bg-slate-400'
                  }`}
                ></span>
                <span>{cameraActive ? (isPaused ? 'PAUSED' : 'LIVE • STREAMING') : 'OFFLINE'}</span>
              </div>

              <div className="flex items-center gap-2">
                <div
                  className={`px-3 py-1 rounded-full backdrop-blur text-[11px] font-bold ${
                    modelError
                      ? 'bg-red-500/80 text-white'
                      : modelLoading
                      ? 'bg-amber-500/80 text-white animate-pulse'
                      : 'bg-black/50 text-white/90'
                  }`}
                >
                  {modelError ? (
                    'Model Failed'
                  ) : modelLoading ? (
                    <span className="flex items-center gap-1.5">
                      <RefreshCw className="w-3 h-3 animate-spin" />
                      <span>Loading MediaPipe (Offline WASM)...</span>
                    </span>
                  ) : (
                    <span>
                      MediaPipe Ready (Offline{modelDelegate ? ` • ${modelDelegate}` : ''})
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Video & Canvas Viewport */}
            <div className="relative my-auto flex items-center justify-center min-h-[300px]">
              {/* Clear Model Loading Overlay */}
              {modelLoading && (
                <div className="absolute inset-0 z-20 rounded-[22px] bg-black/60 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                  <div className="w-10 h-10 rounded-full border-3 border-[#7C9CFF]/30 border-t-[#7C9CFF] animate-spin mb-3"></div>
                  <p className="text-sm font-black text-white">Loading HandLandmarker Model...</p>
                  <p className="text-xs text-white/70 mt-1 max-w-xs">
                    Initializing MediaPipe WASM runtime & loading /models/hand_landmarker.task
                  </p>
                </div>
              )}

              {/* Model Error Overlay inside viewport when camera is offline */}
              {modelError && !cameraActive && !modelLoading && (
                <div className="absolute inset-0 z-20 rounded-[22px] bg-black/70 backdrop-blur-sm flex flex-col items-center justify-center p-6 text-center animate-fade-in">
                  <AlertCircle className="w-10 h-10 text-[#FF8A8A] mb-2" />
                  <p className="text-xs font-black text-white">Model Load Failed</p>
                  <p className="text-[11px] text-white/70 mt-1 max-w-xs leading-relaxed">
                    {modelError}
                  </p>
                  <button
                    type="button"
                    onClick={loadModel}
                    className="clay-button clay-button-coral text-xs font-black px-4 py-2 mt-3"
                  >
                    Retry Loading Model
                  </button>
                </div>
              )}

              {/* Actual Video Feed */}
              <video
                ref={videoRef}
                playsInline
                muted
                className={`w-full max-h-[340px] object-cover rounded-[22px] transform -scale-x-100 ${
                  cameraActive ? 'block' : 'hidden'
                }`}
              />

              {/* Landmark Drawing Canvas Overlay */}
              <canvas
                ref={canvasRef}
                className={`absolute inset-0 w-full h-full pointer-events-none transform -scale-x-100 ${
                  cameraActive ? 'block' : 'hidden'
                }`}
              />

              {/* Offline / Frame Guide Overlay */}
              {!cameraActive && (
                <div className="w-56 h-64 border-2 border-dashed border-white/30 rounded-[32px] flex flex-col items-center justify-center p-5 text-center bg-black/20 backdrop-blur-sm">
                  <div className="w-20 h-20 rounded-full bg-white/10 flex items-center justify-center text-4xl mb-3 shadow-inner">
                    👤
                  </div>
                  <p className="text-xs font-black text-white/90">
                    Frame your hands and upper body
                  </p>
                  <p className="text-[10px] text-white/60 mt-1">
                    Hold gesture for 8 frames to classify
                  </p>
                  <button
                    type="button"
                    onClick={startCamera}
                    className="clay-button clay-button-coral text-xs font-black px-4 py-2 mt-4 clay-focus"
                  >
                    Start Camera
                  </button>
                </div>
              )}

              {/* In-Frame Guide Lines when active */}
              {cameraActive && (
                <div className="absolute inset-4 border-2 border-dashed border-white/20 rounded-[28px] pointer-events-none flex items-center justify-center">
                  <span className="absolute top-3 text-[10px] font-black text-white/40 uppercase tracking-widest">
                    Frame your hands and upper body
                  </span>
                </div>
              )}
            </div>

            {/* Bottom Controls Bar */}
            <div className="flex items-center justify-between z-10 pt-2 border-t border-white/10">
              <span className="text-[11px] font-bold text-white/60 flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#A8E6A1]" />
                <span>Video never leaves your device</span>
              </span>

              <div className="flex items-center gap-3">
                {/* Pause / Resume */}
                <button
                  type="button"
                  onClick={togglePause}
                  disabled={!cameraActive}
                  className="w-11 h-11 rounded-full bg-white/80 hover:bg-white text-[#2B2D42] flex items-center justify-center shadow-md clay-focus disabled:opacity-40"
                  title={isPaused ? 'Resume Camera' : 'Pause Camera'}
                >
                  {isPaused ? <Play className="w-4 h-4 ml-0.5" /> : <Pause className="w-4 h-4" />}
                </button>

                {/* Start / Stop Stream */}
                <button
                  type="button"
                  onClick={cameraActive ? stopCamera : startCamera}
                  className={`w-14 h-14 rounded-full flex items-center justify-center shadow-clay-raised clay-focus transition-all active:scale-95 ${
                    cameraActive ? 'bg-[#FF8A8A] text-white' : 'bg-[#7C9CFF] text-white'
                  }`}
                  title={cameraActive ? 'Stop Stream' : 'Start Stream'}
                >
                  {cameraActive ? (
                    <div className="w-5 h-5 rounded-md bg-white"></div>
                  ) : (
                    <Play className="w-6 h-6 ml-1" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {/* Gesture Simulator Quick Test Strip (if camera offline or requested) */}
          {(!cameraActive || useSimulation) && (
            <div className="clay-card p-4 bg-white/80 space-y-3">
              <div className="flex items-center justify-between flex-wrap gap-2">
                <div>
                  <span className="text-[11px] font-black uppercase text-[#6E7387]">
                    Gesture Simulator ({language} — 42 Signs)
                  </span>
                  <p className="text-[10px] text-[#6E7387] mt-0.5">Click signs to test recognition & natural sentence builder</p>
                </div>
                {/* Category filters */}
                <div className="flex gap-1">
                  {(['all', 'pronouns', 'communication', 'needs'] as const).map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setSimCategory(cat)}
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase transition-all ${
                        simCategory === cat
                          ? 'bg-[#7C9CFF] text-white shadow-xs'
                          : 'bg-slate-100 hover:bg-slate-200 text-[#6E7387]'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>
              </div>
              <div className="flex flex-wrap gap-1.5 max-h-52 overflow-y-auto pr-1">
                {Object.values(SIGN_VOCABULARY)
                  .filter((item) => simCategory === 'all' || item.category === simCategory)
                  .map((item) => {
                    const gloss = language === 'ISL' ? item.islGloss : item.aslGloss;
                    return (
                      <button
                        key={item.id}
                        type="button"
                        onClick={() => triggerSimulatedSign(item.id)}
                        className="px-2.5 py-1.5 rounded-xl bg-white hover:bg-slate-50 border border-slate-200 text-xs font-black text-[#2B2D42] shadow-xs hover:scale-102 transition-all flex items-center gap-1.5"
                        title={item.description}
                      >
                        <span className="text-[10px] font-bold text-[#7C9CFF] font-mono">{gloss}</span>
                        <span>{item.label}</span>
                      </button>
                    );
                  })}
              </div>
            </div>
          )}

          {/* Live Recognition Box */}
          <div className="clay-card p-5 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-[10px] font-black uppercase text-[#6E7387] tracking-wider">
                  Live Recognition
                </p>
                <div className="flex items-baseline gap-2 mt-0.5">
                  <p className="text-xl sm:text-2xl font-black text-[#2B2D42]">
                    {liveCandidate ? (
                      <span className="text-[#7C9CFF]">{liveCandidate}</span>
                    ) : (
                      <span className="text-slate-400 font-semibold text-lg italic">
                        Waiting for hand gesture...
                      </span>
                    )}
                  </p>
                  {/* Blinking typing caret */}
                  <span className="w-2 h-5 bg-[#7C9CFF] animate-pulse inline-block align-middle"></span>
                </div>
              </div>

              {/* Emotion Chip Selector */}
              <div className="flex items-center gap-1.5">
                <span className="text-[10px] font-black uppercase text-[#6E7387]">Emotion:</span>
                <div className="relative inline-block">
                  <select
                    value={currentEmotion}
                    onChange={(e) => setCurrentEmotion(e.target.value as EmotionType)}
                    className="clay-input text-xs font-black py-1.5 pl-3 pr-7 rounded-full cursor-pointer appearance-none bg-white/80"
                  >
                    {Object.entries(EMOTION_PRESETS).map(([key, val]) => (
                      <option key={key} value={key}>
                        {val.emoji} {val.name}
                      </option>
                    ))}
                  </select>
                  <ChevronDown className="w-3.5 h-3.5 text-[#6E7387] absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>
            </div>

            {/* Gesture Hold Stability Progress Bar */}
            {liveCandidate && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-[10px] font-black text-[#6E7387]">
                  <span>Hold Stability (Snappy 100ms Detection)</span>
                  <span>{Math.round(holdProgress * 100)}%</span>
                </div>
                <div className="h-2 w-full bg-slate-200/80 rounded-full overflow-hidden shadow-inner">
                  <div
                    className="h-full bg-[#7C9CFF] transition-all duration-150"
                    style={{ width: `${holdProgress * 100}%` }}
                  ></div>
                </div>
              </div>
            )}
          </div>

          {/* Similar Glosses Card (Alternative Candidate Predictions) */}
          <div className="clay-card p-4 space-y-2.5 bg-white/90">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5">
                <Sparkles className="w-3.5 h-3.5 text-[#7C9CFF]" />
                <span className="text-[10px] font-black uppercase text-[#6E7387] tracking-wider">
                  Similar Glosses (Alternative Candidates)
                </span>
              </div>
              <span className="text-[10px] font-bold text-[#6E7387]/80">
                {language} Vocabulary
              </span>
            </div>

            {similarGlosses.length > 0 ? (
              <div className="flex flex-wrap gap-2 pt-1">
                {similarGlosses.map((cand) => (
                  <div
                    key={cand.signId}
                    className="flex items-center gap-2 px-3 py-1.5 rounded-2xl bg-white border border-slate-200/80 shadow-xs hover:border-[#7C9CFF]/50 transition-all"
                  >
                    {/* Language metadata badge */}
                    <span className="px-1.5 py-0.5 rounded-md bg-[#7C9CFF]/15 text-[#7C9CFF] font-mono text-[10px] font-black">
                      {cand.language}
                    </span>
                    {/* User-facing gloss label */}
                    <span className="text-xs font-black text-[#2B2D42]">
                      {cand.gloss}
                    </span>
                    {/* Human readable label if different */}
                    {cand.label.toUpperCase() !== cand.gloss && (
                      <span className="text-[11px] text-[#6E7387] font-semibold">
                        ({cand.label})
                      </span>
                    )}
                    {/* Confidence percentage chip */}
                    <span className="px-1.5 py-0.5 rounded-full bg-slate-100 text-[#6E7387] font-mono text-[10px] font-bold">
                      {Math.round(cand.confidence * 100)}% match
                    </span>
                  </div>
                ))}
              </div>
            ) : (
              <div className="py-2.5 px-3 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-center">
                <p className="text-xs font-bold text-[#6E7387]">
                  No close alternative gestures detected
                </p>
                <p className="text-[10px] text-slate-400 mt-0.5">
                  Hold gesture steady in camera view to display alternative candidate rankings
                </p>
              </div>
            )}
          </div>
        </div>

        {/* Right Column (Translated Output & Transcript History) */}
        <div className="lg:col-span-5 space-y-6">
          {/* Translated Output Card */}
          <div className="clay-card p-7 space-y-6">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black uppercase text-[#6E7387] tracking-wider">
                Translated Output (English)
              </span>
              <div className="flex items-center gap-2">
                {/* Auto-Speak Toggle */}
                <button
                  type="button"
                  onClick={() => setAutoSpeak(!autoSpeak)}
                  className={`px-2.5 py-1 rounded-full text-[11px] font-black flex items-center gap-1.5 transition-all ${
                    autoSpeak
                      ? 'bg-[#A8E6A1]/40 text-emerald-800 border border-emerald-300'
                      : 'bg-slate-200 text-slate-600'
                  }`}
                  title="Toggle automatic speech synthesis when gestures are recognized"
                >
                  {autoSpeak ? <Volume2 className="w-3 h-3" /> : <VolumeX className="w-3 h-3" />}
                  <span>Auto-Speak {autoSpeak ? 'ON' : 'OFF'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleResetWords}
                  className="text-xs font-bold text-[#6E7387] hover:text-[#FF8A8A]"
                >
                  Clear
                </button>
              </div>
            </div>

            {/* Visible Voice Error Banner */}
            {speech.errorMessage && (
              <div className="p-3.5 rounded-2xl bg-[#FFE8E2] border border-[#FFB59E] text-[#2B2D42] text-xs font-bold flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 text-[#FF8A8A] shrink-0" />
                  <span>{speech.errorMessage}</span>
                </div>
                <button
                  type="button"
                  onClick={speech.clearError}
                  className="text-[#FF8A8A] hover:underline font-black text-xs shrink-0"
                >
                  Dismiss
                </button>
              </div>
            )}

            {/* Sign Gloss Tokens & Sentence Quote Box */}
            <div className="space-y-2">
              {/* Distinct Gloss Sequence badge strip */}
              {distinctGlosses.length > 0 && (
                <div className="flex items-center gap-2 flex-wrap p-3 rounded-2xl bg-white/70 border border-slate-200/60 text-xs font-bold shadow-xs">
                  {/* Dedicated language badge kept strictly separate from the gloss tokens */}
                  <span className="px-2.5 py-1 rounded-full bg-[#7C9CFF] text-white text-[10px] font-black uppercase tracking-wider shadow-xs">
                    {language}
                  </span>
                  <span className="text-[10px] uppercase font-black text-[#6E7387] tracking-wider">
                    Sign Glosses:
                  </span>
                  {distinctGlosses.map((gloss, idx) => (
                    <React.Fragment key={idx}>
                      {idx > 0 && <span className="text-[#6E7387] font-black text-xs">→</span>}
                      <span className="px-2.5 py-1 rounded-xl bg-white text-[#2B2D42] border border-slate-200 font-mono text-xs font-black shadow-xs">
                        {gloss}
                      </span>
                    </React.Fragment>
                  ))}
                </div>
              )}

              {/* Sentence quote box */}
              <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/60 shadow-sm min-h-[90px] flex flex-col justify-center">
                <span className="text-[10px] uppercase font-black text-[#6E7387] mb-1 tracking-wider">
                  Natural English Translation
                </span>
                <h2 className="text-xl sm:text-2xl font-black text-[#2B2D42] leading-snug">
                  "{translatedSentence}"
                </h2>
              </div>
            </div>

            {/* Voice player preview with Waveform and Emotion Tuning */}
            <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/60 space-y-3">
              <div className="flex items-center justify-between text-xs font-bold text-[#6E7387]">
                <span>Voice Output ({speech.voiceCount > 0 ? `${speech.voiceCount} voices ready` : selectedVoice})</span>
                <span className="text-[#FF8A8A] font-extrabold flex items-center gap-1">
                  <span>{EMOTION_PRESETS[currentEmotion].emoji}</span>
                  <span>Pitch {EMOTION_PRESETS[currentEmotion].pitch}x</span>
                </span>
              </div>

              {/* Animated Waveform Bars */}
              <div className="flex items-center justify-center gap-1.5 py-2 text-[#7C9CFF]">
                {[6, 12, 22, 30, 16, 32, 26, 12, 18, 28, 14, 8].map((h, i) => (
                  <span
                    key={i}
                    className={`w-1.5 rounded-full transition-all duration-200 ${
                      speech.isSpeaking ? 'bg-[#7C9CFF] animate-pulse' : 'bg-slate-300'
                    }`}
                    style={{ height: speech.isSpeaking ? `${h * 1.3}px` : '10px' }}
                  ></span>
                ))}
              </div>

              {/* Speak Action Button */}
              <button
                type="button"
                onClick={handleSpeak}
                className="clay-button w-full py-3 text-xs font-black flex items-center justify-center gap-2 clay-focus shadow-clay-raised-sm"
              >
                <Volume2 className="w-4 h-4" />
                <span>{speech.isSpeaking ? 'Speaking...' : 'Speak Translation'}</span>
              </button>
            </div>

            {/* Action Buttons: Copy and Save */}
            <div className="flex gap-3">
              <button
                type="button"
                onClick={handleCopy}
                className="clay-button clay-button-white flex-1 py-3 text-xs font-black flex items-center justify-center gap-2 clay-focus"
              >
                {copied ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied!' : 'Copy'}</span>
              </button>

              <button
                type="button"
                onClick={handleSave}
                className="clay-button clay-button-white flex-1 py-3 text-xs font-black flex items-center justify-center gap-2 clay-focus"
              >
                <Bookmark className="w-4 h-4 text-[#7C9CFF]" />
                <span>Save Note</span>
              </button>
            </div>
          </div>

          {/* Transcript History Card */}
          <div className="clay-card p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-black uppercase text-[#6E7387] tracking-wider">
                Transcript History
              </h3>
              <span className="text-[10px] font-bold text-[#7C9CFF]">Live Session</span>
            </div>

            <div className="space-y-2.5 text-xs">
              {transcripts.map((item) => (
                <div
                  key={item.id}
                  className="p-3 rounded-2xl bg-white/60 border border-slate-200/50 flex items-start gap-2.5 shadow-sm"
                >
                  <span className="text-[10px] text-[#6E7387] font-bold shrink-0 mt-0.5">
                    {item.time}
                  </span>
                  <div>
                    <strong className="text-[#2B2D42]">You:</strong>{' '}
                    <span className="text-[#6E7387] italic">"{item.text}"</span>
                  </div>
                </div>
              ))}
            </div>

            <div className="pt-2 text-center">
              <a
                href="/history"
                className="text-xs font-black text-[#7C9CFF] hover:underline inline-flex items-center gap-1"
              >
                <span>View Full Transcript</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
