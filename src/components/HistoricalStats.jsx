import React, { useState } from 'react';
import { Database, TrendingUp, TrendingDown, Layers, Calendar, BarChart2, PieChart, Info, ArrowUpRight, ArrowDownRight } from 'lucide-react';

export default function HistoricalStats({ monthlyData = [], annualData = [], isLoading }) {
  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_ssb_view_mode') || 'MONTHLY';
  });

  const [selectedYear, setSelectedYear] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_ssb_selected_year') || 'ALL';
  });

  const [hoveredData, setHoveredData] = useState(null);

  const handleViewModeChange = (mode) => {
    setViewMode(mode);
    localStorage.setItem('norsk_kraftpuls_ssb_view_mode', mode);
  };

  const handleYearChange = (year) => {
    setSelectedYear(year);
    localStorage.setItem('norsk_kraftpuls_ssb_selected_year', year);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">Henter historiske kraftdata fra SSB (Statistisk sentralbyrå)...</p>
      </div>
    );
  }

  // Filter monthly data by selected year if needed
  const displayMonthly = selectedYear === 'ALL' 
    ? monthlyData.slice(-36) // Last 3 years of monthly data for readable chart
    : monthlyData.filter(d => String(d.year) === String(selectedYear));

  // Compute aggregate stats for current view
  const currentDataset = viewMode === 'MONTHLY' ? displayMonthly : annualData;

  const totalImport = currentDataset.reduce((sum, d) => sum + (d.import || 0), 0);
  const totalExport = currentDataset.reduce((sum, d) => sum + (d.export || 0), 0);
  const netExport = totalExport - totalImport;
  const isNetExport = netExport >= 0;

  const totalHydro = currentDataset.reduce((sum, d) => sum + (d.hydro || 0), 0);
  const totalWind = currentDataset.reduce((sum, d) => sum + (d.wind || 0), 0);
  const totalSolar = currentDataset.reduce((sum, d) => sum + (d.solar || 0), 0);
  const totalThermal = currentDataset.reduce((sum, d) => sum + (d.thermal || 0), 0);
  const totalProd = currentDataset.reduce((sum, d) => sum + (d.totalProd || (d.hydro + d.wind + d.solar + (d.thermal || 0))), 0);

  const totalGen = Math.max(1, totalHydro + totalWind + totalSolar + totalThermal);
  const hydroPct = ((totalHydro / totalGen) * 100).toFixed(1);
  const windPct = ((totalWind / totalGen) * 100).toFixed(1);
  const solarPct = ((totalSolar / totalGen) * 100).toFixed(1);
  const thermalPct = ((totalThermal / totalGen) * 100).toFixed(1);

  const netSharePercent = totalProd > 0 ? ((Math.abs(netExport) / totalProd) * 100).toFixed(1) : '0.0';

  // Available unique years in monthly dataset
  const availableYears = Array.from(new Set(monthlyData.map(d => d.year))).sort((a, b) => b - a);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Header & Filters */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/80">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            SSB Kraftbalanse & Historikk
          </h2>
          <p className="text-xs text-slate-400">
            Månedlig og årlig import, eksport, produksjonsmiks og nettoforbruk fra SSB Statbank
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          {/* Monthly vs Annual Toggle */}
          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
            <button
              onClick={() => handleViewModeChange('MONTHLY')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'MONTHLY' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Månedlig (GWh)
            </button>
            <button
              onClick={() => handleViewModeChange('ANNUAL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'ANNUAL' ? 'bg-cyan-500 text-slate-950 shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              Årlig (1970–2025)
            </button>
          </div>

          {/* Year Selector dropdown for monthly view */}
          {viewMode === 'MONTHLY' && (
            <select
              value={selectedYear}
              onChange={(e) => handleYearChange(e.target.value)}
              className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono font-semibold rounded-xl px-3 py-2 outline-none focus:border-cyan-500"
            >
              <option value="ALL">Siste 36 Måneder</option>
              {availableYears.map(y => (
                <option key={y} value={y}>År {y}</option>
              ))}
            </select>
          )}

        </div>
      </div>

      {/* Aggregate KPI Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Samlet Eksport</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black font-mono text-emerald-400">
            {totalExport.toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Samlet Import</span>
            <ArrowDownRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black font-mono text-rose-400">
            {totalImport.toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>{isNetExport ? 'Netto Eksport' : 'Netto Import'}</span>
            {isNetExport ? (
              <ArrowUpRight className="w-4 h-4 text-emerald-400" />
            ) : (
              <ArrowDownRight className="w-4 h-4 text-rose-400" />
            )}
          </div>
          <div className={`text-2xl font-black font-mono ${isNetExport ? 'text-emerald-400' : 'text-rose-400'}`}>
            {Math.abs(netExport).toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
          </div>
          <div className={`text-[11px] font-semibold font-mono mt-1 ${isNetExport ? 'text-emerald-400/90' : 'text-rose-400/90'}`}>
            {netSharePercent}% av total produksjon
          </div>
        </div>

        {/* Vannkraftandel Card (Uniform Height with other 3 KPI cards) */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
          <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
            <span>Vannkraftandel</span>
            <PieChart className="w-4 h-4 text-blue-400" />
          </div>
          <div className="text-2xl font-black font-mono text-blue-400">
            {hydroPct}%
          </div>
          <div className="text-[11px] text-slate-400 font-mono mt-1">
            av samlet produksjon
          </div>
        </div>
      </div>

      {/* Main Chart Area */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/90 space-y-6">
        
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-cyan-400" />
            {viewMode === 'MONTHLY' ? 'Månedlig Import, Eksport & Nettbalanse' : 'Årlig Utvikling i Norsk Kraftbalanse (GWh)'}
          </h3>

          <div className="flex items-center gap-4 text-xs font-medium">
            <span className="flex items-center gap-1 text-emerald-400">
              <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Eksport
            </span>
            <span className="flex items-center gap-1 text-rose-400">
              <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span> Import
            </span>
            <span className="flex items-center gap-1 text-cyan-400">
              <span className="w-3 h-3 rounded bg-cyan-400 inline-block"></span> Nettbalanse
            </span>
          </div>
        </div>

        {/* Hovered Item Highlight Strip */}
        <div className="h-9 px-4 py-2 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-between text-xs font-mono">
          {hoveredData ? (
            <>
              <span className="font-bold text-white">Periode: {hoveredData.label}</span>
              <span className="text-emerald-400 font-semibold">Eksport: {(hoveredData.export || 0).toLocaleString()} GWh</span>
              <span className="text-rose-400 font-semibold">Import: {(hoveredData.import || 0).toLocaleString()} GWh</span>
              <span className="text-cyan-400 font-bold">
                Nett: {(hoveredData.netExport || 0) >= 0 ? `+${(hoveredData.netExport || 0).toLocaleString()}` : (hoveredData.netExport || 0).toLocaleString()} GWh
              </span>
            </>
          ) : (
            <span className="text-slate-500 italic">Beveg musen over en søyle for detaljerte tall per periode</span>
          )}
        </div>

        {/* Custom High-Performance Bar/Line Graph with Top Padding */}
        <div className="h-80 flex items-end gap-1 sm:gap-2 pt-16 pb-1 border-b border-slate-800/80 px-2 overflow-x-auto">
          {currentDataset.map((item, idx) => {
            const exp = item.export || 0;
            const imp = item.import || 0;
            const net = item.netExport || 0;

            const maxVal = Math.max(...currentDataset.map(d => Math.max(d.export || 0, d.import || 0, Math.abs(d.netExport || 0))), 100);
            
            const expHeight = (exp / maxVal) * 100;
            const impHeight = (imp / maxVal) * 100;

            const label = viewMode === 'MONTHLY' ? item.label : String(item.year);
            const isHovered = hoveredData?.label === label;

            return (
              <div 
                key={idx} 
                onMouseEnter={() => setHoveredData({ ...item, label })}
                onMouseLeave={() => setHoveredData(null)}
                className="flex-1 min-w-[20px] flex flex-col items-center h-full justify-end group relative cursor-pointer"
              >
                
                {/* Hover Tooltip (Positioned safely inside top padded area) */}
                <div className={`transition-opacity duration-200 absolute top-0 z-30 bg-slate-900/95 border border-slate-700 text-white text-[11px] font-mono px-2.5 py-1.5 rounded-lg shadow-2xl whitespace-nowrap pointer-events-none ${
                  isHovered ? 'opacity-100' : 'opacity-0'
                }`}>
                  <div className="font-bold text-slate-200 border-b border-slate-800 pb-0.5 mb-1">{label}</div>
                  <div className="text-emerald-400">Eksport: {exp.toLocaleString()} GWh</div>
                  <div className="text-rose-400">Import: {imp.toLocaleString()} GWh</div>
                  <div className="text-cyan-400 font-bold">Nett: {net >= 0 ? `+${net.toLocaleString()}` : net.toLocaleString()} GWh</div>
                </div>

                {/* Bars Container - Sits flat on baseline */}
                <div className="flex items-end gap-0.5 w-full h-full justify-center">
                  {/* Export Bar */}
                  <div
                    className={`w-1/2 rounded-t transition-all ${isHovered ? 'bg-emerald-400 shadow-lg shadow-emerald-500/30 ring-1 ring-emerald-300' : 'bg-emerald-500/80 hover:bg-emerald-400'}`}
                    style={{ height: `${Math.max(4, expHeight)}%` }}
                  />
                  {/* Import Bar */}
                  <div
                    className={`w-1/2 rounded-t transition-all ${isHovered ? 'bg-rose-400 shadow-lg shadow-rose-500/30 ring-1 ring-rose-300' : 'bg-rose-500/80 hover:bg-rose-400'}`}
                    style={{ height: `${Math.max(4, impHeight)}%` }}
                  />
                </div>

              </div>
            );
          })}
        </div>

        {/* Dedicated Clean X-axis Timeline Row */}
        <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-2 px-2">
          {viewMode === 'MONTHLY' ? (
            selectedYear === 'ALL' ? (
              <div className="flex justify-between w-full px-2">
                <span>2023 (Jan-Des)</span>
                <span>2024 (Jan-Des)</span>
                <span>2025 (Jan-Des)</span>
                <span>2026 (Jan-Jun)</span>
              </div>
            ) : (
              <div className="flex w-full">
                {currentDataset.map((item, idx) => {
                  const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
                  const monthLabel = item.month ? monthNames[item.month - 1] : (item.label || '');
                  return (
                    <div key={idx} className="flex-1 text-center font-bold text-slate-300">
                      {monthLabel}
                    </div>
                  );
                })}
              </div>
            )
          ) : (
            <div className="flex justify-between w-full px-2">
              {[1970, 1980, 1990, 2000, 2010, 2020, 2025].map(y => (
                <span key={y}>{y}</span>
              ))}
            </div>
          )}
        </div>

      </div>

      {/* Production Mix Breakdown under Graph (Vann, Vind, Sol, Varme) */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/80">
        <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
          <Layers className="w-5 h-5 text-cyan-400" />
          Energikilder for Norsk Kraftproduksjon
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Vannkraft */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Vannkraft</span>
              <span className="text-cyan-400 font-bold font-mono text-sm">{hydroPct}%</span>
            </div>
            <div className="text-2xl font-black text-blue-400 font-mono mt-1">
              {totalHydro.toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-blue-500 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(5, hydroPct))}%` }}></div>
            </div>
          </div>

          {/* Vindkraft */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Vindkraft</span>
              <span className="text-teal-300 font-bold font-mono text-sm">{windPct}%</span>
            </div>
            <div className="text-2xl font-black text-teal-400 font-mono mt-1">
              {totalWind.toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-teal-400 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(5, windPct))}%` }}></div>
            </div>
          </div>

          {/* Solkraft */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Solkraft</span>
              <span className="text-amber-300 font-bold font-mono text-sm">{solarPct}%</span>
            </div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">
              {totalSolar.toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-amber-400 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(3, solarPct))}%` }}></div>
            </div>
          </div>

          {/* Varmekraft */}
          <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
            <div className="text-xs text-slate-400 font-medium flex items-center justify-between">
              <span>Varmekraft</span>
              <span className="text-purple-300 font-bold font-mono text-sm">{thermalPct}%</span>
            </div>
            <div className="text-2xl font-black text-purple-400 font-mono mt-1">
              {totalThermal.toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full mt-3 overflow-hidden">
              <div className="bg-purple-400 h-full rounded-full" style={{ width: `${Math.min(100, Math.max(3, thermalPct))}%` }}></div>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
