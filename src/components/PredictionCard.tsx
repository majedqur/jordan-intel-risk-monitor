import React from 'react';
import { RiskPrediction } from '../types';
import { motion } from 'motion/react';
import { Calendar, CheckCircle2, History, AlertCircle } from 'lucide-react';
import { cn } from '../lib/utils';

interface PredictionCardProps {
  prediction: RiskPrediction;
  relativeTime: string;
}

export const PredictionCard: React.FC<PredictionCardProps> = ({ prediction, relativeTime }) => {
  const t = {
    title: "توقعات الذكاء الاصطناعي",
    timeframe: "المدى",
    days: "أيام",
    forecast: "التوقعات المستقبلية",
    lastUpdate: "تحديث"
  };

  const isAnalyzing = !prediction?.forecast || 
                      prediction.forecast.includes("جاري") || 
                      prediction.forecast.includes("يرجى الانتظار");

  return (
    <motion.div 
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      className="bg-zinc-900/40 backdrop-blur-md border border-zinc-800 rounded-3xl p-5 space-y-4 relative overflow-hidden group hover:border-red-500/30 transition-all duration-500"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-red-500/10 text-red-500 rounded-lg">
            <Calendar size={14} />
          </div>
          <h3 className="text-[10px] font-black uppercase tracking-[0.2em] text-zinc-400">{t.title}</h3>
        </div>
        <div className="flex items-center gap-2">
          {relativeTime && (
            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{relativeTime}</span>
          )}
          <div className="px-2 py-0.5 bg-zinc-800 rounded-full flex items-center gap-1">
            <span className="text-[9px] font-bold text-zinc-500 uppercase">{t.timeframe}:</span>
            <span className="text-[9px] font-black text-red-500">{prediction?.timeframeDays || 7} {t.days}</span>
          </div>
        </div>
      </div>

      <div className="space-y-3">
        <p className={cn(
          "text-zinc-200 text-sm leading-relaxed font-bold italic border-r-2 border-red-500/50 pr-3",
          isAnalyzing && "animate-pulse text-zinc-500"
        )}>
          {prediction?.forecast || "جاري التحليل..."}
        </p>
        
        <div className="flex items-center gap-2 text-[9px] text-zinc-500 font-medium bg-zinc-800/30 p-2 rounded-xl">
          <History size={10} className="text-blue-400" />
          <span>{prediction?.previousAccuracy || "قيد التقييم"}</span>
        </div>
      </div>
    </motion.div>
  );
};
