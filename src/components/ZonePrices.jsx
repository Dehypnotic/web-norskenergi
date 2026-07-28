import React, { useState, useEffect } from 'react';
import { ZONES, calculateStromstotte, getNorgespris, fetchAllZonePrices, computeZoneStats } from '../services/electricityApi';
import { TrendingUp, TrendingDown, ShieldAlert, Zap, ArrowUpRight, ArrowDownRight, Clock, Info, Star, Target, Calendar } from 'lucide-react';

export default function ZonePrices({ zonePrices, isLoading }) {
  const [homeZone, setHomeZone] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_home_zone') || 'NO1';
  });
  
  const [selectedZone, setSelectedZone] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_home_zone') || 'NO1';
  });

  const [includeVat, setIncludeVat] = useState(true);
  const [includeStromstotte, setIncludeStromstotte] = useState(false);
  const [showNorgespris, setShowNorgespris] = useState(true);

  // Date selection states
  const [activeZonePrices, setActiveZonePrices] = useState(zonePrices);
  const [dateOption, setDateOption] = useState('TODAY'); // 'YESTERDAY', 'TODAY', 'TOMORROW', 'CUSTOM'
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [customDateStr, setCustomDateStr] = useState(() => new Date().toISOString().split('T')[0]);
  const [isFetchingDatePrices, setIsFetchingDatePrices] = useState(false);
  const [dateInfoNotice, setDateInfoNotice] = useState('');

  // Sync activeZonePrices with parent prop when viewing TODAY
  useEffect(() => {
    if (dateOption === 'TODAY') {
      setActiveZonePrices(zonePrices);
    }
  }, [zonePrices, dateOption]);

  const fetchPricesForDate = async (targetDate, optionName) => {
    setIsFetchingDatePrices(true);
    setDateInfoNotice('');

    try {
      const rawPrices = await fetchAllZonePrices(targetDate);
      const computedPrices = {};
      Object.keys(rawPrices).forEach(zoneId => {
        computedPrices[zoneId] = computeZoneStats(rawPrices[zoneId]);
      });
      setActiveZonePrices(computedPrices);
      setSelectedDate(targetDate);
      setDateOption(optionName);

      // Check if tomorrow prices were published or fallback/prognose
      if (optionName === 'TOMORROW') {
        const isTomorrowMock = computedPrices.NO1?.isMock;
        if (isTomorrowMock) {
          setDateInfoNotice('Morgendagens spotpriser publiseres av Nord Pool ca. kl. 13:00. Viser prognose for i morgen.');
        }
      }
    } catch (err) {
      console.error('Kunne ikke hente priser for dato:', err);
    } finally {
      setIsFetchingDatePrices(false);
    }
  };

  const handleDateChange = (option) => {
    const now = new Date();
    if (option === 'TODAY') {
      setDateOption('TODAY');
      setSelectedDate(now);
      setActiveZonePrices(zonePrices);
      setDateInfoNotice('');
      setCustomDateStr(now.toISOString().split('T')[0]);
    } else if (option === 'YESTERDAY') {
      const yesterday = new Date(now.getTime() - 86400000);
      setCustomDateStr(yesterday.toISOString().split('T')[0]);
      fetchPricesForDate(yesterday, 'YESTERDAY');
    } else if (option === 'TOMORROW') {
      const tomorrow = new Date(now.getTime() + 86400000);
      setCustomDateStr(tomorrow.toISOString().split('T')[0]);
      fetchPricesForDate(tomorrow, 'TOMORROW');
    }
  };

  const handleCustomDateChange = (dateStr) => {
    if (!dateStr) return;
    setCustomDateStr(dateStr);
    const targetDate = new Date(dateStr);
    
    const todayStr = new Date().toISOString().split('T')[0];
    const yesterdayStr = new Date(Date.now() - 86400000).toISOString().split('T')[0];
    const tomorrowStr = new Date(Date.now() + 86400000).toISOString().split('T')[0];

    let opt = 'CUSTOM';
    if (dateStr === todayStr) opt = 'TODAY';
    else if (dateStr === yesterdayStr) opt = 'YESTERDAY';
    else if (dateStr === tomorrowStr) opt = 'TOMORROW';

    fetchPricesForDate(targetDate, opt);
  };

  const formatDateLabel = (d) => {
    if (!d) return 'I dag';
    return d.toLocaleDateString('no-NO', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' });
  };

  const handleSetHomeZone = (e, zoneId) => {
    e.stopPropagation();
    setHomeZone(zoneId);
    setSelectedZone(zoneId);
    localStorage.setItem('norsk_kraftpuls_home_zone', zoneId);
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[400px] gap-4">
        <div className="w-12 h-12 rounded-full border-4 border-cyan-500/20 border-t-cyan-500 animate-spin"></div>
        <p className="text-slate-400 text-sm font-medium">Henter ferske spotpriser fra Nord Pool for NO1–NO5...</p>
      </div>
    );
  }

  // Determine highest & lowest current price zones from active dataset
  let minZone = null;
  let maxZone = null;
  let minPrice = Infinity;
  let maxPrice = -Infinity;

  ZONES.forEach(z => {
    const data = activeZonePrices[z.id];
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

  const selectedData = activeZonePrices[selectedZone] || {};
  const hourly = selectedData.hourlyPrices || [];
  const selectedIsNo4 = selectedZone === 'NO4';
  const selectedNorgesprisOre = getNorgespris(selectedDate, includeVat, selectedIsNo4);

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Overview Highlight Banner */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Billigste Sone</span>
            <ArrowDownRight className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-black text-white flex items-baseline gap-2">
            <span>{minZone ? minZone.name : 'NO4'}</span>
            <span className="text-emerald-400 font-mono text-xl">
              {((minPrice === Infinity ? 0.38 : minPrice) * (includeVat && minZone?.id !== 'NO4' ? 1.25 : 1) * 100).toFixed(1)} øre
            </span>
          </div>
        </div>

        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider mb-2">
            <span>Dyreste Sone</span>
            <ArrowUpRight className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-black text-white flex items-baseline gap-2">
            <span>{maxZone ? maxZone.name : 'NO2'}</span>
            <span className="text-rose-400 font-mono text-xl">
              {((maxPrice === -Infinity ? 0.92 : maxPrice) * (includeVat && maxZone?.id !== 'NO4' ? 1.25 : 1) * 100).toFixed(1)} øre
            </span>
          </div>
        </div>

        {/* Visningspris Controls Card */}
        <div className="glass-card p-5 rounded-2xl border border-slate-800/80 bg-gradient-to-br from-slate-900/90 to-slate-950/90 flex flex-col justify-between gap-3">
          <div className="flex items-center justify-between text-slate-400 text-xs font-semibold uppercase tracking-wider">
            <span>Prisvalg & Filter</span>
            <Info className="w-4 h-4 text-cyan-400" />
          </div>

          <div className="flex flex-wrap items-center gap-2">
            {/* MVA Toggle */}
            <button
              onClick={() => setIncludeVat(!includeVat)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                includeVat 
                  ? 'bg-cyan-500/20 text-cyan-300 border-cyan-500/40 shadow' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              MVA (25%)
            </button>

            {/* Strømstøtte Toggle */}
            <button
              onClick={() => setIncludeStromstotte(!includeStromstotte)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                includeStromstotte 
                  ? 'bg-emerald-500/20 text-emerald-300 border-emerald-500/40 shadow' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Strømstøtte
            </button>

            {/* Norgespris Reference Line Toggle */}
            <button
              onClick={() => setShowNorgespris(!showNorgespris)}
              className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all border ${
                showNorgespris 
                  ? 'bg-amber-400/20 text-amber-300 border-amber-400/40 shadow' 
                  : 'bg-slate-800 text-slate-400 border-slate-700'
              }`}
            >
              Norgespris Linje
            </button>
          </div>
        </div>
      </div>

      {/* Spot Price Cards for NO1 - NO5 */}
      <div className="space-y-4">
        
        {/* Header Bar with Date Selector Buttons & Calendar */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-4">
          <div>
            <h2 className="text-xl font-bold text-white flex items-center gap-2">
              <Zap className="w-5 h-5 text-cyan-400" />
              Spotpriser per Prisområde (NO1 - NO5)
            </h2>
            <p className="text-xs text-slate-400 mt-0.5 capitalize">
              {includeStromstotte ? 'Priser inkludert 90% statlig strømstøtte' : 'Standard rene spotpriser'} • {formatDateLabel(selectedDate)}
            </p>
          </div>

          {/* Date Selector Controls */}
          <div className="flex flex-wrap items-center gap-1.5 bg-slate-900/90 border border-slate-800 rounded-xl p-1.5 text-xs font-semibold self-start sm:self-auto">
            <button
              onClick={() => handleDateChange('YESTERDAY')}
              disabled={isFetchingDatePrices}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateOption === 'YESTERDAY' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              I går
            </button>

            <button
              onClick={() => handleDateChange('TODAY')}
              disabled={isFetchingDatePrices}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateOption === 'TODAY' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              I dag
            </button>

            <button
              onClick={() => handleDateChange('TOMORROW')}
              disabled={isFetchingDatePrices}
              className={`px-3 py-1.5 rounded-lg transition-all ${
                dateOption === 'TOMORROW' ? 'bg-cyan-500 text-slate-950 font-bold shadow-md' : 'text-slate-400 hover:text-white'
              }`}
            >
              I morgen
            </button>

            <div className="flex items-center gap-1.5 pl-2 border-l border-slate-800">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <input
                type="date"
                value={customDateStr}
                onChange={(e) => handleCustomDateChange(e.target.value)}
                className="bg-slate-950 border border-slate-800 text-slate-200 text-xs font-mono rounded-lg px-2.5 py-1 outline-none focus:border-cyan-500"
              />
            </div>
          </div>
        </div>

        {/* Notice if Nord Pool tomorrow prices not ready yet */}
        {dateInfoNotice && (
          <div className="mb-4 px-4 py-2 rounded-xl bg-amber-400/10 border border-amber-400/30 text-amber-300 text-xs font-medium flex items-center gap-2">
            <Info className="w-4 h-4 shrink-0" />
            <span>{dateInfoNotice}</span>
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {ZONES.map((zone) => {
            const data = activeZonePrices[zone.id] || {};
            const isSelected = selectedZone === zone.id;
            const isHome = homeZone === zone.id;
            const currentNok = data.current || 0;
            const isNo4 = zone.id === 'NO4'; // NO4 has VAT exemption in Norway
            const vatFactor = (includeVat && !isNo4) ? 1.25 : 1.0;
            const rawOre = currentNok * vatFactor * 100;
            
            const support = calculateStromstotte(currentNok, includeVat && !isNo4);
            const effectiveOre = support.hasSubsidy ? (support.effectivePricePerKwh * 100) : rawOre;
            const displayOre = includeStromstotte ? effectiveOre : rawOre;

            const norgesprisOre = getNorgespris(selectedDate, includeVat, isNo4);
            const deltaFromNorgespris = displayOre - norgesprisOre;

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

                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-300">
                    {zone.id}
                  </span>
                  
                  {/* Home Zone Star Toggle Button */}
                  <button
                    onClick={(e) => handleSetHomeZone(e, zone.id)}
                    title={isHome ? 'Din valgte hjemmesone' : 'Sett som din hjemmesone'}
                    className={`text-[11px] px-2 py-0.5 rounded-full flex items-center gap-1 transition-all ${
                      isHome
                        ? 'bg-amber-400/20 text-amber-300 border border-amber-400/40 font-bold'
                        : 'text-slate-500 hover:text-amber-400 hover:bg-slate-800/60'
                    }`}
                  >
                    <Star className={`w-3 h-3 ${isHome ? 'fill-amber-400 text-amber-400' : ''}`} />
                    {isHome ? 'Hjemme' : 'Velg'}
                  </button>
                </div>

                <div className="text-sm font-semibold text-slate-300 truncate mb-2">
                  {zone.city}
                </div>

                <div className="mb-4">
                  <div className="text-3xl font-black font-mono text-white tracking-tight">
                    {displayOre.toFixed(1)}
                    <span className="text-xs font-normal text-slate-400 ml-1">øre/kWh</span>
                  </div>

                  {/* Fixed-height Subtitle Slot preventing layout shift */}
                  <div className="h-5 mt-1 flex items-center">
                    {includeStromstotte ? (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400/90">
                        <ShieldAlert className="w-3 h-3" />
                        Viser pris inkl. støtte
                      </div>
                    ) : support.hasSubsidy ? (
                      <div className="flex items-center gap-1 text-[10px] font-semibold text-emerald-400/90">
                        <ShieldAlert className="w-3 h-3" />
                        Effektiv m/støtte: {(support.effectivePricePerKwh * 100).toFixed(1)} øre
                      </div>
                    ) : (
                      <div className="text-[10px] text-slate-500 italic">
                        Under støtteterskel (73ø)
                      </div>
                    )}
                  </div>
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
              {includeStromstotte ? 'Viser effektiv pris inkludert 90% strømstøtte' : 'Viser ren spotpris før strømstøtte'} • {formatDateLabel(selectedDate)}
            </p>
          </div>

          <div className="flex items-center gap-2 text-xs">
            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-md bg-slate-900 border border-slate-800 text-slate-300 font-mono">
              <span className="w-2 h-2 rounded-full bg-cyan-400"></span> Nåværende time: {new Date().getHours()}:00
            </span>
          </div>
        </div>

        {/* 24 Hour Bar Graph Visualization with Left Category Indicator & Norgespris Line */}
        <div className="space-y-4">
          <div className="flex items-stretch gap-2 pt-8 pb-2 px-1 border-b border-slate-800/80 relative">
            
            {/* Left Side Category Label Indicators (øre / time) */}
            <div className="flex flex-col justify-end pb-0.5 text-right space-y-0.5 pr-2 border-r border-slate-800/80 font-mono text-[10px] z-20">
              <span className="text-cyan-400 font-bold tracking-wider">øre</span>
              <span className="text-slate-400 font-bold tracking-wider">time</span>
            </div>

            {/* 24 Hours Bars + Swapped Labels Stack */}
            <div className="flex-1 h-64 flex items-end gap-1 sm:gap-2 relative">
              
              {/* Clean Norgespris Reference Line in Front of Graph Bars */}
              {showNorgespris && (() => {
                const maxGraphOre = Math.max(150, (selectedData.max || 1) * (includeVat && !selectedIsNo4 ? 1.25 : 1) * 100 * 1.15);
                const norgesprisPercent = Math.min(100, Math.max(0, (selectedNorgesprisOre / maxGraphOre) * 100));

                return (
                  <div 
                    className="absolute left-0 right-0 z-25 border-b-2 border-dashed border-amber-400/90 pointer-events-none transition-all duration-300 shadow-sm shadow-amber-500/20"
                    style={{ bottom: `calc(${norgesprisPercent}% + 36px)` }}
                  />
                );
              })()}

              {hourly.map((item, idx) => {
                const nok = item.NOK_per_kWh;
                const isNo4 = selectedZone === 'NO4';
                const vatFactor = (includeVat && !isNo4) ? 1.25 : 1.0;
                const rawOre = nok * vatFactor * 100;
                
                const support = calculateStromstotte(nok, includeVat && !isNo4);
                const effectiveOre = support.hasSubsidy ? (support.effectivePricePerKwh * 100) : rawOre;
                const displayOre = includeStromstotte ? effectiveOre : rawOre;

                const maxGraphOre = Math.max(150, (selectedData.max || 1) * vatFactor * 100 * 1.15);
                const heightPercent = Math.min(100, Math.max(8, (displayOre / maxGraphOre) * 100));
                const isTodayDate = dateOption === 'TODAY';
                const isCurrentHour = isTodayDate && idx === selectedData.currentHour;

                return (
                  <div key={idx} className="flex-1 flex flex-col items-center h-full justify-end group relative z-15">
                    
                    {/* Tooltip on Hover */}
                    <div className="opacity-0 group-hover:opacity-100 transition-opacity absolute -top-12 z-30 bg-slate-900 border border-slate-700 text-white text-[11px] font-mono px-2.5 py-1 rounded shadow-xl whitespace-nowrap pointer-events-none">
                      <div className="font-bold">{String(idx).padStart(2, '0')}:00 - {String((idx+1)%24).padStart(2, '0')}:00</div>
                      <div className="text-cyan-400">{displayOre.toFixed(2)} øre/kWh</div>
                      {showNorgespris && (
                        <div className={displayOre >= selectedNorgesprisOre ? 'text-amber-400' : 'text-emerald-400'}>
                          {(displayOre - selectedNorgesprisOre) >= 0 ? `+${(displayOre - selectedNorgesprisOre).toFixed(1)}ø vs Norgespris` : `${(displayOre - selectedNorgesprisOre).toFixed(1)}ø vs Norgespris`}
                        </div>
                      )}
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

                    {/* Swapped Stack: Øre on top (under baseline), Time on bottom */}
                    <div className="mt-2 flex flex-col items-center gap-0.5 pointer-events-none">
                      <span className={`text-[9px] sm:text-[10px] font-mono font-bold ${isCurrentHour ? 'text-cyan-300' : 'text-slate-300'}`}>
                        {Math.round(displayOre)}
                      </span>
                      <span className={`text-[10px] font-mono ${isCurrentHour ? 'text-cyan-400 font-bold' : 'text-slate-400'}`}>
                        {String(idx).padStart(2, '0')}
                      </span>
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
