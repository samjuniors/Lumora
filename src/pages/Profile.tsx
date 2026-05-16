import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, Mail, Shield, ShieldAlert, Coins, Award, Edit2, Check, X, 
  Package, Palette, Target, TrendingUp, Flame, Settings, Zap, Star, Crown, 
  Copy, Upload, LogOut, Clock, BookOpen, ChevronRight, AlertCircle, Share2, Info, Gift,
  Users, UserPlus, Heart, Search, Trophy
} from 'lucide-react';
import { dbService } from '../services/dbProvider';
import { toast } from 'react-hot-toast';
import { SHOP_ITEMS } from './Shop';
import { cn, getUserLevelAndXP, getShortId, getVIPLevel } from '../lib/utils';
import { calculatePerformanceScore, getPerformanceBadge } from '../lib/performance';
import { ScoreChart } from '../components/ScoreChart';
import { Link } from 'react-router-dom';
import { RulesModal } from '../components/RulesModal';
import { ShareModal } from '../components/ShareModal';
import { SendItemModal } from '../components/SendItemModal';
import { BADGES } from '../lib/badges';
import { UserProfileModal } from '../components/UserProfileModal';
import { PresenceDot } from '../components/PresenceDot';
import { User, Enrollment } from '../types';

const AVATARS = [
  '🐶', '🐱', '🦊', '🐻', '🐼', '🐨', '🐯', '🦁', '🐮', '🐷', '🐸', '🐵', '🦄', '🐝', '🐛', '🦋', '🐙', '🐢', '🦖', '🐉', '👽', '👻', '🤖'
];

const copyToClipboard = (text: string) => {
  navigator.clipboard.writeText(text);
  toast.success('ID copied to clipboard!');
}

const compressImage = (file: File, maxWidth: number = 800): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;
        
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }
        
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);
        
        resolve(canvas.toDataURL('image/jpeg', 0.7));
      };
      img.onerror = reject;
    };
    reader.onerror = reject;
  });
};

