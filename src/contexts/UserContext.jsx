import * as React from 'react'; // Import everything as a single object

// --- FIREBASE CDN IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- FIREBASE CONFIGURATION ---
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);

// Use React.createContext to guarantee it is defined
const UserContext = React.createContext();

export const UserProvider = ({ children }) => {
  // Using React. prefix for all hooks
  const [user, setUser] = React.useState(null); 
  const [role, setRole] = React.useState(null); 
  const [restaurantId, setRestaurantId] = React.useState(null); 
  const [loading, setLoading] = React.useState(true);
  const logoutTimer = React.useRef(null);

  const ACTIVITY_TIMEOUT = 5 * 60 * 1000; 

  const logout = async () => {
      try {
          if (localStorage.getItem('staff_user')) {
              localStorage.removeItem('staff_user');
          } else {
              await signOut(auth);
          }
      } catch (err) { console.error(err); }
      
      setUser(null);
      setRole(null);
      setRestaurantId(null);
      window.location.href = '/login'; 
  };

  const resetTimer = () => {
    if (!user) return;
    if (logoutTimer.current) React.clearTimeout(logoutTimer.current);
    logoutTimer.current = setTimeout(logout, ACTIVITY_TIMEOUT);
  };

  React.useEffect(() => {
    if (!user) return;
    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);
    resetTimer();

    return () => {
      window.removeEventListener('mousemove', resetTimer);
      window.removeEventListener('keydown', resetTimer);
      window.removeEventListener('click', resetTimer);
      window.removeEventListener('scroll', resetTimer);
      if (logoutTimer.current) clearTimeout(logoutTimer.current);
    };
  }, [user]);

  React.useEffect(() => {
    const storedStaff = localStorage.getItem('staff_user');
    if (storedStaff) {
        const staffData = JSON.parse(storedStaff);
        setUser(staffData);
        setRole(staffData.role.toLowerCase()); 
        setRestaurantId(staffData.restaurantId);
        setLoading(false);
        return; 
    }

    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
        if (currentUser) {
            setUser(currentUser);
            setRole('owner');
            setRestaurantId(currentUser.uid);
        } else {
            setUser(null);
            setRole(null);
            setRestaurantId(null);
        }
        setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const staffLogin = (staffData) => {
      localStorage.setItem('staff_user', JSON.stringify(staffData));
      setUser(staffData);
      setRole(staffData.role.toLowerCase());
      setRestaurantId(staffData.restaurantId);
      window.location.href = '/'; 
  };

  return (
    <UserContext.Provider value={{ user, role, restaurantId, loading, logout, staffLogin }}>
      {!loading && children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
    const context = React.useContext(UserContext);
    if (!context) throw new Error("useUser must be used within UserProvider");
    return context;
};