const fs = require('fs');
const path = require('path');

const methodMap = {
  // IUserService
  getUser: 'userService', getUserByEmail: 'userService', updateUser: 'userService',
  createUser: 'userService', getUsersByRole: 'userService', getAllUsers: 'userService',
  getUsers: 'userService', deleteUser: 'userService', initializeUser: 'userService',
  generateLumoraId: 'userService', subscribeToUser: 'userService',
  subscribeToStudents: 'userService', followUser: 'userService', unfollowUser: 'userService',

  // IAssignmentService
  getAssignment: 'assignmentService', getAllAssignments: 'assignmentService',
  createAssignment: 'assignmentService', updateAssignment: 'assignmentService',
  deleteAssignment: 'assignmentService', getEnrollmentsByStudent: 'assignmentService',
  getAllEnrollments: 'assignmentService', updateEnrollment: 'assignmentService',
  createEnrollment: 'assignmentService', deleteEnrollment: 'assignmentService',
  subscribeToAssignments: 'assignmentService', subscribeToStudentEnrollments: 'assignmentService',

  // ISubmissionService
  getSubmission: 'submissionService', getAllSubmissions: 'submissionService',
  getAllAssessedSubmissions: 'submissionService', getSubmissionsByAssignment: 'submissionService',
  getSubmissionsByStudent: 'submissionService', createSubmission: 'submissionService',
  updateSubmission: 'submissionService', deleteSubmission: 'submissionService',
  subscribeToStudentSubmissions: 'submissionService', subscribeToAssignmentSubmissions: 'submissionService',
  subscribeToAssessedSubmissions: 'submissionService',

  // IWalletService
  createTransaction: 'walletService', getUserTransactions: 'walletService',
  getAllTransactions: 'walletService', spendCoins: 'walletService', transferCoins: 'walletService',
  convertDiamondsToCoins: 'walletService', getRechargeRequests: 'walletService',
  getAllRechargeRequests: 'walletService', createRechargeRequest: 'walletService',
  updateRechargeRequest: 'walletService', approveRechargeRequest: 'walletService',
  rejectRechargeRequest: 'walletService', claimDailyReward: 'walletService',
  claimCollectorReward: 'walletService',

  // INotificationService
  getUserNotifications: 'notificationService', createNotification: 'notificationService',
  markNotificationRead: 'notificationService', markAllNotificationsRead: 'notificationService',
  clearAllNotifications: 'notificationService', deleteNotification: 'notificationService',
  subscribeToNotifications: 'notificationService',

  // IAdminService
  getPlatformSettings: 'adminService', updatePlatformSettings: 'adminService',
  getAssignmentTemplates: 'adminService', createAssignmentTemplate: 'adminService',
  saveAssignmentTemplate: 'adminService', deleteAssignmentTemplate: 'adminService',
  getPreRegisteredUsers: 'adminService', savePreRegisteredUser: 'adminService',
  deletePreRegisteredUser: 'adminService', adjustUserBalance: 'adminService',
  adjustUserDiamonds: 'adminService', adjustUserXP: 'adminService', grantGift: 'adminService',
  revokeSubmission: 'adminService', grantResubmission: 'adminService', assessSubmission: 'adminService',
  getRecentAssessedMissions: 'adminService', sendBroadcastNotification: 'adminService',
  revokeTransaction: 'adminService', adjustTransactionAmount: 'adminService',
  runPenaltySweep: 'adminService', checkAndClaimPreRegistration: 'adminService',
  redeemInviteCode: 'adminService', giftItem: 'adminService',
  getInviteCode: 'adminService', getAllInviteCodes: 'adminService',
  updateInviteCode: 'adminService', saveInviteCode: 'adminService', deleteInviteCode: 'adminService',
  getAchievementProgress: 'adminService', claimAchievement: 'adminService',
  processAssessmentRewards: 'adminService', processUserSweep: 'adminService',
  
  // ISyndicateService
  getAllSyndicates: 'syndicateService', getSyndicate: 'syndicateService',
  createSyndicate: 'syndicateService', updateSyndicate: 'syndicateService',
  deleteSyndicate: 'syndicateService', getSyndicateMembers: 'syndicateService',
  addSyndicateMember: 'syndicateService', removeSyndicateMember: 'syndicateService',
  updateSyndicateMemberRole: 'syndicateService',

  // IStorageService
  uploadFile: 'storageService', deleteFile: 'storageService', getFileUrl: 'storageService',

  // authService - updatePresence might be here or userService?
  updatePresence: 'userService',
};

