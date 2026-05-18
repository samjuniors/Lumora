import React, { createContext, useContext, useEffect, useState, useMemo } from 'react';
import { authService, userService, adminService, dbService } from '../services/dbProvider';
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
  updateResources: (resources: Partial<{ coins: number; diamonds: number; xp: number }>) => void;
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

  // Track sources so they don't overwrite each other chaotically
  const [firebaseUser, setFirebaseUser] = useState<AuthUser | null | undefined>(undefined);
  const [clerkUser, setClerkUser] = useState<AuthUser | null | undefined>(CLERK_PUBLISHABLE_KEY ? undefined : null);

  const activeAuthSource = clerkUser ? 'clerk' : (firebaseUser ? 'firebase' : null);
  const activeSessionUser = clerkUser || firebaseUser;
  const isAuthInitialized = firebaseUser !== undefined && clerkUser !== undefined;

  useEffect(() => {
    isMounted.current = true;
    const unsubscribeAuth = authService.onAuthStateChanged(async (fUser) => {
      if (!isMounted.current) return;
      
      if (fUser) {
        console.info(`[AuthContext:Diagnostic] Firebase Auth Listener fired. UID: ${fUser.uid}`);
        if (CLERK_PUBLISHABLE_KEY) {
          console.warn("[AuthContext:Diagnostic] Legacy Firebase Auth path active alongside Clerk. This is a deprecated fallback, prepare for full Firebase Auth removal.");
        }
      }

      setFirebaseUser(prev => {
        if (!fUser && !prev) return prev;
        if (fUser && prev && fUser.uid === prev.uid && fUser.email === prev.email) {
          return prev;
        }
        return fUser ? {
          uid: fUser.uid,
          email: fUser.email,
          displayName: fUser.displayName,
          source: 'firebase'
        } : null;
      });
    });

    return () => {
      isMounted.current = false;
      unsubscribeAuth();
      if (unsubscribeSnapshot.current) {
        unsubscribeSnapshot.current();
      }
    };
  }, []);

  const clerkSignOutRef = React.useRef<(() => Promise<void>) | null>(null);

  const handleClerkStateChange = React.useCallback(async (cUser: any, signOutFn: (() => Promise<void>) | null = null, firebaseToken?: string | null) => {
    if (!isMounted.current) return;
    clerkSignOutRef.current = signOutFn;

    setClerkUser(prev => {
      if (!cUser && !prev) return prev;
      if (cUser && prev && cUser.id === prev.uid && cUser.primaryEmailAddress?.emailAddress === prev.email) {
        return prev; // Prevent unnecessary object creation and re-renders
      }
      if (cUser) {
        console.info(`[AuthContext:Diagnostic] Clerk state change fired. UID: ${cUser.id}`);
      }
      return cUser ? {
        uid: cUser.id,
        email: cUser.primaryEmailAddress?.emailAddress || null,
        displayName: cUser.fullName || null,
        source: 'clerk'
      } : null;
    });

    // If Clerk provided a Firebase custom token, use it to automatically sign in to Firebase
    if (firebaseToken && authService.signInWithCustomToken) {
      try {
        await authService.signInWithCustomToken(firebaseToken);
      } catch (err) {
        console.error("Failed to sign in to Firebase with Clerk token:", err);
      }
    }
  }, []);

  useEffect(() => {
    if (!isMounted.current) return;
    setAuthUser(activeSessionUser);

    if (unsubscribeSnapshot.current) {
      unsubscribeSnapshot.current();
      unsubscribeSnapshot.current = null;
    }

    if (activeSessionUser) {
      console.info(`[AuthContext:Diagnostic] Hydrating Firestore profile using source: ${activeSessionUser.source || 'unknown'} for UID: ${activeSessionUser.uid}`);
      unsubscribeSnapshot.current = userService.subscribeToUser(activeSessionUser.uid, (data) => {
        if (!isMounted.current) return;
        
        if (data) {
          if (isSuperAdmin({ ...data, email: activeSessionUser.email || data.email }) && data.role !== 'superadmin') {
            userService.updateUser(activeSessionUser.uid, { role: 'superadmin' });
            data.role = 'superadmin';
          }
          
          setUser(data);
          setLoading(false);

          // Background SQL synchronization (Non-blocking migration step)
          fetch('/api/sync/user', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              uid: data.id,
              email: data.email,
              name: data.name,
              role: data.role
            })
          }).catch(e => console.warn("Pg Sync Failed:", e));

        } else {
          // Guard to prevent concurrent profile creations from rapid re-renders
          if ((window as any)._isInitializingProfile) return;
          (window as any)._isInitializingProfile = true;

          const initUser = async () => {
            try {
              const claimed = await adminService.checkAndClaimPreRegistration(
                activeSessionUser.email || '', 
                activeSessionUser.uid, 
                activeSessionUser.displayName || activeSessionUser.email?.split('@')[0] || 'User'
              );
              
              if (claimed) return;

              const isDefaultAdmin = isSuperAdmin({ email: activeSessionUser.email || '' } as User);
              
              const newUser: User = {
                id: activeSessionUser.uid,
                email: activeSessionUser.email || '',
                name: activeSessionUser.displayName || activeSessionUser.email?.split('@')[0] || 'User',
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

              await userService.createUser(activeSessionUser.uid, newUser);

              // Background SQL synchronization (Non-blocking migration step)
              fetch('/api/sync/user', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                  uid: activeSessionUser.uid,
                  email: activeSessionUser.email,
                  name: newUser.name,
                  role: newUser.role
                })
              }).catch(e => console.warn("Pg Sync Failed:", e));

            } finally {
              (window as any)._isInitializingProfile = false;
            }
          };

          initUser().catch((err) => {
            console.error("Failed to initialize user in Firestore:", err);
            if (isMounted.current) {
              // Gracefully fallback to a synthetic user if Firestore fails (e.g. missing Firebase Clerk integration)
              const fallbackUser: User = {
                id: activeSessionUser.uid,
                email: activeSessionUser.email || '',
                name: activeSessionUser.displayName || 'Demo User',
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
    } else if (isAuthInitialized) {
      // Both sources are conclusively null
      setUser(null);
      setLoading(false);
    }
  }, [activeSessionUser?.uid, activeSessionUser?.email]);

  const signInWithProvider = async (provider: 'google' | 'apple') => {
    if (CLERK_PUBLISHABLE_KEY) {
      console.warn("[AuthContext:Diagnostic] Triggering legacy Firebase Auth signInWithProvider. If using Clerk, this path should be updated or bypassed.");
    }
    await authService.signInWithProvider(provider);
  };

  const signInWithEmail = async (email: string, pass: string) => {
    if (CLERK_PUBLISHABLE_KEY) {
      console.warn("[AuthContext:Diagnostic] Triggering legacy Firebase Auth signInWithEmail. If using Clerk, this path should be updated or bypassed.");
    }
    await authService.signInWithEmailAndPassword(email, pass);
  };

  const signUpWithEmail = async (email: string, pass: string) => {
    if (CLERK_PUBLISHABLE_KEY) {
      console.warn("[AuthContext:Diagnostic] Triggering legacy Firebase Auth signUpWithEmail. If using Clerk, this path should be updated or bypassed.");
    }
    await authService.createUserWithEmailAndPassword(email, pass);
  };

  const verifyInviteCode = async (code: string) => {
    if (!authUser) throw new Error("Not authenticated");
    const newUser = await dbService.redeemInviteCode(
        code.trim(),
        authUser.uid,
        authUser.displayName || authUser.email?.split('@')[0] || 'Unnamed user',
        authUser.email || ''
    );
    setUser(newUser);
  };

  const logOut = async () => {
    // Sign out from Clerk if active
    if (clerkSignOutRef.current) {
      await clerkSignOutRef.current();
    }
    // Sign out from Firebase Auth
    await authService.signOut();
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
      {CLERK_PUBLISHABLE_KEY && <ClerkSync onClerkStateChange={handleClerkStateChange} />}
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
