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
  Globe,
} from 'lucide-react';
import { LocaleSelector } from '../components/LocaleSelector';
import { SegmentedControl } from '../components/SegmentedControl';
import { useLocaleStore, SUPPORTED_LOCALES, AppLocale } from '../store/useLocaleStore';
import { speak, getBestVoice, waitForVoices } from '../lib/speech';

const TEST_PHRASES: Record<string, string> = {
  en: 'Hello! Welcome to Ishara sign language translator.',
  hi: 'नमस्ते! इशारा सांकेतिक भाषा अनुवादक में आपका स्वागत है।',
  bn: 'নমস্কার! ইশারা সাইন ল্যাঙ্গুয়েজ অনুবাদকে স্বাগতম।',
  mr: 'नमस्कार! इशारा सांकेतिक भाषा अनुवादकामध्ये आपले स्वागत आहे।',
  ta: 'வணக்கம்! இஷாரா சைகை மொழி மொழிபெயர்ப்பாளருக்கு வரவேற்கிறோம்.',
  te: 'నమస్కారం! ఇషారా సంజ్ఞా భాష అనువాదకుడికి స్వాగతం.',
  gu: 'નમસ્તે! ઇશારા સાંકેતિક ભાષા અનુવાદકમાં આપનું સ્વાગત છે.',
  kn: 'ನಮಸ್ಕಾರ! ಇಶಾರಾ ಸನ್ನೆ ಭಾಷಾ ಅನುವಾದಕಕ್ಕೆ ಸುಸ್ವಾಗತ.',
  ml: 'നമസ്കാരം! ഇഷാര ആംഗ്യഭാഷാ വിവർത്തകനിലേക്ക് സ്വാഗതം.',
  pa: 'ਸਤਿ ਸ੍ਰੀ ਅਕਾਲ! ਇਸ਼ਾਰਾ ਸੈਨਤ ਭਾਸ਼ਾ ਅਨੁਵਾਦਕ ਵਿੱਚ ਤੁਹਾਡਾ ਸੁਆਗਤ ਹੈ।',
};

