import React, { useState } from 'react';
import { getAnnualPriceHistory, getMonthlyPriceHistoryForYear, getDailyPriceHistoryForMonth } from '../services/priceHistoryService';
import { ZONES } from '../services/electricityApi';
import { BarChart3, Calendar, Layers, ArrowUpRight, ArrowDownRight, Info, Filter, ChevronDown } from 'lucide-react';

export default function PriceHistory() {
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_ph_view_mode') || 'DAILY'; // 'DAILY', 'MONTHLY', 'ANNUAL'
  });

  const [selectedYear, setSelectedYear] = useState(() => {
    return Number(localStorage.getItem('norsk_kraftpuls_ph_year')) || 2026;
  });

  const [selectedMonth, setSelectedMonth] = useState(() => {
    return Number(localStorage.getItem('norsk_kraftpuls_ph_month')) || 7; // July default
  });

  const [filterZone, setFilterZone] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_home_zone') || 'ALL'; // 'ALL', 'NO1', 'NO2', 'NO3', 'NO4', 'NO5'
  });

  const [includeVat, setIncludeVat] = useState(true);
  const [hoveredItem, setHoveredItem] = useState(null);
  const [isTableExpanded, setIsTableExpanded] = useState(false);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('norsk_kraftpuls_ph_view_mode', mode);
  };

  const handleYearChange = (yr) => {
    const numYear = Number(yr);
    setSelectedYear(numYear);
    localStorage.setItem('norsk_kraftpuls_ph_year', numYear);

    const today = new Date();
    if (numYear === today.getFullYear()) {
      const maxMonth = today.getMonth() + 1;
      if (selectedMonth > maxMonth) {
        setSelectedMonth(maxMonth);
        localStorage.setItem('norsk_kraftpuls_ph_month', maxMonth);
      }
    }
  };

  const handleMonthChange = (mn) => {
    const numMonth = Number(mn);
    setSelectedMonth(numMonth);
    localStorage.setItem('norsk_kraftpuls_ph_month', numMonth);
  };

  // Get data dataset based on current viewMode
  let rawDataset = [];
  if (viewMode === 'DAILY') {
    rawDataset = getDailyPriceHistoryForMonth(selectedYear, selectedMonth);
  } else if (viewMode === 'MONTHLY') {
    rawDataset = getMonthlyPriceHistoryForYear(selectedYear);
  } else {
    rawDataset = getAnnualPriceHistory();
  }

  const vatFactor = (includeVat) ? 1.25 : 1.0;

  // Calculate stats for current dataset
  const getOreValue = (nokVal, zoneId) => {
    const isNo4 = zoneId === 'NO4';
    const factor = (includeVat && !isNo4) ? 1.25 : 1.0;
    return nokVal * factor * 100;
  };

  // Calculate overall stats
  let totalSum = 0;
  let itemCount = 0;
  let minRecord = { ore: Infinity, label: '', zone: '' };
  let maxRecord = { ore: -Infinity, label: '', zone: '' };

  rawDataset.forEach(item => {
    const zonesToEvaluate = filterZone === 'ALL' ? ['NO1', 'NO2', 'NO3', 'NO4', 'NO5'] : [filterZone];
    
    zonesToEvaluate.forEach(zId => {
      const nok = item[zId] || 0;
      const ore = getOreValue(nok, zId);
      totalSum += ore;
      itemCount++;

      if (ore < minRecord.ore) {
        minRecord = { ore, label: item.label, zone: zId };
      }
      if (ore > maxRecord.ore) {
        maxRecord = { ore, label: item.label, zone: zId };
      }
    });
  });

  const periodAverageOre = itemCount > 0 ? (totalSum / itemCount) : 0;

  const monthNames = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Header & Filter Controls Bar */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/80 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <BarChart3 className="w-5 h-5 text-cyan-400" />
              Historiske Spotpriser & Gjennomsnitt
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Historisk spotprisutvikling for dager i måneden, måneder i året og årlig snitt (NO1–NO5)
            </p>
          </div>

          {/* View Mode Toggle Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
              <button
                onClick={() => handleViewModeChange('DAILY')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'DAILY' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Dager i Måned
              </button>
              
              <button
                onClick={() => handleViewModeChange('MONTHLY')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'MONTHLY' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Måneder i År
              </button>

              <button
                onClick={() => handleViewModeChange('ANNUAL')}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  viewMode === 'ANNUAL' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
                }`}
              >
                Årlig Gjennomsnitt
              </button>
            </div>

            {/* MVA Toggle */}
            <button
              onClick={() => setIncludeVat(!includeVat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all border ${
                includeVat 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              MVA (25%)
            </button>
          </div>
        </div>

        {/* Dropdowns row for Year, Month and Zone Filter */}
        <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-800/80">
          
          {/* Year Dropdown */}
          {viewMode !== 'ANNUAL' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">År:</span>
              <select
                value={selectedYear}
                onChange={(e) => handleYearChange(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono font-bold rounded-xl px-3 py-1.5 outline-none focus:border-cyan-500"
              >
                <option value={2026}>2026</option>
                <option value={2025}>2025</option>
                <option value={2024}>2024</option>
                <option value={2023}>2023</option>
                <option value={2022}>2022</option>
                <option value={2021}>2021</option>
              </select>
            </div>
          )}

          {/* Month Dropdown (only for DAILY view) */}
          {viewMode === 'DAILY' && (
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-slate-400 font-medium">Måned:</span>
              <select
                value={selectedMonth}
                onChange={(e) => handleMonthChange(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono font-bold rounded-xl px-3 py-1.5 outline-none focus:border-cyan-500"
              >
                {(() => {
                const today = new Date();
                const maxMonth = selectedYear === today.getFullYear() ? (today.getMonth() + 1) : 12;
                return monthNames.slice(0, maxMonth).map((mName, mIdx) => (
                  <option key={mIdx + 1} value={mIdx + 1}>
                    {mName}
                  </option>
                ));
              })()}
              </select>
            </div>
          )}

          {/* Zone Filter Dropdown */}
          <div className="flex items-center gap-1.5">
            <span className="text-xs text-slate-400 font-medium">Prisområde:</span>
            <select
              value={filterZone}
              onChange={(e) => setFilterZone(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono font-bold rounded-xl px-3 py-1.5 outline-none focus:border-cyan-500"
            >
              <option value="ALL">Alle Soner (Gjennomsnitt)</option>
              {ZONES.map(z => (
                <option key={z.id} value={z.id}>
                  {z.id} - {z.city.split('/')[0]}
                </option>
              ))}
            </select>
          </div>

        </div>
      </div>

      {/* Aggregate Stats Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Gjennomsnitt i Perioden</span>
            <BarChart3 className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-3xl font-black font-mono text-cyan-400">
            {periodAverageOre.toFixed(1)} <span className="text-sm font-normal text-slate-400">øre/kWh</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            {filterZone === 'ALL' ? 'Nasjonalt snitt for NO1–NO5' : `Snitt for ${filterZone}`}
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Laveste Notering</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-black font-mono text-emerald-400">
            {minRecord.ore !== Infinity ? minRecord.ore.toFixed(1) : 0} <span className="text-sm font-normal text-slate-400">øre</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            {minRecord.label} ({minRecord.zone})
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Høyeste Notering</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-3xl font-black font-mono text-rose-400">
            {maxRecord.ore !== -Infinity ? maxRecord.ore.toFixed(1) : 0} <span className="text-sm font-normal text-slate-400">øre</span>
          </div>
          <div className="text-xs text-slate-400 mt-1 font-mono">
            {maxRecord.label} ({maxRecord.zone})
          </div>
        </div>
      </div>

      {/* Interactive Price Curve Chart */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/90 space-y-6">
        
        <div className="flex items-center justify-between">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Calendar className="w-5 h-5 text-cyan-400" />
            {viewMode === 'DAILY' && `Daglige Spotpriser for ${monthNames[selectedMonth - 1]} ${selectedYear}`}
            {viewMode === 'MONTHLY' && `Månedlige Spotpriser for ${selectedYear}`}
            {viewMode === 'ANNUAL' && `Årlig Spotprisutvikling (2021–2026)`}
          </h3>

          <div className="text-xs font-mono text-slate-400">
            {filterZone === 'ALL' ? 'Viser samtlige soner' : `Viser kun ${filterZone}`}
          </div>
        </div>

        {/* Hover Info Strip */}
        <div className="h-9 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
          {hoveredItem ? (
            <>
              <span className="font-bold text-white">{hoveredItem.label}</span>
              <span className="text-blue-400 font-semibold">NO1: {getOreValue(hoveredItem.NO1, 'NO1').toFixed(1)} øre/kWh</span>
              <span className="text-emerald-400 font-semibold">NO2: {getOreValue(hoveredItem.NO2, 'NO2').toFixed(1)} øre/kWh</span>
              <span className="text-amber-400 font-semibold">NO3: {getOreValue(hoveredItem.NO3, 'NO3').toFixed(1)} øre/kWh</span>
              <span className="text-purple-400 font-semibold">NO4: {getOreValue(hoveredItem.NO4, 'NO4').toFixed(1)} øre/kWh</span>
              <span className="text-pink-400 font-semibold">NO5: {getOreValue(hoveredItem.NO5, 'NO5').toFixed(1)} øre/kWh</span>
            </>
          ) : (
            <span className="text-slate-500 italic">Beveg musen over en stolpe for komplett prisbilde per sone</span>
          )}
        </div>

        {/* Graph Container with Relative Dynamic Min-Max Scaling */}
        {(() => {
          const allValues = rawDataset.map(d => {
            return filterZone === 'ALL'
              ? getOreValue(d.nationalAvg, 'NO1')
              : getOreValue(d[filterZone] || 0, filterZone);
          });

          const minVal = Math.min(...allValues);
          const maxVal = Math.max(...allValues);
          const range = Math.max(0.1, maxVal - minVal);

          return (
            <div className="h-72 flex items-end gap-1 sm:gap-2 pt-12 pb-1 border-b border-slate-800/80 px-2 overflow-x-auto">
              {rawDataset.map((item, idx) => {
                const displayedOre = filterZone === 'ALL'
                  ? getOreValue(item.nationalAvg, 'NO1')
                  : getOreValue(item[filterZone] || 0, filterZone);

                // Relative scaling: minVal -> 15% height, maxVal -> 95% height
                const rel = (displayedOre - minVal) / range;
                const heightPercent = 15 + rel * 80;
                const isHovered = hoveredItem?.label === item.label;
                const isMaxBar = Math.abs(displayedOre - maxVal) < 0.01;
                const isMinBar = Math.abs(displayedOre - minVal) < 0.01;

                return (
                  <div
                    key={idx}
                    onMouseEnter={() => setHoveredItem(item)}
                    onMouseLeave={() => setHoveredItem(null)}
                    className="flex-1 min-w-[20px] flex flex-col items-center h-full justify-end group relative cursor-pointer"
                  >
                    {/* Bar */}
                    <div
                      className={`w-full rounded-t-md transition-all duration-300 ${
                        isHovered
                          ? 'bg-gradient-to-t from-cyan-600 to-cyan-300 shadow-lg shadow-cyan-500/30 ring-2 ring-cyan-400'
                          : isMaxBar
                          ? 'bg-gradient-to-t from-rose-900 via-rose-700 to-rose-500 shadow-md shadow-rose-500/20'
                          : isMinBar
                          ? 'bg-gradient-to-t from-emerald-900 via-emerald-700 to-emerald-500 shadow-md shadow-emerald-500/20'
                          : 'bg-gradient-to-t from-slate-800 via-cyan-950 to-cyan-800/70 hover:from-cyan-900 hover:to-cyan-500/80'
                      }`}
                      style={{ height: `${heightPercent}%` }}
                    />

                    {/* X-axis Label */}
                    <div className="mt-2 text-[10px] font-mono text-slate-400 group-hover:text-cyan-300 truncate">
                      {viewMode === 'DAILY' ? item.day : (viewMode === 'MONTHLY' ? item.monthName : item.year)}
                    </div>
                  </div>
                );
              })}
            </div>
          );
        })()}

      </div>

      {/* Detailed Data Table (Collapsible Accordion) */}
      <div className="glass-card rounded-2xl border border-slate-800 bg-slate-950/80 overflow-hidden transition-all">
        
        {/* Accordion Toggle Header */}
        <button
          onClick={() => setIsTableExpanded(!isTableExpanded)}
          className="w-full p-5 flex items-center justify-between text-left hover:bg-slate-900/60 transition-all cursor-pointer select-none"
        >
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Layers className="w-4.5 h-4.5" />
            </div>
            <div>
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                Komplett Pristabell (øre/kWh)
                <span className="text-xs font-mono font-normal text-slate-400">({rawDataset.length} rader)</span>
              </h3>
              <p className="text-xs text-slate-400">
                {isTableExpanded ? 'Klikk for å skjule tabellen' : 'Klikk for å vise alle historiske tall per prissone'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-xs font-semibold text-cyan-300 bg-slate-900 border border-slate-800 px-3.5 py-2 rounded-xl shadow-md group-hover:border-cyan-500/50">
            <span>{isTableExpanded ? 'Skjul tabell' : 'Vis tabell'}</span>
            <ChevronDown className={`w-4 h-4 text-cyan-400 transition-transform duration-200 ${isTableExpanded ? 'rotate-180' : ''}`} />
          </div>
        </button>

        {/* Collapsible Content */}
        {isTableExpanded && (
          <div className="p-6 pt-0 border-t border-slate-800/80 animate-fade-in">
            <div className="overflow-x-auto mt-4">
              <table className="w-full text-left border-collapse text-xs font-mono">
                <thead>
                  <tr className="border-b border-slate-800 text-slate-400 font-semibold uppercase tracking-wider">
                    <th className="py-2.5 px-3">Periode</th>
                    <th className="py-2.5 px-3 text-blue-400">NO1 (Øst)</th>
                    <th className="py-2.5 px-3 text-emerald-400">NO2 (Sør)</th>
                    <th className="py-2.5 px-3 text-amber-400">NO3 (Midt)</th>
                    <th className="py-2.5 px-3 text-purple-400">NO4 (Nord)</th>
                    <th className="py-2.5 px-3 text-pink-400">NO5 (Vest)</th>
                    <th className="py-2.5 px-3 text-cyan-300">Snitt Norge</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 text-slate-200">
                  {rawDataset.map((item, idx) => (
                    <tr key={idx} className="hover:bg-slate-900/60 transition-colors">
                      <td className="py-2 px-3 font-bold text-white">{item.label}</td>
                      <td className="py-2 px-3">{getOreValue(item.NO1, 'NO1').toFixed(1)} øre</td>
                      <td className="py-2 px-3">{getOreValue(item.NO2, 'NO2').toFixed(1)} øre</td>
                      <td className="py-2 px-3">{getOreValue(item.NO3, 'NO3').toFixed(1)} øre</td>
                      <td className="py-2 px-3">{getOreValue(item.NO4, 'NO4').toFixed(1)} øre</td>
                      <td className="py-2 px-3">{getOreValue(item.NO5, 'NO5').toFixed(1)} øre</td>
                      <td className="py-2 px-3 font-bold text-cyan-300">{getOreValue(item.nationalAvg, 'NO1').toFixed(1)} øre</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>

    </div>
  );
}
