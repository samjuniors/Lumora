import { Transaction, TransactionType, RechargeRequest } from '../../types';

export interface IWalletService {
  createTransaction(data: Omit<Transaction, 'id'>): Promise<string>;
  getUserTransactions(userId: string): Promise<Transaction[]>;
  getAllTransactions(): Promise<Transaction[]>;
  spendCoins(userId: string, amount: number, type: TransactionType, message: string): Promise<void>;
  transferCoins(senderId: string, receiverId: string, amount: number): Promise<void>;
  convertDiamondsToCoins(userId: string, diamondsAmount: number): Promise<void>;
  
  // Recharge
  getRechargeRequests(status?: string): Promise<RechargeRequest[]>;
  getAllRechargeRequests(): Promise<RechargeRequest[]>;
  createRechargeRequest(data: Omit<RechargeRequest, 'id'>): Promise<string>;
  updateRechargeRequest(id: string, data: Partial<RechargeRequest>): Promise<void>;
  approveRechargeRequest(requestId: string, adminId: string): Promise<void>;
  rejectRechargeRequest(requestId: string, adminId: string): Promise<void>;
  
  // Rewards
  claimDailyReward(userId: string): Promise<{ type: string, value: number | string }>;
  claimCollectorReward(userId: string): Promise<{ coins: number, diamonds: number, tier: string }>;
  resetCollector(userId: string): Promise<void>;
}
