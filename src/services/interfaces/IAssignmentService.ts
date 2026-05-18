import { Assignment, AssignmentTemplate, Enrollment } from '../../types';

export interface IAssignmentService {
  getAssignment(assignmentId: string): Promise<Assignment | null>;
  getAllAssignments(): Promise<Assignment[]>;
  createAssignment(data: Omit<Assignment, 'id'>): Promise<string>;
  updateAssignment(assignmentId: string, data: Partial<Assignment>): Promise<void>;
  deleteAssignment(assignmentId: string): Promise<void>;
  
  // Enrollments
  getEnrollmentsByStudent(studentId: string): Promise<Enrollment[]>;
  getAllEnrollments(): Promise<Enrollment[]>;
  updateEnrollment(id: string, data: Partial<Enrollment>): Promise<void>;
  createEnrollment(data: Omit<Enrollment, 'id'>): Promise<string>;
  deleteEnrollment(id: string): Promise<void>;
  
  // Templates
  getAssignmentTemplates(): Promise<AssignmentTemplate[]>;
  createAssignmentTemplate(data: Omit<AssignmentTemplate, 'id'>): Promise<string>;
  saveAssignmentTemplate(id: string, data: AssignmentTemplate): Promise<void>;
  deleteAssignmentTemplate(id: string): Promise<void>;
}
