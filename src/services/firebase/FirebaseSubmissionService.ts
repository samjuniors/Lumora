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
  deleteDoc,
  onSnapshot,
  limit as fsLimit
} from 'firebase/firestore';
import { db } from '../firebase';
import { ISubmissionService } from '../interfaces/ISubmissionService';
import { Submission, Assignment } from '../../types';
import { handleFirestoreError, OperationType } from '../../lib/errorHandling';
import { FirebaseBaseService } from './FirebaseBaseService';
import { HybridDiagnostics, pgFetch } from './hybridDiagnostics';
import { checkDrift, mapPgSubmission, mapPgAssignment } from './hybridUtils';

export class FirebaseSubmissionService extends FirebaseBaseService implements ISubmissionService {

  async getSubmission(submissionId: string): Promise<Submission | null> {
    const startTime = Date.now();
    try {
      const pgResult = await pgFetch(`/api/submissions/${submissionId}`);
      if (pgResult.data && pgResult.data.id) {
        const pgSubmission = pgResult.data;
        const latency = Date.now() - startTime;
        
        HybridDiagnostics.logRead({ entity: 'Submission', entityId: submissionId, source: 'pg', latencyMs: latency, success: true });

        // Best effort async fetch for drift detection (temporary)
        getDoc(doc(db, 'submissions', submissionId)).then(snap => {
          if (snap.exists()) {
            checkDrift('Submission', submissionId, { id: snap.id, ...snap.data() }, pgSubmission, [
              'assignmentId', 'studentId', 'content', 'aiScore', 
              'aiFeedback', 'calculatedReward', 'penaltyAmount', 'status',
              'tabSwitches', 'pasteCount'
            ]);
          }
        }).catch(() => {});

        return mapPgSubmission(pgSubmission);
      }
      throw new Error("Invalid SQL response");
    } catch (error: any) {
      console.warn("[Operation Fallback] Submission read failed in SQL, falling back to Firestore:", error.message);
      HybridDiagnostics.logRead({ entity: 'Submission', entityId: submissionId, source: 'pg', latencyMs: Date.now() - startTime, success: false, reason: error.message });
      
      try {
        const fsStartTime = Date.now();
        const snap = await getDoc(doc(db, 'submissions', submissionId));
        if (snap.exists()) {
          HybridDiagnostics.logRead({ entity: 'Submission', entityId: submissionId, source: 'fs', latencyMs: Date.now() - fsStartTime, success: true });
          return { id: snap.id, ...snap.data() } as Submission;
        }
        return null;
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.GET, `submissions/${submissionId}`);
        return null;
      }
    }
  }

  async getAllSubmissions(): Promise<Submission[]> {
    const startTime = Date.now();
    try {
      const pgResult = await pgFetch(`/api/submissions?limit=1000`);
      if (pgResult.data && Array.isArray(pgResult.data)) {
        const latency = Date.now() - startTime;
        HybridDiagnostics.logRead({ entity: 'Submission_List', entityId: 'all', source: 'pg', latencyMs: latency, success: true });
        
        // Best effort async fetch for drift detection
        getDocs(query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'))).then(snap => {
          if (!snap.empty) {
            const fsSubmissions = Object.fromEntries(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
            pgResult.data.forEach((pgS: any) => {
              checkDrift('Submission', pgS.id, fsSubmissions[pgS.id], pgS, [
                'assignmentId', 'studentId', 'content', 'aiScore', 
                'aiFeedback', 'calculatedReward', 'penaltyAmount', 'status',
                'tabSwitches', 'pasteCount'
              ]);
            });
          }
        }).catch(() => {});

        return pgResult.data.map(mapPgSubmission);
      }
      throw new Error("Invalid SQL response");
    } catch (error: any) {
      console.warn("[Operation Fallback] Submission getAllSubmissions failed in SQL, falling back to Firestore:", error.message);
      HybridDiagnostics.logRead({ entity: 'Submission_List', entityId: 'all', source: 'pg', latencyMs: Date.now() - startTime, success: false, reason: error.message });
      
      try {
        const fsStartTime = Date.now();
        const q = query(collection(db, 'submissions'), orderBy('submittedAt', 'desc'));
        const snap = await getDocs(q);
        HybridDiagnostics.logRead({ entity: 'Submission_List', entityId: 'all', source: 'fs', latencyMs: Date.now() - fsStartTime, success: true });
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.LIST, 'submissions');
        return [];
      }
    }
  }

  async getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
    const startTime = Date.now();
    try {
      const pgResult = await pgFetch(`/api/submissions?assignmentId=${encodeURIComponent(assignmentId)}`);
      if (pgResult.data && Array.isArray(pgResult.data)) {
        const latency = Date.now() - startTime;
        HybridDiagnostics.logRead({ entity: 'Submission_List', entityId: assignmentId, source: 'pg', latencyMs: latency, success: true });
        
        const q = query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId));
        getDocs(q).then(snap => {
          if (!snap.empty) {
            const fsSubmissions = Object.fromEntries(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
            pgResult.data.forEach((pgS: any) => {
              checkDrift('Submission', pgS.id, fsSubmissions[pgS.id], pgS, [
                'assignmentId', 'studentId', 'content', 'aiScore', 
                'aiFeedback', 'calculatedReward', 'penaltyAmount', 'status',
                'tabSwitches', 'pasteCount'
              ]);
            });
          }
        }).catch(() => {});

        return pgResult.data.map(mapPgSubmission);
      }
      throw new Error("Invalid SQL response");
    } catch (error: any) {
      console.warn(`[Operation Fallback] Submission getSubmissionsByAssignment(${assignmentId}) failed in SQL, falling back to FS:`, error.message);
      HybridDiagnostics.logRead({ entity: 'Submission_List', entityId: assignmentId, source: 'pg', latencyMs: Date.now() - startTime, success: false, reason: error.message });
      
      try {
        const fsStartTime = Date.now();
        const q = query(collection(db, 'submissions'), where('assignmentId', '==', assignmentId));
        const snap = await getDocs(q);
        HybridDiagnostics.logRead({ entity: 'Submission_List', entityId: assignmentId, source: 'fs', latencyMs: Date.now() - fsStartTime, success: true });
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.LIST, 'submissions');
        return [];
      }
    }
  }

  async getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
    const startTime = Date.now();
    try {
      const pgResult = await pgFetch(`/api/submissions?studentId=${encodeURIComponent(studentId)}`);
      if (pgResult.data && Array.isArray(pgResult.data)) {
        const latency = Date.now() - startTime;
        HybridDiagnostics.logRead({ entity: 'Submission_List', entityId: studentId, source: 'pg', latencyMs: latency, success: true });
        
        const q = query(collection(db, 'submissions'), where('studentId', '==', studentId), orderBy('submittedAt', 'desc'));
        getDocs(q).then(snap => {
          if (!snap.empty) {
            const fsSubmissions = Object.fromEntries(snap.docs.map(d => [d.id, { ...d.data(), id: d.id }]));
            pgResult.data.forEach((pgS: any) => {
              checkDrift('Submission', pgS.id, fsSubmissions[pgS.id], pgS, [
                'assignmentId', 'studentId', 'content', 'aiScore', 
                'aiFeedback', 'calculatedReward', 'penaltyAmount', 'status',
                'tabSwitches', 'pasteCount'
              ]);
            });
          }
        }).catch(() => {});

        return pgResult.data.map(mapPgSubmission);
      }
      throw new Error("Invalid SQL response");
    } catch (error: any) {
      console.warn(`[Operation Fallback] Submission getSubmissionsByStudent(${studentId}) failed in SQL, falling back to FS:`, error.message);
      HybridDiagnostics.logRead({ entity: 'Submission_List', entityId: studentId, source: 'pg', latencyMs: Date.now() - startTime, success: false, reason: error.message });
      
      try {
        const fsStartTime = Date.now();
        const q = query(collection(db, 'submissions'), where('studentId', '==', studentId), orderBy('submittedAt', 'desc'));
        const snap = await getDocs(q);
        HybridDiagnostics.logRead({ entity: 'Submission_List', entityId: studentId, source: 'fs', latencyMs: Date.now() - fsStartTime, success: true });
        return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.LIST, 'submissions');
        return [];
      }
    }
  }

  async createSubmission(data: Omit<Submission, 'id'>): Promise<string> {
    const docRef = doc(collection(db, 'submissions'));
    const id = docRef.id;
    const payload = { id, ...data, submittedAt: new Date().toISOString() };
    
    try {
      // Primary Write to SQL
      await pgFetch('/api/sync/submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      HybridDiagnostics.logWrite({ entity: 'Submission', entityId: id, success: true });

      // Fallback Dual-Write to Firestore
      setDoc(docRef, payload)
        .catch(e => console.error("[Sync Drift] Firestore fallback create failed for submission", id, e));

      return id;
    } catch (pgError: any) {
      HybridDiagnostics.logWrite({ entity: 'Submission', entityId: id, success: false, reason: String(pgError) });
      
      // If SQL fails, try Firestore
      try {
        await setDoc(docRef, payload);
        return id;
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.CREATE, 'submissions');
        return '';
      }
    }
  }

  async updateSubmission(submissionId: string, data: Partial<Submission>): Promise<void> {
    try {
      // Primary Write to SQL
      await pgFetch(`/api/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
      HybridDiagnostics.logWrite({ entity: 'Submission', entityId: submissionId, success: true });

      // Fallback Dual-Write to Firestore
      updateDoc(doc(db, 'submissions', submissionId), { ...data, updatedAt: Date.now() })
        .catch(e => console.error("[Sync Drift] Firestore fallback update failed for submission", submissionId, e));

    } catch (pgError: any) {
      HybridDiagnostics.logWrite({ entity: 'Submission', entityId: submissionId, success: false, reason: String(pgError) });
      
      try {
        await updateDoc(doc(db, 'submissions', submissionId), { ...data, updatedAt: Date.now() });
      } catch (fsError) {
        handleFirestoreError(fsError, OperationType.UPDATE, `submissions/${submissionId}`);
      }
    }
  }

  async deleteSubmission(submissionId: string): Promise<void> {
    try {
      await pgFetch(`/api/submissions/${submissionId}`, { method: 'DELETE' });
      HybridDiagnostics.logWrite({ entity: 'Submission_Delete', entityId: submissionId, success: true });
      
      deleteDoc(doc(db, 'submissions', submissionId)).catch(() => {});
    } catch (pgError: any) {
      HybridDiagnostics.logWrite({ entity: 'Submission_Delete', entityId: submissionId, success: false, reason: String(pgError) });
      console.warn("[Operation Fallback] SQL delete failed, falling back to FS", pgError);
      
      try {
        await deleteDoc(doc(db, 'submissions', submissionId));
      } catch (error) {
        handleFirestoreError(error, OperationType.DELETE, `submissions/${submissionId}`);
      }
    }
  }

  async getAllAssessedSubmissions(): Promise<Submission[]> {
    return this.fetchWithCache(
      'assessed_submissions',
      180000,
      async () => {
        const startTime = Date.now();
        try {
          const pgResult = await pgFetch(`/api/submissions?status=assessed&limit=200`);
          if (pgResult.data && Array.isArray(pgResult.data)) {
            const latency = Date.now() - startTime;
            HybridDiagnostics.logRead({ entity: 'Submission_List', entityId: 'assessed', source: 'pg', latencyMs: latency, success: true });
            
            return pgResult.data.map(mapPgSubmission);
          }
          throw new Error("Invalid SQL response");
        } catch (error: any) {
          console.warn("[Operation Fallback] Submission getAllAssessedSubmissions failed in SQL, falling back to FS:", error.message);
          HybridDiagnostics.logRead({ entity: 'Submission_List', entityId: 'assessed', source: 'pg', latencyMs: Date.now() - startTime, success: false, reason: error.message });
          
          const q = query(
            collection(db, 'submissions'),
            where('status', '==', 'assessed'),
            orderBy('submittedAt', 'desc'),
            fsLimit(200)
          );
          const snap = await getDocs(q);
          return snap.docs.map(d => ({ ...d.data(), id: d.id } as Submission));
        }
      },
      { type: OperationType.LIST, path: 'assessed_submissions' }
    );
  }

  subscribeToAssessedSubmissions(callback: (submissions: Submission[]) => void): () => void {
    HybridDiagnostics.logFirebaseDependency('subscribeToAssessedSubmissions');
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
    const startTime = Date.now();
    try {
      const pgResult = await pgFetch(`/api/submissions?studentId=${userId}&status=assessed&limit=${limitCount}`);
      if (pgResult.data && Array.isArray(pgResult.data)) {
        HybridDiagnostics.logRead({ entity: 'Submission_List', entityId: `recent_assessed_${userId}`, source: 'pg', latencyMs: Date.now() - startTime, success: true });
        
        const results: { submission: Submission, assignment: Assignment }[] = [];
        for (const sub of pgResult.data) {
          // get the assignment
          try {
            const pgAssignmentResult = await pgFetch(`/api/assignments/${sub.assignmentId}`);
            if (pgAssignmentResult.data && pgAssignmentResult.data.id) {
               results.push({
                 submission: mapPgSubmission(sub),
                 assignment: mapPgAssignment(pgAssignmentResult.data)
               });
            }
          } catch (e) {
             console.warn("Failed to fetch assignment for submission", sub.id);
          }
        }
        return results;
      }
      throw new Error("Invalid SQL response");
    } catch (error: any) {
      console.warn(`[Operation Fallback] Submission getRecentAssessedMissions failed in SQL, falling back to FS:`, error.message);
      HybridDiagnostics.logRead({ entity: 'Submission_List', entityId: `recent_assessed_${userId}`, source: 'pg', latencyMs: Date.now() - startTime, success: false, reason: error.message });
      
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
}
