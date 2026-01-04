import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth"; 
import { getStorage } from "firebase/storage";

const firebaseConfig = {
  apiKey: "AIzaSyCZX4YhYf-d4jW358raJMqP29f0-GsxVHo",
  authDomain: "rms-mvp-2.firebaseapp.com",
  projectId: "rms-mvp-2",
  storageBucket: "rms-mvp-2.firebasestorage.app", // This is where images will be stored
  messagingSenderId: "931221656364",
  appId: "1:931221656364:web:8c5756184852e008453472"
};

// 1. Initialize the App first
const app = initializeApp(firebaseConfig);

// 2. Now initialize and export all services using 'app'
export const db = getFirestore(app);
export const auth = getAuth(app);
export const storage = getStorage(app);