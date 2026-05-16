import React, { useState, useRef, useEffect, useMemo } from 'react';
import { useLocation, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'motion/react';
import { Bot, X, Send, Sparkles, Lightbulb, Coffee, Brain, Heart, Zap, Flame, Smile, Coins, Trophy, BookOpen } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { chatWithAI } from '../services/aiService';
import Markdown from 'react-markdown';
import { cn, getUserLevelAndXP } from '../lib/utils';
import { useSound } from '../hooks/useSound';
import { dbService } from '../services/dbProvider';
import { toast } from 'react-hot-toast';
import { RulesModal } from './RulesModal';

const TIPS = [
  { text: "Take a 5-minute break every hour!", icon: Coffee, color: "text-brand-gold", bg: "bg-brand-gold/10" },
  { text: "Drink some water to stay hydrated.", icon: Heart, color: "text-blue-500", bg: "bg-blue-50" },
  { text: "Each message costs 5 coins. Use them wisely!", icon: Coins, color: "text-amber-500", bg: "bg-brand-gold/10" },
  { text: "Did you know? Nova grows as you level up!", icon: Trophy, color: "text-purple-500", bg: "bg-purple-50" },
  { text: "Stuck? Try explaining the problem out loud.", icon: Lightbulb, color: "text-yellow-500", bg: "bg-yellow-50" },
  { text: "Don't forget to review your notes today.", icon: Zap, color: "text-rose-500", bg: "bg-rose-500/10" },
  { text: "Focus on progress, not perfection.", icon: Smile, color: "text-emerald-500", bg: "bg-success-green/10" },
  { text: "Nova's memory is short. Keep chats focused!", icon: Sparkles, color: "text-brand-gold", bg: "bg-brand-gold-secondary-hover" },
  { text: "Take a deep breath and relax.", icon: Heart, color: "text-teal-500", bg: "bg-teal-50" }
];

export const AIPet = () => {
  const { user, updateResources } = useAuth();
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

  const isStudent = user?.role === 'student';

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
    if (!isOpen && user?.role === 'student') {
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

    if (user.role === 'student' && !window.confirm(`Chatting with Nova costs ${chatCost} coins. Are you sure?`)) {
        return;
    }

    const newStr = inputValue.trim();
    setInputValue('');
    
    // Deduct coins first optimistically
    if (user.role === 'student') {
      dbService.spendCoins(user.id, chatCost, 'spend', 'AI Ace Interaction').catch(err => {
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
      setMessages(prev => [...prev, { role: 'model', text: responseText }]);
    } catch (err) {
      toast.error("AI connection failed. Coins were still deducted for the attempt.");
    } finally {
      setIsTyping(false);
      playSound('notification');
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
                  className="absolute bottom-full right-0 mb-6 bg-bg-surface text-text-primary border border-border-main px-4 py-3 rounded-2xl shadow-2xl text-xs font-bold z-20 tooltip-triangle-tip flex items-start gap-3 w-56 sm:w-64"
                >
                  <motion.div 
                    animate={{ rotate: [0, 15, -15, 0] }} 
                    transition={{ duration: 1, repeat: Infinity, repeatDelay: 2 }}
                    className="shrink-0 pt-0.5"
                  >
                    <currentTip.icon className={cn("w-5 h-5", currentTip.color || "text-amber-500")} />
                  </motion.div>
                  <span className="leading-snug">{currentTip.text}</span>
                </motion.div>
              )}

              <motion.button
                whileHover={{ scale: 1.1 }}
                whileTap={{ scale: 0.9 }}
                onClick={handleOpen}
                className={cn(
                  "relative bg-gradient-to-br text-bg-main p-4 rounded-full shadow-2xl transition-all border-4 border-white flex items-center justify-center",
                  petStage.color
                )}
              >
                <div className="absolute inset-0 bg-bg-surface/20 rounded-full blur-sm" />
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
                <div className="absolute -bottom-2 -left-2 bg-brand-gold-hover text-bg-main text-[10px] h-6 w-6 rounded-full flex items-center justify-center font-black border-2 border-white shadow-lg z-20">
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
              className="absolute bottom-0 right-0 sm:right-0 w-[calc(100vw-32px)] sm:w-[380px] h-[550px] max-h-[75vh] bg-bg-surface rounded-[32px] shadow-[0_20px_50px_rgba(0,0,0,0.3)] border border-border-main flex flex-col overflow-hidden origin-bottom-right"
            >
              {/* Header */}
              <div className={cn("p-5 text-bg-main flex justify-between items-center shrink-0 bg-gradient-to-r", petStage.color)}>
                <div className="flex items-center gap-3">
                  <div className="bg-white/20 p-2.5 rounded-2xl backdrop-blur-md border border-white/10">
                    <petStage.icon className="w-6 h-6" />
                  </div>
                  <div>
                    <h3 className="font-black tracking-tight">{petStage.name}</h3>
                    <div className="text-[10px] text-white/80 font-bold flex items-center gap-1 uppercase tracking-wider">
                      <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Level {currentLevel} • Active
                    </div>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowRules(true)}
                    className="bg-white/10 px-2.5 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 hover:bg-white/20 transition-all text-white border border-white/10 uppercase tracking-widest"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> <span className="hidden sm:inline">Rules</span>
                  </button>
                  <div className="bg-white/10 px-2.5 py-1.5 rounded-xl text-[10px] font-black flex items-center gap-1.5 border border-white/10">
                    <Coins className="w-3.5 h-3.5" /> {user.coins}
                  </div>
                  <button
                    onClick={handleClose}
                    className="p-2 hover:bg-white/10 rounded-full transition-all"
                  >
                    <X className="w-5 h-5 text-white" />
                  </button>
                </div>
              </div>

              {/* Chat Area */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-bg-main bg-[radial-gradient(#e5e7eb_1px,transparent_1px)] [background-size:24px_24px]">
                {messages.map((msg, idx) => (
                  <div key={idx} className={cn("flex", msg.role === 'user' ? "justify-end" : "justify-start")}>
                    <div className={cn(
                      "max-w-[85%] rounded-2xl p-4 text-sm whitespace-pre-wrap shadow-sm",
                      msg.role === 'user' 
                        ? "bg-brand-gold-hover text-bg-main rounded-tr-sm font-medium" 
                        : "bg-bg-surface text-text-primary rounded-tl-sm border border-border-main"
                    )}>
                       {msg.role === 'model' ? (
                         <div className="markdown-prose max-w-none text-[13px] leading-relaxed break-words">
                            <Markdown>{msg.text}</Markdown>
                         </div>
                       ) : msg.text}
                    </div>
                  </div>
                ))}
                {isTyping && (
                  <div className="flex justify-start">
                    <div className="bg-bg-surface border border-border-main rounded-2xl px-4 py-3 rounded-tl-sm shadow-sm flex items-center gap-2">
                       <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
                       <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-brand-gold rounded-full" />
                       <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.5, 1, 0.5] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-indigo-400 rounded-full" />
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="p-4 bg-bg-surface border-t border-border-main shrink-0">
                <form onSubmit={handleSend} className="flex gap-2">
                  <div className="relative flex-1">
                    <input 
                      type="text" 
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder={`Costs ${chatCost} coins...`}
                      className="w-full bg-bg-main border border-border-main rounded-2xl pl-4 pr-12 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 transition-all font-medium"
                      disabled={isTyping}
                    />
                    <div className={cn(
                      "absolute right-3 top-1/2 -translate-y-1/2 text-[10px] font-black tracking-tighter opacity-50",
                      inputValue.length > 250 ? "text-amber-500 opacity-100" : "text-text-secondary"
                    )}>
                      {inputValue.length}/300
                    </div>
                  </div>
                  <button 
                    type="submit"
                    disabled={!inputValue.trim() || isTyping}
                    className="bg-brand-gold-hover hover:bg-brand-gold disabled:opacity-50 disabled:cursor-not-allowed text-bg-main px-4 rounded-2xl transition-all flex items-center justify-center shadow-lg active:scale-95"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </form>
                <div className="flex items-center justify-center gap-4 mt-3">
                   <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest flex items-center gap-1">
                     <Coins className="w-3 h-3 text-brand-gold" /> {chatCost} COINS
                   </p>
                   <div className="w-1 h-1 bg-border-main rounded-full" />
                   <p className="text-[10px] text-text-secondary font-black uppercase tracking-widest flex items-center gap-1">
                     <Sparkles className="w-3 h-3 text-indigo-400" /> AI POWERED
                   </p>
                </div>
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

