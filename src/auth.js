import {
  GoogleAuthProvider,
  createUserWithEmailAndPassword,
  sendEmailVerification,
  sendPasswordResetEmail,
  signInWithCredential,
  signInWithEmailAndPassword,
  signInWithPopup,
  updateProfile,
} from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth } from './firebase';
import { isNative } from './platform';

export function firebaseAuthMessage(err) {
  const code = err?.code || '';
  if (code === 'auth/email-already-in-use') return 'An account with this email already exists. Sign in instead.';
  if (code === 'auth/invalid-email') return 'Enter a valid email address.';
  if (code === 'auth/weak-password') return 'Password must be at least 6 characters.';
  if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
    return 'Incorrect email or password.';
  }
  if (code === 'auth/too-many-requests') return 'Too many attempts. Try again in a few minutes.';
  if (code === 'auth/network-request-failed') return 'Network error. Check your connection and try again.';
  return err?.message || 'Authentication failed.';
}

export async function signInWithGoogle() {
  if (isNative) {
    // Native (iOS/Android): use Capacitor plugin
    const result = await FirebaseAuthentication.signInWithGoogle();
    const credential = GoogleAuthProvider.credential(result.credential?.idToken);
    return signInWithCredential(auth, credential);
  } else {
    // Web: use Firebase popup
    const provider = new GoogleAuthProvider();
    return signInWithPopup(auth, provider);
  }
}

export async function signOut() {
  if (isNative) {
    await FirebaseAuthentication.signOut();
  }
  return auth.signOut();
}

export async function getIdToken() {
  const user = auth.currentUser;
  if (!user) return null;
  return user.getIdToken();
}

export async function sendVerificationEmail(user) {
  return sendEmailVerification(user);
}

export async function signUpWithEmail(email, password, name) {
  const cred = await createUserWithEmailAndPassword(auth, email.trim(), password);
  const trimmed = (name || '').trim();
  if (trimmed) {
    try { await updateProfile(cred.user, { displayName: trimmed }); } catch { /* ignore */ }
  }
  // New Firebase accounts are unverified until the user confirms the link
  // Firebase emails to this address — this page never lets them in unverified.
  try { await sendEmailVerification(cred.user); } catch { /* ignore */ }
  return cred;
}

export async function signInWithEmail(email, password) {
  return signInWithEmailAndPassword(auth, email.trim(), password);
}

export async function sendPasswordReset(email) {
  return sendPasswordResetEmail(auth, email.trim());
}