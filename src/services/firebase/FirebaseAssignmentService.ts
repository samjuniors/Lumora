import { 
  doc, 
  getDoc, 
  updateDoc, 
  collection, 
  query, 
  where, 
  getDocs, 
  addDoc,
  setDoc,
  orderBy, 
  deleteDoc
} from 'firebase/firestore';
import { db } from '../firebase';
import { IAssignmentService } from '../interfaces/IAssignmentService';
import { Assignment, AssignmentTemplate, Enrollment } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errorHandling';
import { FirebaseBaseService } from './FirebaseBaseService';

export class FirebaseAssignmentService extends FirebaseBaseService implements IAssignmentService {
  async getAssignment(assignmentId: string): Promise<Assignment | null> {
    try {
      const snap = await getDoc(doc(db, 'assignments', assignmentId));
      return snap.exists() ? { id: snap.id, ...snap.data() } as Assignment : null;
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, `assignments/${assignmentId}`);
      return null;
    }
  }

  async getAllAssignments(): Promise<Assignment[]> {
    return this.fetchWithCache(
      'all_assignments',
      120000,
      async () => {
        const q = query(collection(db, 'assignments'), orderBy('createdAt', 'desc'));
        const snap = await getDocs(q);
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as Assignment));
      },
      { type: OperationType.LIST, path: 'assignments' }
    );
  }

  async createAssignment(data: Omit<Assignment, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'assignments'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assignments');
      return '';
    }
  }

  async updateAssignment(assignmentId: string, data: Partial<Assignment>): Promise<void> {
    try {
      await updateDoc(doc(db, 'assignments', assignmentId), { ...data, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `assignments/${assignmentId}`);
    }
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'assignments', assignmentId));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assignments/${assignmentId}`);
    }
  }

  async getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
    try {
      const q = query(collection(db, 'enrollments'), where('studentId', '==', studentId));
      const snap = await getDocs(q);
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Enrollment));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'enrollments');
      return [];
    }
  }

  async getAllEnrollments(): Promise<Enrollment[]> {
    try {
      const snap = await getDocs(collection(db, 'enrollments'));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as Enrollment));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'enrollments');
      return [];
    }
  }

  async updateEnrollment(id: string, data: Partial<Enrollment>): Promise<void> {
    try {
      await updateDoc(doc(db, 'enrollments', id), { ...data, updatedAt: Date.now() });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `enrollments/${id}`);
    }
  }

  async createEnrollment(data: Omit<Enrollment, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'enrollments'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'enrollments');
      return '';
    }
  }

  async deleteEnrollment(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'enrollments', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `enrollments/${id}`);
    }
  }

  async getAssignmentTemplates(): Promise<AssignmentTemplate[]> {
    try {
      const snap = await getDocs(collection(db, 'assignment_templates'));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as AssignmentTemplate));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'assignment_templates');
      return [];
    }
  }

  async createAssignmentTemplate(data: Omit<AssignmentTemplate, 'id'>): Promise<string> {
    try {
      const docRef = await addDoc(collection(db, 'assignment_templates'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assignment_templates');
      return '';
    }
  }

  async saveAssignmentTemplate(id: string, data: AssignmentTemplate): Promise<void> {
    try {
      await setDoc(doc(db, 'assignment_templates', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `assignment_templates/${id}`);
    }
  }

  async deleteAssignmentTemplate(id: string): Promise<void> {
    try {
      await deleteDoc(doc(db, 'assignment_templates', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assignment_templates/${id}`);
    }
  }
}
