import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getAuth } from "firebase/auth";  // <--- NEW IMPORT

const firebaseConfig = {
  apiKey: "AIzaSyCZX4YhYf-d4jW358raJMqP29f0-GsxVHo",
  authDomain: "rms-mvp-2.firebaseapp.com",
  projectId: "rms-mvp-2",
  storageBucket: "rms-mvp-2.firebasestorage.app",
  messagingSenderId: "931221656364",
  appId: "1:931221656364:web:8c5756184852e008453472"
};

const app = initializeApp(firebaseConfig);

// Export BOTH services
export const db = getFirestore(app);
export const auth = getAuth(app);       // <--- NEW EXPORT