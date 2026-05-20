import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { userService, adminService } from '../services/dbProvider';
import { User } from '../types';
import { isSuperAdmin, isAdmin, isStudent } from '../lib/permissions';
import { ClerkSync } from './ClerkSync';

const CLERK_PUBLISHABLE_KEY = import.meta.env.VITE_CLERK_PUBLISHABLE_KEY;

export interface AuthUser {
  uid: string;
  email: string | null;
  displayName: string | null;
  source?: 'firebase' | 'clerk';
}

interface AuthContextType {
  authUser: AuthUser | null;
  user: User | null;
  loading: boolean;
  isAdmin: boolean;
  isSuperAdmin: boolean;
  isStudent: boolean;
  signInWithProvider: (provider: 'google' | 'apple') => Promise<void>;
  signInWithEmail: (email: string, pass: string) => Promise<void>;
  signUpWithEmail: (email: string, pass: string) => Promise<void>;
  verifyInviteCode: (code: string) => Promise<void>;
  logOut: () => Promise<void>;
  updateResources: (resources: Partial<{ 
    coins: number; 
    diamonds: number; 
    xp: number; 
    level: number;
    petFullness: number;
    petHappiness: number;
    petLastFed: string | number | Date;
    lastCollectionAt?: string | null;
    nextCollectionAt?: string | null;
    lastRewardClaimedAt?: string | number | Date;
    nextDailyRewardAt?: string | null;
  }>) => void;
  setUser: React.Dispatch<React.SetStateAction<User | null>>;
}

