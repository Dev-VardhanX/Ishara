// src/context/AuthContext.tsx — Unified Supabase Authentication & Profile Session
import React, { createContext, useContext, useState, useEffect, useCallback } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  preferredLang?: string;
  avatarUrl?: string;
  isMock?: boolean;
}

export interface Session {
  user: User;
  token: string;
}

export interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string, keepMeSignedIn?: boolean) => Promise<{ error?: string }>;
  signup: (email: string, password: string, name?: string) => Promise<{ error?: string; message?: string }>;
  logout: () => Promise<void>;
  resetPassword: (email: string) => Promise<{ error?: string; message?: string }>;
  updateProfile: (updates: { name?: string; preferredLang?: string }) => Promise<{ error?: string }>;
  updatePassword: (newPassword: string) => Promise<{ error?: string }>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'ishara_auth_session';

/**
 * Format raw Supabase auth errors into clear, friendly human sentences
 */
export const formatAuthError = (err: any): string => {
  if (!err) return 'An error occurred. Please try again.';
  const msg = typeof err === 'string' ? err : err.message || '';
  const lower = msg.toLowerCase();

  if (
    lower.includes('invalid login credentials') ||
    lower.includes('invalid_grant') ||
    lower.includes('invalid username or password')
  ) {
    return 'Invalid email or password. Please verify your credentials.';
  }
  if (lower.includes('email not confirmed')) {
    return 'Your email has not been confirmed yet. Please check your inbox for the confirmation link.';
  }
  if (
    lower.includes('rate limit') ||
    lower.includes('too many requests') ||
    lower.includes('over_email_send_rate_limit')
  ) {
    return 'Too many attempts. Please wait a moment before trying again.';
  }
  if (lower.includes('user already registered') || lower.includes('already exists')) {
    return 'An account with this email already exists. Please sign in instead.';
  }
  if (lower.includes('password should be at least')) {
    return 'Password must be at least 6 characters long.';
  }
  if (lower.includes('network') || lower.includes('fetch')) {
    return 'Network connection issue. Operating in offline local mode.';
  }
  return msg || 'Authentication error. Please try again.';
};

/**
 * Ensures user profile exists in public.profiles table and retrieves real name/lang
 */
