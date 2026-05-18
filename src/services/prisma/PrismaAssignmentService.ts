import { prisma } from './client';
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
      createdAt: model.createdAt ? Number(model.createdAt) : 0,
      // Provide dummy values for mandatory properties
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
    const assignment = await prisma.assignment.findUnique({
      where: { id: assignmentId }
    });
    return assignment ? this.mapToAssignmentType(assignment) : null;
  }

  async getAllAssignments(): Promise<Assignment[]> {
    const assignments = await prisma.assignment.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return assignments.map(a => this.mapToAssignmentType(a));
  }

  async createAssignment(data: Omit<Assignment, 'id'>): Promise<string> {
    // This is a mirror, normally PG requires an ID, we assume the caller provides one or we generate one
    const id = crypto.randomUUID();
    const assignment = await prisma.assignment.create({
      data: {
        id,
        title: data.title,
        description: data.description,
        dueDate: data.dueDate.toString(),
        points: (data as any).points || 0,
        status: data.status || 'draft',
        createdBy: data.creatorId,
        createdAt: data.createdAt ? data.createdAt.toString() : new Date().toISOString(),
        hasAiFeedback: (data as any).hasAiFeedback || false,
        requireUpload: (data as any).requireUpload || false,
        allowedFileTypes: (data as any).allowedFileTypes || [],
        difficulty: (data as any).difficulty || 'beginner',
        category: (data as any).category || 'general',
        timeLimit: (data as any).timeLimit || null,
        maxAttempts: (data as any).maxAttempts || null
      }
    });
    return assignment.id;
  }

  async updateAssignment(assignmentId: string, data: Partial<Assignment>): Promise<void> {
    await prisma.assignment.update({
      where: { id: assignmentId },
      data: {
        title: data.title,
        description: data.description,
        dueDate: data.dueDate ? data.dueDate.toString() : undefined,
        points: (data as any).points,
        status: data.status,
        createdBy: data.creatorId,
        createdAt: data.createdAt ? data.createdAt.toString() : undefined,
        hasAiFeedback: (data as any).hasAiFeedback,
        requireUpload: (data as any).requireUpload,
        allowedFileTypes: (data as any).allowedFileTypes,
        difficulty: (data as any).difficulty,
        category: (data as any).category,
        timeLimit: (data as any).timeLimit,
        maxAttempts: (data as any).maxAttempts
      }
    });
  }

  async deleteAssignment(assignmentId: string): Promise<void> {
    await prisma.assignment.delete({
      where: { id: assignmentId }
    });
  }

  // Not implemented yet in PRISMA
  async getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]> {
    return [];
  }

  async getAllEnrollments(): Promise<Enrollment[]> {
    return [];
  }

  async updateEnrollment(id: string, data: Partial<Enrollment>): Promise<void> {
    throw new Error('Not implemented in Prisma');
  }

  async createEnrollment(data: Omit<Enrollment, 'id'>): Promise<string> {
    throw new Error('Not implemented in Prisma');
  }

  async deleteEnrollment(id: string): Promise<void> {
    throw new Error('Not implemented in Prisma');
  }

  async getAssignmentTemplates(): Promise<AssignmentTemplate[]> {
    return [];
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
