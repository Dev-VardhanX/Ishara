import React, { useState, useEffect, useRef } from 'react';
import { Header } from '../components/Header';
import { AvatarStage } from '../components/AvatarStage';
import { useLanguageStore } from '../store/useLanguageStore';
import { useLocaleStore, SUPPORTED_LOCALES, AppLocale } from '../store/useLocaleStore';
import { parseTextToGlosses, getTextToGlossDetails, GlossToken, TextToGlossDetails } from '../lib/textToGloss';
import { loadLexicon } from '../data/lexicons';
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

const LOCALIZED_EXAMPLES: Record<AppLocale, string[]> = {
  en: ['Hello, how are you?', 'Thank you very much.', 'Please help me.', 'Goodbye, my friend!', 'Yes, good friend.'],
  hi: ['नमस्ते, आप कैसे हैं?', 'बहुत धन्यवाद।', 'कृपया मेरी मदद करें।', 'अलविदा मेरे दोस्त!', 'हाँ, अच्छा दोस्त।'],
  bn: ['নমস্কার, আপনি কেমন আছেন?', 'অনেক ধন্যবাদ।', 'দয়া করে সাহায্য করুন।', 'বিদায় বন্ধু!', 'হ্যাঁ, ভালো বন্ধু।'],
  mr: ['नमस्कार, तुम्ही कसे आहात?', 'खूप धन्यवाद।', 'कृपया मला मदत करा।', 'निरोप मित्रा!', 'हो, चांगला मित्र।'],
  ta: ['வணக்கம், நீங்கள் எப்படி இருக்கிறீர்கள்?', 'மிக்க நன்றி.', 'தயவுசெய்து எனக்கு உதவுங்கள்.', 'போய் வருகிறேன் நண்பா!', 'ஆம், நல்ல நண்பன்.'],
  te: ['నమస్కారం, మీరు ఎలా ఉన్నారు?', 'చాలా ధನ್ಯవాదాలు.', 'దయచేసి నాకు సహాయం చేయండి.', 'వీడ్కోలు స్నేహితుడా!', 'అవును, మంచి స్నేహితుడు.'],
  gu: ['નમસ્તે, તમે કેમ છો?', 'ખૂબ ખૂબ આભાર.', 'કૃપા કરીને મને મદદ કરો.', 'આવજો મિત્ર!', 'હા, સારો મિત્ર.'],
  kn: ['ನಮಸ್ಕಾರ, ನೀವು ಹೇಗಿದ್ದೀರಿ?', 'ತುಂಬಾ ಧನ್ಯವಾದಗಳು.', 'ದಯವಿಟ್ಟು ನನಗೆ ಸಹಾಯ ಮಾಡಿ.', 'ವಿದಾಯ ಗೆಳೆಯ!', 'ಹೌದು, ಒಳ್ಳೆಯ ಸ್ನೇಹಿತ.'],
  ml: ['നമസ്കാരം, സുഖമാണോ?', 'വളരെ നന്ദി.', 'ദയവായി എന്നെ സഹായിക്കൂ.', 'വിട സുഹൃത്തേ!', 'അതെ, നല്ല സുഹൃത്ത്.'],
  pa: ['ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ, ਤੁਸੀਂ ਕਿਵੇਂ ਹੋ?', 'ਬਹੁਤ ਬਹੁਤ ਧੰਨਵਾਦ।', 'ਕਿਰਪਾ ਕਰਕੇ ਮੇਰੀ ਮਦਦ ਕਰੋ।', 'ਅਲਵਿਦਾ ਮੇਰੇ ਦੋਸਤ!', 'ਹਾਂ, ਚੰਗਾ ਦੋਸਤ।'],
};

