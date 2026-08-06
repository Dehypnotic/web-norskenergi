import React, { useState, useEffect, useMemo } from 'react';
import { Database, Layers, BarChart2, PieChart, ArrowUpRight, ArrowDownRight, Zap, Activity, TrendingDown, Droplet, MapPin, Calendar, Globe, AlertTriangle, RefreshCw } from 'lucide-react';
import ReservoirChart from './ReservoirChart';
import EuropeanPowerMix from './EuropeanPowerMix';
import { RESERVOIR_AREAS } from '../services/nveApi';
import { fetchEnergyChartsCBET, formatDateStr, getDatesForISOWeek } from '../services/energyChartsApi';

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

  const [reservoirAreaId, setReservoirAreaId] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_reservoir_area') || 'NO';
  });

  const [reservoirYear, setReservoirYear] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_reservoir_year') || '2026';
  });

  const MONTH_NAMES_NO = ['Januar', 'Februar', 'Mars', 'April', 'Mai', 'Juni', 'Juli', 'August', 'September', 'Oktober', 'November', 'Desember'];
  const currentYr = new Date().getFullYear();
  const currentMo = new Date().getMonth() + 1;
  const currentDy = new Date().getDate();

  const [subCategory, setSubCategory] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_exchange_subcategory') || 'FRESH_ZONE';
  });

  const [cbetZone, setCbetZone] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_exchange_zone') || 'ALL';
  });

  const [cbetPeriodType, setCbetPeriodType] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_exchange_period_type') || 'YEAR';
  });

  const [cbetYear, setCbetYear] = useState(String(currentYr));
  const [cbetMonth, setCbetMonth] = useState(String(currentMo));
  const [cbetWeek, setCbetWeek] = useState('31');
  const [cbetDay, setCbetDay] = useState(String(currentDy));
  const [cbetData, setCbetData] = useState(null);
  const [isCbetLoading, setIsCbetLoading] = useState(false);
  const [cbetHoveredBar, setCbetHoveredBar] = useState(null);
  const cbetLeaveTimeoutRef = React.useRef(null);

  const cbetDateRange = useMemo(() => {
    const yr = parseInt(cbetYear, 10);
    const mo = parseInt(cbetMonth, 10);
    const dy = parseInt(cbetDay, 10);

    if (cbetPeriodType === 'YEAR') {
      return {
        startStr: `${yr}-01-01`,
        endStr: `${yr}-12-31`,
        titleLabel: `År ${yr}`
      };
    }
    if (cbetPeriodType === 'MONTH') {
      const lastDay = new Date(yr, mo, 0).getDate();
      const mStr = String(mo).padStart(2, '0');
      return {
        startStr: `${yr}-${mStr}-01`,
        endStr: `${yr}-${mStr}-${String(lastDay).padStart(2, '0')}`,
        titleLabel: `${MONTH_NAMES_NO[mo - 1]} ${yr}`
      };
    }
    if (cbetPeriodType === 'WEEK') {
      const dates = getDatesForISOWeek(yr, parseInt(cbetWeek, 10));
      return {
        startStr: dates.startStr,
        endStr: dates.endStr,
        titleLabel: `Uke ${cbetWeek}, ${yr}`
      };
    }
    // DAY
    const mStr = String(mo).padStart(2, '0');
    const dStr = String(dy).padStart(2, '0');
    return {
      startStr: `${yr}-${mStr}-${dStr}`,
      endStr: `${yr}-${mStr}-${dStr}`,
      titleLabel: `${dy}. ${MONTH_NAMES_NO[mo - 1]} ${yr}`
    };
  }, [cbetPeriodType, cbetYear, cbetMonth, cbetWeek, cbetDay]);

  useEffect(() => {
    if (categoryMode !== 'EXPORT_IMPORT' || subCategory !== 'FRESH_ZONE') return;
    
    let isMounted = true;
    async function loadCBET() {
      setIsCbetLoading(true);
      try {
        const res = await fetchEnergyChartsCBET(cbetDateRange.startStr, cbetDateRange.endStr, cbetPeriodType);
        if (isMounted) {
          setCbetData(res);
        }
      } catch (err) {
        console.error('CBET loading error:', err);
      } finally {
        if (isMounted) {
          setIsCbetLoading(false);
        }
      }
    }
    loadCBET();
    return () => { isMounted = false; };
  }, [categoryMode, subCategory, cbetDateRange, cbetPeriodType]);

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

  const getAllTotals = () => {
    if (!cbetData || !cbetData.zoneData) return { imp: 0, exp: 0 };
    let imp = 0;
    let exp = 0;
    Object.values(cbetData.zoneData).forEach(zd => {
      imp += zd.utlandImport;
      exp += zd.utlandExport;
    });
    return { imp: Math.round(imp * 10) / 10, exp: Math.round(exp * 10) / 10 };
  };

  const resetCbetFilters = () => {
    setCbetZone('ALL');
    setCbetPeriodType('YEAR');
    setCbetYear(String(currentYr));
    setCbetMonth(String(currentMo));
    setCbetWeek('31');
    setCbetDay(String(currentDy));
    localStorage.removeItem('norsk_kraftpuls_exchange_zone');
    localStorage.removeItem('norsk_kraftpuls_exchange_period_type');
  };

  const renderFreshZoneExchange = () => {
    try {
      if (isCbetLoading || !cbetData) {
      return (
        <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
          <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin"></div>
          <p className="text-slate-400 text-sm font-medium">Henter ferske soneutvekslingsdata fra Fraunhofer Energy-Charts...</p>
        </div>
      );
    }

    const isAll = cbetZone === 'ALL';
    const zd = cbetData.zoneData[isAll ? 'NO1' : cbetZone] || { utlandImport: 0, utlandExport: 0, inlandImport: 0, inlandExport: 0, history: [] };
    const allTotals = getAllTotals();

    const dispImport = isAll ? allTotals.imp : zd.utlandImport;
    const dispExport = isAll ? allTotals.exp : zd.utlandExport;
    const dispNet = dispImport - dispExport;
    const isNetExp = dispNet < 0;

    const inlandImport = isAll ? 0 : zd.inlandImport;
    const inlandExport = isAll ? 0 : zd.inlandExport;
    const inlandNet = inlandImport - inlandExport;
    const isInlandNetExp = inlandNet < 0;

    const chartHistory = isAll ? cbetData.timeSeries.map((g, idx) => {
      let utlandImport = 0;
      let utlandExport = 0;
      Object.values(cbetData.zoneData).forEach(z => {
        const item = z.history[idx];
        if (item) {
          utlandImport += item.utlandImport;
          utlandExport += item.utlandExport;
        }
      });
      return {
        label: g.label,
        totalImport: Math.round(utlandImport * 10) / 10,
        totalExport: Math.round(utlandExport * 10) / 10,
        netExchange: Math.round((utlandImport - utlandExport) * 10) / 10
      };
    }) : zd.history;

    const activeHovered = cbetHoveredBar || {
      label: cbetPeriodType === 'YEAR' ? `Hele året ${cbetYear}` : `Hele perioden (${cbetDateRange.titleLabel})`,
      isAggregate: true,
      totalImport: dispImport,
      totalExport: dispExport,
      netExchange: dispNet,
      inlandImport: inlandImport,
      inlandExport: inlandExport,
      inlandNet: inlandNet
    };

    const maxVal = Math.max(...chartHistory.map(d => Math.max(d.totalImport || 0, d.totalExport || 0)), 0.1);
    const numItems = chartHistory.length;
    const barWidthClass = numItems <= 7 
      ? 'w-[75%] max-w-[96px]' 
      : numItems <= 15 
        ? 'w-[75%] max-w-[56px]' 
        : 'w-[75%] max-w-[28px]';

    return (
      <div className="space-y-6 animate-fade-in">
        
        {cbetData.isFallback && (
          <div className="p-3.5 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs flex items-center gap-3">
            <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
            <div>
              {cbetDateRange.startStr > new Date().toISOString().slice(0, 10) ? (
                <>
                  <span className="font-bold">Framtidig periode:</span> Energy-Charts og Fraunhofer har kun historiske utvekslingsdata opp til dags dato. Framtidige tall er ikke tilgjengelige.
                </>
              ) : (
                <>
                  <span className="font-bold">Nettverksadvarsel (Modellvisning):</span> Kunne ikke hente live-data direkte fra Energy-Charts. Viser estimert utveksling.
                </>
              )}
            </div>
          </div>
        )}

        {/* KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          
          {/* Card 1: Import */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>{isAll ? 'Total Import (Utland)' : 'Utland Import'}</span>
              <ArrowDownRight className="w-4 h-4 text-emerald-400" />
            </div>
            <div className="text-2xl font-black font-mono text-emerald-400">
              {dispImport.toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Fysisk innstrømming
            </div>
          </div>

          {/* Card 2: Eksport */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>{isAll ? 'Total Eksport (Utland)' : 'Utland Eksport'}</span>
              <ArrowUpRight className="w-4 h-4 text-rose-400" />
            </div>
            <div className="text-2xl font-black font-mono text-rose-400">
              {dispExport.toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
            </div>
            <div className="text-[10px] text-slate-400 mt-1 font-mono">
              Fysisk utstrømming
            </div>
          </div>

          {/* Card 3: Netto Utland */}
          <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
            <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
              <span>Netto Utland</span>
              {isNetExp ? (
                <ArrowUpRight className="w-4 h-4 text-rose-400" />
              ) : (
                <ArrowDownRight className="w-4 h-4 text-emerald-400" />
              )}
            </div>
            <div className={`text-2xl font-black font-mono ${isNetExp ? 'text-rose-400' : 'text-emerald-400'}`}>
              {isNetExp ? 'Eksportoverskudd' : 'Importoverskudd'}
            </div>
            <div className={`text-sm font-bold font-mono ${isNetExp ? 'text-rose-400' : 'text-emerald-400'} mt-1`}>
              {Math.abs(dispNet).toLocaleString('no-NO')} GWh
            </div>
          </div>

          {/* Card 4: Inland Balance or Norway Net */}
          {isAll ? (
            <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Handelsbalanse (Norge)</span>
                <Globe className="w-4 h-4 text-cyan-400" />
              </div>
              <div className={`text-2xl font-black font-mono ${dispNet < 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                {Math.abs(dispNet).toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
              </div>
              <div className="text-[10px] text-slate-300 mt-1 font-semibold">
                Norge er {dispNet < 0 ? 'NETTO EKSPORTØR 🔴' : 'NETTO IMPORTØR 🟢'}
              </div>
            </div>
          ) : (
            <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
              <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                <span>Innland Utveksling</span>
                {isInlandNetExp ? (
                  <ArrowUpRight className="w-4 h-4 text-rose-400" />
                ) : (
                  <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                )}
              </div>
              <div className={`text-2xl font-black font-mono ${isInlandNetExp ? 'text-rose-400' : 'text-emerald-400'}`}>
                {isInlandNetExp ? 'Netto eksport' : 'Netto import'}
              </div>
              <div className={`text-sm font-bold font-mono ${isInlandNetExp ? 'text-rose-400' : 'text-emerald-400'} mt-1`}>
                {Math.abs(inlandNet).toLocaleString('no-NO')} GWh
              </div>
            </div>
          )}

        </div>

        {/* Chart Card */}
        <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/90 space-y-6">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div>
              <h3 className="text-lg font-bold text-white flex items-center gap-2">
                <BarChart2 className="w-5 h-5 text-cyan-400" />
                Utvekslingsprofil ({isAll ? 'Hele Norge' : cbetZone}) – GWh
              </h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Søyler oppover = Import (grønn) • Søyler nedover = Eksport (rød) • Datakilde: Fraunhofer ISE
              </p>
            </div>
            
            <div className="flex items-center gap-4 text-xs font-semibold">
              <span className="flex items-center gap-1 text-emerald-400">
                <span className="w-3 h-3 rounded bg-emerald-500/80 inline-block"></span> Import
              </span>
              <span className="flex items-center gap-1 text-rose-400">
                <span className="w-3 h-3 rounded bg-rose-500/80 inline-block"></span> Eksport
              </span>
            </div>
          </div>

          {/* Interactive Hover Summary Bar */}
          <div className="p-3 rounded-xl bg-slate-900/90 border border-slate-800 text-xs font-mono">
            <div className="flex flex-wrap items-center justify-between gap-3">
              <span className="font-bold text-white">
                {activeHovered.isAggregate ? 'Samlet for perioden:' : 'Periode:'} {activeHovered.label}
              </span>
              <span className="text-emerald-400 font-semibold">Total Import: {activeHovered.totalImport.toLocaleString()} GWh</span>
              <span className="text-rose-400 font-semibold">Total Eksport: {activeHovered.totalExport.toLocaleString()} GWh</span>
              <span className={`font-bold ${activeHovered.netExchange >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                Netto Utland: {activeHovered.netExchange >= 0 ? `+${activeHovered.netExchange.toLocaleString()}` : activeHovered.netExchange.toLocaleString()} GWh
              </span>
              {!isAll && (
                <span className={`font-semibold ${activeHovered.inlandNet >= 0 ? 'text-emerald-400' : 'text-rose-400'}`}>
                  Netto Innland: {activeHovered.inlandNet >= 0 ? `+${activeHovered.inlandNet.toLocaleString()}` : activeHovered.inlandNet.toLocaleString()} GWh
                </span>
              )}
            </div>
          </div>

          {/* Legend Color Key */}
          <div className="flex items-center justify-end gap-3.5 text-[10px] font-semibold text-slate-400 pt-2 px-2">
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-emerald-500 inline-block" />
              <span>Utland Import</span>
            </div>
            {!isAll && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-teal-400 inline-block" />
                <span>Innland Import</span>
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-sm bg-rose-500 inline-block" />
              <span>Utland Eksport</span>
            </div>
            {!isAll && (
              <div className="flex items-center gap-1.5">
                <span className="w-2.5 h-2.5 rounded-sm bg-rose-300 inline-block" />
                <span>Innland Eksport</span>
              </div>
            )}
          </div>

          {/* Centered Baseline Bar Chart */}
          <div className="w-full overflow-x-auto">
            <div className="min-w-[600px] h-72 flex items-center justify-between border-b border-slate-800/80 relative px-2 pt-2 pb-6">
              {/* Baseline center line */}
              <div className="absolute left-0 right-0 h-px bg-slate-800 top-[45%]" />

              {chartHistory.map((item, idx) => {
                const impPct = item.totalImport > 0 ? Math.max((item.totalImport / maxVal) * 92, 4) : 0;
                const expPct = item.totalExport > 0 ? Math.max((item.totalExport / maxVal) * 92, 4) : 0;

                const isHovered = cbetHoveredBar?.label === item.label;
                const displayLabel = (cbetPeriodType === 'MONTH' && item.label) ? item.label.split('.')[0] : item.label;

                const uImp = item.utlandImport || 0;
                const iImp = item.inlandImport || 0;
                const totImp = item.totalImport || (uImp + iImp);
                const uImpPct = totImp > 0 ? (uImp / totImp) * 100 : 100;
                const iImpPct = totImp > 0 ? (iImp / totImp) * 100 : 0;

                const uExp = item.utlandExport || 0;
                const iExp = item.inlandExport || 0;
                const totExp = item.totalExport || (uExp + iExp);
                const uExpPct = totExp > 0 ? (uExp / totExp) * 100 : 100;
                const iExpPct = totExp > 0 ? (iExp / totExp) * 100 : 0;

                const handleMouseEnter = () => {
                  if (cbetLeaveTimeoutRef.current) {
                    clearTimeout(cbetLeaveTimeoutRef.current);
                    cbetLeaveTimeoutRef.current = null;
                  }
                  setCbetHoveredBar({
                    label: item.label,
                    totalImport: item.totalImport,
                    totalExport: item.totalExport,
                    netExchange: item.netExchange,
                    inlandImport: item.inlandImport || 0,
                    inlandExport: item.inlandExport || 0,
                    inlandNet: (item.inlandImport || 0) - (item.inlandExport || 0)
                  });
                };

                const handleMouseLeave = () => {
                  if (cbetLeaveTimeoutRef.current) clearTimeout(cbetLeaveTimeoutRef.current);
                  cbetLeaveTimeoutRef.current = setTimeout(() => {
                    setCbetHoveredBar(null);
                  }, 1000);
                };

                return (
                  <div
                    key={idx}
                    onMouseEnter={handleMouseEnter}
                    onMouseLeave={handleMouseLeave}
                    className="flex-1 flex flex-col items-center h-full justify-center group relative cursor-pointer pb-5"
                  >
                    {/* Top half (Imports) */}
                    <div className="w-full flex items-end justify-center h-1/2 pb-px">
                      <div
                        className={`${barWidthClass} rounded-t overflow-hidden flex flex-col-reverse transition-all ${
                          isHovered ? 'shadow-md shadow-emerald-500/30 scale-x-110 ring-1 ring-emerald-400' : ''
                        }`}
                        style={{ height: `${impPct}%` }}
                      >
                        {/* Bottom: Utland Import */}
                        <div className="w-full bg-emerald-500/90 hover:bg-emerald-400 transition-colors" style={{ height: `${uImpPct}%` }} title={`Utland Import: ${uImp} GWh`} />
                        {/* Top: Innland Import */}
                        <div className="w-full bg-teal-400/90 hover:bg-teal-300 transition-colors" style={{ height: `${iImpPct}%` }} title={`Innland Import: ${iImp} GWh`} />
                      </div>
                    </div>

                    {/* Bottom half (Exports) */}
                    <div className="w-full flex items-start justify-center h-1/2 pt-px">
                      <div
                        className={`${barWidthClass} rounded-b overflow-hidden flex flex-col transition-all ${
                          isHovered ? 'shadow-md shadow-rose-500/30 scale-x-110 ring-1 ring-rose-400' : ''
                        }`}
                        style={{ height: `${expPct}%` }}
                      >
                        {/* Top (Baseline): Utland Export */}
                        <div className="w-full bg-rose-500/90 hover:bg-rose-400 transition-colors" style={{ height: `${uExpPct}%` }} title={`Utland Eksport: ${uExp} GWh`} />
                        {/* Bottom: Innland Export */}
                        <div className="w-full bg-rose-300/90 hover:bg-rose-200 transition-colors" style={{ height: `${iExpPct}%` }} title={`Innland Eksport: ${iExp} GWh`} />
                      </div>
                    </div>

                    {/* Hover tooltip for quick label */}
                    <span className="absolute bottom-0 text-[9px] sm:text-[10px] text-slate-500 font-mono group-hover:text-white transition-all select-none font-bold whitespace-nowrap">
                      {displayLabel}
                    </span>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Connection Specific Table */}
          <div className="pt-4 border-t border-slate-800 space-y-3">
            <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300">
              Spesifisert utveksling på utenlands- og innlandslinjer
            </h4>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
              {isAll ? (
                <>
                  {/* SE */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🇸🇪 Sverige</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Forbindelser i NO1, NO3, NO4</div>
                    </div>
                    <div className="text-right font-mono text-xs font-bold">
                      <span className="text-emerald-400">+{Math.round((cbetData.zoneData.NO1.swedenImport + cbetData.zoneData.NO3.swedenImport + cbetData.zoneData.NO4.swedenImport)*10)/10} GWh</span>
                      <div className="text-rose-400">-{Math.round((cbetData.zoneData.NO1.swedenExport + cbetData.zoneData.NO3.swedenExport + cbetData.zoneData.NO4.swedenExport)*10)/10} GWh</div>
                    </div>
                  </div>
                  {/* DE */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🇩🇪 Tyskland</span>
                      </div>
                      <div className="text-[10px] text-slate-500">NordLink (NO2 ↔ DE)</div>
                    </div>
                    <div className="text-right font-mono text-xs font-bold">
                      <span className="text-emerald-400">+{cbetData.zoneData.NO2.germanyImport.toLocaleString()} GWh</span>
                      <div className="text-rose-400">-{cbetData.zoneData.NO2.germanyExport.toLocaleString()} GWh</div>
                    </div>
                  </div>
                  {/* UK */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🇬🇧 Storbritannia</span>
                      </div>
                      <div className="text-[10px] text-slate-500">North Sea Link (NO2 ↔ UK)</div>
                    </div>
                    <div className="text-right font-mono text-xs font-bold">
                      <span className="text-emerald-400">+{cbetData.zoneData.NO2.ukImport.toLocaleString()} GWh</span>
                      <div className="text-rose-400">-{cbetData.zoneData.NO2.ukExport.toLocaleString()} GWh</div>
                    </div>
                  </div>
                  {/* NL */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🇳🇱 Nederland</span>
                      </div>
                      <div className="text-[10px] text-slate-500">NorNed (NO2 ↔ NL)</div>
                    </div>
                    <div className="text-right font-mono text-xs font-bold">
                      <span className="text-emerald-400">+{cbetData.zoneData.NO2.netherlandsImport.toLocaleString()} GWh</span>
                      <div className="text-rose-400">-{cbetData.zoneData.NO2.netherlandsExport.toLocaleString()} GWh</div>
                    </div>
                  </div>
                  {/* DK */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🇩🇰 Danmark</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Skagerrak (NO2 ↔ DK)</div>
                    </div>
                    <div className="text-right font-mono text-xs font-bold">
                      <span className="text-emerald-400">+{cbetData.zoneData.NO2.denmarkImport.toLocaleString()} GWh</span>
                      <div className="text-rose-400">-{cbetData.zoneData.NO2.denmarkExport.toLocaleString()} GWh</div>
                    </div>
                  </div>
                  {/* FI */}
                  <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white flex items-center gap-1.5">
                        <span>🇫🇮 Finland</span>
                      </div>
                      <div className="text-[10px] text-slate-500">Pasvik-linjen (NO4 ↔ FI)</div>
                    </div>
                    <div className="text-right font-mono text-xs font-bold">
                      <span className="text-emerald-400">+{cbetData.zoneData.NO4.finlandImport.toLocaleString()} GWh</span>
                      <div className="text-rose-400">-{cbetData.zoneData.NO4.finlandExport.toLocaleString()} GWh</div>
                    </div>
                  </div>
                </>
              ) : (
                <>
                  {/* Selected zone connections */}
                  {cbetZone === 'NO1' && (
                    <>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇸🇪 Sverige (SE3)</div>
                          <div className="text-[10px] text-slate-500">Hasle-korridoren (Utland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <span className="text-emerald-400">+{(zd.swedenImport || 0).toLocaleString()} GWh</span>
                          <div className="text-rose-400">-{(zd.swedenExport || 0).toLocaleString()} GWh</div>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇳🇴 NO5 (Vestlandet)</div>
                          <div className="text-[10px] text-slate-500">Regional utveksling (Innland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <span className="text-emerald-400">+{(zd.flow5to1 || 0).toLocaleString()} GWh</span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇳🇴 NO3 (Midt-Norge)</div>
                          <div className="text-[10px] text-slate-500">Regional utveksling (Innland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <span className="text-emerald-400">+{(zd.flow3to1 || 0).toLocaleString()} GWh</span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇳🇴 NO2 (Sørlandet)</div>
                          <div className="text-[10px] text-slate-500">Regional utveksling (Innland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <div className="text-rose-400">-{(zd.flow1to2 || 0).toLocaleString()} GWh</div>
                        </div>
                      </div>
                    </>
                  )}

                  {cbetZone === 'NO2' && (
                    <>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇩🇪 Tyskland (NordLink)</div>
                          <div className="text-[10px] text-slate-500">Kabel (Utland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <span className="text-emerald-400">+{(zd.germanyImport || 0).toLocaleString()} GWh</span>
                          <div className="text-rose-400">-{(zd.germanyExport || 0).toLocaleString()} GWh</div>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇬🇧 Storbritannia (NSL)</div>
                          <div className="text-[10px] text-slate-500">Kabel (Utland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <span className="text-emerald-400">+{(zd.ukImport || 0).toLocaleString()} GWh</span>
                          <div className="text-rose-400">-{(zd.ukExport || 0).toLocaleString()} GWh</div>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇳🇱 Nederland (NorNed)</div>
                          <div className="text-[10px] text-slate-500">Kabel (Utland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <span className="text-emerald-400">+{(zd.netherlandsImport || 0).toLocaleString()} GWh</span>
                          <div className="text-rose-400">-{(zd.netherlandsExport || 0).toLocaleString()} GWh</div>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇩🇰 Danmark (Skagerrak)</div>
                          <div className="text-[10px] text-slate-500">Kabel (Utland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <span className="text-emerald-400">+{(zd.denmarkImport || 0).toLocaleString()} GWh</span>
                          <div className="text-rose-400">-{(zd.denmarkExport || 0).toLocaleString()} GWh</div>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇳🇴 NO1 (Østlandet)</div>
                          <div className="text-[10px] text-slate-500">Regional utveksling (Innland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <span className="text-emerald-400">+{(zd.flow1to2 || 0).toLocaleString()} GWh</span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇳🇴 NO5 (Vestlandet)</div>
                          <div className="text-[10px] text-slate-500">Regional utveksling (Innland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <span className="text-emerald-400">+{(zd.flow5to2 || 0).toLocaleString()} GWh</span>
                        </div>
                      </div>
                    </>
                  )}

                  {cbetZone === 'NO3' && (
                    <>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇸🇪 Sverige (SE2)</div>
                          <div className="text-[10px] text-slate-500">Nea-korridoren (Utland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <span className="text-emerald-400">+{(zd.swedenImport || 0).toLocaleString()} GWh</span>
                          <div className="text-rose-400">-{(zd.swedenExport || 0).toLocaleString()} GWh</div>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇳🇴 NO4 (Nord-Norge)</div>
                          <div className="text-[10px] text-slate-500">Regional utveksling (Innland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <span className="text-emerald-400">+{(zd.flow4to3 || 0).toLocaleString()} GWh</span>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇳🇴 NO1 (Østlandet)</div>
                          <div className="text-[10px] text-slate-500">Regional utveksling (Innland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <div className="text-rose-400">-{(zd.flow3to1 || 0).toLocaleString()} GWh</div>
                        </div>
                      </div>
                    </>
                  )}

                  {cbetZone === 'NO4' && (
                    <>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇸🇪 Sverige (SE1)</div>
                          <div className="text-[10px] text-slate-500">Ofoten-Ritsem (Utland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <span className="text-emerald-400">+{(zd.swedenImport || 0).toLocaleString()} GWh</span>
                          <div className="text-rose-400">-{(zd.swedenExport || 0).toLocaleString()} GWh</div>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇫🇮 Finland</div>
                          <div className="text-[10px] text-slate-500">Pasvik-linjen (Utland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <span className="text-emerald-400">+{(zd.finlandImport || 0).toLocaleString()} GWh</span>
                          <div className="text-rose-400">-{(zd.finlandExport || 0).toLocaleString()} GWh</div>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇳🇴 NO3 (Midt-Norge)</div>
                          <div className="text-[10px] text-slate-500">Regional utveksling (Innland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <div className="text-rose-400">-{(zd.flow4to3 || 0).toLocaleString()} GWh</div>
                        </div>
                      </div>
                    </>
                  )}

                  {cbetZone === 'NO5' && (
                    <>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇳🇴 NO1 (Østlandet)</div>
                          <div className="text-[10px] text-slate-500">Regional utveksling (Innland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <div className="text-rose-400">-{(zd.flow5to1 || 0).toLocaleString()} GWh</div>
                        </div>
                      </div>
                      <div className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800/80 flex items-center justify-between">
                        <div>
                          <div className="text-xs font-bold text-white">🇳🇴 NO2 (Sørlandet)</div>
                          <div className="text-[10px] text-slate-500">Regional utveksling (Innland)</div>
                        </div>
                        <div className="text-right font-mono text-xs font-bold">
                          <div className="text-rose-400">-{(zd.flow5to2 || 0).toLocaleString()} GWh</div>
                        </div>
                      </div>
                    </>
                  )}
                </>
              )}
            </div>
          </div>

        </div>

      </div>
    );
    } catch (err) {
      console.error('Error rendering fresh zone exchange:', err);
      return (
        <div className="glass-card p-8 rounded-2xl border border-slate-800 bg-slate-950 flex flex-col items-center justify-center text-center gap-4">
          <AlertTriangle className="w-8 h-8 text-amber-400" />
          <h3 className="text-lg font-bold text-white">Kunne ikke vise utvekslingsgrafen for valgte filtre</h3>
          <p className="text-xs text-slate-400 max-w-md">
            Det oppsto en feil ved beregning av utvekslingen for denne perioden. Klikk på knappen under for å nullstille filtrene.
          </p>
          <button
            onClick={resetCbetFilters}
            className="px-4 py-2 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl transition-all shadow-lg shadow-cyan-500/20 flex items-center gap-2"
          >
            <RefreshCw className="w-4 h-4" /> Nullstill filtre til År 2026 (Alle soner)
          </button>
        </div>
      );
    }
  };

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Top Header & Category Selectors */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/80">
        <div>
          <h2 className="text-xl font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-cyan-400" />
            Kraftstatistikk (SSB, NVE & Energy-Charts)
          </h2>
          <p className="text-xs text-slate-400">
            Historisk import, eksport, produksjonsmikser og vannmagasiner fra SSB, NVE & Fraunhofer ISE
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          
          {/* Main Category Dropdown */}
          <select
            value={categoryMode}
            onChange={(e) => handleCategoryModeChange(e.target.value)}
            className="bg-slate-900 border border-slate-700 text-cyan-300 font-bold text-xs rounded-xl px-3.5 py-2 outline-none focus:border-cyan-400 cursor-pointer shadow-lg shadow-cyan-500/10"
          >
            <option value="EXPORT_IMPORT">Krafthandel & Utveksling</option>
            <option value="PROD_CONS">Produksjon og Forbruk (SSB)</option>
            <option value="RESERVOIR">Vannmagasin (NVE)</option>
            <option value="EUROPEAN_MIX">Europeisk Kraftmiks (Energy-Charts)</option>
          </select>

          {/* Subcategory Toggle for Krafthandel */}
          {categoryMode === 'EXPORT_IMPORT' && (
            <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
              <button
                onClick={() => {
                  setSubCategory('FRESH_ZONE');
                  localStorage.setItem('norsk_kraftpuls_exchange_subcategory', 'FRESH_ZONE');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  subCategory === 'FRESH_ZONE' ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Fersk Soneutveksling
              </button>
              <button
                onClick={() => {
                  setSubCategory('SSB_HISTORICAL');
                  localStorage.setItem('norsk_kraftpuls_exchange_subcategory', 'SSB_HISTORICAL');
                }}
                className={`px-3 py-1.5 rounded-lg transition-all ${
                  subCategory === 'SSB_HISTORICAL' ? 'bg-cyan-500 text-slate-950 shadow-md font-bold' : 'text-slate-400 hover:text-white'
                }`}
              >
                Historisk (SSB)
              </button>
            </div>
          )}

          {/* Controls for Fraunhofer CBET Exchange */}
          {categoryMode === 'EXPORT_IMPORT' && subCategory === 'FRESH_ZONE' && (
            <>
              {/* Zone Selector */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <select
                  value={cbetZone}
                  onChange={(e) => {
                    setCbetZone(e.target.value);
                    localStorage.setItem('norsk_kraftpuls_exchange_zone', e.target.value);
                  }}
                  className="bg-transparent text-cyan-300 font-bold outline-none cursor-pointer text-xs"
                >
                  <option value="ALL" className="bg-slate-900 text-white">Norge (Nettotal)</option>
                  <option value="NO1" className="bg-slate-900 text-white">NO1 - Østlandet</option>
                  <option value="NO2" className="bg-slate-900 text-white">NO2 - Sørlandet</option>
                  <option value="NO3" className="bg-slate-900 text-white">NO3 - Midt-Norge</option>
                  <option value="NO4" className="bg-slate-900 text-white">NO4 - Nord-Norge</option>
                  <option value="NO5" className="bg-slate-900 text-white">NO5 - Vestlandet</option>
                </select>
              </div>

              {/* Period Selector (År, Mnd, Uke, Dag) */}
              <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 rounded-xl p-1 text-xs font-semibold">
                {['YEAR', 'MONTH', 'WEEK', 'DAY'].map((p) => (
                  <button
                    key={p}
                    onClick={() => {
                      setCbetPeriodType(p);
                      localStorage.setItem('norsk_kraftpuls_exchange_period_type', p);
                    }}
                    className={`px-2.5 py-1.5 rounded-lg transition-all ${
                      cbetPeriodType === p ? 'bg-cyan-500 text-slate-950 font-bold' : 'text-slate-400 hover:text-white'
                    }`}
                  >
                    {p === 'YEAR' ? 'År' : p === 'MONTH' ? 'Mnd' : p === 'WEEK' ? 'Uke' : 'Dag'}
                  </button>
                ))}
              </div>

              {/* Year Select dropdown */}
              <select
                value={cbetYear}
                onChange={(e) => setCbetYear(e.target.value)}
                className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono font-semibold rounded-xl px-3 py-2 outline-none focus:border-cyan-500 cursor-pointer"
              >
                <option value="2026">2026</option>
                <option value="2025">2025</option>
                <option value="2024">2024</option>
              </select>

              {/* Month Select dropdown */}
              {(cbetPeriodType === 'MONTH' || cbetPeriodType === 'DAY') && (
                <select
                  value={cbetMonth}
                  onChange={(e) => setCbetMonth(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-semibold rounded-xl px-3 py-2 outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {MONTH_NAMES_NO.map((m, idx) => {
                    const now = new Date();
                    const isFutureMonth = parseInt(cbetYear, 10) === now.getFullYear() && (idx + 1) > (now.getMonth() + 1);
                    return (
                      <option key={idx} value={String(idx + 1)} disabled={isFutureMonth}>
                        {m}{isFutureMonth ? ' (Framtid)' : ''}
                      </option>
                    );
                  })}
                </select>
              )}

              {/* Week Select dropdown */}
              {cbetPeriodType === 'WEEK' && (
                <select
                  value={cbetWeek}
                  onChange={(e) => setCbetWeek(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono font-semibold rounded-xl px-3 py-2 outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {Array.from({ length: 53 }, (_, i) => i + 1).map(wk => {
                    const now = new Date();
                    const d = new Date();
                    d.setHours(0, 0, 0, 0);
                    d.setDate(d.getDate() + 3 - (d.getDay() + 6) % 7);
                    const week1 = new Date(d.getFullYear(), 0, 4);
                    const curWk = 1 + Math.round(((d.getTime() - week1.getTime()) / 86400000 - 3 + (week1.getDay() + 6) % 7) / 7);
                    const isFutureWk = parseInt(cbetYear, 10) === now.getFullYear() && wk > curWk;
                    return (
                      <option key={wk} value={String(wk)} disabled={isFutureWk}>
                        Uke {wk}{isFutureWk ? ' (Framtid)' : ''}
                      </option>
                    );
                  })}
                </select>
              )}

              {/* Day Select dropdown */}
              {cbetPeriodType === 'DAY' && (
                <select
                  value={cbetDay}
                  onChange={(e) => setCbetDay(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono font-semibold rounded-xl px-3 py-2 outline-none focus:border-cyan-500 cursor-pointer"
                >
                  {Array.from({ length: new Date(parseInt(cbetYear, 10), parseInt(cbetMonth, 10), 0).getDate() }, (_, i) => i + 1).map(dy => {
                    const now = new Date();
                    const isFutureDy = parseInt(cbetYear, 10) === now.getFullYear() && parseInt(cbetMonth, 10) === (now.getMonth() + 1) && dy > now.getDate();
                    return (
                      <option key={dy} value={String(dy)} disabled={isFutureDy}>
                        Dag {dy}{isFutureDy ? ' (Framtid)' : ''}
                      </option>
                    );
                  })}
                </select>
              )}
            </>
          )}

          {/* Controls for SSB views (PROD_CONS or EXPORT_IMPORT with SSB) */}
          {(categoryMode === 'PROD_CONS' || (categoryMode === 'EXPORT_IMPORT' && subCategory === 'SSB_HISTORICAL')) && (
            <>
              {/* Monthly vs Annual Toggle */}
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

              {/* Year Selector dropdown for monthly view */}
              {viewMode === 'MONTHLY' && (
                <select
                  value={selectedYear}
                  onChange={(e) => handleYearChange(e.target.value)}
                  className="bg-slate-900 border border-slate-800 text-slate-200 text-xs font-mono font-semibold rounded-xl px-3 py-2 outline-none focus:border-cyan-500 cursor-pointer"
                >
                  <option value="ALL">Siste 36 Måneder</option>
                  {availableYears.map(y => (
                    <option key={y} value={y}>År {y}</option>
                  ))}
                </select>
              )}
            </>
          )}

          {/* Controls for NVE Reservoir */}
          {categoryMode === 'RESERVOIR' && (
            <>
              {/* Area Selector for NVE Vannmagasin */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold">
                <MapPin className="w-4 h-4 text-cyan-400" />
                <select
                  value={reservoirAreaId}
                  onChange={(e) => {
                    setReservoirAreaId(e.target.value);
                    localStorage.setItem('norsk_kraftpuls_reservoir_area', e.target.value);
                  }}
                  className="bg-transparent text-cyan-300 font-bold outline-none cursor-pointer"
                >
                  {RESERVOIR_AREAS.map(area => (
                    <option key={area.id} value={area.id} className="bg-slate-900 text-white">
                      {area.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Year Selector for NVE Vannmagasin */}
              <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-xs font-semibold">
                <Calendar className="w-4 h-4 text-cyan-400" />
                <select
                  value={reservoirYear}
                  onChange={(e) => {
                    setReservoirYear(e.target.value);
                    localStorage.setItem('norsk_kraftpuls_reservoir_year', e.target.value);
                  }}
                  className="bg-transparent text-slate-200 font-mono font-bold outline-none cursor-pointer"
                >
                  {Array.from({ length: 32 }, (_, i) => 2026 - i).map(yr => (
                    <option key={yr} value={yr} className="bg-slate-900 text-white">
                      År {yr}
                    </option>
                  ))}
                </select>
              </div>
            </>
          )}

        </div>
      </div>

      {/* Render Selected View */}
      {categoryMode === 'EUROPEAN_MIX' ? (
        <EuropeanPowerMix />
      ) : categoryMode === 'RESERVOIR' ? (
        <ReservoirChart selectedAreaId={reservoirAreaId} selectedYear={reservoirYear} />
      ) : categoryMode === 'EXPORT_IMPORT' && subCategory === 'FRESH_ZONE' ? (
        renderFreshZoneExchange()
      ) : (
        <>
          {/* Aggregate KPI Summary Cards - Adapts to Category Selection */}
          {categoryMode === 'EXPORT_IMPORT' ? (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Samlet Eksport</span>
                  <ArrowUpRight className="w-4 h-4 text-rose-400" />
                </div>
                <div className="text-2xl font-black font-mono text-rose-400">
                  {totalExport.toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
                </div>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>Samlet Import</span>
                  <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-2xl font-black font-mono text-emerald-400">
                  {totalImport.toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
                </div>
              </div>

              <div className="glass-card p-5 rounded-2xl border border-slate-800 bg-slate-950/80">
                <div className="text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1 flex items-center justify-between">
                  <span>{isNetExport ? 'Netto Eksport' : 'Netto Import'}</span>
                  {isNetExport ? (
                    <ArrowUpRight className="w-4 h-4 text-rose-400" />
                  ) : (
                    <ArrowDownRight className="w-4 h-4 text-emerald-400" />
                  )}
                </div>
                <div className={`text-2xl font-black font-mono ${isNetExport ? 'text-rose-400' : 'text-emerald-400'}`}>
                  {Math.abs(netExport).toLocaleString('no-NO')} <span className="text-xs font-normal text-slate-400">GWh</span>
                </div>
                <div className={`text-[11px] font-semibold font-mono mt-1 ${isNetExport ? 'text-rose-400/90' : 'text-emerald-400/90'}`}>
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
              : (viewMode === 'MONTHLY' ? 'Månedlig Produksjon & Forbruk' : 'Årlig Produksjon & Forbruk (GWh)')
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
              <span className="text-slate-400 font-bold">Bruttoforbruk:</span>
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
    </>
  )}
</div>
);
}
