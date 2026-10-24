// src/pages/SettingsPage.tsx — User Profile, Password, Preferences & Account Settings
import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Header } from '../components/Header';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  getUserSettings,
  updateUserSettings,
  clearAllHistory,
  UserSettings,
} from '../data/store';
import {
  User as UserIcon,
  Mail,
  Lock,
  Volume2,
  Trash2,
  LogOut,
  AlertTriangle,
  Check,
  ShieldCheck,
  HelpCircle,
} from 'lucide-react';

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile, updatePassword, isConfigured } = useAuth();
  const { showToast } = useToast();

  // Profile Form state
  const [name, setName] = useState<string>(user?.name || '');
  const [preferredLang, setPreferredLang] = useState<string>(user?.preferredLang || 'en');
  const [isSavingProfile, setIsSavingProfile] = useState<boolean>(false);

  // Password Form state
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);

  // Settings & Preferences state
  const [settings, setSettings] = useState<UserSettings>(getUserSettings());

  // Clear History Modal state
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);
  const [isClearingHistory, setIsClearingHistory] = useState<boolean>(false);

  useEffect(() => {
    document.title = 'Settings — Ishara';
  }, []);

  useEffect(() => {
    if (user) {
      setName(user.name);
      if (user.preferredLang) {
        setPreferredLang(user.preferredLang);
      }
    }
  }, [user]);

  // Handle Profile Update
  const handleSaveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      showToast('Name cannot be empty.', 'error');
      return;
    }

    setIsSavingProfile(true);
    try {
      const { error } = await updateProfile({ name: name.trim(), preferredLang });
      if (error) {
        showToast(error, 'error');
      } else {
        showToast('Profile updated successfully!', 'success');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to update profile.', 'error');
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Handle Password Update
  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword.length < 6) {
      showToast('Password must be at least 6 characters long.', 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast('New passwords do not match.', 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        showToast(error, 'error');
      } else {
        showToast('Password updated successfully!', 'success');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err: any) {
      showToast(err?.message || 'Failed to change password.', 'error');
    } finally {
      setIsUpdatingPassword(false);
    }
  };

  // Handle Clear History
  const handleClearHistoryConfirm = async () => {
    setIsClearingHistory(true);
    try {
      await clearAllHistory();
      showToast('All conversation history has been cleared.', 'success');
      setConfirmClearOpen(false);
    } catch (err: any) {
      showToast(err?.message || 'Failed to clear history.', 'error');
    } finally {
      setIsClearingHistory(false);
    }
  };

  // Handle Logout
  const handleLogout = async () => {
    await logout();
    showToast('You have been logged out.', 'info');
    navigate('/login');
  };

  return (
    <div className="space-y-8 select-none max-w-4xl">
      <Header
        title="Settings & Preferences"
        subtitle="Manage your profile, security, and sign language translation preferences."
      />

      <div className="space-y-6">
        {/* 1. Profile Details Card */}
        <div className="clay-card p-7 space-y-6 bg-white/80">
          <div className="flex items-center gap-3 border-b border-slate-200/60 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#7C9CFF] flex items-center justify-center text-white shadow-sm">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#2B2D42]">Profile Information</h2>
              <p className="text-xs text-[#6E7387] font-semibold">
                Your personal details synced to Supabase public.profiles
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#2B2D42] mb-1.5">Full Name</label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Enter your name"
                    className="clay-input w-full text-xs font-bold pl-10"
                    required
                  />
                  <UserIcon className="w-4 h-4 text-[#6E7387] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#2B2D42] mb-1.5">
                  Email Address (Account ID)
                </label>
                <div className="relative">
                  <input
                    type="email"
                    value={user?.email || ''}
                    disabled
                    className="clay-input w-full text-xs font-bold pl-10 bg-slate-100 text-slate-500 cursor-not-allowed opacity-80"
                  />
                  <Mail className="w-4 h-4 text-[#6E7387] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-black text-[#2B2D42] mb-1.5">
                Preferred Interface Language
              </label>
              <select
                value={preferredLang}
                onChange={(e) => setPreferredLang(e.target.value)}
                className="clay-input w-full sm:w-64 text-xs font-bold"
              >
                <option value="en">English</option>
                <option value="hi">Hindi (हिंदी)</option>
              </select>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="clay-button clay-button-coral px-6 py-2.5 text-xs font-black clay-focus"
              >
                {isSavingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </div>
          </form>
        </div>

        {/* 2. Security & Password Card */}
        <div className="clay-card p-7 space-y-6 bg-white/80">
          <div className="flex items-center gap-3 border-b border-slate-200/60 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#D4A5FF] flex items-center justify-center text-[#2B2D42] shadow-sm">
              <Lock className="w-5 h-5 text-purple-700" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#2B2D42]">Change Password</h2>
              <p className="text-xs text-[#6E7387] font-semibold">
                Update your Supabase authentication credentials
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#2B2D42] mb-1.5">New Password</label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder="At least 6 characters"
                    className="clay-input w-full text-xs font-bold pl-10"
                  />
                  <Lock className="w-4 h-4 text-[#6E7387] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#2B2D42] mb-1.5">
                  Confirm New Password
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder="Confirm password"
                    className="clay-input w-full text-xs font-bold pl-10"
                  />
                  <Lock className="w-4 h-4 text-[#6E7387] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>
            </div>

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isUpdatingPassword || !newPassword}
                className="clay-button clay-button-white px-6 py-2.5 text-xs font-black clay-focus disabled:opacity-50"
              >
                {isUpdatingPassword ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </form>
        </div>

        {/* 3. Audio & Accessibility Preferences Card */}
        <div className="clay-card p-7 space-y-6 bg-white/80">
          <div className="flex items-center gap-3 border-b border-slate-200/60 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#A8E6A1] flex items-center justify-center text-emerald-800 shadow-sm">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#2B2D42]">Speech & Feedback Preferences</h2>
              <p className="text-xs text-[#6E7387] font-semibold">
                Control text-to-speech rate and recognition signals
              </p>
            </div>
          </div>

          <div className="space-y-5">
            <div>
              <label className="block text-xs font-black text-[#2B2D42] mb-1.5">
                Default Voice Preset
              </label>
              <select
                value={settings.preferredVoice}
                onChange={(e) => {
                  const updated = updateUserSettings({ preferredVoice: e.target.value });
                  setSettings(updated);
                  showToast('Voice preference saved.', 'info');
                }}
                className="clay-input w-full text-xs font-bold"
              >
                <option value="Standard Male">Standard Male (Deep Calm)</option>
                <option value="Standard Female">Standard Female (Warm Friendly)</option>
                <option value="Expressive Neutral">Expressive Neutral</option>
              </select>
            </div>

            <div>
              <div className="flex justify-between text-xs font-black text-[#2B2D42] mb-1.5">
                <span>Default Speech Rate</span>
                <span>{settings.speechRate}x</span>
              </div>
              <input
                type="range"
                min="0.5"
                max="1.5"
                step="0.1"
                value={settings.speechRate}
                onChange={(e) => {
                  const updated = updateUserSettings({ speechRate: parseFloat(e.target.value) });
                  setSettings(updated);
                }}
                className="w-full accent-[#7C9CFF] cursor-pointer"
              />
            </div>

            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 border border-slate-200/60 shadow-sm">
              <div>
                <p className="text-xs font-black text-[#2B2D42]">Haptic / Audio Chimes</p>
                <p className="text-[11px] text-[#6E7387]">
                  Play sound signals when a sign gesture locks
                </p>
              </div>
              <input
                type="checkbox"
                checked={settings.hapticFeedback}
                onChange={(e) => {
                  const updated = updateUserSettings({ hapticFeedback: e.target.checked });
                  setSettings(updated);
                  showToast('Haptic setting updated.', 'info');
                }}
                className="w-4 h-4 rounded text-[#7C9CFF] focus:ring-[#7C9CFF] cursor-pointer"
              />
            </div>
          </div>
        </div>

        {/* 4. Data Management & Account Actions */}
        <div className="clay-card p-7 space-y-6 bg-white/80">
          <div className="flex items-center gap-3 border-b border-slate-200/60 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#FFE8E2] flex items-center justify-center text-[#FF8A8A] shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#2B2D42]">Data & Account Management</h2>
              <p className="text-xs text-[#6E7387] font-semibold">
                Manage your conversation records and active authentication session
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Clear History Button */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 border border-slate-200/60 shadow-sm">
              <div>
                <p className="text-xs font-black text-[#2B2D42]">Clear Translation History</p>
                <p className="text-[11px] text-[#6E7387]">
                  Permanently erase saved messages and translation sessions
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="clay-button clay-button-white px-4 py-2 text-xs font-black text-[#FF8A8A] hover:bg-red-50 clay-focus"
              >
                Clear History
              </button>
            </div>

            {/* Logout Button */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 border border-slate-200/60 shadow-sm">
              <div>
                <p className="text-xs font-black text-[#2B2D42]">Log Out</p>
                <p className="text-[11px] text-[#6E7387]">Sign out of your active Ishara account</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="clay-button clay-button-white px-4 py-2 text-xs font-black text-[#2B2D42] hover:bg-slate-100 clay-focus flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>Log Out</span>
              </button>
            </div>

            {/* Delete Account (Disabled with Tooltip) */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-red-50/50 border border-red-200/60 shadow-sm">
              <div>
                <p className="text-xs font-black text-red-700">Delete Account</p>
                <p className="text-[11px] text-red-600/70">
                  Permanently close account and remove all personal records
                </p>
              </div>
              <div className="relative group">
                <button
                  type="button"
                  disabled
                  title="Account deletion requires an administrative API endpoint. Contact support or admin."
                  className="px-4 py-2 rounded-full text-xs font-black bg-red-200/50 text-red-400 border border-red-300/40 cursor-not-allowed opacity-60 flex items-center gap-1.5"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Delete Account</span>
                  <HelpCircle className="w-3.5 h-3.5 text-red-400" />
                </button>
                {/* 
                  TODO: Implement backend service_role endpoint or Edge Function 
                  for administrative account deletion (auth.admin.deleteUser).
                  Currently disabled as required by hackathon security constraints.
                */}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Clear History Confirmation Modal */}
      {confirmClearOpen && (
        <div className="fixed inset-0 z-50 bg-black/40 backdrop-blur-sm flex items-center justify-center p-4 animate-fade-in">
          <div className="clay-card p-6 max-w-sm w-full bg-white space-y-4 shadow-clay-raised">
            <div className="flex items-center gap-3 text-[#FF8A8A]">
              <Trash2 className="w-6 h-6" />
              <h3 className="text-base font-black text-[#2B2D42]">Erase All History?</h3>
            </div>
            <p className="text-xs text-[#6E7387] font-semibold leading-relaxed">
              This will remove all saved conversations and messages from Supabase and local storage. This action cannot be undone.
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="clay-button clay-button-white px-4 py-2 text-xs font-bold"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleClearHistoryConfirm}
                disabled={isClearingHistory}
                className="clay-button clay-button-coral px-4 py-2 text-xs font-black"
              >
                {isClearingHistory ? 'Clearing...' : 'Yes, Erase'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
