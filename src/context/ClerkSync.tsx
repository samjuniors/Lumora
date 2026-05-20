import React, { useEffect } from 'react';
import { useUser, useAuth as useClerkAuth } from '@clerk/clerk-react';

export const ClerkSync = ({ 
  onClerkStateChange 
}: { 
  onClerkStateChange: (clerkUser: any, signOutFn: () => Promise<void>, firebaseToken?: string | null) => void 
}) => {
  const { user, isLoaded } = useUser();
  const { isLoaded: authLoaded, signOut } = useClerkAuth();

  useEffect(() => {
    if (isLoaded && authLoaded) {
      if (!user) {
        onClerkStateChange(null, () => signOut());
      } else {
        // Optimistically trigger state transition immediately for sub-second loads!
        onClerkStateChange(user, () => signOut(), null);
      }
    }
  }, [user, isLoaded, authLoaded, onClerkStateChange, signOut]);

  return null;
};
