import React from 'react';
import { AIAnalystPerspective } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { UserCheck, ShieldCheck, BarChart3, Quote, HeartPulse, Lock } from 'lucide-react';
import { cn } from '../lib/utils';

interface AnalystPerspectivesProps {
  analysts: AIAnalystPerspective[];
  title?: string;
  relativeTime?: string;
}

export const AnalystPerspectives: React.FC<AnalystPerspectivesProps> = ({ 
  analysts = [], 
  title = "وجهات نظر محللي الذكاء الاصطناعي",
  relativeTime
}) => {
  const [activeId, setActiveId] = React.useState<string | null>(analysts?.[0]?.id || null);

  const getIcon = (persona: string) => {
    const p = persona.toLowerCase();
    if (p.includes('security') || p.includes('cyber') || p.includes('أمن') || p.includes('سيبران')) return <Lock size={16} />;
    if (p.includes('economic') || p.includes('اقتصاد')) return <BarChart3 size={16} />;
    if (p.includes('humanitarian') || p.includes('إنسان')) return <HeartPulse size={16} />;
    if (p.includes('strategist') || p.includes('استراتيج')) return <ShieldCheck size={16} />;
    return <UserCheck size={16} />;
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between px-1">
        <h3 className="text-zinc-500 text-[10px] font-bold uppercase tracking-widest">{title}</h3>
        {relativeTime && (
          <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{relativeTime}</span>
        )}
      </div>
      
      <div className="grid grid-cols-1 gap-2">
        {analysts?.map((analyst) => (
          <div
            key={analyst.id}
            className="bg-zinc-900/40 border border-zinc-800 p-4 rounded-xl space-y-2"
          >
            <div className="flex items-center justify-between">
              <h4 className="text-xs font-bold text-zinc-300">{analyst.persona}</h4>
              <span className="text-[9px] font-mono text-emerald-500/60">{analyst.confidence}% ثقة</span>
            </div>
            <p className="text-zinc-400 text-[11px] leading-relaxed italic">
              "{analyst.opinion}"
            </p>
          </div>
        ))}
      </div>
    </div>
  );
}
