import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { storageService, adminService, walletService, userService } from '../services/dbProvider';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';
import { Transaction, PlatformSettings } from '../types';
import { ArrowUpRight, ArrowDownLeft, Coins, Plus, X, Smartphone, Clock, Receipt, ArrowLeft, Lock, ArrowRightLeft, Trophy, Crown, ShoppingBag, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { cn, getVIPLevel, getUserLevelAndXP } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { RulesModal } from '../components/RulesModal';
import { Card, Button, SectionHeader, EmptyState, ProgressBar } from '../components/CommonUI';
import { Modal } from '../components/Modal';

export const Wallet = () => {
  const { user, updateResources } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
  const [loading, setLoading] = useState(true);
  const [showTransfer, setShowTransfer] = useState(false);
  const [showRecharge, setShowRecharge] = useState(false);
  const [showConvert, setShowConvert] = useState(false);
  const [showAllTransactions, setShowAllTransactions] = useState(false);
  const [showRules, setShowRules] = useState(false);

  useEffect(() => {
    fetchTransactions();
    fetchSettings();
  }, [user?.id]);

  const fetchSettings = async () => {
    try {
      const settings = await adminService.getPlatformSettings();
      if (settings) {
        setSettings(settings);
      }
    } catch(err) {
      handleFirestoreError(err, OperationType.GET, 'settings/config');
    }
  };

  const fetchTransactions = async () => {
    if (!user) return;
    try {
      const all = await walletService.getUserTransactions(user.id);
      setTransactions(all);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'transactions');
    } finally {
      setLoading(false);
    }
  };

  if (loading && transactions.length === 0) {
    return (
      <div className="max-w-5xl mx-auto px-6 py-12 space-y-8 animate-pulse">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="h-60 bg-white/5 rounded-3xl" />
          <div className="lg:col-span-2 h-60 bg-white/5 rounded-3xl" />
        </div>
        <div className="h-96 bg-white/5 rounded-3xl" />
      </div>
    );
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-5xl mx-auto grid grid-cols-1 lg:grid-cols-3 gap-8 px-6 py-12"
    >
      
      {/* Portfolio Summary */}
      <div className="lg:col-span-1 space-y-6">
        <Card
          variant="flat"
          className="p-8 text-text-primary shadow-2xl relative overflow-hidden flex flex-col justify-between group h-[240px] bg-white/[0.02] border-brand-gold/30"
        >
          <div className="absolute top-0 right-0 p-8 text-brand-gold opacity-5 group-hover:opacity-10 transition-opacity">
            <Coins size={100} />
          </div>
          
          <div className="relative z-10 w-full space-y-2">
            <span className="text-text-muted font-black text-[10px] uppercase tracking-[0.3em]">Total Portfolio</span>
            <motion.div 
              key={user?.coins}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="text-6xl font-black text-text-primary tracking-tighter"
            >
              {user?.coins?.toLocaleString()}
              <span className="text-xl text-brand-gold/50 ml-3">🪙</span>
            </motion.div>
          </div>
          
          <div className="relative z-10 flex gap-3 w-full">
            <Button 
              variant="gold"
              fullWidth
              size="md"
              onClick={() => setShowRecharge(true)} 
              className="font-black text-[10px] uppercase tracking-widest gap-2 shadow-2xl shadow-brand-gold/10"
            >
              <Plus size={16} /> Recharge
            </Button>
            <Button 
              variant="primary"
              fullWidth
              size="md"
              onClick={() => setShowConvert(true)} 
              className="font-black text-[10px] uppercase tracking-widest gap-2"
            >
              <ArrowRightLeft size={16} /> Convert
            </Button>
          </div>
        </Card>

        <Card variant="flat" className="p-6 bg-white/[0.01] border-white/[0.03]">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">Diamond Reserve</h4>
                <span className="text-xs font-mono font-black text-cyan-400">{(user?.diamonds || 0).toLocaleString()} 💎</span>
            </div>
            <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(((user?.diamonds || 0)/1000) * 100, 100)}%` }}
                    className="h-full bg-cyan-400 shadow-[0_0_10px_rgba(34,211,238,0.5)]"
                />
            </div>
            <p className="text-[9px] text-text-muted mt-4 uppercase tracking-widest font-black italic opacity-60">
              {1000 - (user?.diamonds || 0) > 0 
                ? `${1000 - (user?.diamonds || 0)} more for Elite Status`
                : "Elite Status Achieved"}
            </p>
        </Card>

        <Card variant="flat" className="p-6 bg-white/[0.01] border-white/[0.03] space-y-4">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em]">P2P Transfer</span>
              <Lock size={14} className="text-text-muted opacity-40" />
            </div>
            <Button 
              variant="outline"
              fullWidth
              size="sm"
              onClick={() => setShowTransfer(true)}
              className="text-[10px] font-black uppercase tracking-[0.2em] py-3 h-auto"
            >
              Execute Wire
            </Button>
        </Card>
      </div>

      {/* Ledger History */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="lg:col-span-2 space-y-6"
      >
        <SectionHeader 
          title="Operational Ledger" 
          subtitle="Audit log of all neural-link activity and financial recalibrations."
          action={
            <button 
              onClick={() => setShowRules(true)}
              className="text-[10px] font-black text-brand-gold hover:text-white transition uppercase tracking-[0.2em]"
            >
              Ledger Protocols
            </button>
          }
        />

        <Card variant="flat" className="overflow-hidden border-white/[0.03] divide-y divide-white/[0.03]">
          {transactions.length > 0 ? (
            (showAllTransactions ? transactions : transactions.slice(0, 10)).map((tx) => {
              const isSender = tx.senderId === user?.id;
              const status = tx.status || 'completed';
              return (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between p-5 bg-transparent hover:bg-white/[0.02] transition-colors group"
                >
                  <div className="flex items-center gap-5">
                    <div className={cn(
                      "w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 border transition-all duration-300",
                      isSender 
                        ? "bg-white/[0.02] border-white/5 text-text-muted group-hover:border-white/10" 
                        : "bg-emerald-500/10 border-emerald-500/20 text-emerald-500 shadow-[0_0_15px_rgba(16,185,129,0.1)] group-hover:border-emerald-500/40"
                    )}>
                      {isSender ? <ArrowUpRight size={20}/> : <ArrowDownLeft size={20}/>}
                    </div>
                    <div className="space-y-1">
                        <div className="flex items-center gap-3">
                            <p className="font-black text-sm text-text-primary capitalize tracking-tight">
                                {tx.type.replace(/_/g, ' ')}
                            </p>
                            {status !== 'completed' && (
                                <span className={cn(
                                    "text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest",
                                    status === 'pending' ? "bg-brand-gold/20 text-brand-gold" : "bg-rose-500/20 text-rose-500"
                                )}>
                                    {status}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-text-muted font-bold italic opacity-60">
                            {format(tx.timestamp, 'MMM d, yy • HH:mm')} • {tx.message || 'System-assigned audit'}
                        </p>
                    </div>
                  </div>
                  <div className={cn("text-xl font-black tabular-nums tracking-tighter", isSender ? "text-text-primary" : "text-emerald-500")}>
                    {isSender ? "-" : "+"}{tx.amount.toLocaleString()}
                  </div>
                </div>
              )
            })
          ) : (
            <div className="p-12">
              <EmptyState 
                icon={Receipt}
                title="Ledger Empty"
                description="Your transaction history is currently offline. Complete missions to initiate neural-link activity."
              />
            </div>
          )}
          
          {transactions.length > 10 && (
            <button 
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="w-full py-4 text-[10px] font-black text-text-muted hover:text-brand-gold transition-all uppercase tracking-[0.3em] bg-white/[0.01] hover:bg-white/[0.03]"
            >
              {showAllTransactions ? "Compress Records" : `Audit All ${transactions.length} Records`}
            </button>
          )}
        </Card>
      </motion.div>


      <AnimatePresence>
        {showConvert && <ConvertModal onClose={() => setShowConvert(false)} onComplete={fetchTransactions} />}
        {showTransfer && <TransferModal onClose={() => setShowTransfer(false)} onComplete={fetchTransactions} />}
        {showRecharge && <RechargeModal onClose={() => setShowRecharge(false)} onComplete={fetchTransactions} settings={settings} />}
        {showRules && <RulesModal key="rules-modal" onClose={() => setShowRules(false)} />}
      </AnimatePresence>

    </motion.div>
  );
};

const RechargeModal = ({ onClose, onComplete, settings }: any) => {
  const { user, isSuperAdmin } = useAuth();
  const [amount, setAmount] = useState<number | ''>(100);
  const [step, setStep] = useState(1);
  const [utr, setUtr] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [screenshotFile, setScreenshotFile] = useState<File | null>(null);
  const [screenshotPreview, setScreenshotPreview] = useState<string | null>(null);

  const mobileNumber = settings?.mobileNumber || '';
  const payeeName = settings?.payeeName || 'Admin Test';
  const paymentLink = settings?.paymentLink || '';
  
  const isVPA = mobileNumber.includes('@');
  
  const encodedHandle = encodeURIComponent(mobileNumber);
  const encodedName = encodeURIComponent(payeeName);
  
  const upiParams = `pa=${encodedHandle}&pn=${encodedName}&am=${amount}&cu=INR`;
  
  const upiUrl = isVPA ? `upi://pay?${upiParams}` : '';
  const gpayUrl = isVPA ? `gpay://upi/pay?${upiParams}` : '';
  const phonepeUrl = isVPA ? `phonepe://pay?${upiParams}` : '';
  const paytmUrl = isVPA ? `paytmmp://pay?${upiParams}` : '';
  
  const hasPaymentMethod = mobileNumber || paymentLink;

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const isValid = storageService.validateFile(file, {
      maxSize: 2 * 1024 * 1024,
      allowedTypes: ['image/*']
    });

    if (!isValid) return;

    setScreenshotFile(file);
    setScreenshotPreview(URL.createObjectURL(file));
  };

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    
    if (!utr && !screenshotFile) {
        return toast.error("Please provide UTR or Payment Screenshot");
    }

    const finalCoins = amount === 120 ? 69 : amount === 500 ? 780 : 0;
    
    if (finalCoins === 0) {
       return toast.error("Please select a valid package.");
    }
    
    setLoading(true);
    setUploadProgress(0);
    try {
      let screenshotUrl = utr; // Fallback to UTR text if no file
      
      if (screenshotFile) {
        const path = `recharges/${user!.id}/${Date.now()}_${screenshotFile.name}`;
        screenshotUrl = await storageService.uploadFile(screenshotFile, path, (progress) => setUploadProgress(progress));
      }

      await walletService.createRechargeRequest({
        studentId: user!.id,
        studentName: user!.name,
        amount: amount,
        coins: finalCoins,
        status: 'pending',
        paymentScreenshot: screenshotUrl,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      if (screenshotPreview) URL.revokeObjectURL(screenshotPreview);
      setStep(3);
      setLoading(false);
      onComplete();
    } catch(err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'recharge_requests');
      setLoading(false);
    }
  };

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Recharge Operational Capital"
    >
        <div className="overflow-y-auto flex-1 no-scrollbar pb-6 space-y-6">
        {step === 1 && (
          <div className="space-y-6">
            <div className="bg-brand-gold/5 p-5 rounded-2xl text-xs border border-brand-gold/20 flex gap-4">
               <Coins className="w-6 h-6 text-brand-gold shrink-0" />
               <div className="space-y-1">
                 <strong className="text-brand-gold uppercase tracking-widest font-black">Capital Infusion Required</strong>
                 <p className="text-text-muted font-medium leading-relaxed italic opacity-80">Operational capital is required for mission enrollment, penalty mitigation, and strategic asset acquisition.</p>
               </div>
            </div>
            {!hasPaymentMethod && !isSuperAdmin && (
               <div className="bg-rose-500/10 text-rose-500 p-4 rounded-xl text-[10px] items-center font-black uppercase tracking-widest border border-rose-500/20">Operational Channel Offline: Contact Admin</div>
            )}
            
            <div className="space-y-4">
              <p className="text-text-muted text-[10px] font-black uppercase tracking-[0.2em] opacity-60">Select Infusion Package</p>
              <div className="grid grid-cols-2 gap-4">
                <button 
                  type="button"
                  onClick={() => { setAmount(120); }} 
                  className={cn(
                    "py-5 px-4 rounded-3xl border-2 font-black transition-all flex flex-col items-center gap-1", 
                    amount === 120 
                      ? "border-brand-gold text-brand-gold bg-brand-gold/5 shadow-[0_0_20px_rgba(251,191,36,0.1)]" 
                      : "border-white/5 text-text-muted hover:border-white/10"
                  )}
                >
                  <span className="text-[10px] uppercase tracking-widest opacity-60">Starter</span>
                  <span className="text-2xl tracking-tighter">₹120</span>
                  <span className="text-[10px] opacity-40 font-bold">69 CREDITS</span>
                </button>
                <button 
                  type="button"
                  onClick={() => { setAmount(500); }} 
                  className={cn(
                    "py-5 px-4 rounded-3xl border-2 font-black transition-all flex flex-col items-center gap-1 relative overflow-hidden", 
                    amount === 500 
                      ? "border-brand-gold text-brand-gold bg-brand-gold/5 shadow-[0_0_20px_rgba(251,191,36,0.1)]" 
                      : "border-white/5 text-text-muted hover:border-white/10"
                  )}
                >
                  <div className="absolute top-0 right-0 bg-brand-gold text-bg-main text-[8px] px-2 py-1 rounded-bl-xl font-black uppercase tracking-widest">Optimized</div>
                  <span className="text-[10px] uppercase tracking-widest opacity-60">Premium</span>
                  <span className="text-2xl tracking-tighter">₹500</span>
                  <span className="text-[10px] opacity-40 font-bold">780 CREDITS</span>
                </button>
              </div>
            </div>

            <div className="space-y-4">
              <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60">Calculated Yield</label>
              <div className="bg-black/20 p-6 rounded-3xl border border-white/5 flex justify-between items-center shadow-inner">
                 <span className="text-text-muted text-[10px] uppercase font-black tracking-widest opacity-60">Net Operational Value</span>
                 <span className="text-3xl font-black text-brand-gold flex items-center gap-2 tracking-tighter">
                    <Coins className="w-6 h-6" /> {amount === 120 ? 69 : amount === 500 ? 780 : 0}
                 </span>
              </div>
            </div>

            {isSuperAdmin ? (
                <Button 
                  variant="gold"
                  fullWidth
                  size="xl"
                  disabled={!amount || amount <= 0 || loading} 
                  onClick={async () => {
                    if (!amount || amount <= 0) return;
                    setLoading(true);
                    try {
                        await userService.updateUser(user!.id, {
                            coins: user!.coins + amount,
                            vipExp: (user!.vipExp || 0) + amount,
                            updatedAt: Date.now()
                        });
                        
                        await walletService.createTransaction({
                            senderId: 'system',
                            receiverId: user!.id,
                            amount: amount,
                            type: 'transfer',
                            message: 'Superadmin minted coins',
                            timestamp: Date.now(),
                            status: 'completed'
                        });

                        toast.success(`Minted ${amount} coins successfully!`);
                        setLoading(false);
                        onComplete();
                        onClose();
                    } catch (e: any) {
                        toast.error(e.message || "Failed to mint coins");
                        setLoading(false);
                    }
                }} className="py-5 font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-brand-gold/20 mt-4">
                    {loading ? 'Minting...' : 'Direct Mint Recalibration'}
                </Button>
            ) : (
                <Button 
                  variant="gold"
                  fullWidth
                  size="xl"
                  disabled={!hasPaymentMethod || !amount || amount <= 0} 
                  onClick={() => setStep(2)} 
                  className="py-5 font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-brand-gold/20 mt-4"
                >
                  Initiate Infusion
                </Button>
            )}
          </div>
        )}
        
        {step === 2 && hasPaymentMethod && (
          <div className="text-center space-y-8 py-4">
            <div className="flex items-center gap-4">
              <button onClick={() => setStep(1)} className="p-3 text-text-muted hover:text-text-primary bg-white/5 rounded-2xl transition-all border border-white/5 hover:border-white/20">
                <ArrowLeft className="w-6 h-6" />
              </button>
              <h3 className="font-black text-xl text-text-primary tracking-tight">Channel Authorization</h3>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {paymentLink && (
                <Card variant="flat" className="p-6 border-white/5 bg-white/[0.01] hover:bg-white/[0.02] transition-colors space-y-4">
                   <div className="flex flex-col items-center text-center space-y-4">
                      <div className="w-12 h-12 bg-brand-gold/10 text-brand-gold rounded-2xl flex items-center justify-center">
                        <ShoppingBag size={24} />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-text-primary uppercase tracking-widest">Gateway Access</h4>
                        <p className="text-text-muted text-[11px] font-medium leading-relaxed mt-1 italic opacity-60">Secure external authorization link</p>
                      </div>
                      <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="w-full">
                        <Button variant="outline" fullWidth size="md" className="font-black text-[10px] uppercase tracking-widest py-3">Open Gateway</Button>
                      </a>
                   </div>
                </Card>
              )}
              
              {mobileNumber && isVPA && (
                <Card variant="flat" className="p-6 border-brand-gold/20 bg-brand-gold/[0.02] space-y-4">
                   <div className="flex flex-col items-center text-center space-y-4">
                      <div className="bg-white p-3 rounded-2xl border-2 border-brand-gold shadow-[0_0_30px_rgba(251,191,36,0.1)]">
                        <QRCodeSVG value={upiUrl} size={110} />
                      </div>
                      <div>
                        <h4 className="font-black text-sm text-text-primary uppercase tracking-widest">Instant Scan</h4>
                        <p className="text-text-muted text-[11px] font-black text-brand-gold mt-1">₹{amount} NET VAL</p>
                      </div>
                   </div>
                </Card>
              )}
            </div>
            
            {mobileNumber && isVPA && (
              <div className="space-y-6">
                <div className="flex items-center gap-4">
                   <div className="h-px bg-white/5 flex-1" />
                   <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-40">Direct Payment Link</span>
                   <div className="h-px bg-white/5 flex-1" />
                </div>

                <a href={upiUrl} className="w-full bg-brand-gold text-bg-main border border-brand-gold font-black px-6 py-5 rounded-3xl flex items-center justify-center gap-3 hover:bg-brand-gold-hover transition-all shadow-lg shadow-brand-gold/20">
                  <Smartphone size={20} />
                  <span className="uppercase tracking-widest">Pay via UPI App</span>
                </a>

                <div className="md:hidden">
                    <div className="grid grid-cols-3 gap-3">
                      <a href={paytmUrl} className="bg-white/[0.02] border border-white/5 text-text-primary text-center font-black uppercase tracking-widest py-4 rounded-2xl text-[10px] hover:bg-white/[0.05] transition-all">Paytm</a>
                      <a href={gpayUrl} className="bg-white/[0.02] border border-white/5 text-text-primary text-center font-black uppercase tracking-widest py-4 rounded-2xl text-[10px] hover:bg-white/[0.05] transition-all">GPay</a>
                      <a href={phonepeUrl} className="bg-white/[0.02] border border-white/5 text-text-primary text-center font-black uppercase tracking-widest py-4 rounded-2xl text-[10px] hover:bg-white/[0.05] transition-all">PhonePe</a>
                    </div>
                </div>
              </div>
            )}
             
             <form onSubmit={handleSubmitUtr} className="pt-8 border-t border-white/5 text-left mt-8 space-y-6">
               <div className="space-y-4">
                  <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60">Vault Verification</label>
                  <div className="space-y-4">
                    <input 
                      type="text" 
                      value={utr}
                      onChange={e => setUtr(e.target.value)}
                      className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-brand-gold/50 transition-all text-white font-black text-sm tracking-tight placeholder:opacity-30" 
                      placeholder="ENTER 12-DIGIT UTR / REFERENCE"
                    />
                    
                    <div className="relative">
                      <input 
                        type="file" 
                        accept="image/*"
                        onChange={handleFileChange}
                        className="hidden" 
                        id="payment-screenshot"
                      />
                      <label 
                        htmlFor="payment-screenshot"
                        className="flex flex-col items-center justify-center border-2 border-dashed border-white/5 rounded-[2.5rem] p-10 hover:border-brand-gold/30 cursor-pointer transition-all bg-white/[0.01] hover:bg-white/[0.03]"
                      >
                        {screenshotPreview ? (
                          <div className="space-y-3 text-center">
                            <img src={screenshotPreview} alt="Preview" className="h-32 mx-auto rounded-2xl shadow-2xl" />
                            <p className="text-[10px] text-brand-gold font-black uppercase tracking-widest">Asset Attached</p>
                          </div>
                        ) : (
                          <>
                            <div className="w-16 h-16 bg-white/5 rounded-[2rem] flex items-center justify-center text-text-muted mb-4 group-hover:scale-110 transition-transform">
                              <Plus className="w-8 h-8" />
                            </div>
                            <p className="text-[10px] font-black text-text-muted uppercase tracking-widest">Upload Receipt Buffer</p>
                            <p className="text-[9px] text-text-muted/40 mt-1 uppercase tracking-[0.2em] font-bold">SYSLOG: JPG, PNG (2MB MAX)</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
               </div>
               
               {loading && uploadProgress > 0 && uploadProgress < 100 && (
                  <div className="space-y-2">
                    <div className="flex justify-between text-[10px] font-black text-cyan-400 uppercase tracking-widest">
                      <span>Uploading Data Buffer</span>
                      <span>{Math.round(uploadProgress)}%</span>
                    </div>
                    <div className="h-1.5 w-full bg-white/5 rounded-full overflow-hidden">
                      <div className="h-full bg-cyan-400" style={{ width: `${uploadProgress}%` }} />
                    </div>
                  </div>
               )}

               <Button 
                type="submit" 
                variant="gold"
                fullWidth
                size="xl"
                disabled={loading} 
                className="py-5 font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-emerald-500/20 bg-emerald-600 hover:bg-emerald-500 border-none"
               >
                 {loading ? 'Transmitting...' : 'Authorize Transaction'}
               </Button>
             </form>
          </div>
        )}
        
        {step === 3 && (
          <div className="text-center space-y-6 py-12">
            <div className="w-24 h-24 bg-brand-gold/5 text-brand-gold rounded-[3rem] flex items-center justify-center mx-auto mb-6 relative">
               <div className="absolute inset-0 bg-brand-gold/10 blur-2xl animate-pulse" />
               <Clock className="w-12 h-12 relative z-10" />
            </div>
            <div className="space-y-2">
               <h3 className="font-black text-3xl text-text-primary tracking-tighter">Transmission Sent</h3>
               <p className="text-text-muted font-medium italic opacity-60 leading-relaxed px-8">Your request for {amount} credits has been queued for verification. Neural-link approval pending.</p>
            </div>
            <Button variant="primary" fullWidth size="lg" onClick={onClose} className="mt-8 py-5 font-black text-[10px] uppercase tracking-widest">Return to Portfolio</Button>
          </div>
        )}
        </div>
    </Modal>
  )
}

