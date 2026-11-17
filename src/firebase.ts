
import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth, GoogleAuthProvider } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBVjgjccqW_FuQOl0sl_bViFxTqMCkYcP4",
  authDomain: "traviska-118d4.firebaseapp.com",
  projectId: "traviska-118d4",
  storageBucket: "traviska-118d4.firebasestorage.app",
  messagingSenderId: "171948552359",
  appId: "1:171948552359:web:7926449799dca3ae90eb82",
  measurementId: "G-6672F7HJLD",
};

// Initialize Firebase only once
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

export const auth = getAuth(app);
export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });
