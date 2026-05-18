import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { assignmentService, submissionService } from '../../services/dbProvider';
import { Assignment, Enrollment, Submission } from '../../types';

export const assignmentKeys = {
  all: ['assignments'] as const,
  lists: () => [...assignmentKeys.all, 'list'] as const,
  detail: (id: string) => [...assignmentKeys.all, 'detail', id] as const,
  enrollments: (userId: string) => [...assignmentKeys.all, 'enrollments', userId] as const,
};

export function useAssignments() {
  return useQuery({
    queryKey: assignmentKeys.lists(),
    queryFn: () => assignmentService.getAllAssignments(),
  });
}

export function useAssignment(id: string) {
  return useQuery({
    queryKey: assignmentKeys.detail(id),
    queryFn: () => assignmentService.getAssignment(id),
    enabled: !!id,
  });
}

export function useStudentEnrollments(userId: string | undefined) {
  return useQuery({
    queryKey: assignmentKeys.enrollments(userId || ''),
    queryFn: () => assignmentService.getEnrollmentsByStudent(userId!),
    enabled: !!userId,
  });
}

export const submissionKeys = {
  all: ['submissions'] as const,
  byAssignment: (assignmentId: string) => [...submissionKeys.all, 'assignment', assignmentId] as const,
  byStudent: (studentId: string) => [...submissionKeys.all, 'student', studentId] as const,
  detail: (id: string) => [...submissionKeys.all, 'detail', id] as const,
};

export function useStudentSubmissions(studentId: string | undefined) {
  return useQuery({
    queryKey: submissionKeys.byStudent(studentId || ''),
    queryFn: () => submissionService.getSubmissionsByStudent(studentId!),
    enabled: !!studentId,
  });
}

export function useAssignmentSubmissions(assignmentId: string | undefined) {
  return useQuery({
    queryKey: submissionKeys.byAssignment(assignmentId || ''),
    queryFn: () => submissionService.getSubmissionsByAssignment(assignmentId!),
    enabled: !!assignmentId,
  });
}

export function useAssignmentEnrollments(assignmentId: string | undefined) {
  return useQuery({
    queryKey: [...assignmentKeys.all, 'enrollments', 'assignment', assignmentId || ''],
    queryFn: () => assignmentService.getAllEnrollments().then(all => all.filter(e => e.assignmentId === assignmentId)),
    enabled: !!assignmentId,
  });
}

export function useEnrollMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Omit<Enrollment, 'id'>) => assignmentService.createEnrollment(data),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: assignmentKeys.enrollments(variables.studentId) });
    },
  });
}

export function useSubmissionMutation() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { id?: string } & Omit<Submission, 'id'>) => {
      const { id, ...rest } = data;
      if (id) {
        return submissionService.updateSubmission(id, rest).then(() => id);
      }
      return submissionService.createSubmission(rest);
    },
    onSuccess: (id, variables) => {
      queryClient.invalidateQueries({ queryKey: submissionKeys.byStudent(variables.studentId) });
      queryClient.invalidateQueries({ queryKey: submissionKeys.byAssignment(variables.assignmentId) });
      if (variables.id) {
        queryClient.invalidateQueries({ queryKey: submissionKeys.detail(variables.id) });
      }
    },
  });
}