export const Profile = () => {
  const { user, logOut, setUser } = useAuth();
  const [isEditing, setIsEditing] = useState(false);
  const [editName, setEditName] = useState(user?.name || '');
  const [editBio, setEditBio] = useState(user?.bio || '');
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'overview' | 'settings' | 'social'>('overview');
  const [showBadges, setShowBadges] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [showShare, setShowShare] = useState(false);
  const [missionStats, setMissionStats] = useState({ active: 0, completed: 0, missed: 0, retest: 0 });
  const [sendingItemId, setSendingItemId] = useState<string | null>(null);
  const [showInfoId, setShowInfoId] = useState<string | null>(null);
  const [editAvatar, setEditAvatar] = useState(user?.avatar || '');
  const [editBanner, setEditBanner] = useState(user?.bannerColor || '');
  const [followers, setFollowers] = useState<User[]>([]);
  const [following, setFollowing] = useState<User[]>([]);
  const [loadingSocial, setLoadingSocial] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);
  const [uploadingBanner, setUploadingBanner] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);
  const bannerInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    setEditName(user?.name || '');
    setEditBio(user?.bio || '');
    setEditAvatar(user?.avatar || '');
    setEditBanner(user?.bannerColor || '');
    
    if (user?.id) {
        const fetchSocialData = async () => {
          setLoadingSocial(true);
          try {
            const allUsers = await dbService.getUsers();
            setFollowers(allUsers.filter(u => user.followerIds?.includes(u.id)));
            setFollowing(allUsers.filter(u => user.followingIds?.includes(u.id)));
          } catch (err) {
            console.error("Failed to fetch social data", err);
          } finally {
            setLoadingSocial(false);
          }
        };
        fetchSocialData();
        
        const fetchMissionStats = async () => {
            try {
                const enrs = await dbService.getEnrollmentsByStudent(user.id);
                
                setMissionStats({
                    active: enrs.filter(e => e.status === 'active').length,
                    completed: enrs.filter(e => e.status === 'submitted' || e.status === 'graded').length,
                    missed: enrs.filter(e => e.status === 'missed').length,
                    retest: enrs.filter(e => e.status === 'active' && e.graceDeadline && e.graceDeadline > Date.now()).length
                });
            } catch (err: any) {
                console.error("Failed to fetch mission stats", err);
            }
        };
        fetchMissionStats();
    }
  }, [user?.id, user?.name, user?.avatar, user?.bannerColor]);

  if (!user) return null;

  const handleSaveProfile = async () => {
    if (!user) return;
    if (!editName.trim()) {
      toast.error('Name cannot be empty');
      return;
    }
    
    // Check if lengths are reasonable to prevent Firestore size limits throwing
    if (editAvatar.length > 500000 || editBanner.length > 500000) {
      toast.error('Image is too large. Please choose a smaller image.');
      return;
    }

    setSaving(true);
    try {
      const updateData = {
        name: editName.trim(),
        bio: editBio.trim(),
        avatar: editAvatar.trim(),
        bannerColor: editBanner.trim(),
        updatedAt: Date.now()
      };
      await dbService.updateUser(user.id, updateData);
      setUser(prev => prev ? { ...prev, ...updateData } : null);
      toast.success('Profile updated successfully');
      setIsEditing(false);
    } catch (err: any) {
      toast.error('Failed to update profile');
    } finally {
      setSaving(false);
    }
  };

  const handleSaveAvatar = async (avatar: string) => {
    if (!user) return;
    try {
      await dbService.updateUser(user.id, { avatar, updatedAt: Date.now() });
      setUser(prev => prev ? { ...prev, avatar, updatedAt: Date.now() } : null);
      toast.success('Avatar updated!');
    } catch (err: any) {
      toast.error('Failed to update avatar');
    }
  };

  const inventorySummary = (user.inventory || []).reduce((acc: any, itemRef: any) => {
    const id = typeof itemRef === 'string' ? itemRef : itemRef.id;
    if (!acc[id]) {
      acc[id] = { count: 0, items: [] };
    }
    acc[id].count += 1;
    acc[id].items.push(itemRef);
    return acc;
  }, {});

  const consumeItem = async (itemId: string) => {
    if (!user.inventory) return;
    
    if (itemId === 'mystery_gift_box' || itemId === 'streak_repair' || itemId === 'streak_freeze' || itemId === 'xp_booster_2x') {
       if (!window.confirm(`Are you sure you want to use ${itemId.replace(/_/g, ' ')}?`)) return;
    }

    const itemIndex = user.inventory.findIndex((i: any) => (typeof i === 'string' ? i : i.id) === itemId);
    if (itemIndex === -1) return;

    try {
      const newInventory = [...user.inventory];
      newInventory.splice(itemIndex, 1);
      
      const updateData: any = { inventory: newInventory, updatedAt: Date.now() };
      
      // Mystery box logic: give a random reward
      if (itemId === 'mystery_gift_box') {
        const rewards = [
          { type: 'coins', amount: 300, msg: '300 Coins!' },
          { type: 'coins', amount: 50, msg: '50 Coins' },
          { type: 'item', id: 'streak_freeze', msg: 'Streak Freeze!' },
          { type: 'item', id: 'streak_repair', msg: 'Streak Repair!' },
          { type: 'coins', amount: 500, msg: 'JACKPOT: 500 Coins!' }
        ];
        const reward = rewards[Math.floor(Math.random() * rewards.length)];
        if (reward.type === 'coins') {
          updateData.coins = (user.coins || 0) + reward.amount;
          toast.success(`Mystery Box gave you: ${reward.msg}`, { icon: '🎁' });
        } else if (reward.type === 'item') {
          newInventory.push(reward.id);
          toast.success(`Mystery Box gave you: ${reward.msg}`, { icon: '🎁' });
        }
      } else if (itemId === 'streak_repair') {
        updateData.streak = Math.max(user.streak || 0, 7); // Simplified repair to 7 for now
        toast.success('Streak repaired to 7 days!', { icon: '🔥' });
      } else if (itemId === 'streak_freeze') {
        toast.success('Streak Freeze activated! (One day of safety added)', { icon: '❄️' });
      } else if (itemId === 'xp_booster_2x') {
        const boosterUntil = Date.now() + (24 * 60 * 60 * 1000);
        updateData.xpBoosterUntil = boosterUntil;
        toast.success('2x XP Booster active for 24 hours!', { icon: '⚡' });
      } else {
        toast(`${itemId.replace(/_/g, ' ')} is used automatically during assignments or evaluation!`, { icon: 'ℹ️' });
        return; // Don't consume if it's passive
      }

      await dbService.updateUser(user.id, updateData);
    } catch (e) {
      toast.error('Use failed');
    }
  };

  const { currentLevel, xpCurrent, xpMax, xpProgress, achievementsSummary } = getUserLevelAndXP(user);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isAvatar: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    if (file.size > 5 * 1024 * 1024) {
      toast.error('Image is too large (max 5MB)');
      return;
    }

    if (isAvatar) setUploadingAvatar(true);
    else setUploadingBanner(true);

    try {
      const base64Str = await compressImage(file, isAvatar ? 400 : 1200);
      if (isAvatar) setEditAvatar(base64Str);
      else setEditBanner(base64Str);
    } catch (err) {
      toast.error('Failed to process image');
    } finally {
      if (isAvatar) setUploadingAvatar(false);
      else setUploadingBanner(false);
    }
  };

  const currentName = isEditing ? editName : user.name;
  const currentAvatar = isEditing ? editAvatar : user.avatar;
  const currentBanner = isEditing ? editBanner : user.bannerColor;
  const currentBio = isEditing ? editBio : user.bio;

  return (
    <div className="max-w-6xl mx-auto px-4 space-y-6 pb-12">
      {/* Hidden File Inputs */}
      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, true)} className="hidden" ref={avatarInputRef} />
      <input type="file" accept="image/*" onChange={(e) => handleImageUpload(e, false)} className="hidden" ref={bannerInputRef} />

      {/* Cover & Header Section */}
      <div className="bg-navy-900 rounded-[2.5rem] shadow-glow-gold border border-brand-gold/20 overflow-hidden relative">
        <div className={cn(
          "h-48 md:h-64 w-full relative transition-colors duration-500 bg-cover bg-center group/banner",
          (!currentBanner || (!currentBanner.startsWith('http') && !currentBanner.startsWith('data:image') && !currentBanner.startsWith('#') && !currentBanner.startsWith('hsl') && !currentBanner.startsWith('rgb') && !currentBanner.includes('-'))) && "bg-navy-950",
          (currentBanner && currentBanner.includes('-') && !currentBanner.startsWith('http')) ? currentBanner : ""
        )}
        style={{ 
          backgroundImage: (currentBanner?.startsWith('http') || currentBanner?.startsWith('data:image')) ? `url(${currentBanner})` : (!currentBanner ? 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop)' : 'none'),
          backgroundColor: (currentBanner && (currentBanner.startsWith('#') || currentBanner.startsWith('rgb') || currentBanner.startsWith('hsl'))) ? currentBanner : 'transparent'
        }}>
          <div className="absolute inset-0 bg-gradient-to-t from-navy-900/80 via-transparent to-transparent"></div>
          
          {isEditing && (
            <div 
              className={cn(
                "absolute inset-0 bg-black/40 flex items-center justify-center cursor-pointer z-10 transition-all",
                uploadingBanner ? "animate-pulse" : "hover:bg-black/50"
              )}
              onClick={() => !uploadingBanner && bannerInputRef.current?.click()}
            >
              <div className="flex flex-col items-center text-white/90">
                 <Upload className="w-8 h-8 mb-2 drop-shadow" />
                 <span className="font-bold text-sm tracking-widest uppercase py-1 px-3 rounded-lg bg-black/20 backdrop-blur border border-white/20">Change Banner</span>
              </div>
            </div>
          )}

          {!isEditing ? (
            <button 
              onClick={logOut}
              className="absolute top-6 right-6 md:top-8 md:right-8 bg-bg-surface/20 hover:bg-bg-surface/40 backdrop-blur-md text-bg-main border border-white/30 p-2.5 rounded-xl transition-all shadow-sm z-20 group"
              title="Sign Out"
            >
              <LogOut className="w-5 h-5 group-hover:scale-110 transition-transform" />
            </button>
          ) : (
            <div className="absolute top-6 right-6 md:top-8 md:right-8 flex gap-3 z-20">
              <button 
                onClick={() => {
                  setIsEditing(false);
                  setEditName(user.name || '');
                  setEditAvatar(user.avatar || '');
                  setEditBanner(user.bannerColor || '');
                }}
                disabled={saving}
                className="bg-bg-main/50 hover:bg-bg-main backdrop-blur-md border border-border-main text-text-primary px-4 py-2 rounded-xl font-bold transition-all shadow-sm flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <button 
                onClick={handleSaveProfile}
                disabled={saving}
                className="bg-brand-gold hover:bg-brand-gold-hover text-bg-main px-6 py-2 rounded-xl font-bold transition-all shadow-lg flex items-center gap-2 border border-brand-gold"
              >
                {saving ? (
                  <><span className="animate-pulse flex items-center gap-2"><Upload className="w-4 h-4 animate-bounce" /> Saving...</span></>
                ) : (
                  <><Check className="w-5 h-5" /> Save Profile</>
                )}
              </button>
            </div>
          )}
        </div>

        <div className="px-6 md:px-10 pb-8 pt-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4 mt-[-60px] md:mt-[-80px]">
            <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-8">
              <div 
                className={cn(
                  "w-28 h-28 md:w-40 md:h-40 rounded-3xl flex items-center justify-center bg-navy-900 border-[6px] border-navy-900 shadow-xl text-6xl relative z-20 shrink-0 overflow-hidden group/avatar transition-transform",
                  "ring-2 ring-brand-gold/30",
                  isEditing && !uploadingAvatar && "cursor-pointer hover:scale-105"
                )}
                onClick={() => isEditing && !uploadingAvatar && avatarInputRef.current?.click()}
              >
                {currentAvatar?.startsWith('http') || currentAvatar?.startsWith('data:') ? (
                  <img src={currentAvatar} key={currentAvatar} alt="Avatar" className="w-full h-full object-cover" />
                ) : currentAvatar ? (
                  <span className="text-6xl md:text-7xl">{currentAvatar}</span>
                ) : (
                  <img src={`https://api.dicebear.com/7.x/notionists/svg?seed=${user.id || 'default'}&backgroundColor=f1f5f9`} alt="Avatar" className="w-full h-full object-cover" />
                )}

                {isEditing && (
                  <div className={cn(
                    "absolute inset-0 bg-black/50 flex flex-col items-center justify-center transition-all text-white backdrop-blur-[2px]",
                    uploadingAvatar ? "opacity-100 animate-pulse" : "opacity-0 group-hover/avatar:opacity-100"
                  )}>
                     <Upload className="w-6 h-6 mb-1" />
                     <span className="text-[10px] font-bold uppercase tracking-widest text-center px-2">{uploadingAvatar ? 'Uploading...' : 'Change Avatar'}</span>
                  </div>
                )}
              </div>
              
              <div className="pb-2">
                <div className="flex items-center gap-3 flex-wrap">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-3xl md:text-4xl font-black text-text-primary bg-bg-main border-2 border-brand-gold rounded-xl px-4 py-1.5 focus:outline-none w-full max-w-[280px] sm:max-w-xs transition-shadow shadow-[0_0_0_4px_rgba(250,204,21,0.2)]"
                      placeholder="Your Name"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-3">
                        <h1 className="text-3xl md:text-4xl font-black text-text-primary hover:text-brand-gold transition-colors cursor-default">{currentName}</h1>
                        <PresenceDot status={user.presence} showLabel className="hidden md:flex ml-2" />
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span className="text-xs font-mono font-bold text-brand-gold bg-bg-surface px-2 py-0.5 rounded-lg border border-brand-gold/20 shadow-sm">
                          #{user.luminaId || getShortId(user.id)}
                        </span>
                        <PresenceDot status={user.presence} className="md:hidden" />
                      </div>
                    </div>
                  )}
                  {user.inventory?.includes('badge_scholar') && !isEditing && (
                    <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-1.5 rounded-xl shadow-lg shadow-indigo-200 animate-pulse" title="Scholar Badge">
                      <Award className="w-5 h-5 text-bg-main" />
                    </div>
                  )}
                  {!isEditing && (
                    <span className={cn(
                      "text-xs font-black tracking-widest uppercase px-3 py-1.5 rounded-xl shadow-sm flex items-center justify-center -mt-1",
                      getPerformanceBadge(calculatePerformanceScore(user)).color,
                      getPerformanceBadge(calculatePerformanceScore(user)).shadow,
                      (calculatePerformanceScore(user) >= 2000 && calculatePerformanceScore(user) < 5000) ? "text-[#0A1128]" : "text-bg-main"
                    )}>
                      {getPerformanceBadge(calculatePerformanceScore(user)).title}
                    </span>
                  )}
                  {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="p-2 text-text-secondary hover:text-brand-gold hover:bg-bg-main rounded-xl transition-colors border border-border-main shadow-sm bg-bg-surface">
                      <Edit2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-3 md:gap-6 text-text-secondary font-medium text-[11px] md:text-sm mt-4">
                  <div className="flex items-center gap-4 bg-[#1A2B48]/5 border border-[#1A2B48]/10 px-4 py-2 rounded-2xl">
                    <button onClick={() => setActiveTab('social')} className="hover:text-brand-gold transition-colors flex flex-col items-start">
                      <span className="font-black text-text-primary text-base leading-none">{(user.followerIds || []).length}</span> 
                      <span className="uppercase tracking-widest text-[8px] font-bold opacity-60">Followers</span>
                    </button>
                    <div className="w-px h-6 bg-border-main" />
                    <button onClick={() => setActiveTab('social')} className="hover:text-brand-gold transition-colors flex flex-col items-start">
                      <span className="font-black text-text-primary text-base leading-none">{(user.followingIds || []).length}</span> 
                      <span className="uppercase tracking-widest text-[8px] font-bold opacity-60">Following</span>
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 w-full lg:w-auto">
                    <span className="flex items-center gap-2 uppercase tracking-wider text-[10px] font-black text-text-secondary bg-bg-main border border-border-main px-3 py-2 rounded-xl shadow-sm">
                      <span className="opacity-50">LUMINA-ID:</span>
                      <span className="text-text-primary font-mono">{user.luminaId || getShortId(user.id)}</span>
                      <button onClick={() => copyToClipboard(user.luminaId || user.id)} className="ml-1 text-brand-gold hover:scale-110 transition-transform shrink-0"><Copy className="w-3 h-3" /></button>
                    </span>
                    
                    <span className="flex items-center gap-2 uppercase tracking-wider text-[10px] font-black text-brand-gold bg-[#D4AF37]/10 border border-[#D4AF37]/20 px-3 py-2 rounded-xl shadow-sm">
                      <Coins className="w-3.5 h-3.5" /> 
                      {user.coins.toLocaleString()}
                    </span>

                    {user.xpBoosterUntil && user.xpBoosterUntil > Date.now() && (
                      <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-black text-cyan-400 bg-cyan-400/10 border border-cyan-400/20 px-3 py-2 rounded-xl">
                        <Zap className="w-3.5 h-3.5" /> 1.5x XP
                      </span>
                    )}
                    {user.taxHavenUntil && user.taxHavenUntil > Date.now() && (
                      <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-black text-emerald-400 bg-emerald-400/10 border border-emerald-400/20 px-3 py-2 rounded-xl">
                        <Shield className="w-3.5 h-3.5" /> -10% Tax
                      </span>
                    )}
                    {user.doubleDownShieldUntil && user.doubleDownShieldUntil > Date.now() && (
                      <span className="flex items-center gap-1.5 uppercase tracking-wider text-[10px] font-black text-amber-400 bg-amber-400/10 border border-amber-400/20 px-3 py-2 rounded-xl">
                        <ShieldAlert className="w-3.5 h-3.5" /> 75% Refund
                      </span>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-4">
                    <p className="text-[10px] uppercase font-black text-text-secondary tracking-widest mb-1 mx-1">Your Bio</p>
                    <textarea 
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Tell the world about your academic goal..."
                      className="w-full max-w-sm bg-bg-main border-2 border-border-main rounded-2xl px-4 py-3 text-sm font-medium focus:border-brand-gold outline-none transition-all resize-none"
                      rows={2}
                    />
                  </div>
                ) : currentBio && (
                  <p className="mt-4 text-sm text-text-secondary font-medium italic border-l-2 border-[#D4AF37] pl-4 py-1 max-w-md">
                    "{currentBio}"
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-2 self-start md:self-end pt-6 md:pt-0 pb-2 w-full lg:w-auto">
              <button 
                onClick={() => setShowShare(true)}
                className="bg-bg-main hover:bg-border-main text-text-primary transition-all font-black text-[10px] uppercase tracking-widest px-4 py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 border border-border-main active:scale-95"
              >
                <Share2 className="w-4 h-4" /> <span>Share</span>
              </button>
              {user.role === 'student' && (
                <Link to={`/scorecard/${user.id}`} className="bg-bg-surface hover:bg-brand-gold/5 text-text-primary border border-brand-gold/20 transition-all font-black text-[10px] uppercase tracking-widest px-4 py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95 text-center">
                  <Target className="w-4 h-4 text-brand-gold" /> <span>Transcript</span>
                </Link>
              )}
              <button 
                onClick={() => setActiveTab('social')}
                className={cn(
                  "transition-all font-black text-[10px] uppercase tracking-widest px-4 py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95", 
                  activeTab === 'social' ? 'bg-[#1A2B48] text-brand-gold border border-brand-gold/30 shadow-lg shadow-brand-gold/10' : 'bg-bg-main text-text-primary border border-border-main hover:bg-border-main'
                )}
              >
                <Users className="w-4 h-4" /> <span>Social</span>
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={cn(
                  "transition-all font-black text-[10px] uppercase tracking-widest px-4 py-3.5 rounded-2xl shadow-sm flex items-center justify-center gap-2 active:scale-95", 
                  activeTab === 'settings' ? 'bg-[#1A2B48] text-brand-gold border border-brand-gold/30 shadow-lg shadow-brand-gold/10' : 'bg-bg-main text-text-primary border border-border-main hover:bg-border-main'
                )}
              >
                <Settings className="w-4 h-4" /> <span>System</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      <AnimatePresence mode="wait">
        {activeTab === 'social' && (
          <motion.div 
            key="social"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 lg:grid-cols-2 gap-6"
           >
              <div className="bg-bg-surface rounded-3xl border border-border-main shadow-sm p-6 md:p-8 flex flex-col">
                <h3 className="font-black text-text-primary text-lg md:text-xl mb-6 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Users className="w-5 h-5 text-brand-gold" /> Following</span>
                  <span className="text-[10px] font-black bg-[#1A2B48] text-brand-gold px-3 py-1 rounded-full uppercase tracking-widest border border-brand-gold/20">{(user.followingIds || []).length}</span>
                </h3>

                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar flex-1">
                  {loadingSocial ? (
                    <div className="space-y-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-16 w-full animate-pulse bg-bg-main rounded-2xl" />
                      ))}
                    </div>
                  ) : following.length > 0 ? (
                    following.map(f => (
                      <Link to={`/leaderboard?search=${f.name}`} key={f.id} className="flex items-center gap-3 p-3 bg-bg-main rounded-2xl border border-border-main hover:border-brand-gold/30 hover:shadow-lg hover:shadow-brand-gold/5 transition-all group">
                        <div className="w-12 h-12 rounded-xl bg-bg-surface border border-border-main flex items-center justify-center text-xl overflow-hidden shrink-0 group-hover:scale-105 transition-transform">
                          {(f.avatar?.startsWith('http') || f.avatar?.startsWith('data:')) ? (
                            <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{f.avatar || '👤'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-black text-sm text-text-primary truncate">{f.name}</p>
                          <p className="text-[9px] font-mono font-black text-text-secondary uppercase tracking-tight truncate opacity-60">#{f.luminaId || getShortId(f.id)}</p>
                        </div>
                        <ChevronRight className="w-4 h-4 text-text-secondary group-hover:text-brand-gold group-hover:translate-x-1 transition-all" />
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-bg-main rounded-[2rem] border border-dashed border-border-main">
                      <Search className="w-10 h-10 mx-auto mb-3 opacity-20 text-[#1A2B48]" />
                      <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">No active connections</p>
                      <Link to="/leaderboard" className="mt-4 inline-block text-[10px] font-black uppercase tracking-[0.2em] text-brand-gold hover:underline bg-[#1A2B48] px-4 py-2 rounded-xl">Hunt Recruits</Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-bg-surface rounded-3xl border border-border-main shadow-sm p-6 md:p-8 flex flex-col">
                <h3 className="font-black text-text-primary text-lg md:text-xl mb-6 flex items-center justify-between">
                  <span className="flex items-center gap-2"><Heart className="w-5 h-5 text-rose-500" /> Followers</span>
                  <span className="text-[10px] font-black bg-brand-gold text-[#1A2B48] px-3 py-1 rounded-full uppercase tracking-widest">{(user.followerIds || []).length}</span>
                </h3>
                <div className="space-y-3 max-h-[500px] overflow-y-auto pr-2 no-scrollbar flex-1">
                  {loadingSocial ? (
                    <div className="space-y-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-16 w-full animate-pulse bg-bg-main rounded-2xl" />
                      ))}
                    </div>
                  ) : followers.length > 0 ? (
                    followers.map(f => (
                      <div key={f.id} className="flex items-center gap-3 p-3 bg-bg-main rounded-2xl border border-border-main transition-all">
                        <div className="w-12 h-12 rounded-xl bg-bg-surface border border-border-main flex items-center justify-center text-xl overflow-hidden shrink-0">
                          {(f.avatar?.startsWith('http') || f.avatar?.startsWith('data:')) ? (
                            <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{f.avatar || '👤'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-black text-sm text-text-primary truncate">{f.name}</p>
                          <p className="text-[9px] font-mono font-black text-text-secondary uppercase tracking-tight truncate opacity-60">#{f.luminaId || getShortId(f.id)}</p>
                        </div>
                        <div className="flex gap-2">
                           {user.followingIds?.includes(f.id) ? (
                             <span className="text-[8px] font-black uppercase text-brand-gold tracking-widest bg-[#1A2B48] px-2 py-1.5 rounded-lg border border-brand-gold/20">Elite Link</span>
                           ) : (
                             <button 
                               onClick={() => {
                                 dbService.followUser(user.id, f.id);
                                 toast.success(`Connected with ${f.name}`);
                               }} 
                               className="text-[8px] font-black uppercase text-bg-main tracking-widest bg-brand-gold px-3 py-1.5 rounded-lg hover:scale-105 transition-all shadow-lg shadow-brand-gold/10"
                             >
                               Connect
                             </button>
                           )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-12 bg-bg-main rounded-[2rem] border border-dashed border-border-main">
                      <Heart className="w-10 h-10 mx-auto mb-3 opacity-20 text-rose-500" />
                      <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">No signals detected</p>
                      <p className="text-[9px] font-black text-text-secondary mt-1 tracking-tighter opacity-60">Status comes from domination.</p>
                    </div>
                  )}
                </div>
              </div>
            </motion.div>
        )}

        {activeTab === 'settings' && (
          <motion.div 
            key="settings"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="grid grid-cols-1 md:grid-cols-2 gap-6"
          >
            {/* Column 1: Appearance */}
            <div className="bg-bg-surface rounded-[2rem] border border-border-main shadow-sm p-8 h-fit">
               <div className="flex items-center justify-between gap-3 mb-6">
                 <h3 className="font-black text-text-primary text-xl flex items-center gap-3">
                   <Palette className="w-6 h-6 text-brand-gold"/> Appearance
                 </h3>
               </div>
               
               <div className="space-y-8">
                 <div>
                   <p className="text-sm font-bold text-text-secondary uppercase tracking-widest mb-4">Avatar Symbol</p>
                   <div className="grid grid-cols-6 sm:grid-cols-8 gap-3 max-h-64 overflow-y-auto p-2 -m-2 no-scrollbar">
                     {AVATARS.map(avatar => (
                       <button 
                         key={avatar} 
                         onClick={() => handleSaveAvatar(avatar)}
                         className={cn("text-2xl aspect-square flex items-center justify-center rounded-xl transition hover:scale-110", user.avatar === avatar ? "bg-brand-gold/10 border-2 border-brand-gold scale-110" : "bg-bg-main border border-border-main hover:bg-border-main")}
                       >
                         {avatar}
                       </button>
                     ))}
                   </div>
                 </div>
               </div>
            </div>

            {/* Column 2: Account & System */}
            <div className="bg-bg-surface rounded-3xl border border-border-main shadow-sm p-6 md:p-8 space-y-8 h-fit">
               {/* Account Section */}
               <div className="space-y-6">
                  <h3 className="font-black text-text-primary text-xl flex items-center gap-3 mb-6">
                    <UserIcon className="w-6 h-6 text-brand-gold"/> Account
                  </h3>
                  <div className="space-y-4">
                     <div className="bg-bg-main p-4 md:p-5 rounded-2xl flex flex-col sm:flex-row sm:items-center justify-between gap-4 border border-border-main">
                        <div>
                           <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Display Name</p>
                           <p className="font-black text-text-primary">{user.name}</p>
                        </div>
                        <button onClick={() => {
                           setActiveTab('overview');
                           setIsEditing(true);
                           setEditName(user.name || '');
                           setEditAvatar(user.avatar || '');
                           setEditBanner(user.bannerColor || '');
                        }} className="text-brand-gold hover:text-bg-main bg-brand-gold/10 hover:bg-brand-gold px-4 py-2.5 rounded-xl font-black text-[10px] uppercase tracking-widest transition-all cursor-pointer border border-brand-gold/20 text-center">
                           Modify Identity
                        </button>
                     </div>
                     <div className="bg-bg-main p-4 md:p-5 rounded-2xl flex flex-col gap-1 border border-border-main">
                        <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Email Identity</p>
                        <div className="flex items-center gap-2">
                           <p className="font-black text-text-primary truncate">{user.email}</p>
                           <span className="text-[9px] font-black bg-emerald-500 text-white uppercase px-2 py-0.5 rounded-full tracking-widest shrink-0">Verified</span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* System Section */}
               <div className="pt-6 border-t border-border-main">
                 <h3 className="font-black text-text-primary text-xl flex items-center gap-3 mb-6">
                   <Settings className="w-6 h-6 text-brand-gold"/> System
                 </h3>
                 <div className="space-y-3">
                   <div className="flex items-center justify-between p-4 md:p-5 bg-bg-main rounded-[1.5rem] border border-border-main">
                     <div className="pr-4">
                       <p className="font-black text-text-primary text-sm uppercase tracking-tight">Public Presence</p>
                       <p className="text-[11px] text-text-secondary font-medium mt-0.5 leading-tight">Appear in the global domination rankings</p>
                     </div>
                     <div className="w-12 h-6 bg-brand-gold rounded-full relative cursor-pointer shadow-inner shrink-0" aria-label="Toggle setting" onClick={() => toast("Privacy focus: Forced public for now", { icon: '🔒' })}>
                       <div className="w-4 h-4 bg-white rounded-full absolute top-1 right-1 shadow-sm"></div>
                     </div>
                   </div>
                   <div className="flex items-center justify-between p-4 md:p-5 bg-bg-main rounded-[1.5rem] border border-border-main">
                     <div className="pr-4">
                       <p className="font-black text-text-primary text-sm uppercase tracking-tight">Neural Alerts</p>
                       <p className="text-[11px] text-text-secondary font-medium mt-0.5 leading-tight">Notifications about mission status</p>
                     </div>
                     <div className="w-12 h-6 bg-bg-surface border border-border-main rounded-full relative cursor-pointer shrink-0" aria-label="Toggle setting" onClick={() => toast("Notifications under maintenance", { icon: '🔔' })}>
                       <div className="w-4 h-4 bg-text-secondary rounded-full absolute top-0.5 left-0.5 mt-0.5 ml-0.5"></div>
                     </div>
                   </div>
                   <div 
                     onClick={() => setShowRules(true)}
                     className="flex items-center justify-between p-4 md:p-5 bg-[#1A2B48] hover:bg-black group rounded-[1.5rem] border border-brand-gold/30 cursor-pointer transition-all active:scale-[0.98] shadow-lg shadow-brand-gold/5"
                   >
                     <div className="flex items-center gap-4">
                       <div className="w-10 h-10 bg-brand-gold/10 text-brand-gold rounded-xl flex items-center justify-center border border-brand-gold/20">
                          <BookOpen className="w-5 h-5 shadow-sm" />
                       </div>
                       <div>
                         <p className="font-black text-brand-gold text-sm uppercase tracking-widest">Platform Codex</p>
                         <p className="text-[10px] text-brand-gold/60 mt-0.5 font-bold uppercase tracking-tight">Regulations & Economy</p>
                       </div>
                     </div>
                     <ChevronRight className="w-5 h-5 text-brand-gold group-hover:translate-x-1 transition-transform" />
                   </div>
                 </div>
                 <button 
                   onClick={logOut}
                   className="w-full mt-6 bg-rose-600/5 hover:bg-rose-600 text-rose-600 hover:text-white border border-rose-600/20 transition-all font-black text-xs uppercase tracking-[0.2em] p-5 rounded-2xl shadow-sm flex items-center justify-center gap-2 group"
                   title="Logout"
                 >
                   <LogOut className="w-5 h-5 group-hover:-translate-x-1 transition-transform" /> <span>Terminate Session</span>
                 </button>
               </div>
            </div>
          </motion.div>
        )}

        {activeTab === 'overview' && (
          <motion.div 
            key="overview"
            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }}
            className="space-y-6"
          >
            {/* Bento Quick Stats Grid */}
                <div className="grid grid-cols-2 sm:grid-cols-4 md:grid-cols-7 gap-3 md:gap-4">
                  <div className="bg-bg-surface rounded-3xl p-5 border border-border-main shadow-sm flex flex-col justify-center items-center relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-brand-gold/10 opacity-30 group-hover:scale-110 transition-transform duration-500">
                      <Star className="w-20 h-20" />
                    </div>
                    <p className="relative z-10 text-text-secondary text-[10px] font-black uppercase tracking-widest leading-none mb-1">Level</p>
                    <div className="relative z-10 flex items-center gap-1">
                      <span className="text-xl font-black text-text-primary">{currentLevel}</span>
                    </div>
                  </div>

                  <div className="bg-bg-surface rounded-3xl p-5 border border-border-main shadow-sm flex flex-col justify-center items-center relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-brand-gold/10 opacity-30 group-hover:scale-110 transition-transform duration-500">
                      <Crown className="w-20 h-20" />
                    </div>
                    <p className="relative z-10 text-text-secondary text-[10px] font-black uppercase tracking-widest leading-none mb-1">VIP</p>
                    <div className="relative z-10 flex items-center gap-1">
                      <span className="text-xl font-black text-brand-gold">{getVIPLevel(user).level}</span>
                    </div>
                  </div>

                  <div className="bg-bg-surface rounded-3xl p-5 border border-border-main shadow-sm flex flex-col justify-center relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-orange-500/10 opacity-30 group-hover:scale-110 transition-transform duration-500">
                      <Flame className="w-20 h-20" />
                    </div>
                    <p className="relative z-10 text-text-secondary text-[10px] font-black uppercase tracking-widest leading-none mb-1">Streak</p>
                    <div className="relative z-10 flex items-center gap-1">
                      <span className="text-xl font-black text-text-primary">{user.streak || 0}</span>
                      <span className="text-[10px] font-bold text-text-secondary">DAYS</span>
                    </div>
                  </div>
                  <div className="bg-bg-surface rounded-3xl p-5 border border-border-main shadow-sm flex flex-col relative overflow-hidden group border-brand-gold/10">
                    <div className="absolute -right-4 -top-4 text-brand-gold/10 opacity-30 group-hover:scale-110 transition-transform duration-500">
                      <Trophy className="w-20 h-20" />
                    </div>
                    <div className="relative z-10 w-full overflow-hidden">
                      <p className="text-text-secondary text-[10px] font-black uppercase tracking-widest leading-none mb-1">Rank</p>
                      <div className="flex items-end gap-1">
                        <span className="text-xl font-black text-text-primary leading-none">#{user.rank || '---'}</span>
                      </div>
                    </div>
                  </div>

                  <Link to="/assignments?filter=missed" className="bg-rose-500/10 rounded-3xl p-5 border border-rose-500/20 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:bg-rose-500/20 transition-all cursor-pointer">
                    <div className="absolute -right-4 -top-4 text-rose-500/20 opacity-20 group-hover:scale-110 transition-transform duration-500">
                      <AlertCircle className="w-20 h-20" />
                    </div>
                    <p className="relative z-10 text-rose-500 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Missed</p>
                    <p className="relative z-10 text-xl font-black text-rose-500">{missionStats.missed}</p>
                  </Link>

                  <Link to="/assignments?filter=retest" className="bg-amber-500/10 rounded-3xl p-5 border border-amber-500/20 shadow-sm flex flex-col justify-center relative overflow-hidden group hover:bg-amber-500/20 transition-all cursor-pointer">
                    <div className="absolute -right-4 -top-4 text-amber-500/20 opacity-20 group-hover:scale-110 transition-transform duration-500">
                      <Zap className="w-20 h-20" />
                    </div>
                    <p className="relative z-10 text-amber-500 text-[10px] font-black uppercase tracking-widest leading-none mb-1">Retests</p>
                    <p className="relative z-10 text-xl font-black text-amber-500">{missionStats.retest}</p>
                  </Link>

                  <button 
                    onClick={() => setShowBadges(true)}
                    className="text-left bg-bg-surface rounded-3xl p-5 border border-border-main shadow-sm flex flex-col justify-center relative overflow-hidden group hover:border-fuchsia-500/50 hover:shadow-md transition-all cursor-pointer"
                  >
                    <div className="absolute -right-4 -top-4 text-fuchsia-500/10 opacity-30 group-hover:scale-110 transition-transform duration-500">
                      <Award className="w-20 h-20" />
                    </div>
                    <p className="relative z-10 text-text-secondary text-[10px] font-black uppercase tracking-widest leading-none mb-1">Badges</p>
                    <p className="relative z-10 text-xl font-black text-fuchsia-500">{Object.keys(achievementsSummary).length}</p>
                  </button>
                </div>

                {/* Performance and Inventory Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Main Content (Left: 2 cols) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Top Badges */}
                    {(user.badgesClaimed && user.badgesClaimed.length > 0) && (
                      <div className="bg-bg-surface rounded-[2rem] p-8 border border-border-main shadow-sm">
                        <div className="flex items-center justify-between pb-4 mb-2">
                          <h2 className="text-xl font-black text-text-primary flex items-center gap-2"><Award className="w-6 h-6 text-pink-500" /> Recent Badges</h2>
                          <Link to="/badges" className="text-xs font-bold text-text-secondary hover:text-text-primary">View All →</Link>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {user.badgesClaimed.slice(0, 3).map(badgeId => {
                            const badge = BADGES.find(b => b.id === badgeId);
                            if(!badge) return null;
                            return (
                              <div key={badge.id} className="relative p-4 bg-bg-main rounded-[1.5rem] border border-border-main flex flex-col items-center text-center">
                                <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl mb-2 shadow-inner border border-white/10 text-white ${badge.color}`}>
                                  {badge.icon}
                                </div>
                                <h3 className="font-bold text-text-primary text-xs">{badge.name}</h3>
                              </div>
                            )
                          })}
                        </div>
                      </div>
                    )}

                    <div className="bg-bg-surface rounded-[2rem] p-8 border border-border-main shadow-sm">
                      <div className="flex items-center justify-between pb-4 mb-2">
                        <h2 className="text-xl font-black text-text-primary flex items-center gap-2"><TrendingUp className="w-6 h-6 text-brand-gold" /> Performance Analysis</h2>
                        <div className={cn(
                          "px-4 py-1.5 rounded-xl text-bg-main text-xs font-black uppercase tracking-widest shadow-md",
                          getPerformanceBadge(calculatePerformanceScore(user)).color
                        )}>
                          {getPerformanceBadge(calculatePerformanceScore(user)).title}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
                        <div className="p-4 bg-bg-main rounded-[20px] border border-border-main flex flex-col justify-center items-center text-center">
                          <p className="text-[10px] font-black text-text-secondary uppercase tracking-widest mb-1">Coin Power</p>
                          <p className="text-lg font-black text-text-primary">+{user.coins || 0}</p>
                        </div>
                        <div className="p-4 bg-orange-500/10 rounded-[20px] border border-orange-500/20 flex flex-col justify-center items-center text-center">
                          <p className="text-[10px] font-black text-orange-500 uppercase tracking-widest mb-1">Streak Bonus</p>
                          <p className="text-lg font-black text-orange-500">+{ (user.streak || 0) * 50 }</p>
                        </div>
                        <div className="p-4 bg-fuchsia-500/10 rounded-[20px] border border-fuchsia-500/20 flex flex-col justify-center items-center text-center">
                          <p className="text-[10px] font-black text-fuchsia-500 uppercase tracking-widest mb-1">Achievement</p>
                          <p className="text-lg font-black text-fuchsia-500">+{ (user.achievements?.length || 0) * 200 }</p>
                        </div>
                        <div className="p-4 bg-brand-gold/10 rounded-[20px] border border-brand-gold/20 flex flex-col justify-center items-center text-center">
                          <p className="text-[10px] font-black text-brand-gold uppercase tracking-widest mb-1">Stockpile</p>
                          <p className="text-lg font-black text-brand-gold">+{ (user.inventory?.length || 0) * 150 }</p>
                        </div>
                      </div>

                      <div className="mb-4">
                        <div className="flex items-center justify-between mb-2">
                           <span className="text-sm font-bold text-text-primary">Weekly Progress Trend</span>
                           <span className="text-[10px] font-black text-text-secondary uppercase tracking-widest">Growth Analytics</span>
                        </div>
                        <ScoreChart />
                      </div>
                    </div>
                  </div>

                  {/* Sidebar (Right: 1 col) */}
                  <div className="space-y-6">
                    <div className="bg-bg-surface rounded-[2rem] p-8 border border-border-main shadow-sm">
                      <div className="flex items-center justify-between pb-6">
                        <h2 className="text-xl font-black text-text-primary flex items-center gap-2"><Package className="w-6 h-6 text-brand-gold" /> Inventory</h2>
                      </div>
                      
                      {Object.keys(inventorySummary).length > 0 ? (
                        <div className="grid grid-cols-1 gap-3">
                          {Object.entries(inventorySummary).map(([itemId, data]: [string, any]) => {
                            const shopItem = (SHOP_ITEMS as any).find((i: any) => i.id === itemId) || { 
                              name: itemId.replace(/_/g, ' '), 
                              icon: Package, 
                              color: 'from-gray-400 to-gray-500', 
                              type: 'unknown',
                              description: 'Special item',
                              howToUse: 'Used automatically or via special actions.',
                              category: 'passive'
                            };
                            const Icon = shopItem.icon;
                            const isConsumable = shopItem.type === 'consumable';
                            const isManual = shopItem.category === 'active';
                            const showInfo = showInfoId === itemId;
                            
                            // Find if any instance has an expiry
                            const expiringSoon = data.items.find((i: any) => i.expiresAt)?.expiresAt;
                            const timeRemaining = expiringSoon ? Math.ceil((expiringSoon - Date.now()) / (1000 * 60 * 60 * 24)) : null;

                            return (
                              <div key={itemId} className="group relative flex flex-col p-5 bg-bg-main rounded-3xl border border-border-main shadow-sm hover:border-brand-gold/30 transition-all duration-300">
                                <div className="flex flex-col sm:flex-row sm:items-center gap-4">
                                  <div className="flex items-center gap-4 flex-1 min-w-0">
                                    <div className={`w-14 h-14 bg-gradient-to-br ${shopItem.color} text-bg-main rounded-2xl flex items-center justify-center shadow-lg shrink-0 group-hover:scale-105 transition-transform duration-300`}>
                                      <Icon className="w-7 h-7" />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                       <div className="flex items-center gap-2">
                                         <p className="font-black text-text-primary capitalize truncate text-base">{shopItem.name}</p>
                                         <button 
                                           onClick={() => setShowInfoId(showInfo ? null : itemId)}
                                           className={cn("p-1 transition-colors", showInfo ? "text-brand-gold" : "text-text-secondary hover:text-brand-gold")}
                                         >
                                           <Info className="w-3.5 h-3.5" />
                                         </button>
                                       </div>
                                       <div className="flex items-center gap-2 mt-0.5">
                                          <div className="bg-[#1A2B48]/5 text-[#1A2B48] font-black text-[10px] px-2 py-0.5 rounded-lg uppercase tracking-wider border border-[#1A2B48]/10">x{String(data.count)}</div>
                                          {timeRemaining !== null && (
                                            <p className="text-[10px] font-bold text-rose-500 flex items-center gap-1">
                                               <Clock className="w-3 h-3" /> {timeRemaining}d left
                                            </p>
                                          )}
                                          {isConsumable && (
                                             <div className={cn(
                                               "text-[9px] font-black uppercase tracking-widest px-2 py-0.5 rounded-lg",
                                               isManual ? "bg-brand-gold/10 text-brand-gold" : "bg-bg-surface text-text-secondary/60 border border-border-main"
                                             )}>
                                               {isManual ? 'Active' : 'Passive'}
                                             </div>
                                          )}
                                       </div>
                                    </div>
                                  </div>
                                  
                                  <div className="flex items-center gap-2 w-full sm:w-auto mt-2 sm:mt-0">
                                     <button 
                                       onClick={() => setSendingItemId(itemId)}
                                       className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-4 py-3 bg-[#1A2B48]/5 text-[#1A2B48] hover:bg-[#1A2B48] hover:text-white rounded-xl transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest border border-[#1A2B48]/10"
                                       title="Gift to Friend"
                                     >
                                       <Gift className="w-4 h-4" /> <span>Gift</span>
                                     </button>
                                     {isManual && (
                                       <button 
                                         onClick={() => consumeItem(itemId)}
                                         className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-6 py-3 bg-brand-gold text-[#1A2B48] hover:shadow-lg hover:shadow-brand-gold/20 rounded-xl transition-all active:scale-95 text-[10px] font-black uppercase tracking-widest"
                                         title="Use Item"
                                       >
                                         <Zap className="w-4 h-4" /> <span>Use</span>
                                       </button>
                                     )}
                                     {!isManual && isConsumable && (
                                       <div className="flex-1 sm:flex-none bg-bg-surface border border-border-main text-text-secondary/60 px-4 py-3 rounded-xl flex items-center justify-center gap-2 text-[10px] font-black uppercase tracking-widest opacity-60">
                                          <Shield className="w-4 h-4" /> <span>Passive</span>
                                       </div>
                                     )}
                                   </div>
                                </div>

                                 <div className="mt-3 overflow-hidden">
                                     <div className="p-3 bg-bg-main/50 rounded-2xl border border-border-main/50">
                                        <div className="flex gap-2 items-start mt-0.5">
                                           <Info className="w-3.5 h-3.5 text-indigo-400 shrink-0 mt-0.5" />
                                           <div className="flex-1">
                                             <p className="text-[10px] text-text-secondary font-medium leading-relaxed italic">
                                               {shopItem.description}
                                             </p>
                                             <p className="text-[9px] text-text-secondary/80 font-medium mt-1.5 leading-tight">
                                               <span className="font-black text-indigo-400 uppercase mr-1">Activation:</span> {shopItem.howToUse}
                                             </p>
                                           </div>
                                        </div>
                                     </div>
                                 </div>
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="text-center py-10 text-text-secondary/80 bg-bg-main border border-dashed border-border-main rounded-3xl">
                          <Package className="w-10 h-10 mx-auto mb-3 opacity-30 text-brand-gold" />
                          <p className="font-medium text-text-secondary text-sm">Inventory is empty.<br/>Visit the Shop!</p>
                          <Link to="/shop" className="mt-4 inline-block bg-bg-surface border border-border-main text-brand-gold font-bold px-4 py-2 rounded-xl text-sm shadow-sm hover:bg-bg-main transition">Go to Shop</Link>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
          )}
        </AnimatePresence>

      <ShareModal isOpen={showShare} onClose={() => setShowShare(false)} />
      <AnimatePresence>
        {sendingItemId && (
          <SendItemModal 
            itemId={sendingItemId} 
            onClose={() => setSendingItemId(null)} 
          />
        )}
      </AnimatePresence>

      {/* Badges Modal */}
      <AnimatePresence>
        {showBadges && (
          <motion.div 
            key="badges-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-text-primary/60 backdrop-blur-sm z-[100] flex items-center justify-center p-4"
          >
            <motion.div 
              initial={{ scale: 0.95, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.95, opacity: 0 }}
              transition={{ type: "spring", stiffness: 300, damping: 30 }}
              className="bg-bg-surface rounded-3xl shadow-2xl p-6 md:p-8 w-full max-w-2xl relative max-h-[90vh] overflow-y-auto flex flex-col border border-border-main"
            >
              <button 
                onClick={() => setShowBadges(false)}
                className="absolute top-6 right-6 p-2 text-text-secondary hover:text-text-primary bg-bg-main hover:bg-border-main rounded-full transition-colors"
               >
                 <X className="w-5 h-5"/>
              </button>
              
              <div className="text-center mb-8">
                <div className="w-16 h-16 bg-fuchsia-500/10 text-fuchsia-500 rounded-full flex items-center justify-center mx-auto mb-4">
                  <Award className="w-8 h-8" />
                </div>
                <h2 className="text-2xl md:text-3xl font-black text-text-primary tracking-tight">Mastery Badges</h2>
                <p className="text-text-secondary font-medium mt-2">Badges earned from your learning missions.</p>
              </div>

              {Object.keys(achievementsSummary).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 md:gap-6">
                  {Object.entries(achievementsSummary).map(([id, tier]) => {
                    let badgeName = id;
                    let badgeImage = "";
                    let badgeColor = "";
                    if (id === 'wealth') {
                       badgeName = "Tycoon"; 
                       badgeImage = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Money%20Bag.png";
                       badgeColor = "from-amber-100 to-yellow-200 text-brand-gold";
                    }
                    else if (id === 'scholar') {
                       badgeName = "Scholar";
                       badgeImage = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Graduation%20Cap.png";
                       badgeColor = "from-blue-100 to-indigo-200 text-indigo-700";
                    }
                    else if (id === 'perfectionist') {
                       badgeName = "Flawless";
                       badgeImage = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Gem%20Stone.png";
                       badgeColor = "from-emerald-100 to-teal-200 text-teal-700";
                    }
                    else if (id === 'socialite') {
                       badgeName = "Generous";
                       badgeImage = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Heart%20with%20Ribbon.png";
                       badgeColor = "from-rose-100 to-pink-200 text-pink-700";
                    } else {
                       badgeImage = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Trophy.png";
                       badgeColor = "from-gray-100 to-gray-200 text-text-secondary";
                    }

                    return (
                      <div key={id} className="flex flex-col items-center p-6 bg-bg-main rounded-3xl border border-border-main hover:shadow-xl hover:-translate-y-1 transition duration-300 text-center group relative overflow-hidden">
                        <div className={`w-20 h-20 bg-gradient-to-br ${badgeColor} rounded-[2rem] flex items-center justify-center font-black mb-4 shadow-inner border border-white/50 relative z-10 transition-transform group-hover:scale-110 duration-500`}>
                          <img src={badgeImage} alt={badgeName} className="w-12 h-12 drop-shadow-md" />
                        </div>
                        <span className="font-black text-text-primary text-sm md:text-base mb-1.5">{badgeName}</span>
                        <div className="absolute top-0 right-0 p-3 opacity-10 blur-sm group-hover:opacity-30 transition-opacity">
                           <img src={badgeImage} alt="" className="w-24 h-24" />
                        </div>
                        <span className="bg-bg-surface text-text-primary font-black text-[10px] md:text-xs uppercase tracking-widest px-4 py-1.5 rounded-xl w-fit inline-block border border-border-main shadow-sm relative z-10">Tier {String(tier)}</span>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-12 text-text-secondary bg-bg-main border border-dashed border-border-main rounded-3xl">
                  <Award className="w-12 h-12 mx-auto mb-4 opacity-30 text-brand-gold" />
                  <p className="font-medium text-text-primary text-lg">No badges earned yet.</p>
                  <p className="text-sm text-text-secondary mt-1">Complete missions to start leveling up!</p>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-8 mb-4 flex flex-col items-center justify-center gap-1 text-sm font-semibold text-text-secondary pb-20 md:pb-0">
        <div>Lumora v2.0.3 • Quality Improvements</div>
        <a 
          href="https://www.samjuniors.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-2 mt-3 px-4 py-2 bg-brand-gold/10 hover:bg-brand-gold/20 border justify-center border-brand-gold/30 rounded-full transition-all text-brand-gold shadow-[0_0_10px_rgba(212,175,55,0.15)] hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] group"
        >
          <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Waving%20Hand.png" alt="Welcome" className="w-5 h-5 drop-shadow-md group-hover:rotate-12 transition-transform" />
          <span className="font-black uppercase tracking-widest text-[9px]">Powered by Samjuniors • Visit Us</span>
        </a>
      </div>
      <AnimatePresence>
        {showRules && <RulesModal key="rules-modal" onClose={() => setShowRules(false)} />}
      </AnimatePresence>
    </div>
  );
};
