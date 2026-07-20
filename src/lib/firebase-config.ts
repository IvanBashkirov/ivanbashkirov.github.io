import config from '../../firebase.config.json';

export interface FirebaseWebConfig {
  apiKey: string;
  authDomain: string;
  projectId: string;
  storageBucket: string;
  messagingSenderId: string;
  appId: string;
  adminEmails: string[];
}

export const firebaseConfig = config as FirebaseWebConfig;

/**
 * The repo ships with placeholder values so the site builds (from the local
 * content/ files) before a Firebase project exists. Once real values are
 * pasted in, Firestore becomes the source of truth everywhere.
 */
export const firebaseConfigured =
  !!firebaseConfig.projectId &&
  !firebaseConfig.projectId.startsWith('PASTE_') &&
  !!firebaseConfig.apiKey &&
  !firebaseConfig.apiKey.startsWith('PASTE_');
