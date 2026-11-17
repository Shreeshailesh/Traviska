
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY || "AIzaSyBVjgjccqW_FuQOl0sl_bViFxTqMCkYcP4",
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN || "auth.traviska.com",
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID || "traviska-118d4",
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET || "traviska-118d4.firebasestorage.app",
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID || "171948552359",
  appId: import.meta.env.VITE_FIREBASE_APP_ID || "1:171948552359:web:7926449799dca3ae90eb82",
  measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID || "G-6672F7HJLD",
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
