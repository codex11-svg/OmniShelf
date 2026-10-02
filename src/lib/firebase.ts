import { initializeApp, getApps, getApp, type FirebaseApp } from "firebase/app";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  updateProfile,
  signOut as firebaseSignOut,
  type Auth,
  type UserCredential,
} from "firebase/auth";
import {
  getStorage,
  ref,
  uploadBytes,
  getDownloadURL,
  type FirebaseStorage,
} from "firebase/storage";

export const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID,
};

export function isFirebaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_FIREBASE_API_KEY &&
    process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN &&
    process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID &&
    process.env.NEXT_PUBLIC_FIREBASE_APP_ID
  );
}

export function isFirebaseStorageConfigured(): boolean {
  return Boolean(
    isFirebaseConfigured() && process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET
  );
}

let appInstance: FirebaseApp | null = null;
let authInstance: Auth | null = null;
let storageInstance: FirebaseStorage | null = null;

export function getFirebaseApp(): FirebaseApp {
  if (!isFirebaseConfigured()) {
    throw new Error(
      "Firebase configuration missing. Add NEXT_PUBLIC_FIREBASE_API_KEY and NEXT_PUBLIC_FIREBASE_PROJECT_ID to your environment variables."
    );
  }
  if (!appInstance) {
    appInstance = getApps().length > 0 ? getApp() : initializeApp(firebaseConfig);
  }
  return appInstance;
}

export function getFirebaseAuth(): Auth {
  if (!authInstance) {
    const app = getFirebaseApp();
    authInstance = getAuth(app);
  }
  return authInstance;
}

export function getFirebaseStorage(): FirebaseStorage {
  if (!storageInstance) {
    const app = getFirebaseApp();
    storageInstance = getStorage(app);
  }
  return storageInstance;
}

export const googleProvider = new GoogleAuthProvider();
googleProvider.setCustomParameters({ prompt: "select_account" });

export async function signInWithGoogle(): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithPopup(auth, googleProvider);
}

export async function loginWithEmail(email: string, password: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  return signInWithEmailAndPassword(auth, email, password);
}

export async function registerWithEmail(email: string, password: string, displayName: string): Promise<UserCredential> {
  const auth = getFirebaseAuth();
  const credential = await createUserWithEmailAndPassword(auth, email, password);
  await updateProfile(credential.user, { displayName: displayName.trim() });
  return credential;
}

export async function signOutFirebase(): Promise<void> {
  if (isFirebaseConfigured()) {
    try {
      const auth = getFirebaseAuth();
      await firebaseSignOut(auth);
    } catch {
      // Ignore if auth was never initialized
    }
  }
}

// -------------------------------------------------------------
// Firebase Storage Helpers (Licenses, Prescriptions, Documents)
// -------------------------------------------------------------
export async function uploadToFirebaseStorage(
  storagePath: string,
  data: Uint8Array | ArrayBuffer | Blob,
  contentType: string
): Promise<{ path: string; downloadUrl: string }> {
  const storage = getFirebaseStorage();
  const fileRef = ref(storage, storagePath);
  const snapshot = await uploadBytes(fileRef, data, { contentType });
  const downloadUrl = await getDownloadURL(snapshot.ref);
  return { path: storagePath, downloadUrl };
}

export async function getFirebaseDownloadUrl(storagePath: string): Promise<string> {
  const storage = getFirebaseStorage();
  const fileRef = ref(storage, storagePath);
  return getDownloadURL(fileRef);
}

export async function uploadDocumentToFirebase(
  file: File,
  folder: "licenses" | "prescriptions" = "licenses"
): Promise<{ key: string; downloadUrl: string }> {
  const extension = file.name.split(".").pop() || "pdf";
  const filename = `${Date.now()}_${Math.random().toString(36).substring(2, 9)}.${extension}`;
  const storagePath = `${folder}/${filename}`;
  const fileBuffer = new Uint8Array(await file.arrayBuffer());
  const res = await uploadToFirebaseStorage(storagePath, fileBuffer, file.type);
  return {
    key: `firebase:${storagePath}`,
    downloadUrl: res.downloadUrl,
  };
}

export function getFirebaseErrorMessage(error: unknown): string {
  if (!error || typeof error !== "object") return "An unexpected error occurred.";
  const err = error as { code?: string; message?: string };
  switch (err.code) {
    case "auth/popup-closed-by-user":
      return "The sign-in popup was closed before completing.";
    case "auth/unauthorized-domain":
      return "Domain not authorized. Add 'localhost' to Authorized Domains in Firebase Console (Authentication > Settings > Authorized domains).";
    case "auth/user-not-found":
    case "auth/wrong-password":
    case "auth/invalid-credential":
      return "Invalid email or password.";
    case "auth/email-already-in-use":
      return "An account with this email already exists. Try signing in instead.";
    case "auth/weak-password":
      return "Password should be at least 6 characters.";
    case "auth/invalid-email":
      return "Please enter a valid email address.";
    case "auth/operation-not-allowed":
      return "This authentication provider is not enabled in your Firebase Console.";
    case "auth/network-request-failed":
      return "Network connection error. Please verify your connection and try again.";
    case "auth/too-many-requests":
      return "Too many unsuccessful attempts. Please wait a few moments and try again.";
    case "storage/unauthorized":
      return "Storage permission denied. Please verify your Firebase Storage security rules.";
    case "storage/canceled":
      return "Upload was canceled.";
    case "storage/quota-exceeded":
      return "Firebase Storage quota exceeded.";
    default:
      return err.message || "Failed to authenticate with Firebase.";
  }
}
