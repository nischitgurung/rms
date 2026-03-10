import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";
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