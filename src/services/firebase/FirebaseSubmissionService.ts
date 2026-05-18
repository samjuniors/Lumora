import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc, 
  orderBy, 
  deleteDoc,
  onSnapshot,
  limit as fsLimit
} from 'firebase/firestore';
import { db } from '../firebase';
import { ISubmissionService } from '../interfaces/ISubmissionService';
import { Submission, Assignment } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errorHandling';
import { FirebaseBaseService } from './FirebaseBaseService';

export class FirebaseSubmissionService extends FirebaseBaseService implements ISubmissionService {
  async getSubmission(submissionId: string): Promise<Submission | null> {
    try {
      const snap = await getDoc(doc(db, 'submissions', submissionId));
      return snap.exists() ? { id: snap.id, ...snap.data() } as Submission : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `submissions/${submissionId}`);
      return null;
    }
  }

  async getAllSubmissions(): Promise<Submission[]> {
    try {
      const q = query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
      return [];
    }
  }

  async getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
    try {
      const q = query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
      return [];
    }
  }

  async getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
    try {
      const q = query(collection(db, 'submissions'), where('studentId', '==', studentId), orderBy('submittedAt', 'desc'));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
      return [];
    }
  }

  async createSubmission(data: Omit<Submission, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'submissions'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'submissions');
      return '';
    }
  }

  async updateSubmission(submissionId: string, data: Partial<Submission>): Promise<void> {
    try {
      await updateDoc(doc(db, 'submissions', submissionId), { ...data, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `submissions/${submissionId}`);
    }
  }

  async deleteSubmission(submissionId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'submissions', submissionId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `submissions/${submissionId}`);
    }
  }

  async getAllAssessedSubmissions(): Promise<Submission[]> {
    return this.fetchWithCache(
      'assessed_submissions',
      180000,
      async () => {
        const q = query(
          collection(db, 'submissions'),
          where('status', '==', 'assessed'),
          orderBy('submittedAt', 'desc'),
          fsLimit(200)
        );
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
      },
      { type: OperationType.LIST, path: 'assessed_submissions' }
    );
  }

  subscribeToAssessedSubmissions(callback: (submissions: Submission[]) => void): () => void {
    const q = query(collection(db, 'submissions'), where('status', '==', 'assessed'));
    const cleanup = this.TRACK_LISTENER('submissions/assessed');
    const unsub = onSnapshot(q, (snapshot) => {
      const submissions = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id } as Submission));
      callback(submissions);
    }, (error) => {
      handleFirestoreError(error, OperationType.LIST, 'submissions');
      callback([]);
    });
    return () => {
      unsub();
      cleanup();
    };
  }

  async getRecentAssessedMissions(userId: string, limitCount: number): Promise<{ submission: Submission, assignment: Assignment }[]> {
    const q = query(
      collection(db, 'submissions'),
      where('studentId', '==', userId),
      where('status', '==', 'assessed'),
      orderBy('updatedAt', 'desc'),
      fsLimit(limitCount)
    );
    const snap = await getDocs(q);
    const results: { submission: Submission, assignment: Assignment }[] = [];
    
    for (const d of snap.docs) {
      const sub = { id: d.id, ...d.data() } as Submission;
      const aDoc = await getDoc(doc(db, 'assignments', sub.assignmentId));
      if (aDoc.exists()) {
        results.push({
          submission: sub,
          assignment: { id: aDoc.id, ...aDoc.data() } as Assignment
        });
      }
    }
    return results;
  }
}
