import { initializeApp, getApps, getApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getAnalytics } from "firebase/analytics";
import { getStorage } from "firebase/storage"; // <-- ADD THIS

const firebaseConfig = {
  apiKey: "AIzaSyD9r8BPlPmpBO9wcPpNy2-XubeOCRe6cOo",
  authDomain: "my-activty.firebaseapp.com",
  databaseURL: "https://my-activty-default-rtdb.firebaseio.com",
  projectId: "my-activty",
  storageBucket: "my-activty.appspot.com", // <-- FIXED (should be .appspot.com, not .firebasestorage.app)
  messagingSenderId: "1094961828849",
  appId: "1:1094961828849:web:8fc35b9d19c8094b262a50",
  measurementId: "G-0HG4EK1JDX"
};

// Only initialize if not already initialized
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);

export const auth = getAuth(app);

// <--- EXPORT STORAGE (add this)
export const storage = getStorage(app);

export let analytics: ReturnType<typeof getAnalytics> | undefined;
if (typeof window !== "undefined") {
  analytics = getAnalytics(app);
}
