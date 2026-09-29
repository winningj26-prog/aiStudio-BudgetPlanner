import { cert, getApps, initializeApp, type App } from 'firebase-admin/app';
import { getAuth } from 'firebase-admin/auth';

let adminApp: App | null = null;

const getAdminApp = (): App | null => {
  if (adminApp) return adminApp;

  const projectId = process.env.FIREBASE_PROJECT_ID;
  const clientEmail = process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey = process.env.FIREBASE_PRIVATE_KEY;

  if (!projectId || !clientEmail || !privateKey) return null;

  adminApp =
    getApps()[0] ??
    initializeApp({
      credential: cert({
        projectId,
        clientEmail,
        privateKey: privateKey.replace(/\\n/g, '\n'),
      }),
    });

  return adminApp;
};

export const isFirebaseAdminConfigured = () => Boolean(getAdminApp());

export const verifyFirebaseIdToken = async (authorizationHeader: string | undefined) => {
  const app = getAdminApp();
  if (!app) throw new Error('Firebase Admin account verification is not configured');
  if (!authorizationHeader?.startsWith('Bearer ')) throw new Error('Missing Firebase bearer token');

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) throw new Error('Missing Firebase bearer token');

  return getAuth(app).verifyIdToken(token);
};
