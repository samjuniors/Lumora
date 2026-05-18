import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { ISyndicateService } from '../interfaces/ISyndicateService';
import { Syndicate } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errorHandling';
import { FirebaseBaseService } from './FirebaseBaseService';

export class FirebaseSyndicateService extends FirebaseBaseService implements ISyndicateService {
  async getAllSyndicates(): Promise<Syndicate[]> {
    try {
      const snap = await getDocs(collection(db, 'syndicates'));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Syndicate));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'syndicates');
      return [];
    }
  }

  async createSyndicate(data: Omit<Syndicate, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'syndicates'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'syndicates');
      return '';
    }
  }

  async updateSyndicate(id: string, data: Partial<Syndicate>): Promise<void> {
    try {
      await updateDoc(doc(db, 'syndicates', id), { ...data, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `syndicates/${id}`);
    }
  }
}
