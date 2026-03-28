import React from 'react';
import { Tv, Radio, Maximize2, Volume2 } from 'lucide-react';
import { motion } from 'motion/react';

export const LiveTV: React.FC = () => {
  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col h-[400px] group">
      {/* Header */}
      <div className="px-4 py-3 border-bottom border-zinc-800 flex items-center justify-between bg-zinc-900/80 backdrop-blur-sm">
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 bg-red-600 rounded-full animate-pulse" />
          <Tv size={16} className="text-zinc-400" />
          <h3 className="text-zinc-100 text-xs font-black uppercase tracking-widest">البث المباشر - قناة الجزيرة</h3>
        </div>
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1 px-2 py-0.5 bg-red-600/20 rounded-full border border-red-600/30">
            <Radio size={10} className="text-red-600 animate-pulse" />
            <span className="text-[8px] font-black text-red-600 uppercase tracking-tighter">LIVE SIGNAL</span>
          </div>
          <Maximize2 size={14} className="text-zinc-600 hover:text-white cursor-pointer transition-colors" />
        </div>
      </div>

      {/* Video Container */}
      <div className="flex-1 relative bg-black group-hover:brightness-110 transition-all">
        <iframe
          width="100%"
          height="100%"
          src="https://www.youtube.com/embed/bNyUyrR0PHo?autoplay=1&mute=1"
          title="Al Jazeera Arabic Live"
          frameBorder="0"
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
          allowFullScreen
          className="absolute inset-0"
        ></iframe>
        
        {/* Tactical Overlays */}
        <div className="absolute inset-0 pointer-events-none border-[20px] border-transparent group-hover:border-red-500/5 transition-all duration-700" />
        <div className="absolute top-4 left-4 pointer-events-none">
          <div className="text-[8px] font-mono text-emerald-500/50 uppercase tracking-[0.2em]">
            Frequency: 12.034 GHz<br />
            Polarization: Horizontal<br />
            Status: Encrypted_Link_Stable
          </div>
        </div>
        
        {/* Corner Accents */}
        <div className="absolute top-0 left-0 w-4 h-4 border-t border-l border-zinc-700/50" />
        <div className="absolute top-0 right-0 w-4 h-4 border-t border-r border-zinc-700/50" />
        <div className="absolute bottom-0 left-0 w-4 h-4 border-b border-l border-zinc-700/50" />
        <div className="absolute bottom-0 right-0 w-4 h-4 border-b border-r border-zinc-700/50" />
      </div>

      {/* Footer Info */}
      <div className="px-4 py-2 bg-black/40 border-t border-zinc-800/50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <div className="flex items-center gap-1.5">
            <Volume2 size={12} className="text-zinc-500" />
            <div className="w-16 h-1 bg-zinc-800 rounded-full overflow-hidden">
              <div className="w-2/3 h-full bg-zinc-600" />
            </div>
          </div>
        </div>
        <span className="text-[9px] font-mono text-zinc-600 uppercase tracking-widest">
          Source: Satellite_Feed_01
        </span>
      </div>
    </div>
  );
};
