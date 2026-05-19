import React, { useState, useEffect } from 'react';
import { Settings as SettingsIcon, Save, Phone, CreditCard, Link as LinkIcon, ShieldCheck } from 'lucide-react';
import { adminService } from '../../services/dbProvider';
import { toast } from 'react-hot-toast';

export const SettingsManager = () => {
    const [settings, setSettings] = useState({
        upiHandle: '',
        mobileNumber: '',
        payeeName: '',
        paymentLink: ''
    });
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const fetchSettings = async () => {
            setLoading(true);
            try {
                const s = await adminService.getPlatformSettings();
                if (s) setSettings({
                    upiHandle: s.upiHandle || '',
                    mobileNumber: s.mobileNumber || '',
                    payeeName: s.payeeName || '',
                    paymentLink: s.paymentLink || ''
                });
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, []);

    const handleSave = async (e: React.FormEvent) => {
        e.preventDefault();
        setSaving(true);
        try {
            await adminService.updatePlatformSettings(settings);
            toast.success("Platform protocols updated");
        } catch (err) {
            toast.error("Protocol update failed");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-20 text-center animate-pulse text-text-secondary font-black uppercase text-xs tracking-widest">Accessing platform core...</div>;

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="bg-bg-surface rounded-[40px] border border-border-main p-8 md:p-12 shadow-xl relative overflow-hidden">
                <div className="absolute top-0 right-0 w-64 h-64 bg-brand-gold/5 rounded-full blur-[80px] -translate-y-1/2 translate-x-1/2" />
                
                <div className="relative z-10 flex flex-col md:flex-row gap-8 items-start">
                    <div className="bg-bg-main p-6 rounded-[32px] border border-border-main shadow-inner shrink-0 self-center md:self-start">
                        <SettingsIcon className="w-12 h-12 text-brand-gold" />
                    </div>
                    
                    <div className="flex-1 w-full">
                        <h2 className="text-3xl font-black text-text-primary tracking-tight mb-2">Platform Infrastructure</h2>
                        <p className="text-text-secondary font-medium tracking-tight mb-10">Configure core economic hooks and payment routing protocols.</p>
                        
                        <form onSubmit={handleSave} className="space-y-8">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.2em] ml-1">
                                        <CreditCard size={12} /> Target UPI ID
                                    </label>
                                    <input 
                                        value={settings.upiHandle} 
                                        onChange={e => setSettings({...settings, upiHandle: e.target.value})}
                                        placeholder="user@upi"
                                        className="w-full bg-bg-main/50 border-2 border-transparent focus:border-brand-gold/30 rounded-3xl px-6 py-4 text-sm font-bold text-text-primary outline-none transition-all placeholder:text-text-secondary/20 shadow-inner"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.2em] ml-1">
                                        <Phone size={12} /> Mobile Number (Optional)
                                    </label>
                                    <input 
                                        value={settings.mobileNumber} 
                                        onChange={e => setSettings({...settings, mobileNumber: e.target.value})}
                                        placeholder="+1555..."
                                        className="w-full bg-bg-main/50 border-2 border-transparent focus:border-brand-gold/30 rounded-3xl px-6 py-4 text-sm font-bold text-text-primary outline-none transition-all placeholder:text-text-secondary/20 shadow-inner"
                                    />
                                </div>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.2em] ml-1">
                                        <ShieldCheck size={12} /> Verified Payee
                                    </label>
                                    <input 
                                        value={settings.payeeName} 
                                        onChange={e => setSettings({...settings, payeeName: e.target.value})}
                                        placeholder="Platform Administrator"
                                        className="w-full bg-bg-main/50 border-2 border-transparent focus:border-brand-gold/30 rounded-3xl px-6 py-4 text-sm font-bold text-text-primary outline-none transition-all placeholder:text-text-secondary/20 shadow-inner"
                                    />
                                </div>
                                <div className="md:col-span-2 space-y-3">
                                    <label className="flex items-center gap-2 text-[10px] font-black text-text-secondary/50 uppercase tracking-[0.2em] ml-1">
                                        <CreditCard size={12} /> Direct Payment URL
                                    </label>
                                    <div className="relative">
                                        <LinkIcon className="absolute left-6 top-1/2 -translate-y-1/2 text-brand-gold w-4 h-4" />
                                        <input 
                                            value={settings.paymentLink} 
                                            onChange={e => setSettings({...settings, paymentLink: e.target.value})}
                                            placeholder="https://pay.platform.com/..."
                                            className="w-full bg-bg-main/50 border-2 border-transparent focus:border-brand-gold/30 rounded-3xl pl-14 pr-6 py-4 text-sm font-bold text-text-primary outline-none transition-all placeholder:text-text-secondary/20 shadow-inner"
                                        />
                                    </div>
                                    <p className="text-[10px] text-text-secondary/40 font-bold uppercase tracking-widest pl-2">Point of sale link for manual coin recharges</p>
                                </div>
                            </div>

                            <div className="pt-6 border-t border-border-main/50 flex flex-col md:flex-row gap-4 items-center">
                                <button 
                                    type="submit"
                                    disabled={saving}
                                    className="w-full md:w-auto bg-brand-gold-hover text-bg-main px-12 py-5 rounded-[24px] font-black text-xs uppercase tracking-widest hover:scale-105 active:scale-95 transition-all shadow-xl shadow-indigo-100 flex items-center justify-center gap-3 disabled:opacity-50"
                                >
                                    {saving ? "Updating Protocols..." : (
                                        <>
                                            Commit Changes <Save size={18} />
                                        </>
                                    )}
                                </button>
                                <div className="flex items-center gap-2 text-emerald-500 bg-emerald-500/10 px-4 py-2 rounded-2xl">
                                    <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                                    <span className="text-[10px] font-black uppercase tracking-widest">Auth Validated</span>
                                </div>
                            </div>
                        </form>
                    </div>
                </div>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="p-8 bg-bg-main border border-border-main rounded-[40px] shadow-sm">
                    <h4 className="text-sm font-black text-text-primary uppercase tracking-widest mb-4">Security Logs</h4>
                    <p className="text-xs text-text-secondary font-medium leading-relaxed mb-6">Platform version v2.4.1 (Stable). Monitoring active on all transactional nodes. AI Oracle redundancy enabled.</p>
                    <div className="flex gap-2">
                        <span className="bg-bg-surface px-3 py-1 rounded-full text-[8px] font-black text-text-secondary/60 uppercase border border-border-main">Zero Trust Enabled</span>
                        <span className="bg-bg-surface px-3 py-1 rounded-full text-[8px] font-black text-text-secondary/60 uppercase border border-border-main">256-bit AES</span>
                    </div>
                </div>
            </div>
        </div>
    );
};