export const SettingsPage: React.FC = () => {
  const navigate = useNavigate();
  const { user, logout, updateProfile, updatePassword, isConfigured } = useAuth();
  const { showToast } = useToast();
  const { t, translationLocale, setTranslationLocale } = useLocaleStore();

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
  const [voicesLoaded, setVoicesLoaded] = useState<boolean>(false);

  // Clear History Modal state
  const [confirmClearOpen, setConfirmClearOpen] = useState<boolean>(false);
  const [isClearingHistory, setIsClearingHistory] = useState<boolean>(false);

  useEffect(() => {
    document.title = `${t('settings.title')} — Ishara`;
    waitForVoices().then(() => setVoicesLoaded(true));
  }, [t]);

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
      showToast(t('settings.toasts.nameEmpty'), 'error');
      return;
    }

    setIsSavingProfile(true);
    try {
      const { error } = await updateProfile({ name: name.trim(), preferredLang });
      if (error) {
        showToast(error, 'error');
      } else {
        showToast(t('settings.toasts.profileUpdated'), 'success');
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
      showToast(t('settings.toasts.passwordLength'), 'error');
      return;
    }
    if (newPassword !== confirmPassword) {
      showToast(t('settings.toasts.passwordMismatch'), 'error');
      return;
    }

    setIsUpdatingPassword(true);
    try {
      const { error } = await updatePassword(newPassword);
      if (error) {
        showToast(error, 'error');
      } else {
        showToast(t('settings.toasts.passwordUpdated'), 'success');
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
      showToast(t('settings.toasts.historyCleared'), 'success');
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
    showToast(t('settings.toasts.loggedOut'), 'info');
    navigate('/login');
  };

  return (
    <div className="space-y-8 select-none max-w-4xl">
      <Header
        title={t('settings.title')}
        subtitle={t('settings.subtitle')}
      />

      <div className="space-y-6">
        {/* 1. Profile Details Card */}
        <div className="clay-card p-7 space-y-6 bg-white/80">
          <div className="flex items-center gap-3 border-b border-slate-200/60 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#7C9CFF] flex items-center justify-center text-white shadow-sm">
              <UserIcon className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#2B2D42]">{t('settings.profileInfo')}</h2>
              <p className="text-xs text-[#6E7387] font-semibold">
                {t('login.quote')}
              </p>
            </div>
          </div>

          <form onSubmit={handleSaveProfile} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#2B2D42] mb-1.5">{t('settings.fullName')}</label>
                <div className="relative">
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder={t('login.namePlaceholder')}
                    className="clay-input w-full text-xs font-bold pl-10"
                    required
                  />
                  <UserIcon className="w-4 h-4 text-[#6E7387] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#2B2D42] mb-1.5">
                  {t('login.email')}
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

            <div className="pt-2 flex justify-end">
              <button
                type="submit"
                disabled={isSavingProfile}
                className="clay-button clay-button-coral px-6 py-2.5 text-xs font-black clay-focus"
              >
                {isSavingProfile ? t('settings.saving') : t('settings.saveProfile')}
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
              <h2 className="text-lg font-black text-[#2B2D42]">{t('settings.changePassword')}</h2>
              <p className="text-xs text-[#6E7387] font-semibold">
                {t('settings.changePasswordSub')}
              </p>
            </div>
          </div>

          <form onSubmit={handleChangePassword} className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-black text-[#2B2D42] mb-1.5">{t('settings.newPassword')}</label>
                <div className="relative">
                  <input
                    type="password"
                    value={newPassword}
                    onChange={(e) => setNewPassword(e.target.value)}
                    placeholder={t('settings.newPasswordPlaceholder')}
                    className="clay-input w-full text-xs font-bold pl-10"
                  />
                  <Lock className="w-4 h-4 text-[#6E7387] absolute left-3.5 top-1/2 -translate-y-1/2" />
                </div>
              </div>

              <div>
                <label className="block text-xs font-black text-[#2B2D42] mb-1.5">
                  {t('settings.confirmPassword')}
                </label>
                <div className="relative">
                  <input
                    type="password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    placeholder={t('settings.confirmPasswordPlaceholder')}
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
                {isUpdatingPassword ? t('settings.updating') : t('settings.updatePassword')}
              </button>
            </div>
          </form>
        </div>

        {/* 3. Interface & Voice Language Preferences Card */}
        <div className="clay-card p-7 space-y-6 bg-white/80">
          <div className="flex items-center gap-3 border-b border-slate-200/60 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#7C9CFF] flex items-center justify-center text-white shadow-sm">
              <Globe className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#2B2D42]">
                {t('settings.interfaceLanguage')}
              </h2>
              <p className="text-xs text-[#6E7387] font-semibold">
                {t('settings.interfaceLanguageDesc')}
              </p>
            </div>
          </div>

          <LocaleSelector variant="expanded" />

          <div className="pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-[#2B2D42]">{t('settings.translateAndSpeakIn')}</h4>
              <p className="text-xs text-[#6E7387] font-semibold">
                {t('settings.translateAndSpeakInDesc')}
              </p>
            </div>
            <select
              value={translationLocale}
              onChange={(e) => {
                setTranslationLocale(e.target.value as any);
                showToast(t('settings.toasts.translationSet', { lang: e.target.value.toUpperCase() }), 'info');
              }}
              className="clay-input text-xs font-bold w-full sm:w-64"
            >
              {SUPPORTED_LOCALES.map((loc) => (
                <option key={loc.code} value={loc.code}>
                  {loc.nativeName} ({loc.name})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-200/60 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h4 className="text-sm font-black text-[#2B2D42]">{t('settings.signLanguage')}</h4>
              <p className="text-xs text-[#6E7387] font-semibold">{t('settings.signLanguageDesc')}</p>
            </div>
            <SegmentedControl />
          </div>
        </div>

        {/* 4. Voice Support & Diagnostics Card (Task 3) */}
        <div className="clay-card p-7 space-y-6 bg-white/80">
          <div className="flex items-center gap-3 border-b border-slate-200/60 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#A8E6A1] flex items-center justify-center text-emerald-800 shadow-sm">
              <Volume2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#2B2D42]">{t('settings.voiceSupportTitle')}</h2>
              <p className="text-xs text-[#6E7387] font-semibold">
                {t('settings.voiceSupportDesc')}
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3.5">
            {SUPPORTED_LOCALES.map((loc) => {
              const matchedVoice = getBestVoice(loc.voiceCode);
              const isInstalled = !!matchedVoice;
              const testPhrase = TEST_PHRASES[loc.code] || 'Hello!';

              return (
                <div
                  key={loc.code}
                  className="p-3.5 rounded-2xl bg-white/70 border border-slate-200/70 shadow-sm flex items-center justify-between gap-3 hover:border-[#7C9CFF]/50 transition-all"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="font-extrabold text-xs text-[#2B2D42]">
                        {loc.nativeName}
                      </span>
                      <span className="text-[11px] font-semibold text-[#6E7387]">
                        ({loc.name})
                      </span>
                    </div>
                    <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                      {isInstalled ? (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-800 text-[10px] font-black inline-flex items-center gap-1">
                          <Check className="w-3 h-3 text-emerald-600" />
                          <span className="truncate max-w-[140px]">{matchedVoice.name}</span>
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-amber-100 text-amber-800 text-[10px] font-black inline-flex items-center gap-1">
                          <AlertTriangle className="w-3 h-3 text-amber-600" />
                          <span>{t('settings.voiceMissing')}</span>
                        </span>
                      )}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      speak(testPhrase, { lang: loc.voiceCode, isUserClick: true });
                      showToast(t('settings.toasts.voiceTestPlaying', { lang: loc.name }), 'info');
                    }}
                    className="clay-button clay-button-white px-3 py-1.5 text-xs font-black shrink-0 inline-flex items-center gap-1.5 clay-focus"
                    title={t('settings.testVoice')}
                  >
                    <Volume2 className="w-3.5 h-3.5 text-[#7C9CFF]" />
                    <span>{t('settings.testVoice')}</span>
                  </button>
                </div>
              );
            })}
          </div>

          {/* Localized Instructions when voices are missing */}
          <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2 text-xs">
            <h4 className="font-black text-[#2B2D42] flex items-center gap-2">
              <HelpCircle className="w-4 h-4 text-[#7C9CFF]" />
              <span>{t('settings.voiceHelpTitle')}</span>
            </h4>
            <ul className="space-y-1.5 text-[#6E7387] font-medium leading-relaxed list-disc list-inside">
              <li>{t('settings.voiceHelpWindows')}</li>
              <li>{t('settings.voiceHelpAndroid')}</li>
              <li className="text-[#2B2D42] font-semibold">{t('settings.voiceHelpEdge')}</li>
            </ul>
            <p className="text-[11px] text-[#6E7387] italic pt-1 border-t border-slate-200/50">
              {t('settings.voiceHelpHonest')}
            </p>
          </div>
        </div>

        {/* 5. Data Management & Account Actions */}
        <div className="clay-card p-7 space-y-6 bg-white/80">
          <div className="flex items-center gap-3 border-b border-slate-200/60 pb-4">
            <div className="w-10 h-10 rounded-2xl bg-[#FFE8E2] flex items-center justify-center text-[#FF8A8A] shadow-sm">
              <AlertTriangle className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-lg font-black text-[#2B2D42]">{t('history.title')}</h2>
              <p className="text-xs text-[#6E7387] font-semibold">
                {t('history.subtitle')}
              </p>
            </div>
          </div>

          <div className="space-y-4">
            {/* Clear History Button */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 border border-slate-200/60 shadow-sm">
              <div>
                <p className="text-xs font-black text-[#2B2D42]">{t('settings.clearHistoryBtn')}</p>
                <p className="text-[11px] text-[#6E7387]">
                  {t('settings.clearHistoryModalDesc')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setConfirmClearOpen(true)}
                className="clay-button clay-button-white px-4 py-2 text-xs font-black text-[#FF8A8A] hover:bg-red-50 clay-focus"
              >
                {t('settings.clearHistoryBtn')}
              </button>
            </div>

            {/* Logout Button */}
            <div className="flex items-center justify-between p-4 rounded-2xl bg-white/70 border border-slate-200/60 shadow-sm">
              <div>
                <p className="text-xs font-black text-[#2B2D42]">{t('nav.logout')}</p>
                <p className="text-[11px] text-[#6E7387]">{t('settings.toasts.loggedOut')}</p>
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="clay-button clay-button-white px-4 py-2 text-xs font-black text-[#2B2D42] hover:bg-slate-100 clay-focus flex items-center gap-1.5"
              >
                <LogOut className="w-4 h-4" />
                <span>{t('nav.logout')}</span>
              </button>
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
              <h3 className="text-base font-black text-[#2B2D42]">{t('settings.clearHistoryModalTitle')}</h3>
            </div>
            <p className="text-xs text-[#6E7387] font-semibold leading-relaxed">
              {t('settings.clearHistoryModalDesc')}
            </p>
            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setConfirmClearOpen(false)}
                className="clay-button clay-button-white px-4 py-2 text-xs font-bold"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleClearHistoryConfirm}
                disabled={isClearingHistory}
                className="clay-button clay-button-coral px-4 py-2 text-xs font-black"
              >
                {isClearingHistory ? t('common.saving') : t('settings.confirmDeleteAll')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
