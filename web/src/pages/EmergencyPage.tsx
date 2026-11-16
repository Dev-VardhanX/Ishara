import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { speak, recordUserInteraction, getSpeechStatus } from '../lib/speech';
import { SignIcon } from '../components/SignIcon';
import { useLocaleStore } from '../store/useLocaleStore';
import {
  AlertTriangle,
  Volume2,
  VolumeX,
  PhoneCall,
  X,
  MapPin,
  Check,
  Info,
  ShieldCheck,
} from 'lucide-react';

interface HelpPhraseDef {
  id: string;
  category: 'immediate' | 'police' | 'medical' | 'communication';
}

const PHRASE_DEFS: HelpPhraseDef[] = [
  { id: 'help', category: 'immediate' },
  { id: 'police', category: 'police' },
  { id: 'not_safe', category: 'immediate' },
  { id: 'medical', category: 'medical' },
  { id: 'communication', category: 'communication' },
  { id: 'family', category: 'communication' },
];

export const EmergencyPage: React.FC = () => {
  const { t, locale, voiceCode } = useLocaleStore();

  // Siren and alert states
  const [isSirenActive, setIsSirenActive] = useState<boolean>(false);
  const [flashState, setFlashState] = useState<'red' | 'white'>('red');
  const [prefersReducedMotion, setPrefersReducedMotion] = useState<boolean>(false);

  // Fullscreen phrase broadcast modal
  const [activeBroadcastPhraseId, setActiveBroadcastPhraseId] = useState<string | null>(null);

  // Location sharing state
  const [locating, setLocating] = useState<boolean>(false);
  const [locationSuccess, setLocationSuccess] = useState<string | null>(null);
  const [locationError, setLocationError] = useState<string | null>(null);

  // Speech support state
  const [hasVoiceSupport, setHasVoiceSupport] = useState<boolean>(true);

  // Audio references
  const audioContextRef = useRef<AudioContext | null>(null);
  const oscRef = useRef<OscillatorNode | null>(null);
  const lfoRef = useRef<OscillatorNode | null>(null);
  const wakeLockRef = useRef<any>(null);
  const flashTimerRef = useRef<number | null>(null);
  const vibrationIntervalRef = useRef<number | null>(null);
  const repeatSpeechTimerRef = useRef<number | null>(null);

  useEffect(() => {
    document.title = `${t('emergency.title')} — Ishara`;

    // Check prefers-reduced-motion media query
    if (typeof window !== 'undefined' && window.matchMedia) {
      const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
      setPrefersReducedMotion(mq.matches);
      const listener = (e: MediaQueryListEvent) => setPrefersReducedMotion(e.matches);
      mq.addEventListener?.('change', listener);
      return () => mq.removeEventListener?.('change', listener);
    }
  }, [t]);

  // Check speech synthesis support on mount
  useEffect(() => {
    const status = getSpeechStatus();
    if (!status.isSupported) {
      setHasVoiceSupport(false);
    }
  }, []);

  // Request Screen Wake Lock so screen doesn't dim during emergency
  const requestWakeLock = async () => {
    try {
      if ('wakeLock' in navigator && (navigator as any).wakeLock) {
        wakeLockRef.current = await (navigator as any).wakeLock.request('screen');
      }
    } catch (err) {
      // Non-blocking fallback
    }
  };

  const releaseWakeLock = () => {
    if (wakeLockRef.current) {
      wakeLockRef.current.release().catch(() => {});
      wakeLockRef.current = null;
    }
  };

  /**
   * Start Web Audio API wailing siren
   */
  const startSirenAudio = () => {
    recordUserInteraction();
    try {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      if (!AudioCtx) return;

      const ctx = new AudioCtx();
      audioContextRef.current = ctx;

      const mainOsc = ctx.createOscillator();
      const lfo = ctx.createOscillator();
      const lfoGain = ctx.createGain();
      const masterGain = ctx.createGain();

      mainOsc.type = 'sawtooth';
      mainOsc.frequency.setValueAtTime(700, ctx.currentTime);

      lfo.type = 'triangle';
      lfo.frequency.setValueAtTime(1.5, ctx.currentTime);

      lfoGain.gain.setValueAtTime(300, ctx.currentTime);

      masterGain.gain.setValueAtTime(0.01, ctx.currentTime);
      masterGain.gain.exponentialRampToValueAtTime(0.45, ctx.currentTime + 0.15);

      lfo.connect(lfoGain);
      lfoGain.connect(mainOsc.frequency);
      mainOsc.connect(masterGain);
      masterGain.connect(ctx.destination);

      mainOsc.start();
      lfo.start();

      oscRef.current = mainOsc;
      lfoRef.current = lfo;
    } catch (err) {
      console.warn('Web Audio Siren unavailable:', err);
    }
  };

  const stopSirenAudio = () => {
    try {
      if (oscRef.current) {
        oscRef.current.stop();
        oscRef.current.disconnect();
        oscRef.current = null;
      }
      if (lfoRef.current) {
        lfoRef.current.stop();
        lfoRef.current.disconnect();
        lfoRef.current = null;
      }
      if (audioContextRef.current) {
        audioContextRef.current.close().catch(() => {});
        audioContextRef.current = null;
      }
    } catch (err) {
      // Ignored
    }
  };

  /**
   * Trigger device vibration
   */
  const startVibration = () => {
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate([400, 200, 400, 200, 600]);
        vibrationIntervalRef.current = window.setInterval(() => {
          navigator.vibrate([400, 200, 400, 200, 600]);
        }, 1800);
      } catch (e) {}
    }
  };

  const stopVibration = () => {
    if (vibrationIntervalRef.current) {
      clearInterval(vibrationIntervalRef.current);
      vibrationIntervalRef.current = null;
    }
    if (typeof navigator !== 'undefined' && 'vibrate' in navigator) {
      try {
        navigator.vibrate(0);
      } catch (e) {}
    }
  };

  /**
   * Safe screen flashing: 2 Hz (max 2 flashes per second)
   */
  const startVisualFlash = () => {
    if (flashTimerRef.current) clearInterval(flashTimerRef.current);

    flashTimerRef.current = window.setInterval(() => {
      setFlashState((prev) => (prev === 'red' ? 'white' : 'red'));
    }, 500);
  };

  const stopVisualFlash = () => {
    if (flashTimerRef.current) {
      clearInterval(flashTimerRef.current);
      flashTimerRef.current = null;
    }
    setFlashState('red');
  };

  /**
   * Activate Siren Mode
   */
  const handleToggleSiren = () => {
    if (isSirenActive) {
      handleStopAll();
    } else {
      setIsSirenActive(true);
      startSirenAudio();
      startVisualFlash();
      startVibration();
      requestWakeLock();
    }
  };

  /**
   * Immediate STOP handler for siren, strobe, vibration, wake lock
   */
  const handleStopAll = () => {
    setIsSirenActive(false);
    stopSirenAudio();
    stopVisualFlash();
    stopVibration();
    releaseWakeLock();
  };

  /**
   * Start Fullscreen Help Phrase Broadcast
   */
  const startBroadcast = (phraseId: string) => {
    recordUserInteraction();
    setActiveBroadcastPhraseId(phraseId);
    requestWakeLock();

    const phraseText = t(`emergency.phrases.${phraseId}`);

    speak(phraseText, {
      lang: voiceCode,
      rate: 0.95,
      isUserClick: true,
    });

    if (repeatSpeechTimerRef.current) {
      clearInterval(repeatSpeechTimerRef.current);
    }
    repeatSpeechTimerRef.current = window.setInterval(() => {
      speak(phraseText, {
        lang: voiceCode,
        rate: 0.95,
        isAutoSpeak: false,
        isUserClick: true,
      });
    }, 6000);
  };

  const stopBroadcast = () => {
    if (repeatSpeechTimerRef.current) {
      clearInterval(repeatSpeechTimerRef.current);
      repeatSpeechTimerRef.current = null;
    }
    if (typeof window !== 'undefined' && 'speechSynthesis' in window) {
      window.speechSynthesis.cancel();
    }
    setActiveBroadcastPhraseId(null);
    if (!isSirenActive) {
      releaseWakeLock();
    }
  };

  // Clean up all background jobs on component unmount
  useEffect(() => {
    return () => {
      handleStopAll();
      stopBroadcast();
    };
  }, []);

  /**
   * Location Sharing via Web Share API or Clipboard Fallback
   */
  const handleShareLocation = () => {
    setLocationError(null);
    setLocationSuccess(null);

    if (!navigator.geolocation) {
      setLocationError('Geolocation is not supported by your browser.');
      return;
    }

    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        setLocating(false);
        const lat = pos.coords.latitude.toFixed(6);
        const lng = pos.coords.longitude.toFixed(6);
        const mapsUrl = `https://maps.google.com/?q=${lat},${lng}`;
        const shareMessage = `EMERGENCY SOS: I need urgent help. I cannot speak or hear. My live location: ${mapsUrl}`;

        if (navigator.share) {
          try {
            await navigator.share({
              title: 'EMERGENCY SOS',
              text: shareMessage,
              url: mapsUrl,
            });
            setLocationSuccess('Location shared successfully!');
          } catch (err: any) {
            if (err.name !== 'AbortError') {
              copyToClipboard(shareMessage);
            }
          }
        } else {
          copyToClipboard(shareMessage);
        }
      },
      (err) => {
        setLocating(false);
        setLocationError(`Could not access GPS location: ${err.message}. Please enable location permissions.`);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 0,
      }
    );
  };

  const copyToClipboard = (text: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard
        .writeText(text)
        .then(() => {
          setLocationSuccess('Emergency message and location copied to clipboard!');
        })
        .catch(() => {
          setLocationError('Failed to copy location to clipboard.');
        });
    } else {
      setLocationError('Clipboard API not available.');
    }
  };

  return (
    <div className="space-y-6 select-none max-w-4xl mx-auto pb-12">
      <Header
        title={t('emergency.title')}
        subtitle={t('emergency.subtitle')}
        badge={
          <span className="px-3 py-1 rounded-full bg-[#FFE8E2] border border-[#FF4D4D] text-[#D32F2F] text-xs font-black uppercase tracking-wider flex items-center gap-1.5 animate-pulse">
            <AlertTriangle className="w-3.5 h-3.5" />
            <span>{t('emergency.sosActivePill')}</span>
          </span>
        }
      />

      {/* Main Alert Card / Siren Interface */}
      <div className="space-y-6">
        {/* Large SIREN BEACON Card */}
        <div
          className={`clay-card p-8 sm:p-10 rounded-[32px] text-center transition-all duration-300 relative overflow-hidden border-4 ${
            isSirenActive
              ? flashState === 'red' || prefersReducedMotion
                ? 'bg-[#D32F2F] text-white border-white shadow-[0_0_50px_rgba(211,47,47,0.8)]'
                : 'bg-white text-[#D32F2F] border-[#D32F2F] shadow-[0_0_50px_rgba(255,255,255,0.9)]'
              : 'bg-gradient-to-br from-[#FFF5F5] via-[#FFE8E2] to-[#FFD5CC] border-[#FF8A8A]/50'
          }`}
        >
          {isSirenActive ? (
            <div className="space-y-6 py-4 animate-scaleUp">
              <div
                className={`w-32 h-32 sm:w-44 sm:h-44 rounded-full mx-auto flex items-center justify-center shadow-2xl transition-transform duration-300 scale-105 ${
                  flashState === 'red' || prefersReducedMotion
                    ? 'bg-white text-[#D32F2F]'
                    : 'bg-[#D32F2F] text-white'
                }`}
              >
                <AlertTriangle className="w-16 h-16 sm:w-20 sm:h-20 animate-pulse" />
              </div>
              <h1
                className={`text-3xl sm:text-5xl font-black tracking-tight ${
                  flashState === 'red' || prefersReducedMotion ? 'text-white' : 'text-[#D32F2F]'
                }`}
              >
                {t('emergency.sirenActive')}
              </h1>
              <p
                className={`text-base sm:text-xl font-bold max-w-lg mx-auto ${
                  flashState === 'red' || prefersReducedMotion ? 'text-white/90' : 'text-[#2B2D42]'
                }`}
              >
                {t('emergency.screenNotice')}
              </p>

              {/* Big STOP SIREN Button */}
              <div className="pt-2 max-w-md mx-auto">
                <button
                  type="button"
                  onClick={handleStopAll}
                  className="w-full min-h-[64px] py-4 px-8 rounded-[28px] bg-white text-[#D32F2F] hover:bg-slate-100 font-black text-xl sm:text-2xl shadow-2xl border-4 border-[#D32F2F] hover:scale-102 active:scale-98 transition-all flex items-center justify-center gap-3 clay-focus"
                >
                  <VolumeX className="w-7 h-7" />
                  <span>{t('emergency.stopSiren')}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-6 py-4">
              <button
                type="button"
                onClick={handleToggleSiren}
                className="w-40 h-40 sm:w-52 sm:h-52 rounded-full mx-auto bg-[#D32F2F] hover:bg-[#B71C1C] text-white font-black text-lg sm:text-2xl flex flex-col items-center justify-center gap-2 shadow-[0_12px_28px_rgba(211,47,47,0.5)] border-4 border-white hover:scale-105 active:scale-95 transition-all clay-focus group"
                aria-label={t('emergency.sirenBtn')}
              >
                <Volume2 className="w-12 h-12 sm:w-16 sm:h-16 group-hover:scale-110 transition-transform animate-pulse" />
                <span className="leading-tight px-4">{t('emergency.sirenBtn')}</span>
              </button>

              <div className="space-y-1">
                <p className="text-xs sm:text-sm font-extrabold text-[#D32F2F] tracking-wide uppercase">
                  {t('emergency.turnVolumeUp')}
                </p>
                <p className="text-xs text-[#6E7387] max-w-md mx-auto font-medium">
                  {t('emergency.sirenExplanation')}
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Quick Action Helper Buttons (Helper 112 & Location Share) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          {/* Helper: Call 112 National Emergency Helpline */}
          <a
            href="tel:112"
            className="min-h-[58px] p-4 rounded-[28px] bg-white/90 hover:bg-white border-2 border-emerald-300 text-emerald-800 font-black text-base flex items-center justify-center gap-3 shadow-clay-raised hover:scale-101 active:shadow-clay-pressed transition-all clay-focus"
            title={t('emergency.call112Title')}
          >
            <div className="w-9 h-9 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-sm shrink-0">
              <PhoneCall className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block text-sm sm:text-base leading-tight">{t('emergency.call112')}</span>
              <span className="block text-[10px] font-bold text-emerald-600">{t('emergency.call112Sub')}</span>
            </div>
          </a>

          {/* Share My Location Button */}
          <button
            type="button"
            onClick={handleShareLocation}
            disabled={locating}
            className="min-h-[58px] p-4 rounded-[28px] bg-white/90 hover:bg-white border-2 border-[#7C9CFF]/60 text-[#2B2D42] font-black text-base flex items-center justify-center gap-3 shadow-clay-raised hover:scale-101 active:shadow-clay-pressed transition-all clay-focus disabled:opacity-70"
          >
            <div className="w-9 h-9 rounded-full bg-[#7C9CFF] text-white flex items-center justify-center shadow-sm shrink-0">
              <MapPin className="w-4 h-4" />
            </div>
            <div className="text-left">
              <span className="block text-sm sm:text-base leading-tight">
                {locating ? t('emergency.locating') : t('emergency.locationBtn')}
              </span>
              <span className="block text-[10px] font-bold text-[#6E7387]">
                {t('emergency.locationNote')}
              </span>
            </div>
          </button>
        </div>

        {/* Location Status Feedback */}
        {locationSuccess && (
          <div className="p-3.5 rounded-2xl bg-[#E5F8E2] border border-[#A8E6A1] text-[#2D7A4F] text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
            <Check className="w-4 h-4 shrink-0" />
            <span>{locationSuccess}</span>
          </div>
        )}

        {locationError && (
          <div className="p-3.5 rounded-2xl bg-[#FFE8E2] border border-[#FF8A8A] text-[#D32F2F] text-xs font-bold flex items-center gap-2 shadow-sm animate-fade-in">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>{locationError}</span>
          </div>
        )}

        {/* Voice Note if Speech Synthesis Unsupported */}
        {!hasVoiceSupport && (
          <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/80 text-[#6E7387] text-xs font-semibold flex items-center gap-2 shadow-sm">
            <Info className="w-4 h-4 text-[#7C9CFF] shrink-0" />
            <span>
              {t('emergency.noVoiceNotice')}
            </span>
          </div>
        )}

        {/* Help Phrases Pack Section */}
        <div className="space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-3">
            <div>
              <h3 className="text-base sm:text-lg font-black text-[#2B2D42] flex items-center gap-2">
                <span>{t('emergency.helpCards')}</span>
                <span className="px-2.5 py-0.5 rounded-full bg-[#FFE8E2] text-[10px] font-extrabold text-[#FF4D4D]">
                  {t('emergency.tapToBroadcast')}
                </span>
              </h3>
              <p className="text-xs font-semibold text-[#6E7387]">
                {t('emergency.helpCardsSub')}
              </p>
            </div>
          </div>

          {/* Big Help Cards Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {PHRASE_DEFS.map((phrase) => {
              const phraseText = t(`emergency.phrases.${phrase.id}`);

              return (
                <button
                  key={phrase.id}
                  type="button"
                  onClick={() => startBroadcast(phrase.id)}
                  className="clay-card p-5 text-left bg-white/90 hover:bg-white border-2 border-slate-200/80 hover:border-[#FF4D4D]/60 rounded-[28px] shadow-clay-raised hover:scale-102 active:shadow-clay-pressed transition-all flex flex-col justify-between min-h-[140px] clay-focus group"
                >
                  <div className="flex items-center justify-between w-full">
                    <div className="w-11 h-11 rounded-2xl bg-[#FFE8E2] text-[#FF4D4D] flex items-center justify-center shadow-clay-raised-sm group-hover:scale-110 transition-transform">
                      <SignIcon phraseId={phrase.id} className="w-6 h-6" />
                    </div>
                    <span className="text-[10px] font-black uppercase text-[#6E7387] px-2 py-0.5 rounded-full bg-slate-100">
                      {t('emergency.tapToSpeak')}
                    </span>
                  </div>

                  <div className="space-y-1 mt-3">
                    <h4 className="text-base sm:text-lg font-black text-[#2B2D42] leading-snug group-hover:text-[#FF4D4D] transition-colors">
                      {phraseText}
                    </h4>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Privacy & Discretion Notice */}
        <div className="p-4 rounded-2xl bg-white/60 border border-slate-200/60 text-xs text-[#6E7387] font-semibold space-y-1 text-center">
          <p className="font-bold text-[#2B2D42] flex items-center justify-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-emerald-600" />
            <span>{t('emergency.privacyTitle')}</span>
          </p>
          <p>{t('emergency.privacyDesc')}</p>
        </div>
      </div>

      {/* Fullscreen Broadcast Modal Overlay */}
      {activeBroadcastPhraseId && (
        <div className="fixed inset-0 z-50 bg-[#D32F2F] text-white p-6 sm:p-10 flex flex-col justify-between animate-fadeIn select-none">
          {/* Header Bar */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 px-4 py-2 rounded-full bg-white/20 backdrop-blur text-sm font-black uppercase tracking-wider">
              <Volume2 className="w-5 h-5 animate-pulse" />
              <span>{t('emergency.speakingContinuous')}</span>
            </div>

            <button
              type="button"
              onClick={stopBroadcast}
              className="p-3 rounded-full bg-white text-[#D32F2F] font-black hover:bg-slate-100 active:scale-95 shadow-xl transition-all"
              title={t('emergency.dismiss')}
              aria-label={t('emergency.dismiss')}
            >
              <X className="w-7 h-7" />
            </button>
          </div>

          {/* Large Screen Message */}
          <div className="my-auto text-center space-y-6 max-w-3xl mx-auto px-4">
            <div className="w-24 h-24 rounded-3xl bg-white/20 mx-auto flex items-center justify-center text-white shadow-inner">
              <SignIcon phraseId={activeBroadcastPhraseId} className="w-14 h-14" />
            </div>

            <h1 className="text-4xl sm:text-6xl md:text-7xl font-black leading-tight tracking-tight drop-shadow-md">
              {t(`emergency.phrases.${activeBroadcastPhraseId}`)}
            </h1>

            <p className="text-sm sm:text-base font-semibold text-white/80 max-w-xl mx-auto">
              {t('emergency.screenNotice')}
            </p>
          </div>

          {/* Bottom Action Controls */}
          <div className="max-w-md mx-auto w-full space-y-3 pb-4">
            <button
              type="button"
              onClick={stopBroadcast}
              className="w-full min-h-[60px] py-4 px-8 rounded-[28px] bg-white text-[#D32F2F] text-xl font-black shadow-2xl hover:bg-slate-100 active:scale-98 transition-all flex items-center justify-center gap-2"
            >
              <X className="w-6 h-6" />
              <span>{t('emergency.dismiss')}</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
