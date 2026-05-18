import { User, Role } from '../types';

export const ADMIN_EMAILS = [
  'luvkus8@gmail.com',
  'luvkus8@gmail',
  'luvkush8@gmail.com'
];

export const isSuperAdmin = (user: User | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'superadmin' || ADMIN_EMAILS.includes(user.email.toLowerCase());
};

export const isAdmin = (user: User | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'admin' || user.role === 'superadmin' || ADMIN_EMAILS.includes(user.email.toLowerCase());
};

export const isStudent = (user: User | null | undefined): boolean => {
  if (!user) return false;
  return user.role === 'student';
};

export const canAccessAdminPanel = (user: User | null | undefined): boolean => {
  return isAdmin(user);
};

export const hasPermission = (user: User | null | undefined, permission: 'manage_users' | 'manage_assignments' | 'view_analytics'): boolean => {
  if (!user) return false;
  if (isSuperAdmin(user)) return true;
  
  switch (permission) {
    case 'manage_users':
      return user.role === 'superadmin';
    case 'manage_assignments':
      return isAdmin(user);
    case 'view_analytics':
      return isAdmin(user);
    default:
      return false;
  }
};
