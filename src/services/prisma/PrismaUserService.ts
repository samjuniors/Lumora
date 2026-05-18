import { IUserService } from '../interfaces/IUserService';
import { User, Role } from '../../types';
import { prisma } from './client';

export class PrismaUserService implements IUserService {
  async getUser(userId: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
    });
    return user ? this.mapToUserType(user) : null;
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const user = await prisma.user.findUnique({
      where: { email },
    });
    return user ? this.mapToUserType(user) : null;
  }

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    await prisma.user.update({
      where: { id: userId },
      data: {
        name: data.name,
        coins: data.coins,
        diamonds: data.diamonds,
        role: data.role as any,
        xp: data.xp,
        level: data.level,
        rank: data.rank,
        streak: data.streak,
        syndicateId: data.syndicateId,
        luminaId: data.luminaId,
        avatar: data.avatar,
        bio: data.bio,
        bannerColor: data.bannerColor,
        theme: data.theme,
        themeId: data.themeId,
        // map other fields as added to Prisma schema gradually
      },
    });
  }

  async createUser(userId: string, data: User): Promise<void> {
    await prisma.user.create({
      data: {
        id: userId,
        email: data.email,
        name: data.name,
        role: data.role as any,
        coins: data.coins || 0,
        diamonds: data.diamonds || 0,
        xp: data.xp || 0,
        level: data.level || 1,
        streak: data.streak || 0,
        createdAt: new Date(data.createdAt || Date.now()),
        updatedAt: new Date(data.updatedAt || Date.now()),
      },
    });
  }

  async getUsersByRole(role: string, limit?: number, offset?: number): Promise<User[]> {
    const users = await prisma.user.findMany({
      where: { role: role as any },
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
    return users.map(u => this.mapToUserType(u));
  }

  async getAllUsers(limit?: number, offset?: number): Promise<User[]> {
    const users = await prisma.user.findMany({
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
    return users.map(u => this.mapToUserType(u));
  }

  async getUsers(filters?: { role?: string, email?: string }, limit?: number, offset?: number): Promise<User[]> {
    const where: any = {};
    if (filters?.role) where.role = filters.role as any;
    if (filters?.email) where.email = filters.email;

    const users = await prisma.user.findMany({
      where,
      take: limit,
      skip: offset,
      orderBy: { createdAt: 'desc' }
    });
    return users.map(u => this.mapToUserType(u));
  }

  async deleteUser(userId: string): Promise<void> {
    await prisma.user.delete({
      where: { id: userId },
    });
  }

  async initializeUser(userId: string, data: Partial<User>): Promise<void> {
    const existing = await this.getUser(userId);
    if (!existing) {
      await this.createUser(userId, data as User);
    }
  }

  async generateLumoraId(userId: string): Promise<string> {
    const luminaId = `LUM-${Math.floor(1000 + Math.random() * 9000)}`;
    await this.updateUser(userId, { luminaId });
    return luminaId;
  }

  subscribeToUser(userId: string, callback: (user: User | null) => void): () => void {
    // Prisma does not natively support realtime document subscriptions.
    // In the future: replace with SSE/WebSockets or polling layer.
    console.warn('[PrismaUserService] subscribeToUser is not supported in SQL. Falling back to one-time fetch.');
    this.getUser(userId).then(callback);
    return () => {}; // No-op unsubscribe
  }

  subscribeToStudents(callback: (users: User[]) => void): () => void {
    console.warn('[PrismaUserService] subscribeToStudents is not supported in SQL.');
    this.getUsersByRole('student').then(callback);
    return () => {};
  }

  async followUser(followerId: string, targetId: string): Promise<void> {
    // No-op for now until relationships are added to Prisma schema
    console.warn('[PrismaUserService] followUser not yet mapped in Prisma schema.');
  }

  async unfollowUser(followerId: string, targetId: string): Promise<void> {
    // No-op for now
    console.warn('[PrismaUserService] unfollowUser not yet mapped in Prisma schema.');
  }

  private mapToUserType(prismaUser: any): User {
    return {
      id: prismaUser.id,
      email: prismaUser.email,
      name: prismaUser.name,
      role: prismaUser.role as Role,
      coins: prismaUser.coins,
      diamonds: prismaUser.diamonds,
      xp: prismaUser.xp,
      level: prismaUser.level,
      rank: prismaUser.rank,
      streak: prismaUser.streak,
      syndicateId: prismaUser.syndicateId || undefined,
      luminaId: prismaUser.luminaId || undefined,
      avatar: prismaUser.avatar || undefined,
      bio: prismaUser.bio || undefined,
      bannerColor: prismaUser.bannerColor || undefined,
      theme: prismaUser.theme || undefined,
      themeId: prismaUser.themeId || undefined,
      createdAt: prismaUser.createdAt.getTime(),
      updatedAt: prismaUser.updatedAt.getTime(),
      lastActive: prismaUser.lastActive ? prismaUser.lastActive.toISOString() : undefined,
    };
  }

  async updatePresence(userId: string, presence: 'online' | 'idle' | 'offline'): Promise<void> {}
}
