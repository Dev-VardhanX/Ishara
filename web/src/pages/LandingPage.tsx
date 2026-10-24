import React, { useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import {
  HandMetal,
  ArrowRight,
  Video,
  MessageSquare,
  ShieldCheck,
  Lock,
  Volume2,
  BookOpen,
  Camera,
  Layers,
  Sparkles,
  CheckCircle2,
  ExternalLink,
  Laptop,
  Instagram,
} from 'lucide-react';

export const LandingPage: React.FC = () => {
  useEffect(() => {
    document.title = 'Ishara — Two-Way Sign Language Translator';
  }, []);

  return (
    <div className="min-h-screen bg-[#E9EEF7] text-[#2B2D42] selection:bg-[#7C9CFF]/30 select-none">
      {/* Sticky Navbar */}
      <header className="sticky top-0 z-50 bg-[#E9EEF7]/85 backdrop-blur-md border-b border-slate-200/50 transition-all">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-4 flex items-center justify-between">
          {/* Logo */}
          <NavLink to="/" className="flex items-center gap-3 clay-focus rounded-2xl group">
            <div className="w-10 h-10 rounded-2xl bg-[#7C9CFF] flex items-center justify-center text-white shadow-clay-raised">
              <HandMetal className="w-6 h-6 transform group-hover:scale-110 transition-transform" />
            </div>
            <span className="text-2xl font-black text-[#2B2D42] tracking-tight">Ishara</span>
          </NavLink>

          {/* Center Links */}
          <nav className="hidden md:flex items-center gap-7 font-bold text-sm text-[#6E7387]">
            <a href="#hero" className="text-[#2B2D42] hover:text-[#7C9CFF] transition-colors clay-focus rounded-lg px-2 py-1">
              Home
            </a>
            <NavLink to="/voice-to-sign" className="hover:text-[#2B2D42] transition-colors clay-focus rounded-lg px-2 py-1">
              Translate
            </NavLink>
            <NavLink to="/login" className="hover:text-[#2B2D42] transition-colors clay-focus rounded-lg px-2 py-1">
              Learn
            </NavLink>
            <a href="#features" className="hover:text-[#2B2D42] transition-colors clay-focus rounded-lg px-2 py-1">
              Features
            </a>
            <a href="#privacy" className="hover:text-[#2B2D42] transition-colors clay-focus rounded-lg px-2 py-1">
              About
            </a>
          </nav>

          {/* Action Buttons */}
          <div className="flex items-center gap-3">
            <NavLink
              to="/login"
              className="px-5 py-2 rounded-clay font-black text-xs text-[#2B2D42] hover:bg-white/60 clay-focus transition-all"
            >
              Login
            </NavLink>
            <NavLink
              to="/login"
              className="clay-button px-5 py-2.5 text-xs font-black clay-focus"
            >
              Sign Up
            </NavLink>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section id="hero" className="max-w-7xl mx-auto px-4 sm:px-6 pt-10 pb-20">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-12 items-center">
          {/* Left Text Column */}
          <div className="lg:col-span-7 space-y-6">
            <h1  className="text-6xl sm:text-8xl font-black text-[#2B2D42] tracking-tight leading-[1.12]">
              ISHARA
            </h1>
            <div className="inline-block px-4 py-1.5 rounded-full bg-white/80 border border-slate-200/60 text-[11px] font-black text-[#7C9CFF] uppercase tracking-wider shadow-sm">
              Revolutionizing Accessibility
            </div>

            <h1 className="text-4xl sm:text-6xl font-black text-[#2B2D42] tracking-tight leading-[1.12]">
              Communication <br />
              <span className="text-[#7C9CFF]">Without</span> Barriers.
            </h1>

            <p className="text-base sm:text-lg font-semibold text-[#6E7387] max-w-xl leading-relaxed">
              Breaking the silence through real-time AI powered two-way sign language translation. Connect with everyone, everywhere.
            </p>

            <div className="flex flex-wrap items-center gap-4 pt-2">
              <NavLink
                to="/voice-to-sign"
                className="clay-button flex items-center gap-2 text-sm sm:text-base px-7 py-3.5 clay-focus"
              >
                <span>Start Translating</span>
                <ArrowRight className="w-5 h-5" />
              </NavLink>

              <NavLink
                to="/login"
                className="clay-button clay-button-coral text-sm sm:text-base px-7 py-3.5 clay-focus font-extrabold"
              >
                Explore Sign Language
              </NavLink>
            </div>
          </div>

          {/* Right Image Slot with Two Floating Cards */}
          <div className="lg:col-span-5 relative">
            <div className="clay-card p-4 sm:p-5 relative bg-gradient-to-b from-[#E9EEF7] via-[#DFE8F6] to-[#D5E1F2] border border-white/60">
              {/* Character Image Slot */}
              <div className="w-full aspect-[3/4] rounded-[24px] overflow-hidden bg-slate-200 border border-white/80 shadow-inner relative flex items-center justify-center">
                <img
                  src="/hero-character.jpg"
                  alt="Ishara 3D sign language avatar"
                  width={896}
                  height={1200}
                  className="w-full h-full object-cover object-top"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
              </div>

              {/* Floating Card Top-Right: Sign to Text */}
              <NavLink
                to="/login"
                className="absolute top-6 sm:top-8 -right-2 sm:-right-4 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl shadow-clay-raised border border-white max-w-[210px] sm:max-w-[230px] clay-focus group hover:-translate-y-1 transition-transform"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-[#FFE8E2] text-[#FF8A8A] flex items-center justify-center text-xs">
                    <Video className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-[#2B2D42] group-hover:text-[#7C9CFF] transition-colors">
                    Sign to Text
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-[#6E7387] leading-snug">
                  Instantly translate gestures into text/speech.
                </p>
              </NavLink>

              {/* Floating Card Bottom-Left: Voice to Sign */}
              <NavLink
                to="/voice-to-sign"
                className="absolute bottom-6 sm:bottom-8 -left-2 sm:-left-4 bg-white/95 backdrop-blur-md p-3.5 sm:p-4 rounded-2xl shadow-clay-raised border border-white max-w-[210px] sm:max-w-[230px] clay-focus group hover:-translate-y-1 transition-transform"
              >
                <div className="flex items-center gap-2.5 mb-1">
                  <div className="w-6 h-6 rounded-lg bg-[#E2EBFF] text-[#7C9CFF] flex items-center justify-center text-xs">
                    <MessageSquare className="w-3.5 h-3.5" />
                  </div>
                  <span className="text-xs font-black text-[#2B2D42] group-hover:text-[#7C9CFF] transition-colors">
                    Voice to Sign
                  </span>
                </div>
                <p className="text-[11px] font-semibold text-[#6E7387] leading-snug">
                  Avatar performs sign language in real-time.
                </p>
              </NavLink>
            </div>
          </div>
        </div>
      </section>

      {/* Empowering Connections (4 Cards) */}
      <section id="features" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-2xl mx-auto mb-12">
          <h2 className="text-2xl sm:text-4xl font-black text-[#2B2D42] tracking-tight">
            Empowering Connections
          </h2>
          <p className="text-xs sm:text-sm font-semibold text-[#6E7387] mt-2 leading-relaxed">
            Ishara combines advanced computer vision with friendly 3D interfaces to make communication effortless.
          </p>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
          {/* Card 1: ISL + ASL Support */}
          <div className="clay-card p-7 flex flex-col items-center text-center justify-between">
            <div>
              <div className="w-16 h-16 rounded-[22px] bg-white/80 flex items-center justify-center mb-5 shadow-sm border border-slate-100">
                <HandMetal className="w-8 h-8 text-[#7C9CFF]" />
              </div>
              <h3 className="font-black text-lg text-[#2B2D42]">ISL + ASL Support</h3>
              <p className="text-xs font-semibold text-[#6E7387] mt-2.5 leading-relaxed">
                Full dual vocabulary support for Indian and American Sign Languages.
              </p>
            </div>
          </div>

          {/* Card 2: Voice Output */}
          <div className="clay-card p-7 flex flex-col items-center text-center justify-between">
            <div>
              <div className="w-16 h-16 rounded-[22px] bg-white/80 flex items-center justify-center mb-5 shadow-sm border border-slate-100">
                <Volume2 className="w-8 h-8 text-[#FF8A8A]" />
              </div>
              <h3 className="font-black text-lg text-[#2B2D42]">Voice Output</h3>
              <p className="text-xs font-semibold text-[#6E7387] mt-2.5 leading-relaxed">
                Crystal clear voice synthesis with emotional pitch and rate modulation.
              </p>
            </div>
          </div>

          {/* Card 3: Sign Learning */}
          <div className="clay-card p-7 flex flex-col items-center text-center justify-between">
            <div>
              <div className="w-16 h-16 rounded-[22px] bg-white/80 flex items-center justify-center mb-5 shadow-sm border border-slate-100">
                <BookOpen className="w-8 h-8 text-[#5ECB82]" />
              </div>
              <h3 className="font-black text-lg text-[#2B2D42]">Sign Learning</h3>
              <p className="text-xs font-semibold text-[#6E7387] mt-2.5 leading-relaxed">
                Interactive lessons and real-time practice feedback for beginners.
              </p>
            </div>
          </div>

          {/* Card 4: Live Translation */}
          <div className="clay-card p-7 flex flex-col items-center text-center justify-between">
            <div>
              <div className="w-16 h-16 rounded-[22px] bg-white/80 flex items-center justify-center mb-5 shadow-sm border border-slate-100">
                <Sparkles className="w-8 h-8 text-[#B39DDB]" />
              </div>
              <h3 className="font-black text-lg text-[#2B2D42]">Live Translation</h3>
              <p className="text-xs font-semibold text-[#6E7387] mt-2.5 leading-relaxed">
                Real-time gesture recognition directly in your browser with MediaPipe.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Simple as 1-2-3 Section */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="text-center max-w-xl mx-auto mb-14">
          <h2 className="text-2xl sm:text-4xl font-black text-[#2B2D42] tracking-tight">
            Simple as 1-2-3
          </h2>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-8 text-center max-w-5xl mx-auto">
          {/* Step 1 */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#7C9CFF] text-white font-black text-xl flex items-center justify-center shadow-clay-raised">
              1
            </div>
            <h3 className="text-lg font-black text-[#2B2D42]">Position Camera</h3>
            <p className="text-xs font-semibold text-[#6E7387] leading-relaxed max-w-xs">
              Place your device so the camera can see your hands and upper body.
            </p>
          </div>

          {/* Step 2 */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#FF8A8A] text-white font-black text-xl flex items-center justify-center shadow-clay-raised">
              2
            </div>
            <h3 className="text-lg font-black text-[#2B2D42]">Start Signing</h3>
            <p className="text-xs font-semibold text-[#6E7387] leading-relaxed max-w-xs">
              AI recognizes gestures and converts them to text or voice instantly.
            </p>
          </div>

          {/* Step 3 */}
          <div className="flex flex-col items-center space-y-4">
            <div className="w-14 h-14 rounded-full bg-[#A8E6A1] text-[#2B2D42] font-black text-xl flex items-center justify-center shadow-clay-raised">
              3
            </div>
            <h3 className="text-lg font-black text-[#2B2D42]">Get Translated</h3>
            <p className="text-xs font-semibold text-[#6E7387] leading-relaxed max-w-xs">
              Non-signers can reply via voice/text, which Ishara's avatar signs back.
            </p>
          </div>
        </div>
      </section>

      {/* Privacy Section (Honest claims replacing false stats) */}
      <section id="privacy" className="max-w-7xl mx-auto px-4 sm:px-6 py-16">
        <div className="clay-card p-8 sm:p-12 bg-white/70">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
            {/* Left Column: Privacy statement */}
            <div className="lg:col-span-6 space-y-6">
              <h2 className="text-2xl sm:text-3xl font-black text-[#2B2D42] tracking-tight">
                Your Privacy is Our Priority
              </h2>

              <div className="space-y-4">
                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E5F8E2] text-emerald-600 flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <ShieldCheck className="w-5 h-5 text-[#5ECB82]" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#2B2D42]">On-Device Processing</h4>
                    <p className="text-xs font-semibold text-[#6E7387] mt-0.5 leading-relaxed">
                      Camera frames and pose landmarks are processed locally in your browser. Video streams are never sent to external servers.
                    </p>
                  </div>
                </div>

                <div className="flex items-start gap-3.5">
                  <div className="w-9 h-9 rounded-xl bg-[#E2EBFF] text-[#7C9CFF] flex items-center justify-center shrink-0 shadow-sm mt-0.5">
                    <Lock className="w-5 h-5" />
                  </div>
                  <div>
                    <h4 className="text-sm font-black text-[#2B2D42]">Secure Cloud Sync</h4>
                    <p className="text-xs font-semibold text-[#6E7387] mt-0.5 leading-relaxed">
                      Conversation history is stored in Supabase with user Row Level Security (RLS) only when you sign in.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: 4 Honest Claim Cards */}
            <div className="lg:col-span-6 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div className="p-5 rounded-[22px] bg-[#E9EEF7] border border-slate-200/60 shadow-sm text-center flex flex-col items-center justify-center">
                <Laptop className="w-7 h-7 text-[#7C9CFF] mb-1" />
                <p className="text-sm font-black text-[#2B2D42] mt-1">Video never leaves your device</p>
                <p className="text-[10px] font-bold text-[#6E7387] uppercase tracking-wider mt-0.5">Local MediaPipe Vision</p>
              </div>

              <div className="p-5 rounded-[22px] bg-[#E9EEF7] border border-slate-200/60 shadow-sm text-center flex flex-col items-center justify-center">
                <Lock className="w-7 h-7 text-[#FF8A8A] mb-1" />
                <p className="text-sm font-black text-[#2B2D42] mt-1">HTTPS everywhere</p>
                <p className="text-[10px] font-bold text-[#6E7387] uppercase tracking-wider mt-0.5">Encrypted Transit</p>
              </div>

              <div className="p-5 rounded-[22px] bg-[#E9EEF7] border border-slate-200/60 shadow-sm text-center flex flex-col items-center justify-center">
                <ShieldCheck className="w-7 h-7 text-[#5ECB82] mb-1" />
                <p className="text-sm font-black text-[#2B2D42] mt-1">No data resale</p>
                <p className="text-[10px] font-bold text-[#6E7387] uppercase tracking-wider mt-0.5">Zero Monetization</p>
              </div>

              <div className="p-5 rounded-[22px] bg-[#E9EEF7] border border-slate-200/60 shadow-sm text-center flex flex-col items-center justify-center">
                <CheckCircle2 className="w-7 h-7 text-[#B39DDB] mb-1" />
                <p className="text-sm font-black text-[#2B2D42] mt-1">Open about limits</p>
                <p className="text-[10px] font-bold text-[#6E7387] uppercase tracking-wider mt-0.5">Clear Model Vocab</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Footer (Year 2026, Language Packs and Mobile App removed) */}
      <footer className="border-t border-slate-200/60 bg-[#DFE7F5]/50 pt-14 pb-8">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="grid grid-cols-1 md:grid-cols-12 gap-8 pb-10 border-b border-slate-200/60">
            {/* Brand column */}
            <div className="md:col-span-5 space-y-3">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#7C9CFF] flex items-center justify-center text-white shadow-clay-raised-sm">
                  <HandMetal className="w-4 h-4" />
                </div>
                <span className="font-black text-xl text-[#2B2D42]">Ishara</span>
              </div>
              <p className="text-xs font-semibold text-[#6E7387] italic">
                "Every Gesture. Every Voice. One Connection."
              </p>
            </div>

            {/* Product Links Column (Language Packs and Mobile App removed) */}
            <div className="md:col-span-3 space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#2B2D42]">Product</h4>
              <ul className="space-y-2 text-xs font-bold text-[#6E7387]">
                <li>
                  <NavLink to="/voice-to-sign" className="hover:text-[#7C9CFF] transition-colors">
                    Translate
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/login" className="hover:text-[#7C9CFF] transition-colors">
                    Learn Sign
                  </NavLink>
                </li>
                <li>
                  <NavLink to="/login" className="hover:text-[#7C9CFF] transition-colors">
                    Sign to Voice
                  </NavLink>
                </li>
              </ul>
            </div>

            {/* Support Column */}
            <div className="md:col-span-2 space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#2B2D42]">Support</h4>
              <ul className="space-y-2 text-xs font-bold text-[#6E7387]">
                <li>
                  <a href="#privacy" className="hover:text-[#7C9CFF] transition-colors">Help Center</a>
                </li>
                <li>
                  <a href="#privacy" className="hover:text-[#7C9CFF] transition-colors">Accessibility</a>
                </li>
                <li>
                  <a href="#privacy" className="hover:text-[#7C9CFF] transition-colors">Privacy Policy</a>
                </li>
                <li>
                  <a href="#privacy" className="hover:text-[#7C9CFF] transition-colors">Contact Us</a>
                </li>
              </ul>
            </div>

            {/* Stay Connected Column */}
            <div className="md:col-span-2 space-y-2.5">
              <h4 className="text-xs font-black uppercase tracking-wider text-[#2B2D42]">Stay Connected</h4>
              <div className="flex items-center gap-2 pt-1">
                <a
                  href="#social"
                  className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#2B2D42] flex items-center justify-center text-xs shadow-sm clay-focus"
                  title="Twitter / X"
                >
                  𝕏
                </a>
                <a
                  href="#social"
                  className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#2B2D42] flex items-center justify-center text-xs shadow-sm clay-focus"
                  title="Instagram"
                >
                  <Instagram className="w-3.5 h-3.5" />
                </a>
                <a
                  href="#social"
                  className="w-8 h-8 rounded-full bg-white/80 hover:bg-white text-[#2B2D42] flex items-center justify-center text-xs shadow-sm clay-focus"
                  title="LinkedIn"
                >
                  in
                </a>
              </div>
            </div>
          </div>

          {/* Copyright Row */}
          <div className="pt-6 text-center text-xs font-semibold text-[#6E7387]">
            © 2026 Ishara AI. Built with love for a more inclusive world.
          </div>
        </div>
      </footer>
    </div>
  );
};
