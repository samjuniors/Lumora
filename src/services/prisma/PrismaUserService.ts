import { IUserService } from '../interfaces/IUserService';
import { User, Role } from '../../types';

export class PrismaUserService implements IUserService {
  async getUser(userId: string): Promise<User | null> {
    try {
      const res = await fetch(`/api/users/${userId}`);
      if (!res.ok) return null;
      return res.json();
    } catch (e) { return null; }
  }

  async getUserByEmail(email: string): Promise<User | null> {
    const res = await fetch(`/api/users?email=${encodeURIComponent(email)}`);
    if (!res.ok) return null;
    const users = await res.json();
    return users.length > 0 ? users[0] : null;
  }

  async updateUser(userId: string, data: Partial<User>): Promise<void> {
    await fetch(`/api/users/${userId}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
  }

  async createUser(userId: string, data: User): Promise<void> {
    await fetch('/api/sync/user', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...data, uid: userId })
    });
  }

  async getUsersByRole(role: string, limit?: number, offset?: number): Promise<User[]> {
    const res = await fetch(`/api/users?role=${role}&limit=${limit || 50}&offset=${offset || 0}`);
    return res.json();
  }

  async getAllUsers(limit?: number, offset?: number): Promise<User[]> {
    const res = await fetch(`/api/users?limit=${limit || 50}&offset=${offset || 0}`);
    return res.json();
  }

  async getUsers(filters?: { role?: string, email?: string }, limit?: number, offset?: number): Promise<User[]> {
    let url = `/api/users?limit=${limit || 50}&offset=${offset || 0}`;
    if (filters?.role) url += `&role=${filters.role}`;
    if (filters?.email) url += `&email=${encodeURIComponent(filters.email)}`;
    const res = await fetch(url);
    return res.json();
  }

  async deleteUser(userId: string): Promise<void> {
    await fetch(`/api/users/${userId}`, { method: 'DELETE' });
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
    let active = true;
    let lastUserStr = '';
    const fetchUser = async () => {
      try {
        if (!active) return;
        const user = await this.getUser(userId);
        if (!active) return;
        const currentStr = JSON.stringify(user);
        if (currentStr !== lastUserStr) {
          lastUserStr = currentStr;
          callback(user);
        }
      } catch (err) { }
    };
    fetchUser();
    const interval = setInterval(fetchUser, 120000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }

  subscribeToStudents(callback: (users: User[]) => void): () => void {
    let active = true;
    let lastUsersStr = '';
    const fetchStudents = async () => {
      try {
        if (!active) return;
        const users = await this.getUsersByRole('student');
        if (!active) return;
        const currentStr = JSON.stringify(users);
        if (currentStr !== lastUsersStr) {
          lastUsersStr = currentStr;
          callback(users);
        }
      } catch (err) { }
    };
    fetchStudents();
    const interval = setInterval(fetchStudents, 120000);
    return () => {
      active = false;
      clearInterval(interval);
    };
  }

  async followUser(followerId: string, targetId: string): Promise<void> {
    await fetch(`/api/users/${followerId}/follow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId })
    });
  }

  async unfollowUser(followerId: string, targetId: string): Promise<void> {
    await fetch(`/api/users/${followerId}/unfollow`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ targetId })
    });
  }

  async updatePresence(userId: string, presence: 'online' | 'idle' | 'offline'): Promise<void> {
    await fetch(`/api/users/${userId}/presence`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ presence })
    });
  }
}
