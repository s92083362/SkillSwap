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
  User
} from "firebase/auth";
import { auth } from "./firebaseConfig";

/**
 * Logs in a user with email/password.
 * @returns Promise<User>
 * @throws FirebaseAuthError
 */
export async function login(email: string, password: string): Promise<User> {
  try {
    const userCredential = await signInWithEmailAndPassword(auth, email, password);
    return userCredential.user;
  } catch (error) {
    // You can augment error handling here, e.g. parse Firebase error codes
    throw error;
  }
}

/**
 * Registers a new user and sets display name.
 * @returns Promise<User>
 * @throws FirebaseAuthError
 */
export async function register(email: string, password: string, name: string): Promise<User> {
  try {
    const userCredential = await createUserWithEmailAndPassword(auth, email, password);
    await updateProfile(userCredential.user, { displayName: name });
    return userCredential.user;
  } catch (error) {
    throw error;
  }
}

/**
 * Logs out the current user.
 * @returns Promise<void>
 * @throws FirebaseAuthError
 */
export async function logout(): Promise<void> {
  try {
    await signOut(auth);
  } catch (error) {
    throw error;
  }
}

/**
 * Logs in user via Google Sign-In popup.
 * @returns Promise<User>
 * @throws FirebaseAuthError
 */
export async function googleLogin(): Promise<User> {
  try {
    const provider = new GoogleAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    throw error;
  }
}

/**
 * Logs in user via Facebook Sign-In popup.
 * @returns Promise<User>
 * @throws FirebaseAuthError
 */
export async function facebookLogin(): Promise<User> {
  try {
    const provider = new FacebookAuthProvider();
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    throw error;
  }
}

/**
 * Sends a password reset email to the user.
 * @returns Promise<void>
 * @throws FirebaseAuthError
 */
export async function resetPassword(email: string): Promise<void> {
  try {
    await sendPasswordResetEmail(auth, email);
  } catch (error) {
    throw error;
  }
}