const fetchOrCreateProfile = async (
  userId: string,
  email: string,
  metaName?: string
): Promise<{ name: string; preferredLang: string }> => {
  if (!supabase) {
    return { name: metaName || email.split('@')[0] || 'Ananya Sharma', preferredLang: 'en' };
  }

  try {
    // 1. Check existing profile
    const { data, error } = await supabase
      .from('profiles')
      .select('name, preferred_lang')
      .eq('id', userId)
      .maybeSingle();

    if (!error && data && data.name) {
      return {
        name: data.name,
        preferredLang: data.preferred_lang || 'en',
      };
    }

    // 2. Row missing on first login: create profile row
    const fallbackName = metaName || email.split('@')[0] || 'Ishara User';
    const { error: insertErr } = await supabase.from('profiles').upsert(
      {
        id: userId,
        name: fallbackName,
        preferred_lang: 'en',
      },
      { onConflict: 'id' }
    );

    if (insertErr) {
      console.warn('Could not auto-create profile row in public.profiles:', insertErr);
    }

    return { name: fallbackName, preferredLang: 'en' };
  } catch (err) {
    console.warn('Profile sync error:', err);
    return { name: metaName || email.split('@')[0] || 'Ishara User', preferredLang: 'en' };
  }
};

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    let isMounted = true;

    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          // 1. Check active Supabase session
          const { data, error } = await supabase.auth.getSession();
          if (data?.session && !error) {
            const sbUser = data.session.user;
            const profile = await fetchOrCreateProfile(
              sbUser.id,
              sbUser.email || '',
              sbUser.user_metadata?.name
            );

            if (isMounted) {
              const appUser: User = {
                id: sbUser.id,
                email: sbUser.email || '',
                name: profile.name,
                preferredLang: profile.preferredLang,
                isMock: false,
              };
              setUser(appUser);
              setSession({ user: appUser, token: data.session.access_token });
            }
          } else {
            // Check fallback local session if unconfigured/offline
            const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
            if (stored && isMounted) {
              try {
                const parsed: Session = JSON.parse(stored);
                setUser(parsed.user);
                setSession(parsed);
              } catch (e) {
                localStorage.removeItem(STORAGE_KEY);
              }
            }
          }

          // 2. Subscribe to auth changes
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange(async (_event, newSession) => {
            if (!isMounted) return;
            if (newSession) {
              const sbUser = newSession.user;
              const profile = await fetchOrCreateProfile(
                sbUser.id,
                sbUser.email || '',
                sbUser.user_metadata?.name
              );
              const appUser: User = {
                id: sbUser.id,
                email: sbUser.email || '',
                name: profile.name,
                preferredLang: profile.preferredLang,
                isMock: false,
              };
              setUser(appUser);
              setSession({ user: appUser, token: newSession.access_token });
            } else {
              setUser(null);
              setSession(null);
            }
          });

          return () => {
            subscription.unsubscribe();
          };
        } else {
          // Offline mock auth restoration
          const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
          if (stored && isMounted) {
            try {
              const parsed: Session = JSON.parse(stored);
              setUser(parsed.user);
              setSession(parsed);
            } catch (err) {
              localStorage.removeItem(STORAGE_KEY);
              sessionStorage.removeItem(STORAGE_KEY);
            }
          }
        }
      } catch (err) {
        console.error('Error during auth initialization:', err);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    initializeAuth();

    return () => {
      isMounted = false;
    };
  }, []);

  // Login action
  const login = async (
    email: string,
    password: string,
    keepMeSignedIn: boolean = true
  ): Promise<{ error?: string }> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) {
          return { error: formatAuthError(error) };
        }

        if (data?.session) {
          const sbUser = data.session.user;
          const profile = await fetchOrCreateProfile(
            sbUser.id,
            sbUser.email || email,
            sbUser.user_metadata?.name
          );

          const appUser: User = {
            id: sbUser.id,
            email: sbUser.email || email,
            name: profile.name,
            preferredLang: profile.preferredLang,
            isMock: false,
          };
          setUser(appUser);
          setSession({ user: appUser, token: data.session.access_token });
          return {};
        }

        return { error: 'Login could not be completed.' };
      } else {
        // Local mock session fallback
        const displayName = email.split('@')[0]
          ? email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)
          : 'Ananya Sharma';

        const mockUser: User = {
          id: `usr_${Date.now()}`,
          email: email.trim(),
          name: displayName,
          preferredLang: 'en',
          isMock: true,
        };

        const mockSession: Session = {
          user: mockUser,
          token: `mock_token_${Date.now()}`,
        };

        setUser(mockUser);
        setSession(mockSession);

        const storage = keepMeSignedIn ? localStorage : sessionStorage;
        storage.setItem(STORAGE_KEY, JSON.stringify(mockSession));
        return {};
      }
    } catch (err: any) {
      return { error: formatAuthError(err) };
    } finally {
      setLoading(false);
    }
  };

  // Sign up action
  const signup = async (
    email: string,
    password: string,
    name?: string
  ): Promise<{ error?: string; message?: string }> => {
    setLoading(true);
    try {
      const trimmedEmail = email.trim();
      const chosenName = name || trimmedEmail.split('@')[0] || 'New Signer';

      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email: trimmedEmail,
          password,
          options: {
            data: {
              name: chosenName,
            },
          },
        });

        if (error) {
          return { error: formatAuthError(error) };
        }

        if (data?.user) {
          // Check if session was returned immediately (email confirmation disabled)
          if (data.session) {
            const profile = await fetchOrCreateProfile(data.user.id, trimmedEmail, chosenName);
            const appUser: User = {
              id: data.user.id,
              email: trimmedEmail,
              name: profile.name,
              preferredLang: profile.preferredLang,
              isMock: false,
            };
            setUser(appUser);
            setSession({ user: appUser, token: data.session.access_token });
            return { message: 'Account created and signed in successfully.' };
          }

          return {
            message: 'Account created! Please check your email inbox to confirm your address before signing in.',
          };
        }

        return {};
      } else {
        // Local mock signup fallback
        const mockUser: User = {
          id: `usr_${Date.now()}`,
          email: trimmedEmail,
          name: chosenName,
          preferredLang: 'en',
          isMock: true,
        };

        const mockSession: Session = {
          user: mockUser,
          token: `mock_token_${Date.now()}`,
        };

        setUser(mockUser);
        setSession(mockSession);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockSession));
        return { message: 'Account created successfully (local demo mode).' };
      }
    } catch (err: any) {
      return { error: formatAuthError(err) };
    } finally {
      setLoading(false);
    }
  };

  // Logout action
  const logout = async () => {
    try {
      if (isSupabaseConfigured && supabase) {
        await supabase.auth.signOut();
      }
    } catch (err) {
      console.warn('Error during signout:', err);
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setSession(null);
    }
  };

  // Send password reset email
  const resetPassword = async (email: string): Promise<{ error?: string; message?: string }> => {
    const trimmedEmail = email.trim();
    if (!trimmedEmail) {
      return { error: 'Please enter your email address first.' };
    }

    try {
      if (isSupabaseConfigured && supabase) {
        const { error } = await supabase.auth.resetPasswordForEmail(trimmedEmail, {
          redirectTo: `${window.location.origin}/login`,
        });

        if (error) {
          return { error: formatAuthError(error) };
        }

        return { message: 'Password reset link sent! Please check your email inbox.' };
      } else {
        return { message: 'Password reset link sent to ' + trimmedEmail + ' (local demo mode).' };
      }
    } catch (err: any) {
      return { error: formatAuthError(err) };
    }
  };

  // Update Profile details in public.profiles and auth user_metadata
  const updateProfile = async (updates: {
    name?: string;
    preferredLang?: string;
  }): Promise<{ error?: string }> => {
    if (!user) return { error: 'Not authenticated' };

    try {
      if (isSupabaseConfigured && supabase && !user.isMock) {
        const payload: Record<string, any> = {};
        if (updates.name !== undefined) payload.name = updates.name.trim();
        if (updates.preferredLang !== undefined) payload.preferred_lang = updates.preferredLang;

        const { error: profileErr } = await supabase
          .from('profiles')
          .update(payload)
          .eq('id', user.id);

        if (profileErr) {
          return { error: profileErr.message };
        }

        if (updates.name) {
          await supabase.auth.updateUser({
            data: { name: updates.name.trim() },
          });
        }
      }

      // Update state
      setUser((prev) =>
        prev
          ? {
              ...prev,
              name: updates.name ? updates.name.trim() : prev.name,
              preferredLang: updates.preferredLang ?? prev.preferredLang,
            }
          : null
      );

      return {};
    } catch (err: any) {
      return { error: err?.message || 'Failed to update profile.' };
    }
  };

  // Change Password
  const updatePassword = async (newPassword: string): Promise<{ error?: string }> => {
    if (!user) return { error: 'Not authenticated' };
    if (!newPassword || newPassword.length < 6) {
      return { error: 'Password must be at least 6 characters long.' };
    }

    try {
      if (isSupabaseConfigured && supabase && !user.isMock) {
        const { error } = await supabase.auth.updateUser({
          password: newPassword,
        });

        if (error) {
          return { error: formatAuthError(error) };
        }
      }

      return {};
    } catch (err: any) {
      return { error: formatAuthError(err) };
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        session,
        loading,
        isConfigured: isSupabaseConfigured,
        login,
        signup,
        logout,
        resetPassword,
        updateProfile,
        updatePassword,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = (): AuthContextType => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
