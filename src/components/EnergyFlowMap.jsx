import React, { useState, useEffect } from 'react';
import { CONNECTIONS, FOREIGN_COUNTRIES, calculateLiveFlows } from '../services/flowSimulation';
import { ZONES } from '../services/electricityApi';
import { ArrowRightLeft, Globe, Zap, Filter, Radio, RefreshCw, ChevronRight, Info } from 'lucide-react';

const ZONE_COLORS = {
  NO1: { color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.18)', border: 'rgba(59, 130, 246, 0.4)' },
  NO2: { color: '#10b981', bg: 'rgba(16, 185, 129, 0.18)', border: 'rgba(16, 185, 129, 0.4)' },
  NO3: { color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.18)', border: 'rgba(245, 158, 11, 0.4)' },
  NO4: { color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.18)', border: 'rgba(139, 92, 246, 0.4)' },
  NO5: { color: '#ec4899', bg: 'rgba(236, 72, 153, 0.18)', border: 'rgba(236, 72, 153, 0.4)' },
};

function getZoneStyle(zoneId) {
  if (ZONE_COLORS[zoneId]) {
    return ZONE_COLORS[zoneId];
  }
  return { color: '#cbd5e1', bg: 'rgba(148, 163, 184, 0.12)', border: 'rgba(148, 163, 184, 0.25)' };
}

