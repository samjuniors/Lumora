import React, { useEffect } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';

export const ClerkSync = ({ 
  onClerkStateChange 
}: { 
  onClerkStateChange: (clerkUser: any, signOutFn: () => Promise<void>, firebaseToken?: string | null) => void 
}) => {
  const { user, isLoaded } = useUser();
  const { isLoaded: authLoaded, signOut, getToken } = useClerkAuth();

  useEffect(() => {
    if (isLoaded && authLoaded) {
      if (!user) {
        onClerkStateChange(null, () => signOut());
      } else {
        // Try fetching Firebase integration token
        getToken({ template: 'integration_firebase' }).then((token) => {
          onClerkStateChange(user, () => signOut(), token);
        }).catch((err) => {
          console.warn("Could not fetch firebase integration token from Clerk:", err);
          onClerkStateChange(user, () => signOut(), null);
        });
      }
    }
  }, [user, isLoaded, authLoaded, onClerkStateChange, signOut, getToken]);

  return null;
};
