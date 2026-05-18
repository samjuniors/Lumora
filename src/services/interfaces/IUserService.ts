import { User } from '../../types';

export interface IUserService {
  getUser(userId: string): Promise<User | null>;
  getUserByEmail(email: string): Promise<User | null>;
  updateUser(userId: string, data: Partial<User>): Promise<void>;
  createUser(userId: string, data: User): Promise<void>;
  getUsersByRole(role: string): Promise<User[]>;
  getAllUsers(): Promise<User[]>;
  getUsers(): Promise<User[]>;
  deleteUser(userId: string): Promise<void>;
  initializeUser(userId: string, data: Partial<User>): Promise<void>;
  generateLumoraId(userId: string): Promise<string>;
  subscribeToUser(userId: string, callback: (user: User | null) => void): () => void;
  subscribeToStudents(callback: (users: User[]) => void): () => void;
  followUser(followerId: string, targetId: string): Promise<void>;
  unfollowUser(followerId: string, targetId: string): Promise<void>;
  updatePresence(userId: string, presence: 'online' | 'idle' | 'offline'): Promise<void>;
}
