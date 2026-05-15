import React, { useEffect, useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { dbService } from '../services/dbProvider';
import { handleFirestoreError, OperationType } from '../lib/errorHandling';
import { Transaction, PlatformSettings, User } from '../types';
import { ArrowUpRight, ArrowDownLeft, Coins, Send, Plus, X, Smartphone, CheckCircle, Clock, Receipt, ArrowLeft, ChevronDown, Lock, BookOpen, ArrowRightLeft } from 'lucide-react';
import { format } from 'date-fns';
import { cn, getVIPLevel, getUserLevelAndXP } from '../lib/utils';
import { QRCodeSVG } from 'qrcode.react';
import { toast } from 'react-hot-toast';
import { motion, AnimatePresence } from 'motion/react';
import { RulesModal } from '../components/RulesModal';

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
  }, [user]);

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
        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ type: "spring", stiffness: 300, damping: 25, delay: 0.1 }}
          className="bg-[#1C1C1E] border border-white/10 rounded-3xl p-6 md:p-8 text-white shadow-2xl relative overflow-hidden aspect-[1.58/1] flex flex-col justify-between group"
        >
          <div className="absolute top-0 right-0 p-6 text-white opacity-20 group-hover:opacity-40 transition-opacity">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="10"></circle><path d="M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8"></path><path d="M12 18V6"></path></svg>
          </div>
          
          <div className="relative z-10 w-full flex-1 flex flex-col">
            <span className="text-zinc-400 font-medium text-xs md:text-sm tracking-widest uppercase">Current Balance</span>
            <motion.div 
              key={user?.coins}
              initial={{ scale: 0.8, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ type: "spring" }}
              className="mt-1 md:mt-2 text-[2.5rem] md:text-5xl font-black text-white drop-shadow-md tracking-tighter"
            >
              {user?.coins?.toLocaleString()}
            </motion.div>
          </div>
          
          <div className="relative z-10 flex gap-2 mt-auto w-full">
            <button 
              onClick={() => setShowRecharge(true)} 
              className="flex-1 bg-white hover:bg-zinc-200 text-black transition rounded-2xl py-3 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <Plus className="w-3.5 h-3.5 md:w-4 md:h-4" /> Add
            </button>
            <button 
              onClick={() => setShowConvert(true)} 
              className="flex-1 bg-brand-gold hover:bg-brand-gold-hover text-bg-main transition rounded-2xl py-3 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 shadow-sm active:scale-95"
            >
              <ArrowRightLeft className="w-3.5 h-3.5 md:w-4 md:h-4" /> Convert
            </button>
            <button 
              onClick={() => setShowTransfer(true)} 
              disabled={getVIPLevel(user).level < 1 && getUserLevelAndXP(user).currentLevel < 5}
              className="flex-1 bg-white/10 hover:bg-white/20 text-white transition rounded-2xl py-3 font-bold text-xs md:text-sm flex items-center justify-center gap-1.5 backdrop-blur-md active:scale-95 relative group/btn disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {getVIPLevel(user).level < 1 && getUserLevelAndXP(user).currentLevel < 5 ? (
                <>
                  <Lock className="w-3.5 h-3.5 md:w-4 md:h-4 text-bg-main/50" />
                  <span>Send</span>
                  <div className="absolute -top-12 left-1/2 -translate-x-1/2 bg-text-primary/90 text-[10px] py-1 px-2 rounded-lg opacity-0 group-hover/btn:opacity-100 transition-opacity whitespace-nowrap pointer-events-none">
                    Unlocks at Level 5 or VIP 1
                  </div>
                </>
              ) : (
                <>
                  <Send className="w-3.5 h-3.5 md:w-4 md:h-4" /> Send
                </>
              )}
            </button>
          </div>
        </motion.div>
      </div>

      {/* Transaction History */}
      <motion.div 
        initial={{ opacity: 0, x: 20 }}
        animate={{ opacity: 1, x: 0 }}
        transition={{ delay: 0.2 }}
        onClick={() => transactions.length > 3 && setShowAllTransactions(!showAllTransactions)}
        className={cn(
          "md:col-span-2 bg-bg-surface rounded-3xl p-5 md:p-8 shadow-sm border border-border-main transition-all duration-300",
          transactions.length > 3 && "cursor-pointer hover:border-brand-gold/20 hover:shadow-md"
        )}
      >
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-xl md:text-2xl font-black text-text-primary tracking-tight">Recent Activity</h2>
          <button 
            onClick={(e) => { e.stopPropagation(); setShowRules(true); }}
            className="text-xs font-bold px-3 py-1.5 bg-border-main text-text-secondary rounded-lg hover:bg-border-main transition-colors flex items-center gap-1"
          >
            <BookOpen className="w-3.5 h-3.5" /> Rules
          </button>
        </div>
        <div className="space-y-4">
          {(showAllTransactions ? transactions : transactions.slice(0, 3)).map((tx, idx) => {
            const isSender = tx.senderId === user?.id;
            const status = tx.status || 'completed';
            return (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2 + idx * 0.05 }}
                key={tx.id} 
                className="flex items-center justify-between p-3 md:p-4 rounded-2xl hover:bg-bg-main transition border border-gray-50 md:border-transparent md:hover:border-border-main"
              >
                <div className="flex items-center gap-3 md:gap-4">
                  <div className={cn(
                    "w-10 h-10 rounded-full flex items-center justify-center shrink-0",
                    isSender ? "bg-border-main text-text-primary" : "bg-success-green/10 text-emerald-600"
                  )}>
                    {isSender ? <ArrowUpRight className="w-5 h-5"/> : <ArrowDownLeft className="w-5 h-5"/>}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                       <p className="font-semibold text-sm md:text-base text-text-primary capitalize">
                         {tx.type.replace(/_/g, ' ')}
                       </p>
                       {status === 'pending' && <span className="bg-yellow-100 text-yellow-800 text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Pending</span>}
                       {status === 'rejected' && <span className="bg-red-100 text-red-800 text-[9px] md:text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider">Rejected</span>}
                    </div>
                    {tx.message && <p className="text-[10px] text-text-secondary/80 italic line-clamp-1">"{tx.message}"</p>}
                    <p className="text-[11px] md:text-xs text-text-secondary mt-0.5 md:mt-1">{format(tx.timestamp, 'PP p')} {tx.utr && <span className="font-mono text-[9px] md:text-[10px] ml-1 opacity-70">UTR: {tx.utr}</span>}</p>
                  </div>
                </div>
                <div className={cn("font-bold text-base md:text-lg shrink-0", isSender ? "text-text-primary" : "text-emerald-600")}>
                  {isSender ? "-" : "+"}{tx.amount}
                </div>
              </motion.div>
            )
          })}
          {transactions.length === 0 && (
            <div className="py-12 flex flex-col items-center justify-center text-center">
              <div className="w-16 h-16 bg-bg-main rounded-full flex items-center justify-center mb-3">
                <Receipt className="w-8 h-8 text-text-secondary/60" />
              </div>
              <p className="text-text-secondary font-medium">No transactions yet.</p>
            </div>
          )}
        </div>
        {!showAllTransactions && transactions.length > 3 && (
          <div className="mt-4 flex justify-center">
            <button 
              onClick={() => setShowAllTransactions(true)}
              className="group flex flex-col items-center gap-1 focus:outline-none"
            >
              <span className="text-[11px] font-bold text-text-secondary/80 uppercase tracking-widest group-hover:text-text-secondary transition-colors">Tap to reveal more</span>
              <motion.div 
                animate={{ y: [0, 4, 0] }} 
                transition={{ repeat: Infinity, duration: 2, ease: "easeInOut" }}
                className="w-8 h-8 rounded-full bg-bg-main flex items-center justify-center border border-border-main group-hover:bg-border-main transition-colors"
              >
                <ChevronDown className="w-4 h-4 text-text-secondary/80 group-hover:text-text-secondary" />
              </motion.div>
            </button>
          </div>
        )}
        {showAllTransactions && transactions.length > 3 && (
          <div className="mt-4 flex justify-center">
             <button 
                onClick={() => setShowAllTransactions(false)}
                className="text-[11px] font-bold text-text-secondary/80 hover:text-text-secondary uppercase tracking-widest px-4 py-2 bg-bg-main rounded-full border shadow-sm transition-colors"
             >
                Collapse
             </button>
          </div>
        )}
      </motion.div>

      <AnimatePresence>
        {showConvert && <ConvertModal onClose={() => setShowConvert(false)} onComplete={fetchTransactions} />}
      </AnimatePresence>
      <AnimatePresence>
        {showTransfer && <TransferModal onClose={() => setShowTransfer(false)} onComplete={fetchTransactions} />}
      </AnimatePresence>
      <AnimatePresence>
        {showRecharge && <RechargeModal onClose={() => setShowRecharge(false)} onComplete={fetchTransactions} settings={settings} />}
      </AnimatePresence>
      <AnimatePresence>
        {showRules && <RulesModal key="rules-modal" onClose={() => setShowRules(false)} />}
      </AnimatePresence>

    </motion.div>
  );
};

