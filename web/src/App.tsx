import React, { Suspense, lazy } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { AppErrorBoundary } from './components/AppErrorBoundary';
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
  return (
    <AuthProvider>
      <ToastProvider>
        <AppErrorBoundary>
          <Suspense fallback={<PageFallback />}>
            <Routes>
            {/* Public Unauthenticated Views */}
            <Route path="/" element={<LandingPage />} />
            <Route path="/login" element={<LoginPage />} />

            {/* Core Application Views Wrapped in App Shell Layout */}
            <Route element={<AppLayout />}>
              {/* Emergency / SOS Mode */}
              <Route path="/emergency" element={<EmergencyPage />} />
              <Route path="/sos" element={<Navigate to="/emergency" replace />} />

              {/* Dev & Diagnostic Routes */}
              <Route path="/dev/pose" element={<DevPosePage />} />
              <Route path="/dev/*" element={<DevPosePage />} />

              {/* Core Feature Pages */}
              <Route
                path="/dashboard"
                element={
                  <ProtectedRoute>
                    <DashboardPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/sign-to-voice"
                element={
                  <ProtectedRoute>
                    <SignToVoicePage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/voice-to-sign"
                element={
                  <ProtectedRoute>
                    <VoiceToSignPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/learn"
                element={
                  <ProtectedRoute>
                    <LearnPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/history"
                element={
                  <ProtectedRoute>
                    <HistoryPage />
                  </ProtectedRoute>
                }
              />
              <Route
                path="/settings"
                element={
                  <ProtectedRoute>
                    <SettingsPage />
                  </ProtectedRoute>
                }
              />

              {/* Friendly Aliases & Redirects */}
              <Route path="/translate" element={<Navigate to="/voice-to-sign" replace />} />
              <Route path="/home" element={<Navigate to="/dashboard" replace />} />
              <Route path="/practice" element={<Navigate to="/learn" replace />} />
              <Route path="/profile" element={<Navigate to="/settings" replace />} />
              <Route path="/recorder" element={<Navigate to="/voice-to-sign" replace />} />
              <Route path="/avatar" element={<Navigate to="/voice-to-sign" replace />} />
              <Route path="/avatar-demo" element={<Navigate to="/voice-to-sign" replace />} />
              <Route path="/studio" element={<Navigate to="/voice-to-sign" replace />} />
            </Route>

            {/* 404 Not Found in Claymorphism Style */}
            <Route path="*" element={<NotFoundPage />} />
          </Routes>
        </Suspense>
      </AppErrorBoundary>
    </ToastProvider>
    </AuthProvider>
  );
};

export default App;
