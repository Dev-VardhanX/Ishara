import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { IsharaLogo } from './components/IsharaLogo';
import { t } from './store/useLocaleStore';

// Code-split pages so Three.js, MediaPipe, etc. load only when visited
const LandingPage = lazy(() => import('./pages/LandingPage').then((m) => ({ default: m.LandingPage })));
const LoginPage = lazy(() => import('./pages/LoginPage').then((m) => ({ default: m.LoginPage })));
const DashboardPage = lazy(() => import('./pages/DashboardPage').then((m) => ({ default: m.DashboardPage })));
const SignToVoicePage = lazy(() => import('./pages/SignToVoicePage').then((m) => ({ default: m.SignToVoicePage })));
const VoiceToSignPage = lazy(() => import('./pages/VoiceToSignPage').then((m) => ({ default: m.VoiceToSignPage })));
const LearnPage = lazy(() => import('./pages/LearnPage').then((m) => ({ default: m.LearnPage })));
const HistoryPage = lazy(() => import('./pages/HistoryPage').then((m) => ({ default: m.HistoryPage })));
const DevPosePage = lazy(() => import('./pages/DevPosePage').then((m) => ({ default: m.DevPosePage })));
const SignRecorderPage = lazy(() => import('./pages/SignRecorderPage').then((m) => ({ default: m.SignRecorderPage })));
const AvatarDemoPage = lazy(() => import('./pages/AvatarDemoPage').then((m) => ({ default: m.AvatarDemoPage })));
const SettingsPage = lazy(() => import('./pages/SettingsPage').then((m) => ({ default: m.SettingsPage })));
const NotFoundPage = lazy(() => import('./pages/NotFoundPage').then((m) => ({ default: m.NotFoundPage })));
const EmergencyPage = lazy(() => import('./pages/EmergencyPage').then((m) => ({ default: m.EmergencyPage })));

// Accessible, claymorphic loading skeleton during dynamic route import
const PageFallback: React.FC = () => (
  <div className="min-h-screen bg-[#E9EEF7] flex items-center justify-center p-6 select-none" role="status" aria-label={t('common.loadingPage')}>
    <div className="clay-card p-8 flex flex-col items-center gap-3.5 bg-[#E9EEF7] border border-white/60">
      <IsharaLogo size="lg" animate={true} showWordmark={true} />
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

            {/* Emergency Mode: Reachable without login (guest mode) and offline */}
            <Route element={<AppLayout />}>
              <Route path="/emergency" element={<EmergencyPage />} />
            </Route>

            {/* Protected App Routes Wrapped in App Shell Layout */}
            <Route element={<ProtectedRoute />}>
              <Route element={<AppLayout />}>
                <Route path="/dashboard" element={<DashboardPage />} />
                <Route path="/sign-to-voice" element={<SignToVoicePage />} />
                <Route path="/voice-to-sign" element={<VoiceToSignPage />} />
                <Route path="/learn" element={<LearnPage />} />
                <Route path="/history" element={<HistoryPage />} />
                {/* Dev Routes: Hidden from normal user navigation */}
                <Route
                  path="/dev/sign-recorder"
                  element={isProd ? <Navigate to="/" replace /> : <SignRecorderPage />}
                />
                <Route
                  path="/dev/avatar-demo"
                  element={isProd ? <Navigate to="/" replace /> : <AvatarDemoPage />}
                />
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