const RechargeModal = ({ onClose, onComplete, settings }: any) => {
  const { user } = useAuth();
  const [amount, setAmount] = useState<number | ''>(100);
  const [step, setStep] = useState(1);
  const [utr, setUtr] = useState('');
  const [loading, setLoading] = useState(false);

  const mobileNumber = settings?.mobileNumber || 'admin@upi';
  const payeeName = settings?.payeeName || 'Admin Test';
  const paymentLink = settings?.paymentLink || '';
  
  const isVPA = mobileNumber.includes('@');
  
  const encodedHandle = encodeURIComponent(mobileNumber);
  const encodedName = encodeURIComponent(payeeName);
  
  // Included prefilled amount as requested for merchant UPI ID
  const upiParams = `pa=${encodedHandle}&pn=${encodedName}&am=${amount}&cu=INR`;
  
  const upiUrl = isVPA ? `upi://pay?${upiParams}` : '';
  const gpayUrl = isVPA ? `gpay://upi/pay?${upiParams}` : '';
  const phonepeUrl = isVPA ? `phonepe://pay?${upiParams}` : '';
  const paytmUrl = isVPA ? `paytmmp://pay?${upiParams}` : '';
  
  const hasPaymentMethod = mobileNumber || paymentLink;

  const handleSubmitUtr = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!amount || amount <= 0) return;
    
    // Calculate final coins based on requested packages
    const finalCoins = amount === 120 ? 69 : amount === 500 ? 780 : 0;
    
    if (finalCoins === 0) {
       return toast.error("Please select a valid package.");
    }
    
    setLoading(true);
    try {
      await dbService.createRechargeRequest({
        studentId: user!.id,
        studentName: user!.name,
        amount: amount,
        coins: finalCoins,
        status: 'pending',
        paymentScreenshot: utr,
        createdAt: Date.now(),
        updatedAt: Date.now()
      });

      setStep(3);
      setLoading(false);
      onComplete();
    } catch(err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'recharge_requests');
      setLoading(false);
    }
  }

  return (
    <motion.div 
      key="recharge-modal-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-bg-surface rounded-3xl w-full max-w-sm p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="flex justify-between items-center mb-6 shrink-0">
           <h2 className="text-xl font-bold">Recharge Coins</h2>
           <button onClick={onClose} className="p-2"><X className="w-5 h-5 text-text-secondary/80" /></button>
        </div>

        <div className="overflow-y-auto flex-1 no-scrollbar pb-2">
        {step === 1 && (
          <div className="space-y-4">
            <div className="bg-brand-gold/10 text-amber-900 p-4 rounded-xl text-sm border border-amber-100 flex gap-3">
               <Coins className="w-5 h-5 text-amber-500 shrink-0" />
               <div>
                 <strong>Top-up your wallet!</strong>
                 {user?.role === 'superadmin' ? (
                   <p className="mt-0.5 opacity-80">As Super Admin, you can mint coins directly to your wallet to distribute rewards.</p>
                 ) : (
                   <p className="mt-0.5 opacity-80">Coins allow you to enroll in premium assignments, bypass penalties, and support the platform. Admin sets the conversion rate securely via their UPI handle.</p>
                 )}
               </div>
            </div>
            {!hasPaymentMethod && user?.role !== 'superadmin' && (
               <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm mb-4">Payment details are not configured by the admin yet.</div>
            )}
            <p className="text-text-secondary text-sm font-medium">Select a recharge package</p>
            <div className="grid grid-cols-2 gap-3">
              <button 
                type="button"
                onClick={() => { setAmount(120); }} 
                className={cn("py-3 px-2 rounded-xl border-2 font-bold transition flex flex-col items-center", amount === 120 ? "border-brand-gold text-brand-gold bg-brand-gold/10" : "border-border-main text-text-secondary hover:border-border-main")}
              >
                <span className="text-sm">Starter</span>
                <span className="text-lg">₹120</span>
                <span className="text-[10px] opacity-70">69 Coins</span>
              </button>
              <button 
                type="button"
                onClick={() => { setAmount(500); }} 
                className={cn("py-3 px-2 rounded-xl border-2 font-bold transition flex flex-col items-center relative overflow-hidden", amount === 500 ? "border-brand-gold text-brand-gold bg-brand-gold/10" : "border-border-main text-text-secondary hover:border-border-main")}
              >
                <div className="absolute top-0 right-0 bg-brand-gold text-bg-main text-[8px] px-1.5 py-0.5 rounded-bl-lg font-black uppercase">Best Value</div>
                <span className="text-sm">Premium</span>
                <span className="text-lg">₹500</span>
                <span className="text-[10px] opacity-70">780 Coins</span>
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-text-secondary mb-1 mt-4">Calculated Coins</label>
              <div className="bg-bg-main p-4 rounded-xl border border-border-main flex justify-between items-center">
                 <span className="text-text-secondary text-xs uppercase font-black">Estimated Value</span>
                 <span className="text-xl font-black text-brand-gold flex items-center gap-1">
                    <Coins className="w-5 h-5" /> {amount === 120 ? 69 : amount === 500 ? 780 : 0}
                 </span>
              </div>
            </div>
            {user?.role === 'superadmin' ? (
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
                }} className="w-full bg-brand-gold-hover text-bg-main py-4 rounded-xl font-bold mt-4 disabled:opacity-50">
                    {loading ? 'Minting...' : 'Mint Coins Instantly'}
                </button>
            ) : (
                <button disabled={!hasPaymentMethod || !amount || amount <= 0} onClick={() => setStep(2)} className="w-full bg-brand-gold-hover text-bg-main py-4 rounded-xl font-bold mt-4 disabled:opacity-50">Continue</button>
            )}
          </div>
        )}        {step === 2 && hasPaymentMethod && (
          <div className="text-center space-y-6 py-4 overflow-y-auto max-h-[85vh]">
            <div className="flex items-center gap-3">
              <button onClick={() => setStep(1)} className="p-2 text-text-secondary/80 hover:text-text-primary bg-bg-main hover:bg-border-main rounded-full transition-colors focus:outline-none">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <h3 className="font-bold text-lg text-left flex-1">Complete Payment</h3>
            </div>
            {paymentLink && (
              <div className="bg-brand-gold-secondary-hover p-4 rounded-2xl border-2 border-brand-gold/20 shadow-sm mx-auto">
                 <h3 className="font-bold text-lg text-indigo-900 mb-2">Pay via Link</h3>
                 <p className="text-indigo-700 text-sm mb-4">Click below to open the secure payment gateway to pay INR {amount}.</p>
                 <a href={paymentLink} target="_blank" rel="noopener noreferrer" className="block w-full bg-brand-gold-hover hover:bg-indigo-700 text-bg-main font-bold py-3 rounded-xl transition shadow-sm">
                   Open Payment Link
                 </a>
              </div>
            )}
            
            {mobileNumber && (
              <>
                {paymentLink && <div className="text-text-secondary/80 font-medium text-sm">OR Pay via UPI / Transfer</div>}
                {isVPA ? (
                  <>
                    <div className="bg-bg-surface p-4 rounded-2xl inline-block border-2 border-border-main shadow-sm mx-auto">
                      <QRCodeSVG value={upiUrl} size={150} />
                    </div>
                    <div>
                      <h3 className="font-bold text-lg">Scan to Pay INR {amount}</h3>
                      <p className="text-text-secondary text-sm mt-1 mb-4 hidden md:block">Use any UPI app on your phone to scan and pay.</p>
                      
                      <div className="md:hidden">
                        <p className="text-text-secondary text-sm mt-1 mb-3">Or pay directly using installed apps:</p>
                        <div className="grid grid-cols-2 gap-2 mb-4">
                          <a href={gpayUrl} className="bg-bg-surface border border-border-main text-text-primary font-medium px-3 py-2 rounded-lg flex justify-center items-center gap-2 hover:bg-bg-main">
                            <img src="https://upload.wikimedia.org/wikipedia/commons/f/f2/Google_Pay_Logo.svg" alt="GPay" className="h-4" /> GPay
                          </a>
                          <a href={phonepeUrl} className="bg-bg-surface border border-border-main text-text-primary font-medium px-3 py-2 rounded-lg flex justify-center items-center gap-2 hover:bg-bg-main">
                            ✨ PhonePe
                          </a>
                          <a href={paytmUrl} className="bg-bg-surface border border-border-main text-text-primary font-medium px-3 py-2 rounded-lg flex justify-center items-center gap-2 hover:bg-bg-main">
                            Paytm
                          </a>
                          <a href={upiUrl} className="bg-brand-gold-secondary-hover text-indigo-700 font-medium px-3 py-2 rounded-lg flex justify-center items-center gap-2 hover:bg-brand-gold-secondary-hover">
                            Other UPI App
                          </a>
                        </div>
                      </div>
                    </div>
                  </>
                ) : (
                    <div className="bg-bg-surface p-6 rounded-2xl border-2 border-border-main shadow-sm mx-auto">
                       <div className="w-16 h-16 bg-brand-gold-secondary-hover text-brand-gold rounded-full flex items-center justify-center mx-auto mb-4">
                         <Smartphone className="w-8 h-8" />
                       </div>
                       <h3 className="font-bold text-lg">Pay INR {amount}</h3>
                       <p className="text-text-secondary text-sm mt-1 mb-4">Copy the payment number below, open your payment app, and transfer exactly INR {amount}.</p>
                    </div>
                )}
    
                <div className="mt-4">
                  <button 
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(mobileNumber);
                      toast.success("Copied! Paste it in your payment app to pay manually.");
                    }} 
                    className="bg-border-main text-text-primary font-bold px-4 py-3 rounded-xl w-full flex items-center justify-center gap-2 hover:bg-border-main transition"
                  >
                    <span>Click to Copy Payment Profile Details</span>
                  </button>
                  <p className="text-[10px] text-text-secondary/80 mt-2 leading-tight">Details are hidden for security reasons. Click to copy and paste smoothly in any app.</p>
                </div>
              </>
            )}
             
             <form onSubmit={handleSubmitUtr} className="pt-4 border-t border-border-main text-left mt-4">
               <label className="block text-sm font-bold text-text-secondary mb-2">Payment Proof (UTR or Screenshot Link)</label>
               <input 
                 type="text" 
                 value={utr}
                 onChange={e => setUtr(e.target.value)}
                 className="w-full border border-border-main rounded-xl px-4 py-3 outline-none focus:border-indigo-500 focus:ring-2 focus:ring-indigo-200" 
                 placeholder="12-digit UTR or imgur link"
                 required
               />
               <button type="submit" disabled={loading} className="w-full bg-green-500 hover:bg-green-600 text-bg-main py-4 rounded-xl font-bold mt-4 disabled:opacity-50">
                 {loading ? 'Submitting...' : 'Submit Verification'}
               </button>
             </form>
          </div>
        )}

        {step === 3 && (
          <div className="text-center space-y-4 py-8">
            <div className="w-16 h-16 bg-blue-100 text-blue-500 rounded-full flex items-center justify-center mx-auto mb-4">
               <Clock className="w-8 h-8" />
            </div>
            <h3 className="font-bold text-2xl">Pending Verification!</h3>
            <p className="text-text-secondary">Your recharge request for {amount} coins has been sent. An admin will verify the UTR and approve it shortly.</p>
            <button onClick={onClose} className="w-full bg-border-main hover:bg-border-main text-text-primary font-bold py-3 mt-4 rounded-xl transition">Close</button>
          </div>
        )}
        </div>
      </motion.div>
    </motion.div>
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
    
    const vipInfo = getVIPLevel(user);
    const levelInfo = getUserLevelAndXP(user);
    if (vipInfo.level < 1 && levelInfo.currentLevel < 5) {
        return toast.error("Transfers unlock at Level 5 or VIP Level 1!");
    }

    if (val > user!.coins) return toast.error("Insufficient coins!");

    if (!window.confirm(`Are you sure you want to send ${val} coins to ${selectedStudent.name}?`)) {
        return;
    }

    setLoading(true);
    try {
      await dbService.transferCoins(user!.id, selectedStudent.id, val);

      // We still update local state
      updateResources({ coins: user!.coins - val });
      onComplete();
      onClose();
      toast.success(`Sent transferring coins to ${selectedStudent.name}`);
    } catch(err: any) {
      handleFirestoreError(err, OperationType.WRITE, 'transfer/transactions');
    } finally {
      setLoading(false);
    }
  }

  return (
    <motion.div 
      key="transfer-modal-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-bg-surface rounded-3xl w-full max-w-sm p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="flex justify-between items-center mb-6 shrink-0">
           <h2 className="text-xl font-bold tracking-tight">Transfer Coins</h2>
           <button onClick={onClose} className="p-2 hover:bg-border-main rounded-full transition-colors"><X className="w-5 h-5 text-text-secondary/80" /></button>
        </div>
        <div className="overflow-y-auto flex-1 no-scrollbar pb-2">
        <form onSubmit={handleTransfer} className="space-y-4">
           {getVIPLevel(user).level < 1 && getUserLevelAndXP(user).currentLevel < 5 && (
             <div className="bg-rose-500/10 border border-rose-500/20 p-4 rounded-2xl space-y-2">
                <div className="flex items-center gap-2 text-rose-600 font-black text-[10px] uppercase tracking-widest">
                    <Lock size={14} /> Security Restriction
                </div>
                <p className="text-xs text-rose-700/80 font-medium leading-relaxed">
                    Peer-to-peer transfers are locked for new accounts. Reach <strong>Level 5</strong> or <strong>VIP Level 1</strong> to unlock this feature.
                </p>
                <div className="flex gap-4 pt-1">
                    <div className="flex-1 bg-bg-surface/50 p-2 rounded-xl border border-rose-500/30/50">
                        <p className="text-[9px] font-black text-rose-400 uppercase">Current Lvl</p>
                        <p className="font-bold text-rose-600">{getUserLevelAndXP(user).currentLevel} / 5</p>
                    </div>
                    <div className="flex-1 bg-bg-surface/50 p-2 rounded-xl border border-rose-500/30/50">
                        <p className="text-[9px] font-black text-rose-400 uppercase">Current VIP</p>
                        <p className="font-bold text-rose-600">{getVIPLevel(user).level} / 1</p>
                    </div>
                </div>
             </div>
           )}

           <div className="relative">
             <label className="block text-sm font-bold text-text-secondary mb-1.5">Recipient</label>
             {selectedStudent ? (
               <div className="flex items-center justify-between bg-brand-gold-secondary-hover border border-brand-gold/30 rounded-xl px-4 py-3">
                 <div>
                   <div className="font-bold text-indigo-900 text-sm">{selectedStudent.name}</div>
                   <div className="text-[10px] text-brand-gold font-mono">{selectedStudent.email}</div>
                 </div>
                 <button 
                  type="button" 
                  onClick={() => {setSelectedStudent(null); setSearch('');}}
                  className="p-1.5 hover:bg-brand-gold-secondary-hover rounded-lg text-indigo-400"
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
                   className="w-full border border-border-main bg-bg-main/50 rounded-xl px-4 py-3 outline-none focus:bg-bg-surface focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 hover:border-border-main transition-all text-sm" 
                   placeholder="Search name or email..."
                 />
                 <AnimatePresence>
                   {showResults && search.length > 0 && (
                     <motion.div 
                       initial={{ opacity: 0, y: -10 }}
                       animate={{ opacity: 1, y: 0 }}
                       exit={{ opacity: 0, y: -10 }}
                       className="absolute z-[110] left-0 right-0 mt-2 bg-bg-surface border border-border-main rounded-2xl shadow-xl max-h-48 overflow-y-auto overflow-x-hidden p-2"
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
                             className="w-full text-left p-3 rounded-xl hover:bg-bg-main flex flex-col transition-colors border border-transparent hover:border-border-main"
                           >
                             <span className="font-bold text-sm text-text-primary">{s.name}</span>
                             <span className="text-[10px] text-text-secondary/80 font-mono">{s.email}</span>
                           </button>
                         ))
                       ) : (
                         <div className="p-4 text-center text-xs text-text-secondary/80 italic">No students found</div>
                       )}
                     </motion.div>
                   )}
                 </AnimatePresence>
               </>
             )}
           </div>
           <div>
             <label className="block text-sm font-bold text-text-secondary mb-1.5">Amount</label>
             <div className="relative">
               <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-amber-500" />
               <input 
                 required 
                 type="number" 
                 min="1" 
                 max={user!.coins} 
                 value={amount} 
                 onChange={e=>setAmount(e.target.value)} 
                 className="w-full pl-10 pr-4 py-3 border border-border-main bg-bg-main/50 rounded-xl outline-none focus:bg-bg-surface focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 hover:border-border-main transition-all font-bold text-sm" 
                 placeholder={`Max ${user?.coins}`}
               />
             </div>
           </div>
           <button 
            disabled={loading || !selectedStudent || !amount || parseInt(amount) <= 0} 
            type="submit" 
            className="w-full bg-brand-gold-hover hover:bg-indigo-700 text-bg-main rounded-xl py-4 font-bold disabled:opacity-50 mt-4 shadow-lg shadow-indigo-100 transition-all active:scale-[0.98]"
           >
             {loading ? 'Processing...' : 'Send Coins'}
           </button>
        </form>
        </div>
      </motion.div>
    </motion.div>
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
    <motion.div 
      key="convert-modal-container"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[200] flex items-center justify-center p-4"
    >
      <motion.div 
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        transition={{ type: "spring", stiffness: 300, damping: 30 }}
        className="bg-bg-surface rounded-3xl w-full max-w-sm p-6 shadow-2xl relative flex flex-col max-h-[90vh] overflow-hidden"
      >
        <div className="flex justify-between items-center mb-6 shrink-0">
           <h2 className="text-xl font-bold tracking-tight">Convert Diamonds</h2>
           <button onClick={onClose} className="p-2 hover:bg-border-main rounded-full transition-colors"><X className="w-5 h-5 text-text-secondary/80" /></button>
        </div>
        <div className="bg-cyan-500/10 text-cyan-500 font-medium text-xs p-3 rounded-xl mb-4 border border-cyan-500/20 flex gap-2">
           <ArrowRightLeft className="w-4 h-4 shrink-0" />
           <p>Conversion Rate: 7 Diamonds = 1 Coin (350 for 50). <br/>Academic success builds your legacy!</p>
        </div>
        <div className="overflow-y-auto flex-1 no-scrollbar pb-2">
        <form onSubmit={handleConvert} className="space-y-4">
           <div>
             <label className="block text-sm font-bold text-text-secondary mb-1.5">Amount to Convert (Diamonds)</label>
             <div className="relative">
               <ArrowRightLeft className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-cyan-500" />
               <input 
                 required 
                 type="number" 
                 min="1" 
                 max={user?.diamonds || 0} 
                 value={amount} 
                 onChange={e=>setAmount(e.target.value)} 
                 className="w-full pl-10 pr-4 py-3 border border-border-main bg-bg-main/50 rounded-xl outline-none focus:bg-bg-surface focus:border-indigo-500 focus:ring-4 focus:ring-indigo-50 hover:border-border-main transition-all font-bold text-sm" 
                 placeholder={`Available: ${user?.diamonds || 0}`}
               />
             </div>
           </div>
           
           {amount && parseInt(amount) > 0 && (
             <div className="bg-bg-main p-4 rounded-xl border border-border-main text-sm mt-4">
                <div className="flex justify-between mb-1">
                   <span className="text-text-secondary">You get:</span>
                   <span className="font-bold text-brand-gold">{Math.floor(parseInt(amount) / 7)} Coins</span>
                </div>
             </div>
           )}

           <button 
            disabled={loading || !amount || parseInt(amount) <= 0 || parseInt(amount) > (user?.diamonds || 0)} 
            type="submit" 
            className="w-full bg-brand-gold hover:bg-brand-gold-hover text-bg-main rounded-xl py-4 font-bold disabled:opacity-50 mt-4 shadow-lg transition-all active:scale-[0.98]"
           >
             {loading ? 'Processing...' : 'Convert to Coins'}
           </button>
        </form>
        </div>
      </motion.div>
    </motion.div>
  )
}
