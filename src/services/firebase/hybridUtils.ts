import { User, Assignment, Submission } from '../../types';
import { HybridDiagnostics } from './hybridDiagnostics';

export function checkDrift(entity: string, id: string, fsData: any, pgData: any, fieldsToCheck: string[]) {
  if (!fsData && pgData) {
    HybridDiagnostics.logDrift(entity, id, ['missing_in_fs']);
    return;
  }
  if (fsData && !pgData) {
    HybridDiagnostics.logDrift(entity, id, ['missing_in_pg']);
    return;
  }
  if (!fsData && !pgData) return;

  const driftKeys: string[] = [];
  for (const field of fieldsToCheck) {
    const fsValue = fsData[field];
    const pgValue = pgData[field];
    
    if (fsValue !== pgValue) {
      if (
         fsValue === undefined && 
         (pgValue === null || pgValue === 0 || pgValue === false || (field === 'level' && pgValue === 1) || (field === 'status' && (pgValue === 'pending' || pgValue === 'draft')))
      ) {
        continue; // Postgres usually sets nulls or 0s instead of undefined
      }
      driftKeys.push(field);
    }
  }

  if (driftKeys.length > 0) {
    HybridDiagnostics.logDrift(entity, id, driftKeys);
  }
}

export function mapPgUser(pgUser: any): User {
  return {
    id: pgUser.id,
    email: pgUser.email,
    name: pgUser.name,
    role: pgUser.role,
    coins: pgUser.coins,
    diamonds: pgUser.diamonds,
    xp: pgUser.xp,
    level: pgUser.level,
    streak: pgUser.streak,
    avatar: pgUser.avatar,
    theme: pgUser.theme,
    followingIds: pgUser.followingIds || [],
    followerIds: pgUser.followerIds || [],
  } as User;
}

export function mapPgAssignment(pgAssignment: any): Assignment {
  return {
    id: pgAssignment.id,
    title: pgAssignment.title,
    description: pgAssignment.description,
    dueDate: pgAssignment.dueDate ? Number(pgAssignment.dueDate) : 0,
    points: pgAssignment.points,
    status: pgAssignment.status,
    createdBy: pgAssignment.createdBy,
    createdAt: pgAssignment.createdAt ? Number(new Date(pgAssignment.createdAt)) : undefined,
    startDate: pgAssignment.startDate ? Number(new Date(pgAssignment.startDate)) : undefined,
    hasAiFeedback: pgAssignment.hasAiFeedback,
    requireUpload: pgAssignment.requireUpload,
    allowedFileTypes: pgAssignment.allowedFileTypes || [],
    difficulty: pgAssignment.difficulty,
    category: pgAssignment.category,
    timeLimit: pgAssignment.timeLimit,
    maxAttempts: pgAssignment.maxAttempts,
    tags: pgAssignment.tags || [],
  } as unknown as Assignment;
}

export function mapPgSubmission(pgSubmission: any): Submission {
  return {
    id: pgSubmission.id,
    assignmentId: pgSubmission.assignmentId,
    studentId: pgSubmission.studentId,
    content: pgSubmission.content,
    attachments: pgSubmission.attachments,
    aiScore: pgSubmission.aiScore,
    aiFeedback: pgSubmission.aiFeedback,
    feedback: pgSubmission.feedback,
    calculatedReward: pgSubmission.calculatedReward,
    penaltyAmount: pgSubmission.penaltyAmount,
    status: pgSubmission.status,
    tabSwitches: pgSubmission.tabSwitches,
    pasteCount: pgSubmission.pasteCount,
    submittedAt: pgSubmission.submittedAt ? Number(new Date(pgSubmission.submittedAt)) : undefined,
    updatedAt: pgSubmission.updatedAt ? Number(new Date(pgSubmission.updatedAt)) : undefined,
  } as unknown as Submission;
}
