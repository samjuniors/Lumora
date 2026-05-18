import { IWalletService } from '../interfaces/IWalletService';
import { Transaction, TransactionType, RechargeRequest } from '../../types';

export class PrismaWalletService implements IWalletService {
  async createTransaction(data: Omit<Transaction, 'id'>): Promise<string> {
    const id = crypto.randomUUID();
    // Use the process endpoint to ensure atomic balance update if it were real
    // but for now just post to generic transactions array without atomic updates 
    // unless we need to atomic update, which is what /api/transactions/process does.
    // For direct createTransaction call, we post to the raw object maybe?
    // Let's use standard POST for now:
    const res = await fetch('/api/transactions/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        txData: { ...data, id },
        userUpdates: [] // Not providing userUpdates means it just creates the transaction
      })
    });
    if (!res.ok) throw new Error('Failed to create transaction');
    return id;
  }

  async getUserTransactions(userId: string): Promise<Transaction[]> {
    const res = await fetch(`/api/transactions?userId=${userId}`);
    return res.json();
  }

  async getAllTransactions(): Promise<Transaction[]> {
    const res = await fetch(`/api/transactions`);
    return res.json();
  }

  async spendCoins(userId: string, amount: number, type: TransactionType, message: string): Promise<void> {
    // Atomic deduction:
    const txId = crypto.randomUUID();
    await fetch('/api/transactions/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txData: {
          id: txId,
          senderId: userId,
          receiverId: 'system',
          amount,
          type,
          message,
          status: 'completed',
          currency: 'coins',
          timestamp: Date.now()
        },
        userUpdates: [
          { where: { id: userId }, data: { coins: { decrement: amount } } }
        ]
      })
    });
  }

  async transferCoins(senderId: string, receiverId: string, amount: number): Promise<void> {
    const txId = crypto.randomUUID();
    await fetch('/api/transactions/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txData: {
          id: txId,
          senderId,
          receiverId,
          amount,
          type: 'transfer',
          status: 'completed',
          currency: 'coins',
          timestamp: Date.now()
        },
        userUpdates: [
          { where: { id: senderId }, data: { coins: { decrement: amount } } },
          { where: { id: receiverId }, data: { coins: { increment: amount } } }
        ]
      })
    });
  }

  async convertDiamondsToCoins(userId: string, diamondsAmount: number): Promise<void> {
    const conversionRate = 10;
    const coinsAmount = diamondsAmount * conversionRate;
    const txId = crypto.randomUUID();
    await fetch('/api/transactions/process', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        txData: {
          id: txId,
          senderId: userId,
          receiverId: 'system',
          amount: diamondsAmount,
          type: 'convert',
          message: `Converted ${diamondsAmount} Diamonds into ${coinsAmount} Coins`,
          status: 'completed',
          currency: 'diamonds',
          timestamp: Date.now()
        },
        userUpdates: [
          { where: { id: userId }, data: { diamonds: { decrement: diamondsAmount }, coins: { increment: coinsAmount } } }
        ]
      })
    });
  }
  
  // Recharges: not implemented in PG schema yet, just mock
  async getRechargeRequests(status?: string): Promise<RechargeRequest[]> { return []; }
  async getAllRechargeRequests(): Promise<RechargeRequest[]> { return []; }
  async createRechargeRequest(data: Omit<RechargeRequest, 'id'>): Promise<string> { return ''; }
  async updateRechargeRequest(id: string, data: Partial<RechargeRequest>): Promise<void> {}
  async approveRechargeRequest(requestId: string, adminId: string): Promise<void> {}
  async rejectRechargeRequest(requestId: string, adminId: string): Promise<void> {}
  
  async claimDailyReward(userId: string, reward: { type: string, value: number | string }): Promise<void> {}
  async claimCollectorReward(userId: string, coins: number, diamonds: number): Promise<void> {}
}
