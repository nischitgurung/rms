import * as React from 'react';

// --- FIREBASE AUTH IMPORTS ---
import { onAuthStateChanged, signOut } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-auth.js";

// IMPORT the shared auth instance from your firebase.js
import { auth } from '../firebase'; 

const UserContext = React.createContext();

export const UserProvider = ({ children }) => {
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
      } catch (err) { console.error("Logout Error:", err); }
      
      setUser(null);
      setRole(null);
      setRestaurantId(null);
      window.location.href = '/login'; 
  };

  const resetTimer = () => {
    if (!user) return;
    if (logoutTimer.current) {
        clearTimeout(logoutTimer.current);
    }
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
        try {
            const staffData = JSON.parse(storedStaff);
            setUser(staffData);
            setRole(staffData.role.toLowerCase()); 
            setRestaurantId(staffData.restaurantId);
            setLoading(false);
            return; 
        } catch (e) {
            localStorage.removeItem('staff_user');
        }
    }

    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
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