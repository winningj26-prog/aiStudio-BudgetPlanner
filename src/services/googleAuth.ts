/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { initializeApp, getApps, getApp } from 'firebase/app';
import {
  getAuth,
  signInWithPopup,
  GoogleAuthProvider,
  onAuthStateChanged,
  User,
  signOut,
} from 'firebase/auth';
import firebaseConfig from '../../firebase-applet-config.json';

const app = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
export const auth = getAuth(app);

const provider = new GoogleAuthProvider();
// The same interactive Google sign-in requests the API permissions needed by
// Google Sheets and Drive. The access token remains in memory only.
provider.addScope('https://www.googleapis.com/auth/spreadsheets');
provider.addScope('https://www.googleapis.com/auth/drive.file');

let cachedAccessToken: string | null = null;

/**
 * Initialize the durable Google account session.
 *
 * Firebase restores the signed-in user across browser refreshes, but the
 * Google API access token is intentionally short-lived and kept in memory.
 * The app therefore treats identity and Sheets authorization as separate
 * pieces of state: a restored user remains signed in, while Sheets can ask
 * for a fresh OAuth grant only when its API token is unavailable.
 */
export const initAuth = (
  onAuthSuccess?: (user: User, token: string | null) => void,
  onAuthFailure?: () => void
) => {
  return onAuthStateChanged(auth, (user: User | null) => {
    if (user) {
      if (onAuthSuccess) onAuthSuccess(user, cachedAccessToken);
    } else {
      cachedAccessToken = null;
      if (onAuthFailure) onAuthFailure();
    }
  });
};

/**
 * Interactive Sign-In with Google and the Sheets/Drive scopes required by the app.
 */
export const googleSignIn = async (): Promise<{ user: User; accessToken: string } | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    const credential = GoogleAuthProvider.credentialFromResult(result);
    if (!credential?.accessToken) {
      throw new Error('Could not obtain Google OAuth access token for Sheets and Drive');
    }

    cachedAccessToken = credential.accessToken;
    return { user: result.user, accessToken: credential.accessToken };
  } catch (error: any) {
    console.error('Google Sign-in error:', error);
    throw error;
  }
};

export const getAccessToken = async (): Promise<string | null> => cachedAccessToken;

export const setCachedAccessToken = (token: string | null) => {
  cachedAccessToken = token;
};

export const googleSignOut = async (): Promise<void> => {
  try {
    await signOut(auth);
  } catch (err) {
    console.warn('Error during sign out:', err);
  } finally {
    cachedAccessToken = null;
  }
};
