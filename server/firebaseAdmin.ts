import { cert, getApps, initializeApp } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

const configured = Boolean(
  process.env.FIREBASE_PROJECT_ID &&
  process.env.FIREBASE_CLIENT_EMAIL &&
  process.env.FIREBASE_PRIVATE_KEY,
);

const adminApp = configured
  ? (getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId: process.env.FIREBASE_PROJECT_ID,
        clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
        privateKey: process.env.FIREBASE_PRIVATE_KEY,
      }),
    }))
  : null;

export const isFirebaseAdminConfigured = () => Boolean(adminApp);

export const verifyFirebaseIdToken = async (authorizationHeader: string | undefined) => {
  if (!adminApp) throw new Error('Firebase Admin account verification is not configured');
  if (!authorizationHeader?.startsWith('Bearer ')) throw new Error('Missing Firebase bearer token');

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) throw new Error('Missing Firebase bearer token');

  return getAuth(adminApp).verifyIdToken(token);
};
