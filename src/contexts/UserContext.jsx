import { createContext, useContext, useState, useEffect, useRef } from 'react';
import { auth } from '../firebase';
import { onAuthStateChanged, signOut } from 'firebase/auth';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null); 
  const [role, setRole] = useState(null); 
  const [restaurantId, setRestaurantId] = useState(null); 
  const [loading, setLoading] = useState(true);

  // --- AUTO-LOGOUT LOGIC ---
  const logoutTimer = useRef(null);
  // 5 Minutes in milliseconds
  const ACTIVITY_TIMEOUT = 5 * 60 * 1000; 

  const logout = async () => {
      console.log("Session timed out due to inactivity.");
      if (localStorage.getItem('staff_user')) {
          localStorage.removeItem('staff_user');
      } else {
          await signOut(auth);
      }
      // Force state clear and redirect
      setUser(null);
      setRole(null);
      setRestaurantId(null);
      window.location.href = '/login'; 
  };

  const resetTimer = () => {
    if (!user) return; // Only track if logged in
    if (logoutTimer.current) clearTimeout(logoutTimer.current);
    logoutTimer.current = setTimeout(logout, ACTIVITY_TIMEOUT);
  };

  // Listen for activity to reset the timer
  useEffect(() => {
    if (!user) return;

    window.addEventListener('mousemove', resetTimer);
    window.addEventListener('keydown', resetTimer);
    window.addEventListener('click', resetTimer);
    window.addEventListener('scroll', resetTimer);

    // Initial start
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
      {children}
    </UserContext.Provider>
  );
};

export const useUser = () => useContext(UserContext);