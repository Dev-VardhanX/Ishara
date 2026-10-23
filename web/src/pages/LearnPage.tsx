import React, { useState } from 'react';
import { Header } from '../components/Header';
import { AvatarStage } from '../components/AvatarStage';
import { useLanguageStore } from '../store/useLanguageStore';
import { useSpeech } from '../lib/speech';
import lessonsData from '../data/lessons.json';
import { updateTopicProgress, addRecentConversation } from '../data/store';
import {
  GraduationCap,
  Flame,
  Camera,
  Zap,
  Lock,
  CheckCircle2,
  ChevronRight,
  Play,
  Volume2,
  X,
  AlertCircle,
  Award,
  Sparkles,
  HelpCircle,
} from 'lucide-react';

interface SignItem {
  gloss: string;
  word: string;
  description: string;
  emoji: string;
}

interface QuizItem {
  id: string;
  question: string;
  gloss: string;
  options: string[];
  answer: string;
}

export const LearnPage: React.FC = () => {
  const { language } = useLanguageStore();
  const speech = useSpeech();

  // Active Lesson State
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [practicingGloss, setPracticingGloss] = useState<string | null>(null);

  // Quiz Modal State
  const [quizActive, setQuizActive] = useState<boolean>(false);
  const [quizQuestionIndex, setQuizQuestionIndex] = useState<number>(0);
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null);
  const [quizScore, setQuizScore] = useState<number>(0);
  const [quizCompleted, setQuizCompleted] = useState<boolean>(false);

  // Match lessons for the current language
  const currentLessons = lessonsData.lessons.filter(
    (l) => l.language.toUpperCase() === language.toUpperCase()
  );
  const activeLesson =
    lessonsData.lessons.find((l) => l.id === activeLessonId) || currentLessons[0] || lessonsData.lessons[0];

  const categories = [
    {
      id: language === 'ISL' ? 'isl-greetings-1' : 'asl-greetings-1',
      title: 'Greetings',
      lessons: '5 Signs • Beginner',
      progress: 100,
      completed: true,
      emoji: '👋',
      color: 'bg-[#A8E6A1]',
    },
    {
      id: 'family-home',
      title: 'Family & Home',
      lessons: '18 Lessons • Beginner',
      progress: 50,
      completed: false,
      emoji: '👨‍👩‍👧',
      color: 'bg-[#7C9CFF]',
    },
    {
      id: 'food-drinks',
      title: 'Food & Drinks',
      lessons: '15 Lessons • Intermediate',
      progress: 0,
      locked: true,
      emoji: '🍲',
      color: 'bg-slate-300',
    },
    {
      id: 'places-travel',
      title: 'Places & Travel',
      lessons: '20 Lessons • Intermediate',
      progress: 0,
      locked: true,
      emoji: '✈️',
      color: 'bg-slate-300',
    },
  ];

  // Speak pronunciation for a sign or sentence
  const handleListenSign = (word: string) => {
    speech.speak(word, {
      emotion: 'happy',
      lang: language === 'ISL' ? 'en-IN' : 'en-US',
      isUserClick: true,
    });
  };

  // Start Practice
  const handleStartPractice = (gloss: string, word: string) => {
    setPracticingGloss(gloss);
    // Also speak the sign name
    handleListenSign(word);
  };

  // Start Quiz
  const handleOpenQuiz = () => {
    setQuizActive(true);
    setQuizQuestionIndex(0);
    setSelectedAnswer(null);
    setQuizScore(0);
    setQuizCompleted(false);
  };

  // Handle Quiz Answer Selection
  const handleSelectOption = (option: string) => {
    if (selectedAnswer !== null) return; // Prevent double answer
    setSelectedAnswer(option);

    const currentQuiz = activeLesson.quiz as QuizItem[];
    const isCorrect = option === currentQuiz[quizQuestionIndex]?.answer;
    if (isCorrect) {
      setQuizScore((prev) => prev + 1);
    }
  };

  // Next Quiz Question
  const handleNextQuizQuestion = () => {
    const currentQuiz = activeLesson.quiz as QuizItem[];
    if (quizQuestionIndex < currentQuiz.length - 1) {
      setQuizQuestionIndex((prev) => prev + 1);
      setSelectedAnswer(null);
    } else {
      // Finished
      setQuizCompleted(true);
      // Save progress to store
      updateTopicProgress('greetings', 100);
      try {
        addRecentConversation({
          title: `Quiz: ${activeLesson.title}`,
          mode: `${language} Learning`,
          timestamp: 'Just now',
          snippet: `Scored ${quizScore + (selectedAnswer === currentQuiz[quizQuestionIndex]?.answer ? 1 : 0)} / 5 on signs quiz.`,
          language,
          iconEmoji: '🎓',
        });
      } catch (err) {
        console.warn('Failed to save quiz result', err);
      }
    }
  };

  return (
    <div className="space-y-8">
      <Header
        title="Learn Sign Language"
        subtitle="Master Indian and American Sign Languages through interactive daily lessons and auditory feedback."
      />

      {/* Visible Voice Error Banner */}
      {speech.errorMessage && (
        <div className="p-4 rounded-2xl bg-[#FFE8E2] border border-[#FFB59E] text-[#2B2D42] text-xs font-bold flex items-center justify-between gap-3 shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-5 h-5 text-[#FF8A8A] shrink-0" />
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

      {/* Hero Stats Cards */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* Continue Lesson Card */}
        <div className="lg:col-span-8 clay-card p-7 flex flex-col sm:flex-row items-center gap-6">
          <div className="relative w-28 h-28 shrink-0 flex items-center justify-center">
            {/* Circular progress visual */}
            <svg className="w-full h-full transform -rotate-90" viewBox="0 0 36 36">
              <path
                className="text-slate-200"
                strokeWidth="3.5"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
              <path
                className="text-[#7C9CFF]"
                strokeDasharray="75, 100"
                strokeWidth="3.5"
                strokeLinecap="round"
                stroke="currentColor"
                fill="none"
                d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
              />
            </svg>
            <div className="absolute flex flex-col items-center">
              <span className="text-xl font-black text-[#2B2D42]">75%</span>
              <span className="text-[9px] font-black uppercase text-[#6E7387]">Overall</span>
            </div>
          </div>

          <div className="space-y-3 text-center sm:text-left flex-1">
            <h3 className="text-xl font-black text-[#2B2D42]">
              Continue where you left off
            </h3>
            <p className="text-xs font-semibold text-[#6E7387] leading-relaxed">
              You're doing great! Complete "{activeLesson.title}" to unlock the next level in {language}.
            </p>
            <div className="flex flex-wrap items-center justify-center sm:justify-start gap-3">
              <button
                type="button"
                onClick={() => setActiveLessonId(activeLesson.id)}
                className="clay-button px-6 py-2.5 text-xs font-black inline-flex items-center gap-2 clay-focus"
              >
                <Play className="w-3.5 h-3.5" />
                <span>Resume Lesson</span>
              </button>
              <button
                type="button"
                onClick={handleOpenQuiz}
                className="clay-button clay-button-white px-5 py-2.5 text-xs font-black inline-flex items-center gap-2 clay-focus"
              >
                <Zap className="w-3.5 h-3.5 text-amber-500" />
                <span>Take Quiz</span>
              </button>
            </div>
          </div>
        </div>

        {/* Daily Streak Card */}
        <div className="lg:col-span-4 clay-card p-7 flex flex-col justify-between">
          <div className="flex items-center justify-between">
            <span className="text-xs font-black text-[#6E7387] uppercase tracking-wider">
              Daily Streak
            </span>
            <div className="w-8 h-8 rounded-full bg-[#FFE8E2] flex items-center justify-center text-sm shadow-sm">
              <Flame className="w-4 h-4 text-[#FF8A8A]" />
            </div>
          </div>

          <div className="my-3">
            <p className="text-4xl font-black text-[#2B2D42]">12 Days</p>
          </div>

          {/* Streak dots */}
          <div className="flex items-center gap-1.5 pt-2">
            {[1, 1, 1, 1, 1, 0, 0].map((active, i) => (
              <span
                key={i}
                className={`h-2 flex-1 rounded-full ${
                  active ? 'bg-[#FF8A8A]' : 'bg-slate-200'
                }`}
              ></span>
            ))}
          </div>
        </div>
      </div>

      {/* Course Categories */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-black text-[#2B2D42]">{language} Course Categories</h3>
          {language === 'ASL' && (
            <span className="px-3 py-1 rounded-full text-xs font-black uppercase bg-[#FFE8E2] text-[#FF8A8A] border border-[#FFB59E]/40">
              Curriculum Available
            </span>
          )}
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {categories.map((cat, idx) => (
            <div
              key={idx}
              onClick={() => {
                if (!cat.locked) {
                  setActiveLessonId(cat.id);
                }
              }}
              className={`clay-card p-6 flex flex-col justify-between relative cursor-pointer ${
                cat.locked ? 'opacity-70 cursor-not-allowed' : 'hover:-translate-y-1'
              } transition-transform`}
            >
              <div>
                <div className="w-full aspect-square rounded-[22px] bg-white/70 flex items-center justify-center text-5xl mb-4 shadow-sm border border-slate-100">
                  {cat.emoji}
                </div>
                <h4 className="font-black text-base text-[#2B2D42]">{cat.title}</h4>
                <p className="text-[11px] font-semibold text-[#6E7387] mt-0.5">{cat.lessons}</p>
              </div>

              <div className="mt-5 pt-3 border-t border-slate-200/50">
                {cat.completed ? (
                  <div className="flex items-center justify-between text-xs font-bold text-emerald-600">
                    <div className="h-2 flex-1 bg-[#A8E6A1] rounded-full mr-2"></div>
                    <CheckCircle2 className="w-4 h-4 text-[#A8E6A1]" />
                  </div>
                ) : cat.locked ? (
                  <div className="flex items-center justify-between text-xs font-bold text-[#6E7387]">
                    <span className="text-[10px]">Locked</span>
                    <Lock className="w-3.5 h-3.5 text-[#6E7387]" />
                  </div>
                ) : (
                  <div>
                    <div className="flex justify-between text-[10px] font-black text-[#6E7387] mb-1">
                      <span>Progress</span>
                      <span>{cat.progress}%</span>
                    </div>
                    <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                      <div className="h-full bg-[#7C9CFF]" style={{ width: `${cat.progress}%` }}></div>
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Interactive Lesson Signs Breakdown (When Lesson Selected) */}
      {activeLesson && (
        <div className="clay-card p-7 space-y-6">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200/60">
            <div>
              <div className="flex items-center gap-2">
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-black uppercase bg-[#7C9CFF]/20 text-[#7C9CFF]">
                  {activeLesson.language} Lesson
                </span>
                <span className="text-xs font-semibold text-[#6E7387]">• {activeLesson.category}</span>
              </div>
              <h3 className="text-2xl font-black text-[#2B2D42] mt-1">{activeLesson.title}</h3>
              <p className="text-xs font-semibold text-[#6E7387] mt-1">{activeLesson.description}</p>
            </div>

            <button
              type="button"
              onClick={handleOpenQuiz}
              className="clay-button px-5 py-2.5 text-xs font-black inline-flex items-center gap-2 clay-focus shadow-clay-raised-sm shrink-0"
            >
              <Zap className="w-4 h-4 text-amber-500" />
              <span>Take Lesson Quiz</span>
            </button>
          </div>

          {/* Avatar Practice Preview when selected */}
          {practicingGloss && (
            <div className="p-5 rounded-2xl bg-white/70 border border-slate-200/60 space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-xs font-black text-[#2B2D42] uppercase tracking-wider flex items-center gap-2">
                  <Sparkles className="w-4 h-4 text-[#7C9CFF]" />
                  <span>3D Avatar Practice: {practicingGloss}</span>
                </span>
                <button
                  type="button"
                  onClick={() => setPracticingGloss(null)}
                  className="text-xs font-bold text-[#6E7387] hover:text-[#FF8A8A]"
                >
                  Close Practice
                </button>
              </div>
              <AvatarStage currentGloss={practicingGloss} speed={1.0} playing={true} />
            </div>
          )}

          {/* List of Signs with Voice Pronunciation and Avatar Practice */}
          <div className="space-y-3">
            <h4 className="text-xs font-black uppercase text-[#6E7387] tracking-wider">
              Signs in this lesson ({activeLesson.signs.length})
            </h4>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {(activeLesson.signs as SignItem[]).map((sign) => (
                <div
                  key={sign.gloss}
                  className="p-4 rounded-2xl bg-white/80 border border-slate-200/60 shadow-sm flex flex-col justify-between gap-3 hover:border-[#7C9CFF]/50 transition-all"
                >
                  <div className="flex items-start gap-3">
                    <div className="w-12 h-12 rounded-2xl bg-[#E9EEF7] flex items-center justify-center text-2xl shrink-0 shadow-inner">
                      {sign.emoji}
                    </div>
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-base font-black text-[#2B2D42]">{sign.word}</span>
                        <span className="text-[10px] font-black uppercase tracking-wider px-2 py-0.5 rounded-full bg-slate-100 text-[#6E7387]">
                          {sign.gloss}
                        </span>
                      </div>
                      <p className="text-xs font-medium text-[#6E7387] leading-relaxed">
                        {sign.description}
                      </p>
                    </div>
                  </div>

                  {/* Actions: Listen Pronunciation and Practice Gesture */}
                  <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => handleListenSign(sign.word)}
                      className="px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-[#7C9CFF]/15 text-[#2B2D42] hover:text-[#7C9CFF] text-xs font-bold flex items-center gap-1.5 transition-colors"
                      title="Listen to spoken pronunciation"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen</span>
                    </button>

                    <button
                      type="button"
                      onClick={() => handleStartPractice(sign.gloss, sign.word)}
                      className="px-3 py-1.5 rounded-xl bg-[#7C9CFF]/20 hover:bg-[#7C9CFF]/30 text-[#7C9CFF] text-xs font-black flex items-center gap-1.5 transition-colors"
                    >
                      <Play className="w-3 h-3" />
                      <span>Practice Sign</span>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* 5-Question Quiz Modal */}
      {quizActive && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="clay-card p-7 max-w-lg w-full space-y-6 relative animate-scaleUp">
            <button
              type="button"
              onClick={() => setQuizActive(false)}
              className="absolute right-5 top-5 p-2 rounded-full hover:bg-slate-100 text-[#6E7387]"
            >
              <X className="w-5 h-5" />
            </button>

            {!quizCompleted ? (
              <div className="space-y-5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-black uppercase text-[#7C9CFF] tracking-wider flex items-center gap-1.5">
                    <Zap className="w-4 h-4 text-amber-500" />
                    <span>Question {quizQuestionIndex + 1} of {(activeLesson.quiz as QuizItem[]).length}</span>
                  </span>
                  <span className="text-xs font-bold text-[#6E7387]">Score: {quizScore}</span>
                </div>

                {/* Progress bar */}
                <div className="h-2 w-full bg-slate-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-[#7C9CFF] transition-all"
                    style={{
                      width: `${((quizQuestionIndex + 1) / (activeLesson.quiz as QuizItem[]).length) * 100}%`,
                    }}
                  ></div>
                </div>

                {/* Question */}
                <div className="space-y-2">
                  <h3 className="text-lg font-black text-[#2B2D42]">
                    {(activeLesson.quiz as QuizItem[])[quizQuestionIndex]?.question}
                  </h3>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() =>
                        handleListenSign(
                          (activeLesson.quiz as QuizItem[])[quizQuestionIndex]?.question || ''
                        )
                      }
                      className="text-xs font-bold text-[#7C9CFF] hover:underline flex items-center gap-1"
                    >
                      <Volume2 className="w-3.5 h-3.5" />
                      <span>Listen Question</span>
                    </button>
                  </div>
                </div>

                {/* Options */}
                <div className="space-y-2.5">
                  {(activeLesson.quiz as QuizItem[])[quizQuestionIndex]?.options.map((opt) => {
                    const isSelected = selectedAnswer === opt;
                    const isCorrect = opt === (activeLesson.quiz as QuizItem[])[quizQuestionIndex]?.answer;
                    let btnStyle = 'bg-white hover:bg-slate-50 border-slate-200 text-[#2B2D42]';

                    if (selectedAnswer !== null) {
                      if (isCorrect) {
                        btnStyle = 'bg-emerald-100 border-emerald-400 text-emerald-800 font-extrabold';
                      } else if (isSelected) {
                        btnStyle = 'bg-red-100 border-red-400 text-red-800 font-extrabold';
                      }
                    }

                    return (
                      <button
                        key={opt}
                        type="button"
                        onClick={() => handleSelectOption(opt)}
                        className={`w-full p-3.5 rounded-2xl border text-left text-xs font-black transition-all flex items-center justify-between ${btnStyle}`}
                      >
                        <span>{opt}</span>
                        {selectedAnswer !== null && isCorrect && (
                          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                        )}
                      </button>
                    );
                  })}
                </div>

                {/* Next button */}
                {selectedAnswer !== null && (
                  <button
                    type="button"
                    onClick={handleNextQuizQuestion}
                    className="clay-button w-full py-3 text-xs font-black flex items-center justify-center gap-2 clay-focus shadow-clay-raised-sm"
                  >
                    <span>
                      {quizQuestionIndex < (activeLesson.quiz as QuizItem[]).length - 1
                        ? 'Next Question'
                        : 'View Results'}
                    </span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            ) : (
              /* Quiz Completion Screen */
              <div className="text-center space-y-5 py-4">
                <div className="w-16 h-16 rounded-full bg-[#FFE8E2] text-[#FF8A8A] flex items-center justify-center mx-auto text-3xl shadow-sm">
                  <Award className="w-8 h-8" />
                </div>
                <div>
                  <h3 className="text-2xl font-black text-[#2B2D42]">Quiz Complete!</h3>
                  <p className="text-xs font-semibold text-[#6E7387] mt-1">
                    You scored <strong className="text-[#2B2D42]">{quizScore} / {(activeLesson.quiz as QuizItem[]).length}</strong>. 
                    {quizScore >= 4 ? ' Outstanding work!' : ' Great effort, keep practicing!'}
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-white/70 border border-slate-200/60 flex items-center justify-around">
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#6E7387]">XP Earned</span>
                    <p className="text-xl font-black text-amber-500">+{quizScore * 20} XP</p>
                  </div>
                  <div>
                    <span className="text-[10px] font-black uppercase text-[#6E7387]">Streak</span>
                    <p className="text-xl font-black text-[#FF8A8A]">+1 Day</p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={() => setQuizActive(false)}
                  className="clay-button w-full py-3 text-xs font-black clay-focus"
                >
                  Done
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Bottom Practice & Quiz Shortcut Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div
          onClick={() => setActiveLessonId(activeLesson.id)}
          className="clay-card p-6 flex items-center justify-between cursor-pointer group clay-focus"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#FFE8E2] flex items-center justify-center text-[#FF8A8A] shadow-sm">
              <Camera className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-base text-[#2B2D42] group-hover:text-[#7C9CFF] transition-colors">
                Sign Practice
              </h4>
              <p className="text-xs font-semibold text-[#6E7387]">
                Turn on your camera and practice gestures with real-time feedback.
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#6E7387] group-hover:translate-x-1 transition-transform" />
        </div>

        <div
          onClick={handleOpenQuiz}
          className="clay-card p-6 flex items-center justify-between cursor-pointer group clay-focus"
        >
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-2xl bg-[#E2EBFF] flex items-center justify-center text-[#7C9CFF] shadow-sm">
              <Zap className="w-6 h-6" />
            </div>
            <div>
              <h4 className="font-black text-base text-[#2B2D42] group-hover:text-[#7C9CFF] transition-colors">
                Daily Quiz
              </h4>
              <p className="text-xs font-semibold text-[#6E7387]">
                Test your knowledge and earn extra XP for your daily streak.
              </p>
            </div>
          </div>
          <ChevronRight className="w-5 h-5 text-[#6E7387] group-hover:translate-x-1 transition-transform" />
        </div>
      </div>
    </div>
  );
};