function modifyFile(filePath) {
  let content = fs.readFileSync(filePath, 'utf8');
  if (!content.includes('dbService')) return;

  const usedServices = new Set();
  
  // Find all dbService.xxx calls
  const regex = /dbService\.([a-zA-Z0-9_]+)/g;
  let matches;
  while ((matches = regex.exec(content)) !== null) {
     const fn = matches[1];
     if (methodMap[fn]) {
        usedServices.add(methodMap[fn]);
     } else {
        console.warn(`Unknown method: ${fn} in ${filePath}`);
     }
  }

  // Replace dbService calls
  for (const [fn, serviceName] of Object.entries(methodMap)) {
     content = content.replace(new RegExp(`dbService\\.${fn}`, 'g'), `${serviceName}.${fn}`);
  }

  // Update imports
  if (usedServices.size > 0) {
     const servicesArr = Array.from(usedServices);
     // If there is an existing import from dbProvider containing dbService, replace it
     const importRegex = /import\s+{[^}]*dbService[^}]*}\s+from\s+['"]([^'"]+)['"];/;
     const match = content.match(importRegex);
     if (match) {
        const importPath = match[1];
        let originalImports = match[0].match(/{([^}]+)}/)[1].split(',').map(s => s.trim());
        originalImports = originalImports.filter(s => s !== 'dbService');
        for (const s of servicesArr) {
           if (!originalImports.includes(s)) {
              originalImports.push(s);
           }
        }
        content = content.replace(importRegex, `import { ${originalImports.join(', ')} } from '${importPath}';`);
     } else {
        // Just look for where dbProvider is imported
        const dbProvRegex = /import\s+{[^}]*}\s+from\s+['"][^'"]*dbProvider['"];/;
        const match2 = content.match(dbProvRegex);
        if (match2) {
           let originalImports = match2[0].match(/{([^}]+)}/)[1].split(',').map(s => s.trim());
           originalImports = originalImports.filter(s => s !== 'dbService');
           for (const s of servicesArr) {
              if (!originalImports.includes(s)) {
                 originalImports.push(s);
              }
           }
           content = content.replace(dbProvRegex, match2[0].replace(/{([^}]+)}/, `{ ${originalImports.join(', ')} }`));
        }
     }
  }

  // If there are still dbService uses, don't remove dbService
  if (!content.includes('dbService.')) {
     content = content.replace(/,\s*dbService\s*,/, ',').replace(/{\s*dbService\s*,/, '{ ').replace(/,\s*dbService\s*}/, ' }');
  }

  fs.writeFileSync(filePath, content);
}

function scanDir(dir) {
  const files = fs.readdirSync(dir);
  for (const file of files) {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      scanDir(fullPath);
    } else if ((fullPath.endsWith('.tsx') || fullPath.endsWith('.ts')) && !fullPath.includes('dbProvider.ts') && !fullPath.includes('firebaseService.ts') && !fullPath.includes('firebaseServiceSingleton.ts')) {
      modifyFile(fullPath);
    }
  }
}

scanDir(path.join(__dirname, 'src/components'));
scanDir(path.join(__dirname, 'src/pages'));
scanDir(path.join(__dirname, 'src/hooks'));
scanDir(path.join(__dirname, 'src/context'));
scanDir(path.join(__dirname, 'src/services'));
