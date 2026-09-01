import { onAuthStateChanged, signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';

import {
  auth as firebaseAuth,
  authPersistenceReady,
  firebaseReady,
  googleProvider,
} from '@/shared/firebase/firebase';
import { getSupabaseClient, supabaseReady } from '@/shared/supabase/client';

const configuredProvider = String(import.meta.env.VITE_AUTH_PROVIDER || 'firebase')
  .trim()
  .toLowerCase();

export const authProvider = configuredProvider === 'supabase' ? 'supabase' : 'firebase';
export const usesSupabaseAuth = authProvider === 'supabase';
export const authReady = usesSupabaseAuth ? supabaseReady : firebaseReady;
export const googleIdentityClientId = String(import.meta.env.VITE_GOOGLE_CLIENT_ID || '').trim();
export const usesGoogleIdentity = usesSupabaseAuth && Boolean(googleIdentityClientId);

const normalizeSupabaseUser = (user) => {
  if (!user) return null;

  const metadata = user.user_metadata || {};
  return {
    ...user,
    uid: user.id,
    displayName: metadata.full_name || metadata.name || user.email || '',
    photoURL: metadata.avatar_url || metadata.picture || '',
    emailVerified: Boolean(user.email_confirmed_at),
  };
};

export const subscribeToAuth = (callback) => {
  if (!usesSupabaseAuth) {
    return onAuthStateChanged(firebaseAuth, callback);
  }

  const supabase = getSupabaseClient();
  let active = true;

  supabase.auth.getSession().then(({ data, error }) => {
    if (!active) return;
    if (error) {
      callback(null, error);
      return;
    }
    callback(normalizeSupabaseUser(data.session?.user || null));
  });

  const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
    if (active) callback(normalizeSupabaseUser(session?.user || null));
  });

  return () => {
    active = false;
    listener.subscription.unsubscribe();
  };
};

export const signInWithGoogle = async () => {
  if (!usesSupabaseAuth) {
    await authPersistenceReady;
    return signInWithPopup(firebaseAuth, googleProvider);
  }

  const supabase = getSupabaseClient();
  const { data, error } = await supabase.auth.signInWithOAuth({
    provider: 'google',
    options: {
      redirectTo: `${window.location.origin}/`,
      queryParams: {
        access_type: 'offline',
        prompt: 'select_account',
      },
    },
  });

  if (error) throw error;
  return { ...data, redirecting: true };
};

export const signInWithGoogleIdToken = async ({ token, nonce } = {}) => {
  if (!usesSupabaseAuth) {
    throw new Error('O login Google por ID token esta disponivel apenas com Supabase Auth.');
  }
  if (!token) {
    throw new Error('O Google nao retornou uma credencial valida.');
  }

  const { data, error } = await getSupabaseClient().auth.signInWithIdToken({
    provider: 'google',
    token,
    ...(nonce ? { nonce } : {}),
  });

  if (error) throw error;
  return {
    ...data,
    user: normalizeSupabaseUser(data.user),
  };
};

export const signOutUser = async () => {
  if (!usesSupabaseAuth) return firebaseSignOut(firebaseAuth);

  const { error } = await getSupabaseClient().auth.signOut({ scope: 'local' });
  if (error) throw error;
};

export const getAuthAccessToken = async () => {
  if (!usesSupabaseAuth) {
    return firebaseAuth.currentUser?.getIdToken() || null;
  }

  const { data, error } = await getSupabaseClient().auth.getSession();
  if (error) throw error;
  return data.session?.access_token || null;
};
