import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService, storageService } from '../services/dbProvider';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';
import { Transaction, PlatformSettings } from '../types';
import { ArrowUpRight, ArrowDownLeft, Coins, Plus, X, Smartphone, Clock, Receipt, ArrowLeft, Lock, ArrowRightLeft, Trophy, Crown, ShoppingBag, Settings } from 'lucide-react';
import { format } from 'date-fns';
import { cn, getVIPLevel, getUserLevelAndXP } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { RulesModal } from '../components/RulesModal';
import { Card, SectionHeader, EmptyState, ProgressBar } from '../components/CommonUI';
import { Modal } from '../components/Modal';

export const Wallet = () => {
  const { user, updateResources } = useAuth();
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [settings, setSettings] = useState<PlatformSettings | null>(null);
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
      const settings = await dbService.getPlatformSettings();
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
      const all = await dbService.getUserTransactions(user.id);
      setTransactions(all);
    } catch (err) {
      handleFirestoreError(err, OperationType.LIST, 'transactions');
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="max-w-4xl mx-auto grid md:grid-cols-3 gap-6 md:gap-8"
    >
      
      {/* Balance Card */}
      <div className="md:col-span-1 space-y-6">
        <Card
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
          className="p-8 text-white shadow-glow-gold relative overflow-hidden flex flex-col justify-between group h-[220px]"
        >
          <div className="absolute top-0 right-0 p-8 text-brand-gold opacity-10 group-hover:opacity-20 transition-opacity">
            <Coins size={80} />
          </div>
          
          <div className="relative z-10 w-full">
            <span className="text-text-secondary font-bold text-[10px] uppercase tracking-[0.2em]">Portfolio Balance</span>
            <motion.div 
              key={user?.coins}
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="mt-1 text-5xl font-display font-bold text-white tracking-tighter"
            >
              {user?.coins?.toLocaleString()}
              <span className="text-xl text-brand-gold/50 ml-2">🪙</span>
            </motion.div>
          </div>
          
          <div className="relative z-10 flex gap-2 w-full">
            <button 
              onClick={() => setShowRecharge(true)} 
              className="flex-1 bg-brand-gold text-navy-950 hover:bg-white transition rounded-xl py-2.5 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-soft active:scale-95"
            >
              <Plus size={14} /> Add
            </button>
            <button 
              onClick={() => setShowConvert(true)} 
              className="flex-1 bg-navy-800 text-white border border-navy-700 hover:bg-navy-700 transition rounded-xl py-2.5 font-bold text-[10px] uppercase tracking-widest flex items-center justify-center gap-1.5 shadow-soft active:scale-95"
            >
              <ArrowRightLeft size={14} /> Swap
            </button>
          </div>
        </Card>

        <Card className="p-6">
            <div className="flex items-center justify-between mb-4">
                <h4 className="text-[10px] font-bold text-text-secondary uppercase tracking-widest">Diamonds</h4>
                <span className="text-xs font-mono font-bold text-cyan-400">{(user?.diamonds || 0).toLocaleString()} 💎</span>
            </div>
            <div className="h-1 w-full bg-navy-800 rounded-full overflow-hidden">
                <motion.div 
                    initial={{ width: 0 }}
                    animate={{ width: `${Math.min(((user?.diamonds || 0)/1000) * 100, 100)}%` }}
                    className="h-full bg-cyan-400 shadow-glow-cyan"
                />
            </div>
            <p className="text-[9px] text-text-secondary mt-3 uppercase tracking-tighter font-bold">1000 for Elite Tier Status</p>
        </Card>
      </div>

      {/* Transaction History */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        className="md:col-span-2 space-y-4"
      >
        <SectionHeader 
          title="Recent Activity" 
          action={
            <button 
              onClick={() => setShowRules(true)}
              className="text-[10px] font-bold text-brand-gold hover:text-white transition uppercase tracking-widest"
            >
              Ledger Rules
            </button>
          }
        />

        <div className="card-premium divide-y divide-navy-700 overflow-hidden">
          {transactions.length > 0 ? (
            (showAllTransactions ? transactions : transactions.slice(0, 8)).map((tx) => {
              const isSender = tx.senderId === user?.id;
              const status = tx.status || 'completed';
              return (
                <div 
                  key={tx.id} 
                  className="flex items-center justify-between p-4 bg-navy-900/50 hover:bg-navy-800 transition-colors group"
                >
                  <div className="flex items-center gap-4">
                    <div className={cn(
                      "w-10 h-10 rounded-xl flex items-center justify-center shrink-0 border",
                      isSender ? "bg-navy-800 border-navy-700 text-text-secondary" : "bg-success/10 border-success/20 text-success shadow-glow-success"
                    )}>
                      {isSender ? <ArrowUpRight size={18}/> : <ArrowDownLeft size={18}/>}
                    </div>
                    <div>
                        <div className="flex items-center gap-2">
                            <p className="font-bold text-sm text-text-primary capitalize tracking-tight">
                                {tx.type.replace(/_/g, ' ')}
                            </p>
                            {status !== 'completed' && (
                                <span className={cn(
                                    "text-[8px] px-1.5 py-0.5 rounded uppercase font-black tracking-widest",
                                    status === 'pending' ? "bg-brand-gold/20 text-brand-gold" : "bg-error/20 text-error"
                                )}>
                                    {status}
                                </span>
                            )}
                        </div>
                        <p className="text-[10px] text-text-secondary/70 font-medium">
                            {format(tx.timestamp, 'MMM d, p')} • {tx.message || 'System transaction'}
                        </p>
                    </div>
                  </div>
                  <div className={cn("font-display font-bold text-lg tabular-nums", isSender ? "text-text-primary" : "text-success")}>
                    {isSender ? "-" : "+"}{tx.amount}
                  </div>
                </div>
              )
            })
          ) : (
            <EmptyState 
              icon={Receipt}
              title="No Activity"
              description="Your transaction history is currently empty. Complete missions to earn rewards."
            />
          )}
          
          {transactions.length > 8 && (
            <button 
              onClick={() => setShowAllTransactions(!showAllTransactions)}
              className="w-full py-3 text-[10px] font-bold text-text-secondary hover:text-brand-gold transition uppercase tracking-widest bg-navy-800/30"
            >
              {showAllTransactions ? "Show Less" : `View ${transactions.length - 8} more records`}
            </button>
          )}
        </div>
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

  const mobileNumber = settings?.mobileNumber || 'admin@upi';
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

      await dbService.createRechargeRequest({
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
  }

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title="Recharge Coins"
    >
        <div className="overflow-y-auto flex-1 no-scrollbar pb-2">
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-brand-gold-muted/10 p-4 rounded-xl text-sm border border-brand-gold/20 flex gap-3">
               <Coins className="w-5 h-5 text-brand-gold shrink-0" />
               <div>
                 <strong className="text-brand-gold">Top-up your wallet!</strong>
                 <p className="mt-0.5 text-text-secondary">Coins allow you to enroll in premium assignments, bypass penalties, and support the platform.</p>
               </div>
            </div>
            {!hasPaymentMethod && !isSuperAdmin && (
               <div className="bg-error/10 text-error p-3 rounded-lg text-sm mb-4 border border-error/20">Payment details are not configured by the admin yet.</div>
            )}
            <p className="text-text-secondary text-sm font-medium">Select a recharge package</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => { setAmount(120); }} 
                className={cn("py-3 px-2 rounded-xl border-2 font-bold transition flex flex-col items-center", amount === 120 ? "border-brand-gold text-brand-gold bg-brand-gold/10" : "border-navy-700 text-text-secondary hover:border-navy-600")}
              >
                <span className="text-sm">Starter</span>
                <span className="text-lg">₹120</span>
                <span className="text-[10px] opacity-70">69 Coins</span>
              </button>
              <button 
                type="button"
                onClick={() => { setAmount(500); }} 
                className={cn("py-3 px-2 rounded-xl border-2 font-bold transition flex flex-col items-center relative overflow-hidden", amount === 500 ? "border-brand-gold text-brand-gold bg-brand-gold/10" : "border-navy-700 text-text-secondary hover:border-navy-600")}
              >
                <div className="absolute top-0 right-0 bg-brand-gold text-bg-main text-[8px] px-1.5 py-0.5 rounded-bl-lg font-black uppercase">Best Value</div>
                <span className="text-sm">Premium</span>
                <span className="text-lg">₹500</span>
                <span className="text-[10px] opacity-70">780 Coins</span>
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1 mt-4">Calculated Coins</label>
              <div className="bg-navy-950 p-4 rounded-xl border border-navy-700 flex justify-between items-center">
                 <span className="text-text-secondary text-xs uppercase font-black tracking-widest">Estimated Value</span>
                 <span className="text-xl font-black text-brand-gold flex items-center gap-1">
                    <Coins className="w-5 h-5" /> {amount === 120 ? 69 : amount === 500 ? 780 : 0}
                 </span>
              </div>
            </div>
            {isSuperAdmin ? (
                <button disabled={!amount || amount <= 0 || loading} onClick={async () => {
                    if (!amount || amount <= 0) return;
                    setLoading(true);
                    try {
                        await dbService.updateUser(user!.id, {
                            coins: user!.coins + amount,
                            vipExp: (user!.vipExp || 0) + amount,
                            updatedAt: Date.now()
                        });
                        
                        await dbService.createTransaction({
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
                }} className="w-full bg-brand-gold text-bg-main py-4 rounded-xl font-bold mt-4 disabled:opacity-50">
                    {loading ? 'Minting...' : 'Mint Coins Instantly'}
                </button>
            ) : (
                <button disabled={!hasPaymentMethod || !amount || amount <= 0} onClick={() => setStep(2)} className="w-full bg-brand-gold text-bg-main py-4 rounded-xl font-bold mt-4 disabled:opacity-50">Continue</button>
            )}
          </div>
        )}
        
        {step === 2 && hasPaymentMethod && (
          <div className="text-center space-y-6 py-4">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(1)} className="p-2 text-text-secondary hover:text-white bg-navy-800 rounded-full transition-colors">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-lg text-left flex-1">Complete Payment</h3>
            </div>
            {paymentLink && (
              <div className="bg-navy-800 p-4 rounded-2xl border border-navy-700 shadow-sm mx-auto">
                 <h3 className="font-bold text-lg text-text-primary mb-2">Pay via Link</h3>
                 <p className="text-text-secondary text-sm mb-4">Click below to open the secure payment gateway.</p>
                 <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="block w-full bg-brand-gold text-bg-main font-bold py-3 rounded-xl transition shadow-sm">
                   Open Payment Link
                 </a>
              </div>
            )}
            
            {mobileNumber && (
              <>
                {paymentLink && <div className="text-text-secondary/80 font-medium text-sm">OR Pay via UPI</div>}
                {isVPA ? (
                  <>
                    <div className="bg-white p-4 rounded-2xl inline-block border-2 border-brand-gold shadow-sm mx-auto">
                      <QRCodeSVG value={upiUrl} size={150} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg text-text-primary">Scan to Pay INR {amount}</h3>
                      <p className="text-text-secondary text-sm mt-1 mb-4 hidden md:block">Use any UPI app on your phone to scan and pay.</p>
                      
                      <div className="md:hidden">
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <a href={gpayUrl} className="bg-navy-800 border border-navy-700 text-text-primary font-medium px-3 py-2 rounded-lg flex justify-center items-center gap-2">
                             GPay
                          </a>
                          <a href={phonepeUrl} className="bg-navy-800 border border-navy-700 text-text-primary font-medium px-3 py-2 rounded-lg flex justify-center items-center gap-2">
                             PhonePe
                          </a>
                          <a href={paytmUrl} className="bg-navy-800 border border-navy-700 text-text-primary font-medium px-3 py-2 rounded-lg flex justify-center items-center gap-2">
                            Paytm
                          </a>
                          <a href={upiUrl} className="bg-brand-gold text-bg-main font-medium px-3 py-2 rounded-lg flex justify-center items-center gap-2">
                            Other UPI
                          </a>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                    <div className="bg-navy-800 p-6 rounded-2xl border border-navy-700 shadow-sm mx-auto">
                       <div className="w-16 h-16 bg-navy-700 text-brand-gold rounded-full flex items-center justify-center mx-auto mb-4 font-bold text-2xl tracking-tighter">
                         <Smartphone className="w-8 h-8" />
                       </div>
                       <h3 className="font-bold text-lg text-white">Pay INR {amount}</h3>
                       <p className="text-text-secondary text-sm mt-1">Transfer exactly INR {amount} through your chosen method.</p>
                    </div>
                )}
    
                <div className="mt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(mobileNumber);
                      toast.success("Copied!");
                    }} 
                    className="bg-navy-800 text-text-primary border border-navy-700 font-bold px-4 py-3 rounded-xl w-full flex items-center justify-center gap-2 hover:bg-navy-700 transition"
                  >
                    <span>Copy Payment Address</span>
                  </button>
                </div>
              </>
            )}
             
             <form onSubmit={handleSubmitUtr} className="pt-4 border-t border-navy-700 text-left mt-4 space-y-4">
               <div>
                  <label className="block text-sm font-bold text-text-secondary mb-2">Payment Verification</label>
                  <div className="space-y-3">
                    <input 
                      type="text" 
                      value={utr}
                      onChange={e => setUtr(e.target.value)}
                      className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 outline-none focus:border-brand-gold transition-colors text-white" 
                      placeholder="12-digit UTR (Optional if screenshot provided)"
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
                        className="flex flex-col items-center justify-center border-2 border-dashed border-navy-700 rounded-2xl p-6 hover:border-brand-gold/50 cursor-pointer transition-all bg-navy-900/50"
                      >
                        {screenshotPreview ? (
                          <div className="space-y-2 text-center">
                            <img src={screenshotPreview} alt="Preview" className="h-24 mx-auto rounded-lg" />
                            <p className="text-xs text-brand-gold font-bold">Screenshot attached</p>
                          </div>
                        ) : (
                          <>
                            <Plus className="w-8 h-8 text-text-secondary mb-2" />
                            <p className="text-xs font-bold text-text-secondary">Upload Payment Screenshot</p>
                            <p className="text-[10px] text-text-secondary/60 mt-1 uppercase tracking-widest">JPG, PNG (Max 2MB)</p>
                          </>
                        )}
                      </label>
                    </div>
                  </div>
               </div>
               {loading && uploadProgress > 0 && uploadProgress < 100 && (
                  <ProgressBar progress={uploadProgress} label="Uploading Screenshot" className="mb-2" />
               )}
               <button type="submit" disabled={loading} className="w-full bg-success text-white py-4 rounded-xl font-bold disabled:opacity-50 shadow-glow-success">
                 {loading ? 'Submitting...' : 'Submit Verification'}
               </button>
             </form>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 bg-brand-gold/10 text-brand-gold rounded-full flex items-center justify-center mx-auto mb-4">
               <Clock className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-2xl text-text-primary">Pending Verification!</h3>
            <p className="text-text-secondary">Your recharge request for {amount} coins has been sent. An admin will verify the UTR and approve it shortly.</p>
            <button onClick={onClose} className="w-full bg-navy-800 hover:bg-navy-700 text-white font-bold py-3 mt-4 rounded-xl transition border border-navy-700">Close</button>
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
        const studentsList = await dbService.getUsersByRole('student');
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
      await dbService.transferCoins(user!.id, selectedStudent.id, val);
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
    <Modal isOpen={true} onClose={onClose} title="Transfer Coins">
        <form onSubmit={handleTransfer} className="space-y-4">
           {getVIPLevel(user).level < 1 && getUserLevelAndXP(user).currentLevel < 5 && (
             <div className="bg-error/10 border border-error/20 p-4 rounded-xl space-y-2">
                <div className="flex items-center gap-2 text-error font-black text-[10px] uppercase tracking-widest">
                    <Lock size={14} /> Security Restriction
                </div>
                <p className="text-xs text-text-secondary font-medium leading-relaxed">
                    Peer-to-peer transfers are locked for new accounts. Reach <strong>Level 5</strong> or <strong>VIP Level 1</strong> to unlock this feature.
                </p>
             </div>
           )}

           <div className="relative">
             <label className="block text-sm font-bold text-text-secondary mb-1.5 tracking-tight">Recipient</label>
             {selectedStudent ? (
               <div className="flex items-center justify-between bg-navy-800 border border-brand-gold/30 rounded-xl px-4 py-3">
                 <div>
                   <div className="font-bold text-text-primary text-sm tracking-tight">{selectedStudent.name}</div>
                   <div className="text-[10px] text-brand-gold font-mono uppercase font-black">{selectedStudent.email}</div>
                 </div>
                 <button 
                  type="button" 
                  onClick={() => {setSelectedStudent(null); setSearch('');}}
                  className="p-1.5 hover:bg-navy-700 rounded-lg text-text-muted"
                 >
                   <X className="w-4 h-4" />
                 </button>
               </div>
             ) : (
               <>
                 <input 
                   required 
                   type="text" 
                   value={search} 
                   onChange={e => {setSearch(e.target.value); setShowResults(true);}}
                   onFocus={() => setShowResults(true)}
                   className="w-full bg-navy-800 border border-navy-700 rounded-xl px-4 py-3 outline-none focus:border-brand-gold transition-colors text-white text-sm" 
                   placeholder="Search name or email..."
                 />
                 <AnimatePresence>
                   {showResults && search.length > 0 && (
                     <motion.div 
                       initial={{ opacity: 0, y: -10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="absolute z-[110] left-0 right-0 mt-2 bg-navy-900 border border-navy-700 rounded-2xl shadow-xl max-h-48 overflow-y-auto no-scrollbar p-1"
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
                             className="w-full text-left p-3 rounded-xl hover:bg-navy-800 flex flex-col transition-colors"
                           >
                             <span className="font-bold text-sm text-text-primary">{s.name}</span>
                             <span className="text-[10px] text-text-secondary/80 font-mono tracking-tighter truncate">{s.email}</span>
                           </button>
                         ))
                       ) : (
                         <div className="p-4 text-center text-xs text-text-secondary/80 italic">No targets identified</div>
                       )}
                     </motion.div>
                   )}
                 </AnimatePresence>
               </>
             )}
           </div>
           <div>
             <label className="block text-sm font-bold text-text-secondary mb-1.5 tracking-tight">Amount</label>
             <div className="relative">
               <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-brand-gold" />
               <input 
                 required 
                 type="number" 
                 min="1" 
                 max={user?.coins} 
                 value={amount} 
                 onChange={e=>setAmount(e.target.value)} 
                 className="w-full pl-10 pr-4 py-3 bg-navy-800 border border-navy-700 rounded-xl outline-none focus:border-brand-gold transition-colors font-bold text-sm text-white" 
                 placeholder={`Available: ${user?.coins}`}
               />
             </div>
           </div>
           <button 
            disabled={loading || !selectedStudent || !amount || parseInt(amount) <= 0 || parseInt(amount) > (user?.coins || 0)} 
            type="submit" 
            className="w-full bg-brand-gold text-bg-main rounded-xl py-4 font-bold disabled:opacity-50 mt-4 shadow-lg active:scale-[0.98] transition-transform"
           >
             {loading ? 'Processing...' : 'Execute Transfer'}
           </button>
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
      await dbService.convertDiamondsToCoins(user!.id, val);
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
    <Modal isOpen={true} onClose={onClose} title="Convert Diamonds">
        <div className="bg-cyan-500/10 text-cyan-400 font-bold text-[10px] uppercase tracking-widest p-3 rounded-xl mb-4 border border-cyan-500/20 flex gap-2">
           <ArrowRightLeft className="w-4 h-4 shrink-0" />
           <p>Exchange Rate: 7 Diamonds = 1 Coin. <br/>Conversion is irreversible.</p>
        </div>
        <form onSubmit={handleConvert} className="space-y-4">
           <div>
             <label className="block text-sm font-bold text-text-secondary mb-1.5 tracking-tight">Quantity (Diamonds)</label>
             <div className="relative">
               <ArrowRightLeft className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-400" />
               <input 
                 required 
                 type="number" 
                 min="1" 
                 max={user?.diamonds || 0} 
                 value={amount} 
                 onChange={e=>setAmount(e.target.value)} 
                 className="w-full pl-10 pr-4 py-3 bg-navy-800 border border-navy-700 rounded-xl outline-none focus:border-brand-gold transition-colors font-bold text-sm text-white" 
                 placeholder={`Available: ${user?.diamonds || 0}`}
               />
             </div>
           </div>
           
           {amount && parseInt(amount) > 0 && (
             <div className="bg-navy-950 p-4 rounded-xl border border-navy-700 text-sm mt-4">
                <div className="flex justify-between mb-1">
                   <span className="text-text-secondary font-medium">Output:</span>
                   <span className="font-black text-brand-gold tracking-tight">{Math.floor(parseInt(amount) / 7)} Coins</span>
                </div>
             </div>
           )}

           <button 
            disabled={loading || !amount || parseInt(amount) <= 0 || parseInt(amount) > (user?.diamonds || 0)} 
            type="submit" 
            className="w-full bg-brand-gold text-bg-main rounded-xl py-4 font-bold disabled:opacity-50 mt-4 shadow-lg active:scale-[0.98] transition-transform"
           >
             {loading ? 'Processing...' : 'Confirm Conversion'}
           </button>
        </form>
    </Modal>
  )
}
