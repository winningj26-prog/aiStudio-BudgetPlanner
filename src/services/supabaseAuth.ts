import type { AuthChangeEvent, Session, User } from '@supabase/supabase-js';
import { supabase } from './supabaseClient';

let cachedGoogleAccessToken: string | null = null;

export type AuthUser = User;

export const initAuth = (
  onAuthSuccess?: (user: User, providerToken: string | null) => void,
  onAuthFailure?: () => void,
) => {
  const syncSession = (session: Session | null) => {
    cachedGoogleAccessToken = session?.provider_token ?? null;
    if (session?.user) {
      onAuthSuccess?.(session.user, cachedGoogleAccessToken);
    } else {
      cachedGoogleAccessToken = null;
      onAuthFailure?.();
    }
  };

  void supabase.auth.getSession().then(({ data, error }) => {
    if (error) {
      console.warn('Supabase Auth session restore failed:', error);
      onAuthFailure?.();
      return;
    }
    syncSession(data.session);
  });

  const { data } = supabase.auth.onAuthStateChange((_event: AuthChangeEvent, session) => {
    syncSession(session);
  });

  return () => data.subscription.unsubscribe();
};

export const googleSignIn = async (): Promise<void> => {
  const { error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      scopes: 'https://www.googleapis.com/auth/spreadsheets https://www.googleapis.com/auth/drive.file',
      queryParams: {
        access_type: 'offline',
        prompt: 'consent',
      },
    },
  });

  if (error) throw error;
};

export const getAccessToken = async (): Promise<string | null> => {
  const { data } = await supabase.auth.getSession();
  cachedGoogleAccessToken = data.session?.provider_token ?? cachedGoogleAccessToken;
  return cachedGoogleAccessToken;
};

export const setCachedAccessToken = (token: string | null) => {
  cachedGoogleAccessToken = token;
};

export const emailPasswordSignIn = async (email: string, password: string): Promise<User> => {
  const { data, error } = await supabase.auth.signInWithPassword({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  if (!data.user) throw new Error('Authentication succeeded without a user session.');
  return data.user;
};

export const emailPasswordSignUp = async (
  email: string,
  password: string,
): Promise<{ user: User | null; session: Session | null }> => {
  const { data, error } = await supabase.auth.signUp({
    email: email.trim(),
    password,
  });
  if (error) throw error;
  return data;
};

export const sendPasswordReset = async (email: string): Promise<void> => {
  const { error } = await supabase.auth.resetPasswordForEmail(email.trim(), {
    redirectTo: window.location.origin,
  });
  if (error) throw error;
};

export const supabaseSignOut = async (): Promise<void> => {
  const { error } = await supabase.auth.signOut();
  cachedGoogleAccessToken = null;
  if (error) throw error;
};
