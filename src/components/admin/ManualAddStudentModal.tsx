import React, { useState } from 'react';
import { X, UserPlus, Mail, User as UserIcon, Coins } from 'lucide-react';
import { motion } from 'framer-motion';
import { dbService } from '../../services/dbProvider';
import { toast } from 'react-hot-toast';

const ManualAddStudentModal = ({ onClose, onComplete }: { onClose: () => void, onComplete: () => void }) => {
    const [email, setEmail] = useState('');
    const [name, setName] = useState('');
    const [startingCoins, setStartingCoins] = useState('50');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);
        try {
            // This bypasses normal invite flow - adds user to a whitelist/pre-reg collection
            const { collection, doc, setDoc } = await import('firebase/firestore');
            const { db: fireDb } = await import('../../services/firebase');
            
            await setDoc(doc(collection(fireDb, 'pre_registered_users'), email.toLowerCase()), {
                email: email.toLowerCase(),
                name,
                startingCoins: parseInt(startingCoins),
                role: 'student',
                addedAt: Date.now()
            });

            toast.success("Occupant whitelisted! They can sign in now.");
            onComplete();
            onClose();
        } catch (err) {
            console.error(err);
            toast.error("Failed to whitelist user");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[300] flex items-center justify-center p-4">
            <motion.div 
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="bg-bg-surface w-full max-w-md rounded-[32px] overflow-hidden"
            >
                <div className="p-8 border-b border-border-main flex justify-between items-center">
                    <div className="flex items-center gap-3">
                        <UserPlus className="text-brand-gold" />
                        <h2 className="text-xl font-bold text-text-primary">Whitelist Occupant</h2>
                    </div>
                    <button onClick={onClose} className="p-2 hover:bg-bg-main rounded-full"><X /></button>
                </div>
                <form onSubmit={handleSubmit} className="p-8 space-y-4">
                    <div>
                        <label className="block text-xs font-bold text-text-secondary/80 uppercase mb-2">Display Name</label>
                        <div className="relative">
                            <UserIcon className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/40" />
                            <input required value={name} onChange={e=>setName(e.target.value)} placeholder="Full Name" className="w-full pl-12 pr-6 py-3 bg-bg-main border-none rounded-2xl outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary/80 uppercase mb-2">Email Address</label>
                        <div className="relative">
                            <Mail className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/40" />
                            <input required type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="student@email.com" className="w-full pl-12 pr-6 py-3 bg-bg-main border-none rounded-2xl outline-none" />
                        </div>
                    </div>
                    <div>
                        <label className="block text-xs font-bold text-text-secondary/80 uppercase mb-2">Starting Capital (Coins)</label>
                        <div className="relative">
                            <Coins className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-text-secondary/40" />
                            <input required type="number" value={startingCoins} onChange={e=>setStartingCoins(e.target.value)} className="w-full pl-12 pr-6 py-3 bg-bg-main border-none rounded-2xl outline-none font-bold" />
                        </div>
                    </div>
                    <button 
                        disabled={loading} 
                        className="w-full py-4 bg-brand-gold-hover text-bg-main rounded-2xl font-bold uppercase tracking-widest mt-4 shadow-lg shadow-indigo-100"
                    >
                        {loading ? 'Processing...' : 'Authorize Access'}
                    </button>
                    <p className="text-[10px] text-text-secondary text-center font-medium">WHITED-LISTED USERS BYPASS REGISTRATION TOKENS</p>
                </form>
            </motion.div>
        </div>
    );
};

export default ManualAddStudentModal;
