import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { BookOpen, Coins, LogOut, Award, Calendar, ShieldAlert, Sparkles, Target, ShoppingBag, User, BarChart3, Share2, Zap, Wallet, Settings, UserPlus, Trophy, Shield } from 'lucide-react';
import { cn, getUserLevelAndXP } from '../lib/utils';
import { NotificationDropdown } from './NotificationDropdown';
import { ShareModal } from './ShareModal';
import { Logo } from './Logo';
import { motion, AnimatePresence } from 'motion/react';

export const Navbar = React.memo(() => {
  const { user, logOut, isAdmin } = useAuth();
  const location = useLocation();
  const [showInvite, setShowInvite] = React.useState(false);

  const currentLevel = React.useMemo(() => user ? getUserLevelAndXP(user).currentLevel : 1, [user]);

  if (!user) return null;

  const NavLink = ({ to, icon: Icon, children, highlighted, title }: { to: string, icon: any, children: React.ReactNode, highlighted?: boolean, title?: string }) => {
    const [targetPath, targetSearch] = to.split('?');
    const isActive = location.pathname === targetPath && (!targetSearch || location.search.includes(targetSearch));
    return (
      <Link 
        to={to} 
        className={cn(
          "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-bold transition-all group relative uppercase tracking-wider",
          isActive 
            ? "text-brand-gold bg-brand-gold/5" 
            : highlighted 
              ? "text-brand-gold bg-brand-gold/10 hover:bg-brand-gold/20" 
              : "text-text-secondary hover:text-white hover:bg-white/5"
        )}
      >
        <Icon className={cn("h-3.5 w-3.5 transition-transform group-hover:-translate-y-0.5", isActive ? "text-brand-gold" : "opacity-70")} />
        <span>{children}</span>
        {isActive && (
          <motion.div 
            layoutId="nav-active"
            className="absolute bottom-0 left-2 right-2 h-0.5 bg-brand-gold/50 rounded-full"
            initial={false}
          />
        )}
      </Link>
    );
  };

  return (
    <>
      <nav className="glass-dark fixed top-0 w-full z-[120] border-b border-white/[0.05] pt-[env(safe-area-inset-top)]">
        <div className="container mx-auto px-4 lg:px-6 max-w-7xl">
          <div className="flex h-12 md:h-14 items-center justify-between">
            {/* Left: Logo */}
            <div className="flex-shrink-0">
              <Link to="/dashboard" className="flex items-center group transition-transform active:scale-95">
                <Logo className="w-20 md:w-28 h-auto text-white" />
              </Link>
            </div>

            {/* Center: Navigation Links */}
            <div className="hidden lg:flex items-center gap-1">
              {isAdmin ? (
                <>
                  <NavLink to="/admin?tab=analytics" icon={BarChart3}>Analytics</NavLink>
                  <NavLink to="/admin?tab=users" icon={User}>Users</NavLink>
                  <NavLink to="/admin?tab=assignments" icon={Target}>Tasks</NavLink>
                  <NavLink to="/admin?tab=overview" icon={ShieldAlert}>System</NavLink>
                  <NavLink to="/admin?tab=recharges" icon={Wallet}>Economy</NavLink>
                  <NavLink to="/admin?tab=reviews" icon={Zap}>Queue</NavLink>
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
            <div className="flex items-center gap-2">
                <button 
                  onClick={() => setShowInvite(true)}
                  className="hidden sm:flex items-center gap-2 bg-brand-gold/10 text-brand-gold border border-brand-gold/20 px-3 py-1.5 rounded-lg hover:bg-brand-gold/20 transition-colors font-bold text-[10px] uppercase tracking-widest"
                >
                  <Share2 className="h-3 w-3" />
                  <span>Invite</span>
                </button>
                
                <div className="flex items-center gap-2 sm:gap-3 ml-2 pl-2 border-l border-white/10">
                  {isAdmin && (
                    <div className="hidden md:flex items-center gap-1">
                      <Link to="/admin?tab=invites" className="flex w-8 h-8 items-center justify-center text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <UserPlus className="h-4 w-4" />
                      </Link>
                      <Link to="/admin?tab=settings" className="flex w-8 h-8 items-center justify-center text-text-secondary hover:text-white hover:bg-white/5 rounded-lg transition-colors">
                        <Settings className="h-4 w-4" />
                      </Link>
                    </div>
                  )}
                  <Link to="/leaderboard?tab=diamonds" className="flex w-8 h-8 items-center justify-center text-brand-gold bg-brand-gold/5 border border-brand-gold/10 rounded-lg hover:bg-brand-gold/10 transition-all">
                    <Trophy className="h-4 w-4" />
                  </Link>
                  <NotificationDropdown />
                  <Link to="/profile" className="ml-1 w-8 h-8 rounded-full border border-white/20 overflow-hidden hover:border-brand-gold transition-colors">
                    {user.avatar?.startsWith('http') || user.avatar?.startsWith('data:') ? (
                      <img src={user.avatar} alt="Avatar" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-brand-gold text-bg-main font-bold text-xs">
                        {user.name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </Link>
                </div>
            </div>
          </div>
        </div>
      </nav>

      {/* Mobile Bottom Navigation - Floating island style */}
      <div className="fixed bottom-0 left-0 right-0 z-[120] md:hidden px-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pointer-events-none">
        <div className="glass-dark rounded-[1.25rem] shadow-2xl flex items-center justify-around h-14 w-full max-w-sm mx-auto px-1.5 border border-white/10 pointer-events-auto">
          {isAdmin ? (
            <>
              <MobileNavLink to="/admin?tab=analytics" icon={BarChart3} label="Data" currentPath={location.pathname} />
              <MobileNavLink to="/admin?tab=users" icon={User} label="Users" currentPath={location.pathname} />
              <MobileNavLink to="/admin?tab=assignments" icon={Target} label="Tasks" currentPath={location.pathname} />
              <MobileNavLink to="/admin?tab=overview" icon={ShieldAlert} label="System" currentPath={location.pathname} />
              <MobileNavLink to="/admin?tab=reviews" icon={Zap} label="Queue" currentPath={location.pathname} />
            </>
          ) : (
            <>
              <MobileNavLink to="/dashboard" icon={BookOpen} label="Home" currentPath={location.pathname} />
              <MobileNavLink to="/assignments" icon={Calendar} label="Mission" currentPath={location.pathname} />
              <MobileNavLink to="/syndicates" icon={Shield} label="Network" currentPath={location.pathname} />
              <MobileNavLink to="/badges" icon={Award} label="Awards" currentPath={location.pathname} />
              <MobileNavLink to="/shop" icon={ShoppingBag} label="Shop" currentPath={location.pathname} />
            </>
          )}
        </div>
      </div>


      <ShareModal isOpen={showInvite} onClose={() => setShowInvite(false)} />
    </>
  );
});

const MobileNavLink = React.memo(({ to, icon: Icon, label, currentPath, isCenter }: { to: string, icon: any, label: string, currentPath: string, isCenter?: boolean }) => {
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
});
