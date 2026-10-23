import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { AvatarStage } from '../components/AvatarStage';
import { useLanguageStore } from '../store/useLanguageStore';
import { parseTextToGlosses, GlossToken } from '../lib/textToGloss';
import { addRecentConversation } from '../data/store';
import { useSpeech } from '../lib/speech';
import {
  Mic,
  MicOff,
  Play,
  Pause,
  RotateCcw,
  SkipBack,
  SkipForward,
  X,
  Sparkles,
  Send,
  AlertCircle,
  CheckCircle2,
  Volume2,
} from 'lucide-react';

export const VoiceToSignPage: React.FC = () => {
  const { language } = useLanguageStore();
  const speech = useSpeech();


  // State
  const defaultSentence = 'Hello, how are you today?';
  const [inputText, setInputText] = useState(defaultSentence);
  const [tokens, setTokens] = useState<GlossToken[]>(() => parseTextToGlosses(defaultSentence));
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [playing, setPlaying] = useState<boolean>(false);

  // Web Speech API state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Playback timer reference
  const timerRef = useRef<number | null>(null);

  // Parse text when submitted
  const handleSignSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const parsed = parseTextToGlosses(inputText.trim());
    setTokens(parsed);
    setCurrentIndex(0);
    setPlaying(true);

    // Save each run to history store
    try {
      addRecentConversation({
        title: `Avatar: "${inputText.trim().slice(0, 24)}${inputText.length > 24 ? '...' : ''}"`,
        mode: `Voice to ${language}`,
        timestamp: 'Just now',
        snippet: inputText.trim(),
        language,
        iconEmoji: '🗣️',
      });
    } catch (err) {
      console.warn('Failed to save to history', err);
    }
  };

  // Playback Engine: steps through glosses based on speed (~1.5s per sign at 1x)
  useEffect(() => {
    if (!playing || tokens.length === 0) {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
        timerRef.current = null;
      }
      return;
    }

    const durationPerSign = Math.round(1500 / speed);

    timerRef.current = window.setTimeout(() => {
      if (currentIndex < tokens.length - 1) {
        setCurrentIndex((prev) => prev + 1);
      } else {
        // Reached end of phrase
        setPlaying(false);
      }
    }, durationPerSign);

    return () => {
      if (timerRef.current) {
        clearTimeout(timerRef.current);
      }
    };
  }, [playing, currentIndex, tokens, speed]);

  // Controls
  const handlePrevious = () => {
    setCurrentIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    setCurrentIndex((prev) => Math.min(tokens.length - 1, prev + 1));
  };

  const handleTogglePlay = () => {
    if (tokens.length === 0) {
      handleSignSubmit();
      return;
    }
    // If at end, loop back to start
    if (currentIndex >= tokens.length - 1 && !playing) {
      setCurrentIndex(0);
    }
    setPlaying(!playing);
  };

  const handleReplay = () => {
    setCurrentIndex(0);
    setPlaying(true);
  };

  const handleClearText = () => {
    setInputText('');
    setTokens([]);
    setCurrentIndex(0);
    setPlaying(false);
  };

  // Web Speech API Integration
  const toggleSpeechRecognition = () => {
    setSpeechError(null);

    const SpeechRecognition =
      (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      setSpeechError('Web Speech API is not supported in this browser. Please type your phrase.');
      return;
    }

    if (isListening) {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
      setIsListening(false);
      return;
    }

    try {
      const recognition = new SpeechRecognition();
      recognition.continuous = false;
      recognition.interimResults = true;
      recognition.lang = language === 'ISL' ? 'en-IN' : 'en-US';

      recognition.onstart = () => {
        setIsListening(true);
      };

      recognition.onresult = (event: any) => {
        const transcript = Array.from(event.results)
          .map((result: any) => result[0].transcript)
          .join('');
        setInputText(transcript);
      };

      recognition.onerror = (event: any) => {
        console.warn('Speech recognition error', event.error);
        if (event.error !== 'no-speech') {
          setSpeechError(`Speech recognition error: ${event.error}`);
        }
        setIsListening(false);
      };

      recognition.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = recognition;
      recognition.start();
    } catch (err: any) {
      setSpeechError(err?.message || 'Could not access microphone.');
      setIsListening(false);
    }
  };

  const currentToken = tokens[currentIndex];
  const currentGloss = currentToken ? currentToken.gloss : null;

  return (
    <div className="space-y-6 select-none">
      {/* Header with ISL / ASL SegmentedControl */}
      <Header
        title="Voice to Sign"
        subtitle="Translate spoken voice or typed text into 3D avatar sign gestures"
      />

      {/* Speech Output Voice Error Banner */}
      {speech.errorMessage && (
        <div className="p-4 rounded-2xl bg-[#FFE8E2] border border-[#FF8A8A]/50 text-[#2B2D42] flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-3">
            <AlertCircle className="w-5 h-5 text-[#FF8A8A] shrink-0" />
            <p className="text-xs font-bold">{speech.errorMessage}</p>
          </div>
          <button
            type="button"
            onClick={speech.clearError}
            className="p-1 text-[#6E7387] hover:text-[#2B2D42] rounded-lg"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      )}


      {/* Main 3D Stage Area */}
      <div className="space-y-4">
        {/* Speed Selector Pill (Floating at top of stage card) */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 border border-slate-200/50 text-xs font-black text-[#2B2D42] shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#7C9CFF]" />
            <span>Mode: {language === 'ISL' ? 'Indian Sign Language (ISL)' : 'American Sign Language (ASL)'}</span>
          </div>

          <div className="flex items-center p-1 bg-white/80 rounded-full border border-slate-200/60 shadow-sm backdrop-blur">
            <span className="text-[10px] font-black uppercase text-[#6E7387] px-2.5">
              Speed:
            </span>
            {[0.5, 1.0, 1.5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => setSpeed(s)}
                className={`px-3 py-1 rounded-full text-xs font-black transition-all clay-focus ${
                  speed === s
                    ? 'bg-[#7C9CFF] text-white shadow-clay-raised-sm'
                    : 'text-[#6E7387] hover:text-[#2B2D42]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>

        {/* AvatarStage Component */}
        <div className="relative">
          <AvatarStage
            currentGloss={currentGloss}
            speed={speed}
            playing={playing}
          />

          {/* Bottom Floating Bar inside stage: Caption Chip & Playback Controls */}
          <div className="absolute bottom-5 left-5 right-5 flex flex-col sm:flex-row items-center justify-between gap-4 z-20 pointer-events-auto">
            {/* Caption Chip "AVATAR SIGNING" with Current Word Highlight */}
            <div className="px-5 py-3 rounded-2xl bg-[#2B2D42]/90 text-white backdrop-blur-md max-w-xl shadow-lg border border-white/20">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                  Avatar Signing
                </span>
                {currentToken && !currentToken.hasSign && (
                  <span className="px-2 py-0.5 rounded-full bg-[#FF8A8A] text-white text-[9px] font-black uppercase">
                    (no sign yet)
                  </span>
                )}
              </div>

              {/* Highlighted text stream */}
              <div className="mt-1 text-sm sm:text-base font-semibold leading-relaxed flex flex-wrap gap-1.5 items-center">
                {tokens.length > 0 ? (
                  tokens.map((token, idx) => {
                    const isCurrent = idx === currentIndex;
                    return (
                      <span
                        key={idx}
                        onClick={() => {
                          setCurrentIndex(idx);
                          setPlaying(false);
                        }}
                        className={`cursor-pointer px-1.5 py-0.5 rounded-lg transition-all ${
                          isCurrent
                            ? 'bg-[#7C9CFF] text-white font-black shadow-sm scale-105 ring-2 ring-white/50'
                            : 'text-white/80 hover:text-white hover:bg-white/10'
                        }`}
                        title={token.gloss || '(no sign yet)'}
                      >
                        {token.originalText}
                      </span>
                    );
                  })
                ) : (
                  <span className="italic text-white/50">Type something to translate...</span>
                )}
              </div>
            </div>

            {/* Playback Controls Pill */}
            <div className="flex items-center gap-1.5 p-2 bg-white/95 backdrop-blur-md rounded-full shadow-clay-raised border border-white">
              <button
                type="button"
                onClick={handlePrevious}
                disabled={currentIndex === 0}
                className="p-2.5 text-[#6E7387] hover:text-[#2B2D42] disabled:opacity-40 rounded-full clay-focus transition-colors"
                title="Previous sign"
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="w-12 h-12 rounded-full bg-[#FF8A8A] hover:bg-[#FF7373] text-white flex items-center justify-center shadow-clay-raised-sm clay-focus transition-transform active:scale-95"
                title={playing ? 'Pause' : 'Play'}
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= tokens.length - 1}
                className="p-2.5 text-[#6E7387] hover:text-[#2B2D42] disabled:opacity-40 rounded-full clay-focus transition-colors"
                title="Next sign"
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleReplay}
                className="p-2.5 text-[#6E7387] hover:text-[#2B2D42] rounded-full clay-focus transition-colors"
                title="Replay from start"
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => speech.speak(inputText, { isUserClick: true, lang: language === 'ISL' ? 'en-IN' : 'en-US' })}
                className="p-2.5 text-[#6E7387] hover:text-[#7C9CFF] rounded-full clay-focus transition-colors"
                title="Speak sentence aloud"
              >
                <Volume2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Input Box Card with Clear, Mic, and Sign This button */}
      <div className="clay-card p-5">
        <form onSubmit={handleSignSubmit} className="flex flex-col sm:flex-row items-center gap-3">
          {/* Text Input with Inset Shadow & Clear Button */}
          <div className="relative flex-1 w-full">
            <input
              type="text"
              value={inputText}
              onChange={(e) => setInputText(e.target.value)}
              placeholder="Type something to translate to sign..."
              className="clay-input w-full pr-10 text-sm font-bold"
            />
            {inputText && (
              <button
                type="button"
                onClick={handleClearText}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E7387] hover:text-[#2B2D42] p-1 rounded-full clay-focus"
                title="Clear input"
              >
                <X className="w-4 h-4" />
              </button>
            )}
          </div>

          <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
            {/* Mic Button with Web Speech API */}
            <button
              type="button"
              onClick={toggleSpeechRecognition}
              className={`p-3.5 rounded-clay transition-all clay-focus flex items-center justify-center ${
                isListening
                  ? 'bg-[#FF8A8A] text-white shadow-clay-pressed animate-pulse ring-2 ring-red-400'
                  : 'bg-[#7C9CFF] text-white shadow-clay-raised hover:brightness-105'
              }`}
              title={isListening ? 'Listening... click to stop' : 'Click to speak'}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Sign This Action Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="clay-button bg-[#2B2D42] text-white px-7 py-3.5 text-sm font-black clay-focus disabled:opacity-50"
            >
              Sign This
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
