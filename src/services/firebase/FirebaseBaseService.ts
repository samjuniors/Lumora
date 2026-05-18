import { OperationType, handleFirestoreError } from '../../lib/errorHandling';

export class FirebaseBaseService {
  protected lastWriteTimes: Map<string, number> = new Map();
  protected lastWriteData: Map<string, string> = new Map();
  protected writeCounts: Map<string, number> = new Map();
  protected cache: Map<string, { data: any, timestamp: number }> = new Map();
  protected totalWrites = 0;
  protected MAX_SESSION_WRITES = 500;
  protected activeListeners = 0;
  protected totalListenersCreated = 0;

  protected async fetchWithCache<T>(
    cacheKey: string,
    ttl: number,
    fetchFn: () => Promise<T>,
    errorMeta: { type: OperationType, path: string }
  ): Promise<T> {
    const now = Date.now();
    const cached = this.cache.get(cacheKey);
    
    if (cached && (now - cached.timestamp) < ttl) {
      return cached.data;
    }

    try {
      const data = await fetchFn();
      this.cache.set(cacheKey, { data, timestamp: now });
      return data;
    } catch (error) {
      handleFirestoreError(error, errorMeta.type, errorMeta.path);
      return [] as any; 
    }
  }

  protected LOG_WRITE(path: string, data?: any) {
    this.totalWrites++;
    const count = (this.writeCounts.get(path) || 0) + 1;
    this.writeCounts.set(path, count);
    
    if (this.totalWrites % 10 === 0 || count > 30) {
      const dataPreview = data ? JSON.stringify(data).substring(0, 50) + '...' : 'no-data';
      console.log(`[Firestore Quota Monitor] Total Writes: ${this.totalWrites}/${this.MAX_SESSION_WRITES}, Active Listeners: ${this.activeListeners}`);
      console.log(`[Firestore Path Analysis] Path: ${path} (Count: ${count}). Data: ${dataPreview}`);
    }
    
    if (this.totalWrites >= this.MAX_SESSION_WRITES) {
      console.error(`[CRITICAL] SESSION WRITE CAP REACHED (${this.MAX_SESSION_WRITES}). Blocking further writes to protect daily quota.`);
    }
  }

  protected TRACK_LISTENER(path: string) {
    this.activeListeners++;
    this.totalListenersCreated++;
    if (this.activeListeners > 20) {
      console.warn(`[Firestore Analytics] High number of active listeners detected: ${this.activeListeners}. Possible leak!`);
    }
    return () => {
      this.activeListeners--;
    };
  }

  protected shouldThrottle(path: string, interval: number, data?: any): boolean {
    if (this.totalWrites >= this.MAX_SESSION_WRITES) return true;
    const now = Date.now();
    if (data) {
      const dataStr = JSON.stringify(data);
      if (this.lastWriteData.get(path) === dataStr) return true;
      this.lastWriteData.set(path, dataStr);
    }
    const lastWrite = this.lastWriteTimes.get(path) || 0;
    if (now - lastWrite < interval) return true;
    this.lastWriteTimes.set(path, now);
    this.LOG_WRITE(path, data);
    return false;
  }
}
