import React, { createContext, useContext, useState, useEffect } from 'react';
import { supabase, isSupabaseConfigured } from '../lib/supabase';

export interface User {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string;
  isMock?: boolean;
}

export interface Session {
  user: User;
  token: string;
}

interface AuthContextType {
  user: User | null;
  session: Session | null;
  loading: boolean;
  isConfigured: boolean;
  login: (email: string, password: string, keepMeSignedIn?: boolean) => Promise<{ error?: string }>;
  signup: (email: string, password: string) => Promise<{ error?: string }>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

const STORAGE_KEY = 'ishara_auth_session';

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  // Initialize session on mount
  useEffect(() => {
    const initializeAuth = async () => {
      try {
        if (isSupabaseConfigured && supabase) {
          // Real Supabase session initialization
          const { data, error } = await supabase.auth.getSession();
          if (data?.session && !error) {
            const sbUser = data.session.user;
            const appUser: User = {
              id: sbUser.id,
              email: sbUser.email || '',
              name: sbUser.user_metadata?.name || sbUser.email?.split('@')[0] || 'Ishara User',
              isMock: false,
            };
            setUser(appUser);
            setSession({ user: appUser, token: data.session.access_token });
          }

          // Subscribe to Supabase auth state changes
          const {
            data: { subscription },
          } = supabase.auth.onAuthStateChange((_event, newSession) => {
            if (newSession) {
              const appUser: User = {
                id: newSession.user.id,
                email: newSession.user.email || '',
                name: newSession.user.user_metadata?.name || newSession.user.email?.split('@')[0] || 'Ishara User',
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
          // Local fake login storage recovery
          const stored = localStorage.getItem(STORAGE_KEY) || sessionStorage.getItem(STORAGE_KEY);
          if (stored) {
            try {
              const parsed: Session = JSON.parse(stored);
              setUser(parsed.user);
              setSession(parsed);
            } catch (err) {
              console.warn('Failed to parse cached mock auth session', err);
              localStorage.removeItem(STORAGE_KEY);
              sessionStorage.removeItem(STORAGE_KEY);
            }
          }
        }
      } catch (err) {
        console.error('Error during auth initialization', err);
      } finally {
        setLoading(false);
      }
    };

    initializeAuth();
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
          email,
          password,
        });

        if (error) {
          return { error: error.message };
        }

        if (data?.session) {
          const appUser: User = {
            id: data.session.user.id,
            email: data.session.user.email || email,
            name: data.session.user.user_metadata?.name || email.split('@')[0] || 'Ishara User',
            isMock: false,
          };
          setUser(appUser);
          setSession({ user: appUser, token: data.session.access_token });
          return {};
        }
        return { error: 'Unknown Supabase login error' };
      } else {
        // Fast mock authentication for hackathon evaluation
        const displayName = email.split('@')[0]
          ? email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)
          : 'Ananya Sharma';

        const mockUser: User = {
          id: `usr_${Date.now()}`,
          email,
          name: displayName,
          isMock: true,
        };

        const mockSession: Session = {
          user: mockUser,
          token: `mock_jwt_${Date.now()}`,
        };

        setUser(mockUser);
        setSession(mockSession);

        const storage = keepMeSignedIn ? localStorage : sessionStorage;
        storage.setItem(STORAGE_KEY, JSON.stringify(mockSession));

        return {};
      }
    } catch (err: any) {
      return { error: err?.message || 'Login failed. Please try again.' };
    } finally {
      setLoading(false);
    }
  };

  // Sign up action
  const signup = async (email: string, password: string): Promise<{ error?: string }> => {
    setLoading(true);
    try {
      if (isSupabaseConfigured && supabase) {
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
        });

        if (error) {
          return { error: error.message };
        }

        if (data?.session) {
          const appUser: User = {
            id: data.session.user.id,
            email: data.session.user.email || email,
            name: data.session.user.user_metadata?.name || email.split('@')[0] || 'Ishara User',
            isMock: false,
          };
          setUser(appUser);
          setSession({ user: appUser, token: data.session.access_token });
          return {};
        }

        return {};
      } else {
        // Local fake signup
        const displayName = email.split('@')[0]
          ? email.split('@')[0].charAt(0).toUpperCase() + email.split('@')[0].slice(1)
          : 'New Signer';

        const mockUser: User = {
          id: `usr_${Date.now()}`,
          email,
          name: displayName,
          isMock: true,
        };

        const mockSession: Session = {
          user: mockUser,
          token: `mock_jwt_${Date.now()}`,
        };

        setUser(mockUser);
        setSession(mockSession);
        localStorage.setItem(STORAGE_KEY, JSON.stringify(mockSession));

        return {};
      }
    } catch (err: any) {
      return { error: err?.message || 'Signup failed. Please try again.' };
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
      console.warn('Error during Supabase signout', err);
    } finally {
      localStorage.removeItem(STORAGE_KEY);
      sessionStorage.removeItem(STORAGE_KEY);
      setUser(null);
      setSession(null);
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
