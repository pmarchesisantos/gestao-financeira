
import { initializeApp } from "firebase/app";
import { getAuth, onAuthStateChanged, signInWithEmailAndPassword, createUserWithEmailAndPassword, signOut, updatePassword } from "firebase/auth";
import { 
  getFirestore, 
  doc, 
  setDoc, 
  getDoc, 
  enableIndexedDbPersistence 
} from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBEpCRgz97nmq8zM4MEEYWXxePhXXUitEs",
  authDomain: "gestao-financeira-32ca1.firebaseapp.com",
  projectId: "gestao-financeira-32ca1",
  storageBucket: "gestao-financeira-32ca1.firebasestorage.app",
  messagingSenderId: "91563103516",
  appId: "1:91563103516:web:f4a7c17cc0ab69a8ccd6d9",
  measurementId: "G-JEK5QBDXS5"
};

const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

try {
  enableIndexedDbPersistence(db).catch(() => {});
} catch (e) {}

const sanitizeForFirestore = (data: any): any => {
  return JSON.parse(JSON.stringify(data, (key, value) => 
    value === undefined ? null : value
  ));
};

export const saveUserData = async (tabs: any[], settings?: any) => {
  const user = auth.currentUser;
  if (!user) return;
  try {
    const userDoc = doc(db, "users", user.uid);
    await setDoc(userDoc, {
      tabs: sanitizeForFirestore(tabs),
      settings: sanitizeForFirestore(settings),
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e: any) {
    throw e;
  }
};

export const loadUserData = async () => {
  const user = auth.currentUser;
  if (!user) return null;
  try {
    const userDoc = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDoc);
    if (docSnap.exists()) {
      return docSnap.data();
    }
    return null;
  } catch (e: any) {
    return null;
  }
};

export { 
  db, 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword
};