const AuthContext = createContext<AuthContextType>({
  authUser: null,
  user: null,
  loading: true,
  isAdmin: false,
  isSuperAdmin: false,
  isStudent: false,
  signInWithProvider: async () => {},
  signInWithEmail: async () => {},
  signUpWithEmail: async () => {},
  verifyInviteCode: async () => {},
  logOut: async () => {},
  updateResources: () => {},
  setUser: () => {}
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [authUser, setAuthUser] = useState<AuthUser | null>(null);
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  // Initialized to null by default if Clerk publishable key doesn't load or if it loads instantly
  const [clerkUser, setClerkUser] = useState<AuthUser | null | undefined>(undefined);

  const authValues = useMemo(() => ({
    isAdmin: isAdmin(user),
    isSuperAdmin: isSuperAdmin(user),
    isStudent: isStudent(user)
  }), [user]);

  const updateResources = (resources: Partial<{ 
    coins: number; 
    diamonds: number; 
    xp: number; 
    level: number;
    petFullness: number;
    petHappiness: number;
    petLastFed: string | number | Date;
    lastCollectionAt?: string | null;
    nextCollectionAt?: string | null;
    lastRewardClaimedAt?: string | number | Date;
    nextDailyRewardAt?: string | null;
  }>) => {
    if (user) {
      setUser({ ...user, ...resources });
    }
  };

  const unsubscribeSnapshot = React.useRef<(() => void) | null>(null);
  const isMounted = React.useRef(true);
  const clerkSignOutRef = React.useRef<(() => Promise<void>) | null>(null);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
      if (unsubscribeSnapshot.current) {
        unsubscribeSnapshot.current();
      }
    };
  }, []);

  const handleClerkStateChange = React.useCallback(async (cUser: any, signOutFn: (() => Promise<void>) | null = null, firebaseToken?: string | null) => {
    if (!isMounted.current) return;
    clerkSignOutRef.current = signOutFn;

    setClerkUser(prev => {
      if (!cUser && !prev) return prev;
      if (cUser && prev && cUser.id === prev.uid && cUser.primaryEmailAddress?.emailAddress === prev.email) {
        return prev;
      }
      return cUser ? {
        uid: cUser.id,
        email: cUser.primaryEmailAddress?.emailAddress || null,
        displayName: cUser.fullName || null,
        source: 'clerk'
      } : null;
    });
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    // Set active auth session based exclusively on Clerk
    setAuthUser(clerkUser || null);

    if (clerkUser) {
      localStorage.setItem('lumora_user_id', clerkUser.uid);
      (window as any).__LUMORA_USER_ID__ = clerkUser.uid;
    } else {
      localStorage.removeItem('lumora_user_id');
      delete (window as any).__LUMORA_USER_ID__;
    }

    if (unsubscribeSnapshot.current) {
      unsubscribeSnapshot.current();
      unsubscribeSnapshot.current = null;
    }

    if (clerkUser) {
      console.info(`[AuthContext] Hydrating profile for Clerk UID: ${clerkUser.uid}`);
      
      let initialLoadTimeout: any = setTimeout(() => {
        if (isMounted.current) {
          console.warn("[AuthContext:Diagnostic] Session hydration timed out. Generating sandbox default to unblock runtime.");
          const isDefaultAdmin = isSuperAdmin({ email: clerkUser.email || '' } as User);
          setUser({
            id: clerkUser.uid,
            email: clerkUser.email || '',
            name: clerkUser.displayName || clerkUser.email?.split('@')[0] || 'User',
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
          });
          setLoading(false);
        }
      }, 3000); // reduced from 7s to 3s for ultra snappy initial loading times

      unsubscribeSnapshot.current = userService.subscribeToUser(clerkUser.uid, (data) => {
        if (initialLoadTimeout) {
          clearTimeout(initialLoadTimeout);
          initialLoadTimeout = null;
        }

        if (!isMounted.current) return;
        
        if (data) {
          if (isSuperAdmin({ ...data, email: clerkUser.email || data.email }) && data.role !== 'superadmin') {
            userService.updateUser(clerkUser.uid, { role: 'superadmin' });
            data.role = 'superadmin';
          }
          
          setUser(data);
          setLoading(false);

          // Background SQL synchronization
          fetch('/api/sync/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: data.id,
              email: data.email,
              name: data.name,
              role: data.role,
              coins: data.coins,
              diamonds: data.diamonds,
              xp: data.xp,
              level: data.level,
              streak: data.streak
            })
          }).catch(e => console.warn("Pg Sync Failed:", e));

        } else {
          // Guard to prevent concurrent profile creations from rapid re-renders
          if ((window as any)._isInitializingProfile) return;
          (window as any)._isInitializingProfile = true;

          const initUser = async () => {
            try {
              const claimed = await adminService.checkAndClaimPreRegistration(
                clerkUser.email || '', 
                clerkUser.uid, 
                clerkUser.displayName || clerkUser.email?.split('@')[0] || 'User'
              );
              
              if (claimed) {
                if (isMounted.current) {
                  setUser(claimed);
                  setLoading(false);
                }
                return;
              }

              const isDefaultAdmin = isSuperAdmin({ email: clerkUser.email || '' } as User);
              
              const newUser: User = {
                id: clerkUser.uid,
                email: clerkUser.email || '',
                name: clerkUser.displayName || clerkUser.email?.split('@')[0] || 'User',
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

              await userService.createUser(clerkUser.uid, newUser);
              
              if (isMounted.current) {
                setUser(newUser);
                setLoading(false);
              }

              // Background SQL synchronization
              fetch('/api/sync/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  uid: clerkUser.uid,
                  email: clerkUser.email,
                  name: newUser.name,
                  role: newUser.role,
                  coins: newUser.coins,
                  diamonds: newUser.diamonds,
                  xp: newUser.xp,
                  level: newUser.level,
                  streak: newUser.streak
                })
              }).catch(e => console.warn("Pg Sync Failed:", e));

            } finally {
              (window as any)._isInitializingProfile = false;
            }
          };

          initUser().catch((err) => {
            console.error("Failed to initialize user in Firestore:", err);
            if (isMounted.current) {
              const fallbackUser: User = {
                id: clerkUser.uid,
                email: clerkUser.email || '',
                name: clerkUser.displayName || 'Demo User',
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
              setUser(fallbackUser);
              setLoading(false);
            }
          });
        }
      });
    } else {
      setUser(null);
      if (clerkUser === null || !CLERK_PUBLISHABLE_KEY) {
        setLoading(false);
      }
    }
  }, [clerkUser]);

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    console.warn("Firebase Auth is completely removed. Please interact with the Clerk UI form on-screen instead.");
  };

  const signInWithEmail = async (email: string, pass: string) => {
    console.warn("Firebase Auth is completely removed. Please interact with the Clerk UI form on-screen instead.");
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    console.warn("Firebase Auth is completely removed. Please interact with the Clerk UI form on-screen instead.");
  };

  const verifyInviteCode = async (code: string) => {
    if (!authUser) throw new Error("Not authenticated");
    const newUser = await adminService.redeemInviteCode(
        code.trim(),
        authUser.uid,
        authUser.displayName || authUser.email?.split('@')[0] || 'Unnamed user',
        authUser.email || ''
    );
    setUser(newUser);
  };

  const logOut = async () => {
    setUser(null);
    setAuthUser(null);
    setClerkUser(null);
    setLoading(false);
    
    if (clerkSignOutRef.current) {
      try {
        await clerkSignOutRef.current();
      } catch (err) {
        console.warn("Clerk sign out error:", err);
      }
    }
  };

  return (
    <AuthContext.Provider value={{ 
      authUser, 
      user, 
      loading, 
      ...authValues,
      signInWithProvider,
      signInWithEmail,
      signUpWithEmail,
      verifyInviteCode,
      logOut, 
      updateResources, 
      setUser 
    }}>
      <ClerkSync onClerkStateChange={handleClerkStateChange} />
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
