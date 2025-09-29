import { initializeApp } from 'firebase/app';
import { getAuth, connectAuthEmulator } from 'firebase/auth';
import { getFirestore, connectFirestoreEmulator, enableIndexedDbPersistence } from 'firebase/firestore';
import { getFunctions, connectFunctionsEmulator } from 'firebase/functions';
import { getStorage, connectStorageEmulator } from 'firebase/storage';
import { getAnalytics } from 'firebase/analytics';

// Firebase configuration - using environment variables
// In Vite, environment variables are accessed via import.meta.env
const firebaseConfig = {
  apiKey: import.meta.env?.VITE_FIREBASE_API_KEY || "demo-api-key",
  authDomain: import.meta.env?.VITE_FIREBASE_AUTH_DOMAIN || "demo.firebaseapp.com",
  projectId: import.meta.env?.VITE_FIREBASE_PROJECT_ID || "demo-project",
  storageBucket: import.meta.env?.VITE_FIREBASE_STORAGE_BUCKET || "demo-project.appspot.com",
  messagingSenderId: import.meta.env?.VITE_FIREBASE_MESSAGING_SENDER_ID || "123456789",
  appId: import.meta.env?.VITE_FIREBASE_APP_ID || "1:123456789:web:abc123",
  measurementId: import.meta.env?.VITE_FIREBASE_MEASUREMENT_ID
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize services
export const auth = getAuth(app);
export const db = getFirestore(app);
export const functions = getFunctions(app);
export const storage = getStorage(app);

// Initialize Analytics only in production and on web
const isWeb = typeof window !== 'undefined';
const isDev = import.meta.env?.DEV || false;
const isProd = import.meta.env?.PROD || false;

// Export analytics (will be null if not initialized)
export let analytics = null;

if (isWeb && isProd && firebaseConfig.measurementId) {
  try {
    analytics = getAnalytics(app);
  } catch (error) {
    // console.log('Analytics initialization skipped:', error.message);
  }
}

// Enable offline persistence for Firestore (web only)
if (isWeb && !isDev) {
  enableIndexedDbPersistence(db).catch((error) => {
    if (error.code === 'failed-precondition') {
      // console.log('Firestore persistence failed: Multiple tabs open');
    } else if (error.code === 'unimplemented') {
      // console.log('Firestore persistence not available in this browser');
    }
  });
}

// Connect to emulators in development (web only)
const useEmulators = import.meta.env?.VITE_USE_FIREBASE_EMULATORS === 'true';
if (isDev && isWeb && useEmulators) {
  try {
    const emulatorHost = import.meta.env?.VITE_FIREBASE_EMULATOR_HOST || 'localhost';
    
    // Check if already connected to avoid errors
    if (!auth._canInitEmulator) {
      connectAuthEmulator(auth, `http://${emulatorHost}:9099`, { disableWarnings: true });
    }
    if (!db._settings?.host?.includes(emulatorHost)) {
      connectFirestoreEmulator(db, emulatorHost, 8080);
    }
    if (!functions._customDomain) {
      connectFunctionsEmulator(functions, emulatorHost, 5001);
    }
    if (!storage._protocol?.includes(`http://${emulatorHost}`)) {
      connectStorageEmulator(storage, emulatorHost, 9199);
    }
    // console.log('Connected to Firebase emulators');
  } catch (error) {
    // console.log('Emulator connection skipped:', error.message);
  }
}

export default app;