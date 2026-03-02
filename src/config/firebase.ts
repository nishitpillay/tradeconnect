/**
 * Firebase Admin SDK Configuration
 *
 * Initialises the Firebase Admin app once, lazily on first use.
 * Exports a getter for the Messaging instance used by notification.service.ts.
 */

import * as admin from 'firebase-admin';
import { env } from './env';

let _app: admin.app.App | null = null;

function getApp(): admin.app.App {
  if (_app) return _app;

  _app = admin.initializeApp({
    credential: admin.credential.cert({
      projectId:    env.FIREBASE_PROJECT_ID,
      clientEmail:  env.FIREBASE_CLIENT_EMAIL,
      // Escape sequences in the env var (common when stored as one-liner)
      privateKey:   env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });

  return _app;
}

export function getMessaging(): admin.messaging.Messaging {
  return getApp().messaging();
}
