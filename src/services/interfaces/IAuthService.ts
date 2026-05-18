import { User as FirebaseUser } from 'firebase/auth'; // We'll eventually replace this with a generic User type

export interface IAuthService {
  onAuthStateChanged(callback: (user: FirebaseUser | null) => void): () => void;
  signInWithProvider(provider: 'google' | 'apple'): Promise<void>;
  signInWithEmailAndPassword(email: string, password: string): Promise<void>;
  createUserWithEmailAndPassword(email: string, password: string): Promise<void>;
  signInWithCustomToken?(token: string): Promise<void>;
  signOut(): Promise<void>;
}
