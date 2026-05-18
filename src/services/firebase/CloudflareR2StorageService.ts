import { IStorageService } from '../interfaces/IStorageService';
import { Attachment } from '../../types';
import { toast } from 'react-hot-toast';
import { ref, deleteObject } from 'firebase/storage';
import { storage } from '../firebase';

export class CloudflareR2StorageService implements IStorageService {
  private r2PublicUrl = import.meta.env.VITE_R2_PUBLIC_URL;

  async uploadFile(file: File, path: string, onProgress?: (progress: number) => void): Promise<string> {
    try {
      const response = await fetch('/api/storage/presign', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ fileName: file.name, fileType: file.type, path }),
      });

      if (!response.ok) {
         const errorData = await response.json();
         throw new Error(errorData.error || 'Failed to get upload URL');
      }

      const { uploadUrl, publicUrl } = await response.json();

      return new Promise((resolve, reject) => {
        const xhr = new XMLHttpRequest();
        
        xhr.upload.addEventListener('progress', (event) => {
          if (event.lengthComputable && onProgress) {
            const percentComplete = (event.loaded / event.total) * 100;
            onProgress(percentComplete);
          }
        });

        xhr.addEventListener('load', () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(publicUrl);
          } else {
            reject(new Error(`Upload failed with status ${xhr.status}`));
          }
        });

        xhr.addEventListener('error', () => reject(new Error('Network error during upload')));
        xhr.addEventListener('abort', () => reject(new Error('Upload aborted')));

        xhr.open('PUT', uploadUrl);
        xhr.setRequestHeader('Content-Type', file.type);
        xhr.send(file);
      });
    } catch (error: any) {
      console.error('Error uploading to R2:', error);
      toast.error(`Upload error: ${error.message || 'Failed to upload file'}`);
      throw error;
    }
  }

  async uploadAttachments(files: File[], basePath: string, onProgress?: (progress: number) => void): Promise<Attachment[]> {
    const totalFiles = files.length;
    const progressPerFile = new Array(totalFiles).fill(0);

    const uploadPromises = files.map(async (file, index) => {
      const url = await this.uploadFile(file, basePath, (fileProgress) => {
        progressPerFile[index] = fileProgress;
        if (onProgress) {
          const totalProgress = progressPerFile.reduce((a, b) => a + b, 0) / totalFiles;
          onProgress(totalProgress);
        }
      });
      
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
      if (this.r2PublicUrl && url.startsWith(this.r2PublicUrl)) {
        // R2 deletion
        const response = await fetch('/api/storage/delete', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ url }),
        });

        if (!response.ok) throw new Error('Failed to delete from R2');
      } else if (url.includes('firebasestorage.googleapis.com')) {
        // Firebase deletion (legacy)
        const storageRef = ref(storage, url);
        await deleteObject(storageRef);
      }
    } catch (error: any) {
      console.error('Error deleting file:', error);
    }
  }

  async getFileUrl(path: string): Promise<string> {
    if (path.startsWith('http')) return path;
    if (!this.r2PublicUrl) return path;
    return `${this.r2PublicUrl}/${path}`;
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
