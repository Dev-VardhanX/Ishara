import React, { useEffect, useState } from 'react';
import { Sparkles, Hand, Play, Pause } from 'lucide-react';

interface AvatarStageProps {
  currentGloss: string | null;
  speed: number;
  playing: boolean;
}

// Emoji gesture mapping for friendly visual representation
const GLOSS_EMOJI_MAP: Record<string, string> = {
  HELLO: '👋',
  THANK_YOU: '🙏',
  YES: '👍',
  NO: '🙅',
  PLEASE: '🤲',
  SORRY: '🙇',
  GOOD_MORNING: '🌅',
  HELP: '🆘',
  HOW_ARE_YOU: '🤝',
  NAME: '🏷️',
  WELCOME: '🤗',
  FRIEND: '🧑‍🤝‍🧑',
  LOVE: '❤️',
  FAMILY: '👨‍👩‍👧',
  HOME: '🏡',
  FOOD: '🍲',
  WATER: '💧',
  WHERE: '❓',
  DOCTOR: '🩺',
  STOP: '🛑',
  TODAY: '📅',
};

export const AvatarStage: React.FC<AvatarStageProps> = ({
  currentGloss,
  speed,
  playing,
}) => {
  const [bounce, setBounce] = useState(false);

  // Trigger bounce animation whenever currentGloss changes
  useEffect(() => {
    if (currentGloss) {
      setBounce(true);
      const timer = setTimeout(() => setBounce(false), 500);
      return () => clearTimeout(timer);
    }
  }, [currentGloss]);

  const activeEmoji = currentGloss ? GLOSS_EMOJI_MAP[currentGloss] || '🤟' : '🙋‍♀️';

  return (
    <div className="clay-card p-6 relative overflow-hidden bg-gradient-to-b from-[#C4B5FD]/30 via-[#E0E7FF]/40 to-[#E9EEF7] min-h-[460px] flex flex-col justify-between select-none">
      {/* 
        Replace the body with the Three.js VRM viewer later.
        This viewport will host the 3D VRM cartoon avatar rendering canvas,
        bone transforms for finger joints, and glTF animation clip sequencer.
      */}

      {/* Viewport Header Telemetry */}
      <div className="flex items-center justify-between z-10">
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-white/80 backdrop-blur border border-slate-200/60 text-xs font-black text-[#2B2D42] shadow-sm">
          <Sparkles className="w-3.5 h-3.5 text-[#7C9CFF]" />
          <span>3D Avatar Stage</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse ml-1"></span>
        </div>

        <div className="flex items-center gap-2">
          <div className="px-3 py-1 rounded-full bg-white/80 backdrop-blur text-[11px] font-bold text-[#6E7387] border border-slate-200/60 shadow-sm">
            {playing ? `Signing at ${speed}x` : 'Paused'}
          </div>
        </div>
      </div>

      {/* Main Avatar Stage Visual with Emoji Hand & Gloss Display */}
      <div className="flex flex-col items-center justify-center my-auto py-8 relative">
        {/* Soft radial glow */}
        <div className="absolute w-64 h-64 rounded-full bg-gradient-to-tr from-[#7C9CFF]/20 via-[#D4A5FF]/20 to-[#FFB59E]/20 blur-2xl pointer-events-none"></div>

        {/* Big Emoji Hand Card with Bounce Animation */}
        <div
          className={`w-44 h-44 rounded-full bg-gradient-to-tr from-[#7C9CFF]/30 via-[#D4A5FF]/30 to-[#FFB59E]/30 flex items-center justify-center text-7xl shadow-clay-raised border-4 border-white/80 transition-transform duration-300 ${
            bounce ? 'scale-110 -translate-y-2' : 'scale-100'
          }`}
        >
          <span className={bounce ? 'animate-bounce' : ''}>
            {activeEmoji}
          </span>
        </div>

        {/* Current Gloss in Large Text */}
        <div className="mt-6 text-center z-10 space-y-1">
          <p className="text-[10px] font-black uppercase text-[#6E7387] tracking-widest">
            Target Gloss ID
          </p>
          <div className="inline-block px-5 py-2 rounded-2xl bg-white/90 backdrop-blur shadow-clay-raised-sm border border-slate-100">
            <h2 className="text-2xl sm:text-3xl font-black text-[#2B2D42] tracking-tight">
              {currentGloss ? currentGloss : '(REST POSE)'}
            </h2>
          </div>
        </div>
      </div>
    </div>
  );
};
