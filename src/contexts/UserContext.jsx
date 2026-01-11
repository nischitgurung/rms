import { createContext, useContext, useState, useEffect } from 'react';
import { auth, db } from '../firebase';
import { onAuthStateChanged } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';

const UserContext = createContext();

export const useUser = () => useContext(UserContext);

export const UserProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [role, setRole] = useState(null);       // 'owner', 'manager', 'waiter', 'kitchen'
  const [restaurantId, setRestaurantId] = useState(null); // The ID of the data to load
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setLoading(true);
      if (currentUser) {
        setUser(currentUser);
        
        try {
            // 1. Check if this user has a specific profile in 'users' collection
            // This happens if they were invited by an Owner
            const userDocRef = doc(db, "users", currentUser.uid);
            const userDoc = await getDoc(userDocRef);

            if (userDoc.exists()) {
                // IT'S A STAFF MEMBER (OR OWNER WITH PROFILE)
                const userData = userDoc.data();
                setRole(userData.role);
                setRestaurantId(userData.restaurantId);
                console.log(`✅ Logged in as ${userData.role} for restaurant: ${userData.restaurantId}`);
            } else {
                // FALLBACK: IT'S AN OWNER (Legacy/Default behavior)
                // If no profile exists, we assume they are an Owner of their own restaurant
                console.log("👤 No staff profile found. Assuming Owner.");
                setRole('owner');
                setRestaurantId(currentUser.uid);
            }
        } catch (error) {
            console.error("Error fetching user role:", error);
            // Default to safe state to prevent data leaks
            setRole('guest'); 
            setRestaurantId(null);
        }
      } else {
        // User logged out
        setUser(null);
        setRole(null);
        setRestaurantId(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <UserContext.Provider value={{ user, role, restaurantId, loading }}>
      {!loading && children}
    </UserContext.Provider>
  );
};