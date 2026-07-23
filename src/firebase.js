import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyC2v8uww2bS3Q-C7YI_K7ldzFGPGVmyat8",
  authDomain: "tripbae-auth.firebaseapp.com",
  projectId: "tripbae-auth",
  storageBucket: "tripbae-auth.firebasestorage.app",
  messagingSenderId: "810087250267",
  appId: "1:810087250267:web:dcc49881adec8d6900827e",
  measurementId: "G-JEPCHXW117"
};

const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);