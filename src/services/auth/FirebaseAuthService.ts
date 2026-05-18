import { 
  getAuth, 
  onAuthStateChanged, 
  signInWithPopup, 
  GoogleAuthProvider, 
  OAuthProvider,
  signOut as fbSignOut, 
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  signInWithCustomToken as fbSignInWithCustomToken,
  User as FirebaseUser 
} from 'firebase/auth';
import { auth, googleProvider, appleProvider } from '../firebase';
import { IAuthService } from '../interfaces/IAuthService';

export class FirebaseAuthService implements IAuthService {
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void {
    return onAuthStateChanged(auth, callback);
  }

  async signInWithProvider(providerName: 'google' | 'apple'): Promise<void> {
    const provider = providerName === 'google' ? googleProvider : appleProvider;
    await signInWithPopup(auth, provider);
  }

  async signInWithEmailAndPassword(email: string, password: string): Promise<void> {
    await signInWithEmailAndPassword(auth, email, password);
  }

  async createUserWithEmailAndPassword(email: string, password: string): Promise<void> {
    await createUserWithEmailAndPassword(auth, email, password);
  }

  async signOut(): Promise<void> {
    await fbSignOut(auth);
  }

  async signInWithCustomToken(token: string): Promise<void> {
    await fbSignInWithCustomToken(auth, token);
  }
}
