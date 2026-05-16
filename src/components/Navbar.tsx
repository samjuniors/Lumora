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

  const NavLink = ({ to, icon: Icon, children, highlighted }: { to: string, icon: any, children: React.ReactNode, highlighted?: boolean }) => {
    const [targetPath, targetSearch] = to.split('?');
    const isActive = location.pathname === targetPath && (!targetSearch || location.search.includes(targetSearch));
    return (
      <Link 
        to={to} 
        className={cn(
          "flex items-center gap-2 px-4 py-2 my-1.5 rounded-full text-sm font-bold transition-all relative group",
          isActive 
            ? "bg-white/10 text-white shadow-sm ring-1 ring-white/10" 
            : highlighted 
              ? "text-brand-gold bg-brand-gold/10 hover:bg-brand-gold/20 ring-1 ring-brand-gold/30 shadow-[0_0_10px_rgba(212,175,55,0.15)] hover:shadow-[0_0_15px_rgba(212,175,55,0.3)] inset-shadow-sm" 
              : "text-text-secondary hover:text-white hover:bg-white/5"
        )}
      >
        <Icon className={cn("h-4 w-4 relative z-10 transition-transform group-hover:-translate-y-0.5 duration-300", isActive ? "text-brand-gold" : highlighted ? "text-brand-gold drop-shadow-[0_0_8px_rgba(212,175,55,0.8)] animate-pulse" : "opacity-70")} />
        <span className="relative z-10">{children}</span>
      </Link>
    );
  };

  return (
    <>
      <nav className="bg-[#0A0F1A]/85 backdrop-blur-xl fixed top-0 w-full z-[120] border-b border-white/10 transition-all">
        <div className="container mx-auto px-4 lg:px-8 max-w-[1400px]">
          <div className="flex h-16 items-center justify-between">
            {/* Left: Logo */}
            <div className="flex-1 flex justify-start pl-2 lg:ml-[35px] lg:mr-[48px] lg:max-w-[251px]">
              <Link to="/dashboard" className="inline-flex items-center group transition-transform hover:opacity-90 active:scale-95">
                <Logo className="w-32 md:w-40 lg:w-48 h-auto text-white ml-1" />
              </Link>
            </div>

            {/* Center: Navigation Links */}
            <div className="hidden lg:flex items-center justify-center space-x-1 px-3 py-1.5 bg-white/5 border border-white/5 rounded-full shadow-inner backdrop-blur-md lg:mr-[70px]">
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
                  <NavLink to="/shop" icon={ShoppingBag}>Shop</NavLink>
                </>
              )}
            </div>

            {/* Right: Actions */}
            <div className="flex-1 flex items-center justify-end gap-3 sm:gap-4 pr-2 lg:mr-[41px]">
                <button 
                  onClick={() => setShowInvite(true)}
                  className="hidden lg:flex items-center gap-2 bg-brand-gold/10 text-brand-gold px-4 py-2 rounded-full hover:bg-brand-gold/20 transition-colors border border-brand-gold/20 font-bold text-xs ring-1 ring-brand-gold/10 shadow-sm"
                >
                  <Share2 className="h-4 w-4" />
                  <span>Invite</span>
                </button>
                
                <div className="flex items-center gap-3 border-l border-white/10 pl-3 sm:pl-4 ml-1">
                  {(user.role === 'admin' || user.role === 'superadmin') && (
                    <div className="hidden sm:flex items-center gap-2">
                      <Link to="/admin?tab=invites" className="flex w-9 h-9 items-center justify-center text-text-secondary hover:text-white hover:bg-white/10 transition-colors rounded-full" title="Invites">
                        <UserPlus className="h-4 w-4" />
                      </Link>
                      <Link to="/admin?tab=settings" className="flex w-9 h-9 items-center justify-center text-text-secondary hover:text-white hover:bg-white/10 transition-colors rounded-full" title="System Settings">
                        <Settings className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                  <Link to="/leaderboard?tab=diamonds" className="flex w-9 h-9 items-center justify-center text-brand-gold hover:bg-brand-gold/10 transition-colors rounded-full bg-brand-gold/5 border border-brand-gold/10 group" title="Hall of Fame">
                    <Trophy className="h-4 w-4 drop-shadow-[0_0_8px_rgba(212,175,55,0.4)] transition-transform group-hover:scale-110" />
                  </Link>
                  <div className="flex items-center">
                    <NotificationDropdown />
                  </div>
                  <Link to="/profile" className="ml-2 w-9 h-9 rounded-full bg-[#1A2B48] flex items-center justify-center overflow-hidden hover:scale-105 active:scale-95 transition-transform ring-2 ring-[#D4AF37] shadow-[0_0_15px_rgba(212,175,55,0.15)] shrink-0" title="Profile">
                    {user.avatar?.startsWith('http') || user.avatar?.startsWith('data:') ? (
                      <img src={user.avatar} key={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : user.avatar ? (
                      <span className="text-sm font-bold">{user.avatar}</span>
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-gold/10 text-brand-gold font-black text-xs uppercase">
                        {user.name?.charAt(0) || user.email?.charAt(0) || 'U'}
                      </div>
                    )}
                  </Link>
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
        <div className="bg-[#0A0F1A]/95 backdrop-blur-xl border border-white/10 rounded-[28px] shadow-[0_12px_40px_rgba(0,0,0,0.5)] flex items-center justify-between w-full h-[72px] px-2 relative">
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
              <MobileNavLink to="/syndicates" icon={Shield} label="Network" currentPath={location.pathname} isCenterFloating />
              <MobileNavLink to="/badges" icon={Award} label="Awards" currentPath={location.pathname} />
              <MobileNavLink to="/shop" icon={ShoppingBag} label="Shop" currentPath={location.pathname} />
            </>
          )}
        </div>
      </div>

      <ShareModal isOpen={showInvite} onClose={() => setShowInvite(false)} />
    </>
  );
};