export const VoiceToSignPage: React.FC = () => {
  const { language } = useLanguageStore();
  const { t, locale, voiceCode, translationLocale, translationVoiceCode } = useLocaleStore();
  const speech = useSpeech();

  const [inputLocale, setInputLocale] = useState<AppLocale>(translationLocale || locale || 'en');

  useEffect(() => {
    if (translationLocale) {
      setInputLocale(translationLocale);
      loadLexicon(translationLocale);
    }
  }, [translationLocale]);

  const activeInputMeta = SUPPORTED_LOCALES.find((l) => l.code === inputLocale) || SUPPORTED_LOCALES[0];
  const activeInputVoiceCode = activeInputMeta.voiceCode;

  // State
  const defaultSentence = 'Hello, how are you today?';
  const [inputText, setInputText] = useState(defaultSentence);
  const [parseDetails, setParseDetails] = useState<TextToGlossDetails>(() =>
    getTextToGlossDetails(defaultSentence, language, inputLocale)
  );
  const [tokens, setTokens] = useState<GlossToken[]>(() => parseDetails.tokens);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [speed, setSpeed] = useState<number>(1.0);
  const [playing, setPlaying] = useState<boolean>(false);

  // Sync parsing when language or inputLocale changes
  useEffect(() => {
    loadLexicon(inputLocale).then(() => {
      if (inputText.trim()) {
        const details = getTextToGlossDetails(inputText.trim(), language, inputLocale);
        setParseDetails(details);
        setTokens(details.tokens);
        setCurrentIndex(0);
      }
    });
  }, [language, inputLocale]);

  // Web Speech API state
  const [isListening, setIsListening] = useState<boolean>(false);
  const [speechError, setSpeechError] = useState<string | null>(null);
  const recognitionRef = useRef<any>(null);

  // Playback timer reference
  const timerRef = useRef<number | null>(null);

  // Set document title
  useEffect(() => {
    document.title = `${t('voiceToSign.title')} — Ishara`;
  }, [t]);

  // Parse text when submitted
  const handleSignSubmit = (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!inputText.trim()) return;

    const details = getTextToGlossDetails(inputText.trim(), language, inputLocale);
    setParseDetails(details);
    setTokens(details.tokens);
    setCurrentIndex(0);
    setPlaying(true);

    // Save each run to history store
    try {
      addRecentConversation(
        {
          title: `Avatar: "${inputText.trim().slice(0, 24)}${inputText.length > 24 ? '...' : ''}"`,
          mode: `Voice to ${language}`,
          timestamp: 'Just now',
          snippet: inputText.trim(),
          language,
          iconEmoji: 'voice',
          direction: 'voice_to_sign',
          locale: inputLocale,
          originalText: inputText.trim(),
          englishText: details.englishOrderText,
          glosses: details.tokens.map((t) => t.gloss).filter(Boolean) as string[],
        },
        {
          direction: 'voice_to_sign',
          text: inputText.trim(),
          translatedText: details.tokens.map((t) => t.gloss).filter(Boolean).join(' '),
          emotion: 'neutral',
        }
      );
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

  const handleSelectExample = (sentence: string) => {
    setInputText(sentence);
    const parsed = parseTextToGlosses(sentence, language, inputLocale);
    setTokens(parsed);
    const details = getTextToGlossDetails(sentence, language, inputLocale);
    setParseDetails(details);
    setCurrentIndex(0);
    setPlaying(true);

    try {
      addRecentConversation(
        {
          title: `Avatar: "${sentence.slice(0, 24)}${sentence.length > 24 ? '...' : ''}"`,
          mode: `Voice to ${language}`,
          timestamp: 'Just now',
          snippet: sentence,
          language,
          iconEmoji: 'voice',
          direction: 'voice_to_sign',
          locale: inputLocale,
          originalText: sentence,
          englishText: details.englishOrderText,
          glosses: parsed.map((t) => t.gloss).filter(Boolean) as string[],
        },
        {
          direction: 'voice_to_sign',
          text: sentence,
          translatedText: parsed.map((t) => t.gloss).filter(Boolean).join(' '),
          emotion: 'neutral',
        }
      );
    } catch (err) {
      console.warn('Failed to save to history', err);
    }
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
      recognition.lang = activeInputVoiceCode;

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
        title={t('voiceToSign.title')}
        subtitle={t('voiceToSign.subtitle')}
      />

      {/* Gentle Speech Output Voice Hint */}
      {speech.errorMessage && (
        <div className="p-3 rounded-2xl bg-white/70 border border-slate-200/80 text-[#6E7387] text-xs font-semibold flex items-center justify-between shadow-sm animate-fade-in">
          <div className="flex items-center gap-2">
            <Volume2 className="w-3.5 h-3.5 text-[#6E7387] shrink-0" />
            <p>{t('voiceToSign.voiceOutputUnavailable')}</p>
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
        {/* Top Controls: Mode, Language Selector, Speed */}
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-white/70 border border-slate-200/50 text-xs font-black text-[#2B2D42] shadow-sm">
            <Sparkles className="w-3.5 h-3.5 text-[#7C9CFF]" />
            <span>{t('voiceToSign.mode', { mode: language === 'ISL' ? t('voiceToSign.islFull') : t('voiceToSign.aslFull') })}</span>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Input Language Selector */}
            <div className="flex items-center gap-1.5 px-3 py-1 bg-white/80 rounded-full border border-slate-200/60 shadow-sm backdrop-blur">
              <span className="text-[10px] font-black uppercase text-[#6E7387]">
                {t('voiceToSign.inputLangLabel')}
              </span>
              <select
                value={inputLocale}
                onChange={(e) => {
                  const newLoc = e.target.value as AppLocale;
                  setInputLocale(newLoc);
                  loadLexicon(newLoc);
                }}
                className="bg-transparent text-xs font-black text-[#2B2D42] focus:outline-none cursor-pointer"
                title={t('voiceToSign.selectLangTitle')}
              >
                {SUPPORTED_LOCALES.map((loc) => (
                  <option key={loc.code} value={loc.code}>
                    {loc.nativeName} ({loc.name})
                  </option>
                ))}
              </select>
            </div>

            {/* Speed Selector */}
            <div className="flex items-center p-1 bg-white/80 rounded-full border border-slate-200/60 shadow-sm backdrop-blur">
              <span className="text-[10px] font-black uppercase text-[#6E7387] px-2.5">
                {t('voiceToSign.speedLabel')}
              </span>
              {[0.5, 1.0, 1.5].map((s) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => setSpeed(s)}
                  className={`px-3 py-1 rounded-full text-xs font-black transition-all clay-focus ${speed === s
                    ? 'bg-[#7C9CFF] text-white shadow-clay-raised-sm'
                    : 'text-[#6E7387] hover:text-[#2B2D42]'
                    }`}
                >
                  {s}x
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Language & ISL Word Order Conversion Telemetry */}
        <div className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 shadow-sm space-y-1.5 text-xs animate-fade-in">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5 sm:gap-4">
            <div className="flex items-center gap-2 flex-wrap">
              <span className="font-bold text-[#6E7387] uppercase text-[10px] tracking-wider shrink-0">
                {t('voiceToSign.inputTelemetry', { lang: activeInputMeta.name })}
              </span>
              <span className="font-semibold text-[#2B2D42]">
                {parseDetails.englishOrderText || t('voiceToSign.noSignYet')}
              </span>
              {parseDetails.detectedScript && parseDetails.detectedScript !== 'Latin' && (
                <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[9px] font-black uppercase">
                  {t('voiceToSign.scriptDetected', { script: parseDetails.detectedScript })}
                </span>
              )}
            </div>
            {language === 'ISL' && parseDetails.islOrderText && (
              <div className="flex items-center gap-2">
                <span className="font-black text-[#7C9CFF] uppercase text-[10px] tracking-wider shrink-0">
                  {t('voiceToSign.islWordOrder')}
                </span>
                <span className="font-black text-[#2B2D42]">
                  {parseDetails.islOrderText}
                </span>
              </div>
            )}
          </div>
          <p className="text-[10px] text-[#6E7387] italic">
            {t('voiceToSign.annotationNote')}
          </p>
        </div>

        {/* AvatarStage Component */}
        <div className="relative">
          <AvatarStage
            currentGloss={currentGloss}
            glosses={tokens.map((t) => t.gloss).filter(Boolean) as string[]}
            speed={speed}
            playing={playing}
            onSpeedChange={setSpeed}
            onTogglePlay={() => setPlaying(!playing)}
            onReplay={() => {
              setCurrentIndex(0);
              setPlaying(true);
            }}
          />

          {/* Bottom Floating Bar inside stage: Caption Chip & Playback Controls */}
          <div className="absolute bottom-5 left-5 right-5 flex flex-col sm:flex-row items-center justify-between gap-4 z-20 pointer-events-auto">
            {/* Caption Chip "AVATAR SIGNING" with Current Word Highlight */}
            <div className="px-5 py-3 rounded-2xl bg-[#2B2D42]/90 text-white backdrop-blur-md max-w-xl shadow-lg border border-white/20">
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-black text-white/60 uppercase tracking-widest">
                  {t('voiceToSign.avatarSigning')}
                </span>
                {currentToken && !currentToken.hasSign && (
                  <span className="px-2 py-0.5 rounded-full bg-[#FF8A8A] text-white text-[9px] font-black uppercase">
                    {t('voiceToSign.notInVocabYet')}
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
                        className={`cursor-pointer px-1.5 py-0.5 rounded-lg transition-all ${isCurrent
                          ? 'bg-[#7C9CFF] text-white font-black shadow-sm scale-105 ring-2 ring-white/50'
                          : !token.hasSign
                            ? 'bg-[#FF8A8A]/30 text-white/90 border border-[#FF8A8A]/50 hover:bg-[#FF8A8A]/40'
                            : 'text-white/80 hover:text-white hover:bg-white/10'
                          }`}
                        title={token.gloss ? t('voiceToSign.signTooltip', { gloss: token.gloss }) : t('voiceToSign.notInVocabTooltip', { text: token.originalText })}
                      >
                        {token.originalText}
                        {!token.hasSign && (
                          <span className="ml-1 text-[9px] text-[#FFB59E] font-bold">
                            {t('voiceToSign.notInVocabYet')}
                          </span>
                        )}
                      </span>
                    );
                  })
                ) : (
                  <span className="italic text-white/50">{t('voiceToSign.typeSomething')}</span>
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
                title={t('voiceToSign.prevSign')}
              >
                <SkipBack className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleTogglePlay}
                className="w-12 h-12 rounded-full bg-[#FF8A8A] hover:bg-[#FF7373] text-white flex items-center justify-center shadow-clay-raised-sm clay-focus transition-transform active:scale-95"
                title={playing ? t('voiceToSign.pause') : t('voiceToSign.play')}
              >
                {playing ? <Pause className="w-5 h-5" /> : <Play className="w-5 h-5 ml-0.5" />}
              </button>

              <button
                type="button"
                onClick={handleNext}
                disabled={currentIndex >= tokens.length - 1}
                className="p-2.5 text-[#6E7387] hover:text-[#2B2D42] disabled:opacity-40 rounded-full clay-focus transition-colors"
                title={t('voiceToSign.nextSign')}
              >
                <SkipForward className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={handleReplay}
                className="p-2.5 text-[#6E7387] hover:text-[#2B2D42] rounded-full clay-focus transition-colors"
                title={t('voiceToSign.replay')}
              >
                <RotateCcw className="w-4 h-4" />
              </button>

              <button
                type="button"
                onClick={() => speech.speak(inputText, { isUserClick: true, lang: activeInputVoiceCode })}
                className="p-2.5 text-[#6E7387] hover:text-[#7C9CFF] rounded-full clay-focus transition-colors"
                title={t('voiceToSign.speakAloud', { lang: activeInputMeta.name })}
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
              placeholder={t('voiceToSign.typePlaceholder')}
              className="clay-input w-full pr-10 text-sm font-bold"
            />
            {inputText && (
              <button
                type="button"
                onClick={handleClearText}
                className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E7387] hover:text-[#2B2D42] p-1 rounded-full clay-focus"
                title={t('voiceToSign.clearInput')}
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
              className={`p-3.5 rounded-clay transition-all clay-focus flex items-center justify-center ${isListening
                ? 'bg-[#FF8A8A] text-white shadow-clay-pressed animate-pulse ring-2 ring-red-400'
                : 'bg-[#7C9CFF] text-white shadow-clay-raised hover:brightness-105'
                }`}
              title={isListening ? t('voiceToSign.micListening') : t('voiceToSign.micClick')}
            >
              {isListening ? <MicOff className="w-5 h-5" /> : <Mic className="w-5 h-5" />}
            </button>

            {/* Sign This Action Button */}
            <button
              type="submit"
              disabled={!inputText.trim()}
              className="clay-button bg-[#2B2D42] text-white px-7 py-3.5 text-sm font-black clay-focus disabled:opacity-50"
            >
              {t('voiceToSign.signThis')}
            </button>
          </div>
        </form>

        {/* Quick-Pick Example Chips for active input language */}
        <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-200/50 mt-3">
          <span className="text-[10px] font-black uppercase text-[#6E7387] tracking-wider">
            {t('voiceToSign.quickExamples', { lang: activeInputMeta.nativeName })}
          </span>
          {(LOCALIZED_EXAMPLES[inputLocale] || LOCALIZED_EXAMPLES.en).map((sample) => (
            <button
              key={sample}
              type="button"
              onClick={() => handleSelectExample(sample)}
              className="inline-flex items-center px-3 py-1 rounded-full text-xs font-bold bg-white/80 hover:bg-white text-[#2B2D42] border border-slate-200/80 shadow-sm hover:scale-105 hover:border-[#7C9CFF]/50 transition-all cursor-pointer clay-focus"
            >
              {sample}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
};
