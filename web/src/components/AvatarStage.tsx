import React, { useState, useRef, useEffect } from 'react';
import {
  Sparkles,
  HandMetal,
  Play,
  Pause,
  RotateCcw,
  Palette,
  FlipHorizontal,
  StepForward,
  AlertTriangle,
} from 'lucide-react';
import { SignIcon } from './SignIcon';
import { SIGN_VOCABULARY } from '../ml';
import { useLocaleStore } from '../store/useLocaleStore';
import { SignAvatar } from '../avatar/SignAvatar';
import type { SignAvatarHandle } from '../avatar/SignAvatarCanvas';
import { SkinToneId, SKIN_TONES } from '../avatar/types';
import { loadSignClip } from '../avatar/clipStore';

interface AvatarStageProps {
  currentGloss?: string | null;
  glosses?: string[];
  speed?: number;
  playing?: boolean;
  onSpeedChange?: (speed: number) => void;
  onTogglePlay?: () => void;
  onReplay?: () => void;
}

export const AvatarStage: React.FC<AvatarStageProps> = ({
  currentGloss,
  glosses = [],
  speed = 1,
  playing = true,
  onSpeedChange,
  onTogglePlay,
  onReplay,
}) => {
  const { t } = useLocaleStore();
  const avatarRef = useRef<SignAvatarHandle>(null);

  // WebGL fallback state
  const [webglFailed, setWebglFailed] = useState<boolean>(false);

  // Avatar preferences
  const [skinTone, setSkinTone] = useState<SkinToneId>('warm-peach');
  const [mirrored, setMirrored] = useState<boolean>(false);
  const [showPalette, setShowPalette] = useState<boolean>(false);

  // Reduced motion / step-by-step
  const [stepByStep, setStepByStep] = useState<boolean>(() => {
    if (typeof window !== 'undefined' && window.matchMedia) {
      return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    }
    return false;
  });

  // Track active gloss & verification status
  const [activeSign, setActiveSign] = useState<string | null>(null);
  const [isVerified, setIsVerified] = useState<boolean>(true);

  // Normalize sign list from glosses prop or currentGloss fallback
  const effectiveGlosses: string[] = React.useMemo(() => {
    if (glosses && glosses.length > 0) {
      return glosses;
    }
    return currentGloss ? [currentGloss] : [];
  }, [glosses, currentGloss]);

  const displayedGloss = activeSign || currentGloss;
  const normalizedGloss = displayedGloss
    ? displayedGloss.trim().toUpperCase().replace(/^(ISL_|ASL_)/, '')
    : null;

  // Check clip verification status whenever active sign changes
  useEffect(() => {
    if (!normalizedGloss) {
      setIsVerified(true);
      return;
    }
    let isCancelled = false;
    loadSignClip(normalizedGloss).then((clip) => {
      if (!isCancelled) {
        setIsVerified(clip ? clip.verified : true); // Built-in / missing handled separately
      }
    });
    return () => {
      isCancelled = true;
    };
  }, [normalizedGloss]);

  const signDef = normalizedGloss ? SIGN_VOCABULARY[normalizedGloss] : null;
  const localizedWord = normalizedGloss ? t(`signs.${normalizedGloss}.word`) : null;
  const localizedDesc = normalizedGloss ? t(`signs.${normalizedGloss}.desc`) : null;

  const validSpeed = (speed === 0.5 || speed === 1.5 ? speed : 1.0) as 0.5 | 1 | 1.5;

  return (
    <div className="clay-card p-4 sm:p-6 relative overflow-hidden bg-gradient-to-b from-[#C4B5FD]/20 via-[#E0E7FF]/30 to-[#E9EEF7] min-h-[460px] flex flex-col justify-between select-none">
      {/* Viewport Top Bar */}
      <div className="flex items-center justify-between z-10 flex-wrap gap-2">
        <div className="flex items-center gap-2">
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur border border-slate-200/60 text-xs font-black text-[#2B2D42] shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#7C9CFF]" />
            <span>3D Sign Avatar</span>
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-0.5" />
          </div>

          {/* Unverified Badge if clip is not verified */}
          {!isVerified && (
            <div className="flex items-center gap-1 px-2.5 py-1 rounded-full bg-amber-100 border border-amber-300 text-amber-900 text-[10px] font-black uppercase shadow-xs animate-fade-in">
              <AlertTriangle className="w-3 h-3 text-amber-600" />
              <span>Not verified yet</span>
            </div>
          )}
        </div>

        {/* Viewport Action Controls */}
        <div className="flex items-center gap-1.5">
          {/* Skin Tone Selector */}
          <div className="relative">
            <button
              type="button"
              onClick={() => setShowPalette(!showPalette)}
              className="p-1.5 rounded-full bg-white/80 hover:bg-white border border-slate-200/60 text-[#6E7387] shadow-sm"
              title="Change Skin Tone"
              aria-label="Change Skin Tone"
            >
              <Palette className="w-3.5 h-3.5" />
            </button>

            {showPalette && (
              <div className="absolute right-0 mt-2 p-2 rounded-2xl bg-white/95 backdrop-blur shadow-clay-raised border border-slate-200 z-30 flex gap-1.5">
                {(Object.keys(SKIN_TONES) as SkinToneId[]).map((st) => (
                  <button
                    key={st}
                    type="button"
                    onClick={() => {
                      setSkinTone(st);
                      setShowPalette(false);
                    }}
                    className={`w-6 h-6 rounded-full border-2 transition-transform ${
                      skinTone === st ? 'scale-110 border-[#7C9CFF]' : 'border-white hover:scale-105'
                    }`}
                    style={{ backgroundColor: SKIN_TONES[st] }}
                    title={st.replace('-', ' ')}
                  />
                ))}
              </div>
            )}
          </div>

          {/* Mirror Flip Toggle */}
          <button
            type="button"
            onClick={() => setMirrored(!mirrored)}
            className={`p-1.5 rounded-full border shadow-sm transition-colors ${
              mirrored
                ? 'bg-[#7C9CFF] text-white border-transparent'
                : 'bg-white/80 hover:bg-white text-[#6E7387] border-slate-200/60'
            }`}
            title="Mirror Avatar View"
            aria-label="Mirror Avatar View"
          >
            <FlipHorizontal className="w-3.5 h-3.5" />
          </button>

          {/* Step-by-Step Toggle (Reduced Motion Friendly) */}
          <button
            type="button"
            onClick={() => setStepByStep(!stepByStep)}
            className={`px-2.5 py-1 rounded-full text-[11px] font-bold border shadow-sm transition-colors flex items-center gap-1 ${
              stepByStep
                ? 'bg-[#D4A5FF] text-white border-transparent'
                : 'bg-white/80 hover:bg-white text-[#6E7387] border-slate-200/60'
            }`}
            title="Step-by-Step Playback"
          >
            <StepForward className="w-3 h-3" />
            <span>Step</span>
          </button>
        </div>
      </div>

      {/* Main Center Stage: 3D SignAvatar Canvas or Fallback Clay Icon Card */}
      <div className="relative my-auto py-2 flex items-center justify-center min-h-[300px] w-full">
        {!webglFailed ? (
          <div className="w-full h-[320px] sm:h-[350px] relative">
            <SignAvatar
              ref={avatarRef}
              signs={effectiveGlosses}
              speed={validSpeed}
              playing={playing}
              skinTone={skinTone}
              mirrored={mirrored}
              stepByStep={stepByStep}
              onSignStarted={(sign) => setActiveSign(sign)}
              onSequenceFinished={() => setActiveSign(null)}
              onWebGLFallback={() => setWebglFailed(true)}
            />
          </div>
        ) : (
          /* Robust WebGL Fallback: Tactile Clay Sign Card with Icon & Description */
          <div className="flex flex-col items-center justify-center space-y-4 animate-fade-in">
            <div className="w-36 h-36 rounded-[28px] bg-white/90 backdrop-blur flex items-center justify-center shadow-clay-raised border-2 border-white/80">
              {normalizedGloss ? (
                <div className="w-20 h-20 rounded-2xl bg-[#E9EEF7] flex items-center justify-center text-[#7C9CFF] shadow-inner">
                  <SignIcon gloss={normalizedGloss} className="w-12 h-12" />
                </div>
              ) : (
                <div className="w-20 h-20 rounded-2xl bg-[#E9EEF7] flex items-center justify-center text-[#6E7387] shadow-inner">
                  <HandMetal className="w-12 h-12" />
                </div>
              )}
            </div>

            <div className="text-center space-y-1 max-w-md px-4">
              <h3 className="text-xl font-black text-[#2B2D42]">
                {localizedWord && localizedWord !== `signs.${normalizedGloss}.word` ? (
                  <span>
                    {localizedWord} <span className="text-xs text-[#6E7387]">({normalizedGloss})</span>
                  </span>
                ) : (
                  normalizedGloss || 'REST'
                )}
              </h3>
              <p className="text-xs font-semibold text-[#6E7387]">
                {localizedDesc && localizedDesc !== `signs.${normalizedGloss}.desc`
                  ? localizedDesc
                  : signDef?.description || ''}
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Viewport Bottom Floating Status & Controls */}
      <div className="z-10 flex items-center justify-between border-t border-slate-200/50 pt-3 flex-wrap gap-2 text-xs">
        {/* Active Gloss Badge */}
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-[#6E7387] tracking-wider">
            {normalizedGloss ? t('signToVoice.activeGlosses') : 'NEUTRAL_REST'}
          </span>
          <span className="px-2.5 py-0.5 rounded-lg bg-white/90 font-mono font-black text-[#2B2D42] text-xs shadow-xs border border-slate-100">
            {normalizedGloss || 'REST'}
          </span>
        </div>

        {/* Playback Mini Controls */}
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={() => {
              avatarRef.current?.restart();
              onReplay?.();
            }}
            className="p-1.5 rounded-full bg-white/80 hover:bg-white text-[#2B2D42] border border-slate-200/60 shadow-sm"
            title="Replay Sequence"
            aria-label="Replay Sequence"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            type="button"
            onClick={onTogglePlay}
            className="px-2.5 py-1 rounded-full bg-white/80 hover:bg-white text-[#2B2D42] border border-slate-200/60 font-black text-xs shadow-sm flex items-center gap-1"
          >
            {playing ? <Pause className="w-3 h-3 fill-current" /> : <Play className="w-3 h-3 fill-current" />}
            <span>{playing ? 'Pause' : 'Play'}</span>
          </button>

          {/* Speed Pills */}
          <div className="flex items-center p-0.5 bg-white/80 rounded-full border border-slate-200/60 shadow-sm">
            {[0.5, 1, 1.5].map((s) => (
              <button
                key={s}
                type="button"
                onClick={() => onSpeedChange?.(s)}
                className={`px-2 py-0.5 rounded-full text-[10px] font-black transition-all ${
                  speed === s
                    ? 'bg-[#7C9CFF] text-white shadow-xs'
                    : 'text-[#6E7387] hover:text-[#2B2D42]'
                }`}
              >
                {s}x
              </button>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};
