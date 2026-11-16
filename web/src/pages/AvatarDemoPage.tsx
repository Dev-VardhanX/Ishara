import React, { useState, useRef } from 'react';
import {
  Play,
  Pause,
  RotateCcw,
  ChevronRight,
  ChevronLeft,
  Sparkles,
  Layers,
  Smile,
  Palette,
  Eye,
} from 'lucide-react';
import { AvatarExpression, SkinToneId, SKIN_TONES } from '../avatar/types';
import { SignAvatar } from '../avatar/SignAvatar';
import type { SignAvatarHandle } from '../avatar/SignAvatarCanvas';

export const AvatarDemoPage: React.FC = () => {
  const avatarRef = useRef<SignAvatarHandle>(null);
  const [signsInput, setSignsInput] = useState<string>('HELLO THANK_YOU WATER HELP');
  const [speed, setSpeed] = useState<0.5 | 1 | 1.5>(1);
  const [playing, setPlaying] = useState<boolean>(true);
  const [expression, setExpression] = useState<AvatarExpression>('happy');
  const [skinTone, setSkinTone] = useState<SkinToneId>('warm-peach');
  const [mirrored, setMirrored] = useState<boolean>(false);
  const [stepByStep, setStepByStep] = useState<boolean>(false);
  const [activeSign, setActiveSign] = useState<string>('');

  const parsedSigns = signsInput
    .split(/\s+/)
    .map((s) => s.trim().toUpperCase())
    .filter(Boolean);

  return (
    <div className="max-w-6xl mx-auto p-6 space-y-6 select-none font-sans">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-4 pb-4 border-b border-slate-200">
        <div>
          <h1 className="text-2xl font-black text-[#2B2D42] flex items-center gap-2">
            <Sparkles className="w-6 h-6 text-[#7C9CFF]" />
            <span>3D Sign Avatar Playground & Interactive Demo</span>
          </h1>
          <p className="text-xs font-semibold text-[#6E7387] mt-1">
            Offline Three.js procedural clay rig with bone kinematics, facial expressions, and sign chaining.
          </p>
        </div>

        {/* Quick presets */}
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => setSignsInput('HELLO THANK_YOU WATER HELP')}
            className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-black text-[#2B2D42] hover:bg-slate-50"
          >
            Basic Signs
          </button>
          <button
            type="button"
            onClick={() => setSignsInput('HELLO GOOD_MORNING PLEASE WATER FOOD')}
            className="px-3 py-1.5 rounded-full bg-white border border-slate-200 text-xs font-black text-[#2B2D42] hover:bg-slate-50"
          >
            Essentials
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Main 3D Avatar Viewport */}
        <div className="lg:col-span-7 space-y-4">
          <div className="clay-card p-6 bg-gradient-to-b from-[#C4B5FD]/20 via-[#E0E7FF]/30 to-[#E9EEF7] border border-white/60 relative overflow-hidden flex flex-col justify-between min-h-[460px]">
            {/* Viewport Top Status */}
            <div className="flex items-center justify-between z-10">
              <span className="px-3 py-1 rounded-full bg-white/80 backdrop-blur text-xs font-black text-[#2B2D42] shadow-sm">
                Active Sign: <span className="text-[#7C9CFF]">{activeSign || 'REST'}</span>
              </span>

              <span className="px-3 py-1 rounded-full bg-white/80 backdrop-blur text-xs font-bold text-[#6E7387] shadow-sm">
                {speed}x | {stepByStep ? 'Step-by-Step' : 'Continuous'}
              </span>
            </div>

            {/* Canvas Stage */}
            <div className="relative w-full h-[360px] my-auto">
              <SignAvatar
                ref={avatarRef}
                signs={parsedSigns}
                speed={speed}
                playing={playing}
                expression={expression}
                skinTone={skinTone}
                mirrored={mirrored}
                stepByStep={stepByStep}
                onSignStarted={(sign) => setActiveSign(sign)}
                onSequenceFinished={() => setActiveSign('')}
              />
            </div>

            {/* Playback Controls Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-200/50 z-10 flex-wrap gap-2">
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setPlaying(!playing)}
                  className="clay-button p-2.5 rounded-full text-white shadow-clay-raised-sm"
                  title={playing ? 'Pause' : 'Play'}
                >
                  {playing ? <Pause className="w-4 h-4 fill-white" /> : <Play className="w-4 h-4 fill-white" />}
                </button>

                <button
                  type="button"
                  onClick={() => avatarRef.current?.restart()}
                  className="p-2.5 rounded-full bg-white/80 hover:bg-white text-[#2B2D42] shadow-sm border border-slate-200"
                  title="Restart"
                >
                  <RotateCcw className="w-4 h-4" />
                </button>
              </div>

              {stepByStep && (
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => avatarRef.current?.stepPrev()}
                    className="p-2 rounded-xl bg-white/80 hover:bg-white text-[#2B2D42] shadow-sm text-xs font-black flex items-center gap-1"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span>Prev</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => avatarRef.current?.stepNext()}
                    className="p-2 rounded-xl bg-white/80 hover:bg-white text-[#2B2D42] shadow-sm text-xs font-black flex items-center gap-1"
                  >
                    <span>Next</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Controls & Parameters Config */}
        <div className="lg:col-span-5 space-y-4">
          {/* Sign Sequence Input */}
          <div className="clay-card p-5 bg-white/80 border border-slate-200/80 space-y-2">
            <h3 className="text-xs font-black uppercase text-[#6E7387] tracking-wider flex items-center gap-2">
              <Layers className="w-4 h-4 text-[#7C9CFF]" />
              <span>Sign Sequence (Space Separated)</span>
            </h3>
            <textarea
              value={signsInput}
              onChange={(e) => setSignsInput(e.target.value)}
              rows={3}
              className="w-full p-3 rounded-xl bg-slate-50 border border-slate-200 text-xs font-mono font-bold text-[#2B2D42] focus:outline-none focus:ring-2 focus:ring-[#7C9CFF]"
              placeholder="e.g. HELLO THANK_YOU PLEASE WATER"
            />
            <div className="flex flex-wrap gap-1.5 pt-1">
              {parsedSigns.map((s, idx) => (
                <span
                  key={idx}
                  className={`px-2 py-0.5 rounded-lg text-[10px] font-black uppercase font-mono ${
                    activeSign === s
                      ? 'bg-[#7C9CFF] text-white shadow-sm'
                      : 'bg-slate-100 text-[#6E7387]'
                  }`}
                >
                  {s}
                </span>
              ))}
            </div>
          </div>

          {/* Rig Appearance & Kinematics Options */}
          <div className="clay-card p-5 bg-white/80 border border-slate-200/80 space-y-4">
            <h3 className="text-xs font-black uppercase text-[#6E7387] tracking-wider flex items-center gap-2">
              <Palette className="w-4 h-4 text-[#FFB59E]" />
              <span>Rig Controls & Skin Tone</span>
            </h3>

            {/* Skin Tone */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-[#2B2D42]">Skin Tone</label>
              <div className="flex items-center gap-2.5">
                {(Object.keys(SKIN_TONES) as SkinToneId[]).map((t) => (
                  <button
                    key={t}
                    type="button"
                    onClick={() => setSkinTone(t)}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-black capitalize transition-all ${
                      skinTone === t
                        ? 'border-[#7C9CFF] bg-[#7C9CFF]/10 text-[#7C9CFF] shadow-sm'
                        : 'border-slate-200 text-[#6E7387] hover:bg-slate-50'
                    }`}
                  >
                    <span
                      className="w-3.5 h-3.5 rounded-full border border-black/10 shrink-0"
                      style={{ backgroundColor: SKIN_TONES[t] }}
                    />
                    <span>{t.replace('-', ' ')}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Expressions */}
            <div className="space-y-1.5">
              <label className="block text-[11px] font-black text-[#2B2D42]">Facial Expression</label>
              <div className="grid grid-cols-2 gap-2">
                {(['neutral', 'happy', 'questioning', 'sad'] as AvatarExpression[]).map((exp) => (
                  <button
                    key={exp}
                    type="button"
                    onClick={() => setExpression(exp)}
                    className={`p-2 rounded-xl border text-xs font-black capitalize transition-all text-center ${
                      expression === exp
                        ? 'bg-[#7C9CFF] text-white border-transparent shadow-sm'
                        : 'bg-white border-slate-200 text-[#2B2D42] hover:bg-slate-50'
                    }`}
                  >
                    {exp}
                  </button>
                ))}
              </div>
            </div>

            {/* Speed & Toggles */}
            <div className="space-y-3 pt-2 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-[#2B2D42]">Playback Speed</span>
                <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-full text-xs">
                  {[0.5, 1, 1.5].map((s) => (
                    <button
                      key={s}
                      type="button"
                      onClick={() => setSpeed(s as any)}
                      className={`px-3 py-0.5 rounded-full font-black ${
                        speed === s ? 'bg-[#7C9CFF] text-white shadow-xs' : 'text-[#6E7387]'
                      }`}
                    >
                      {s}x
                    </button>
                  ))}
                </div>
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-[#2B2D42]">
                <span>Mirror Avatar</span>
                <input
                  type="checkbox"
                  checked={mirrored}
                  onChange={(e) => setMirrored(e.target.checked)}
                  className="rounded text-[#7C9CFF]"
                />
              </div>

              <div className="flex items-center justify-between text-xs font-bold text-[#2B2D42]">
                <span>Step-by-Step Mode (Pause after each sign)</span>
                <input
                  type="checkbox"
                  checked={stepByStep}
                  onChange={(e) => setStepByStep(e.target.checked)}
                  className="rounded text-[#7C9CFF]"
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AvatarDemoPage;
