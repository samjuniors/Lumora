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
    queryFn: async () => {
       try {
         // Race with timeout to prevent indefinite hanging
         const timeoutPromise = new Promise<Assignment[]>((_, reject) => setTimeout(() => reject(new Error("Timeout fetching assignments")), 8000));
         return await Promise.race([assignmentService.getAllAssignments(), timeoutPromise]);
       } catch (err) {
         console.warn("[Safe Query] Assignments fetch failed:", err);
         return [];
       }
    },
    staleTime: 60000,
    retry: 1
  });
}

export function useAssignment(id: string) {
  return useQuery({
    queryKey: assignmentKeys.detail(id),
    queryFn: async () => {
      try {
        const timeoutPromise = new Promise<Assignment | null>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));
        return await Promise.race([assignmentService.getAssignment(id), timeoutPromise]);
      } catch (err) {
        return null;
      }
    },
    enabled: !!id,
    retry: 1
  });
}

export function useStudentEnrollments(userId: string | undefined) {
  return useQuery({
    queryKey: assignmentKeys.enrollments(userId || ''),
    queryFn: async () => {
      try {
        const timeoutPromise = new Promise<Enrollment[]>((_, reject) => setTimeout(() => reject(new Error("Timeout")), 8000));
        return await Promise.race([assignmentService.getEnrollmentsByStudent(userId!), timeoutPromise]);
      } catch (err) {
        return [];
      }
    },
    enabled: !!userId,
    retry: 1
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
