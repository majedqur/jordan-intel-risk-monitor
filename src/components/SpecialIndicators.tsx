import React from 'react';
import { SpecialIndicator } from '../types';
import { motion } from 'motion/react';
import { Zap, ShieldAlert, TrendingUp, AlertCircle, Activity, RefreshCw, Info } from 'lucide-react';
import { cn } from '../lib/utils';
import { IndicatorSkeleton } from './Skeleton';

interface SpecialIndicatorsProps {
  indicators: SpecialIndicator[];
  title: string;
  relativeTime?: string;
  onRefresh?: () => void;
  loading?: boolean;
}

export const SpecialIndicators: React.FC<SpecialIndicatorsProps> = ({ 
  indicators = [], 
  title, 
  relativeTime,
  onRefresh,
  loading = false
}) => {
  return (
    <div className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 p-6 rounded-3xl space-y-6 shadow-2xl shadow-black/50">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <Activity size={18} className="text-red-500" />
          <h3 className="text-zinc-100 text-sm font-black uppercase tracking-widest">{title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {onRefresh && (
            <button 
              onClick={onRefresh}
              disabled={loading}
              className="p-1.5 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-all disabled:opacity-50"
            >
              <RefreshCw size={14} className={cn(loading && "animate-spin")} />
            </button>
          )}
          {relativeTime && (
            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{relativeTime}</span>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4">
        {loading && indicators.length === 0 ? (
          Array.from({ length: 3 }).map((_, i) => (
            <IndicatorSkeleton key={`skeleton-${i}`} />
          ))
        ) : indicators.length === 0 ? (
          <div className="py-12 flex flex-col items-center justify-center text-center space-y-3 bg-zinc-800/20 rounded-2xl border border-dashed border-zinc-800">
            <AlertCircle size={32} className="text-zinc-700" />
            <p className="text-xs text-zinc-500 font-bold uppercase tracking-widest">
              {loading ? "جاري تحليل البيانات الاستخباراتية..." : "لا توجد مؤشرات نشطة حالياً"}
            </p>
          </div>
        ) : (
          indicators.map((indicator, index) => (
            <motion.div
              key={indicator.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.1 }}
              className={cn(
                "bg-zinc-800/30 border p-4 rounded-2xl space-y-3 group hover:bg-zinc-800/50 transition-all relative overflow-hidden",
                indicator.status === 'critical' ? "border-red-500/30 shadow-[0_0_20px_rgba(239,68,68,0.1)]" : "border-zinc-700/50"
              )}
            >
              {/* Status Glow / Indicator */}
              <div className={cn(
                "absolute top-0 right-0 w-1 h-full",
                indicator.status === 'critical' ? "bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.5)]" :
                indicator.status === 'high' ? "bg-orange-500" :
                indicator.status === 'moderate' ? "bg-yellow-500" :
                "bg-emerald-500"
              )} />

              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <motion.div 
                    animate={indicator.status === 'critical' ? { scale: [1, 1.1, 1] } : {}}
                    transition={{ repeat: Infinity, duration: 2 }}
                    className={cn(
                      "p-2 rounded-xl transition-all duration-500",
                      indicator.label.includes('طاقة') ? "bg-yellow-500/10 text-yellow-500" :
                      indicator.label.includes('إطلاق') ? "bg-blue-500/10 text-blue-500" :
                      indicator.label.includes('اقتصاد') ? "bg-emerald-500/10 text-emerald-500" :
                      "bg-zinc-500/10 text-zinc-500",
                      indicator.status === 'critical' && "bg-red-500/20 text-red-500"
                    )}
                  >
                    {indicator.label.includes('طاقة') ? <Zap size={indicator.status === 'critical' ? 22 : indicator.status === 'high' ? 18 : 16} /> : 
                     indicator.label.includes('إطلاق') ? <ShieldAlert size={indicator.status === 'critical' ? 22 : indicator.status === 'high' ? 18 : 16} /> : 
                     indicator.label.includes('اقتصاد') ? <TrendingUp size={indicator.status === 'critical' ? 22 : indicator.status === 'high' ? 18 : 16} /> : 
                     <AlertCircle size={indicator.status === 'critical' ? 22 : indicator.status === 'high' ? 18 : 16} />}
                  </motion.div>
                  <div className="flex flex-col">
                    <span className="text-xs font-black text-zinc-100 uppercase tracking-tight">{indicator.label}</span>
                    <span className="text-[9px] text-zinc-500 font-bold uppercase tracking-widest">ID: {indicator.id}</span>
                  </div>
                </div>
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-[9px] font-black uppercase tracking-widest border",
                  indicator.status === 'critical' ? "bg-red-500 text-white border-red-500 animate-pulse" :
                  indicator.status === 'high' ? "bg-orange-500/10 text-orange-500 border-orange-500/20" :
                  indicator.status === 'moderate' ? "bg-yellow-500/10 text-yellow-500 border-yellow-500/20" :
                  "bg-emerald-500/10 text-emerald-500 border-emerald-500/20"
                )}>
                  {indicator.status}
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-black text-zinc-500 uppercase tracking-widest">الاحتمالية الميدانية</span>
                  <div className="flex items-center gap-2">
                    <motion.span 
                      initial={{ scale: 0.5, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      className={cn(
                        "text-sm font-black font-mono",
                        indicator.probability > 70 ? "text-red-500" :
                        indicator.probability > 40 ? "text-orange-500" :
                        "text-emerald-500"
                      )}
                    >
                      {indicator.probability}%
                    </motion.span>
                  </div>
                </div>
                <div className="w-full h-2 bg-black/40 rounded-full overflow-hidden border border-zinc-800/50">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${indicator.probability}%` }}
                    transition={{ type: "spring", stiffness: 50, damping: 15, delay: index * 0.2 }}
                    className={cn(
                      "h-full rounded-full relative",
                      indicator.probability > 70 ? "bg-gradient-to-r from-red-600 to-red-400" :
                      indicator.probability > 40 ? "bg-gradient-to-r from-orange-600 to-orange-400" :
                      "bg-gradient-to-r from-emerald-600 to-emerald-400"
                    )}
                  >
                    <motion.div 
                      animate={{ x: ["0%", "100%"], opacity: [0, 1, 0] }}
                      transition={{ repeat: Infinity, duration: 1.5, ease: "linear" }}
                      className="absolute inset-0 bg-white/20 w-1/2 skew-x-12"
                    />
                  </motion.div>
                </div>
              </div>

              <div className="bg-black/30 rounded-xl p-3 border border-zinc-800/50 group-hover:border-zinc-700/50 transition-colors">
                <div className="flex items-center gap-2 mb-1.5">
                  <Info size={12} className="text-zinc-500" />
                  <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">التحليل الاستخباراتي</span>
                </div>
                <p className="text-[11px] text-zinc-400 leading-relaxed font-bold italic">
                  "{indicator.description || "جاري تحليل البيانات الميدانية..."}"
                </p>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};
