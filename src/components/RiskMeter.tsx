import React from 'react';
import { motion } from 'motion/react';
import { cn } from '../lib/utils';

interface RiskMeterProps {
  score: number;
  trend: 'rising' | 'stable' | 'falling';
  className?: string;
  loading?: boolean;
}

export const RiskMeter: React.FC<RiskMeterProps> = ({ score, trend, className, loading = false }) => {
  const safeScore = isNaN(score) ? 0 : Math.max(0, Math.min(100, score));
  const trendLabels = { rising: 'متزايد', stable: 'مستقر', falling: 'متناقص' };

  const getTrendColor = () => {
    if (safeScore > 75) return 'text-red-500';
    if (safeScore > 50) return 'text-orange-500';
    if (safeScore > 25) return 'text-yellow-500';
    return 'text-emerald-500';
  };

  const getBgColor = () => {
    if (safeScore > 75) return 'bg-red-500';
    if (safeScore > 50) return 'bg-orange-500';
    if (safeScore > 25) return 'bg-yellow-500';
    return 'bg-emerald-500';
  };

  return (
    <div className={cn("w-full space-y-4 relative", className, loading && "animate-pulse")}>
      {loading && (
        <div className="absolute -inset-4 bg-red-500/5 rounded-3xl blur-2xl animate-pulse -z-10" />
      )}
      <div className="flex items-end justify-between">
        <div className="space-y-1">
          <span className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">مؤشر المخاطر</span>
          <div className="flex items-baseline gap-2">
            <motion.span 
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              className={cn("text-5xl font-black tracking-tighter", getTrendColor())}
            >
              {Math.round(safeScore)}
            </motion.span>
            <span className="text-zinc-600 font-bold text-xs uppercase tracking-widest">/ 100</span>
          </div>
        </div>
        
        <div className={cn(
          "px-3 py-1 rounded-lg text-[10px] font-bold uppercase tracking-widest border transition-all duration-500",
          trend === 'rising' ? "bg-red-500/5 text-red-500 border-red-500/20" :
          trend === 'falling' ? "bg-emerald-500/5 text-emerald-500 border-emerald-500/20" :
          "bg-zinc-500/5 text-zinc-500 border-zinc-500/20"
        )}>
          {trendLabels[trend]}
        </div>
      </div>

      <div className="relative h-2 bg-zinc-900 rounded-full overflow-hidden">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${safeScore}%` }}
          transition={{ duration: 1.5, ease: "circOut" }}
          className={cn(
            "h-full transition-all duration-1000",
            getBgColor()
          )}
        />
      </div>
    </div>
  );
};
