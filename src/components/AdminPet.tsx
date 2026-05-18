import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Sparkles, X, Send, Bot, HelpCircle } from 'lucide-react';
import { generateMissionTemplate } from '../services/aiService';
import { toast } from 'react-hot-toast';
import { adminService, assignmentService } from '../services/dbProvider';

export const AdminPet: React.FC = () => {
  const { user, isAdmin } = useAuth();
  const [isOpen, setIsOpen] = useState(false);
  const [prompt, setPrompt] = useState('');
  const [loading, setLoading] = useState(false);
  const [response, setResponse] = useState<string | null>(null);
  const [lastTemplate, setLastTemplate] = useState<any | null>(null);


  if (!isAdmin) return null;

  const handleGenerateTemplate = async () => {
    if (!prompt) return;
    setLoading(true);
    setResponse(null);
    setLastTemplate(null);
    try {
      const template = await generateMissionTemplate(prompt);
      setLastTemplate(template);
      setResponse(`**Template Concept:**\n\n**Title:** ${template.name}\n\n**Description:** ${template.description}\n\n**Bonus:** ${template.isBonus ? 'Yes' : 'No'}\n\n**Instructions:**\n${template.instructions}`);
      toast.success("Template concept ready!");
    } catch (err) {
      toast.error("Failed to generate template");
    } finally {
      setLoading(false);
    }
  };

  const saveTemplate = async () => {
    if (!lastTemplate) return;
    try {
      await assignmentService.createAssignmentTemplate({
        ...lastTemplate,
        label: `AI: ${lastTemplate.name}`,
        subject: 'General',
        timeLimitMinutes: 0,
        rubric: [],
        creatorId: user?.id,
        createdAt: Date.now()
      });
      toast.success("Saved to Templates library!");
    } catch (err) {
      toast.error("Failed to save template");
    }
  };

  return (
    <div className="fixed bottom-28 left-6 md:left-12 z-[1050]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, x: -20, y: 20, transformOrigin: 'bottom left' }}
            animate={{ opacity: 1, scale: 1, x: 0, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, x: -20, y: 20 }}
            className="mb-8 w-[calc(100vw-48px)] sm:w-80 bg-bg-surface rounded-[2.5rem] shadow-premium border border-white/5 overflow-hidden flex flex-col origin-bottom-left"
          >
            <div className="p-6 text-text-primary flex justify-between items-center bg-white/[0.02] border-b border-white/5">
              <div className="flex items-center gap-3">
                <div className="bg-brand-gold p-2.5 rounded-2xl shadow-lg shadow-brand-gold/20">
                  <Bot className="text-bg-main w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-black tracking-tight text-sm uppercase">Admin Guru</h3>
                  <div className="text-[9px] text-text-muted font-black flex items-center gap-1 uppercase tracking-widest opacity-60">
                    <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse" /> Protocol: Active
                  </div>
                </div>
              </div>
              <button 
                onClick={() => setIsOpen(false)} 
                className="p-2 text-text-muted hover:text-rose-500 hover:bg-rose-500/10 rounded-xl transition-all border border-white/5"
              >
                <X size={16} />
              </button>
            </div>
            
            <div className="p-6 max-h-[400px] overflow-y-auto space-y-6 no-scrollbar">
              {!response ? (
                <div className="text-[13px] text-text-muted bg-white/[0.03] p-5 rounded-[1.5rem] border border-white/5 italic leading-relaxed">
                  Greetings, Commander. I can synthesize **Mission Templates** from raw conceptual data. Provide a Directive.
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="text-[13px] text-text-primary bg-bg-main p-5 rounded-[1.5rem] border border-white/5 whitespace-pre-wrap leading-relaxed shadow-inner">
                    {response}
                  </div>
                  <button
                    onClick={saveTemplate}
                    className="w-full flex items-center justify-center gap-3 bg-emerald-500 hover:bg-emerald-600 text-bg-main py-4 rounded-2xl text-[11px] font-black uppercase tracking-widest shadow-xl shadow-emerald-500/10 transition-all active:scale-[0.98]"
                  >
                    <Sparkles size={16} />
                    Commit to Library
                  </button>
                </div>
              )}
              
              {loading && (
                <div className="flex items-center justify-center py-4">
                   <div className="flex gap-2">
                     <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1 }} className="w-2 h-2 bg-brand-gold rounded-full" />
                     <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.2 }} className="w-2 h-2 bg-brand-gold rounded-full" />
                     <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 1, 0.3] }} transition={{ repeat: Infinity, duration: 1, delay: 0.4 }} className="w-2 h-2 bg-brand-gold rounded-full" />
                   </div>
                </div>
              )}
            </div>

            <div className="p-6 border-t border-white/5 bg-white/[0.01]">
              <div className="relative group">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Direct prompt..."
                  className="w-full pl-5 pr-14 py-4 bg-white/[0.03] border border-white/10 rounded-2xl focus:outline-none focus:border-brand-gold/50 text-sm font-medium placeholder:text-text-muted/30"
                  onKeyPress={(e) => e.key === 'Enter' && handleGenerateTemplate()}
                />
                <button
                  onClick={handleGenerateTemplate}
                  disabled={loading || !prompt}
                  className="absolute right-2.5 top-2 p-2 bg-brand-gold text-bg-main rounded-xl disabled:opacity-30 hover:brightness-110 shadow-lg transition-all"
                >
                  <Send size={18} />
                </button>
              </div>
              {response && (
                <button 
                  onClick={() => { setResponse(null); setPrompt(''); }}
                  className="mt-4 w-full text-[10px] text-brand-gold font-black uppercase tracking-[0.2em] hover:opacity-100 opacity-60 transition-opacity flex items-center justify-center gap-2"
                >
                   <HelpCircle size={12} /> Clear Operational Buffer
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1, rotate: -5 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-20 h-20 bg-bg-surface text-brand-gold rounded-[1.8rem] shadow-premium border-2 border-white/10 flex items-center justify-center relative group overflow-hidden"
      >
        <div className="absolute inset-0 bg-brand-gold/5 group-hover:bg-brand-gold/10 transition-colors" />
        
        <div className="relative z-10 flex flex-col items-center gap-1">
          <Bot className="w-8 h-8 drop-shadow-lg" />
          <span className="text-[8px] font-black uppercase tracking-[0.2em] opacity-40">Root</span>
        </div>

        <motion.div
           animate={{
             scale: [1, 1.2, 1],
             opacity: [0.1, 0.2, 0.1],
           }}
           transition={{ duration: 4, repeat: Infinity }}
           className="absolute inset-0 rounded-full bg-brand-gold -z-10"
        />
      </motion.button>
    </div>
  );
};
