import toast from 'react-hot-toast';
import { auth } from '../services/firebase';
import { captureException } from './errorMonitor';

export enum OperationType {
  CREATE = 'create',
  UPDATE = 'update',
  DELETE = 'delete',
  LIST = 'list',
  GET = 'get',
  WRITE = 'write',
}

interface FirestoreErrorInfo {
  error: string;
  operationType: OperationType;
  path: string | null;
  authInfo: {
    userId?: string | null;
    email?: string | null;
    emailVerified?: boolean | null;
    isAnonymous?: boolean | null;
    tenantId?: string | null;
    providerInfo?: {
      providerId?: string | null;
      email?: string | null;
    }[];
  }
}

export function handleFirestoreError(error: unknown, operationType: OperationType, path: string | null) {
  const errInfo: FirestoreErrorInfo = {
    error: error instanceof Error ? error.message : String(error),
    authInfo: {
      userId: auth.currentUser?.uid,
      email: auth.currentUser?.email,
      emailVerified: auth.currentUser?.emailVerified,
      isAnonymous: auth.currentUser?.isAnonymous,
      tenantId: auth.currentUser?.tenantId,
      providerInfo: auth.currentUser?.providerData?.map(provider => ({
        providerId: provider.providerId,
        email: provider.email,
      })) || []
    },
    operationType,
    path
  }
  console.error('Firestore Error: ', JSON.stringify(errInfo));
  captureException(error, { errInfo, location: "firestore", operationType, path });
  showErrorMessage(`Permission/Network Error: ${operationType} on ${path}`);
  
  if (operationType === OperationType.UPDATE || operationType === OperationType.CREATE || operationType === OperationType.DELETE || operationType === OperationType.WRITE) {
    throw new Error(JSON.stringify(errInfo));
  }
}

export function showErrorMessage(message: string, defaultMessage = 'An unexpected error occurred. Please try again.') {
  toast.error(message || defaultMessage, {
    duration: 5000,
    position: 'top-center',
    style: {
      borderRadius: '16px',
      background: '#081B33', // bg-surface
      color: '#f43f5e', // rose-500
      border: '1px solid #142A4A', // border-main
    },
  });
}

export function handleAsyncError(error: unknown, defaultMessage = 'An unexpected error occurred.') {
  console.error(error);
  captureException(error, { location: "async-boundary" });
  if (error instanceof Error) {
    showErrorMessage(error.message, defaultMessage);
  } else {
    showErrorMessage(defaultMessage);
  }
}
