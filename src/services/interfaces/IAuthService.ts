import { User as FirebaseUser } from 'firebase/auth'; // We'll eventually replace this with a generic User type

export interface IAuthService {
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void;
  signInWithGoogle(): Promise<void>;
  signOut(): Promise<void>;
  getCurrentUser(): FirebaseUser | null;
}
