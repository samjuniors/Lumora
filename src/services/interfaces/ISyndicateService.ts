import { Syndicate } from '../../types';

export interface ISyndicateService {
  getAllSyndicates(): Promise<Syndicate[]>;
  createSyndicate(data: Omit<Syndicate, 'id'>): Promise<string>;
  updateSyndicate(id: string, data: Partial<Syndicate>): Promise<void>;
}
