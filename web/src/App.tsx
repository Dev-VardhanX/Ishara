import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { HandMetal } from 'lucide-react';

// Code-split pages so Three.js, MediaPipe, etc. load only when visited
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const SignToVoicePage = lazy(() => import('./pages/SignToVoicePage').then((m) => ({ default: m.SignToVoicePage })));
const VoiceToSignPage = lazy(() => import('./pages/VoiceToSignPage').then((m) => ({ default: m.VoiceToSignPage })));
const LearnPage = lazy(() => import('./pages/LearnPage').then((m) => ({ default: m.LearnPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const DevPosePage = lazy(() => import('./pages/DevPosePage').then((m) => ({ default: m.DevPosePage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));

// Accessible, claymorphic loading skeleton during dynamic route import
const PageFallback: React.FC = () => (
  <div className="min-h-screen bg-[#E9EEF7] flex items-center justify-center p-6 select-none" role="status" aria-label="Loading page">
    <div className="clay-card p-8 flex flex-col items-center gap-3.5 bg-[#E9EEF7] border border-white/60">
      <div className="w-12 h-12 rounded-2xl bg-[#7C9CFF] flex items-center justify-center text-white shadow-clay-raised">
        <HandMetal className="w-6 h-6 animate-pulse" />
      </div>
      <span className="text-xs font-black text-[#2B2D42] tracking-wider uppercase">Loading Ishara...</span>
    </div>
  </div>
);

export const App: React.FC = () => {
  const isProd = import.meta.env.PROD;

  return (
    <AuthProvider>
      <ToastProvider>
        <Suspense fallback={<PageFallback />}>
          <Routes>
            {/* Public Unauthenticated Views */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Protected App Routes Wrapped in App Shell Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/sign-to-voice" element={<SignToVoicePage />} />
                <Route path="/voice-to-sign" element={<VoiceToSignPage />} />
                <Route path="/learn" element={<LearnPage />} />
                <Route path="/history" element={<HistoryPage />} />
                {/* Dev Route: Redirect to / in production */}
                <Route
                  path="/dev/*"
                  element={isProd ? <Navigate to="/" replace /> : <DevPosePage />}
                />
                <Route path="/settings" element={<SettingsPage />} />
              </Route>
            </Route>

            {/* 404 Not Found in Claymorphism Style */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </ToastProvider>
    </AuthProvider>
  );
};

export default App;
