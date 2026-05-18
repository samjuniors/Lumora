import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, Send, Sparkles, Lightbulb, Coffee, Brain, Heart, Zap, Flame, Smile, Coins, Trophy, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatWithAI } from '../services/aiService';
import Markdown from 'react-markdown';
import { cn, getUserLevelAndXP } from '../lib/utils';
import { useSound } from '../hooks/useSound';
import { walletService } from '../services/dbProvider';
import { toast } from 'react-hot-toast';
import { RulesModal } from './RulesModal';

const TIPS = [
  { text: "Take a 5-minute break every hour!", icon: Coffee, color: "text-brand-gold", bg: "bg-brand-gold/5" },
  { text: "Drink some water to stay hydrated.", icon: Heart, color: "text-cyan-500", bg: "bg-cyan-500/5" },
  { text: "Each message costs 5 coins. Use them wisely!", icon: Coins, color: "text-brand-gold", bg: "bg-brand-gold/5" },
  { text: "Did you know? Nova grows as you level up!", icon: Trophy, color: "text-fuchsia-500", bg: "bg-fuchsia-500/5" },
  { text: "Stuck? Try explaining the problem out loud.", icon: Lightbulb, color: "text-amber-500", bg: "bg-amber-500/5" },
  { text: "Don't forget to review your notes today.", icon: Zap, color: "text-rose-500", bg: "bg-rose-500/5" },
  { text: "Focus on progress, not perfection.", icon: Smile, color: "text-emerald-500", bg: "bg-emerald-500/5" },
  { text: "Nova's memory is short. Keep chats focused!", icon: Sparkles, color: "text-brand-gold", bg: "bg-brand-gold/5" },
  { text: "Take a deep breath and relax.", icon: Heart, color: "text-teal-500", bg: "bg-teal-500/5" }
];

