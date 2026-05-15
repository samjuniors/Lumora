import { IDatabaseService } from './dbInterface';
import { FirebaseService } from './firebaseService';

class DbProvider {
  private static instance: IDatabaseService;

  static getService(): IDatabaseService {
    if (!this.instance) {
      this.instance = new FirebaseService();
    }
    return this.instance;
  }
}

export const dbService = DbProvider.getService();
