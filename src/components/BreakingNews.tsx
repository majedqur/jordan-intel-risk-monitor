import React, { useState } from 'react';
import { RiskSignal } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Radio, AlertCircle, ChevronLeft, ChevronRight, Maximize2, X, Globe, Calendar, ShieldCheck } from 'lucide-react';
import { cn, formatSignalExactTime, formatSignalRelativeTime } from '../lib/utils';

interface BreakingNewsProps {
  signals: RiskSignal[];
}

export const BreakingNews: React.FC<BreakingNewsProps> = ({ signals }) => {
  const [currentIndex, setCurrentIndex] = useState(0);
  const [selectedSignal, setSelectedSignal] = useState<RiskSignal | null>(null);

  React.useEffect(() => {
    if (signals.length <= 1 || selectedSignal) return;
    const interval = setInterval(() => {
      setCurrentIndex((prev) => (prev + 1) % signals.length);
    }, 8000);
    return () => clearInterval(interval);
  }, [signals.length, selectedSignal]);

  if (signals.length === 0) return null;

  const currentSignal = signals[currentIndex];
  if (!currentSignal) return null;

  const next = () => setCurrentIndex((prev) => (prev + 1) % signals.length);
  const prev = () => setCurrentIndex((prev) => (prev - 1 + signals.length) % signals.length);

  return (
    <>
      <div className="w-full bg-red-600/10 border-y border-red-500/20 py-2.5 relative overflow-hidden group" dir="rtl">
        <div className="max-w-7xl mx-auto px-4 flex items-center gap-4">
          {/* Label */}
          <div className="flex items-center gap-2 bg-red-600 text-white px-3 py-1.5 rounded-sm font-black text-[11px] uppercase tracking-tighter animate-pulse shrink-0 shadow-lg shadow-red-900/20">
            <Radio size={14} />
            عاجل
          </div>
          <div className="hidden md:flex items-center gap-1.5 px-2 py-1 bg-white/5 border border-white/10 rounded-full">
            <div className="w-1 h-1 bg-red-500 rounded-full animate-ping" />
            <span className="text-[8px] font-black text-red-500 uppercase tracking-widest">LIVE FEED</span>
          </div>

          {/* Content */}
          <div className="flex-1 relative min-h-[3.5rem] sm:min-h-[2.5rem] flex items-center overflow-hidden">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentSignal.id}
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2 sm:gap-6"
              >
                <div className="flex flex-col gap-1 flex-1 py-1 text-right">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-red-500 text-[9px] sm:text-[10px] font-black uppercase tracking-widest shrink-0 bg-red-500/5 px-1.5 py-0.5 rounded border border-red-500/10">
                      {currentSignal.source}
                    </span>
                    <span
                      className="text-[8px] text-zinc-500 font-bold uppercase tracking-widest"
                      title={formatSignalExactTime(currentSignal)}
                    >
                      {formatSignalRelativeTime(currentSignal)}
                    </span>
                    <h4 className="text-zinc-100 text-xs sm:text-sm font-black leading-tight">
                      {currentSignal.headline}
                    </h4>
                    <div className={cn(
                      "w-1.5 h-1.5 rounded-full shrink-0",
                      currentSignal.sentiment === 'negative' ? "bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" : "bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]"
                    )} />
                  </div>
                  <p className="text-zinc-400 text-[10px] sm:text-xs leading-relaxed line-clamp-2 sm:line-clamp-1 font-medium opacity-80">
                    {currentSignal.summary}
                  </p>
                </div>
                
                <button 
                  onClick={() => setSelectedSignal(currentSignal)}
                  className="flex items-center gap-2 px-4 py-2 bg-white/5 hover:bg-white/10 rounded-xl border border-white/10 transition-all shrink-0 self-start sm:self-center group/btn active:scale-95"
                >
                  <Maximize2 size={12} className="text-red-500 group-hover/btn:scale-110 transition-transform" />
                  <span className="text-[10px] font-black text-zinc-300 uppercase tracking-widest">التفاصيل الكاملة</span>
                </button>
              </motion.div>
            </AnimatePresence>
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1.5 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
            <button onClick={prev} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ChevronRight size={18} />
            </button>
            <button onClick={next} className="p-1.5 hover:bg-white/10 rounded-lg text-zinc-400 hover:text-white transition-colors">
              <ChevronLeft size={18} />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <motion.div 
          key={currentIndex}
          initial={{ scaleX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 8, ease: "linear" }}
          className="absolute bottom-0 left-0 right-0 h-[2px] bg-red-600 origin-right"
        />
      </div>

      {/* Full News Modal */}
      <AnimatePresence>
        {selectedSignal && (
          <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 sm:p-6">
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setSelectedSignal(null)}
              className="absolute inset-0 bg-black/90 backdrop-blur-xl"
            />
            
            <motion.div
              initial={{ scale: 0.9, opacity: 0, y: 20 }}
              animate={{ scale: 1, opacity: 1, y: 0 }}
              exit={{ scale: 0.9, opacity: 0, y: 20 }}
              className="relative w-full max-w-2xl bg-zinc-900 border border-zinc-800 rounded-3xl overflow-hidden shadow-2xl"
            >
              {/* Modal Header */}
              <div className="p-6 border-b border-zinc-800 flex items-center justify-between bg-zinc-900/50">
                <div className="flex items-center gap-3">
                  <div className="bg-red-500/10 p-2 rounded-xl">
                    <Radio size={20} className="text-red-500 animate-pulse" />
                  </div>
                  <div>
                    <h3 className="text-white font-black uppercase tracking-widest text-sm">تفاصيل الخبر العاجل</h3>
                    <p className="text-[10px] text-zinc-500 font-mono uppercase tracking-widest">Intelligence Signal Analysis</p>
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedSignal(null)}
                  className="p-2 hover:bg-white/5 rounded-full text-zinc-500 hover:text-white transition-colors"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Modal Content */}
              <div className="p-8 space-y-8">
                <div className="space-y-4">
                  <div className="flex items-center gap-4">
                    <div className="px-3 py-1 bg-red-500/10 border border-red-500/20 rounded-full">
                      <span className="text-[10px] font-black text-red-500 uppercase tracking-widest">{selectedSignal.source}</span>
                    </div>
                    <div className="flex items-center gap-2 text-zinc-500">
                      <Calendar size={12} />
                      <span className="text-[10px] font-bold uppercase tracking-widest">
                        {formatSignalExactTime(selectedSignal)}
                      </span>
                    </div>
                  </div>
                  
                  <h2 className="text-2xl sm:text-3xl font-black text-white leading-tight italic">
                    {selectedSignal.headline}
                  </h2>
                  
                  <div className="p-5 bg-white/5 border border-white/10 rounded-2xl">
                    <p className="text-zinc-300 text-sm sm:text-base leading-relaxed font-medium">
                      {selectedSignal.summary}
                    </p>
                  </div>
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
                  <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-1">التأثير المتوقع</span>
                    <div className="flex items-center gap-2">
                      <div className="flex-1 h-1.5 bg-zinc-700 rounded-full overflow-hidden">
                        <div 
                          className={cn(
                            "h-full rounded-full",
                            selectedSignal.impact > 7 ? "bg-red-500" : "bg-emerald-500"
                          )}
                          style={{ width: `${selectedSignal.impact * 10}%` }}
                        />
                      </div>
                      <span className="text-xs font-black text-white">{selectedSignal.impact}/10</span>
                    </div>
                  </div>

                  <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-1">المصداقية</span>
                    <div className="flex items-center gap-2">
                      <ShieldCheck size={14} className="text-emerald-500" />
                      <span className="text-xs font-black text-white">{selectedSignal.credibility}%</span>
                    </div>
                  </div>

                  <div className="bg-zinc-800/50 p-4 rounded-2xl border border-zinc-700/50 col-span-2 sm:col-span-1">
                    <span className="text-[8px] font-black text-zinc-500 uppercase tracking-widest block mb-1">طبيعة الخبر</span>
                    <span className={cn(
                      "text-xs font-black uppercase tracking-widest",
                      selectedSignal.sentiment === 'negative' ? "text-red-500" : "text-emerald-500"
                    )}>
                      {selectedSignal.sentiment === 'negative' ? 'تهديد محتمل' : 'تطور إيجابي'}
                    </span>
                  </div>
                </div>

                <div className="pt-6 border-t border-zinc-800 flex flex-col sm:flex-row items-center gap-4">
                  <a 
                    href={selectedSignal.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="w-full sm:flex-1 flex items-center justify-center gap-2 px-6 py-4 bg-red-600 hover:bg-red-700 text-white rounded-2xl font-black uppercase tracking-widest transition-all shadow-lg shadow-red-900/20 active:scale-95"
                  >
                    <Globe size={18} />
                    زيارة المصدر الأصلي
                  </a>
                  <button 
                    onClick={() => setSelectedSignal(null)}
                    className="w-full sm:w-auto px-8 py-4 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 rounded-2xl font-black uppercase tracking-widest transition-all"
                  >
                    إغلاق
                  </button>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </>
  );
};
