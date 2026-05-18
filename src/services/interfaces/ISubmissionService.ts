import { Submission, Assignment } from '../../types';

export interface ISubmissionService {
  getSubmission(submissionId: string): Promise<Submission | null>;
  getAllSubmissions(): Promise<Submission[]>;
  getSubmissionsByAssignment(assignmentId: string): Promise<Submission[]>;
  getSubmissionsByStudent(studentId: string): Promise<Submission[]>;
  createSubmission(data: Omit<Submission, 'id'>): Promise<string>;
  updateSubmission(submissionId: string, data: Partial<Submission>): Promise<void>;
  deleteSubmission(submissionId: string): Promise<void>;
  getAllAssessedSubmissions(): Promise<Submission[]>;
  subscribeToAssessedSubmissions(callback: (submissions: Submission[]) => void): () => void;
  getRecentAssessedMissions(userId: string, limit: number): Promise<{ submission: Submission, assignment: Assignment }[]>;
}
