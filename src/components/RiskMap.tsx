import React, { useState } from 'react';
import { RegionRisk } from '../types';
import { motion, AnimatePresence } from 'motion/react';
import { Shield, Map as MapIcon, Crosshair, Info } from 'lucide-react';
import { ComposableMap, Geographies, Geography, Marker, ZoomableGroup } from "react-simple-maps";
import { cn } from '../lib/utils';

// TopoJSON for the world map
const geoUrl = "https://cdn.jsdelivr.net/npm/world-atlas@2/countries-110m.json";

interface RiskMapProps {
  regions: RegionRisk[];
  title?: string;
  relativeTime?: string;
}

export const RiskMap: React.FC<RiskMapProps> = ({ regions = [], title = "خريطة التهديدات الإقليمية", relativeTime }) => {
  const [selectedRegion, setSelectedRegion] = useState<RegionRisk | null>(null);

  // Geographic coordinates for Jordan regions
  const regionCoords: Record<string, [number, number]> = {
    north: [35.85, 32.55],
    south: [35.00, 29.53],
    east: [38.00, 31.50],
    west: [35.50, 31.50],
    center: [35.92, 31.95],
    regional: [45.0, 35.0],
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'critical': return 'text-red-500 bg-red-500/20 border-red-500/50';
      case 'high': return 'text-orange-500 bg-orange-500/20 border-orange-500/50';
      case 'moderate': return 'text-yellow-500 bg-yellow-500/20 border-yellow-500/50';
      default: return 'text-emerald-500 bg-emerald-500/20 border-emerald-500/50';
    }
  };

  const getPulseColor = (status: string) => {
    switch (status) {
      case 'critical': return 'bg-red-500';
      case 'high': return 'bg-orange-500';
      case 'moderate': return 'bg-yellow-500';
      default: return 'bg-emerald-500';
    }
  };

  return (
    <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 relative overflow-hidden h-[550px] flex flex-col group">
      <div className="flex items-center justify-between mb-6 relative z-10">
        <div className="flex items-center gap-2">
          <MapIcon size={16} className="text-zinc-500" />
          <h3 className="text-zinc-400 text-xs font-bold uppercase tracking-widest">{title}</h3>
        </div>
        <div className="flex items-center gap-4">
          {relativeTime && (
            <span className="text-[8px] font-bold text-zinc-600 uppercase tracking-widest">{relativeTime}</span>
          )}
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.5)]" />
            <span className="text-[8px] text-zinc-500 uppercase font-bold">حرجة</span>
          </div>
          <div className="flex items-center gap-1.5">
            <div className="w-2 h-2 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.5)]" />
            <span className="text-[8px] text-zinc-500 uppercase font-bold">مستقرة</span>
          </div>
        </div>
      </div>

      <div className="flex-1 relative bg-black/60 rounded-xl border border-zinc-800/50 overflow-hidden flex items-center justify-center shadow-inner">
        {/* Tactical Grid Background */}
        <div className="absolute inset-0 opacity-20" 
          style={{ 
            backgroundImage: `linear-gradient(#18181b 1px, transparent 1px), linear-gradient(90deg, #18181b 1px, transparent 1px)`, 
            backgroundSize: '20px 20px' 
          }} 
        />
        
        {/* Professional World Map */}
        <div className="absolute inset-0 z-0">
          <ComposableMap
            projection="geoAzimuthalEqualArea"
            projectionConfig={{
              rotate: [-36.5, -31.2, 0],
              scale: 6000,
            }}
            style={{ width: "100%", height: "100%" }}
          >
            <ZoomableGroup center={[36.5, 31.2]} zoom={1} maxZoom={5}>
              <Geographies geography={geoUrl}>
                {({ geographies }) =>
                  geographies.map((geo) => {
                    const isJordan = geo.properties.name === "Jordan";
                    return (
                      <Geography
                        key={geo.rsmKey}
                        geography={geo}
                        fill={isJordan ? "#09090b" : "#020617"}
                        stroke={isJordan ? "#ef4444" : "#1e293b"}
                        strokeWidth={isJordan ? 1.5 : 0.5}
                        style={{
                          default: { outline: "none" },
                          hover: { fill: "#0f172a", outline: "none" },
                          pressed: { outline: "none" },
                        }}
                      />
                    );
                  })
                }
              </Geographies>

              {/* Region Markers */}
              {regions?.map((region) => {
                const coords = regionCoords[region.id] || [35, 31];
                const isSelected = selectedRegion?.id === region.id;

                return (
                  <Marker key={region.id} coordinates={coords}>
                    <g 
                      className="cursor-pointer group/marker"
                      onClick={() => setSelectedRegion(region)}
                    >
                      {/* Pulse Effect */}
                      <circle
                        r={isSelected ? 14 : 10}
                        className={cn(
                          "animate-ping opacity-20",
                          getPulseColor(region.status)
                        )}
                      />
                      
                      {/* Marker Core */}
                      <circle
                        r={isSelected ? 7 : 5}
                        className={cn(
                          "transition-all duration-300",
                          getPulseColor(region.status),
                          isSelected ? "stroke-white stroke-2" : "group-hover/marker:r-8"
                        )}
                      />

                      {/* Tactical Crosshair (Only when selected) */}
                      {isSelected && (
                        <g className="animate-pulse">
                          <line x1="-15" y1="0" x2="15" y2="0" stroke="white" strokeWidth="0.5" opacity="0.5" />
                          <line x1="0" y1="-15" x2="0" y2="15" stroke="white" strokeWidth="0.5" opacity="0.5" />
                        </g>
                      )}

                      {/* Label */}
                      <text
                        textAnchor="middle"
                        y={-18}
                        className={cn(
                          "text-[9px] font-black uppercase tracking-widest transition-all pointer-events-none",
                          isSelected ? "fill-white" : "fill-zinc-600 group-hover/marker:fill-zinc-200"
                        )}
                        style={{ fontSize: '9px', fontFamily: 'monospace' }}
                      >
                        {region.name}
                      </text>
                    </g>
                  </Marker>
                );
              })}
            </ZoomableGroup>
          </ComposableMap>
        </div>

        {/* Radar Scanning Line */}
        <div className="absolute inset-0 pointer-events-none z-10 overflow-hidden rounded-xl">
          <motion.div 
            animate={{ rotate: 360 }}
            transition={{ duration: 8, repeat: Infinity, ease: "linear" }}
            className="absolute top-1/2 left-1/2 w-[600px] h-[600px] -translate-x-1/2 -translate-y-1/2 opacity-20"
            style={{ 
              background: 'conic-gradient(from 0deg, transparent 0%, rgba(239, 68, 68, 0.4) 100%)',
              borderRadius: '50%'
            }}
          />
        </div>

        {/* Tactical Overlays */}
        <div className="absolute top-4 left-4 pointer-events-none z-20">
          <div className="text-[8px] font-mono text-zinc-600 space-y-1">
            <p>LAT: 31.9522° N</p>
            <p>LNG: 35.9236° E</p>
            <p>ALT: 773m MSL</p>
          </div>
        </div>

        {/* Selected Region Info Overlay */}
        <AnimatePresence>
          {selectedRegion && (
            <motion.div
              initial={{ opacity: 0, scale: 0.95, x: 20 }}
              animate={{ opacity: 1, scale: 1, x: 0 }}
              exit={{ opacity: 0, scale: 0.95, x: 20 }}
              className="absolute top-4 right-4 w-72 bg-zinc-950/90 backdrop-blur-xl border border-zinc-700/50 rounded-2xl p-5 z-30 shadow-[0_0_40px_rgba(0,0,0,0.8)]"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <div className="flex items-center gap-2">
                    <div className={cn("w-1.5 h-1.5 rounded-full animate-pulse", getPulseColor(selectedRegion.status))} />
                    <h4 className="text-white font-black text-sm tracking-tight">{selectedRegion.name}</h4>
                  </div>
                  <div className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[8px] font-black uppercase mt-2 border",
                    getStatusColor(selectedRegion.status)
                  )}>
                    <Shield size={8} />
                    {selectedRegion.status}
                  </div>
                </div>
                <button 
                  onClick={() => setSelectedRegion(null)}
                  className="p-1 hover:bg-zinc-800 rounded-lg text-zinc-500 hover:text-white transition-colors"
                >
                  <Info size={14} />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="bg-black/40 p-3 rounded-xl border border-zinc-800/50">
                  <div className="flex justify-between text-[10px] text-zinc-500 font-black uppercase mb-2">
                    <span>مستوى التهديد</span>
                    <span className={cn("font-mono", getPulseColor(selectedRegion.status).replace('bg-', 'text-'))}>{selectedRegion.riskLevel}%</span>
                  </div>
                  <div className="h-1.5 bg-zinc-900 rounded-full overflow-hidden">
                    <motion.div 
                      initial={{ width: 0 }}
                      animate={{ width: `${selectedRegion.riskLevel}%` }}
                      transition={{ duration: 1, ease: "circOut" }}
                      className={cn(
                        "h-full rounded-full shadow-[0_0_8px_currentColor]",
                        getPulseColor(selectedRegion.status)
                      )}
                    />
                  </div>
                </div>
                
                <div className="relative">
                  <div className="absolute -left-3 top-0 bottom-0 w-0.5 bg-zinc-800 rounded-full" />
                  <p className="text-[11px] text-zinc-300 leading-relaxed font-bold italic pl-1">
                    "{selectedRegion.description}"
                  </p>
                </div>

                <div className="pt-3 border-t border-zinc-800/50 flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Crosshair size={12} className="text-red-500 animate-pulse" />
                    <span className="text-[9px] font-black text-zinc-500 uppercase tracking-widest">ACTIVE_SCAN</span>
                  </div>
                  <span className="text-[8px] font-mono text-zinc-700">ID: {selectedRegion.id.toUpperCase()}</span>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Map Legend/Instructions */}
        {!selectedRegion && (
          <div className="absolute bottom-4 left-4 flex items-center gap-2 text-[9px] text-zinc-400 font-black bg-zinc-950/80 backdrop-blur-sm px-4 py-2 rounded-full border border-zinc-800/50 z-20 uppercase tracking-widest shadow-xl">
            <div className="w-1 h-1 bg-red-500 rounded-full animate-pulse" />
            <span>انقر على المناطق للحصول على تفاصيل استخباراتية</span>
          </div>
        )}
      </div>
    </div>
  );
};
