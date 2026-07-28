import React, { useState } from 'react';
import { ZONES, calculateStromstotte } from '../services/electricityApi';
import { TrendingUp, TrendingDown, ShieldAlert, Zap, ArrowUpRight, ArrowDownRight, Clock, Info } from 'lucide-react';

export default function ZonePrices({ zonePrices, isLoading }) {
  const [selectedZone, setSelectedZone] = useState('NO1');
  const [includeVat, setIncludeVat] = useState(true);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">Henter ferske spotpriser fra Nord Pool for NO1–NO5...</p>
      </div>
    );
  }

  // Determine highest & lowest current price zones
  let minZone = null;
  let maxZone = null;
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  ZONES.forEach(z => {
    const data = zonePrices[z.id];
    if (data && data.current !== undefined) {
      if (data.current < minPrice) {
        minPrice = data.current;
        minZone = z;
      }
      if (data.current > maxPrice) {
        maxPrice = data.current;
        maxZone = z;
      }
    }
  });

  const selectedData = zonePrices[selectedZone] || {};
  const hourly = selectedData.hourlyPrices || [];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Overview Highlight Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Billigste Sone Akkurat Nå</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-white">{minZone?.name || 'NO4'}</span>
            <span className="text-2xl font-black text-emerald-400 font-mono">
              {(minPrice * (includeVat ? 1.25 : 1) * 100).toFixed(1)} <span className="text-xs font-normal text-slate-400">øre/kWh</span>
            </span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Dyreste Sone Akkurat Nå</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="flex items-baseline justify-between">
            <span className="text-xl font-bold text-white">{maxZone?.name || 'NO2'}</span>
            <span className="text-2xl font-black text-rose-400 font-mono">
              {(maxPrice * (includeVat ? 1.25 : 1) * 100).toFixed(1)} <span className="text-xs font-normal text-slate-400">øre/kWh</span>
            </span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 flex flex-col justify-between">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1">
            <span>MVA & Strømstøtte-regler</span>
            <button 
              onClick={() => setIncludeVat(!includeVat)}
              className="text-[11px] px-2 py-0.5 rounded bg-slate-800 text-cyan-400 hover:bg-slate-700 font-semibold"
            >
              {includeVat ? 'Inkl. 25% MVA' : 'Ekskl. MVA'}
            </button>
          </div>
          <p className="text-xs text-slate-400 leading-relaxed">
            Staten dekker 90% av spotprisen over 73 øre/kWh (eks. mva). NO4 (Nord-Norge) har fritak for mva.
          </p>
        </div>
      </div>

      {/* Grid of 5 Norwegian Zones */}
      <div>
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            Spotpriser per Prisområde (NO1 - NO5)
          </h2>
          <span className="text-xs text-slate-400">Trykk på en sone for timegraf</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {ZONES.map((zone) => {
            const data = zonePrices[zone.id] || {};
            const isSelected = selectedZone === zone.id;
            const currentNok = data.current || 0;
            const isNo4 = zone.id === 'NO4'; // NO4 has VAT exemption in Norway
            const vatFactor = (includeVat && !isNo4) ? 1.25 : 1.0;
            const currentOre = currentNok * vatFactor * 100;
            
            const support = calculateStromstotte(currentNok, includeVat && !isNo4);

            return (
              <div
                key={zone.id}
                onClick={() => setSelectedZone(zone.id)}
                className={`glass-card p-5 rounded-2xl cursor-pointer transition-all duration-300 relative overflow-hidden border ${
                  isSelected 
                    ? 'border-cyan-500 ring-2 ring-cyan-500/20 bg-slate-900/90 shadow-xl shadow-cyan-500/10 scale-[1.02]' 
                    : 'border-slate-800/80 bg-slate-950/60 hover:border-slate-700 hover:bg-slate-900/50'
                }`}
              >
                {/* Zone Color Top Accent */}
                <div 
                  className="absolute top-0 left-0 right-0 h-1.5" 
                  style={{ backgroundColor: zone.color }}
                />

                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                    {zone.id}
                  </span>
                  <span 
                    className="w-2.5 h-2.5 rounded-full" 
                    style={{ backgroundColor: zone.color }}
                  />
                </div>

                <div className="text-sm font-semibold text-slate-300 truncate mb-2">
                  {zone.city}
                </div>

                <div className="mb-4">
                  <div className="text-3xl font-black font-mono text-white tracking-tight">
                    {currentOre.toFixed(1)}
                    <span className="text-xs font-normal text-slate-400 ml-1">øre/kWh</span>
                  </div>

                  {support.hasSubsidy && (
                    <div className="mt-1 flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded-md border border-emerald-500/20 w-fit">
                      <ShieldAlert className="w-3 h-3" />
                      Effektiv: {(support.effectivePricePerKwh * 100).toFixed(1)} øre
                    </div>
                  )}
                </div>

                {/* Min / Max / Avg stats */}
                <div className="grid grid-cols-3 gap-1 pt-3 border-t border-slate-800/60 text-[11px]">
                  <div>
                    <div className="text-slate-500">Min</div>
                    <div className="font-mono text-slate-300 font-medium">
                      {( (data.min || 0) * vatFactor * 100 ).toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Snitt</div>
                    <div className="font-mono text-slate-300 font-medium">
                      {( (data.avg || 0) * vatFactor * 100 ).toFixed(1)}
                    </div>
                  </div>
                  <div>
                    <div className="text-slate-500">Maks</div>
                    <div className="font-mono text-slate-300 font-medium">
                      {( (data.max || 0) * vatFactor * 100 ).toFixed(1)}
                    </div>
                  </div>
                </div>

              </div>
            );
          })}
        </div>
      </div>

      {/* Selected Zone Hourly Chart Card */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/80">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6">
          <div>
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Clock className="w-5 h-5 text-cyan-400" />
              Time-for-time Spotpris for {ZONES.find(z => z.id === selectedZone)?.name}
            </h3>
            <p className="text-xs text-slate-400">
              Dagens 24-timers spotpriskurve (kr/kWh og øre/kWh)
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Current Hour: {new Date().getHours()}:00
            </span>
          </div>
        </div>

        {/* 24 Hour Bar Graph Visualization */}
        <div className="space-y-4">
          <div className="h-64 flex items-end gap-1 sm:gap-2 pt-8 pb-2 px-2 border-b border-slate-800/80">
            {hourly.map((item, idx) => {
              const nok = item.NOK_per_kWh;
              const isNo4 = selectedZone === 'NO4';
              const vatFactor = (includeVat && !isNo4) ? 1.25 : 1.0;
              const ore = nok * vatFactor * 100;

              const maxGraphOre = Math.max(150, (selectedData.max || 1) * vatFactor * 100 * 1.15);
              const heightPercent = Math.min(100, Math.max(8, (ore / maxGraphOre) * 100));
              const isCurrentHour = idx === selectedData.currentHour;

              return (
                <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative">
                  
                  {/* Tooltip on Hover */}
                  <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-20 bg-slate-900 border border-slate-700 text-white text-[11px] font-mono px-2 py-1 rounded shadow-xl whitespace-nowrap pointer-events-none">
                    <div className="font-bold">{String(idx).padStart(2, '0')}:00 - {String((idx+1)%24).padStart(2, '0')}:00</div>
                    <div className="text-cyan-400">{ore.toFixed(2)} øre/kWh</div>
                  </div>

                  {/* Bar */}
                  <div 
                    className={`w-full rounded-t-md transition-all duration-300 ${
                      isCurrentHour 
                        ? 'bg-gradient-to-t from-cyan-600 to-cyan-400 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400' 
                        : 'bg-gradient-to-t from-slate-800 via-cyan-950 to-cyan-900/60 hover:from-cyan-900 hover:to-cyan-500/80'
                    }`}
                    style={{ height: `${heightPercent}%` }}
                  />

                  {/* Hour & Whole-øre Price Stack */}
                  <div className="mt-2 flex flex-col items-center gap-0.5 pointer-events-none">
                    <span className={`text-[10px] font-mono ${isCurrentHour ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
                      {String(idx).padStart(2, '0')}
                    </span>
                    <span className={`text-[9px] sm:text-[10px] font-mono font-bold ${isCurrentHour ? 'text-cyan-300' : 'text-slate-300'}`}>
                      {Math.round(ore)}
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

      </div>

    </div>
  );
}
