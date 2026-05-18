import { IUserService } from './interfaces/IUserService';
import { IAssignmentService } from './interfaces/IAssignmentService';
import { ISubmissionService } from './interfaces/ISubmissionService';
import { IWalletService } from './interfaces/IWalletService';
import { INotificationService } from './interfaces/INotificationService';
import { IAuthService } from './interfaces/IAuthService';
import { FirebaseUserService } from './firebase/FirebaseUserService';
import { FirebaseAssignmentService } from './firebase/FirebaseAssignmentService';
import { FirebaseSubmissionService } from './firebase/FirebaseSubmissionService';
import { FirebaseWalletService } from './firebase/FirebaseWalletService';
import { PrismaNotificationService } from './prisma/PrismaNotificationService';
import { FirebaseAuthService } from './firebase/FirebaseAuthService';
import { ISyndicateService } from './interfaces/ISyndicateService';
import { IAdminService } from './interfaces/IAdminService';
import { IStorageService } from './interfaces/IStorageService';

import { FirebaseAdminService } from './firebase/FirebaseAdminService';
import { FirebaseSyndicateService } from './firebase/FirebaseSyndicateService';
import { CloudflareR2StorageService } from './firebase/CloudflareR2StorageService';

class DbProvider {
  private static userServiceInstance: IUserService;
  private static assignmentServiceInstance: IAssignmentService;
  private static submissionServiceInstance: ISubmissionService;
  private static walletServiceInstance: IWalletService;
  private static notificationServiceInstance: INotificationService;
  private static adminServiceInstance: IAdminService;
  private static syndicateServiceInstance: ISyndicateService;
  private static authInstance: IAuthService;
  private static storageInstance: IStorageService;

  static getUserService(): IUserService {
    if (!this.userServiceInstance) {
      this.userServiceInstance = new FirebaseUserService();
    }
    return this.userServiceInstance;
  }

  static getAssignmentService(): IAssignmentService {
    if (!this.assignmentServiceInstance) {
      this.assignmentServiceInstance = new FirebaseAssignmentService();
    }
    return this.assignmentServiceInstance;
  }

  static getSubmissionService(): ISubmissionService {
    if (!this.submissionServiceInstance) {
      this.submissionServiceInstance = new FirebaseSubmissionService();
    }
    return this.submissionServiceInstance;
  }

  static getWalletService(): IWalletService {
    if (!this.walletServiceInstance) {
      this.walletServiceInstance = new FirebaseWalletService();
    }
    return this.walletServiceInstance;
  }

  static getNotificationService(): INotificationService {
    if (!this.notificationServiceInstance) {
      this.notificationServiceInstance = new PrismaNotificationService();
    }
    return this.notificationServiceInstance;
  }

  static getAdminService(): IAdminService {
    if (!this.adminServiceInstance) {
      this.adminServiceInstance = new FirebaseAdminService();
    }
    return this.adminServiceInstance;
  }

  static getSyndicateService(): ISyndicateService {
    if (!this.syndicateServiceInstance) {
      this.syndicateServiceInstance = new FirebaseSyndicateService();
    }
    return this.syndicateServiceInstance;
  }

  static getAuthService(): IAuthService {
    if (!this.authInstance) {
      this.authInstance = new FirebaseAuthService();
    }
    return this.authInstance;
  }

  static getStorageService(): IStorageService {
    if (!this.storageInstance) {
      this.storageInstance = new CloudflareR2StorageService();
    }
    return this.storageInstance;
  }
}

export const authService = DbProvider.getAuthService();
export const userService = DbProvider.getUserService();
export const assignmentService = DbProvider.getAssignmentService();
export const submissionService = DbProvider.getSubmissionService();
export const walletService = DbProvider.getWalletService();
export const notificationService = DbProvider.getNotificationService();
export const adminService = DbProvider.getAdminService();
export const syndicateService = DbProvider.getSyndicateService();
export const storageService = DbProvider.getStorageService();
