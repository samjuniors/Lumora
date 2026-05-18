import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { motion, AnimatePresence } from 'motion/react';
import { 
  User as UserIcon, Mail, Shield, ShieldAlert, Coins, Award, Edit2, Check, X, 
  Package, Palette, Target, TrendingUp, Flame, Settings, Zap, Star, Crown, 
  Copy, Upload, LogOut, Clock, BookOpen, ChevronRight, AlertCircle, Share2, Info, Gift,
  Users, UserPlus, Heart, Search, Trophy
} from 'lucide-react';
import { storageService, userService, assignmentService } from '../services/dbProvider';
import { toast } from 'react-hot-toast';
import { SHOP_ITEMS } from './Shop';
import { cn, getUserLevelAndXP, getShortId, getVIPLevel } from '../lib/utils';
import { calculatePerformanceScore, getPerformanceBadge } from '../lib/performance';
import { ScoreChart } from '../components/ScoreChart';
import { Card, Button } from '../components/CommonUI';
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
            const allUsers = await userService.getUsers();
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
                const enrs = await assignmentService.getEnrollmentsByStudent(user.id);
                
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
      await userService.updateUser(user.id, updateData);
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
      await userService.updateUser(user.id, { avatar, updatedAt: Date.now() });
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

      await userService.updateUser(user.id, updateData);
    } catch (e) {
      toast.error('Use failed');
    }
  };

  const { currentLevel, xpCurrent, xpMax, xpProgress, achievementsSummary } = getUserLevelAndXP(user);

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>, isAvatar: boolean) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    const isValid = storageService.validateFile(file, {
      maxSize: 5 * 1024 * 1024,
      allowedTypes: ['image/*']
    });

    if (!isValid) return;

    if (isAvatar) setUploadingAvatar(true);
    else setUploadingBanner(true);

    try {
      const path = `users/${user.id}/${isAvatar ? 'avatar' : 'banner'}_${Date.now()}`;
      const url = await storageService.uploadFile(file, path);
      
      if (isAvatar) setEditAvatar(url);
      else setEditBanner(url);
      
      toast.success(`${isAvatar ? 'Avatar' : 'Banner'} uploaded!`);
    } catch (err) {
      toast.error('Failed to upload image');
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
      <div className="bg-bg-surface rounded-[2.5rem] shadow-premium border border-white/5 overflow-hidden relative">
        <div className={cn(
          "h-48 md:h-64 w-full relative transition-colors duration-500 bg-cover bg-center group/banner",
          (!currentBanner || (!currentBanner.startsWith('http') && !currentBanner.startsWith('data:image') && !currentBanner.startsWith('#') && !currentBanner.startsWith('hsl') && !currentBanner.startsWith('rgb') && !currentBanner.includes('-'))) && "bg-black/40",
          (currentBanner && currentBanner.includes('-') && !currentBanner.startsWith('http')) ? currentBanner : ""
        )}
        style={{ 
          backgroundImage: (currentBanner?.startsWith('http') || currentBanner?.startsWith('data:image')) ? `url(${currentBanner})` : (!currentBanner ? 'url(https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?q=80&w=2564&auto=format&fit=crop)' : 'none'),
          backgroundColor: (currentBanner && (currentBanner.startsWith('#') || currentBanner.startsWith('rgb') || currentBanner.startsWith('hsl'))) ? currentBanner : 'transparent'
        }}>
          <div className="absolute inset-0 bg-gradient-to-t from-bg-surface via-bg-surface/20 to-transparent"></div>
          
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
                 <span className="font-black text-[10px] tracking-[0.3em] uppercase py-2 px-4 rounded-xl bg-black/40 backdrop-blur border border-white/20">Authorize Banner Change</span>
              </div>
            </div>
          )}

          {!isEditing ? (
            <button 
              onClick={logOut}
              className="absolute top-6 right-6 md:top-8 md:right-8 bg-black/20 hover:bg-rose-500 text-white border border-white/10 p-3 rounded-2xl transition-all shadow-2xl z-20 group backdrop-blur-md"
              title="Terminate Session"
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
                className="bg-black/40 hover:bg-black/60 backdrop-blur-md border border-white/10 text-white px-5 py-2.5 rounded-[1.25rem] font-black text-[10px] uppercase tracking-widest transition-all shadow-2xl flex items-center gap-2"
              >
                <X className="w-4 h-4" /> Cancel
              </button>
              <Button 
                onClick={handleSaveProfile}
                disabled={saving}
                variant="gold"
                size="md"
                className="px-8 shadow-2xl shadow-brand-gold/20"
              >
                {saving ? (
                  <><span className="animate-pulse flex items-center gap-2">Transmitting...</span></>
                ) : (
                  <><Check className="w-4 h-4" /> Finalize Profile</>
                )}
              </Button>
            </div>
          )}
        </div>

        <div className="px-6 md:px-10 pb-8 pt-6 relative z-10">
          <div className="flex flex-col md:flex-row md:items-end justify-between gap-6 mb-4 mt-[-60px] md:mt-[-80px]">
            <div className="flex flex-col md:flex-row md:items-end gap-5 md:gap-8">
              <div 
                className={cn(
                  "w-28 h-28 md:w-40 md:h-40 rounded-[2.5rem] flex items-center justify-center bg-bg-surface border-[6px] border-bg-surface shadow-2xl text-6xl relative z-20 shrink-0 overflow-hidden group/avatar transition-all",
                  "ring-1 ring-white/10",
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
                     <span className="text-[10px] font-black uppercase tracking-widest text-center px-2">{uploadingAvatar ? 'Uploading...' : 'Authorize Change'}</span>
                  </div>
                )}
              </div>
              
              <div className="pb-2">
                <div className="flex items-center gap-4 flex-wrap">
                  {isEditing ? (
                    <input 
                      type="text" 
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      className="text-3xl md:text-5xl font-black text-text-primary bg-black/20 border-2 border-brand-gold rounded-2xl px-6 py-2 focus:outline-none w-full max-w-[280px] sm:max-w-xs transition-shadow shadow-[0_0_40px_rgba(251,191,36,0.1)] tracking-tighter"
                      placeholder="Ident Name"
                      onClick={(e) => e.stopPropagation()}
                      autoFocus
                    />
                  ) : (
                    <div className="flex flex-col">
                      <div className="flex items-center gap-4">
                        <h1 className="text-4xl md:text-6xl font-black text-text-primary tracking-tighter group hover:text-brand-gold transition-colors cursor-default select-none">{currentName}</h1>
                        <PresenceDot status={user.presence} showLabel className="hidden md:flex ml-2" />
                      </div>
                      <div className="flex items-center gap-3 mt-2">
                        <span className="text-[10px] font-mono font-black text-brand-gold bg-brand-gold/10 px-3 py-1 rounded-xl border border-brand-gold/20 shadow-inner">
                          #{user.luminaId || getShortId(user.id)}
                        </span>
                        <PresenceDot status={user.presence} className="md:hidden" />
                      </div>
                    </div>
                  )}
                  {user.inventory?.includes('badge_scholar') && !isEditing && (
                    <div className="bg-gradient-to-br from-brand-gold to-amber-600 p-2 rounded-2xl shadow-xl shadow-brand-gold/20 animate-pulse p-2" title="Academic Excellence Badge">
                      <Award className="w-6 h-6 text-bg-main" />
                    </div>
                  )}
                  {!isEditing && (
                    <span className={cn(
                      "text-[10px] font-black tracking-[0.2em] uppercase px-4 py-2 rounded-2xl shadow-premium flex items-center justify-center -mt-1 border border-white/5",
                      getPerformanceBadge(calculatePerformanceScore(user)).color,
                      getPerformanceBadge(calculatePerformanceScore(user)).shadow,
                      (calculatePerformanceScore(user) >= 2000 && calculatePerformanceScore(user) < 5000) ? "text-[#0A1128]" : "text-white"
                    )}>
                      {getPerformanceBadge(calculatePerformanceScore(user)).title}
                    </span>
                  )}
                  {!isEditing && (
                    <button onClick={() => setIsEditing(true)} className="p-3 text-text-muted hover:text-brand-gold hover:bg-white/5 rounded-2xl transition-all border border-white/5 shadow-premium bg-bg-surface">
                      <Edit2 className="w-5 h-5" />
                    </button>
                  )}
                </div>
                <div className="flex flex-wrap items-center gap-4 md:gap-8 text-text-secondary font-medium text-[11px] md:text-sm mt-6">
                  <div className="flex items-center gap-6 bg-white/[0.02] border border-white/5 px-6 py-3 rounded-[1.5rem] shadow-inner">
                    <button onClick={() => setActiveTab('social')} className="hover:text-brand-gold transition-colors flex flex-col items-start group">
                      <span className="font-black text-text-primary text-xl leading-none tracking-tight group-hover:scale-110 transition-transform origin-left">{(user.followerIds || []).length}</span> 
                      <span className="uppercase tracking-[0.2em] text-[8px] font-black opacity-40 mt-1">Followers</span>
                    </button>
                    <div className="w-px h-8 bg-white/5 shadow-inner" />
                    <button onClick={() => setActiveTab('social')} className="hover:text-brand-gold transition-colors flex flex-col items-start group">
                      <span className="font-black text-text-primary text-xl leading-none tracking-tight group-hover:scale-110 transition-transform origin-left">{(user.followingIds || []).length}</span> 
                      <span className="uppercase tracking-[0.2em] text-[8px] font-black opacity-40 mt-1">Following</span>
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-3 w-full lg:w-auto">
                    <span className="flex items-center gap-3 uppercase tracking-[0.2em] text-[10px] font-black text-text-muted bg-white/[0.01] border border-white/5 px-4 py-3 rounded-[1.25rem] shadow-sm">
                      <span className="opacity-40 tracking-widest">ID-PTR:</span>
                      <span className="text-text-primary font-mono tabular-nums">{user.luminaId || getShortId(user.id)}</span>
                      <button onClick={() => copyToClipboard(user.luminaId || user.id)} className="ml-1 text-brand-gold hover:scale-110 transition-transform shrink-0"><Copy className="w-3.5 h-3.5" /></button>
                    </span>
                    
                    <span className="flex items-center gap-3 uppercase tracking-[0.2em] text-[10px] font-black text-brand-gold bg-brand-gold/5 border border-brand-gold/20 px-4 py-3 rounded-[1.25rem] shadow-inner">
                      <Coins className="w-4 h-4" /> 
                      {user.coins.toLocaleString()}
                    </span>

                    {user.xpBoosterUntil && user.xpBoosterUntil > Date.now() && (
                      <span className="flex items-center gap-2 uppercase tracking-[0.2em] text-[10px] font-black text-cyan-400 bg-cyan-400/5 border border-cyan-400/20 px-4 py-3 rounded-[1.25rem]">
                        <Zap className="w-4 h-4" /> 1.5x Multiplier
                      </span>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="mt-6">
                    <p className="text-[10px] uppercase font-black text-text-muted tracking-[0.3em] mb-2 mx-1 opacity-60">Neural Identifier Bio</p>
                    <textarea 
                      value={editBio}
                      onChange={(e) => setEditBio(e.target.value)}
                      placeholder="Define your operational objectives..."
                      className="w-full max-w-lg bg-black/20 border-2 border-white/5 rounded-3xl px-6 py-4 text-sm font-medium focus:border-brand-gold/40 outline-none transition-all resize-none shadow-inner"
                      rows={2}
                    />
                  </div>
                ) : currentBio && (
                  <p className="mt-6 text-sm text-text-muted font-medium italic border-l-2 border-brand-gold pl-6 py-2 max-w-lg leading-relaxed opacity-80">
                    "{currentBio}"
                  </p>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 self-start md:self-end pt-6 md:pt-0 pb-2 w-full lg:w-auto">
              <button 
                onClick={() => setShowShare(true)}
                className="bg-white/5 hover:bg-white/10 text-text-primary transition-all font-black text-[10px] uppercase tracking-[0.3em] px-6 py-4 rounded-[1.5rem] shadow-premium flex items-center justify-center gap-2 border border-white/5 active:scale-95"
              >
                <Share2 className="w-4 h-4" /> <span>Share</span>
              </button>
              {user.role === 'student' && (
                <Link to={`/scorecard/${user.id}`} className="bg-white/[0.01] hover:bg-brand-gold/5 text-text-primary border border-brand-gold/10 transition-all font-black text-[10px] uppercase tracking-[0.3em] px-6 py-4 rounded-[1.5rem] shadow-premium flex items-center justify-center gap-2 active:scale-95 text-center">
                  <Target className="w-4 h-4 text-brand-gold" /> <span>Archive</span>
                </Link>
              )}
              <button 
                onClick={() => setActiveTab('social')}
                className={cn(
                  "transition-all font-black text-[10px] uppercase tracking-[0.3em] px-6 py-4 rounded-[1.5rem] shadow-premium flex items-center justify-center gap-2 active:scale-95", 
                  activeTab === 'social' ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/30 shadow-2xl shadow-brand-gold/10' : 'bg-white/5 text-text-primary border border-white/5 hover:bg-white/10'
                )}
              >
                <Users className="w-4 h-4" /> <span>Network</span>
              </button>
              <button 
                onClick={() => setActiveTab('settings')}
                className={cn(
                  "transition-all font-black text-[10px] uppercase tracking-[0.3em] px-6 py-4 rounded-[1.5rem] shadow-premium flex items-center justify-center gap-2 active:scale-95", 
                  activeTab === 'settings' ? 'bg-brand-gold/10 text-brand-gold border border-brand-gold/30 shadow-2xl shadow-brand-gold/10' : 'bg-white/5 text-text-primary border border-white/5 hover:bg-white/10'
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
              <div className="bg-bg-surface rounded-[2.5rem] border border-white/5 shadow-premium p-8 md:p-10 flex flex-col">
                <h3 className="font-black text-text-primary text-xl md:text-2xl mb-8 flex items-center justify-between">
                  <span className="flex items-center gap-4"><Users className="w-6 h-6 text-brand-gold" /> Subscribed Links</span>
                  <span className="text-[10px] font-black bg-brand-gold/10 text-brand-gold px-4 py-1.5 rounded-full uppercase tracking-[0.2em] border border-brand-gold/20">{(user.followingIds || []).length}</span>
                </h3>

                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar flex-1">
                  {loadingSocial ? (
                    <div className="space-y-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-20 w-full animate-pulse bg-white/[0.02] rounded-3xl" />
                      ))}
                    </div>
                  ) : following.length > 0 ? (
                    following.map(f => (
                      <Link to={`/leaderboard?search=${f.name}`} key={f.id} className="flex items-center gap-4 p-4 bg-white/[0.01] rounded-3xl border border-white/5 hover:border-brand-gold/30 hover:bg-white/[0.03] transition-all group">
                        <div className="w-14 h-14 rounded-2xl bg-bg-surface border border-white/5 flex items-center justify-center text-2xl overflow-hidden shrink-0 group-hover:scale-105 transition-transform shadow-inner">
                          {(f.avatar?.startsWith('http') || f.avatar?.startsWith('data:')) ? (
                            <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{f.avatar || '👤'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-black text-base text-text-primary truncate tracking-tight">{f.name}</p>
                          <p className="text-[10px] font-mono font-black text-text-muted uppercase tracking-widest truncate opacity-60">ID://{f.luminaId || getShortId(f.id)}</p>
                        </div>
                        <ChevronRight className="w-5 h-5 text-text-muted group-hover:text-brand-gold group-hover:translate-x-1 transition-all" />
                      </Link>
                    ))
                  ) : (
                    <div className="text-center py-16 bg-white/[0.01] rounded-[2.5rem] border border-dashed border-white/10">
                      <Search className="w-12 h-12 mx-auto mb-4 opacity-20 text-text-muted" />
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-60">Zero Active Links Identified</p>
                      <Link to="/leaderboard" className="mt-8 inline-block text-[10px] font-black uppercase tracking-[0.3em] text-brand-gold hover:underline bg-brand-gold/10 px-6 py-3 rounded-2xl border border-brand-gold/20 shadow-lg shadow-brand-gold/5">Recruit Operatives</Link>
                    </div>
                  )}
                </div>
              </div>

              <div className="bg-bg-surface rounded-[2.5rem] border border-white/5 shadow-premium p-8 md:p-10 flex flex-col">
                <h3 className="font-black text-text-primary text-xl md:text-2xl mb-8 flex items-center justify-between">
                  <span className="flex items-center gap-4"><Heart className="w-6 h-6 text-rose-500" /> Incoming Signals</span>
                  <span className="text-[10px] font-black bg-rose-500 text-white px-4 py-1.5 rounded-full uppercase tracking-[0.2em] shadow-lg shadow-rose-500/20">{(user.followerIds || []).length}</span>
                </h3>
                <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 no-scrollbar flex-1">
                  {loadingSocial ? (
                    <div className="space-y-4">
                      {[1,2,3].map(i => (
                        <div key={i} className="h-20 w-full animate-pulse bg-white/[0.02] rounded-3xl" />
                      ))}
                    </div>
                  ) : followers.length > 0 ? (
                    followers.map(f => (
                      <div key={f.id} className="flex items-center gap-4 p-4 bg-white/[0.01] rounded-3xl border border-white/5 transition-all">
                        <div className="w-14 h-14 rounded-2xl bg-bg-surface border border-white/5 flex items-center justify-center text-2xl overflow-hidden shrink-0 shadow-inner">
                          {(f.avatar?.startsWith('http') || f.avatar?.startsWith('data:')) ? (
                            <img src={f.avatar} alt={f.name} className="w-full h-full object-cover" />
                          ) : (
                            <span>{f.avatar || '👤'}</span>
                          )}
                        </div>
                        <div className="flex-1 min-w-0 text-left">
                          <p className="font-black text-base text-text-primary truncate tracking-tight">{f.name}</p>
                          <p className="text-[10px] font-mono font-black text-text-muted uppercase tracking-widest truncate opacity-60">ID://{f.luminaId || getShortId(f.id)}</p>
                        </div>
                        <div className="flex gap-2">
                           {user.followingIds?.includes(f.id) ? (
                             <span className="text-[9px] font-black uppercase text-brand-gold tracking-[0.2em] bg-brand-gold/10 px-3 py-2 rounded-xl border border-brand-gold/20">Elite Link</span>
                           ) : (
                             <button 
                               onClick={() => {
                                 userService.followUser(user.id, f.id);
                                 toast.success(`Linked with ${f.name}`);
                               }} 
                               className="text-[9px] font-black uppercase text-bg-main tracking-[0.2em] bg-brand-gold px-4 py-2 rounded-xl hover:scale-105 transition-all shadow-xl shadow-brand-gold/20"
                             >
                               Authorize
                             </button>
                           )}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="text-center py-16 bg-white/[0.01] rounded-[2.5rem] border border-dashed border-white/10">
                      <Heart className="w-12 h-12 mx-auto mb-4 opacity-20 text-rose-500" />
                      <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] opacity-60">No External Signals Detected</p>
                      <p className="text-[9px] font-black text-text-muted/40 mt-2 tracking-widest uppercase italic">Operational dominance required for visibility.</p>
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
            <div className="bg-bg-surface rounded-[2.5rem] border border-white/5 shadow-premium p-8 md:p-10 h-fit">
               <div className="flex items-center justify-between gap-4 mb-8">
                 <h3 className="font-black text-text-primary text-xl md:text-2xl flex items-center gap-4">
                   <Palette className="w-6 h-6 text-brand-gold"/> Aesthetics
                 </h3>
               </div>
               
               <div className="space-y-10">
                 <div>
                   <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.3em] mb-6 opacity-60">Neural Identifier Template</p>
                   <div className="grid grid-cols-5 sm:grid-cols-6 md:grid-cols-5 lg:grid-cols-6 gap-4 max-h-80 overflow-y-auto p-2 -m-2 no-scrollbar">
                     {AVATARS.map(avatar => (
                       <button 
                         key={avatar} 
                         onClick={() => handleSaveAvatar(avatar)}
                         className={cn(
                           "text-2xl aspect-square flex items-center justify-center rounded-[1.25rem] transition-all relative group shadow-sm", 
                           user.avatar === avatar 
                             ? "bg-brand-gold/10 border-2 border-brand-gold shadow-[0_0_40px_rgba(251,191,36,0.15)] scale-110 z-10" 
                             : "bg-white/[0.02] border border-white/5 hover:bg-white/[0.05] hover:scale-105"
                         )}
                       >
                         {avatar}
                       </button>
                     ))}
                   </div>
                 </div>
               </div>
            </div>

            {/* Column 2: Account & System */}
            <div className="bg-bg-surface rounded-[2.5rem] border border-white/5 shadow-premium p-8 md:p-10 space-y-10 h-fit">
               {/* Account Section */}
               <div className="space-y-8">
                  <h3 className="font-black text-text-primary text-xl md:text-2xl flex items-center gap-4">
                    <UserIcon className="w-6 h-6 text-brand-gold"/> Neural-Link
                  </h3>
                  <div className="space-y-4">
                     <div className="bg-white/[0.01] p-6 rounded-3xl flex flex-col sm:flex-row sm:items-center justify-between gap-6 border border-white/5 shadow-inner">
                        <div>
                           <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 opacity-50">Operational Title</p>
                           <p className="font-black text-text-primary text-lg tracking-tight tabular-nums">{user.name}</p>
                        </div>
                        <button onClick={() => {
                           setActiveTab('overview');
                           setIsEditing(true);
                           setEditName(user.name || '');
                           setEditAvatar(user.avatar || '');
                           setEditBanner(user.bannerColor || '');
                        }} className="text-brand-gold hover:text-bg-main bg-brand-gold/5 hover:bg-brand-gold px-6 py-3 rounded-2xl font-black text-[10px] uppercase tracking-[0.2em] transition-all border border-brand-gold/20 shadow-lg shadow-brand-gold/5 text-center">
                           Modify Ident
                        </button>
                     </div>
                     <div className="bg-white/[0.01] p-6 rounded-3xl flex flex-col gap-2 border border-white/5 shadow-inner">
                        <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-50">Signal Frequency (Email)</p>
                        <div className="flex items-center gap-3">
                           <p className="font-black text-text-primary truncate tracking-tight">{user.email}</p>
                           <span className="text-[9px] font-black bg-emerald-500/10 text-emerald-500 border border-emerald-500/20 uppercase px-3 py-1 rounded-full tracking-widest shrink-0">AUTHORIZED</span>
                        </div>
                     </div>
                  </div>
               </div>

               {/* System Section */}
               <div className="pt-8 border-t border-white/5">
                 <h3 className="font-black text-text-primary text-xl md:text-2xl flex items-center gap-4 mb-8">
                   <Settings className="w-6 h-6 text-brand-gold"/> System Ops
                 </h3>
                 <div className="space-y-4">
                   <div className="flex items-center justify-between p-6 bg-white/[0.01] rounded-[2rem] border border-white/5 shadow-inner">
                     <div className="pr-6">
                       <p className="font-black text-text-primary text-sm font-black uppercase tracking-[0.1em]">Public Presence</p>
                       <p className="text-[11px] text-text-muted font-medium mt-1 leading-relaxed italic opacity-60 tracking-tight">Appear in the global domination rankings</p>
                     </div>
                     <div className="w-14 h-7 bg-brand-gold rounded-full relative cursor-pointer shadow-[inset_0_2px_4px_rgba(0,0,0,0.2)] shrink-0 transition-colors" aria-label="Toggle setting" onClick={() => toast("Privacy focus: Forced public for current epoch", { icon: '🔒' })}>
                       <div className="w-5 h-5 bg-white rounded-full absolute top-1 right-1 shadow-lg shadow-black/20"></div>
                     </div>
                   </div>
                   <div className="flex items-center justify-between p-6 bg-white/[0.01] rounded-[2rem] border border-white/5 shadow-inner">
                     <div className="pr-6">
                       <p className="font-black text-text-primary text-sm font-black uppercase tracking-[0.1em]">Neural Alerts</p>
                       <p className="text-[11px] text-text-muted font-medium mt-1 leading-relaxed italic opacity-60 tracking-tight">Real-time status synchronisation</p>
                     </div>
                     <div className="w-14 h-7 bg-white/[0.05] border border-white/10 rounded-full relative cursor-pointer shadow-inner shrink-0" aria-label="Toggle setting" onClick={() => toast("Notifications under maintenance", { icon: '🔔' })}>
                       <div className="w-5 h-5 bg-text-muted/40 rounded-full absolute top-1 left-1 shadow-sm"></div>
                     </div>
                   </div>
                   <div 
                     onClick={() => setShowRules(true)}
                     className="flex items-center justify-between p-6 bg-brand-gold/5 hover:bg-brand-gold/10 group rounded-[2rem] border border-brand-gold/30 cursor-pointer transition-all active:scale-[0.98] shadow-2xl shadow-brand-gold/5"
                   >
                     <div className="flex items-center gap-5">
                       <div className="w-12 h-12 bg-white/5 text-brand-gold rounded-2xl flex items-center justify-center border border-white/10 group-hover:scale-110 transition-transform">
                          <BookOpen className="w-6 h-6" />
                       </div>
                       <div>
                         <p className="font-black text-brand-gold text-base uppercase tracking-[0.1em]">Platform Codex</p>
                         <p className="text-[10px] text-brand-gold/60 mt-1 font-black uppercase tracking-widest italic opacity-80">Regulations & Economy</p>
                       </div>
                     </div>
                     <ChevronRight className="w-6 h-6 text-brand-gold group-hover:translate-x-1 transition-transform" />
                   </div>
                 </div>
                 <button 
                   onClick={logOut}
                   className="w-full mt-8 bg-rose-500/5 hover:bg-rose-500 text-rose-500 hover:text-white border border-rose-500/20 transition-all font-black text-[10px] uppercase tracking-[0.3em] p-6 rounded-3xl shadow-premium flex items-center justify-center gap-3 group"
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
                  <div className="bg-bg-surface rounded-3xl p-6 border border-white/5 shadow-premium flex flex-col justify-center items-center relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-brand-gold/5 opacity-40 group-hover:scale-110 transition-transform duration-700">
                      <Star className="w-20 h-20" />
                    </div>
                    <p className="relative z-10 text-text-muted text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1.5 opacity-60">Status LVL</p>
                    <div className="relative z-10 flex items-center gap-1">
                      <span className="text-2xl font-black text-text-primary tracking-tighter tabular-nums">{currentLevel}</span>
                    </div>
                  </div>

                  <div className="bg-bg-surface rounded-3xl p-6 border border-white/5 shadow-premium flex flex-col justify-center items-center relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-brand-gold/5 opacity-40 group-hover:scale-110 transition-transform duration-700">
                      <Crown className="w-20 h-20" />
                    </div>
                    <p className="relative z-10 text-text-muted text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1.5 opacity-60">VIP Tier</p>
                    <div className="relative z-10 flex items-center gap-1">
                      <span className="text-2xl font-black text-brand-gold tracking-tighter">{getVIPLevel(user).level}</span>
                    </div>
                  </div>

                  <div className="bg-bg-surface rounded-3xl p-6 border border-white/5 shadow-premium flex flex-col justify-center items-center relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-orange-500/5 opacity-40 group-hover:scale-110 transition-transform duration-700">
                      <Flame className="w-20 h-20" />
                    </div>
                    <p className="relative z-10 text-text-muted text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1.5 opacity-60">Burn Duration</p>
                    <div className="relative z-10 flex items-center justify-center gap-1.5">
                      <span className="text-2xl font-black text-text-primary tracking-tighter tabular-nums">{user.streak || 0}</span>
                      <span className="text-[8px] font-black text-text-muted opacity-40 tracking-widest mt-1 uppercase">Cycles</span>
                    </div>
                  </div>

                  <div className="bg-bg-surface rounded-3xl p-6 border border-white/5 shadow-premium flex flex-col justify-center items-center relative overflow-hidden group">
                    <div className="absolute -right-4 -top-4 text-brand-gold/5 opacity-40 group-hover:scale-110 transition-transform duration-700">
                      <Trophy className="w-20 h-20" />
                    </div>
                    <p className="relative z-10 text-text-muted text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1.5 opacity-60">Global Rank</p>
                    <div className="relative z-10 flex items-center gap-1">
                      <span className="text-2xl font-black text-text-primary tracking-tighter tabular-nums">#{user.rank || '---'}</span>
                    </div>
                  </div>

                  <Link to="/assignments?filter=missed" className="bg-rose-500/5 rounded-3xl p-6 border border-rose-500/20 shadow-premium flex flex-col justify-center items-center relative overflow-hidden group hover:bg-rose-500/10 transition-all cursor-pointer">
                    <div className="absolute -right-4 -top-4 text-rose-500/10 opacity-30 group-hover:scale-110 transition-transform duration-700">
                      <AlertCircle className="w-20 h-20" />
                    </div>
                    <p className="relative z-10 text-rose-500 text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1.5">Terminated</p>
                    <p className="relative z-10 text-2xl font-black text-rose-500 tabular-nums">{missionStats.missed}</p>
                  </Link>

                  <Link to="/assignments?filter=retest" className="bg-amber-500/5 rounded-3xl p-6 border border-amber-500/20 shadow-premium flex flex-col justify-center items-center relative overflow-hidden group hover:bg-amber-500/10 transition-all cursor-pointer">
                    <div className="absolute -right-4 -top-4 text-amber-500/10 opacity-30 group-hover:scale-110 transition-transform duration-700">
                      <Zap className="w-20 h-20" />
                    </div>
                    <p className="relative z-10 text-amber-500 text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1.5">Pending Re-Val</p>
                    <p className="relative z-10 text-2xl font-black text-amber-500 tabular-nums">{missionStats.retest}</p>
                  </Link>

                  <button 
                    onClick={() => setShowBadges(true)}
                    className="bg-white/[0.01] rounded-3xl p-6 border border-white/5 shadow-premium flex flex-col justify-center items-center relative overflow-hidden group hover:border-brand-gold/30 hover:bg-white/[0.03] transition-all cursor-pointer"
                  >
                    <div className="absolute -right-4 -top-4 text-brand-gold/5 opacity-40 group-hover:scale-110 transition-transform duration-700">
                      <Award className="w-20 h-20" />
                    </div>
                    <p className="relative z-10 text-text-muted text-[9px] font-black uppercase tracking-[0.2em] leading-none mb-1.5 opacity-60">Accolades</p>
                    <p className="relative z-10 text-2xl font-black text-brand-gold tabular-nums">{Object.keys(achievementsSummary).length}</p>
                  </button>
                </div>

                {/* Performance and Inventory Columns */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                  
                  {/* Main Content (Left: 2 cols) */}
                  <div className="lg:col-span-2 space-y-6">
                    {/* Top Badges */}
                    {(user.badgesClaimed && user.badgesClaimed.length > 0) && (
                      <Card className="p-8 md:p-10">
                        <div className="flex items-center justify-between mb-8">
                          <h2 className="text-xl md:text-2xl font-black text-text-primary flex items-center gap-4"><Award className="w-7 h-7 text-brand-gold" /> Distinguished Merits</h2>
                          <Link to="/badges" className="text-[10px] font-black text-brand-gold hover:underline uppercase tracking-widest">Global Archives →</Link>
                        </div>
                        <div className="grid grid-cols-3 gap-4">
                          {user.badgesClaimed.slice(0, 3).map(badgeId => {
                            const badge = BADGES.find(b => b.id === badgeId);
                            if(!badge) return null;
                            return (
                              <div key={badge.id} className="relative p-6 bg-white/[0.01] rounded-[2rem] border border-white/5 flex flex-col items-center text-center group hover:bg-white/[0.03] transition-all hover:scale-105">
                                <div className={`w-16 h-16 rounded-2xl flex items-center justify-center text-3xl mb-4 shadow-2xl border border-white/10 ${badge.color} text-white`}>
                                  {badge.icon}
                                </div>
                                <h3 className="font-black text-text-primary text-xs uppercase tracking-tight opacity-80">{badge.name}</h3>
                              </div>
                            )
                          })}
                        </div>
                      </Card>
                    )}

                    <Card className="p-8 md:p-10">
                      <div className="flex items-center justify-between mb-10">
                        <h2 className="text-xl md:text-2xl font-black text-text-primary flex items-center gap-4"><TrendingUp className="w-7 h-7 text-brand-gold" /> Performance Synthesis</h2>
                        <div className={cn(
                          "px-5 py-2 rounded-2xl text-bg-main text-[10px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all hover:scale-105",
                          getPerformanceBadge(calculatePerformanceScore(user)).color
                        )}>
                          {getPerformanceBadge(calculatePerformanceScore(user)).title}
                        </div>
                      </div>
                      
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-10">
                        <div className="p-6 bg-white/[0.01] rounded-3xl border border-white/5 flex flex-col justify-center items-center text-center shadow-inner">
                          <p className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] mb-2 opacity-50">Liquidity</p>
                          <p className="text-xl font-black text-text-primary tabular-nums tracking-tighter">+{user.coins || 0}</p>
                        </div>
                        <div className="p-6 bg-orange-500/5 rounded-3xl border border-orange-500/10 flex flex-col justify-center items-center text-center shadow-inner">
                          <p className="text-[10px] font-black text-orange-500 uppercase tracking-[0.2em] mb-2 opacity-60">Neural Burn</p>
                          <p className="text-xl font-black text-orange-500 tabular-nums tracking-tighter">+{ (user.streak || 0) * 50 }</p>
                        </div>
                        <div className="p-6 bg-brand-gold/5 rounded-3xl border border-brand-gold/10 flex flex-col justify-center items-center text-center shadow-inner">
                          <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] mb-2 opacity-60">Merit Points</p>
                          <p className="text-xl font-black text-brand-gold tabular-nums tracking-tighter">+{ (user.achievements?.length || 0) * 200 }</p>
                        </div>
                        <div className="p-6 bg-cyan-500/5 rounded-3xl border border-cyan-500/10 flex flex-col justify-center items-center text-center shadow-inner">
                          <p className="text-[10px] font-black text-cyan-500 uppercase tracking-[0.2em] mb-2 opacity-60">Stockpile Val</p>
                          <p className="text-xl font-black text-cyan-500 tabular-nums tracking-tighter">+{ (user.inventory?.length || 0) * 150 }</p>
                        </div>
                      </div>

                      <div className="space-y-4">
                        <div className="flex items-center justify-between">
                           <span className="text-base font-black text-text-primary tracking-tight uppercase">Operational Velocity</span>
                           <span className="text-[10px] font-black text-text-muted uppercase tracking-[0.2em] opacity-40">Delta Analytics</span>
                        </div>
                        <div className="bg-white/[0.01] rounded-[2.5rem] p-6 border border-white/5 shadow-inner">
                          <ScoreChart />
                        </div>
                      </div>
                    </Card>
                  </div>

                  {/* Sidebar (Right: 1 col) */}
                  <div className="space-y-6">
                    <Card className="p-8 md:p-10 flex flex-col min-h-full">
                      <div className="flex items-center justify-between mb-8">
                        <h2 className="text-xl md:text-2xl font-black text-text-primary flex items-center gap-4"><Package className="w-7 h-7 text-brand-gold" /> Stockpile</h2>
                      </div>
                      
                      {Object.keys(inventorySummary).length > 0 ? (
                        <div className="space-y-4 flex-1">
                          {Object.entries(inventorySummary).map(([itemId, data]: [string, any]) => {
                            const shopItem = (SHOP_ITEMS as any).find((i: any) => i.id === itemId) || { 
                              name: itemId.replace(/_/g, ' '), 
                              icon: Package, 
                              color: 'from-zinc-500 to-zinc-700', 
                              type: 'unknown',
                              description: 'Restricted access asset.',
                              howToUse: 'Operational automatic activation.',
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
                              <div key={itemId} className="group relative flex flex-col p-6 bg-white/[0.01] rounded-[2rem] border border-white/5 shadow-premium hover:border-brand-gold/30 hover:bg-white/[0.02] transition-all duration-500">
                                <div className="flex items-center gap-5">
                                  <div className={`w-16 h-16 bg-gradient-to-br ${shopItem.color} text-bg-main rounded-2xl flex items-center justify-center shadow-xl shrink-0 group-hover:scale-110 transition-transform duration-500`}>
                                    <Icon className="w-8 h-8" />
                                  </div>
                                  <div className="flex-1 min-w-0">
                                     <div className="flex items-center gap-2">
                                       <p className="font-black text-text-primary capitalize truncate text-base tracking-tight">{shopItem.name}</p>
                                       <button 
                                         onClick={() => setShowInfoId(showInfo ? null : itemId)}
                                         className={cn("p-1 transition-colors", showInfo ? "text-brand-gold scale-110" : "text-text-muted hover:text-brand-gold")}
                                       >
                                         <Info className="w-4 h-4" />
                                       </button>
                                     </div>
                                     <div className="flex items-center gap-3 mt-1.5">
                                        <div className="bg-brand-gold/10 text-brand-gold font-black text-[10px] px-3 py-1 rounded-xl uppercase tracking-widest border border-brand-gold/20 shadow-inner">x{String(data.count)}</div>
                                        {timeRemaining !== null && (
                                          <p className="text-[10px] font-black text-rose-500 flex items-center gap-1.5 tabular-nums">
                                             <Clock className="w-3.5 h-3.5" /> {timeRemaining}D REMAINING
                                          </p>
                                        )}
                                        {isConsumable && (
                                           <div className={cn(
                                             "text-[9px] font-black uppercase tracking-[0.2em] px-3 py-1 rounded-xl border",
                                             isManual ? "bg-brand-gold/10 text-brand-gold border-brand-gold/20" : "bg-white/[0.05] text-text-muted border-white/10 opacity-60"
                                           )}>
                                             {isManual ? 'ACTIVE' : 'PASSIVE'}
                                           </div>
                                        )}
                                     </div>
                                  </div>
                                </div>
                                
                                <div className="grid grid-cols-2 gap-3 mt-6">
                                   <button 
                                     onClick={() => setSendingItemId(itemId)}
                                     className="flex items-center justify-center gap-3 px-4 py-3.5 bg-white/[0.02] text-text-primary hover:bg-brand-gold hover:text-bg-main rounded-2xl transition-all active:scale-[0.98] text-[10px] font-black uppercase tracking-[0.3em] border border-white/5 shadow-premium group/gift"
                                     title="Transfer Asset"
                                   >
                                     <Gift className="w-4 h-4 group-hover/gift:scale-110 transition-transform" /> <span>Transfer</span>
                                   </button>
                                   {isManual ? (
                                     <button 
                                       onClick={() => consumeItem(itemId)}
                                       className="flex items-center justify-center gap-3 px-4 py-3.5 bg-brand-gold text-bg-main hover:brightness-110 hover:shadow-2xl hover:shadow-brand-gold/20 rounded-2xl transition-all active:scale-[0.98] text-[10px] font-black uppercase tracking-[0.3em] group/use"
                                       title="Init Deployment"
                                     >
                                       <Zap className="w-4 h-4 group-hover/use:scale-110 transition-transform" /> <span>Deploy</span>
                                     </button>
                                   ) : (
                                     <div className="bg-white/[0.01] border border-white/5 text-text-muted/40 px-4 py-3.5 rounded-2xl flex items-center justify-center gap-3 text-[10px] font-black uppercase tracking-[0.3em] italic">
                                        <Shield className="w-4 h-4 opacity-40" /> <span>Shielded</span>
                                     </div>
                                   )}
                                 </div>

                                 {showInfo && (
                                   <motion.div 
                                     initial={{ height: 0, opacity: 0 }}
                                     animate={{ height: 'auto', opacity: 1 }}
                                     className="mt-6 overflow-hidden"
                                   >
                                       <div className="p-5 bg-black/20 rounded-3xl border border-white/5 shadow-inner relative overflow-hidden">
                                          <div className="absolute top-0 right-0 p-4 opacity-5 pointer-events-none">
                                            <Icon className="w-16 h-16" />
                                          </div>
                                          <div className="flex gap-4 items-start relative z-10">
                                             <div className="flex-1">
                                               <p className="text-[11px] text-text-muted font-medium leading-relaxed italic opacity-80">
                                                 "{shopItem.description}"
                                               </p>
                                               <div className="h-px bg-white/5 my-3" />
                                               <p className="text-[10px] text-brand-gold font-black mt-2 leading-tight uppercase tracking-tight">
                                                 <span className="opacity-40 tracking-widest mr-2 uppercase">Activation Mode:</span> {shopItem.howToUse}
                                               </p>
                                             </div>
                                          </div>
                                       </div>
                                   </motion.div>
                                 )}
                              </div>
                            )
                          })}
                        </div>
                      ) : (
                        <div className="flex-1 flex flex-col items-center justify-center py-20 text-center bg-white/[0.01] border border-dashed border-white/10 rounded-[2.5rem] opacity-60">
                          <Package className="w-16 h-16 mx-auto mb-6 opacity-10 text-brand-gold" />
                          <p className="font-black text-text-muted text-[10px] uppercase tracking-[0.3em] mb-6">Stockpile Offline<br/>Aquire Assets via Market</p>
                          <Link to="/shop" className="bg-brand-gold/10 border border-brand-gold/20 text-brand-gold font-black uppercase tracking-[0.2em] px-8 py-4 rounded-2xl text-[10px] shadow-2xl shadow-brand-gold/5 hover:bg-brand-gold/20 transition-all active:scale-95">Access Trade Hub</Link>
                        </div>
                      )}
                    </Card>
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
            className="fixed inset-0 bg-black/80 backdrop-blur-md z-[100] flex items-center justify-center p-4 md:p-8"
          >
            <motion.div 
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              transition={{ type: "spring", damping: 25, stiffness: 300 }}
              className="bg-bg-surface rounded-[3rem] shadow-2xl p-10 md:p-14 w-full max-w-4xl relative max-h-[90vh] overflow-y-auto no-scrollbar flex flex-col border border-white/10"
            >
              <button 
                onClick={() => setShowBadges(false)}
                className="absolute top-10 right-10 p-4 text-text-muted hover:text-brand-gold bg-white/[0.05] hover:bg-brand-gold/10 rounded-[1.5rem] transition-all group z-20"
               >
                 <X className="w-6 h-6 group-hover:rotate-90 transition-transform duration-500" />
              </button>
              
              <div className="text-center mb-16 relative">
                <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-48 bg-brand-gold/10 blur-[80px] pointer-events-none rounded-full" />
                <div className="w-24 h-24 bg-brand-gold/10 text-brand-gold rounded-[2rem] flex items-center justify-center mx-auto mb-8 border border-brand-gold/20 shadow-2xl shadow-brand-gold/5 relative z-10">
                  <Award className="w-12 h-12" />
                </div>
                <h2 className="text-4xl md:text-5xl font-black text-text-primary tracking-tighter tabular-nums mb-4 relative z-10">Operational Mastery</h2>
                <p className="text-text-muted font-medium text-lg max-w-md mx-auto opacity-60 leading-relaxed italic relative z-10">Verification of status achieved through consistent academic domination.</p>
              </div>

              {Object.keys(achievementsSummary).length > 0 ? (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-6 md:gap-8 relative z-10">
                  {Object.entries(achievementsSummary).map(([id, tier]) => {
                    let badgeName = id;
                    let badgeImage = "";
                    let badgeColor = "";
                    if (id === 'wealth') {
                       badgeName = "Tycoon"; 
                       badgeImage = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Money%20Bag.png";
                       badgeColor = "from-amber-400/20 to-yellow-600/20 text-brand-gold";
                    }
                    else if (id === 'scholar') {
                       badgeName = "Scholar";
                       badgeImage = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Graduation%20Cap.png";
                       badgeColor = "from-blue-400/20 to-indigo-600/20 text-indigo-400";
                    }
                    else if (id === 'perfectionist') {
                       badgeName = "Flawless";
                       badgeImage = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Objects/Gem%20Stone.png";
                       badgeColor = "from-emerald-400/20 to-teal-600/20 text-emerald-400";
                    }
                    else if (id === 'socialite') {
                       badgeName = "Generous";
                       badgeImage = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Smilies/Heart%20with%20Ribbon.png";
                       badgeColor = "from-rose-400/20 to-pink-600/20 text-rose-400";
                    } else {
                       badgeImage = "https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Activities/Trophy.png";
                       badgeColor = "from-zinc-400/20 to-zinc-600/20 text-text-muted";
                    }

                    return (
                      <div key={id} className="group relative flex flex-col items-center p-8 bg-white/[0.02] rounded-[2.5rem] border border-white/5 hover:bg-white/[0.05] hover:shadow-[0_0_40px_rgba(251,191,36,0.1)] transition-all duration-500 overflow-hidden">
                        <div className={`w-28 h-28 bg-gradient-to-br ${badgeColor} rounded-[2rem] flex items-center justify-center font-black mb-6 shadow-2xl border border-white/10 relative z-10 group-hover:scale-110 transition-transform duration-700`}>
                          <img src={badgeImage} alt={badgeName} className="w-16 h-16 drop-shadow-2xl" />
                        </div>
                        <span className="font-black text-text-primary text-lg mb-3 tracking-tight group-hover:text-brand-gold transition-colors">{badgeName}</span>
                        <div className="bg-bg-surface text-brand-gold font-black text-[10px] uppercase tracking-[0.3em] px-5 py-2 rounded-2xl border border-brand-gold/20 shadow-2xl relative z-10 tabular-nums">Level {String(tier)}</div>
                        
                        <div className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-1000 bg-gradient-to-t from-brand-gold/5 via-transparent to-transparent pointer-events-none" />
                      </div>
                    );
                  })}
                </div>
              ) : (
                <div className="text-center py-24 bg-white/[0.01] border border-dashed border-white/10 rounded-[3rem] opacity-60">
                  <Award className="w-20 h-20 mx-auto mb-8 opacity-10 text-brand-gold" />
                  <p className="font-black text-text-primary text-2xl tracking-tight mb-2 uppercase italic">Zero Mastery Identified</p>
                  <p className="text-text-muted font-medium mb-10 opacity-60 italic uppercase tracking-widest text-[10px]">Dominat operational missions to unlock merit status.</p>
                  <button onClick={() => setShowBadges(false)} className="bg-brand-gold/10 border border-brand-gold/20 text-brand-gold font-black uppercase tracking-[0.2em] px-10 py-5 rounded-2xl shadow-2xl shadow-brand-gold/5 hover:bg-brand-gold hover:text-bg-main transition-all">Synchronise Objectives</button>
                </div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="mt-16 mb-8 flex flex-col items-center justify-center gap-6 text-sm font-semibold text-text-muted pb-24 md:pb-0 opacity-60">
        <div className="flex items-center gap-4">
           <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_10px_rgba(16,185,129,0.5)]" />
           <span className="font-black uppercase tracking-[0.3em] text-[10px]">Neural-Link Operational • V2.0.3_STABLE</span>
        </div>
        <a 
          href="https://www.samjuniors.com" 
          target="_blank" 
          rel="noopener noreferrer" 
          className="flex items-center gap-4 px-6 py-3 bg-white/[0.02] hover:bg-brand-gold hover:text-bg-main border border-white/5 hover:border-brand-gold rounded-[1.5rem] transition-all group shadow-premium"
        >
          <img src="https://raw.githubusercontent.com/Tarikul-Islam-Anik/Animated-Fluent-Emojis/master/Emojis/Hand%20gestures/Waving%20Hand.png" alt="Signal" className="w-6 h-6 drop-shadow-md group-hover:rotate-12 transition-transform" />
          <span className="font-black uppercase tracking-[0.3em] text-[10px]">Authored by samjuniors // protocol://visit</span>
        </a>
      </div>
      <AnimatePresence>
        {showRules && <RulesModal key="rules-modal" onClose={() => setShowRules(false)} />}
      </AnimatePresence>
    </div>
  );
};
