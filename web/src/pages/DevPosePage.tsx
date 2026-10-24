import React, { useState } from 'react';
import { Header } from '../components/Header';
import { Activity, Play, RefreshCw, Cpu, Box, Database, Shield } from 'lucide-react';

export const DevPosePage: React.FC = () => {
  const [modelStatus, setModelStatus] = useState<'idle' | 'ready' | 'running'>('ready');
  const [landmarksCount, setLandmarksCount] = useState(75);
  const [fps, setFps] = useState(30);

  return (
    <div className="space-y-6">
      <Header
        title="Developer Pose & Rig Inspector"
        subtitle="Test MediaPipe vision landmarks, tensor pipelines ([1, 64, 225]), and Three.js/VRM clips"
      />

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Status / Hardware Telemetry Card */}
        <div className="lg:col-span-4 space-y-6">
          <div className="clay-card p-6 space-y-4">
            <h3 className="text-xs font-black uppercase text-[#6E7387] tracking-wider flex items-center gap-2">
              <Cpu className="w-4 h-4 text-[#7C9CFF]" />
              <span>Vision & Inference Engine</span>
            </h3>

            <div className="space-y-3 text-xs">
              <div className="flex justify-between p-2.5 rounded-xl bg-white/60 border border-slate-200/50">
                <span className="font-bold text-[#6E7387]">Model Runtime</span>
                <span className="font-black text-[#2B2D42]">MediaPipe Tasks Web</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/60 border border-slate-200/50">
                <span className="font-bold text-[#6E7387]">Tensor Input Shape</span>
                <span className="font-black text-[#7C9CFF] font-mono">[1, 64, 225] float32</span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/60 border border-slate-200/50">
                <span className="font-bold text-[#6E7387]">Active Landmarks</span>
                <span className="font-black text-emerald-600 font-mono">
                  {landmarksCount} (33 Pose + 42 Hands)
                </span>
              </div>
              <div className="flex justify-between p-2.5 rounded-xl bg-white/60 border border-slate-200/50">
                <span className="font-bold text-[#6E7387]">Target Frame Rate</span>
                <span className="font-black text-[#2B2D42]">{fps} FPS</span>
              </div>
            </div>

            <div className="pt-2">
              <button
                type="button"
                onClick={() => setModelStatus(modelStatus === 'running' ? 'ready' : 'running')}
                className={`clay-button w-full py-2.5 text-xs font-black flex items-center justify-center gap-2 ${modelStatus === 'running' ? 'clay-button-coral' : ''
                  }`}
              >
                <Activity className="w-4 h-4" />
                <span>{modelStatus === 'running' ? 'Stop Pose Stream' : 'Run Live Landmark Stream'}</span>
              </button>
            </div>
          </div>

          <div className="clay-card p-6 space-y-3">
            <h3 className="text-xs font-black uppercase text-[#6E7387] tracking-wider flex items-center gap-2">
              <Box className="w-4 h-4 text-[#D4A5FF]" />
              <span>Avatar 3D Rig (Three.js + VRM)</span>
            </h3>
            <p className="text-xs font-semibold text-[#6E7387]">
              Rig format: VRM 1.0 / glTF 2.0 with complete humanoid finger skeleton.
            </p>
            <div className="p-3 rounded-xl bg-white/60 text-xs font-mono text-[#2B2D42] space-y-1">
              <div>Default Rest Pose: ✅ Verified</div>
              <div>Root Translation: Locked [0, 0, 0]</div>
              <div>Finger Bones: 14 per hand</div>
            </div>
          </div>
        </div>

        {/* Pose Canvas / Visualizer Card */}
        <div className="lg:col-span-8 clay-card p-6 flex flex-col justify-between min-h-[460px]">
          <div>
            <div className="flex items-center justify-between pb-4 border-b border-slate-200/60">
              <span className="text-xs font-black uppercase text-[#6E7387]">
                Landmark Mesh Visualizer (3D Viewport)
              </span>
              <span className="px-3 py-1 rounded-full bg-[#E5F8E2] text-xs font-extrabold text-[#65B75D]">
                Pipeline Synchronized
              </span>
            </div>

            {/* Visualizer wireframe mockup */}
            <div className="w-full aspect-video mt-4 rounded-[22px] bg-[#1E202E] relative flex items-center justify-center overflow-hidden border border-slate-700/50">
              {/* Synthetic grid & landmarks */}
              <div className="absolute inset-0 opacity-15 bg-[radial-gradient(#7C9CFF_1px,transparent_1px)] [background-size:16px_16px]"></div>

              <div className="relative text-center text-white space-y-3">
                <div className="w-24 h-24 rounded-full border-2 border-[#7C9CFF] mx-auto flex items-center justify-center shadow-[0_0_15px_rgba(124,156,255,0.4)]">
                  <div className="w-16 h-16 rounded-full border border-dashed border-[#FF8A8A] flex items-center justify-center text-2xl">
                    🤖
                  </div>
                </div>
                <div>
                  <p className="text-xs font-bold text-white/90">Landmark Point Cloud Ready</p>
                  <p className="text-[10px] text-white/60 font-mono mt-0.5">
                    Order: Pose (33) &rarr; Left Hand (21) &rarr; Right Hand (21)
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="pt-4 flex flex-wrap items-center justify-between gap-3 text-xs text-[#6E7387] font-semibold border-t border-slate-200/60">
            <span>Normalized relative to shoulder midpoint</span>
            <span className="font-mono text-[#7C9CFF]">CONTRACT: docs/contracts/model-contract.md</span>
          </div>
        </div>
      </div>
    </div>
  );
};
