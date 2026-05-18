import { Attachment } from '../../types';

export interface IStorageService {
  uploadFile(file: File, path: string, onProgress?: (progress: number) => void): Promise<string>;
  uploadAttachments(files: File[], basePath: string, onProgress?: (progress: number) => void): Promise<Attachment[]>;
  deleteFile(url: string): Promise<void>;
  getFileUrl(path: string): Promise<string>;
  validateFile(file: File, config?: { maxSize?: number; allowedTypes?: string[] }): boolean;
}
