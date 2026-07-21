// Capa de sincronización en la nube (Firebase Auth + Firestore).
// Guarda por usuario un único documento users/{uid} con { conversations, accounts }.
// Todo está protegido: si Firebase no está configurado, las funciones no hacen nada.

import { auth, db, firebaseReady } from "./firebase";
import {
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
  onAuthStateChanged,
  type User,
} from "firebase/auth";
import { doc, getDoc, setDoc, onSnapshot } from "firebase/firestore";

export type CloudUser = {
  uid: string;
  name: string | null;
  email: string | null;
  photo: string | null;
};

export type CloudData = {
  conversations: unknown[];
  accounts: unknown[];
};

function toCloudUser(u: User): CloudUser {
  return { uid: u.uid, name: u.displayName, email: u.email, photo: u.photoURL };
}

/** Se suscribe a los cambios de sesión. Devuelve una función para desuscribirse. */
export function onUserChange(cb: (u: CloudUser | null) => void): () => void {
  if (!firebaseReady || !auth) {
    cb(null);
    return () => {};
  }
  return onAuthStateChanged(auth, (u) => cb(u ? toCloudUser(u) : null));
}

export async function signInWithGoogle(): Promise<CloudUser | null> {
  if (!firebaseReady || !auth) throw new Error("Firebase no está configurado.");
  const provider = new GoogleAuthProvider();
  const res = await signInWithPopup(auth, provider);
  return toCloudUser(res.user);
}

export async function signOutUser(): Promise<void> {
  if (!firebaseReady || !auth) return;
  await signOut(auth);
}

/** Lee los datos del usuario una vez (para el merge inicial al iniciar sesión). */
export async function pullCloud(uid: string): Promise<CloudData> {
  if (!firebaseReady || !db) return { conversations: [], accounts: [] };
  const snap = await getDoc(doc(db, "users", uid));
  const data = snap.exists() ? (snap.data() as Partial<CloudData>) : {};
  return {
    conversations: Array.isArray(data.conversations) ? data.conversations : [],
    accounts: Array.isArray(data.accounts) ? data.accounts : [],
  };
}

/** Escucha cambios en la nube en tiempo real (sincroniza entre dispositivos). */
export function subscribeCloud(
  uid: string,
  cb: (data: CloudData) => void
): () => void {
  if (!firebaseReady || !db) return () => {};
  return onSnapshot(doc(db, "users", uid), (snap) => {
    const data = snap.exists() ? (snap.data() as Partial<CloudData>) : {};
    cb({
      conversations: Array.isArray(data.conversations) ? data.conversations : [],
      accounts: Array.isArray(data.accounts) ? data.accounts : [],
    });
  });
}

export async function pushConversations(uid: string, conversations: unknown[]) {
  if (!firebaseReady || !db) return;
  await setDoc(doc(db, "users", uid), { conversations }, { merge: true });
}

export async function pushAccounts(uid: string, accounts: unknown[]) {
  if (!firebaseReady || !db) return;
  await setDoc(doc(db, "users", uid), { accounts }, { merge: true });
}
