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
  const { user, logOut, isAdmin } = useAuth();
  const location = useLocation();
  const [showInvite, setShowInvite] = React.useState(false);

  if (!user) return null;
  const { currentLevel } = getUserLevelAndXP(user);

  const NavLink = ({ to, icon: Icon, children, highlighted, title }: { to: string, icon: any, children: React.ReactNode, highlighted?: boolean, title?: string }) => {
    const [targetPath, targetSearch] = to.split('?');
    const isActive = location.pathname === targetPath && (!targetSearch || location.search.includes(targetSearch));
    return (
      <Link 
        to={to} 
        className={cn(
          "flex items-center gap-2.5 px-4 py-2 rounded-lg text-sm font-semibold transition-all group relative",
          isActive 
            ? "text-brand-gold bg-brand-gold/5" 
            : highlighted 
              ? "text-brand-gold bg-brand-gold/10 hover:bg-brand-gold/20" 
              : "text-text-secondary hover:text-white hover:bg-white/5"
        )}
      >
        <Icon className={cn("h-4 w-4 transition-transform group-hover:-translate-y-0.5", isActive ? "text-brand-gold" : "opacity-70")} />
        <span>{children}</span>
        {isActive && (
          <motion.div 
            layoutId="nav-active"
            className="absolute inset-0 border-b-2 border-brand-gold/50 rounded-lg pointer-events-none"
            initial={false}
          />
        )}
      </Link>
    );
  };

  return (
    <>
      <nav className="glass-dark fixed top-0 w-full z-[120] transition-all">
        <div className="container mx-auto px-4 lg:px-8 max-w-7xl">
          <div className="flex h-16 items-center justify-between">
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <Link to="/dashboard" className="flex items-center group transition-transform active:scale-95">
                <Logo className="w-32 lg:w-40 h-auto text-white" />
              </Link>
            </div>

            {/* Center: Navigation Links */}
            <div className="hidden lg:flex items-center gap-1 bg-white/[0.03] border border-white/5 p-1 rounded-xl">
              {isAdmin ? (
                <>
                  <NavLink to="/dashboard" icon={BookOpen} title="Student View">Student View</NavLink>
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
            <div className="flex items-center gap-3">
                <button 
                  onClick={() => setShowInvite(true)}
                  className="hidden lg:flex items-center gap-2 bg-brand-gold text-navy-950 px-4 py-1.5 rounded-lg hover:bg-brand-gold-hover transition-colors font-bold text-xs"
                >
                  <Share2 className="h-3.5 w-3.5" />
                  <span>Invite</span>
                </button>
                
                <div className="flex items-center gap-2 sm:gap-3 border-l border-white/10 pl-3 sm:pl-4">
                  {isAdmin && (
                    <div className="hidden sm:flex items-center gap-1">
                      <Link to="/admin?tab=invites" className="flex w-8 h-8 items-center justify-center text-text-secondary hover:text-white hover:bg-white/10 rounded-lg" title="Invites">
                        <UserPlus className="h-4 w-4" />
                      </Link>
                      <Link to="/admin?tab=settings" className="flex w-8 h-8 items-center justify-center text-text-secondary hover:text-white hover:bg-white/10 rounded-lg" title="System Settings">
                        <Settings className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                  <Link to="/leaderboard?tab=diamonds" className="flex w-8 h-8 items-center justify-center text-brand-gold bg-brand-gold/10 border border-brand-gold/20 rounded-lg group" title="Hall of Fame">
                    <Trophy className="h-4 w-4 transition-transform group-hover:scale-110" />
                  </Link>
                  <NotificationDropdown />
                  <Link to="/profile" className="ml-1 w-8 h-8 rounded-full border-2 border-brand-gold overflow-hidden hover:scale-105 active:scale-95 transition-transform shadow-glow-gold">
                    {user.avatar?.startsWith('http') || user.avatar?.startsWith('data:') ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-gold text-navy-950 font-bold text-xs">
                        {user.name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </Link>
                </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Compact premium app style */}
      <div className="fixed bottom-0 left-0 right-0 z-[120] md:hidden px-4 pb-6">
        <div className="glass-dark rounded-2xl shadow-2xl flex items-center justify-around h-16 w-full max-w-md mx-auto px-2 border-white/10 relative">
          {isAdmin ? (
            <>
              <MobileNavLink to="/dashboard" icon={BookOpen} label="Student" currentPath={location.pathname} />
              <MobileNavLink to="/admin?tab=users" icon={User} label="Users" currentPath={location.pathname} />
              <MobileNavLink to="/admin?tab=assignments" icon={Target} label="Tasks" currentPath={location.pathname} isCenter />
              <MobileNavLink to="/admin?tab=overview" icon={ShieldAlert} label="System" currentPath={location.pathname} />
              <MobileNavLink to="/admin?tab=reviews" icon={Zap} label="Queue" currentPath={location.pathname} />
            </>
          ) : (
            <>
              <MobileNavLink to="/dashboard" icon={BookOpen} label="Home" currentPath={location.pathname} />
              <MobileNavLink to="/assignments" icon={Calendar} label="Missions" currentPath={location.pathname} />
              <MobileNavLink to="/syndicates" icon={Shield} label="Syndicate" currentPath={location.pathname} isCenter />
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

const MobileNavLink = ({ to, icon: Icon, label, currentPath, isCenter }: { to: string, icon: any, label: string, currentPath: string, isCenter?: boolean }) => {
  const location = useLocation();
  const [targetPath, targetSearch] = to.split('?');
  const isActive = 
    (currentPath === targetPath && (!targetSearch || location.search.includes(targetSearch))) ||
    (to === '/dashboard' && (currentPath === '/' || currentPath === ''));
  
  return (
    <Link 
      to={to} 
      className={cn(
        "flex flex-col items-center justify-center flex-1 transition-all relative py-1",
        isActive ? "text-brand-gold" : "text-text-secondary"
      )}
    >
      {isCenter && (
        <div className="absolute -top-4 w-12 h-1 bg-brand-gold rounded-full opacity-50 blur-sm md:hidden" />
      )}
      <div className={cn(
        "p-1.5 rounded-lg transition-all",
        isActive ? "bg-brand-gold/10" : ""
      )}>
        <Icon className={cn("h-5 w-5", isActive ? "stroke-[2.5]" : "stroke-[2]")} />
      </div>
      <span className={cn(
        "text-[10px] font-bold tracking-tight transition-all",
        isActive ? "opacity-100" : "opacity-60"
      )}>
        {label}
      </span>
    </Link>
  );
};
