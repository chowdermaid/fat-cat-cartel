import { initializeApp } from "firebase/app";
import { getDatabase, type Database } from "firebase/database";

const USE_STUBS = import.meta.env.VITE_USE_STUBS === "true";

// db is only initialised when not in stub mode.
// Exporting as `any` so db.ts can assign it without type gymnastics.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let db: Database = null as any;

if (!USE_STUBS) {
  const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    databaseURL: import.meta.env.VITE_FIREBASE_DATABASE_URL,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
  };

  const app = initializeApp(firebaseConfig);
  db = getDatabase(app);
}
