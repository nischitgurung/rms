import React, { createContext, useContext, useState, useEffect, useRef } from 'react';

// --- FIREBASE CDN IMPORTS ---
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-app.js";
import { getAuth, onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";
import { getFirestore, doc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// --- FIREBASE CONFIGURATION ---
// Ensure these match your actual Firebase project settings
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID
};

// Initialize Firebase once inside this file to ensure 'auth' is always defined
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// 1. Create the Context
const UserContext = createContext();

// 2. Create the Provider Component
export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null); 
  const [role, setRole] = useState(null); 
  const [restaurantId, setRestaurantId] = useState(null); 
  const [loading, setLoading] = useState(true);

  // --- AUTO-LOGOUT LOGIC ---
  const logoutTimer = useRef(null);
  const ACTIVITY_TIMEOUT = 5 * 60 * 1000; // 5 Minutes

  const logout = async () => {
      console.log("Session timed out due to inactivity.");
      try {
          if (localStorage.getItem('staff_user')) {
              localStorage.removeItem('staff_user');
          } else {
              await signOut(auth);
          }
      } catch (err) {
          console.error("Logout error:", err);
      }
      
      setUser(null);
      setRole(null);
      setRestaurantId(null);
      window.location.href = '/login'; 
  };

  const resetTimer = () => {
    if (!user) return;
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    logoutTimer.current = setTimeout(logout, ACTIVITY_TIMEOUT);
  };

  useEffect(() => {
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

  // --- AUTH STATE LISTENERS ---
  useEffect(() => {
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

// 3. Export the hook
export const useUser = () => {
    const context = useContext(UserContext);
    if (!context) {
        throw new Error("useUser must be used within a UserProvider");
    }
    return context;
};