import { initializeApp, type FirebaseApp } from "firebase/app";
import { connectDatabaseEmulator, getDatabase, type Database } from "firebase/database";

const USE_STUBS = import.meta.env.DEV && import.meta.env.VITE_USE_STUBS === "true";
const USE_DATABASE_EMULATOR =
  import.meta.env.DEV && import.meta.env.VITE_USE_DATABASE_EMULATOR === "true";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export let db: Database = null as any;
export let firebaseApp: FirebaseApp | null = null;

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

  firebaseApp = initializeApp(firebaseConfig);
  db = getDatabase(firebaseApp);

  if (USE_DATABASE_EMULATOR) {
    const host = import.meta.env.VITE_DATABASE_EMULATOR_HOST || "127.0.0.1";
    const port = Number(import.meta.env.VITE_DATABASE_EMULATOR_PORT || "9000");
    connectDatabaseEmulator(db, host, port);
  }
}
