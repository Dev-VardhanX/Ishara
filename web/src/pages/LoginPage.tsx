import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation, NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  HandMetal,
  Mail,
  Lock,
  Eye,
  EyeOff,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Sparkles
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, login, signup, resetPassword, isConfigured } = useAuth();

  // Mode: Sign In or Sign Up
  const [isSignUp, setIsSignUp] = useState(false);

  // Form states
  const [email, setEmail] = useState('ananya@ishara.ai');
  const [password, setPassword] = useState('password123');
  const [showPassword, setShowPassword] = useState(false);
  const [keepMeSignedIn, setKeepMeSignedIn] = useState(true);

  // UI state
  const [formError, setFormError] = useState<string | null>(null);
  const [infoMessage, setInfoMessage] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Target destination after login
  const from = (location.state as any)?.from?.pathname || '/dashboard';

  // Update page title
  useEffect(() => {
    document.title = isSignUp ? 'Sign Up — Ishara' : 'Sign In — Ishara';
  }, [isSignUp]);

  // If already authenticated, redirect
  useEffect(() => {
    if (user) {
      navigate(from, { replace: true });
    }
  }, [user, navigate, from]);

  // Form validation and submission
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setInfoMessage(null);

    // Basic Client-side Validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email || !emailRegex.test(email.trim())) {
      setFormError('Please enter a valid email address.');
      return;
    }

    if (!password || password.length < 6) {
      setFormError('Password must be at least 6 characters long.');
      return;
    }

    setIsSubmitting(true);

    try {
      if (isSignUp) {
        const { error, message } = await signup(email.trim(), password);
        if (error) {
          setFormError(error);
          setIsSubmitting(false);
          return;
        }
        if (message) {
          setInfoMessage(message);
        }
      } else {
        const { error } = await login(email.trim(), password, keepMeSignedIn);
        if (error) {
          setFormError(error);
          setIsSubmitting(false);
          return;
        }
      }

      // Success: redirect to target
      navigate(from, { replace: true });
    } catch (err: any) {
      setFormError(err?.message || 'An unexpected error occurred. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleForgotPassword = async () => {
    setFormError(null);
    setInfoMessage(null);
    if (!email || !email.includes('@')) {
      setFormError('Please enter your email address in the field below first.');
      return;
    }
    setIsSubmitting(true);
    try {
      const { error, message } = await resetPassword(email.trim());
      if (error) {
        setFormError(error);
      } else if (message) {
        setInfoMessage(message);
      }
    } catch (err: any) {
      setFormError(err?.message || 'Failed to send password reset email.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#E9EEF7] flex items-center justify-center p-4 sm:p-6 md:p-10 select-none">
      <div className="clay-card w-full max-w-5xl grid grid-cols-1 md:grid-cols-12 overflow-hidden bg-[#E9EEF7]">
        {/* Left Side: Illustration & Welcome Message Panel */}
        <div className="md:col-span-5 bg-gradient-to-b from-[#EEF4FF] via-[#E6EFFD] to-[#DFEAF9] p-8 lg:p-10 flex flex-col items-center justify-center text-center border-b md:border-b-0 md:border-r border-slate-200/50">
          <div className="w-full max-w-[320px] aspect-[3/4] rounded-[24px] overflow-hidden shadow-clay-raised mb-6 bg-slate-200 border-2 border-white/80">
            <img
              src="/login-character.jpg"
              alt="Ishara 3D sign language avatar"
              width={896}
              height={1200}
              className="w-full h-full object-cover object-center"
              onError={(e) => {
                // Fallback illustration if image fails to load
                (e.target as HTMLElement).style.display = 'none';
              }}
            />
          </div>

          <h2 className="text-2xl lg:text-3xl font-black text-[#2B2D42] tracking-tight">
            {isSignUp ? 'Join Ishara Today!' : 'Welcome Back!'}
          </h2>
          <p className="text-xs font-semibold text-[#6E7387] max-w-xs mt-2.5 leading-relaxed">
            "Every gesture matters. We're here to help you connect with the world."
          </p>
        </div>

        {/* Right Side: Auth Form Panel */}
        <div className="md:col-span-7 p-8 lg:p-12 flex flex-col justify-center bg-[#E9EEF7]">
          {/* Brand header */}
          <div className="flex items-center justify-between mb-6">
            <NavLink to="/" className="flex items-center gap-2.5 clay-focus rounded-xl">
              <div className="w-9 h-9 rounded-xl bg-[#7C9CFF] flex items-center justify-center text-white shadow-clay-raised-sm">
                <HandMetal className="w-5 h-5" />
              </div>
              <span className="font-extrabold text-xl text-[#2B2D42] tracking-tight">Ishara</span>
            </NavLink>

            {/* Backend mode pill */}
            <div
              className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-wider border flex items-center gap-1.5 ${
                isConfigured
                  ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                  : 'bg-white/80 text-[#7C9CFF] border-slate-200/80 shadow-sm'
              }`}
              title={
                isConfigured
                  ? 'Connected to live Supabase Auth instance'
                  : 'Using offline mock authentication (accepts any email)'
              }
            >
              <span
                className={`w-2 h-2 rounded-full ${
                  isConfigured ? 'bg-emerald-500 animate-pulse' : 'bg-[#7C9CFF]'
                }`}
              ></span>
              <span>{isConfigured ? 'Supabase Auth' : 'Demo Mock Auth'}</span>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-[#2B2D42] tracking-tight">
            {isSignUp ? 'Create an Account' : 'Sign In'}
          </h1>
          <p className="text-xs font-semibold text-[#6E7387] mt-1 mb-6">
            {isSignUp
              ? 'Enter your details to create your personal learning profile.'
              : 'Enter your details to access your translator.'}
          </p>

          {/* Social Sign In (Visible but disabled) */}
          <div className="relative mb-6">
            <button
              type="button"
              disabled
              className="clay-button clay-button-white w-full py-3 flex items-center justify-center gap-3 text-xs font-bold opacity-60 cursor-not-allowed border border-slate-200/60"
              title="Google Single Sign-On coming soon in v1.1"
            >
              <svg className="w-4 h-4" viewBox="0 0 24 24">
                <path
                  fill="#4285F4"
                  d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                />
                <path
                  fill="#34A853"
                  d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                />
                <path
                  fill="#FBBC05"
                  d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                />
                <path
                  fill="#EA4335"
                  d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                />
              </svg>
              <span>Continue with Google</span>
              <span className="text-[9px] uppercase tracking-wider font-black px-1.5 py-0.5 rounded bg-slate-100 text-slate-500">
                Soon
              </span>
            </button>
          </div>

          {/* Divider */}
          <div className="relative flex py-1 items-center mb-6">
            <div className="flex-grow border-t border-slate-300"></div>
            <span className="flex-shrink mx-4 text-[10px] font-black uppercase text-[#6E7387] tracking-widest">
              or with email
            </span>
            <div className="flex-grow border-t border-slate-300"></div>
          </div>

          {/* Error Banner */}
          {formError && (
            <div className="mb-4 p-3.5 rounded-2xl bg-[#FFE8E2] border border-[#FF8A8A]/40 text-[#2B2D42] flex items-center gap-2.5 text-xs font-bold animate-fade-in">
              <AlertCircle className="w-4 h-4 text-[#FF8A8A] shrink-0" />
              <span>{formError}</span>
            </div>
          )}

          {/* Success / Info Message Banner */}
          {infoMessage && (
            <div className="mb-4 p-3.5 rounded-2xl bg-[#E5F8E2] border border-[#A8E6A1] text-emerald-900 flex items-center gap-2.5 text-xs font-bold animate-fade-in">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{infoMessage}</span>
            </div>
          )}

          {/* Auth Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-black text-[#2B2D42] mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="clay-input w-full text-xs font-semibold pl-10"
                  required
                  disabled={isSubmitting}
                />
                <Mail className="w-4 h-4 text-[#6E7387] absolute left-3.5 top-1/2 -translate-y-1/2" />
              </div>
            </div>

            <div>
              <div className="flex justify-between items-center mb-1.5">
                <label className="block text-xs font-black text-[#2B2D42]">
                  Password
                </label>
                {!isSignUp && (
                  <button
                    type="button"
                    onClick={handleForgotPassword}
                    disabled={isSubmitting}
                    className="text-[11px] font-bold text-[#7C9CFF] hover:underline cursor-pointer"
                  >
                    Forgot?
                  </button>
                )}
              </div>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="clay-input w-full text-xs font-semibold pl-10 pr-10"
                  required
                  disabled={isSubmitting}
                />
                <Lock className="w-4 h-4 text-[#6E7387] absolute left-3.5 top-1/2 -translate-y-1/2" />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-[#6E7387] hover:text-[#2B2D42]"
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Keep me signed in (only in Sign In mode) */}
            {!isSignUp && (
              <div className="flex items-center gap-2 pt-1">
                <input
                  id="keep-signed-in"
                  type="checkbox"
                  checked={keepMeSignedIn}
                  onChange={(e) => setKeepMeSignedIn(e.target.checked)}
                  className="w-4 h-4 rounded text-[#7C9CFF] focus:ring-[#7C9CFF] border-slate-300 cursor-pointer"
                />
                <label
                  htmlFor="keep-signed-in"
                  className="text-xs font-bold text-[#6E7387] cursor-pointer"
                >
                  Keep me signed in
                </label>
              </div>
            )}

            {/* Submit Button */}
            <button
              type="submit"
              disabled={isSubmitting}
              className="clay-button w-full py-3.5 text-sm font-black clay-focus mt-2 flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>{isSignUp ? 'Creating Account...' : 'Signing In...'}</span>
                </>
              ) : (
                <span>{isSignUp ? 'Create an Account' : 'Sign In'}</span>
              )}
            </button>
          </form>

          {/* Toggle between Sign In and Sign Up */}
          <div className="text-center text-xs font-semibold text-[#6E7387] mt-6">
            {isSignUp ? (
              <p>
                Already have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(false);
                    setFormError(null);
                  }}
                  className="text-[#7C9CFF] font-black hover:underline"
                >
                  Sign In
                </button>
              </p>
            ) : (
              <p>
                Don't have an account?{' '}
                <button
                  type="button"
                  onClick={() => {
                    setIsSignUp(true);
                    setFormError(null);
                  }}
                  className="text-[#7C9CFF] font-black hover:underline"
                >
                  Create an account
                </button>
              </p>
            )}
          </div>

          {/* Security note */}
          <div className="flex items-center justify-center gap-1.5 text-[11px] font-semibold text-[#6E7387] mt-6 pt-4 border-t border-slate-200/60">
            <ShieldCheck className="w-3.5 h-3.5 text-[#A8E6A1]" />
            <span>Your data is processed securely and privately.</span>
          </div>
        </div>
      </div>
    </div>
  );
};
