
import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyBVjgjccqW_FuQOl0sl_bViFxTqMCkYcP4",
  authDomain: "traviska-118d4.firebaseapp.com",
  projectId: "traviska-118d4",
  storageBucket: "traviska-118d4.firebasestorage.app",
  messagingSenderId: "171948552359",
  appId: "1:171948552359:web:7926449799dca3ae90eb82",
  measurementId: "G-6672F7HJLD",
};

const app = initializeApp(firebaseConfig);

export const auth = getAuth(app);
