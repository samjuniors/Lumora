import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { authService, userService, adminService } from '../services/dbProvider';
import { User } from '../types';
import { isSuperAdmin, isAdmin, isStudent } from '../lib/permissions';

interface AuthContextType {
  firebaseUser: any | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStudent: boolean;
  signIn: () => Promise<void>;
  logOut: () => Promise<void>;
  updateResources: (resources: Partial<{ coins: number; diamonds: number; xp: number }>) => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType>({
  firebaseUser: null,
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  isStudent: false,
  signIn: async () => {},
  logOut: async () => {},
  updateResources: () => {},
  setUser: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [firebaseUser, setFirebaseUser] = useState<any | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  const authValues = useMemo(() => ({
    isAdmin: isAdmin(user),
    isSuperAdmin: isSuperAdmin(user),
    isStudent: isStudent(user)
  }), [user]);

  const updateResources = (resources: Partial<{ coins: number; diamonds: number; xp: number }>) => {
    if (user) {
      setUser({ ...user, ...resources });
    }
  };

  const unsubscribeSnapshot = React.useRef<(() => void) | null>(null);
  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    const unsubscribeAuth = authService.onAuthStateChanged(async (fUser) => {
      if (!isMounted.current) return;
      
      setFirebaseUser(fUser);
      
      if (unsubscribeSnapshot.current) {
        unsubscribeSnapshot.current();
        unsubscribeSnapshot.current = null;
      }

      if (fUser) {
        unsubscribeSnapshot.current = userService.subscribeToUser(fUser.uid, (data) => {
          if (!isMounted.current) return;
          
          if (data) {
            // Check for role upgrades (e.g. if email was added to admin list)
            if (isSuperAdmin({ ...data, email: fUser.email || data.email }) && data.role !== 'superadmin') {
              userService.updateUser(fUser.uid, { role: 'superadmin' });
            }

            setUser(data);
            setLoading(false);
          } else {
            // Auto-create user profile if it doesn't exist
            const initUser = async () => {
              // First check for pre-registration
              const claimed = await adminService.checkAndClaimPreRegistration(
                fUser.email || '', 
                fUser.uid, 
                fUser.displayName || fUser.email?.split('@')[0] || 'User'
              );
              
              if (claimed) return; // User already created by claim

              const isDefaultAdmin = isSuperAdmin({ email: fUser.email || '' } as User);
              
              const newUser: User = {
                id: fUser.uid,
                email: fUser.email || '',
                name: fUser.displayName || fUser.email?.split('@')[0] || 'User',
                role: isDefaultAdmin ? 'superadmin' : 'student',
                coins: isDefaultAdmin ? 1000 : 50,
                diamonds: isDefaultAdmin ? 500 : 50,
                createdAt: Date.now(),
                updatedAt: Date.now(),
                achievements: [],
                inventory: [],
                streak: 0,
                vipExp: 0,
                vipLevel: 0,
                xp: 0
              };

              await userService.createUser(fUser.uid, newUser);
            };

            initUser().catch(() => {
              if (isMounted.current) {
                setUser(null);
                setLoading(false);
              }
            });
          }
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      isMounted.current = false;
      unsubscribeAuth();
      if (unsubscribeSnapshot.current) {
        unsubscribeSnapshot.current();
      }
    };
  }, []);

  const signIn = async () => {
    await authService.signInWithGoogle();
  };

  const logOut = async () => {
    await authService.signOut();
  };

  return (
    <AuthContext.Provider value={{ 
      firebaseUser, 
      user, 
      loading, 
      ...authValues,
      signIn, 
      logOut, 
      updateResources, 
      setUser 
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
