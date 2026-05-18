import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  signOut as fbSignOut, 
  User as FirebaseUser 
} from 'firebase/auth';
import { auth } from '../firebase';
import { IAuthService } from '../interfaces/IAuthService';

export class FirebaseAuthService implements IAuthService {
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  async signInWithGoogle(): Promise<void> {
    const provider = new GoogleAuthProvider();
    await signInWithPopup(auth, provider);
  }

  async signOut(): Promise<void> {
    await fbSignOut(auth);
  }

  getCurrentUser(): FirebaseUser | null {
    return auth.currentUser;
  }
}