const TransferModal = ({ onClose, onComplete }: any) => {
  const { user, updateResources } = useAuth();
  const [search, setSearch] = useState('');
  const [selectedStudent, setSelectedStudent] = useState<{id: string, name: string, email: string} | null>(null);
  const [students, setStudents] = useState<{id: string, name: string, email: string}[]>([]);
  const [showResults, setShowResults] = useState(false);
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchStudents = async () => {
      try {
        const studentsList = await userService.getUsersByRole('student');
        setStudents(studentsList.map(d => ({ id: d.id, name: d.name, email: d.email })));
      } catch (err) {
        handleFirestoreError(err, OperationType.LIST, 'users');
      }
    };
    fetchStudents();
  }, []);

  const filteredStudents = students.filter(s => 
    s.id !== user?.id && (
      s.name.toLowerCase().includes(search.toLowerCase()) || 
      s.email.toLowerCase().includes(search.toLowerCase())
    )
  );

  const handleTransfer = async (e: any) => {
    e.preventDefault();
    const val = parseInt(amount);
    if (!selectedStudent || isNaN(val) || val <= 0) return;
    
    if (val > (user?.coins || 0)) return toast.error("Insufficient coins!");

    if (!window.confirm(`Are you sure you want to send ${val} coins to ${selectedStudent.name}?`)) {
        return;
    }

    setLoading(true);
    try {
      await walletService.transferCoins(user!.id, selectedStudent.id, val);
      updateResources({ coins: (user?.coins || 0) - val });
      onComplete();
      onClose();
      toast.success(`Transferred ${val} coins to ${selectedStudent.name}`);
    } catch(err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'transfer/transactions');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Execute Peer Transfer">
        <form onSubmit={handleTransfer} className="space-y-6 py-4 px-1">
           {getVIPLevel(user).level < 1 && getUserLevelAndXP(user).currentLevel < 5 && (
             <div className="bg-rose-500/10 border border-rose-500/20 p-5 rounded-[2rem] space-y-3">
                <div className="flex items-center gap-3 text-rose-500 font-black text-[10px] uppercase tracking-[0.2em]">
                    <Lock size={16} /> Protocol Restriction
                </div>
                <p className="text-[11px] text-text-muted font-medium leading-relaxed italic opacity-80">
                    Peer-to-peer transmissions are restricted for unverified neural-links. Reach <strong>Level 5</strong> or <strong>VIP Level 1</strong> to authorize this channel.
                </p>
             </div>
           )}

           <div className="relative space-y-3">
             <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60 ml-1">Target Operative</label>
             {selectedStudent ? (
               <div className="flex items-center justify-between bg-black/20 border border-brand-gold/20 rounded-[1.5rem] px-5 py-4 group animate-in fade-in slide-in-from-top-2">
                 <div className="space-y-0.5">
                   <div className="font-black text-text-primary text-sm tracking-tight">{selectedStudent.name}</div>
                   <div className="text-[10px] text-brand-gold font-black uppercase tracking-widest opacity-60">{selectedStudent.email}</div>
                 </div>
                 <button 
                  type="button" 
                  onClick={() => {setSelectedStudent(null); setSearch('');}}
                  className="p-2 hover:bg-white/5 rounded-xl text-text-muted transition-colors"
                 >
                   <X className="w-5 h-5" />
                 </button>
               </div>
             ) : (
               <div className="relative">
                 <input 
                   required 
                   type="text" 
                   value={search} 
                   onChange={e => {setSearch(e.target.value); setShowResults(true);}}
                   onFocus={() => setShowResults(true)}
                   className="w-full bg-black/20 border border-white/5 rounded-2xl px-6 py-4 outline-none focus:border-brand-gold/30 transition-all text-white text-sm font-black tracking-tight placeholder:opacity-30" 
                   placeholder="SEARCH OPERATIVE IDENTIFIER..."
                 />
                 <AnimatePresence>
                   {showResults && search.length > 0 && (
                     <motion.div 
                       initial={{ opacity: 0, scale: 0.95 }}
                       animate={{ opacity: 1, scale: 1 }}
                       exit={{ opacity: 0, scale: 0.95 }}
                       className="absolute z-[110] left-0 right-0 mt-3 bg-bg-surface border border-white/10 rounded-[2rem] shadow-2xl max-h-56 overflow-y-auto no-scrollbar p-2"
                     >
                       {filteredStudents.length > 0 ? (
                         filteredStudents.map(s => (
                           <button
                             key={s.id}
                             type="button"
                             onClick={() => {
                               setSelectedStudent(s);
                               setShowResults(false);
                             }}
                             className="w-full text-left p-4 rounded-2xl hover:bg-white/[0.03] flex flex-col transition-all active:scale-[0.98]"
                           >
                             <span className="font-black text-sm text-text-primary tracking-tight">{s.name}</span>
                             <span className="text-[10px] text-brand-gold/60 font-black uppercase tracking-widest truncate">{s.email}</span>
                           </button>
                         ))
                       ) : (
                         <div className="p-6 text-center text-[10px] text-text-muted font-black uppercase tracking-widest italic opacity-40">Zero matches identified</div>
                       )}
                     </motion.div>
                   )}
                 </AnimatePresence>
               </div>
             )}
           </div>
           
           <div className="space-y-3">
             <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60 ml-1">Credit Quantity</label>
             <div className="relative">
               <Coins className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-brand-gold opacity-50" />
               <input 
                 required 
                 type="number" 
                 min="1" 
                 max={user?.coins} 
                 value={amount} 
                 onChange={e=>setAmount(e.target.value)} 
                 className="w-full pl-14 pr-6 py-4 bg-black/20 border border-white/5 rounded-2xl outline-none focus:border-brand-gold/30 transition-all font-black text-sm text-white tracking-tight" 
                 placeholder={`AVAILABLE: ${user?.coins.toLocaleString()}`}
               />
             </div>
           </div>
           
           <div className="pt-4">
             <Button 
              variant="gold"
              fullWidth
              size="xl"
              disabled={loading || !selectedStudent || !amount || parseInt(amount) <= 0 || parseInt(amount) > (user?.coins || 0)} 
              type="submit" 
              className="py-5 font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-brand-gold/20"
             >
                {loading ? 'Authorizing Transversal...' : 'Finalize Transmission'}
             </Button>
           </div>
        </form>
    </Modal>
  )
}

