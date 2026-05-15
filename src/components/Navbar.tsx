import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Coins, LogOut, Award, Calendar, ShieldAlert, Sparkles, Target, ShoppingBag, User, BarChart3, Share2, Zap, Wallet, Settings, UserPlus, Trophy, Shield } from 'lucide-react';
import { cn, getUserLevelAndXP } from '../lib/utils';
import { NotificationDropdown } from './NotificationDropdown';
import { ShareModal } from './ShareModal';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';

export const Navbar = () => {
  const { user, logOut } = useAuth();
  const location = useLocation();
  const [showInvite, setShowInvite] = React.useState(false);

  if (!user) return null;
  const { currentLevel } = getUserLevelAndXP(user);

  const NavLink = ({ to, icon: Icon, children }: { to: string, icon: any, children: React.ReactNode }) => {
    const [targetPath, targetSearch] = to.split('?');
    const isCurrentSearchEmpty = !location.search || location.search === '?';
    const isActive = location.pathname === targetPath && 
      (targetSearch 
        ? location.search.includes(targetSearch) 
        : (isCurrentSearchEmpty || (targetPath === '/admin' && location.search.includes('tab=overview'))));
    return (
      <Link 
        to={to} 
        className={cn(
          "flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-bold transition-all",
          isActive 
            ? "bg-brand-gold/10 text-brand-gold" 
            : "text-text-secondary hover:text-text-primary hover:bg-bg-main"
        )}
      >
        <Icon className={cn("h-6 w-6", isActive ? "text-brand-gold" : "opacity-70")} />
        {children}
      </Link>
    );
  };

  return (
    <>
      <nav className="bg-[#0A0F1A]/95 backdrop-blur-xl fixed top-0 w-full z-[120] border-b border-white/10 pt-[env(safe-area-inset-top)] transition-all">
        <div className="container mx-auto px-6 sm:px-10 max-w-7xl">
          <div className="flex h-20 md:h-36 justify-between items-center">
            <div className="flex-1 flex justify-start">
              <Link to="/dashboard" className="inline-flex items-center group transition-all hover:scale-105 active:scale-95">
                <Logo className="w-42 sm:w-54 md:w-72 lg:w-[420px] h-auto text-white drop-shadow-[0_16px_80px_rgba(255,255,255,0.35)] min-w-[165px]" />
              </Link>
            </div>

            <div className="hidden md:flex items-center space-x-1 lg:space-x-2 mr-auto">
              {(user.role === 'admin' || user.role === 'superadmin') ? (
                <>
                  <NavLink to="/admin?tab=users" icon={User}>Users</NavLink>
                  <NavLink to="/admin?tab=assignments" icon={Target}>Tasks</NavLink>
                  <NavLink to="/admin?tab=overview" icon={ShieldAlert}>System</NavLink>
                  <NavLink to="/admin?tab=recharges" icon={Wallet}>Economy</NavLink>
                  <NavLink to="/admin?tab=reviews" icon={Zap}>Pending</NavLink>
                </>
              ) : (
                <>
                  <NavLink to="/dashboard" icon={BookOpen}>Home</NavLink>
                  <NavLink to="/assignments" icon={Calendar}>Mission</NavLink>
                  <NavLink to="/syndicates" icon={Shield}>Network</NavLink>
                  <NavLink to="/badges" icon={Award}>Awards</NavLink>
                  <NavLink to="/leaderboard?tab=diamonds" icon={Trophy}>Rank</NavLink>
                  <NavLink to="/shop" icon={ShoppingBag}>Shop</NavLink>
                </>
              )}
            </div>

              <div className="flex items-center gap-1 sm:gap-2 md:gap-4 shrink-0 flex-wrap justify-end">
                <button 
                  onClick={() => setShowInvite(true)}
                  className="hidden lg:flex items-center gap-2 bg-brand-gold/10 text-brand-gold px-3.5 py-1.5 rounded-xl hover:bg-brand-gold/20 transition-all border border-brand-gold/20 font-bold text-xs"
                >
                  <Share2 className="h-5 w-5" />
                  <span>Invite</span>
                </button>
                
                <div className="flex flex-wrap items-center justify-end gap-1 sm:gap-4 pl-1 sm:pl-4 shrink-0">
                  {(user.role === 'admin' || user.role === 'superadmin') && (
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Link to="/admin?tab=invites" className="flex w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 items-center justify-center bg-bg-main/50 text-text-secondary hover:text-brand-gold hover:bg-brand-gold/10 transition-all rounded-xl border border-border-main/30" title="Invites">
                        <UserPlus className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Link>
                      <Link to="/admin?tab=settings" className="flex w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 items-center justify-center bg-bg-main/50 text-text-secondary hover:text-brand-gold hover:bg-brand-gold/10 transition-all rounded-xl border border-border-main/30" title="System Settings">
                        <Settings className="h-5 w-5 sm:h-6 sm:w-6" />
                      </Link>
                    </div>
                  )}
          <div className="flex items-center gap-6 sm:gap-10">
            <div className="relative pr-5 sm:pr-8 border-r border-white/10 group">
              <NotificationDropdown />
              <div className="absolute inset-0 bg-white/5 opacity-0 group-hover:opacity-100 transition-opacity rounded-2xl -z-10 mx-1" />
            </div>
            <Link to="/profile" className="w-10 h-10 sm:w-12 sm:h-12 md:w-14 md:h-14 rounded-full bg-[#1A2B48] flex items-center justify-center overflow-hidden hover:scale-110 active:scale-95 transition-all ring-[2.5px] ring-[#D4AF37] ring-offset-[2px] ring-offset-[#0A0F1A] shadow-[0_0_20px_rgba(212,175,55,0.25)]" title="Profile">
                      {user.avatar?.startsWith('http') || user.avatar?.startsWith('data:') ? (
                        <img src={user.avatar} key={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                      ) : user.avatar ? (
                        <span className="text-xl sm:text-2xl md:text-3xl">{user.avatar}</span>
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-brand-gold/10 text-brand-gold font-bold text-sm sm:text-lg uppercase">
                          {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                        </div>
                      )}
                    </Link>
                  </div>
                </div>
              </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation Bar */}
      <div className={cn(
        "fixed bottom-0 left-0 right-0 z-[999] px-4 pb-[max(env(safe-area-inset-bottom),16px)] pt-2 md:hidden",
        "transition-all duration-300"
      )}>
        <div className="bg-[#0A0F1A]/95 backdrop-blur-xl border border-white/10 rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex items-center justify-between w-full h-18 px-2 relative">
          {(user.role === 'admin' || user.role === 'superadmin') ? (
            <>
              <MobileNavLink to="/admin?tab=users" icon={User} label="Users" currentPath={location.pathname} />
              <MobileNavLink to="/admin?tab=assignments" icon={Target} label="Tasks" currentPath={location.pathname} />
              <MobileNavLink to="/admin?tab=overview" icon={ShieldAlert} label="System" currentPath={location.pathname} isDanger />
              <MobileNavLink to="/admin?tab=recharges" icon={Wallet} label="Economy" currentPath={location.pathname} />
              <MobileNavLink to="/admin?tab=reviews" icon={Zap} label="Pending" currentPath={location.pathname} />
            </>
          ) : (
            <>
              <MobileNavLink to="/dashboard" icon={BookOpen} label="Home" currentPath={location.pathname} />
              <MobileNavLink to="/assignments" icon={Calendar} label="Mission" currentPath={location.pathname} />
              <MobileNavLink to="/syndicates" icon={Shield} label="Network" currentPath={location.pathname} />
              <MobileNavLink to="/badges" icon={Award} label="Awards" currentPath={location.pathname} />
              <MobileNavLink to="/leaderboard?tab=diamonds" icon={Trophy} label="Rank" currentPath={location.pathname} />
              <MobileNavLink to="/shop" icon={ShoppingBag} label="Shop" currentPath={location.pathname} />
            </>
          )}
        </div>
      </div>

      <ShareModal isOpen={showInvite} onClose={() => setShowInvite(false)} />
    </>
  );
};

const MobileNavLink = ({ to, icon: Icon, label, currentPath, isDanger, shadowColor, isCenterFloating }: { to: string, icon: any, label: string, currentPath: string, isDanger?: boolean, shadowColor?: string, isCenterFloating?: boolean }) => {
  const location = useLocation();
  const [targetPath, targetSearch] = to.split('?');
  const isCurrentSearchEmpty = !location.search || location.search === '?';
  const isPathActive = currentPath === targetPath && 
    (targetSearch 
      ? location.search.includes(targetSearch) 
      : (isCurrentSearchEmpty || (targetPath === '/admin' && location.search.includes('tab=overview'))));
      
  const isActive = isPathActive || 
                  (to === '/dashboard' && (currentPath === '/' || currentPath === ''));
  
  if (isCenterFloating) {
    return (
      <Link
        to={to}
        className="relative flex flex-col items-center justify-center transition-all duration-300 z-20 mx-1"
      >
        <div className={cn(
          "flex items-center justify-center rounded-full shadow-lg p-3.5 sm:p-4 border transition-all duration-300 -translate-y-8",
          isActive
            ? "bg-brand-gold border-brand-gold shadow-[0_12px_30px_rgba(212,175,55,0.5)] scale-110"
            : isDanger
              ? "bg-rose-500 border-rose-500 shadow-[0_12px_30px_rgba(225,29,72,0.5)]"
              : "bg-white border-border-main/50 shadow-black/10 hover:scale-105"
        )}>
          <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7", isActive || isDanger ? "text-white" : "text-brand-slate")} strokeWidth={isActive ? 3 : 2.5} />
        </div>
        <span 
          className={cn(
            "absolute bottom-2 text-[10px] font-black uppercase tracking-widest transition-all duration-300",
            isActive || isDanger ? "text-brand-gold translate-y-0" : "text-text-secondary opacity-60 translate-y-1"
          )}
        >
          {label}
        </span>
      </Link>
    );
  }

  return (
    <Link 
      to={to} 
      className={cn(
        "relative flex flex-col items-center justify-center transition-all duration-300 h-full flex-1 group",
        isActive 
          ? (isDanger ? "text-rose-600" : "text-brand-gold") 
          : "text-text-secondary hover:text-brand-slate"
      )}
    >
      <div className="relative z-10 flex flex-col items-center justify-center w-full h-full pt-1">
        <div className={cn(
          "p-2 rounded-2xl transition-all duration-300",
          isActive ? "bg-brand-gold/10" : "group-hover:bg-bg-main"
        )}>
          <Icon 
            className={cn(
              "h-5 w-5 transition-all duration-300", 
              isActive ? "scale-110" : "scale-100"
            )} 
            strokeWidth={isActive ? 2.5 : 2} 
          />
        </div>
        
        <span 
          className={cn(
            "text-[9px] font-black tracking-widest uppercase mt-0.5 transition-all duration-300",
            isActive ? "opacity-100" : "opacity-0 translate-y-1"
          )}
        >
          {label}
        </span>
      </div>
    </Link>
  );
};
