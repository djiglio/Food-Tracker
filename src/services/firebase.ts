import { initializeApp } from 'firebase/app';
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged, User } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: "AIzaSyAO8DaseCCo3aznOppK6XDirg4vFb045XQ",
  authDomain: "foodtracker-db.firebaseapp.com",
  projectId: "foodtracker-db",
  storageBucket: "foodtracker-db.firebasestorage.app",
  messagingSenderId: "444560789625",
  appId: "1:444560789625:web:483937f8fc0450b317c4a8"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
export const auth = getAuth(app);
export const db = getFirestore(app);

const provider = new GoogleAuthProvider();
provider.setCustomParameters({ prompt: 'select_account' });

export const loginWithGoogle = async (): Promise<User | null> => {
  try {
    const result = await signInWithPopup(auth, provider);
    return result.user;
  } catch (error) {
    console.error("Error signing in with Google", error);
    return null;
  }
};

export const logoutGoogle = async () => {
  try {
    await signOut(auth);
  } catch (error) {
    console.error("Error signing out", error);
  }
};

export const listenToAuthStatus = (callback: (user: User | null) => void) => {
  return onAuthStateChanged(auth, callback);
};