const ConvertModal = ({ onClose, onComplete }: any) => {
  const { user, updateResources } = useAuth();
  const [amount, setAmount] = useState('');
  const [loading, setLoading] = useState(false);

  const handleConvert = async (e: any) => {
    e.preventDefault();
    const val = parseInt(amount);
    if (isNaN(val) || val <= 0) return;
    
    if (val > (user?.diamonds || 0)) return toast.error("Insufficient diamonds!");

    const coinsToAdd = Math.floor(val / 7);
    if (!window.confirm(`Convert ${val} diamonds into ${coinsToAdd} coins?`)) {
        return;
    }

    setLoading(true);
    try {
      await walletService.convertDiamondsToCoins(user!.id, val);
      updateResources({ 
        diamonds: (user?.diamonds || 0) - val,
        coins: (user?.coins || 0) + coinsToAdd 
      });
      onComplete();
      onClose();
      toast.success(`Converted ${val} diamonds into ${coinsToAdd} coins!`);
    } catch(err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'convert/transactions');
    } finally {
      setLoading(false);
    }
  }

  return (
    <Modal isOpen={true} onClose={onClose} title="Diamonds Liquidation">
        <div className="bg-cyan-500/5 text-cyan-400 font-black text-[10px] uppercase tracking-[0.2em] p-5 rounded-2xl mb-6 border border-cyan-500/10 flex gap-4">
           <ArrowRightLeft className="w-6 h-6 shrink-0 opacity-80" />
           <div className="space-y-1 leading-relaxed">
             <p className="opacity-60 italic">Exchange Protocol: 7 Diamonds = 1 Credit.</p>
             <p className="font-bold">Liquidation is irreversible once authorized.</p>
           </div>
        </div>
        <form onSubmit={handleConvert} className="space-y-6 py-2">
           <div className="space-y-3">
             <label className="block text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-60 ml-1">Asset Quantity (Diamonds)</label>
             <div className="relative">
               <ArrowRightLeft className="absolute left-6 top-1/2 -translate-y-1/2 w-5 h-5 text-cyan-400 opacity-50" />
               <input 
                 required 
                 type="number" 
                 min="1" 
                 max={user?.diamonds || 0} 
                 value={amount} 
                 onChange={e=>setAmount(e.target.value)} 
                 className="w-full pl-14 pr-6 py-4 bg-black/20 border border-white/5 rounded-2xl outline-none focus:border-brand-gold/30 transition-all font-black text-sm text-white tracking-tight" 
                 placeholder={`AVAILABLE: ${user?.diamonds || 0}`}
               />
             </div>
           </div>
           
           {amount && parseInt(amount) > 0 && (
             <div className="bg-black/20 p-6 rounded-2xl border border-white/5 text-xs shadow-inner flex justify-between items-center animate-in fade-in slide-in-from-top-2">
                <span className="text-text-muted font-black uppercase tracking-widest opacity-60">Net Credit Yield:</span>
                <span className="font-black text-brand-gold text-xl tracking-tighter tabular-nums flex items-center gap-2">
                  <Coins className="w-5 h-5" /> {Math.floor(parseInt(amount) / 7)}
                </span>
             </div>
           )}

           <div className="pt-4">
             <Button 
                variant="gold"
                fullWidth
                size="xl"
                disabled={loading || !amount || parseInt(amount) <= 0 || parseInt(amount) > (user?.diamonds || 0)} 
                type="submit" 
                className="py-5 font-black text-xs uppercase tracking-[0.3em] shadow-2xl shadow-brand-gold/20"
             >
                {loading ? 'Liquidating...' : 'Authorize Recalibration'}
             </Button>
           </div>
        </form>
    </Modal>
  )
}
