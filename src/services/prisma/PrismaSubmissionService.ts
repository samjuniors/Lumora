import { ISubmissionService } from '../interfaces/ISubmissionService';
import { Submission, Assignment } from '../../types';

export class PrismaSubmissionService implements ISubmissionService {
  private mapPgSubmission(model: any): Submission {
    return {
      ...model,
      submittedAt: model.submittedAt ? Number(new Date(model.submittedAt)) : 0,
      createdAt: model.createdAt ? Number(new Date(model.createdAt)) : 0,
      updatedAt: model.updatedAt ? Number(new Date(model.updatedAt)) : 0,
    } as Submission;
  }
  private mapPgAssignment(model: any): Assignment {
    return { ...model } as Assignment;
  }

  async getSubmission(submissionId: string): Promise<Submission | null> {
    try {
      const res = await fetch(`/api/submissions/${submissionId}`);
      if (!res.ok) return null;
      return this.mapPgSubmission(await res.json());
    } catch { return null; }
  }

  async getAllSubmissions(): Promise<Submission[]> {
    try {
      const res = await fetch(`/api/submissions?limit=1000`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => this.mapPgSubmission(d));
    } catch { return []; }
  }

  async getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]> {
    try {
      const res = await fetch(`/api/submissions?assignmentId=${encodeURIComponent(assignmentId)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => this.mapPgSubmission(d));
    } catch { return []; }
  }

  async getSubmissionsByStudent(studentId: string): Promise<Submission[]> {
    try {
      const res = await fetch(`/api/submissions?studentId=${encodeURIComponent(studentId)}`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => this.mapPgSubmission(d));
    } catch { return []; }
  }

  async createSubmission(data: Omit<Submission, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    const payload = { id, ...data, submittedAt: new Date().toISOString() };
    
    try {
      await fetch('/api/sync/submission', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      return id;
    } catch { return ''; }
  }

  async updateSubmission(submissionId: string, data: Partial<Submission>): Promise<void> {
    try {
      await fetch(`/api/submissions/${submissionId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data)
      });
    } catch { }
  }

  async deleteSubmission(submissionId: string): Promise<void> {
    try {
      await fetch(`/api/submissions/${submissionId}`, { method: 'DELETE' });
    } catch { }
  }

  async getAllAssessedSubmissions(): Promise<Submission[]> {
    try {
      const res = await fetch(`/api/submissions?status=assessed&limit=200`);
      if (!res.ok) return [];
      const data = await res.json();
      return data.map((d: any) => this.mapPgSubmission(d));
    } catch { return []; }
  }

  subscribeToAssessedSubmissions(callback: (submissions: Submission[]) => void): () => void {
    let active = true;
    const fetchSubmissions = async () => {
      try {
        if (!active) return;
        const result = await this.getAllAssessedSubmissions();
        if (active) callback(result);
      } catch (err) { }
    };
    fetchSubmissions();
    const interval = setInterval(fetchSubmissions, 15000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }

  async getRecentAssessedMissions(userId: string, limitCount: number): Promise<{ submission: Submission, assignment: Assignment }[]> {
    try {
      const res = await fetch(`/api/submissions?studentId=${userId}&status=assessed&limit=${limitCount}`);
      if (!res.ok) return [];
      const pgResult = await res.json();
      
      const results: { submission: Submission, assignment: Assignment }[] = [];
      for (const sub of pgResult) {
        try {
          const aRes = await fetch(`/api/assignments/${sub.assignmentId}`);
          if (aRes.ok) {
            results.push({
              submission: this.mapPgSubmission(sub),
              assignment: this.mapPgAssignment(await aRes.json())
            });
          }
        } catch (e) {
            console.warn("Failed to fetch assignment for submission", sub.id);
        }
      }
      return results;
    } catch { return []; }
  }
}
