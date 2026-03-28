import React, { useState, useMemo, useEffect } from 'react';
import { RiskSignal } from '../types';
import { AlertTriangle, Info, TrendingUp, TrendingDown, Minus, Globe, Radio, RefreshCw, ExternalLink, Search, Filter, ChevronDown, ChevronUp, ShieldCheck, Zap, Copy, CheckCircle2, X } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';
import { cn, formatSignalExactTime, formatSignalRelativeTime } from '../lib/utils';
import { SignalSkeleton } from './Skeleton';

interface SignalListProps {
  signals: RiskSignal[];
  title?: string;
  impactLabel?: string;
  onRefresh?: () => void;
  onClear?: () => void;
  loading?: boolean;
  disabled?: boolean;
  isAdmin?: boolean;
}

export const SignalList: React.FC<SignalListProps> = ({ 
  signals = [], 
  title = "تنبيهات استخباراتية فورية", 
  impactLabel = "التأثير",
  onRefresh,
  onClear,
  loading = false,
  disabled = false,
  isAdmin = false
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [filter, setFilter] = useState<'all' | 'negative' | 'neutral' | 'positive'>('all');
  const [sortBy, setSortBy] = useState<'time' | 'impact'>('time');
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const stats = useMemo(() => {
    const total = signals.length;
    const negative = signals.filter(s => s.sentiment === 'negative').length;
    const positive = signals.filter(s => s.sentiment === 'positive').length;
    const neutral = signals.filter(s => s.sentiment === 'neutral').length;
    const avgImpact = total > 0 ? signals.reduce((acc, s) => acc + s.impact, 0) / total : 0;
    
    return { total, negative, positive, neutral, avgImpact };
  }, [signals]);

  const copyToClipboard = (signal: RiskSignal) => {
    const text = `[${signal.source}] ${signal.headline}\n\n${signal.summary}\n\nالمصدر: ${signal.url}`;
    navigator.clipboard.writeText(text);
    setCopiedId(signal.id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredAndSortedSignals = useMemo(() => {
    let result = [...signals];

    // Filter by search
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(s => 
        s.headline.toLowerCase().includes(q) || 
        s.source.toLowerCase().includes(q) ||
        s.summary?.toLowerCase().includes(q)
      );
    }

    // Filter by sentiment
    if (filter !== 'all') {
      result = result.filter(s => s.sentiment === filter);
    }

    // Sort
    result.sort((a, b) => {
      if (sortBy === 'impact') {
        return b.impact - a.impact;
      }
      return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
    });

    return result;
  }, [signals, searchQuery, filter, sortBy]);

  return (
    <div className="space-y-4">
      {/* Header & Controls */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-red-500 rounded-full animate-pulse" />
            <h3 className="text-zinc-100 text-sm font-black uppercase tracking-widest">{title}</h3>
          </div>
          <div className="flex items-center gap-2">
            {isAdmin && onClear && (
              <button 
                onClick={onClear}
                disabled={loading}
                className="p-1.5 hover:bg-red-500/10 rounded-lg text-zinc-500 hover:text-red-500 transition-all disabled:opacity-50"
                title="مسح كافة الأخبار"
              >
                <X size={14} />
              </button>
            )}
            {onRefresh && (
              <button 
                onClick={onRefresh}
                disabled={loading || disabled}
                className={cn(
                  "flex items-center gap-1.5 px-3 py-1.5 rounded-xl transition-all active:scale-95",
                  loading ? "bg-red-500/20 text-red-500" : "bg-zinc-800 hover:bg-zinc-700 text-zinc-400 hover:text-white"
                )}
                title="تحديث الاستخبارات"
              >
                <RefreshCw size={12} className={cn(loading && "animate-spin")} />
                <span className="text-[9px] font-black uppercase tracking-widest">تحديث</span>
              </button>
            )}
            <div className="hidden sm:flex items-center gap-1.5 px-2 py-1 bg-zinc-800/50 rounded-full border border-zinc-700/50">
              <Radio size={10} className={cn(loading ? "text-red-500 animate-pulse" : "text-zinc-500")} />
              <span className="text-[8px] font-black text-zinc-500 uppercase tracking-tighter">
                {loading ? 'SCANNING...' : 'LIVE FEED'}
              </span>
            </div>
          </div>
        </div>

        {/* Stats Bar */}
        <div className="grid grid-cols-4 gap-2">
          <div className="bg-zinc-900/30 border border-zinc-800/50 rounded-xl p-2 flex flex-col items-center justify-center">
            <span className="text-[7px] font-black text-zinc-500 uppercase tracking-widest mb-1">الإجمالي</span>
            <span className="text-xs font-black text-white">{stats.total}</span>
          </div>
          <div className="bg-red-500/5 border border-red-500/10 rounded-xl p-2 flex flex-col items-center justify-center">
            <span className="text-[7px] font-black text-red-500 uppercase tracking-widest mb-1">سلبي</span>
            <span className="text-xs font-black text-red-500">{stats.negative}</span>
          </div>
          <div className="bg-emerald-500/5 border border-emerald-500/10 rounded-xl p-2 flex flex-col items-center justify-center">
            <span className="text-[7px] font-black text-emerald-500 uppercase tracking-widest mb-1">إيجابي</span>
            <span className="text-xs font-black text-emerald-500">{stats.positive}</span>
          </div>
          <div className="bg-zinc-800/20 border border-zinc-800/50 rounded-xl p-2 flex flex-col items-center justify-center">
            <span className="text-[7px] font-black text-zinc-400 uppercase tracking-widest mb-1">متوسط التأثير</span>
            <span className="text-xs font-black text-zinc-300">{stats.avgImpact.toFixed(1)}</span>
          </div>
        </div>

        {/* Search & Filters */}
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1 group">
            <Search size={14} className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 group-focus-within:text-red-500 transition-colors" />
            <input 
              type="text"
              placeholder="البحث في الاستخبارات..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900/50 border border-zinc-800 rounded-xl py-2 pr-10 pl-4 text-xs text-zinc-200 focus:outline-none focus:border-red-500/50 focus:bg-zinc-900 transition-all placeholder:text-zinc-600"
            />
          </div>
          
          <div className="flex items-center gap-1 bg-zinc-900/50 border border-zinc-800 rounded-xl p-1">
            {(['all', 'negative', 'neutral', 'positive'] as const).map((f) => (
              <button
                key={f}
                onClick={() => setFilter(f)}
                className={cn(
                  "px-2.5 py-1 rounded-lg text-[10px] font-black uppercase transition-all",
                  filter === f 
                    ? "bg-zinc-800 text-white shadow-lg" 
                    : "text-zinc-500 hover:text-zinc-300"
                )}
              >
                {f === 'all' ? 'الكل' : f === 'negative' ? 'سلبي' : f === 'positive' ? 'إيجابي' : 'محايد'}
              </button>
            ))}
          </div>

          <button
            onClick={() => setSortBy(prev => prev === 'time' ? 'impact' : 'time')}
            className="flex items-center gap-2 px-3 py-2 bg-zinc-900/50 border border-zinc-800 rounded-xl text-[10px] font-black text-zinc-400 hover:text-white transition-all"
          >
            <Filter size={12} />
            <span>{sortBy === 'time' ? 'الأحدث' : 'الأعلى تأثيراً'}</span>
          </button>
        </div>
      </div>
      
      {/* List */}
      <div className="space-y-2 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
        <AnimatePresence mode="popLayout">
          {loading && signals.length === 0 ? (
            Array.from({ length: 5 }).map((_, i) => (
              <motion.div
                key={`skeleton-${i}`}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                <SignalSkeleton />
              </motion.div>
            ))
          ) : filteredAndSortedSignals.length > 0 ? (
            filteredAndSortedSignals.map((signal) => {
              const isVeryRecent = (() => {
                try {
                  const diff = Date.now() - new Date(signal.timestamp).getTime();
                  return diff < 120000; // 2 minutes
                } catch { return false; }
              })();

              return (
                <motion.div 
                  key={signal.id} 
                  layout
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ 
                    opacity: 1, 
                    y: 0,
                    backgroundColor: isVeryRecent ? "rgba(220, 38, 38, 0.05)" : undefined
                  }}
                  exit={{ opacity: 0, scale: 0.95 }}
                  onClick={() => setExpandedId(expandedId === signal.id ? null : signal.id)}
                  className={cn(
                    "bg-zinc-900/40 border-r-2 border-y border-l border-zinc-800 p-3 rounded-l-lg flex flex-col gap-2 hover:bg-zinc-900/60 transition-all group cursor-pointer relative overflow-hidden",
                    signal.sentiment === 'negative' ? "border-r-red-500" :
                    signal.sentiment === 'positive' ? "border-r-emerald-500" :
                    "border-r-zinc-500",
                    expandedId === signal.id && "bg-zinc-900/80 border-zinc-700",
                    isVeryRecent && "border-l-red-500/50"
                  )}
                >
                  {isVeryRecent && (
                    <div className="absolute top-0 right-0 px-1.5 py-0.5 bg-red-600 text-[6px] font-black text-white uppercase tracking-tighter rounded-bl-md z-10 animate-pulse">
                      NEW
                    </div>
                  )}
                  <div className="flex items-start gap-3">
                  <div className={cn(
                    "p-1.5 rounded-lg shrink-0",
                    signal.sentiment === 'negative' ? "bg-red-500/10 text-red-500" :
                    signal.sentiment === 'positive' ? "bg-emerald-500/10 text-emerald-500" :
                    "bg-zinc-500/10 text-zinc-500"
                  )}>
                    {signal.sentiment === 'negative' ? <AlertTriangle size={14} /> : <Info size={14} />}
                  </div>
                  
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[9px] font-black text-red-500 uppercase tracking-wider bg-red-500/5 px-1.5 py-0.5 rounded">
                          {signal.source}
                        </span>
                        <span
                          className="text-[8px] text-zinc-500 font-bold"
                          title={formatSignalExactTime(signal)}
                        >
                          {formatSignalRelativeTime(signal)}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex items-center gap-1.5 px-2 py-0.5 bg-zinc-800/50 rounded-full border border-zinc-700/50">
                          <Zap size={10} className={cn(signal.impact > 7 ? "text-red-500" : "text-zinc-500")} />
                          <span className="text-[8px] font-black text-zinc-300">{signal.impact}/10</span>
                        </div>
                        {expandedId === signal.id ? <ChevronUp size={12} className="text-zinc-500" /> : <ChevronDown size={12} className="text-zinc-500" />}
                      </div>
                    </div>
                    <p className="text-zinc-100 text-[11px] leading-tight font-black group-hover:text-white transition-colors">
                      {signal.headline}
                    </p>
                  </div>
                </div>

                <AnimatePresence>
                  {expandedId === signal.id && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden"
                    >
                      <div className="pt-3 mt-3 border-t border-zinc-800 space-y-3">
                        <p className="text-zinc-400 text-[10px] leading-relaxed font-medium">
                          {signal.summary}
                        </p>
                        
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-4">
                            <div className="flex items-center gap-1.5">
                              <ShieldCheck size={12} className="text-emerald-500" />
                              <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">المصداقية: {signal.credibility}%</span>
                            </div>
                          </div>
                          
                          <div className="flex items-center gap-2">
                            <button
                              onClick={(e) => { e.stopPropagation(); copyToClipboard(signal); }}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800/50 hover:bg-zinc-700 text-zinc-400 hover:text-white rounded-lg border border-zinc-700/50 transition-all text-[9px] font-black uppercase tracking-widest"
                            >
                              {copiedId === signal.id ? (
                                <>
                                  <CheckCircle2 size={10} className="text-emerald-500" />
                                  تم النسخ
                                </>
                              ) : (
                                <>
                                  <Copy size={10} />
                                  نسخ التقرير
                                </>
                              )}
                            </button>
                            
                            <a 
                              href={signal.url || `https://www.google.com/search?q=${encodeURIComponent(signal.headline + ' ' + signal.source)}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              onClick={(e) => e.stopPropagation()}
                              className="flex items-center gap-1.5 px-3 py-1.5 bg-red-600/10 hover:bg-red-600/20 text-red-500 rounded-lg border border-red-500/20 transition-all text-[9px] font-black uppercase tracking-widest"
                            >
                              <ExternalLink size={10} />
                              المصدر الأصلي
                            </a>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        ) : (
            <div className="py-12 text-center space-y-3 bg-zinc-900/20 rounded-3xl border border-dashed border-zinc-800">
              <div className="w-10 h-10 bg-zinc-800/50 rounded-full flex items-center justify-center mx-auto">
                <Search size={20} className="text-zinc-600" />
              </div>
              <p className="text-zinc-500 text-xs font-bold">لا توجد نتائج تطابق بحثك</p>
              <button 
                onClick={() => { setSearchQuery(''); setFilter('all'); }}
                className="text-red-500 text-[10px] font-black uppercase tracking-widest hover:underline"
              >
                إعادة ضبط المرشحات
              </button>
            </div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};
