import { initializeApp } from "firebase/app";
import { getFirestore, doc, setDoc, getDoc, enableIndexedDbPersistence } from "firebase/firestore";

const firebaseConfig = {
  apiKey: "AIzaSyBEpCRgz97nmq8zM4MEEYWXxePhXXUitEs",
  authDomain: "gestao-financeira-32ca1.firebaseapp.com",
  projectId: "gestao-financeira-32ca1",
  storageBucket: "gestao-financeira-32ca1.firebasestorage.app",
  messagingSenderId: "91563103516",
  appId: "1:91563103516:web:f4a7c17cc0ab69a8ccd6d9",
  measurementId: "G-JEK5QBDXS5"
};

// Inicializa o Firebase
const app = initializeApp(firebaseConfig);
// Inicializa o Firestore
const db = getFirestore(app);

// Habilita persistência offline
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

/**
 * Firestore não aceita valores 'undefined'. 
 * Esta função remove recursivamente chaves com valor undefined de objetos e arrays.
 */
const sanitizeForFirestore = (data: any): any => {
  // Converte para JSON e volta para objeto, removendo automaticamente chaves 'undefined'
  return JSON.parse(JSON.stringify(data, (key, value) => 
    value === undefined ? null : value
  ));
};

export const getUserId = () => {
  let uid = localStorage.getItem('mf_user_id_v2');
  if (!uid) {
    uid = 'u_' + Math.random().toString(36).substring(2, 15);
    localStorage.setItem('mf_user_id_v2', uid);
  }
  return uid;
};

/**
 * Salva os dados no Firestore garantindo que as categorias 
 * (house, fixed, work, thirdParty) sejam preservadas para análise de saúde financeira.
 */
export const saveUserData = async (tabs: any[]) => {
  const uid = getUserId();
  if (!uid) return;

  try {
    const userDoc = doc(db, "users", uid);
    // Sanitizamos os dados para evitar o erro "Unsupported field value: undefined"
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

export const loadUserData = async () => {
  const uid = getUserId();
  try {
    const userDoc = doc(db, "users", uid);
    const docSnap = await getDoc(userDoc);
    if (docSnap.exists()) {
      return docSnap.data().tabs;
    }
    return null;
  } catch (e: any) {
    console.warn("Firestore inacessível no momento. Usando dados locais.");
    return null;
  }
};

export { db };