const MobileNavLink = ({ to, icon: Icon, label, currentPath, isDanger, shadowColor, isCenterFloating, highlighted }: { to: string, icon: any, label: string, currentPath: string, isDanger?: boolean, shadowColor?: string, isCenterFloating?: boolean, highlighted?: boolean }) => {
  const location = useLocation();
  const [targetPath, targetSearch] = to.split('?');
  const isActive = 
    (currentPath === targetPath && (!targetSearch || location.search.includes(targetSearch))) ||
    (to === '/dashboard' && (currentPath === '/' || currentPath === ''));
  
  if (isCenterFloating) {
    return (
      <Link
        to={to}
        className="relative flex flex-col items-center justify-center transition-all duration-300 z-20 mx-1"
      >
        <div className={cn(
          "flex items-center justify-center rounded-full shadow-lg p-3.5 sm:p-4 border transition-all duration-300 -translate-y-6 md:-translate-y-8",
          isActive
            ? "bg-brand-gold border-brand-gold shadow-[0_12px_30px_rgba(212,175,55,0.5)] scale-110"
            : highlighted
              ? "bg-gradient-to-br from-brand-gold/90 to-amber-500 border-brand-gold/30 shadow-[0_0_20px_rgba(212,175,55,0.4)] hover:scale-105 animate-pulse-glow"
              : isDanger
                ? "bg-rose-500 border-rose-500 shadow-[0_12px_30px_rgba(225,29,72,0.5)]"
                : "bg-[#0A0F1A] border-white/10 shadow-black/10 hover:scale-105"
        )}>
          <Icon className={cn("h-6 w-6 sm:h-7 sm:w-7", isActive || isDanger || highlighted ? "text-white" : "text-[#4A5D7A]")} strokeWidth={isActive || highlighted ? 3 : 2.5} />
        </div>
        <span 
          className={cn(
            "absolute bottom-0 text-[10px] font-black uppercase tracking-widest transition-all duration-300",
            isActive || isDanger || highlighted ? "text-brand-gold translate-y-0 text-shadow-sm shadow-black" : "text-text-secondary opacity-40 translate-y-1"
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
