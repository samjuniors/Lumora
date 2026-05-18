import { IAssignmentService } from '../interfaces/IAssignmentService';
import { Assignment, AssignmentTemplate, Enrollment } from '../../types';

export class PrismaAssignmentService implements IAssignmentService {
  
  private mapToAssignmentType(model: any): Assignment {
    return {
      id: model.id,
      title: model.title,
      description: model.description,
      dueDate: model.dueDate ? Number(model.dueDate) : 0,
      status: model.status as any,
      createdAt: model.createdAt ? Number(new Date(model.createdAt)) : 0,
      entryFee: 0,
      bonusReward: 0,
      penaltyFee: 0,
      xpReward: 0,
      isBonus: false,
      creatorId: model.createdBy || '',
      updatedAt: 0,
    } as Assignment;
  }

  async getAssignment(assignmentId: string): Promise<Assignment | null> {
    try {
      const res = await fetch(`/api/assignments/${assignmentId}`);
      if (!res.ok) return null;
      return this.mapToAssignmentType(await res.json());
    } catch { return null; }
  }

  async getAllAssignments(): Promise<Assignment[]> {
    const res = await fetch(`/api/assignments`);
    const data = await res.json();
    return data.map((a: any) => this.mapToAssignmentType(a));
  }

  async createAssignment(data: Omit<Assignment, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    await fetch('/api/sync/assignment', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id, createdBy: data.creatorId })
    });
    return id;
  }

  async updateAssignment(assignmentId: string, data: Partial<Assignment>): Promise<void> {
    await fetch(`/api/sync/assignment`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id: assignmentId, createdBy: data.creatorId })
    });
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    await fetch(`/api/assignments/${assignmentId}`, { method: 'DELETE' });
  }

  // ENROLLMENTS
  async getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
    const res = await fetch(`/api/enrollments?studentId=${studentId}`);
    return res.json();
  }

  async getAllEnrollments(): Promise<Enrollment[]> {
    const res = await fetch(`/api/enrollments`);
    return res.json();
  }

  async updateEnrollment(id: string, data: Partial<Enrollment>): Promise<void> {
    await fetch(`/api/enrollments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  async createEnrollment(data: Omit<Enrollment, 'id'>): Promise<string> {
    const res = await fetch(`/api/enrollments`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, id: crypto.randomUUID() })
    });
    const result = await res.json();
    return result.id;
  }

  async deleteEnrollment(id: string): Promise<void> {
    await fetch(`/api/enrollments/${id}`, { method: 'DELETE' });
  }

  async getAssignmentTemplates(): Promise<AssignmentTemplate[]> {
    return []; // Not migrated to pg yet
  }

  async createAssignmentTemplate(data: Omit<AssignmentTemplate, 'id'>): Promise<string> {
    throw new Error('Not implemented in Prisma');
  }

  async saveAssignmentTemplate(id: string, data: AssignmentTemplate): Promise<void> {
    throw new Error('Not implemented in Prisma');
  }

  async deleteAssignmentTemplate(id: string): Promise<void> {
    throw new Error('Not implemented in Prisma');
  }
}
