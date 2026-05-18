import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';
import { IStorageService } from '../interfaces/IStorageService';
import { Attachment } from '../../types';
import { toast } from 'react-hot-toast';

export class FirebaseStorageService implements IStorageService {
  async uploadFile(file: File, path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      const snapshot = await uploadBytes(storageRef, file);
      const downloadURL = await getDownloadURL(snapshot.ref);
      return downloadURL;
    } catch (error: any) {
      console.error('Error uploading file:', error);
      toast.error('Failed to upload file');
      throw error;
    }
  }

  async uploadAttachments(files: File[], basePath: string): Promise<Attachment[]> {
    const uploadPromises = files.map(async (file) => {
      const path = `${basePath}/${Date.now()}_${file.name}`;
      const url = await this.uploadFile(file, path);
      return {
        name: file.name,
        type: file.type,
        url: url,
        size: file.size,
        uploadedAt: Date.now()
      };
    });

    return Promise.all(uploadPromises);
  }

  async deleteFile(url: string): Promise<void> {
    try {
      // In Firebase, we can get the ref from url, but safer to parse it if needed
      // For now, let's assume we can use the ref directly if we have the path
      // Actually, deleteObject works with a storage ref.
      const storageRef = ref(storage, url);
      await deleteObject(storageRef);
    } catch (error: any) {
      console.error('Error deleting file:', error);
    }
  }

  async getFileUrl(path: string): Promise<string> {
    try {
      const storageRef = ref(storage, path);
      return await getDownloadURL(storageRef);
    } catch (error: any) {
      console.error('Error getting download URL:', error);
      throw error;
    }
  }

  validateFile(file: File, config?: { maxSize?: number; allowedTypes?: string[] }): boolean {
    if (config?.maxSize && file.size > config.maxSize) {
      toast.error(`File is too large. Max size: ${(config.maxSize / 1024 / 1024).toFixed(2)}MB`);
      return false;
    }

    if (config?.allowedTypes && config.allowedTypes.length > 0) {
      const isAllowed = config.allowedTypes.some(type => {
        if (type.endsWith('/*')) {
          return file.type.startsWith(type.replace('/*', ''));
        }
        return file.type === type;
      });

      if (!isAllowed) {
        toast.error(`File type ${file.type} is not allowed.`);
        return false;
      }
    }

    return true;
  }
}
