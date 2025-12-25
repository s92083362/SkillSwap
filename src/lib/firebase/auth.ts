// src/firebase/auth.ts
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signOut,
  GoogleAuthProvider,
  FacebookAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
  updateProfile,
  User,
  onAuthStateChanged,
  getAuth,
} from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebaseConfig";

// 1) set your fixed admin email(s) here
const ADMIN_EMAILS = ["admin@skillswap.com"]; // <-- change to your real admin email(s)

// 2) helper: create/update user doc with role
async function ensureUserDoc(user: User) {
  const ref = doc(db, "users", user.uid);
  const snap = await getDoc(ref);

  const isAdmin = ADMIN_EMAILS.includes(user.email || "");

  if (!snap.exists()) {
    await setDoc(
      ref,
      {
        uid: user.uid,
        email: user.email,
        displayName: user.displayName,
        role: isAdmin ? "admin" : "user",
        createdAt: Date.now(),
      },
      { merge: true }
    );
  } else if (isAdmin) {
    // make sure this account always has admin role
    await setDoc(ref, { role: "admin" }, { merge: true });
  }
}

/**
 * Logs in a user with email/password.
 */
export async function login(email: string, password: string): Promise<User> {
  const userCredential = await signInWithEmailAndPassword(auth, email, password);
  await ensureUserDoc(userCredential.user);
  return userCredential.user;
}

/**
 * Registers a new user and sets display name.
 */
export async function register(
  email: string,
  password: string,
  name: string
): Promise<User> {
  // optional: you can block registration with admin email from UI if you like
  const userCredential = await createUserWithEmailAndPassword(
    auth,
    email,
    password
  );
  await updateProfile(userCredential.user, { displayName: name });
  await ensureUserDoc(userCredential.user);
  return userCredential.user;
}

/**
 * Logs out the current user.
 */
export async function logout(): Promise<void> {
  await signOut(auth);
}

/**
 * Logs in user via Google Sign-In popup.
 */
export async function googleLogin(): Promise<User> {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  await ensureUserDoc(result.user);
  return result.user;
}

/**
 * Logs in user via Facebook Sign-In popup.
 */
export async function facebookLogin(): Promise<User> {
  const provider = new FacebookAuthProvider();
  const result = await signInWithPopup(auth, provider);
  await ensureUserDoc(result.user);
  return result.user;
}

/**
 * Sends a password reset email to the user.
 */
export async function resetPassword(email: string): Promise<void> {
  await sendPasswordResetEmail(auth, email);
}

/**
 * Subscribe to auth + role (for hooks / components).
 */
export function onAuthStateChangedWithRole(
  callback: (user: User | null, role: "admin" | "user" | null) => void
) {
  const firebaseAuth = getAuth();
  return onAuthStateChanged(firebaseAuth, async (user) => {
    if (!user) {
      callback(null, null);
      return;
    }
    const ref = doc(db, "users", user.uid);
    const snap = await getDoc(ref);
    const role = (snap.data()?.role as "admin" | "user") || "user";
    callback(user, role);
  });
}
