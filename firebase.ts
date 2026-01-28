
// Modular SDK v9+ imports for Firebase
import { initializeApp } from "firebase/app";
// Fix: Consolidating Firebase Auth imports into a single line to improve module resolution in certain environments.
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

// Initialize Firebase services
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const auth = getAuth(app);

// Enable offline persistence for Firestore using the standard modular SDK v9 approach
try {
  enableIndexedDbPersistence(db).catch((err) => {
    if (err.code === 'failed-precondition') {
      console.warn("Persistência offline: falhou (múltiplas abas abertas).");
    } else if (err.code === 'unimplemented') {
      console.warn("Persistência offline: não suportada neste navegador.");
    }
  });
} catch (e) {
  console.warn("Erro ao configurar persistência do Firebase.");
}

// Utility to ensure data is serializable for Firestore
const sanitizeForFirestore = (data: any): any => {
  return JSON.parse(JSON.stringify(data, (key, value) => 
    value === undefined ? null : value
  ));
};

// Save user financial data to Firestore
export const saveUserData = async (tabs: any[]) => {
  const user = auth.currentUser;
  if (!user) return;

  try {
    const userDoc = doc(db, "users", user.uid);
    const sanitizedTabs = sanitizeForFirestore(tabs);
    
    await setDoc(userDoc, {
      tabs: sanitizedTabs,
      updatedAt: new Date().toISOString()
    }, { merge: true });
    return true;
  } catch (e: any) {
    console.error("Erro ao salvar no Firestore:", e.message);
    throw e;
  }
};

// Retrieve user financial data from Firestore
export const loadUserData = async () => {
  const user = auth.currentUser;
  if (!user) return null;

  try {
    const userDoc = doc(db, "users", user.uid);
    const docSnap = await getDoc(userDoc);
    if (docSnap.exists()) {
      return docSnap.data().tabs;
    }
    return null;
  } catch (e: any) {
    console.warn("Firestore inacessível. Usando dados locais.");
    return null;
  }
};

// Re-export auth members to ensure they are available to components using the modular pattern
export { 
  db, 
  auth, 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  signOut, 
  onAuthStateChanged,
  updatePassword
};
