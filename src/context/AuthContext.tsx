import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, signInWithPopup, signOut, User as FirebaseUser } from 'firebase/auth';
import { auth, googleProvider } from '../services/firebase';
import { dbService } from '../services/dbProvider';
import { User } from '../types';

interface AuthContextType {
  firebaseUser: FirebaseUser | null;
  user: User | null;
  loading: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  updateResources: (resources: Partial<{ coins: number; diamonds: number; xp: number }>) => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  loading: true,
  signIn: async () => {},
  logOut: async () => {},
  updateResources: () => {},
  setUser: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const updateResources = (resources: Partial<{ coins: number; diamonds: number; xp: number }>) => {
    if (user) {
      setUser({ ...user, ...resources });
    }
  };

  useEffect(() => {
    let unsubscribeSnapshot: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, async (fUser: FirebaseUser | null) => {
      setFirebaseUser(fUser);
      if (fUser) {
        // Listen to real-time changes via dbService
        unsubscribeSnapshot = dbService.subscribeToUser(fUser.uid, (data) => {
          if (data) {
            // Force superadmin for hardcoded email if not already set
            if ((fUser.email?.toLowerCase() === 'luvkus8@gmail.com' || fUser.email?.toLowerCase() === 'luvkus8@gmail' || fUser.email?.toLowerCase() === 'luvkush8@gmail.com') && data.role !== 'superadmin') {
              dbService.updateUser(fUser.uid, { role: 'superadmin' });
            }
            
            // Generate Lumora ID if missing
            if (!data.luminaId) {
              dbService.generateLumoraId(fUser.uid);
            }

            setUser(data);
            setLoading(false);
          } else if (fUser.email?.toLowerCase() === 'luvkus8@gmail.com' || fUser.email?.toLowerCase() === 'luvkus8@gmail' || fUser.email?.toLowerCase() === 'luvkush8@gmail.com') {
            // Auto create superadmin
            const createAdmin = async () => {
              try {
                const newUser: User = {
                  id: fUser.uid,
                  email: fUser.email || '',
                  name: fUser.displayName || 'Grand Admin',
                  role: 'superadmin',
                  coins: 1000,
                  diamonds: 500,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  achievements: [],
                  inventory: [],
                  streak: 0,
                  vipExp: 0,
                  vipLevel: 0,
                  xp: 0
                };
                await dbService.createUser(fUser.uid, newUser);
              } catch (err) {
                console.error('Failed to auto-create superadmin:', err);
                setUser(null);
                setLoading(false);
              }
            };
            createAdmin();
          } else {
            // Auto-create standard user with 50 coins and 50 diamonds
            const createUserAccount = async () => {
              try {
                const newUser: User = {
                  id: fUser.uid,
                  email: fUser.email || '',
                  name: fUser.displayName || fUser.email?.split('@')[0] || 'User',
                  role: 'student',
                  coins: 50,
                  diamonds: 50,
                  createdAt: Date.now(),
                  updatedAt: Date.now(),
                  achievements: [],
                  inventory: [],
                  streak: 0,
                  vipExp: 0,
                  vipLevel: 0,
                  xp: 0
                };
                await dbService.createUser(fUser.uid, newUser);
              } catch (err) {
                console.error('Failed to auto-create user:', err);
                setUser(null);
                setLoading(false);
              }
            };
            createUserAccount();
          }
        });
      } else {
        setUser(null);
        setLoading(false);
        if (unsubscribeSnapshot) {
          unsubscribeSnapshot();
        }
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeSnapshot) {
        unsubscribeSnapshot();
      }
    };
  }, []);

  const signIn = async () => {
    await signInWithPopup(auth, googleProvider);
  };

  const logOut = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ firebaseUser, user, loading, signIn, logOut, updateResources, setUser }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
