import React, { useState, useEffect } from 'react';
import { fetchNVEMagasinData, RESERVOIR_AREAS } from '../services/nveApi';
import { Droplet, Calendar, MapPin, TrendingUp, TrendingDown, Info, ShieldCheck } from 'lucide-react';

export default function ReservoirChart() {
  const [nveData, setNveData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedAreaId, setSelectedAreaId] = useState('NO');
  const [selectedYear, setSelectedYear] = useState('2026');
  const [hoveredWeekData, setHoveredWeekData] = useState(null);

  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setIsLoading(true);
      const data = await fetchNVEMagasinData();
      if (isMounted) {
        setNveData(data);
        setIsLoading(false);
      }
    }
    loadData();
    return () => { isMounted = false; };
  }, []);

  if (isLoading || !nveData) {
    return (
      <div className="glass-card p-12 rounded-2xl border border-slate-800 bg-slate-950/80 flex flex-col items-center justify-center gap-4">
        <div className="w-10 h-10 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin"></div>
        <p className="text-xs text-slate-400 font-medium">Henter magasinstatistikk fra NVE (Vannmagasiner)...</p>
      </div>
    );
  }

  const currentArea = nveData[selectedAreaId] || nveData['NO'];
  const availableYears = currentArea.availableYears || [2026, 2025, 2024];

  // Fallback to latest available year if selectedYear not present
  const activeYear = availableYears.includes(Number(selectedYear))
    ? Number(selectedYear)
    : availableYears[0];

  const minMaxMedian = currentArea.minMaxMedian || [];
  const yearWeekly = currentArea.yearlyData[activeYear] || [];

  // Build week-by-week lookup (weeks 1 to 52)
  const weekMap = [];
  for (let uke = 1; uke <= 52; uke++) {
    const ref = minMaxMedian.find(m => m.week === uke) || { minPct: 0, medianPct: 50, maxPct: 100 };
    const curr = yearWeekly.find(w => w.week === uke) || null;
    weekMap.push({
      week: uke,
      minPct: ref.minPct,
      medianPct: ref.medianPct,
      maxPct: ref.maxPct,
      minTwh: ref.minTwh,
      medianTwh: ref.medianTwh,
      maxTwh: ref.maxTwh,
      fillingPct: curr ? curr.fillingPct : null,
      fillingTwh: curr ? curr.fillingTwh : null,
      capacityTwh: curr ? curr.capacityTwh : null,
      changePct: curr ? curr.changePct : null,
      date: curr ? curr.date : null,
    });
  }

  // Active hover item or latest available week
  const latestFilledWeek = [...weekMap].reverse().find(w => w.fillingPct !== null);
  const activeHover = hoveredWeekData || latestFilledWeek || weekMap[0];

  // SVG Chart Dimensions
  const svgWidth = 850;
  const svgHeight = 440;
  const marginTop = 35;
  const marginBottom = 55;
  const marginLeft = 60;
  const marginRight = 75;

  const chartW = svgWidth - marginLeft - marginRight;
  const chartH = svgHeight - marginTop - marginBottom;

  const getX = (week) => marginLeft + ((week - 1) / 51) * chartW;
  const getY = (pct) => marginTop + ((100 - pct) / 100) * chartH;

  // Build SVG Paths
  const minPoints = weekMap.map(w => `${getX(w.week)},${getY(w.minPct)}`);
  const maxPoints = weekMap.map(w => `${getX(w.week)},${getY(w.maxPct)}`);
  const medianPoints = weekMap.map(w => `${getX(w.week)},${getY(w.medianPct)}`);

  // Path string for dashed Min and Maks curves
  const minPath = `M ${minPoints.join(' L ')}`;
  const maxPath = `M ${maxPoints.join(' L ')}`;
  const medianPath = `M ${medianPoints.join(' L ')}`;

  // Shaded Polygon / Area between Min and Maks
  const reversedMaxPoints = [...maxPoints].reverse();
  const areaShadedPath = `M ${minPoints.join(' L ')} L ${reversedMaxPoints.join(' L ')} Z`;

  // Selected Year path (up to last week with data)
  const activeYearWeeks = weekMap.filter(w => w.fillingPct !== null);
  const yearPoints = activeYearWeeks.map(w => `${getX(w.week)},${getY(w.fillingPct)}`);
  const yearPath = yearPoints.length > 0 ? `M ${yearPoints.join(' L ')}` : '';

  // End coordinates for right labels
  const lastWeek = weekMap[51] || weekMap[weekMap.length - 1];
  const endX = getX(52) + 10;
  const endMaxY = getY(lastWeek.maxPct);
  const endMedY = getY(lastWeek.medianPct);
  const endMinY = getY(lastWeek.minPct);

  return (
    <div className="space-y-6">

      {/* Selector Header Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/90">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
            <Droplet className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-bold text-white text-base">Fyllingsgrad i Vannmagasiner</h3>
            <p className="text-xs text-slate-400">Ukentlig fyllingsgrad (%) med historisk min, maks og median fra NVE</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {/* Area Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <MapPin className="w-4 h-4 text-cyan-400" />
            <select
              value={selectedAreaId}
              onChange={(e) => setSelectedAreaId(e.target.value)}
              className="bg-transparent text-white font-bold text-xs outline-none cursor-pointer"
            >
              {RESERVOIR_AREAS.map(area => (
                <option key={area.id} value={area.id} className="bg-slate-900 text-white">
                  {area.label}
                </option>
              ))}
            </select>
          </div>

          {/* Year Selector */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 rounded-xl px-3 py-1.5">
            <Calendar className="w-4 h-4 text-cyan-400" />
            <select
              value={selectedYear}
              onChange={(e) => setSelectedYear(e.target.value)}
              className="bg-transparent text-white font-mono font-bold text-xs outline-none cursor-pointer"
            >
              {availableYears.map(yr => (
                <option key={yr} value={yr} className="bg-slate-900 text-white">
                  År {yr}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Info Strip (Mouseover / Current Status) */}
      <div className="p-4 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
        {activeHover ? (
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-2">
              <span className="font-bold text-white text-sm">
                Uke {activeHover.week} {activeHover.date ? `(${activeHover.date})` : ''}
              </span>
              <span className="text-slate-500">|</span>
              <span className="text-slate-400">{currentArea.label} ({activeYear})</span>
            </div>

            <div className="flex flex-wrap items-center gap-4">
              <div className="flex items-center gap-1">
                <span className="text-slate-400">Fylling:</span>
                <span className="text-cyan-400 font-black text-sm">
                  {activeHover.fillingPct !== null ? `${activeHover.fillingPct}%` : 'Ingen data'}
                </span>
                {activeHover.fillingTwh && (
                  <span className="text-slate-400 text-[11px]">({activeHover.fillingTwh} TWh)</span>
                )}
              </div>

              {activeHover.changePct !== null && (
                <div className={`flex items-center gap-0.5 font-bold ${activeHover.changePct >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  {activeHover.changePct >= 0 ? <TrendingUp className="w-3.5 h-3.5" /> : <TrendingDown className="w-3.5 h-3.5" />}
                  <span>{activeHover.changePct >= 0 ? `+${activeHover.changePct}%` : `${activeHover.changePct}%`}</span>
                </div>
              )}

              <span className="text-slate-600">|</span>

              <div className="flex items-center gap-3 text-[11px]">
                <span className="text-rose-400 font-semibold">Median: {activeHover.medianPct}%</span>
                <span className="text-rose-400/80">Min: {activeHover.minPct}%</span>
                <span className="text-rose-400/80">Maks: {activeHover.maxPct}%</span>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-slate-500 italic text-center">
            Beveg musen over grafen for detaljer per uke
          </div>
        )}
      </div>

      {/* SVG Line Chart Canvas */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/95 shadow-2xl relative overflow-hidden">
        
        {/* Title inside chart matching user reference image */}
        <div className="text-sm font-bold text-slate-200 tracking-wide mb-2 flex items-center justify-between">
          <span>Fyllingsgrad (%) {currentArea.label}, {activeYear}</span>
          <div className="flex items-center gap-4 text-xs font-mono">
            <span className="flex items-center gap-1.5 text-cyan-400">
              <span className="w-3 h-0.5 bg-cyan-400 inline-block"></span> År {activeYear}
            </span>
            <span className="flex items-center gap-1.5 text-rose-400">
              <span className="w-3 h-0.5 bg-rose-500 inline-block"></span> Median (1995–2025)
            </span>
            <span className="flex items-center gap-1.5 text-rose-400/70">
              <span className="w-3 h-0.5 border-b border-dashed border-rose-400 inline-block"></span> Min / Maks
            </span>
          </div>
        </div>

        <div className="w-full overflow-x-auto">
          <div className="min-w-[650px] relative">
            <svg
              viewBox={`0 0 ${svgWidth} ${svgHeight}`}
              className="w-full h-auto select-none"
              onMouseLeave={() => setHoveredWeekData(null)}
            >
              <defs>
                {/* Translucent Rose Fill for Min-Maks Band */}
                <linearGradient id="roseBandGradient" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#f43f5e" stopOpacity="0.16" />
                  <stop offset="100%" stopColor="#f43f5e" stopOpacity="0.04" />
                </linearGradient>
                {/* Cyan Glow for Active Year Line */}
                <filter id="cyanGlow" x="-20%" y="-20%" width="140%" height="140%">
                  <feGaussianBlur stdDeviation="3" result="blur" />
                  <feComposite in="SourceGraphic" in2="blur" operator="over" />
                </filter>
              </defs>

              {/* Y-Axis Horizontal Grid Lines (0%, 20%, 40%, 60%, 80%, 100%) */}
              {[0, 20, 40, 60, 80, 100].map(pct => {
                const y = getY(pct);
                return (
                  <g key={pct}>
                    <line
                      x1={marginLeft}
                      y1={y}
                      x2={svgWidth - marginRight}
                      y2={y}
                      stroke="#334155"
                      strokeWidth="1"
                      strokeDasharray="4 4"
                      opacity="0.6"
                    />
                    <text
                      x={marginLeft - 12}
                      y={y + 4}
                      fill="#94a3b8"
                      fontSize="12"
                      fontFamily="monospace"
                      textAnchor="end"
                    >
                      {pct} %
                    </text>
                  </g>
                );
              })}

              {/* Shaded Area between Min and Maks Curves */}
              <path
                d={areaShadedPath}
                fill="url(#roseBandGradient)"
              />

              {/* Dashed Min Curve */}
              <path
                d={minPath}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="1.8"
                strokeDasharray="4 4"
                opacity="0.8"
              />

              {/* Dashed Maks Curve */}
              <path
                d={maxPath}
                fill="none"
                stroke="#f43f5e"
                strokeWidth="1.8"
                strokeDasharray="4 4"
                opacity="0.8"
              />

              {/* Solid Median Curve */}
              <path
                d={medianPath}
                fill="none"
                stroke="#e11d48"
                strokeWidth="2.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />

              {/* Solid Bold Active Year Curve */}
              {yearPath && (
                <path
                  d={yearPath}
                  fill="none"
                  stroke="#38bdf8"
                  strokeWidth="3.5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  filter="url(#cyanGlow)"
                />
              )}

              {/* Right Edge Text Labels: Maks, Median, Min */}
              <text x={endX} y={endMaxY + 4} fill="#f43f5e" fontSize="11" fontFamily="sans-serif" fontWeight="bold">
                Maks
              </text>
              <text x={endX} y={endMedY + 4} fill="#e11d48" fontSize="11" fontFamily="sans-serif" fontWeight="bold">
                Median
              </text>
              <text x={endX} y={endMinY + 4} fill="#f43f5e" fontSize="11" fontFamily="sans-serif" fontWeight="bold">
                Min
              </text>

              {/* X-Axis Ticks (Weeks 1, 10, 20, 30, 40, 50, 52) */}
              {[1, 10, 20, 30, 40, 50, 52].map(uke => {
                const x = getX(uke);
                return (
                  <g key={uke}>
                    <line
                      x1={x}
                      y1={marginTop + chartH}
                      x2={x}
                      y2={marginTop + chartH + 6}
                      stroke="#475569"
                      strokeWidth="1"
                    />
                    <text
                      x={x}
                      y={marginTop + chartH + 22}
                      fill="#94a3b8"
                      fontSize="12"
                      fontFamily="monospace"
                      textAnchor="middle"
                    >
                      {uke}
                    </text>
                  </g>
                );
              })}

              {/* X-Axis Label */}
              <text
                x={marginLeft + chartW / 2}
                y={svgHeight - 10}
                fill="#cbd5e1"
                fontSize="12"
                fontWeight="600"
                textAnchor="middle"
              >
                Ukenummer
              </text>

              {/* Interactive Mouse Hover Overlay Columns for Weeks 1 to 52 */}
              {weekMap.map((w) => {
                const x = getX(w.week);
                const colW = chartW / 52;
                const isHovered = activeHover?.week === w.week;

                return (
                  <rect
                    key={w.week}
                    x={x - colW / 2}
                    y={marginTop}
                    width={colW}
                    height={chartH}
                    fill="transparent"
                    className="cursor-pointer"
                    onMouseEnter={() => setHoveredWeekData(w)}
                  />
                );
              })}

              {/* Active Hover Indicator Line & Circles */}
              {activeHover && (
                <g className="pointer-events-none transition-all duration-150">
                  {/* Vertical Guide Line */}
                  <line
                    x1={getX(activeHover.week)}
                    y1={marginTop}
                    x2={getX(activeHover.week)}
                    y2={marginTop + chartH}
                    stroke="#38bdf8"
                    strokeWidth="1.5"
                    strokeDasharray="3 3"
                    opacity="0.8"
                  />

                  {/* Median Circle Dot */}
                  <circle
                    cx={getX(activeHover.week)}
                    cy={getY(activeHover.medianPct)}
                    r="4"
                    fill="#e11d48"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />

                  {/* Selected Year Circle Dot */}
                  {activeHover.fillingPct !== null && (
                    <circle
                      cx={getX(activeHover.week)}
                      cy={getY(activeHover.fillingPct)}
                      r="6"
                      fill="#06b6d4"
                      stroke="#ffffff"
                      strokeWidth="2.5"
                    />
                  )}
                </g>
              )}
            </svg>
          </div>
        </div>

      </div>

    </div>
  );
}
