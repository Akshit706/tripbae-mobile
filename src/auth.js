import { GoogleAuthProvider, signInWithCredential, signInWithPopup } from 'firebase/auth';
import { FirebaseAuthentication } from '@capacitor-firebase/authentication';
import { auth } from './firebase';
import { isNative } from './platform';

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