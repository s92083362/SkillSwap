import { doc, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebaseConfig";

// Save Function
export async function saveUserNote(uid: string, skillId: string, sectionId: string, note: string) {
  const ref = doc(db, "users", uid, "skillNotes", skillId, "sections", sectionId);
  await setDoc(ref, { note }, { merge: true });
}

// Load Function
export async function loadUserNote(uid: string, skillId: string, sectionId: string) {
  const ref = doc(db, "users", uid, "skillNotes", skillId, "sections", sectionId);
  const snap = await getDoc(ref);
  return snap.exists() ? snap.data().note : "";
}
