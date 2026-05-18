import { ISyndicateService } from '../interfaces/ISyndicateService';
import { Syndicate } from '../../types';

export class PrismaSyndicateService implements ISyndicateService {
  async getSyndicates(): Promise<Syndicate[]> {
    const res = await fetch(`/api/syndicates`);
    if (!res.ok) return [];
    return res.json();
  }

  async getAllSyndicates(): Promise<Syndicate[]> {
    return this.getSyndicates();
  }

  async getSyndicate(id: string): Promise<Syndicate | null> {
    const res = await fetch(`/api/syndicates/${id}`);
    if (!res.ok) return null;
    return res.json();
  }

  async createSyndicate(data: Omit<Syndicate, 'id'>): Promise<string> {
    const res = await fetch(`/api/syndicates`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to create syndicate');
    const result = await res.json();
    return result.id;
  }

  async updateSyndicate(id: string, data: Partial<Syndicate>): Promise<void> {
    const res = await fetch(`/api/syndicates/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data)
    });
    if (!res.ok) throw new Error('Failed to update syndicate');
  }

  async deleteSyndicate(id: string): Promise<void> {
    await fetch(`/api/syndicates/${id}`, { method: 'DELETE' });
  }

  async joinSyndicate(syndicateId: string, userId: string): Promise<void> {
    const syn = await this.getSyndicate(syndicateId);
    if (!syn) throw new Error('Syndicate not found');
    if (!syn.memberIds.includes(userId)) {
      await this.updateSyndicate(syndicateId, { memberIds: [...syn.memberIds, userId] });
    }
  }

  async leaveSyndicate(syndicateId: string, userId: string): Promise<void> {
    const syn = await this.getSyndicate(syndicateId);
    if (!syn) throw new Error('Syndicate not found');
    await this.updateSyndicate(syndicateId, { memberIds: syn.memberIds.filter((m: string) => m !== userId) });
  }
}

