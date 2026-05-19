import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, Send, Sparkles, Lightbulb, Coffee, Brain, Heart, Zap, Flame, Smile, Coins, Trophy, BookOpen, Utensils, Activity } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatWithAI } from '../services/aiService';
import Markdown from 'react-markdown';
import { cn, getUserLevelAndXP } from '../lib/utils';
import { useSound } from '../hooks/useSound';
import { walletService, userService } from '../services/dbProvider';
import { toast } from 'react-hot-toast';
import { RulesModal } from './RulesModal';
import { ConfirmModal } from './ui/ConfirmModal';

const TIPS = [
  { text: "Take a 5-minute break every hour!", icon: Coffee, color: "text-brand-gold", bg: "bg-brand-gold/5" },
  { text: "Drink some water to stay hydrated.", icon: Heart, color: "text-cyan-500", bg: "bg-cyan-500/5" },
  { text: "Each message costs 5 coins. Use them wisely!", icon: Coins, color: "text-brand-gold", bg: "bg-brand-gold/5" },
  { text: "Did you know? Nova grows as you level up!", icon: Trophy, color: "text-fuchsia-500", bg: "bg-fuchsia-500/5" },
  { text: "Nova loves snacks! Feed her to boost her energy.", icon: Utensils, color: "text-orange-500", bg: "bg-orange-500/5" },
  { text: "Stuck? Try explaining the problem out loud.", icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-500/5" },
  { text: "Nova's mood affects her responses. Keep her happy!", icon: Smile, color: "text-emerald-500", bg: "bg-emerald-500/5" },
];

export const AIPet = React.memo(() => {
  const { user, updateResources, isStudent } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isRankPage = location.pathname.includes('leaderboard') || location.pathname.includes('syndicates');
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 768);
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const [isOpen, setIsOpen] = useState(false);
  const [view, setView] = useState<'chat' | 'care'>('chat');
  const [showRules, setShowRules] = useState(false);
  const [showChatConfirm, setShowChatConfirm] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
  const [isFeeding, setIsFeeding] = useState(false);
  const [currentTip, setCurrentTip] = useState<{ text: string, icon: any, color?: string, bg?: string } | null>(null);
  const [messages, setMessages] = useState<{ role: 'user' | 'model', text: string }[]>([
    { role: 'model', text: 'Hi! I am Nova! Need help studying or want to do a quick quiz? Each help session costs a few coins based on my level.' }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const { playSound } = useSound();

  const isMounted = useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  const { currentLevel, levelProgress } = useMemo(() => getUserLevelAndXP(user), [user]);

  const petStageLevel = useMemo(() => {
    if (currentLevel < 5) return 0;
    if (currentLevel < 10) return 1;
    if (currentLevel < 20) return 2;
    if (currentLevel < 35) return 3;
    return 4;
  }, [currentLevel]);

  const chatCost = Math.ceil(5 * Math.pow(1.1, petStageLevel));
  const feedCost = 50;

  const petStats = useMemo(() => {
    return {
      fullness: user?.petFullness ?? 100,
      happiness: user?.petHappiness ?? 100,
      isHungry: (user?.petFullness ?? 100) < 30,
      isSad: (user?.petHappiness ?? 100) < 30
    };
  }, [user]);

  const petStage = useMemo(() => {
    if (petStageLevel === 0) return { name: "Baby Nova", icon: Bot, color: "from-indigo-400 to-indigo-500", scale: 0.85 };
    if (petStageLevel === 1) return { name: "Student Nova", icon: Bot, color: "from-indigo-500 to-purple-600", scale: 0.95 };
    if (petStageLevel === 2) return { name: "Scholar Nova", icon: Sparkles, color: "from-purple-600 to-pink-600", scale: 1.05 };
    if (petStageLevel === 3) return { name: "Sage Nova", icon: Brain, color: "from-orange-500 to-rose-600", scale: 1.15 };
    return { name: "Divine Nova", icon: Trophy, color: "from-amber-400 to-orange-500", scale: 1.25 };
  }, [petStageLevel]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isOpen && view === 'chat') {
      scrollToBottom();
    }
  }, [messages, isOpen, view]);

  const handleOpen = () => {
    playSound('popOpen');
    setCurrentTip(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    playSound('popClose');
    setIsOpen(false);
  };

  useEffect(() => {
    if (!isOpen && isStudent) {
      const interval = setInterval(() => {
        if (Math.random() > 0.5) {
          setIsWaving(true);
          setTimeout(() => setIsWaving(false), 3000);
        } else {
          setCurrentTip(TIPS[Math.floor(Math.random() * TIPS.length)]);
          setTimeout(() => setCurrentTip(null), 6000);
        }
      }, 25000);
      return () => clearInterval(interval);
    }
  }, [isOpen, user, isStudent]);

  const handleFeed = async () => {
    if (!user || isFeeding) return;
    if (user.coins < feedCost) {
      toast.error("Not enough coins to buy snacks!");
      return;
    }
    if (petStats.fullness >= 100) {
      toast("Nova is already full!", { icon: '😋' });
      return;
    }

    setIsFeeding(true);
    playSound('coin');

    try {
      const newFullness = Math.min(100, petStats.fullness + 25);
      const newHappiness = Math.min(100, petStats.happiness + 10);
      const xpGain = 15;

      await walletService.spendCoins(user.id, feedCost, 'spend', 'Nova Feeding');
      await userService.updateUser(user.id, {
        petFullness: newFullness,
        petHappiness: newHappiness,
        xp: user.xp + xpGain,
        petLastFed: new Date()
      });

      updateResources({ 
        coins: user.coins - feedCost, 
        xp: user.xp + xpGain,
        petFullness: newFullness,
        petHappiness: newHappiness,
        petLastFed: new Date()
      });

      toast.success("Nova loved the snacks! +15 XP", { icon: '🍗' });
      setIsWaving(true);
      setTimeout(() => setIsWaving(false), 2000);
    } catch (err) {
      console.error(err);
      toast.error("Feeding failed");
    } finally {
      setIsFeeding(false);
    }
  };

  const handleChatRequest = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || isTyping) return;
    
    if (user!.coins < chatCost) {
      toast.error(`Nova is hungry! You need at least ${chatCost} coins to chat.`, { icon: '🪙' });
      return;
    }

    if (inputValue.length > 300) {
      toast.error("Message is too long!");
      return;
    }

    setShowChatConfirm(true);
  };

  const executeSend = async () => {
    const newStr = inputValue.trim();
    setInputValue('');
    setShowChatConfirm(false);

    if (isStudent) {
      walletService.spendCoins(user!.id, chatCost, 'spend', 'AI Interaction').catch(console.error);
      updateResources({ coins: Math.max(0, (user!.coins || 0) - chatCost) });
      toast.success(`-${chatCost} Coins`, { icon: '🪙' });
    }

    const newMessages = [...messages, { role: 'user' as const, text: newStr }];
    setMessages(newMessages);
    setIsTyping(true);
    playSound('click');

    const apiMessages = newMessages.slice(-6).map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    playSound('thinking');
    try {
      const responseText = await chatWithAI(apiMessages);
      if (isMounted.current) {
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      }
    } catch (err) {
      if (isMounted.current) {
        toast.error("AI connection failed.");
      }
    } finally {
      if (isMounted.current) {
        setIsTyping(false);
        playSound('notification');
      }
    }
  };

  if (!isStudent || !user) return null;

  return (
    <>
       <motion.div 
         className="fixed right-4 md:right-8 z-[1050] flex justify-end"
         animate={{
           bottom: 112,
           y: isRankPage && isMobile ? -80 : 0
         }}
         transition={{ type: "spring", stiffness: 200, damping: 25 }}
       >
        <AnimatePresence mode="wait">
          {!isOpen ? (
            <motion.div 
              key="pet-button-container"
              className="relative"
              initial={{ opacity: 0, scale: 0 }}
              animate={{ opacity: 1, scale: petStage.scale }}
              exit={{ opacity: 0, scale: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 25 }}
            >
              {currentTip && (
                <motion.div
                  key="tooltip-tip"
                  initial={{ opacity: 0, scale: 0.8, y: 10 }}
                  animate={{ opacity: 1, scale: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.8, y: 10 }}
                  className="absolute bottom-full right-0 mb-6 bg-bg-surface text-text-primary border border-white/5 px-5 py-4 rounded-[1.5rem] shadow-premium text-[11px] font-bold z-20 tooltip-triangle-tip flex items-start gap-3 w-64 sm:w-72"
                >
                  <motion.div 
                    animate={{ rotate: [0, 15, -15, 0] }} 
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                    className="shrink-0 pt-0.5"
                  >
                    <currentTip.icon className={cn("w-5 h-5", currentTip.color || "text-brand-gold")} />
                  </motion.div>
                  <span className="leading-relaxed opacity-90">{currentTip.text}</span>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.1, rotate: 5 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleOpen}
                className={cn(
                  "relative bg-bg-surface text-brand-gold p-4 rounded-[1.5rem] shadow-premium transition-all border-2 border-white/10 flex items-center justify-center group overflow-hidden",
                  "hover:bg-brand-gold hover:text-bg-main"
                )}
              >
                <div className="absolute inset-0 bg-brand-gold/5 group-hover:bg-brand-gold/0 transition-colors" />
                <motion.div 
                   animate={isWaving ? { rotate: [0, -20, 20, -20, 0] } : {}} 
                   transition={{ duration: 0.4 }}
                   className="relative z-10"
                >
                  {currentTip ? (
                    <currentTip.icon className="w-8 h-8" />
                  ) : isWaving ? (
                    <Smile className="w-8 h-8" />
                  ) : (
                    <petStage.icon className="w-8 h-8" />
                  )}
                </motion.div>
                <div className="absolute -bottom-1 -left-1 bg-brand-gold text-bg-main text-[9px] h-6 w-6 rounded-lg flex items-center justify-center font-black border-2 border-bg-surface shadow-2xl z-20 tabular-nums">
                  {currentLevel}
                </div>
                {petStats.isHungry && (
                  <motion.div 
                    animate={{ scale: [1, 1.2, 1] }} 
                    transition={{ repeat: Infinity, duration: 1 }}
                    className="absolute -top-1 -right-1 bg-rose-500 text-white p-1 rounded-full border-2 border-bg-surface shadow-lg z-20"
                  >
                    <Utensils className="w-2.5 h-2.5" />
                  </motion.div>
                )}
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="chat-window"
              initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute bottom-0 right-0 sm:right-0 w-[calc(100vw-32px)] sm:w-[400px] h-[640px] max-h-[85vh] bg-bg-surface rounded-[2.5rem] shadow-premium border border-white/5 flex flex-col overflow-hidden origin-bottom-right"
            >
              {/* Header */}
              <div className={cn("p-6 text-text-primary flex justify-between items-center shrink-0 border-b border-white/5 bg-white/[0.02]")}>
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-2xl flex items-center justify-center text-bg-main shadow-lg", petStage.color)}>
                    {petStats.isHungry ? <Coffee className="w-6 h-6" /> : <petStage.icon className="w-6 h-6" />}
                  </div>
                  <div>
                    <h3 className="font-black tracking-tight text-base uppercase">{petStage.name}</h3>
                    <div className="text-[9px] text-text-muted font-black flex items-center gap-2 uppercase tracking-[0.2em] opacity-60">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> Level {currentLevel} • {petStats.isHungry ? 'Starving' : 'Active'}
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setView(view === 'chat' ? 'care' : 'chat')}
                    className={cn(
                      "p-2.5 rounded-xl transition-all border border-white/5",
                      view === 'care' ? "bg-brand-gold text-bg-main shadow-lg" : "text-text-muted bg-white/[0.05] hover:text-brand-gold"
                    )}
                  >
                    {view === 'chat' ? <Activity className="w-4 h-4" /> : <Send className="w-4 h-4" />}
                  </button>
                  <button
                    onClick={() => setShowRules(true)}
                    className="p-2.5 rounded-xl text-text-muted hover:text-brand-gold bg-white/[0.05] hover:bg-brand-gold/10 transition-all border border-white/5"
                  >
                    <BookOpen className="w-4 h-4" />
                  </button>
                  <button
                    onClick={handleClose}
                    className="p-2.5 hover:bg-rose-500/10 hover:text-rose-500 text-text-muted rounded-xl transition-all border border-white/5"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {/* View Content */}
              {view === 'chat' ? (
                <>
                  <div className="flex-1 overflow-y-auto p-6 space-y-6 bg-white/[0.01] no-scrollbar">
                    {messages.map((msg, idx) => (
                      <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                        <div className={cn(
                          "max-w-[90%] rounded-[1.5rem] p-5 text-[13px] whitespace-pre-wrap shadow-premium border",
                          msg.role === 'user' 
                            ? "bg-brand-gold text-bg-main rounded-tr-sm font-black uppercase tracking-tight" 
                            : "bg-white/[0.03] text-text-primary rounded-tl-sm border-white/5 leading-relaxed"
                        )}>
                          {msg.role === 'model' ? (
                            <div className="markdown-prose max-w-none break-words italic opacity-90">
                                <Markdown>{msg.text}</Markdown>
                            </div>
                          ) : msg.text}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div className="flex justify-start">
                        <div className="bg-white/[0.03] border border-white/5 rounded-2xl px-5 py-4 rounded-tl-sm shadow-premium flex items-center gap-3">
                          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-brand-gold rounded-full" />
                          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-text-muted rounded-full" />
                          <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-brand-gold rounded-full" />
                        </div>
                      </div>
                    )}
                    <div ref={messagesEndRef} />
                  </div>

                  {/* Input Area */}
                  <div className="p-6 bg-white/[0.02] border-t border-white/5 shrink-0">
                    <div className="flex items-center justify-between mb-4 px-2">
                      <p className="text-[9px] text-text-muted font-black uppercase tracking-[0.2em] flex items-center gap-2 opacity-50">
                        <Coins className="w-3.5 h-3.5 text-brand-gold" /> Cycle Cost: {chatCost}
                      </p>
                      <p className="text-[9px] text-text-muted font-black uppercase tracking-[0.2em] flex items-center gap-2 opacity-50">
                        <span className="tabular-nums">{user.coins}</span> Credits Rem
                      </p>
                    </div>
                    
                    <form onSubmit={handleChatRequest} className="flex gap-3">
                      <div className="relative flex-1 group">
                        <input 
                          type="text" 
                          value={inputValue}
                          onChange={(e) => setInputValue(e.target.value)}
                          placeholder={petStats.isHungry ? "Nova is too hungry to speak..." : "Transmit signal..."}
                          className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-sm focus:outline-none focus:border-brand-gold/50 transition-all font-medium placeholder:text-text-muted/30 shadow-inner"
                          disabled={isTyping || petStats.isHungry}
                        />
                        <div className={cn(
                          "absolute right-4 top-1/2 -translate-y-1/2 text-[9px] font-black tracking-widest opacity-40 tabular-nums",
                          inputValue.length > 250 ? "text-amber-500 opacity-100" : "text-text-muted"
                        )}>
                          {inputValue.length}/300
                        </div>
                      </div>
                      <button 
                        type="submit"
                        disabled={!inputValue.trim() || isTyping || petStats.isHungry}
                        className="bg-brand-gold hover:brightness-110 disabled:opacity-50 disabled:grayscale text-white px-6 rounded-2xl transition-all flex items-center justify-center shadow-xl active:scale-95 group/send"
                      >
                        <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                      </button>
                    </form>
                  </div>
                </>
              ) : (
                <div className="flex-1 p-8 space-y-10 overflow-y-auto no-scrollbar">
                  {/* Pet Focus Display */}
                  <div className="flex flex-col items-center py-6">
                    <motion.div
                      animate={isFeeding ? { y: [0, -20, 0], scale: [1, 1.1, 1] } : { y: [0, -10, 0] }}
                      transition={isFeeding ? { duration: 0.5 } : { repeat: Infinity, duration: 4 }}
                      className={cn(
                        "w-48 h-48 rounded-[3rem] shadow-premium flex items-center justify-center text-bg-main relative overflow-hidden",
                        petStage.color
                      )}
                    >
                      <div className="absolute inset-0 bg-gradient-to-br from-white/30 to-transparent pointer-events-none" />
                      {petStats.isHungry ? <Utensils className="w-24 h-24 opacity-80" /> : <petStage.icon className="w-24 h-24" />}
                      
                      <AnimatePresence>
                        {isFeeding && (
                          <motion.div
                            initial={{ opacity: 0, y: 0, scale: 0.5 }}
                            animate={{ opacity: 1, y: -40, scale: 1 }}
                            exit={{ opacity: 0, y: -80 }}
                            className="absolute -top-12 text-5xl z-20"
                          >
                            🍔
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </motion.div>
                    <h4 className="mt-8 text-xl font-black text-text-primary uppercase tracking-tight">{petStage.name}</h4>
                    <p className="text-[10px] font-black text-brand-gold uppercase tracking-[0.2em] mt-1">Stage {petStageLevel + 1}/5 Evolution</p>
                    <p className="text-xs text-text-secondary opacity-60 mt-2">Status: {petStats.fullness > 80 ? 'Excited' : petStats.fullness > 30 ? 'Content' : 'Gravely Hungry'}</p>
                  </div>

                  {/* Stats Bars */}
                  <div className="grid gap-6">
                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                          <Activity className="w-3.5 h-3.5" /> Fullness
                        </span>
                        <span className="text-[10px] font-black tabular-nums text-brand-gold">{petStats.fullness}%</span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${petStats.fullness}%` }}
                          className={cn(
                            "h-full rounded-full shadow-[0_0_10px_rgba(212,175,55,0.2)]",
                            petStats.fullness < 30 ? "bg-rose-500" : "bg-brand-gold"
                          )}
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                          <Heart className="w-3.5 h-3.5" /> Happiness
                        </span>
                        <span className="text-[10px] font-black tabular-nums text-fuchsia-500">{petStats.happiness}%</span>
                      </div>
                      <div className="h-2.5 bg-white/5 rounded-full overflow-hidden border border-white/5 p-0.5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${petStats.happiness}%` }}
                          className="h-full bg-fuchsia-500 rounded-full shadow-[0_0_10px_rgba(217,70,239,0.2)]"
                        />
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex justify-between items-center px-1">
                        <span className="text-[10px] font-black uppercase tracking-widest text-text-muted flex items-center gap-2">
                          <Trophy className="w-3.5 h-3.5" /> Global Power (LVL {currentLevel})
                        </span>
                        <span className="text-[10px] font-black tabular-nums text-brand-gold">{levelProgress}%</span>
                      </div>
                      <div className="h-2.5 bg-brand-gold/10 rounded-full overflow-hidden border border-brand-gold/10 p-0.5">
                        <motion.div 
                          initial={{ width: 0 }}
                          animate={{ width: `${levelProgress}%` }}
                          className="h-full bg-brand-gold rounded-full shadow-[0_0_8px_rgba(212,175,55,0.4)]"
                        />
                      </div>
                      <div className="flex justify-between items-center text-[8px] font-black uppercase tracking-[0.2em] text-text-muted/60">
                        <span>Lvl {currentLevel}</span>
                        <span>{100 - levelProgress}% to next clearance level</span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="pt-4">
                    <button
                      onClick={handleFeed}
                      disabled={isFeeding || petStats.fullness >= 100}
                      className={cn(
                        "w-full py-5 rounded-[1.5rem] font-black uppercase tracking-widest flex items-center justify-center gap-3 transition-all active:scale-95 shadow-xl border border-white/5",
                        petStats.fullness >= 100 
                          ? "bg-white/5 text-text-muted cursor-not-allowed grayscale" 
                          : "bg-brand-gold text-white hover:brightness-110 hover:shadow-brand-gold/20"
                      )}
                    >
                      <Utensils className="w-5 h-5" />
                      <span className="text-white">
                         {isFeeding ? 'Synthesizing...' : `Feed Nova (${feedCost} Coins)`}
                      </span>
                    </button>
                    <p className="text-center mt-4 text-[9px] font-black text-text-muted/40 uppercase tracking-[0.2em]">Restores 25% Fullness & 10% Happiness</p>
                  </div>
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <ConfirmModal
        isOpen={showChatConfirm}
        onClose={() => setShowChatConfirm(false)}
        onConfirm={executeSend}
        title="AI Assistance"
        message={`Interacting with Nova consumes ${chatCost} Credits. Your session will be logged for academic integrity.`}
        confirmText="Authorize"
        cancelText="Cancel"
      />

      <style>{`
        .tooltip-triangle-tip::before {
          content: '';
          position: absolute;
          bottom: -6px;
          right: 12px;
          border-width: 6px 6px 0;
          border-style: solid;
          border-color: #ffffff transparent transparent transparent;
          display: block;
          width: 0;
        }
      `}</style>
      
      <AnimatePresence>
        {showRules && <RulesModal key="rules-modal" onClose={() => setShowRules(false)} />}
      </AnimatePresence>
    </>
  );
});
