import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "motion/react";
import { useAuth } from "../context/AuthContext";
import { walletService, userService } from "../services/dbProvider";
import { Gem, Coins, Pickaxe, Sparkles } from "lucide-react";
import toast from "react-hot-toast";
import { cn } from "../lib/utils";
import { playNotificationSound } from "../lib/audio";
import { ConfirmModal } from "./ui/ConfirmModal";
import { Button } from "./CommonUI";

export const ResourceCollector = React.memo(() => {
  const { user, updateResources } = useAuth();
  const [loading, setLoading] = useState(false);
  const [collected, setCollected] = useState(false);
  const [showResetConfirm, setShowResetConfirm] = useState(false);

  // Calculate collection state based on last reward timing
  const [timeLeft, setTimeLeft] = useState<string>("");
  const [canCollect, setCanCollect] = useState(false);

  const isMounted = React.useRef(true);

  useEffect(() => {
    isMounted.current = true;
    return () => {
      isMounted.current = false;
    };
  }, []);

  useEffect(() => {
    if (!user) return;

    const checkStatus = () => {
      if (!isMounted.current) return;
      const now = Date.now();

      const nextTime = user.nextCollectionAt
        ? new Date(user.nextCollectionAt).getTime()
        : 0;

      if (now >= nextTime) {
        setCanCollect(true);
        setTimeLeft("Ready to Collect!");
      } else {
        setCanCollect(false);
        const msLeft = nextTime - now;
        const h = Math.floor(msLeft / (1000 * 60 * 60));
        const m = Math.floor((msLeft % (1000 * 60 * 60)) / (1000 * 60));
        setTimeLeft(`${h}h ${m}m`);
      }
    };

    checkStatus();
    const timer = setInterval(checkStatus, 60000); // Check every minute
    return () => clearInterval(timer);
  }, [user?.id, user?.nextCollectionAt]);

  const handleCollect = async () => {
    if (!user || loading || !canCollect) return;

    setLoading(true);
    try {
      const serverResult = await walletService.claimCollectorReward(user.id);

      const {
        coins: coinsAmount,
        diamonds: diamondsAmount,
        tier: tierName,
      } = serverResult;

      const nextTime = new Date(Date.now() + 12 * 60 * 60 * 1000);
      updateResources({
        coins: (user.coins || 0) + coinsAmount,
        diamonds: (user.diamonds || 0) + diamondsAmount,
        lastCollectionAt: new Date().toISOString(),
        nextCollectionAt: nextTime.toISOString(),
      });
      playNotificationSound();

      const message =
        tierName === "Common"
          ? `Collected ${coinsAmount} Coins`
          : `[${tierName}] Found ${coinsAmount} Coins & ${diamondsAmount} Diamonds!`;

      toast.success(message, {
        icon: tierName === "Epic" ? "🔥" : tierName === "Rare" ? "✨" : "⛏️",
        duration: 4000,
      });

      if (isMounted.current) {
        setCollected(true);
        setTimeout(() => {
          if (isMounted.current) setCollected(false);
        }, 3000);
        setLoading(false);
      }
    } catch (e: any) {
      if (isMounted.current) {
        toast.error(e.message || "Failed to collect resources.");
        setLoading(false);
      }
    }
  };

  const handleFastReset = async () => {
    if (!user || loading || canCollect) return;
    const resetCost = 3;

    if ((user.diamonds || 0) < resetCost) {
      toast.error(`You need ${resetCost} Diamonds for an Instant Reset!`);
      return;
    }

    setLoading(true);
    try {
      await walletService.resetCollector(user.id);

      updateResources({
        diamonds: (user.diamonds || 0) - 3,
        lastCollectionAt: undefined,
        nextCollectionAt: undefined,
      });
      toast.success("Collector Reset! Ready to mine.");

      if (isMounted.current) setLoading(false);
    } catch (e: any) {
      if (isMounted.current) {
        toast.error(e.message || "Failed to reset.");
        setLoading(false);
      }
    }
  };

  if (!user) return null;

  return (
    <div className="card-premium p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sm:gap-6 relative overflow-hidden group">
      <div className="absolute right-0 top-0 w-32 h-32 bg-brand-gold/5 rounded-full blur-3xl group-hover:bg-brand-gold/10 transition-all duration-700 pointer-events-none" />

      <div className="flex items-center gap-3 relative z-10 flex-shrink min-w-0 w-full">
        <div className="w-10 h-10 sm:w-12 sm:h-12 bg-navy-800 text-brand-gold rounded-xl flex items-center justify-center shrink-0 border border-brand-gold/20 shadow-soft">
          <Pickaxe size={18} className="sm:w-6 sm:h-6" />
        </div>
        <div className="min-w-0 flex-1">
          <h3 className="text-sm sm:text-base font-bold text-text-primary tracking-tight">
            Resource Collector
          </h3>
          <p className="text-[11px] sm:text-[12px] font-black uppercase tracking-wider mt-0.5">
            Status:{" "}
            <span
              className={cn(
                "inline-block px-1.5 py-0.5 rounded",
                canCollect ? "text-success bg-success/10" : "text-brand-gold bg-brand-gold/10",
              )}
            >
              {timeLeft}
            </span>
          </p>
        </div>
      </div>

      <div className="flex items-center gap-2 relative z-10 shrink-0 w-full sm:w-auto justify-end mt-2 sm:mt-0">
        <AnimatePresence mode="wait">
          {collected ? (
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="flex items-center justify-center gap-1.5 px-3 py-1.5 bg-success/10 text-success border border-success/20 rounded-lg font-bold text-[10px] sm:text-xs whitespace-nowrap w-24"
            >
              <Sparkles size={12} /> Success
            </motion.div>
          ) : (
            <div className="flex flex-col items-center gap-1.5 w-full sm:w-24">
              <Button
                variant={canCollect ? "gold" : "outline"}
                size="sm"
                onClick={handleCollect}
                disabled={!canCollect || loading}
                className="uppercase tracking-widest text-[8px] sm:text-[9px] font-black px-2 py-1.5 min-h-[0px] h-auto whitespace-nowrap w-full"
              >
                {loading ? "Mining..." : canCollect ? "Collect" : "Locked"}
              </Button>

              {!canCollect && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowResetConfirm(true)}
                  disabled={loading}
                  className="flex items-center justify-center gap-1 group/reset border-brand-gold/20 text-brand-gold hover:bg-brand-gold/10 px-2 py-1.5 min-h-[0px] h-auto text-[8px] sm:text-[9px] uppercase font-black tracking-widest whitespace-nowrap w-full"
                >
                  <Gem
                    size={10}
                    className="sm:w-2.5 sm:h-2.5 group-hover/reset:rotate-12 transition-transform"
                  />
                  Reset
                </Button>
              )}
            </div>
          )}
        </AnimatePresence>
      </div>

      <ConfirmModal
        isOpen={showResetConfirm}
        onClose={() => setShowResetConfirm(false)}
        onConfirm={handleFastReset}
        title="Reset Collector"
        message="Spend 3 Diamonds to reset the collector immediately? This will bypass the 12-hour recovery period."
        confirmText="Reset Now"
        variant="warning"
      />
    </div>
  );
});