export default function EnergyFlowMap({ zonePrices }) {
  const [flows, setFlows] = useState([]);
  const [selectedConnection, setSelectedConnection] = useState(null);
  const [filterType, setFilterType] = useState('ALL'); // 'ALL', 'INTERNAL', 'INTERNATIONAL'

  // Selected Zone Node (default to homeZone from localStorage or NO1)
  const [selectedZoneNode, setSelectedZoneNode] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_home_zone') || 'NO1';
  });

  useEffect(() => {
    const live = calculateLiveFlows(zonePrices);
    setFlows(live);

    const timer = setInterval(() => {
      setFlows(calculateLiveFlows(zonePrices));
    }, 4000);

    return () => clearInterval(timer);
  }, [zonePrices]);

  // Zone coordinates on expanded SVG network canvas (0-180 x 0-185 viewbox)
  const zoneCoords = {
    NO4: { x: 115, y: 30, name: 'NO4 (Nord-Norge)', color: '#8b5cf6' },
    NO3: { x: 85, y: 70, name: 'NO3 (Midt-Norge)', color: '#f59e0b' },
    NO5: { x: 40, y: 100, name: 'NO5 (Vestlandet)', color: '#ec4899' },
    NO1: { x: 90, y: 115, name: 'NO1 (Østlandet)', color: '#3b82f6' },
    NO2: { x: 55, y: 145, name: 'NO2 (Sørlandet)', color: '#10b981' },
    SE3: { x: 140, y: 120, name: 'Sverige SE3', color: '#64748b' },
    SE2: { x: 145, y: 80, name: 'Sverige SE2', color: '#64748b' },
    SE1: { x: 155, y: 45, name: 'Sverige SE1', color: '#64748b' },
    FI: { x: 160, y: 20, name: 'Finland FI', color: '#64748b' },
    DK1: { x: 55, y: 172, name: 'Danmark DK1', color: '#64748b' },
    DE: { x: 90, y: 172, name: 'Tyskland DE', color: '#64748b' },
    NL: { x: 22, y: 168, name: 'Nederland NL', color: '#64748b' },
    UK: { x: 12, y: 130, name: 'Storbritannia UK', color: '#64748b' },
  };

  const filteredFlows = flows.filter(f => {
    if (filterType === 'INTERNAL') return !f.isExportAbroad;
    if (filterType === 'INTERNATIONAL') return f.isExportAbroad;
    return true;
  });

  const totalExportMW = flows.filter(f => f.isExportAbroad && f.fromZone.startsWith('NO')).reduce((sum, f) => sum + f.flowMW, 0);
  const totalImportMW = flows.filter(f => f.isExportAbroad && !f.fromZone.startsWith('NO')).reduce((sum, f) => sum + f.flowMW, 0);
  const netExportMW = totalExportMW - totalImportMW;

  // Selected Zone Node live exchange balance calculations
  const zoneOutMW = flows
    .filter(f => f.fromZone === selectedZoneNode)
    .reduce((sum, f) => sum + f.flowMW, 0);

  const zoneInMW = flows
    .filter(f => f.toZone === selectedZoneNode)
    .reduce((sum, f) => sum + f.flowMW, 0);

  const zoneNetMW = zoneOutMW - zoneInMW;
  const isZoneNetExport = zoneNetMW >= 0;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Live Power Flow KPI Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Samlet Eksport Utland</span>
            <Globe className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black font-mono text-emerald-400">
            {totalExportMW.toLocaleString('no-NO')} <span className="text-sm font-normal text-slate-400">MW</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Samlet Import Utland</span>
            <Globe className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black font-mono text-rose-400">
            {totalImportMW.toLocaleString('no-NO')} <span className="text-sm font-normal text-slate-400">MW</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>{netExportMW >= 0 ? 'Netto Eksport Utland' : 'Netto Import Utland'}</span>
            <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
          </div>
          <div className={`text-3xl font-black font-mono ${netExportMW >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
            {Math.abs(netExportMW).toLocaleString('no-NO')} <span className="text-sm font-normal text-slate-400">MW</span>
          </div>
          <div className={`text-xs font-semibold font-mono mt-1 ${netExportMW >= 0 ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>
            {((Math.abs(netExportMW) / Math.max(1, totalExportMW + totalImportMW)) * 100).toFixed(1)}% av krafthandel
          </div>
        </div>

        {/* Selected Zone Node Exchange Balance Card */}
        <div className={`glass-card p-5 rounded-2xl border transition-all duration-300 ${
          selectedZoneNode ? 'border-cyan-500/50 bg-slate-900/90 shadow-lg shadow-cyan-500/10' : 'border-slate-800 bg-slate-950/80'
        }`}>
          <div className="text-slate-400 text-xs font-semibold uppercase tracking-wider mb-1 flex items-center justify-between">
            <span className="flex items-center gap-1.5 font-bold text-slate-200">
              <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: zoneCoords[selectedZoneNode]?.color || '#06b6d4' }}></span>
              {isZoneNetExport ? `Netto Eksport (${selectedZoneNode})` : `Netto Import (${selectedZoneNode})`}
            </span>
            <Radio className="w-4 h-4 text-cyan-400 animate-pulse" />
          </div>

          <div className={`text-3xl font-black font-mono ${isZoneNetExport ? 'text-emerald-400' : 'text-rose-400'}`}>
            {Math.abs(zoneNetMW).toLocaleString('no-NO')} <span className="text-sm font-normal text-slate-400">MW</span>
          </div>

          <div className="text-xs font-mono text-slate-300 mt-1 flex items-center justify-between border-t border-slate-800/80 pt-1.5">
            <span className="text-emerald-400">Ut: {zoneOutMW.toLocaleString()} MW</span>
            <span className="text-slate-500">|</span>
            <span className="text-rose-400">Inn: {zoneInMW.toLocaleString()} MW</span>
          </div>
        </div>
      </div>

      {/* Main Map & Table Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        
        {/* Visual Network Canvas (7 Columns) */}
        <div className="lg:col-span-7 glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/90 relative overflow-hidden flex flex-col justify-between h-full">
          <div>
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
              <div>
                <h3 className="text-lg font-bold text-white flex items-center gap-2">
                  <Zap className="w-5 h-5 text-cyan-400" />
                  Interaktivt Kraftflyt-Nettverk
                </h3>
                <p className="text-xs text-slate-400">Trykk på et norsk prisområde (NO1–NO5) for å se dets reeltidsbalanse</p>
              </div>

              {/* Filter Toggle Buttons */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-lg p-1 text-xs font-medium self-start sm:self-auto">
                <button
                  onClick={() => setFilterType('ALL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${filterType === 'ALL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Alle
                </button>
                <button
                  onClick={() => setFilterType('INTERNAL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${filterType === 'INTERNAL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Innland
                </button>
                <button
                  onClick={() => setFilterType('INTERNATIONAL')}
                  className={`px-2.5 py-1 rounded-md transition-all ${filterType === 'INTERNATIONAL' ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'}`}
                >
                  Utland
                </button>
              </div>
            </div>

            {/* Network Legend */}
            <div className="mb-4 px-3 py-2 rounded-xl bg-slate-900/80 border border-slate-800 flex flex-wrap items-center gap-4 text-xs font-medium text-slate-300">
              <span className="text-slate-400 font-bold flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-cyan-400" /> Tegnforklaring:
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3 h-3 rounded-full border-2 border-cyan-400 bg-slate-950 inline-block"></span>
                <span>Norske soner (øre/kWh)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-2.5 rounded bg-slate-800 border border-slate-600 inline-block"></span>
                <span>Utlandspriser (øre/kWh)</span>
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-3.5 h-2 rounded bg-slate-900 border border-cyan-400 inline-block"></span>
                <span>Kraftflyt (MW)</span>
              </span>
            </div>
          </div>

          {/* SVG Network Canvas */}
          <div className="relative w-full aspect-[4/5] bg-slate-950/90 rounded-xl border border-slate-800/80 p-2 overflow-hidden flex-1 flex items-center justify-center">
            <svg className="w-full h-full" viewBox="0 0 180 185">
              
              <defs>
                {/* Flow line animated glow gradient */}
                <linearGradient id="flowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#06b6d4" stopOpacity="1" />
                  <stop offset="50%" stopColor="#3b82f6" stopOpacity="1" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="1" />
                </linearGradient>
              </defs>

              {/* Draw Connections Lines & Flow Particles */}
              {filteredFlows.map(flow => {
                const from = zoneCoords[flow.fromZone];
                const to = zoneCoords[flow.toZone];
                if (!from || !to) return null;

                const isSelected = selectedConnection?.id === flow.id;
                // High contrast stroke width ensuring smaller flows like NO4-FI (62 MW) are vivid
                const strokeW = Math.max(1.8, Math.min(3.6, (flow.flowMW / 500) * 1.5));

                return (
                  <g key={flow.id} onClick={() => setSelectedConnection(flow)} className="cursor-pointer group">
                    {/* Base Cable Line */}
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke={isSelected ? '#06b6d4' : 'rgba(30, 41, 59, 0.8)'}
                      strokeWidth={strokeW + 0.5}
                    />

                    {/* High-Visibility Animated Flow Line */}
                    <line
                      x1={from.x}
                      y1={from.y}
                      x2={to.x}
                      y2={to.y}
                      stroke="url(#flowGrad)"
                      strokeWidth={strokeW}
                      strokeDasharray="4 4"
                      className="animate-flow-dash"
                    />

                    {/* Midpoint MW Badge */}
                    <g transform={`translate(${(from.x + to.x)/2}, ${(from.y + to.y)/2})`}>
                      <rect
                        x="-9.5"
                        y="-3.8"
                        width="19"
                        height="7.6"
                        rx="1.5"
                        fill="#090d16"
                        stroke={flow.isExportAbroad ? '#10b981' : '#06b6d4'}
                        strokeWidth="0.6"
                      />
                      <text
                        x="0"
                        y="1.3"
                        textAnchor="middle"
                        fill="#ffffff"
                        fontSize="2.4"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {flow.flowMW} MW
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Draw Norwegian Zone Nodes (Clickable to select zone balance) */}
              {ZONES.map(z => {
                const coord = zoneCoords[z.id];
                const price = zonePrices[z.id]?.current;
                const isSelectedNode = selectedZoneNode === z.id;

                return (
                  <g 
                    key={z.id} 
                    transform={`translate(${coord.x}, ${coord.y})`}
                    onClick={(e) => {
                      e.stopPropagation();
                      setSelectedZoneNode(z.id);
                    }}
                    className="cursor-pointer group"
                  >
                    {/* Active Zone Ring Indicator */}
                    {isSelectedNode && (
                      <circle
                        r="8.5"
                        fill="none"
                        stroke="#06b6d4"
                        strokeWidth="1.2"
                        strokeDasharray="2 2"
                        className="animate-spin-slow opacity-80"
                      />
                    )}
                    <circle
                      r="5.5"
                      fill={isSelectedNode ? '#090d16' : '#0f172a'}
                      stroke={z.color}
                      strokeWidth={isSelectedNode ? '2.2' : '1.4'}
                      className="shadow-lg transition-all group-hover:scale-125"
                    />
                    <circle
                      r="2.2"
                      fill={z.color}
                      className="animate-ping opacity-50"
                    />
                    <text
                      x="0"
                      y="-7.0"
                      textAnchor="middle"
                      fill={isSelectedNode ? '#38bdf8' : '#ffffff'}
                      fontSize="3.4"
                      fontWeight="extrabold"
                    >
                      {z.id}
                    </text>
                    {price !== undefined && (
                      <text
                        x="0"
                        y="1.2"
                        textAnchor="middle"
                        fill="#38bdf8"
                        fontSize="2.4"
                        fontFamily="monospace"
                        fontWeight="bold"
                      >
                        {(price * 100).toFixed(0)} øre
                      </text>
                    )}
                  </g>
                );
              })}

              {/* Draw Foreign Country Nodes with Spot Price */}
              {FOREIGN_COUNTRIES.map(fc => (
                <g key={fc.id} transform={`translate(${fc.x}, ${fc.y})`}>
                  <rect
                    x="-9.5"
                    y="-6.0"
                    width="19"
                    height="12"
                    rx="2.2"
                    fill="#1e293b"
                    stroke="#475569"
                    strokeWidth="0.7"
                  />
                  <text
                    x="0"
                    y="-1.2"
                    textAnchor="middle"
                    fill="#cbd5e1"
                    fontSize="2.5"
                    fontWeight="bold"
                  >
                    {fc.flag} {fc.id}
                  </text>
                  <text
                    x="0"
                    y="3.8"
                    textAnchor="middle"
                    fill="#38bdf8"
                    fontSize="2.3"
                    fontFamily="monospace"
                    fontWeight="bold"
                  >
                    {(fc.priceNok * 100).toFixed(0)} øre
                  </text>
                </g>
              ))}

            </svg>
          </div>
        </div>

        {/* Connections List / Details Table (5 Columns) */}
        <div className="lg:col-span-5 h-full">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80 h-full flex flex-col justify-between">
            <div>
              <h4 className="text-base font-bold text-white mb-3 flex items-center gap-2">
                <ArrowRightLeft className="w-4 h-4 text-cyan-400" />
                Reeltidsoversikt over Kraftlinjer (MW)
              </h4>
            </div>

            <div className="space-y-2 flex-1 min-h-[460px] overflow-y-auto pr-1">
              {filteredFlows.map(flow => {
                const isSelected = selectedConnection?.id === flow.id;
                const fromStyle = getZoneStyle(flow.fromZone);
                const toStyle = getZoneStyle(flow.toZone);

                return (
                  <div
                    key={flow.id}
                    onClick={() => setSelectedConnection(flow)}
                    className={`p-3 rounded-xl border transition-all cursor-pointer flex items-center justify-between ${
                      isSelected
                        ? 'border-cyan-500 bg-cyan-500/10 text-white'
                        : 'border-slate-800/80 bg-slate-900/60 hover:bg-slate-900 text-slate-300'
                    }`}
                  >
                    <div>
                      <div className="text-xs font-bold flex items-center gap-1.5">
                        <span 
                          className="px-2 py-0.5 rounded-md font-extrabold text-[11px]" 
                          style={{ backgroundColor: fromStyle.bg, color: fromStyle.color, border: `1px solid ${fromStyle.border}` }}
                        >
                          {flow.fromZone}
                        </span>

                        <ChevronRight className="w-3.5 h-3.5 text-cyan-400" />

                        <span 
                          className="px-2 py-0.5 rounded-md font-extrabold text-[11px]" 
                          style={{ backgroundColor: toStyle.bg, color: toStyle.color, border: `1px solid ${toStyle.border}` }}
                        >
                          {flow.toZone}
                        </span>

                        {flow.isExportAbroad && (
                          <span className="text-[10px] px-1.5 py-0.2 rounded bg-emerald-500/20 text-emerald-400 font-semibold border border-emerald-500/30">
                            Utland
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-slate-400 mt-1 font-medium">{flow.label}</div>
                    </div>

                    <div className="text-right">
                      <div className="text-sm font-black font-mono text-cyan-400">
                        {flow.flowMW} <span className="text-[10px] font-normal text-slate-400">MW</span>
                      </div>
                      <div className="text-[10px] font-mono text-slate-400">
                        Kap: {flow.capacityMW} MW ({flow.utilizationPercent}%)
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
