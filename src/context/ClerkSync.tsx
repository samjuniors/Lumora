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
        // Optimistically trigger state transition immediately to ensure sub-second loads!
        onClerkStateChange(user, () => signOut(), null);

        // Fetch integration token in the background, updating only if valid
        getToken({ template: 'integration_firebase' }).then((token) => {
          if (token) {
            onClerkStateChange(user, () => signOut(), token);
          }
        }).catch((err) => {
          // Failure to fetch integration token is expected for standard setups
          console.debug("Optional Clerk-Firebase integration token not found/enabled:", err);
        });
      }
    }
  }, [user, isLoaded, authLoaded, onClerkStateChange, signOut, getToken]);

  return null;
};
