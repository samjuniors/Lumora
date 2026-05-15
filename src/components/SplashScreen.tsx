import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { Logo } from './Logo';

export const SplashScreen = () => {
    const [isVisible, setIsVisible] = useState(false);

    useEffect(() => {
        // Force visible after a short delay
        const timer = setTimeout(() => setIsVisible(true), 50);
        
        // Auto-hide fallback after 12s max
        const hideTimer = setTimeout(() => {
            const splash = document.getElementById('splash-screen');
            if (splash) {
                splash.style.opacity = '0';
                setTimeout(() => splash.remove(), 500);
            }
        }, 12000);

        return () => {
            clearTimeout(timer);
            clearTimeout(hideTimer);
        };
    }, []);

    if (!isVisible) return null;

    return (
        <AnimatePresence>
            <motion.div 
                key="splash"
                id="splash-screen"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.4, ease: "easeInOut" }}
                className="fixed inset-0 bg-bg-main z-[9999] flex flex-col items-center justify-center overflow-hidden antialiased font-sans"
            >
                <div className="absolute inset-0 bg-grid-pattern opacity-[0.02] pointer-events-none" />

                <div className="relative w-full max-w-sm flex flex-col items-center z-10 px-6">
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                        className="w-40 md:w-48 mb-10"
                    >
                        <Logo className="w-full h-auto text-brand-gold drop-shadow-md" />
                    </motion.div>
                    
                    <motion.div 
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2, duration: 0.6 }}
                        className="flex flex-col items-center w-full"
                    >
                        {/* Minimal Load Line */}
                        <div className="w-48 h-[2px] bg-border-main rounded-full overflow-hidden relative mb-6">
                            <motion.div 
                                initial={{ x: "-100%" }}
                                animate={{ x: ["-100%", "100%"] }}
                                transition={{ 
                                    duration: 1.5, 
                                    ease: "easeInOut",
                                    repeat: Infinity
                                }}
                                className="absolute inset-0 h-full w-full bg-brand-gold"
                            />
                        </div>
                        
                        <p className="text-[11px] font-medium text-text-secondary uppercase tracking-[0.3em]">
                            Loading Experience
                        </p>
                    </motion.div>
                </div>
            </motion.div>
        </AnimatePresence>
    );
};
