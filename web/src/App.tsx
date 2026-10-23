import React from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ProtectedRoute } from './components/ProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { LandingPage } from './pages/LandingPage';
import { LoginPage } from './pages/LoginPage';
import { DashboardPage } from './pages/DashboardPage';
import { SignToVoicePage } from './pages/SignToVoicePage';
import { VoiceToSignPage } from './pages/VoiceToSignPage';
import { LearnPage } from './pages/LearnPage';
import { HistoryPage } from './pages/HistoryPage';
import { DevPosePage } from './pages/DevPosePage';

export const App: React.FC = () => {
  return (
    <AuthProvider>
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
            <Route path="/dev/pose" element={<DevPosePage />} />
          </Route>
        </Route>

        {/* Catch-all redirect */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
};

export default App;
