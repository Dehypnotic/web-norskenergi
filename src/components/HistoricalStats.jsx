import React, { useState } from 'react';
import { Database, Layers, BarChart2, PieChart, ArrowUpRight, ArrowDownRight, Zap, Activity, TrendingDown } from 'lucide-react';

export default function HistoricalStats({ monthlyData = [], annualData = [], isLoading }) {
  const [categoryMode, setCategoryMode] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_ssb_category_mode') || 'EXPORT_IMPORT';
  });

  const [viewMode, setViewMode] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_ssb_view_mode') || 'MONTHLY';
  });

  const [selectedYear, setSelectedYear] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_ssb_selected_year') || 'ALL';
  });

  const [hoveredData, setHoveredData] = useState(null);
  const leaveTimeoutRef = React.useRef(null);

  const handleBarMouseEnter = (item, label) => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
      leaveTimeoutRef.current = null;
    }
    setHoveredData({ ...item, label });
  };

  const handleBarMouseLeave = () => {
    if (leaveTimeoutRef.current) {
      clearTimeout(leaveTimeoutRef.current);
    }
    leaveTimeoutRef.current = setTimeout(() => {
      setHoveredData(null);
    }, 1000); // 1-second delay before returning to aggregate period totals
  };

  const handleCategoryModeChange = (mode) => {
    setCategoryMode(mode);
    localStorage.setItem('norsk_kraftpuls_ssb_category_mode', mode);
  };

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

  const displayMonthly = selectedYear === 'ALL' 
    ? monthlyData.slice(-36) 
    : monthlyData.filter(d => String(d.year) === String(selectedYear));

  const displayAnnual = annualData.filter(d => d.year >= 1960);
  const currentDataset = viewMode === 'MONTHLY' ? displayMonthly : displayAnnual;

  const latestAnnualYear = displayAnnual.length > 0 ? displayAnnual[displayAnnual.length - 1].year : 2025;
  const annualRangeLabel = `Årlig (1960–${latestAnnualYear})`;

  const totalImport = currentDataset.reduce((sum, d) => sum + (d.import || 0), 0);
  const totalExport = currentDataset.reduce((sum, d) => sum + (d.export || 0), 0);
  const netExport = totalExport - totalImport;
  const isNetExport = netExport >= 0;

  const totalHydro = currentDataset.reduce((sum, d) => sum + (d.hydro || 0), 0);
  const totalWind = currentDataset.reduce((sum, d) => sum + (d.wind || 0), 0);
  const totalSolar = currentDataset.reduce((sum, d) => sum + (d.solar || 0), 0);
  const totalThermal = currentDataset.reduce((sum, d) => sum + (d.thermal || 0), 0);
  const totalProd = currentDataset.reduce((sum, d) => sum + (d.totalProd || (d.hydro + d.wind + d.solar + (d.thermal || 0))), 0);
  const totalNetConsumption = currentDataset.reduce((sum, d) => sum + (d.netConsumption || (d.consumption ? Math.round(d.consumption * 0.915) : 0)), 0);
  const totalGridLoss = currentDataset.reduce((sum, d) => sum + (d.gridLoss || (d.grossConsumption ? d.grossConsumption - (d.netConsumption || 0) : 0)), 0);

  const totalGen = Math.max(1, totalHydro + totalWind + totalSolar + totalThermal);
  const hydroPct = ((totalHydro / totalGen) * 100).toFixed(1);
  const windPct = ((totalWind / totalGen) * 100).toFixed(1);
  const solarPct = ((totalSolar / totalGen) * 100).toFixed(1);
  const thermalPct = ((totalThermal / totalGen) * 100).toFixed(1);

  const netSharePercent = totalProd > 0 ? ((Math.abs(netExport) / totalProd) * 100).toFixed(1) : '0.0';
  const lossPct = (totalNetConsumption + totalGridLoss) > 0 
    ? ((totalGridLoss / (totalNetConsumption + totalGridLoss)) * 100).toFixed(1) 
    : '0.0';

  const availableYears = Array.from(new Set(monthlyData.map(d => d.year))).sort((a, b) => b - a);

  const activeData = hoveredData || {
    label: viewMode === 'MONTHLY' 
      ? (selectedYear === 'ALL' ? 'Hele perioden (siste 36 mnd)' : `Hele året ${selectedYear}`)
      : `Hele perioden (1960–${latestAnnualYear})`,
    isAggregate: true,
    export: totalExport,
    import: totalImport,
    netExport: netExport,
    totalProd: totalProd,
    netConsumption: totalNetConsumption,
    gridLoss: totalGridLoss,
    hydro: totalHydro,
    wind: totalWind,
    solar: totalSolar,
    thermal: totalThermal
  };

  return (
    <div className="space-y-8 animate-fade-in">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/80">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            SSB Kraftbalanse & Historikk
          </h2>
          <p className="text-xs text-slate-400">
            Månedlig og årlig import, eksport, produksjonsmiks og forbruk fra SSB Statbank
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select
            value={categoryMode}
            onChange={(e) => handleCategoryModeChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-xs rounded-xl px-3.5 py-2 outline-none focus:border-cyan-400 cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            <option value="EXPORT_IMPORT">Eksport og Import</option>
            <option value="PROD_CONS">Produksjon og Forbruk</option>
          </select>

          <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
            <button
              onClick={() => handleViewModeChange('MONTHLY')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'MONTHLY' ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              Månedlig (GWh)
            </button>
            <button
              onClick={() => handleViewModeChange('ANNUAL')}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                viewMode === 'ANNUAL' ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
              }`}
            >
              {annualRangeLabel}
            </button>
          </div>

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

      {categoryMode === 'EXPORT_IMPORT' ? (
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
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Total Produksjon</span>
              <Zap className="w-4 h-4 text-amber-400" />
            </div>
            <div className="text-2xl font-black font-mono text-amber-400">
              {totalProd.toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
            </div>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Nettoforbruk</span>
              <Activity className="w-4 h-4 text-indigo-400" />
            </div>
            <div className="text-2xl font-black font-mono text-indigo-400">
              {totalNetConsumption.toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
            </div>
          </div>
          <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Energitap (Nettap)</span>
              <TrendingDown className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black font-mono text-rose-400">
              {totalGridLoss.toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
            </div>
            <div className={`text-[11px] font-semibold font-mono mt-1 text-rose-400/90`}>
              {lossPct}% av bruttoforbruk
            </div>
          </div>
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
      )}

      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/90 space-y-6">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <BarChart2 className="w-5 h-5 text-cyan-400" />
            {categoryMode === 'EXPORT_IMPORT'
              ? (viewMode === 'MONTHLY' ? 'Månedlig Import, Eksport & Nettbalanse' : 'Årlig Utvikling i Norsk Krafthandel (GWh)')
              : (viewMode === 'MONTHLY' ? 'Månedlig Produksjon & Nettoforbruk' : 'Årlig Produksjon, Nettoforbruk & Energitap (GWh)')
            }
          </h3>

          {categoryMode === 'EXPORT_IMPORT' ? (
            <div className="flex items-center gap-4 text-xs font-medium">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-3 h-3 rounded bg-emerald-500 inline-block"></span> Eksport
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-3 h-3 rounded bg-rose-500 inline-block"></span> Import
              </span>
            </div>
          ) : (
            <div className="flex flex-wrap items-center gap-3 text-xs font-medium">
              <span className="text-slate-400 font-bold">Produksjon:</span>
              <span className="flex items-center gap-1 text-blue-400">
                <span className="w-2.5 h-2.5 rounded bg-blue-500 inline-block"></span> Vann
              </span>
              <span className="flex items-center gap-1 text-teal-400">
                <span className="w-2.5 h-2.5 rounded bg-teal-400 inline-block"></span> Vind
              </span>
              <span className="flex items-center gap-1 text-amber-400">
                <span className="w-2.5 h-2.5 rounded bg-amber-400 inline-block"></span> Sol
              </span>
              <span className="flex items-center gap-1 text-orange-400">
                <span className="w-2.5 h-2.5 rounded bg-orange-500 inline-block"></span> Varme
              </span>
              <span className="text-slate-600">|</span>
              <span className="flex items-center gap-1 text-indigo-400 font-bold">
                <span className="w-2.5 h-2.5 rounded bg-indigo-500 inline-block"></span> Nettoforbruk
              </span>
              <span className="flex items-center gap-1 text-rose-400 font-bold">
                <span className="w-2.5 h-2.5 rounded bg-rose-500 inline-block"></span> Energitap
              </span>
            </div>
          )}
        </div>

        <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 space-y-1.5 text-xs font-mono">
          {categoryMode === 'EXPORT_IMPORT' ? (
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-bold text-white">
                {activeData.isAggregate ? 'Samlet for perioden:' : 'Periode:'} {activeData.label}
              </span>
              <span className="text-emerald-400 font-semibold">Eksport: {(activeData.export || 0).toLocaleString()} GWh</span>
              <span className="text-rose-400 font-semibold">Import: {(activeData.import || 0).toLocaleString()} GWh</span>
              <span className="text-cyan-400 font-bold">
                Netto: {(activeData.netExport || 0) >= 0 ? `+${(activeData.netExport || 0).toLocaleString()}` : (activeData.netExport || 0).toLocaleString()} GWh
              </span>
            </div>
          ) : (
            <>
              <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800/80 pb-1.5">
                <span className="font-bold text-white">
                  {activeData.isAggregate ? 'Samlet for perioden:' : 'Periode:'} {activeData.label}
                </span>
                <span className="text-amber-400 font-bold">
                  Total prod: {(activeData.totalProd || (activeData.hydro + activeData.wind + activeData.solar + (activeData.thermal || 0))).toLocaleString()} GWh
                </span>
                <span className="text-indigo-400 font-semibold">
                  Nettoforbruk: {(activeData.netConsumption || 0).toLocaleString()} GWh
                </span>
                <span className="text-rose-400 font-semibold">
                  Energitap: {(activeData.gridLoss || 0).toLocaleString()} GWh
                </span>
                {(() => {
                  const prod = activeData.totalProd || (activeData.hydro + activeData.wind + activeData.solar + (activeData.thermal || 0));
                  const netC = activeData.netConsumption || Math.round((activeData.grossConsumption || prod) * 0.915);
                  const loss = activeData.gridLoss || Math.max(0, (activeData.grossConsumption || prod) - netC);
                  const gross = netC + loss;
                  const bal = prod - gross;
                  const isPos = bal >= 0;
                  return (
                    <span className={`font-black px-2 py-0.5 rounded bg-slate-950/80 border ${isPos ? 'text-emerald-400 border-emerald-500/30' : 'text-rose-400 border-rose-500/30'}`}>
                      {isPos ? `Overskudd: +${bal.toLocaleString()} GWh` : `Underskudd: -${Math.abs(bal).toLocaleString()} GWh`}
                    </span>
                  );
                })()}
              </div>
              {(() => {
                const pTot = activeData.totalProd || ((activeData.hydro || 0) + (activeData.wind || 0) + (activeData.solar || 0) + (activeData.thermal || 0));
                const hShare = pTot > 0 ? (((activeData.hydro || 0) / pTot) * 100).toFixed(1) : '0.0';
                const wShare = pTot > 0 ? (((activeData.wind || 0) / pTot) * 100).toFixed(1) : '0.0';
                const sShare = pTot > 0 ? (((activeData.solar || 0) / pTot) * 100).toFixed(1) : '0.0';
                const tShare = pTot > 0 ? (((activeData.thermal || 0) / pTot) * 100).toFixed(1) : '0.0';

                return (
                  <div className="flex flex-wrap items-center justify-between gap-4 text-[11px] pt-0.5">
                    <span className="text-slate-400 font-bold">Produksjon per kilde:</span>
                    <span className="text-blue-400 font-semibold">Vann: {(activeData.hydro || 0).toLocaleString()} GWh ({hShare}%)</span>
                    <span className="text-teal-400 font-semibold">Vind: {(activeData.wind || 0).toLocaleString()} GWh ({wShare}%)</span>
                    <span className="text-amber-400 font-semibold">Sol: {(activeData.solar || 0).toLocaleString()} GWh ({sShare}%)</span>
                    <span className="text-orange-400 font-semibold">Varme: {(activeData.thermal || 0).toLocaleString()} GWh ({tShare}%)</span>
                  </div>
                );
              })()}
            </>
          )}
        </div>

        <div className={`w-full ${viewMode === 'MONTHLY' ? '' : 'overflow-x-auto'}`}>
          <div className={`min-w-full ${viewMode === 'ANNUAL' ? 'min-w-[780px]' : ''}`}>
            <div className="h-72 flex items-end gap-1 sm:gap-2 pt-12 pb-1 border-b border-slate-800/80 px-2">
              {currentDataset.map((item, idx) => {
                const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
                const label = viewMode === 'MONTHLY' 
                  ? (item.month ? monthNames[item.month - 1] : (item.label || ''))
                  : String(item.year);

                const isHovered = hoveredData?.label === label;

                if (categoryMode === 'EXPORT_IMPORT') {
                  const maxVal = Math.max(...currentDataset.map(d => Math.max(d.export || 0, d.import || 0, Math.abs(d.netExport || 0))), 100);
                  const expHeight = ((item.export || 0) / maxVal) * 100;
                  const impHeight = ((item.import || 0) / maxVal) * 100;

                  return (
                    <div 
                      key={idx} 
                      onMouseEnter={() => handleBarMouseEnter(item, label)} 
                      onMouseLeave={handleBarMouseLeave}
                      className="flex-1 min-w-[10px] flex flex-col items-center h-full justify-end group relative cursor-pointer"
                    >
                      <div className="flex items-end gap-0.5 w-full h-full justify-center">
                        <div className={`w-1/2 rounded-t transition-all ${isHovered ? 'bg-emerald-400 shadow-lg shadow-emerald-500/30' : 'bg-emerald-500/80'}`} style={{ height: `${Math.max(4, expHeight)}%` }} />
                        <div className={`w-1/2 rounded-t transition-all ${isHovered ? 'bg-rose-400 shadow-lg shadow-rose-500/30' : 'bg-rose-500/80'}`} style={{ height: `${Math.max(4, impHeight)}%` }} />
                      </div>
                    </div>
                  );
                } else {
                  // PRODUKSJON OG FORBRUK VIEW
                  const prod = item.totalProd || (item.hydro + item.wind + item.solar + (item.thermal || 0));
                  const hydro = item.hydro || 0;
                  const wind = item.wind || 0;
                  const solar = item.solar || 0;
                  const thermal = item.thermal || 0;
                  const netCons = item.netConsumption || Math.round((item.grossConsumption || prod) * 0.915);
                  const loss = item.gridLoss || Math.max(0, (item.grossConsumption || prod) - netCons);
                  const grossCons = netCons + loss;

                  const maxVal = Math.max(...currentDataset.map(d => Math.max(
                    d.totalProd || (d.hydro + d.wind + d.solar + (d.thermal || 0)),
                    (d.netConsumption || 0) + (d.gridLoss || 0)
                  )), 100);

                  const prodHeight = (prod / maxVal) * 100;
                  const grossHeight = (grossCons / maxVal) * 100;

                  // Percentages for stacked production bar
                  const hPct = prod > 0 ? (hydro / prod) * 100 : 0;
                  const wPct = prod > 0 ? (wind / prod) * 100 : 0;
                  const sPct = prod > 0 ? (solar / prod) * 100 : 0;
                  const tPct = prod > 0 ? (thermal / prod) * 100 : 0;

                  // Percentages for stacked consumption & loss bar
                  const netPct = grossCons > 0 ? (netCons / grossCons) * 100 : 0;
                  const lossPctBar = grossCons > 0 ? (loss / grossCons) * 100 : 0;

                  return (
                    <div 
                      key={idx} 
                      onMouseEnter={() => handleBarMouseEnter(item, label)} 
                      onMouseLeave={handleBarMouseLeave}
                      className="flex-1 min-w-[12px] flex flex-col items-center h-full justify-end group relative cursor-pointer"
                    >
                      {/* 2 Clean Side-by-Side Stacked Bars: [Production Stack] [Consumption + Loss Stack] */}
                      <div className="flex items-end gap-0.5 w-full h-full justify-center">
                        
                        {/* Søyle 1: Stacked Production Bar */}
                        <div 
                          className={`w-[46%] rounded-t flex flex-col-reverse overflow-hidden transition-all ${
                            isHovered ? 'ring-1 ring-amber-300 shadow-lg shadow-amber-500/20' : 'opacity-90 hover:opacity-100'
                          }`}
                          style={{ height: `${Math.max(4, prodHeight)}%` }}
                        >
                          <div className="bg-blue-500 w-full" style={{ height: `${hPct}%` }} title={`Vann: ${hydro} GWh`} />
                          <div className="bg-teal-400 w-full" style={{ height: `${wPct}%` }} title={`Vind: ${wind} GWh`} />
                          <div className="bg-amber-400 w-full" style={{ height: `${sPct}%` }} title={`Sol: ${solar} GWh`} />
                          <div className="bg-orange-500 w-full" style={{ height: `${tPct}%` }} title={`Varme: ${thermal} GWh`} />
                        </div>

                        {/* Søyle 2: Stacked Nettoforbruk + Energitap Bar */}
                        <div 
                          className={`w-[46%] rounded-t flex flex-col-reverse overflow-hidden transition-all ${
                            isHovered ? 'ring-1 ring-indigo-300 shadow-lg shadow-indigo-500/20' : 'opacity-90 hover:opacity-100'
                          }`}
                          style={{ height: `${Math.max(4, grossHeight)}%` }}
                        >
                          <div className="bg-indigo-500 w-full" style={{ height: `${netPct}%` }} title={`Nettoforbruk: ${netCons} GWh`} />
                          <div className="bg-rose-500 w-full" style={{ height: `${lossPctBar}%` }} title={`Energitap: ${loss} GWh`} />
                        </div>

                      </div>
                    </div>
                  );
                }
              })}
            </div>
            <div className="flex justify-between items-center text-[11px] text-slate-400 font-mono pt-2 px-2">
              {viewMode === 'MONTHLY' ? (
                <div className="flex w-full">{currentDataset.map((item, idx) => (
                  <div key={idx} className="flex-1 text-center font-bold text-slate-300">{item.month ? ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'][item.month - 1] : ''}</div>
                ))}</div>
              ) : (
                <div className="flex w-full">{currentDataset.map((item, idx) => (
                  <div key={idx} className="flex-1 text-center text-[10px] text-slate-400 font-mono">{item.year % 5 === 0 || item.year === 1960 || item.year === latestAnnualYear ? item.year : ''}</div>
                ))}</div>
              )}
            </div>
          </div>
        </div>
      </div>

    </div>
  );
}
