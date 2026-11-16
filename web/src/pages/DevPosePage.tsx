import React, { useState, useEffect } from 'react';
import { Header } from '../components/Header';
import { Activity, Cpu, Box, Bot, CheckCircle2 } from 'lucide-react';
import { useLocaleStore } from '../store/useLocaleStore';

export const DevPosePage: React.FC = () => {
  const { t } = useLocaleStore();
  const [modelStatus, setModelStatus] = useState<'idle' | 'ready' | 'running'>('ready');
  const [landmarksCount] = useState(75);
  const [fps] = useState(30);

  useEffect(() => {
    document.title = `${t('dev.title')} — Ishara`;
  }, [t]);

  return (
    <div className="space-y-6">
      <Header
        title={t('dev.title')}
        subtitle={t('dev.inspectorSubtitle')}
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status / Hardware Telemetry Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="clay-card p-6 space-y-4">
            <h3 className="text-xs font-black uppercase text-[#6E7387] tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#7C9CFF]" />
              <span>{t('dev.visionEngine')}</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-white/60 border border-slate-200/50">
                <span className="font-bold text-[#6E7387]">{t('dev.modelRuntime')}</span>
                <span className="font-black text-[#2B2D42]">{t('dev.mediaPipeTasksWeb') || 'MediaPipe Tasks Web'}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/60 border border-slate-200/50">
                <span className="font-bold text-[#6E7387]">{t('dev.tensorShape')}</span>
                <span className="font-black text-[#7C9CFF] font-mono">{t('dev.tensorShapeValue') || '[1, 64, 225] float32'}</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/60 border border-slate-200/50">
                <span className="font-bold text-[#6E7387]">{t('dev.activeLandmarks')}</span>
                <span className="font-black text-emerald-600 font-mono">
                  {landmarksCount} {t('dev.poseHandsCount') || '(33 Pose + 42 Hands)'}
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/60 border border-slate-200/50">
                <span className="font-bold text-[#6E7387]">{t('dev.targetFps')}</span>
                <span className="font-black text-[#2B2D42]">{fps} FPS</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setModelStatus(modelStatus === 'running' ? 'ready' : 'running')}
                className={`clay-button w-full py-2.5 text-xs font-black flex items-center justify-center gap-2 ${
                  modelStatus === 'running' ? 'clay-button-coral' : ''
                }`}
              >
                <Activity className="w-4 h-4" />
                <span>{modelStatus === 'running' ? t('dev.stopStream') : t('dev.runStream')}</span>
              </button>
            </div>
          </div>

          <div className="clay-card p-6 space-y-3">
            <h3 className="text-xs font-black uppercase text-[#6E7387] tracking-wider flex items-center gap-2">
              <Box className="w-4 h-4 text-[#D4A5FF]" />
              <span>{t('dev.avatarRig')}</span>
            </h3>
            <p className="text-xs font-semibold text-[#6E7387]">
              {t('dev.rigSubtitle')}
            </p>
            <div className="p-3 rounded-xl bg-white/60 text-xs font-mono text-[#2B2D42] space-y-1">
              <div className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500" />
                <span>{t('dev.restPoseVerified')}</span>
              </div>
              <div>{t('dev.rootTranslationLocked')}</div>
              <div>{t('dev.fingerBonesCount')}</div>
            </div>
          </div>
        </div>

        {/* Pose Canvas / Visualizer Card */}
        <div className="lg:col-span-8 clay-card p-6 flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
              <span className="text-xs font-black uppercase text-[#6E7387]">
                {t('dev.meshVisualizer')}
              </span>
              <span className="px-3 py-1 rounded-full bg-[#E5F8E2] text-xs font-extrabold text-[#65B75D]">
                {t('dev.pipelineSync')}
              </span>
            </div>

            {/* Visualizer wireframe mockup */}
            <div className="w-full aspect-video mt-4 rounded-[22px] bg-[#1E202E] relative flex items-center justify-center overflow-hidden border border-slate-700/50">
              {/* Synthetic grid & landmarks */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#7C9CFF_1px,transparent_1px)] [background-size:16px_16px]"></div>

              <div className="relative text-center text-white space-y-3">
                <div className="w-24 h-24 rounded-full border-2 border-[#7C9CFF] mx-auto flex items-center justify-center shadow-[0_0_15px_rgba(124,156,255,0.4)]">
                  <div className="w-16 h-16 rounded-full border border-dashed border-[#FF8A8A] flex items-center justify-center">
                    <Bot className="w-8 h-8 text-[#FF8A8A]" />
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-white/90">{t('dev.pointCloudReady')}</p>
                  <p className="text-[10px] text-white/60 font-mono mt-0.5">
                    {t('dev.landmarkOrder')}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#6E7387] font-semibold border-t border-slate-200/60">
            <span>{t('dev.normalizedNote')}</span>
            <span className="font-mono text-[#7C9CFF]">{t('dev.contractLabel')}</span>
          </div>
        </div>
      </div>
    </div>
  );
};
