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
import { pgFetch, HybridDiagnostics } from './hybridDiagnostics';
import { checkDrift, mapPgAssignment } from './hybridUtils';

export class FirebaseAssignmentService extends FirebaseBaseService implements IAssignmentService {

  async getAssignment(assignmentId: string): Promise<Assignment | null> {
    const startTime = Date.now();
    try {
      const pgResult = await pgFetch(`/api/assignments/${assignmentId}`);
      if (pgResult.data && pgResult.data.id) {
        const pgAssignment = pgResult.data;
        const latency = Date.now() - startTime;
        
        HybridDiagnostics.logRead({ entity: 'Assignment', entityId: assignmentId, source: 'pg', latencyMs: latency, success: true });

        // Best effort async fetch for drift detection (temporary)
        getDoc(doc(db, 'assignments', assignmentId)).then(snap => {
          if (snap.exists()) {
            checkDrift('Assignment', assignmentId, { id: snap.id, ...snap.data() }, pgAssignment, [
              'title', 'description', 'dueDate', 'points', 'status', 'createdBy', 
              'hasAiFeedback', 'requireUpload', 'difficulty', 'category', 'timeLimit', 'maxAttempts'
            ]);
          }
        }).catch(() => {});

        return mapPgAssignment(pgAssignment);
      }
      throw new Error("Invalid SQL response");
    } catch (error: any) {
      console.warn("[Operation Fallback] Assignment read failed in SQL, falling back to Firestore:", error.message);
      HybridDiagnostics.logRead({ entity: 'Assignment', entityId: assignmentId, source: 'pg', latencyMs: Date.now() - startTime, success: false, reason: error.message });
      
      try {
        const fsStartTime = Date.now();
        const snap = await getDoc(doc(db, 'assignments', assignmentId));
        if (snap.exists()) {
          HybridDiagnostics.logRead({ entity: 'Assignment', entityId: assignmentId, source: 'fs', latencyMs: Date.now() - fsStartTime, success: true });
          return { id: snap.id, ...snap.data() } as Assignment;
        }
        return null;
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.GET, `assignments/${assignmentId}`);
        return null;
      }
    }
  }

  async getAllAssignments(): Promise<Assignment[]> {
    return this.fetchWithCache(
      'all_assignments',
      120000,
      async () => {
        const startTime = Date.now();
        try {
          const pgResult = await pgFetch(`/api/assignments?limit=1000`);
          if (pgResult.data && Array.isArray(pgResult.data)) {
            const latency = Date.now() - startTime;
            HybridDiagnostics.logRead({ entity: 'Assignment_List', entityId: 'all', source: 'pg', latencyMs: latency, success: true });
            
            // Best effort async fetch for drift detection
            getDocs(query(collection(db, 'assignments'), orderBy('createdAt', 'desc'))).then(snap => {
              if (!snap.empty) {
                const fsAssignments = Object.fromEntries(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
                pgResult.data.forEach((pgA: any) => {
                  checkDrift('Assignment', pgA.id, fsAssignments[pgA.id], pgA, [
                    'title', 'description', 'dueDate', 'points', 'status', 'createdBy', 
                    'hasAiFeedback', 'requireUpload', 'difficulty', 'category', 'timeLimit', 'maxAttempts'
                  ]);
                });
              }
            }).catch(() => {});

            return pgResult.data.map(mapPgAssignment);
          }
          throw new Error("Invalid SQL response");
        } catch (error: any) {
          console.warn("[Operation Fallback] Assignment getAllAssignments failed in SQL, falling back to Firestore:", error.message);
          HybridDiagnostics.logRead({ entity: 'Assignment_List', entityId: 'all', source: 'pg', latencyMs: Date.now() - startTime, success: false, reason: error.message });
          
          try {
            const fsStartTime = Date.now();
            const q = query(collection(db, 'assignments'), orderBy('createdAt', 'desc'));
            const snap = await getDocs(q);
            HybridDiagnostics.logRead({ entity: 'Assignment_List', entityId: 'all', source: 'fs', latencyMs: Date.now() - fsStartTime, success: true });
            return snap.docs.map(d => ({ ...d.data(), id: d.id } as Assignment));
          } catch (fsError) {
            handleFirestoreError(fsError, OperationType.LIST, 'assignments');
            return [];
          }
        }
      },
      { type: OperationType.LIST, path: 'assignments' }
    );
  }

  async createAssignment(data: Omit<Assignment, 'id'>): Promise<string> {
    const docRef = doc(collection(db, 'assignments'));
    const id = docRef.id;
    const payload = { id, ...data, createdAt: new Date().toISOString() };
    
    try {
      // Primary Write to SQL (we'll just use the /api/sync/assignment endpoint which acts as an upsert)
      await pgFetch('/api/sync/assignment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      HybridDiagnostics.logWrite({ entity: 'Assignment', entityId: id, success: true });

      // Fallback Dual-Write to Firestore
      setDoc(docRef, payload)
        .catch(e => console.error("[Sync Drift] Firestore fallback create failed for assignment", id, e));

      return id;
    } catch (pgError: any) {
      HybridDiagnostics.logWrite({ entity: 'Assignment', entityId: id, success: false, reason: String(pgError) });
      
      // If SQL fails, try Firestore
      try {
        await setDoc(docRef, payload);
        return id;
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.CREATE, 'assignments');
        return '';
      }
    }
  }

  async updateAssignment(assignmentId: string, data: Partial<Assignment>): Promise<void> {
    try {
      // Primary Write to SQL
      await pgFetch(`/api/assignments/${assignmentId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      HybridDiagnostics.logWrite({ entity: 'Assignment', entityId: assignmentId, success: true });

      // Fallback Dual-Write to Firestore
      updateDoc(doc(db, 'assignments', assignmentId), { ...data, updatedAt: Date.now() })
        .catch(e => console.error("[Sync Drift] Firestore fallback update failed for assignment", assignmentId, e));

    } catch (pgError: any) {
      HybridDiagnostics.logWrite({ entity: 'Assignment', entityId: assignmentId, success: false, reason: String(pgError) });
      
      try {
        await updateDoc(doc(db, 'assignments', assignmentId), { ...data, updatedAt: Date.now() });
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.UPDATE, `assignments/${assignmentId}`);
      }
    }
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    try {
      await pgFetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
      HybridDiagnostics.logWrite({ entity: 'Assignment_Delete', entityId: assignmentId, success: true });
      
      deleteDoc(doc(db, 'assignments', assignmentId)).catch(() => {});
    } catch (pgError: any) {
      HybridDiagnostics.logWrite({ entity: 'Assignment_Delete', entityId: assignmentId, success: false, reason: String(pgError) });
      console.warn("[Operation Fallback] SQL delete failed, falling back to FS", pgError);
      
      try {
        await deleteDoc(doc(db, 'assignments', assignmentId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `assignments/${assignmentId}`);
      }
    }
  }

  async getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
    try {
      const pgResult = await pgFetch(`/api/enrollments?studentId=${studentId}`);
      if (pgResult.data && Array.isArray(pgResult.data)) {
        HybridDiagnostics.logRead({ entity: 'Enrollment_List', entityId: studentId, source: 'pg', latencyMs: 0, success: true });
        return pgResult.data;
      }
    } catch {}
    
    // Fallback
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
      const pgResult = await pgFetch(`/api/enrollments`);
      if (pgResult.data && Array.isArray(pgResult.data)) {
        return pgResult.data;
      }
    } catch {}

    // Fallback
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
      await pgFetch(`/api/enrollments/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      HybridDiagnostics.logWrite({ entity: 'Enrollment', entityId: id, success: true });
      updateDoc(doc(db, 'enrollments', id), { ...data, updatedAt: Date.now() }).catch(() => {});
    } catch {
      try {
        await updateDoc(doc(db, 'enrollments', id), { ...data, updatedAt: Date.now() });
      } catch (error) {
        handleFirestoreError(error, OperationType.UPDATE, `enrollments/${id}`);
      }
    }
  }

  async createEnrollment(data: Omit<Enrollment, 'id'>): Promise<string> {
    const docRef = doc(collection(db, 'enrollments'));
    const id = docRef.id;
    const payload = { ...data, enrolledAt: Date.now(), updatedAt: Date.now() };

    try {
      await pgFetch('/api/enrollments', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...payload, id })
      });
      HybridDiagnostics.logWrite({ entity: 'Enrollment', entityId: id, success: true });
      setDoc(docRef, payload).catch(() => {});
      return id;
    } catch {
      try {
        await setDoc(docRef, payload);
        return id;
      } catch (error) {
        handleFirestoreError(error, OperationType.CREATE, 'enrollments');
        return '';
      }
    }
  }

  async deleteEnrollment(id: string): Promise<void> {
    try {
      await pgFetch(`/api/enrollments/${id}`, { method: 'DELETE' });
      deleteDoc(doc(db, 'enrollments', id)).catch(() => {});
    } catch {
      try {
        await deleteDoc(doc(db, 'enrollments', id));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `enrollments/${id}`);
      }
    }
  }

  async getAssignmentTemplates(): Promise<AssignmentTemplate[]> {
    HybridDiagnostics.logFirebaseDependency('getAssignmentTemplates');
    try {
      const snap = await getDocs(collection(db, 'assignment_templates'));
      return snap.docs.map(d => ({ ...d.data(), id: d.id } as AssignmentTemplate));
    } catch (error) {
      handleFirestoreError(error, OperationType.LIST, 'assignment_templates');
      return [];
    }
  }

  async createAssignmentTemplate(data: Omit<AssignmentTemplate, 'id'>): Promise<string> {
    HybridDiagnostics.logFirebaseDependency('createAssignmentTemplate');
    try {
      const docRef = await addDoc(collection(db, 'assignment_templates'), data);
      return docRef.id;
    } catch (error) {
      handleFirestoreError(error, OperationType.CREATE, 'assignment_templates');
      return '';
    }
  }

  async saveAssignmentTemplate(id: string, data: AssignmentTemplate): Promise<void> {
    HybridDiagnostics.logFirebaseDependency('saveAssignmentTemplate');
    try {
      await setDoc(doc(db, 'assignment_templates', id), data);
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, `assignment_templates/${id}`);
    }
  }

  async deleteAssignmentTemplate(id: string): Promise<void> {
    HybridDiagnostics.logFirebaseDependency('deleteAssignmentTemplate');
    try {
      await deleteDoc(doc(db, 'assignment_templates', id));
    } catch (error) {
      handleFirestoreError(error, OperationType.DELETE, `assignment_templates/${id}`);
    }
  }
}
