import React, { useState } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { useAuth } from '../context/AuthContext';
import { MessageSquare, Sparkles, X, Send, Bot, HelpCircle } from 'lucide-react';
import { generateMissionTemplate } from '../services/aiService';
import { toast } from 'react-hot-toast';
import { dbService } from '../services/dbProvider';

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
      await dbService.createAssignmentTemplate({
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
    <div className="fixed bottom-28 left-6 z-[60]">
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8, y: 20 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.8, y: 20 }}
            className="mb-4 w-80 bg-bg-surface rounded-3xl shadow-2xl border border-brand-gold/20 overflow-hidden flex flex-col"
          >
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 p-4 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bot className="text-bg-main w-5 h-5" />
                <span className="text-bg-main font-bold">Admin Guru</span>
              </div>
              <button onClick={() => setIsOpen(false)} className="text-bg-main/80 hover:text-bg-main">
                <X size={20} />
              </button>
            </div>
            
            <div className="p-4 max-h-[400px] overflow-y-auto space-y-4">
              {!response ? (
                <div className="text-sm text-text-secondary bg-brand-gold-secondary-hover p-3 rounded-2xl">
                  Hello Commander! 👋 I can help you create **Mission Templates** in seconds. Just tell me a topic!
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="text-sm text-text-secondary bg-bg-main p-3 rounded-2xl border border-border-main whitespace-pre-wrap">
                    {response}
                  </div>
                  <button
                    onClick={saveTemplate}
                    className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-600 text-bg-main py-2 rounded-xl text-sm font-bold shadow-md hover:from-emerald-600 hover:to-teal-700 transition"
                  >
                    <Sparkles size={14} />
                    Save as Template
                  </button>
                </div>
              )}
              
              {loading && (
                <div className="flex items-center gap-2 text-brand-gold text-sm animate-pulse">
                  <Sparkles className="w-4 h-4" />
                  Thinking...
                </div>
              )}
            </div>

            <div className="p-4 border-t border-border-main bg-bg-main">
              <div className="relative">
                <input
                  type="text"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  placeholder="Ask for a template (e.g. 'Photosynthesis')"
                  className="w-full pl-4 pr-12 py-3 bg-bg-surface rounded-2xl border border-border-main focus:outline-none focus:ring-2 focus:ring-indigo-500 text-sm"
                  onKeyPress={(e) => e.key === 'Enter' && handleGenerateTemplate()}
                />
                <button
                  onClick={handleGenerateTemplate}
                  disabled={loading || !prompt}
                  className="absolute right-2 top-1.5 p-2 bg-brand-gold-hover text-bg-main rounded-xl disabled:opacity-50 hover:bg-indigo-700 transition"
                >
                  <Send size={16} />
                </button>
              </div>
              {response && (
                <button 
                  onClick={() => { setResponse(null); setPrompt(''); }}
                  className="mt-2 text-xs text-brand-gold font-bold hover:underline"
                >
                  Clear & Ask again
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
        onClick={() => setIsOpen(!isOpen)}
        className="w-16 h-16 bg-bg-surface rounded-full shadow-xl border-4 border-indigo-500 flex items-center justify-center relative group"
      >
        <div className="absolute -top-2 -right-2 bg-brand-gold-hover text-bg-main p-1 rounded-lg text-[10px] font-black uppercase tracking-tighter opacity-0 group-hover:opacity-100 transition-opacity">
          Help
        </div>
        <Bot className="w-8 h-8 text-brand-gold" />
        <motion.div
           animate={{
             scale: [1, 1.2, 1],
             opacity: [0.5, 1, 0.5],
           }}
           transition={{ duration: 2, repeat: Infinity }}
           className="absolute inset-0 rounded-full bg-brand-gold-secondary-hover -z-10"
        />
      </motion.button>
    </div>
  );
};
