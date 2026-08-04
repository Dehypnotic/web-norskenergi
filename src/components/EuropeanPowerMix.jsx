import React, { useState, useEffect, useMemo } from 'react';
import {
  EUROPEAN_COUNTRIES,
  SOURCE_COLORS,
  fetchEnergyChartsPower,
  formatDateStr,
  getDatesForISOWeek,
  translateSource
} from '../services/energyChartsApi';
import { Globe, Calendar, Layers, PieChart, TrendingUp, Info, RefreshCw, ChevronDown, AlertTriangle } from 'lucide-react';

export default function EuropeanPowerMix() {
  const [selectedCountry, setSelectedCountry] = useState('no');
  const [periodType, setPeriodType] = useState('YEAR'); // Default to current calendar year

  const currentYr = new Date().getFullYear();
  const currentMo = new Date().getMonth() + 1;
  const currentDy = new Date().getDate();

  const [selectedYear, setSelectedYear] = useState(String(currentYr));
  const [selectedMonth, setSelectedMonth] = useState(String(currentMo));
  const [selectedWeek, setSelectedWeek] = useState('31');
  const [selectedDay, setSelectedDay] = useState(String(currentDy));

  const [data, setData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [hoveredSegment, setHoveredSegment] = useState(null);
  const [hoveredTimePoint, setHoveredTimePoint] = useState(null);
  const leaveTimeoutRef = React.useRef(null);

  const handleBarMouseEnter = (point) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setHoveredTimePoint(point);
  };

  const handleBarMouseLeave = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredTimePoint(null);
    }, 1000); // 1-second delay before hiding info box
  };

  // Compute startStr & endStr based on period selection
  const dateRange = useMemo(() => {
    const yr = Number(selectedYear);
    const mo = Number(selectedMonth);
    const dy = Number(selectedDay);
    const wk = Number(selectedWeek);

    if (periodType === 'DAY') {
      const dStr = formatDateStr(yr, mo, dy);
      // End date next day
      const nextDayObj = new Date(yr, mo - 1, dy + 1);
      const nextStr = formatDateStr(nextDayObj.getFullYear(), nextDayObj.getMonth() + 1, nextDayObj.getDate());
      return { startStr: dStr, endStr: nextStr, titleLabel: `${dy}. ${getMonthName(mo)} ${yr}` };
    }

    if (periodType === 'WEEK') {
      const { startStr, endStr } = getDatesForISOWeek(yr, wk);
      return { startStr, endStr, titleLabel: `Uke ${wk}, ${yr}` };
    }

    if (periodType === 'MONTH') {
      const startStr = formatDateStr(yr, mo, 1);
      const lastDayObj = new Date(yr, mo, 0); // last day of month
      const endStr = formatDateStr(yr, mo, lastDayObj.getDate());
      return { startStr, endStr, titleLabel: `${getMonthName(mo)} ${yr}` };
    }

    // YEAR
    const startStr = formatDateStr(yr, 1, 1);
    const endStr = formatDateStr(yr, 12, 31);
    return { startStr, endStr, titleLabel: `År ${yr}` };
  }, [periodType, selectedYear, selectedMonth, selectedDay, selectedWeek]);

  // Fetch data on country or date range change
  useEffect(() => {
    let isMounted = true;
    async function load() {
      setIsLoading(true);
      const res = await fetchEnergyChartsPower(selectedCountry, dateRange.startStr, dateRange.endStr, periodType);
      if (isMounted) {
        setData(res);
        setIsLoading(false);
      }
    }
    load();
    return () => { isMounted = false; };
  }, [selectedCountry, dateRange, periodType]);

  const countryInfo = EUROPEAN_COUNTRIES.find(c => c.code === selectedCountry) || EUROPEAN_COUNTRIES[0];

  // Helper for SVG Donut path calculations
  const calculateDonutArcs = (segments, totalGWh) => {
    if (!segments || segments.length === 0 || totalGWh <= 0) return [];
    
    let cumulativeAngle = 0;
    const radius = 100;
    const holeRadius = 68;
    const center = 140;

    return segments.map(seg => {
      const pctFraction = seg.pct / 100;
      const angle = pctFraction * 2 * Math.PI;
      const startAngle = cumulativeAngle;
      const endAngle = cumulativeAngle + angle;
      cumulativeAngle += angle;

      const x1Outer = center + radius * Math.sin(startAngle);
      const y1Outer = center - radius * Math.cos(startAngle);
      const x2Outer = center + radius * Math.sin(endAngle);
      const y2Outer = center - radius * Math.cos(endAngle);

      const x1Inner = center + holeRadius * Math.sin(startAngle);
      const y1Inner = center - holeRadius * Math.cos(startAngle);
      const x2Inner = center + holeRadius * Math.sin(endAngle);
      const y2Inner = center - holeRadius * Math.cos(endAngle);

      const largeArc = angle > Math.PI ? 1 : 0;

      const pathData = [
        `M ${x1Outer} ${y1Outer}`,
        `A ${radius} ${radius} 0 ${largeArc} 1 ${x2Outer} ${y2Outer}`,
        `L ${x2Inner} ${y2Inner}`,
        `A ${holeRadius} ${holeRadius} 0 ${largeArc} 0 ${x1Inner} ${y1Inner}`,
        'Z'
      ].join(' ');

      return {
        ...seg,
        pathData,
        startAngle,
        endAngle,
        midAngle: startAngle + angle / 2
      };
    });
  };

  const detailedArcs = useMemo(() => {
    if (!data) return [];
    return calculateDonutArcs(data.detailedSegments, data.totalGenerationGWh);
  }, [data]);

  const aggregatedArcs = useMemo(() => {
    if (!data) return [];
    return calculateDonutArcs(data.aggregatedSegments, data.totalGenerationGWh);
  }, [data]);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Selector Header Bar */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/90 flex flex-col lg:flex-row lg:items-center justify-between gap-6">
        <div className="flex items-center gap-3">
          <div className="p-3 rounded-2xl bg-gradient-to-br from-cyan-500/20 to-blue-600/20 text-cyan-400 border border-cyan-500/30">
            <Globe className="w-6 h-6" />
          </div>
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              Europeisk Kraftmiks
              {data?.isFallback ? (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-amber-500/20 text-amber-300 font-mono font-bold border border-amber-500/40 flex items-center gap-1">
                  <AlertTriangle className="w-3 h-3 text-amber-400" /> MODELLVISNING
                </span>
              ) : (
                <span className="text-xs px-2.5 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 font-mono font-bold border border-emerald-500/40 flex items-center gap-1">
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse"></span> LIVE API
                </span>
              )}
            </h2>
            <p className="text-xs text-slate-400">
              Offentlig netto strømproduksjon fordelt på fornybar, fossil og utveksling for europiske land
            </p>
          </div>
        </div>

        {/* Dropdown Filters */}
        <div className="flex flex-wrap items-center gap-3">
          
          {/* Country Selector */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700 rounded-xl px-3.5 py-2 shadow-lg">
            <span className="text-base">{countryInfo.flag}</span>
            <select
              value={selectedCountry}
              onChange={(e) => setSelectedCountry(e.target.value)}
              className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
            >
              {EUROPEAN_COUNTRIES.map(c => (
                <option key={c.code} value={c.code} className="bg-slate-900 text-white">
                  {c.flag} {c.name} ({c.code.toUpperCase()})
                </option>
              ))}
            </select>
          </div>

          {/* Period Type Selector */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
            {['DAY', 'WEEK', 'MONTH', 'YEAR'].map(p => (
              <button
                key={p}
                onClick={() => setPeriodType(p)}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  periodType === p ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                {p === 'DAY' ? 'Dag' : p === 'WEEK' ? 'Uke' : p === 'MONTH' ? 'Måned' : 'År'}
              </button>
            ))}
          </div>

          {/* Dependent Date Selectors */}
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs font-mono font-semibold">
            <Calendar className="w-3.5 h-3.5 text-cyan-400" />
            
            {/* Year Selector */}
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-slate-200 outline-none cursor-pointer"
            >
              {Array.from({ length: 12 }, (_, i) => currentYr - i).map(yr => (
                <option key={yr} value={yr} className="bg-slate-900 text-white">År {yr}</option>
              ))}
            </select>

            {/* Month Selector if DAY or MONTH */}
            {(periodType === 'DAY' || periodType === 'MONTH') && (
              <select
                value={selectedMonth}
                onChange={(e) => setSelectedMonth(e.target.value)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer"
              >
                {Array.from({ length: 12 }, (_, i) => i + 1).map(m => (
                  <option key={m} value={m} className="bg-slate-900 text-white">{getMonthName(m)}</option>
                ))}
              </select>
            )}

            {/* Day Selector if DAY */}
            {periodType === 'DAY' && (
              <select
                value={selectedDay}
                onChange={(e) => setSelectedDay(e.target.value)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer"
              >
                {Array.from({ length: 31 }, (_, i) => i + 1).map(d => (
                  <option key={d} value={d} className="bg-slate-900 text-white">{d}. dag</option>
                ))}
              </select>
            )}

            {/* Week Selector if WEEK */}
            {periodType === 'WEEK' && (
              <select
                value={selectedWeek}
                onChange={(e) => setSelectedWeek(e.target.value)}
                className="bg-transparent text-slate-200 outline-none cursor-pointer"
              >
                {Array.from({ length: 52 }, (_, i) => i + 1).map(w => (
                  <option key={w} value={w} className="bg-slate-900 text-white">Uke {w}</option>
                ))}
              </select>
            )}
          </div>

        </div>
      </div>

      {isLoading || !data ? (
        <div className="glass-card p-16 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col items-center justify-center gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin"></div>
          <p className="text-xs text-slate-400 font-medium">Henter produksjonsmiks fra Energy-Charts for {countryInfo.name}...</p>
        </div>
      ) : (
        <>
          {/* Main Visualizations: Dual Donut Charts */}
          <div className="glass-card p-6 lg:p-8 rounded-2xl border border-slate-800 bg-slate-950/95 space-y-6">
            
            {/* Offline / Fallback Warning Banner if API was blocked */}
            {data?.isFallback && (
              <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
                <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                <div>
                  <span className="font-bold">Nettverksadvarsel (Modellvisning):</span> Kunne ikke koble direkte til live Energy-Charts API via CORS-proxy på GitHub Pages. Viser estimert historisk Fraunhofer-modell for {countryInfo.name}.
                </div>
              </div>
            )}

            {/* Title Bar inside Chart */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-4 border-b border-slate-800">
              <div>
                <h3 className="text-lg font-bold text-white mb-1">
                  Offentlig netto strømproduksjon i {countryInfo.name} ({dateRange.titleLabel})
                </h3>
                <p className="text-xs text-slate-400">
                  Datakilde: Fraunhofer ISE Energy-Charts API (CC BY 4.0)
                </p>
              </div>

              <div className="flex items-center gap-4 text-xs font-mono">
                <span className="text-yellow-400 font-bold">
                  {data.renewablePct}% Fornybar
                </span>
                <span className="text-slate-500">|</span>
                <span className="text-slate-300 font-bold">
                  Totalt: {formatGWhLabel(data.totalGenerationGWh)}
                </span>
              </div>
            </div>

            {/* Side-by-Side Donut Charts Container */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 items-center pt-4">
              
              {/* Left Donut Chart: Detailed Production Mix */}
              <div className="flex flex-col items-center gap-6">
                <div className="relative w-[280px] h-[280px]">
                  <svg viewBox="0 0 280 280" className="w-full h-full select-none">
                    <g>
                      {detailedArcs.map((arc, idx) => {
                        const isHovered = hoveredSegment === arc.name;
                        return (
                          <path
                            key={idx}
                            d={arc.pathData}
                            fill={arc.color}
                            stroke="#020617"
                            strokeWidth="2"
                            className="transition-all duration-200 cursor-pointer hover:opacity-90"
                            style={{
                              transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                              transformOrigin: '140px 140px'
                            }}
                            onMouseEnter={() => setHoveredSegment(arc.name)}
                            onMouseLeave={() => setHoveredSegment(null)}
                          />
                        );
                      })}
                    </g>
                  </svg>

                  {/* Center Text inside Donut Chart matching reference image */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
                    <span className="text-lg font-black font-mono text-white">
                      {formatGWhLabel(data.totalGenerationGWh)}
                    </span>
                    <span className="text-xs text-slate-400 italic font-serif">of</span>
                    <span className="text-xs font-bold font-mono text-slate-300">
                      {formatGWhLabel(data.grossTotalGWh)}
                    </span>
                  </div>
                </div>

                <div className="text-xs text-slate-400 font-semibold text-center">
                  Spesifisert produksjonsmiks per energikilde
                </div>
              </div>

              {/* Right Donut Chart: Aggregated Renewable vs Fossil */}
              <div className="flex flex-col items-center gap-6 border-t lg:border-t-0 lg:border-l border-slate-800 pt-8 lg:pt-0 lg:pl-8">
                <div className="relative w-[280px] h-[280px]">
                  <svg viewBox="0 0 280 280" className="w-full h-full select-none">
                    <g>
                      {aggregatedArcs.map((arc, idx) => {
                        const isHovered = hoveredSegment === arc.name;
                        return (
                          <path
                            key={idx}
                            d={arc.pathData}
                            fill={arc.color}
                            stroke="#020617"
                            strokeWidth="2.5"
                            className="transition-all duration-200 cursor-pointer hover:opacity-90"
                            style={{
                              transform: isHovered ? 'scale(1.03)' : 'scale(1)',
                              transformOrigin: '140px 140px'
                            }}
                            onMouseEnter={() => setHoveredSegment(arc.name)}
                            onMouseLeave={() => setHoveredSegment(null)}
                          />
                        );
                      })}
                    </g>
                  </svg>

                  {/* Center Text inside Donut Chart */}
                  <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center p-4">
                    <span className="text-lg font-black font-mono text-yellow-400">
                      {data.renewablePct}%
                    </span>
                    <span className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
                      Fornybar-andel
                    </span>
                  </div>
                </div>

                <div className="flex justify-center gap-6 text-xs font-mono">
                  {data.aggregatedSegments.map(s => (
                    <div key={s.name} className="flex items-center gap-2">
                      <span className="w-3 h-3 rounded-full inline-block" style={{ backgroundColor: s.color }}></span>
                      <span className="text-slate-200 font-bold">{s.label}:</span>
                      <span className="text-slate-400">{formatGWhLabel(s.gwh)} ({s.pct}%)</span>
                    </div>
                  ))}
                </div>
              </div>

            </div>

            {/* Detailed Legend Grid Matching Reference Image */}
            <div className="pt-6 border-t border-slate-800">
              <h4 className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-4">
                Forklaring Energikilder ({data.detailedSegments.length} aktive kilder)
              </h4>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 text-xs font-mono">
                {data.detailedSegments.map(seg => {
                  const isHovered = hoveredSegment === seg.name;
                  return (
                    <div
                      key={seg.name}
                      onMouseEnter={() => setHoveredSegment(seg.name)}
                      onMouseLeave={() => setHoveredSegment(null)}
                      className={`p-2.5 rounded-xl border transition-all cursor-pointer flex items-center justify-between gap-2 ${
                        isHovered ? 'bg-slate-900 border-cyan-500/50 shadow-md' : 'bg-slate-950/60 border-slate-800/80 hover:bg-slate-900/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: seg.color }}></span>
                        <span className="text-slate-200 font-medium truncate">{seg.displayName || translateSource(seg.name)}</span>
                      </div>
                      <div className="text-right shrink-0">
                        <span className="font-bold text-white">{formatGWhLabel(seg.gwh)}</span>
                        <span className="text-[10px] text-slate-400 ml-1">({seg.pct}%)</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>

          </div>

          {/* Time Series Area Chart (Utvikling over tid) */}
          {data.timeSeries && data.timeSeries.length > 0 && (
            <div className="glass-card p-6 lg:p-8 rounded-2xl border border-slate-800 bg-slate-950/95 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-white flex items-center gap-2">
                    <TrendingUp className="w-5 h-5 text-cyan-400" />
                    Produksjonsutvikling over tid ({countryInfo.name})
                  </h3>
                  <p className="text-xs text-slate-400">
                    Tidsserie for valgt periode ({dateRange.titleLabel})
                  </p>
                </div>
              </div>

              {/* Time Series Stacked Visualizer */}
              <div className="h-64 flex items-end gap-2 pt-8 pb-2 px-2 border-b border-slate-800 overflow-x-auto relative">
                {data.timeSeries.map((point, pIdx) => {
                  const activeSources = Object.keys(point.sources);
                  const totalStepGWh = activeSources.reduce((sum, s) => sum + point.sources[s], 0);
                  const maxBarGWh = Math.max(...data.timeSeries.map(p => Object.values(p.sources).reduce((a, b) => a + b, 0)), 1);
                  const barPctHeight = Math.min(100, Math.max(12, (totalStepGWh / maxBarGWh) * 100));
                  const isHovered = hoveredTimePoint?.dateLabel === point.dateLabel;

                  return (
                    <div
                      key={pIdx}
                      onMouseEnter={() => handleBarMouseEnter(point)}
                      onMouseLeave={handleBarMouseLeave}
                      className="flex-1 min-w-[28px] h-full flex flex-col justify-end items-center group relative cursor-pointer"
                    >
                      <div className={`w-full rounded-t-lg overflow-hidden flex flex-col-reverse transition-all ${
                        isHovered ? 'ring-2 ring-cyan-400 opacity-100 scale-105' : 'opacity-85 hover:opacity-100'
                      }`}
                      style={{ height: `${barPctHeight}%` }}
                      >
                        {activeSources.map(sName => {
                          const val = point.sources[sName];
                          const pctStep = totalStepGWh > 0 ? (val / totalStepGWh) * 100 : 0;
                          return (
                            <div
                              key={sName}
                              style={{
                                height: `${pctStep}%`,
                                backgroundColor: SOURCE_COLORS[sName] || '#94a3b8'
                              }}
                            />
                          );
                        })}
                      </div>

                      {/* Clean X-axis bar label */}
                      <span className="text-[11px] font-mono text-slate-400 font-semibold mt-2 truncate">
                        {point.dateLabel}
                      </span>
                    </div>
                  );
                })}
              </div>

              {/* Hover Tooltip for Time Series */}
              {hoveredTimePoint && (
                <div className="p-3 rounded-xl bg-slate-900 border border-slate-800 text-xs font-mono flex flex-wrap items-center justify-between gap-4">
                  <span className="font-bold text-white">{hoveredTimePoint.dateLabel}</span>
                  <div className="flex flex-wrap items-center gap-3">
                    {Object.keys(hoveredTimePoint.sources)
                      .filter(sName => sName !== 'Cross border electricity trading')
                      .slice(0, 6)
                      .map(sName => (
                        <span key={sName} className="flex items-center gap-1.5">
                          <span className="w-2.5 h-2.5 rounded-full inline-block" style={{ backgroundColor: SOURCE_COLORS[sName] || '#94a3b8' }}></span>
                          <span className="text-slate-300">{translateSource(sName)}:</span>
                          <span className="text-cyan-400 font-bold">{formatGWhLabel(hoveredTimePoint.sources[sName])}</span>
                        </span>
                      ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </>
      )}

    </div>
  );
}

function getMonthName(m) {
  const months = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];
  return months[m - 1] || 'Januar';
}

function formatGWhLabel(gwh) {
  if (gwh >= 1000) {
    return `${(gwh / 1000).toFixed(2)} TWh`;
  }
  return `${gwh.toFixed(1)} GWh`;
}
