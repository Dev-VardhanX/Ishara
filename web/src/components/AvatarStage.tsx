import React from 'react';
import { Sparkles, HandMetal } from 'lucide-react';
import { SignIcon } from './SignIcon';
import { SIGN_VOCABULARY } from '../ml';
import { useLocaleStore } from '../store/useLocaleStore';

interface AvatarStageProps {
  currentGloss: string | null;
  speed: number;
  playing: boolean;
}

export const AvatarStage: React.FC<AvatarStageProps> = ({
  currentGloss,
  speed,
  playing,
}) => {
  const { t } = useLocaleStore();

  const normalizedGloss = currentGloss
    ? currentGloss.trim().toUpperCase().replace(/^(ISL_|ASL_)/, '')
    : null;

  const signDef = normalizedGloss ? SIGN_VOCABULARY[normalizedGloss] : null;
  const localizedWord = normalizedGloss ? t(`signs.${normalizedGloss}.word`) : null;
  const localizedDesc = normalizedGloss ? t(`signs.${normalizedGloss}.desc`) : null;

  return (
    <div className="clay-card p-6 relative overflow-hidden bg-gradient-to-b from-[#C4B5FD]/20 via-[#E0E7FF]/30 to-[#E9EEF7] min-h-[460px] flex flex-col justify-between select-none">
      {/* Viewport Header */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur border border-slate-200/60 text-xs font-black text-[#2B2D42] shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#7C9CFF]" />
          <span>{t('signToVoice.avatarStageTitle') !== 'signToVoice.avatarStageTitle' ? t('signToVoice.avatarStageTitle') : 'Stage'}</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1"></span>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-white/80 backdrop-blur text-[11px] font-bold text-[#6E7387] border border-slate-200/60 shadow-sm">
            {playing ? `${speed}x` : t('signToVoice.cameraPaused')}
          </div>
        </div>
      </div>

      {/* Main Sign Visual: Clay Card with Icon and Gesture Description */}
      <div className="flex flex-col items-center justify-center my-auto py-6 relative z-10 space-y-5">
        {/* Soft radial glow */}
        <div className="absolute w-72 h-72 rounded-full bg-gradient-to-tr from-[#7C9CFF]/20 via-[#D4A5FF]/20 to-[#FFB59E]/20 blur-3xl pointer-events-none"></div>

        {/* Tactile Clay Sign Card */}
        <div className="w-40 h-40 rounded-[28px] bg-white/90 backdrop-blur flex items-center justify-center shadow-clay-raised border-2 border-white/80 transition-all duration-300">
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

        {/* Current Gloss ID & Word */}
        <div className="text-center space-y-1.5 max-w-md px-4">
          <p className="text-[10px] font-black uppercase text-[#6E7387] tracking-widest">
            {normalizedGloss ? t('signToVoice.activeGlosses') : 'NEUTRAL_REST'}
          </p>
          <div className="inline-block px-5 py-2 rounded-2xl bg-white/90 backdrop-blur shadow-clay-raised-sm border border-slate-100">
            <h2 className="text-2xl sm:text-3xl font-black text-[#2B2D42] tracking-tight">
              {localizedWord && localizedWord !== `signs.${normalizedGloss}.word` ? (
                <div className="flex items-center gap-2 justify-center">
                  <span>{localizedWord}</span>
                  <span className="text-xs font-mono text-[#6E7387] uppercase">({normalizedGloss})</span>
                </div>
              ) : (
                normalizedGloss || 'NEUTRAL_REST'
              )}
            </h2>
          </div>

          {/* Gesture Kinematics & Execution Guide */}
          <p className="text-xs font-semibold text-[#6E7387] pt-1">
            {localizedDesc && localizedDesc !== `signs.${normalizedGloss}.desc`
              ? localizedDesc
              : signDef?.description || ''}
          </p>
        </div>
      </div>

      {/* Footer Info */}
      <div className="z-10 flex items-center justify-between text-[11px] font-semibold text-[#6E7387] border-t border-slate-200/50 pt-3">
        <span>{t('signToVoice.holdStability')}</span>
        <span className="font-mono text-[10px] text-[#7C9CFF]">
          {signDef?.twoHanded ? '2H' : '1H'}
        </span>
      </div>
    </div>
  );
};