export const AIPet = () => {
  const { user, updateResources, isStudent } = useAuth();
  const location = useLocation();
  const [searchParams] = useSearchParams();
  const isRankPage = location.pathname.includes('leaderboard');
  const activeTab = searchParams.get('tab') || 'diamonds';
  const [isOpen, setIsOpen] = useState(false);
  const [showRules, setShowRules] = useState(false);
  const [isWaving, setIsWaving] = useState(false);
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

  const { currentLevel } = useMemo(() => getUserLevelAndXP(user), [user]);

  const petStageLevel = useMemo(() => {
    if (currentLevel < 5) return 0;
    if (currentLevel < 10) return 1;
    if (currentLevel < 20) return 2;
    if (currentLevel < 30) return 3;
    return 4;
  }, [currentLevel]);

  const chatCost = Math.ceil(5 * Math.pow(1.1, petStageLevel));

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
    if (isOpen) {
      scrollToBottom();
    }
  }, [messages, isOpen]);

  const handleOpen = () => {
    playSound('popOpen');
    setCurrentTip(null);
    setIsOpen(true);
  };

  const handleClose = () => {
    playSound('popClose');
    setIsOpen(false);
  };

  // Wave or show tip every now and then to grab attention
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
      }, 25000); // Check every 25s
      return () => clearInterval(interval);
    }
  }, [isOpen, user]);

  const handleSend = async (e?: React.FormEvent) => {
    e?.preventDefault();
    if (!inputValue.trim() || isTyping) return;

    if (user.coins < chatCost) {
      toast.error(`Nova is hungry! You need at least ${chatCost} coins to chat.`, { icon: '🪙' });
      return;
    }

    if (inputValue.length > 300) {
      toast.error("Message is too long! Keep it under 300 characters to save energy.");
      return;
    }

    if (isStudent && !window.confirm(`Chatting with Nova costs ${chatCost} coins. Are you sure?`)) {
        return;
    }

    const newStr = inputValue.trim();
    setInputValue('');
    
    // Deduct coins first optimistically
    if (isStudent) {
      walletService.spendCoins(user.id, chatCost, 'spend', 'AI Ace Interaction').catch(err => {
        console.warn("Background coin spend failed (quota limit?): ", err);
      });
      
      updateResources({ coins: Math.max(0, (user.coins || 0) - chatCost) });
      
      // Visual feedback for coin deduction
      toast.success(`-${chatCost} Coins`, { 
        icon: '🪙',
        style: {
          borderRadius: '10px',
          background: '#333',
          color: '#fff',
        },
      });
    }

    // Add user message locally
    const newMessages = [...messages, { role: 'user' as const, text: newStr }];
    setMessages(newMessages);
    setIsTyping(true);
    playSound('click');

    // Reactions based on input keywords
    if (newStr.toLowerCase().includes('help') || newStr.toLowerCase().includes('stuck')) {
        setIsWaving(true);
        setTimeout(() => setIsWaving(false), 2000);
    }

    // Format for Gemini API - Limit history to last 6 messages to save quota/tokens
    const apiMessages = newMessages.slice(-6).map(m => ({
      role: m.role,
      parts: [{ text: m.text }]
    }));

    playSound('thinking');
    // Call API
    try {
      const responseText = await chatWithAI(apiMessages);
      if (isMounted.current) {
        setMessages(prev => [...prev, { role: 'model', text: responseText }]);
      }
    } catch (err) {
      if (isMounted.current) {
        toast.error("AI connection failed. Coins were still deducted for the attempt.");
      }
    } finally {
      if (isMounted.current) {
        setIsTyping(false);
        playSound('notification');
      }
    }
  };

  if (!isStudent) return null;

  return (
    <>
       <motion.div 
         className="fixed right-4 md:right-8 z-[1050] flex justify-end"
         animate={{
           bottom: isRankPage ? (window.innerWidth < 768 ? 92 : 112) : (window.innerWidth < 768 ? 92 : 112),
           y: isRankPage ? -150 : 0
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
              </motion.button>
            </motion.div>
          ) : (
            <motion.div
              key="chat-window"
              initial={{ opacity: 0, scale: 0.9, y: 20, transformOrigin: 'bottom right' }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              transition={{ type: "spring", stiffness: 400, damping: 30 }}
              className="absolute bottom-0 right-0 sm:right-0 w-[calc(100vw-32px)] sm:w-[400px] h-[600px] max-h-[80vh] bg-bg-surface rounded-[2.5rem] shadow-premium border border-white/5 flex flex-col overflow-hidden origin-bottom-right"
            >
              {/* Header */}
              <div className={cn("p-6 text-text-primary flex justify-between items-center shrink-0 border-b border-white/5 bg-white/[0.02]")}>
                <div className="flex items-center gap-4">
                  <div className={cn("p-3 rounded-2xl flex items-center justify-center text-bg-main shadow-lg", petStage.color)}>
                    <petStage.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black tracking-tight text-base uppercase">{petStage.name}</h3>
                    <div className="text-[9px] text-text-muted font-black flex items-center gap-2 uppercase tracking-[0.2em] opacity-60">
                      <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse shadow-[0_0_8px_rgba(16,185,129,0.4)]" /> Level {currentLevel} • Active
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
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

              {/* Chat Area */}
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
                
                <form onSubmit={handleSend} className="flex gap-3">
                  <div className="relative flex-1 group">
                    <input 
                      type="text" 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={`Transmit signal...`}
                      className="w-full bg-white/[0.03] border border-white/10 rounded-2xl pl-5 pr-14 py-4 text-sm focus:outline-none focus:border-brand-gold/50 transition-all font-medium placeholder:text-text-muted/30 shadow-inner"
                      disabled={isTyping}
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
                    disabled={!inputValue.trim() || isTyping}
                    className="bg-brand-gold hover:brightness-110 disabled:opacity-50 disabled:grayscale text-bg-main px-6 rounded-2xl transition-all flex items-center justify-center shadow-xl active:scale-95 group/send"
                  >
                    <Send className="w-5 h-5 group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform" />
                  </button>
                </form>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      <style>{`
        .tooltip-triangle::before {
          content: '';
          position: absolute;
          bottom: -6px;
          right: 12px;
          border-width: 6px 6px 0;
          border-style: solid;
          border-color: white transparent transparent transparent;
          display: block;
          width: 0;
        }
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
};

