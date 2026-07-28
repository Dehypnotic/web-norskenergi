import React, { useState } from 'react';
import { ZONES, calculateStromstotte, getNorgespris } from '../services/electricityApi';
import { getMonthlyPriceHistoryForYear } from '../services/priceHistoryService';
import { Calculator, Zap, ShieldCheck, Target, ArrowRightLeft, Info, Check, Calendar } from 'lucide-react';

// Benchmark 12-month average spot prices for NO1 - NO5 (NOK/kWh excl. VAT)
const ZONE_12M_AVG_NOK = {
  NO1: 0.76, // 76.0 øre ekskl. mva
  NO2: 0.79, // 79.0 øre ekskl. mva
  NO3: 0.48, // 48.0 øre ekskl. mva
  NO4: 0.33, // 33.0 øre (mva-fritatt)
  NO5: 0.74  // 74.0 øre ekskl. mva
};

export default function StromCalculator({ zonePrices }) {
  const [selectedZone, setSelectedZone] = useState(() => {
    return localStorage.getItem('norsk_kraftpuls_home_zone') || 'NO1';
  });

  const [monthlyKwh, setMonthlyKwh] = useState(1200);

  const isNo4 = selectedZone === 'NO4';
  const spot12MthNok = ZONE_12M_AVG_NOK[selectedZone] || 0.75;

  // Spot price & VAT calculations based on 12-month rolling average
  const vatRate = isNo4 ? 1.0 : 1.25;
  const spotWithVat = spot12MthNok * vatRate;
  const spotOre = spotWithVat * 100;

  // Strømstøtte calculations based on 12-month rolling average
  const support = calculateStromstotte(spot12MthNok, !isNo4);
  const subsidyPerKwh = support.subsidyPerKwh;
  const effectiveSpotOre = (spotWithVat - subsidyPerKwh) * 100;

  // Norgespris calculation (50 øre/kWh incl. VAT in regions with VAT, 40 øre in NO4)
  const norgesprisOre = getNorgespris(new Date(), !isNo4, isNo4);

  // Monthly cost totals (elpris)
  const rawSpotCost = monthlyKwh * spotWithVat;
  const totalSubsidy = monthlyKwh * subsidyPerKwh;
  const spotWithSubsidyCost = rawSpotCost - totalSubsidy;
  const norgesprisCost = monthlyKwh * (norgesprisOre / 100);

  // Difference vs Norgespris
  const norgesprisSavingsVsSpotWithSubsidy = spotWithSubsidyCost - norgesprisCost;
  const isNorgesprisCheaper = norgesprisSavingsVsSpotWithSubsidy >= 0;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title Header */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/80">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <ShieldCheck className="w-5 h-5 text-cyan-400" />
          Kalkulator for Støtteordning
        </h2>
        <p className="text-xs text-slate-400 mt-1">
          Beregningene baserer seg på gjennomsnittlig spotpris de siste 12 månedene for ditt valgte prisområde. Dette gir et realistisk bilde av forventet månedsutgift og din faktiske besparelse.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input Form (6 Cols) */}
        <div className="lg:col-span-6 glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/90 space-y-6 flex flex-col justify-between">
          
          {/* Select Bidding Zone */}
          <div>
            <label className="block text-xs font-bold uppercase tracking-wider text-slate-300 mb-3">
              1. Velg ditt prisområde (Sone)
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2">
              {ZONES.map(z => (
                <button
                  key={z.id}
                  onClick={() => setSelectedZone(z.id)}
                  className={`p-3 rounded-xl border text-center transition-all ${
                    selectedZone === z.id
                      ? 'border-cyan-500 bg-cyan-500/10 text-white ring-2 ring-cyan-500/20'
                      : 'border-slate-800 bg-slate-900/60 text-slate-400 hover:text-white'
                  }`}
                >
                  <div className="text-xs font-extrabold">{z.id}</div>
                  <div className="text-[10px] truncate font-medium mt-0.5">{z.city.split('/')[0]}</div>
                </button>
              ))}
            </div>
            <p className="text-[11px] text-slate-400 mt-2">Valgt hjemmesone fra Strømpriser benyttes automatisk som standard.</p>
          </div>

          {/* Monthly Consumption Slider */}
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-bold uppercase tracking-wider text-slate-300">
                2. Estimert månedlig forbruk (kWh)
              </label>
              <span className="text-sm font-black font-mono text-cyan-400 bg-cyan-500/10 px-3 py-1 rounded-lg border border-cyan-500/20">
                {monthlyKwh.toLocaleString('no-NO')} kWh / mnd
              </span>
            </div>
            <input
              type="range"
              min="200"
              max="5000"
              step="50"
              value={monthlyKwh}
              onChange={(e) => setMonthlyKwh(Number(e.target.value))}
              className="w-full h-2 bg-slate-800 rounded-lg appearance-none cursor-pointer accent-cyan-500"
            />
            <div className="flex justify-between text-[11px] text-slate-500 mt-1 font-mono">
              <span>200 kWh (Leilighet)</span>
              <span>1 600 kWh (Enebolig)</span>
              <span>5 000 kWh (Stort hus + Elbil)</span>
            </div>
          </div>

        </div>

        {/* Norgespris Gevinst / Tap Summary Card (6 Cols) */}
        <div className="lg:col-span-6 glass-card p-6 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 space-y-6 flex flex-col justify-between">
          
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-bold text-white flex items-center gap-2">
              <Target className="w-5 h-5 text-amber-400" />
              Norgespris vs. Spotpris ({selectedZone})
            </h3>
            <span className="text-xs font-mono font-bold px-2.5 py-1 rounded-md bg-amber-400/10 text-amber-300 border border-amber-400/30">
              Fastpris: {Math.round(norgesprisOre)} øre/kWh
            </span>
          </div>

          {/* Main Gevinst / Tap Banner */}
          <div className={`p-5 rounded-2xl border ${
            isNorgesprisCheaper 
              ? 'bg-amber-400/10 border-amber-400/30 text-amber-300' 
              : 'bg-emerald-500/10 border-emerald-500/30 text-emerald-400'
          }`}>
            <div className="text-xs font-bold uppercase tracking-wider mb-1">
              {isNorgesprisCheaper ? 'Estimert Besparelse med Norgespris' : 'Estimert Besparelse med Spotpris + Strømstøtte'}
            </div>
            <div className="text-3xl font-black font-mono">
              {Math.abs(Math.round(norgesprisSavingsVsSpotWithSubsidy)).toLocaleString('no-NO')} <span className="text-sm font-normal">kr / mnd</span>
            </div>
            <div className="text-xs font-medium mt-1 opacity-90">
              {isNorgesprisCheaper 
                ? `Norgespris gir deg ${Math.abs(Math.round(norgesprisSavingsVsSpotWithSubsidy)).toLocaleString()} kr lavere elregning per måned enn snittpris med strømstøtte.` 
                : `Strømstøtte gir deg ${Math.abs(Math.round(norgesprisSavingsVsSpotWithSubsidy)).toLocaleString()} kr lavere månedskostnad enn Norgespris basert på snittpris.`
              }
            </div>
          </div>

          {/* 3 Price Options Comparison Grid */}
          <div>
            <div className="text-xs font-bold uppercase tracking-wider text-slate-300 mb-3 flex items-center justify-between">
              <span>Månedskostnad Basert på 12-Måneders Snitt ({monthlyKwh.toLocaleString()} kWh)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 font-mono">
              
              {/* Option 1: Spotpris Uten Støtte */}
              <div className="p-3 rounded-xl border border-slate-800 bg-slate-900/60">
                <div className="text-[10px] text-slate-400 font-semibold truncate">Spot (12-mnd snitt)</div>
                <div className="text-lg font-black text-white mt-0.5">
                  {Math.round(rawSpotCost).toLocaleString()} <span className="text-xs font-normal text-slate-400">kr</span>
                </div>
                <div className="text-[10px] text-slate-400 mt-1">{spotOre.toFixed(1)} øre/kWh</div>
              </div>

              {/* Option 2: Spotpris Med Strømstøtte */}
              <div className="p-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10">
                <div className="text-[10px] text-emerald-400 font-semibold truncate flex items-center gap-1">
                  <ShieldCheck className="w-3 h-3" /> Spot m/støtte
                </div>
                <div className="text-lg font-black text-emerald-300 mt-0.5">
                  {Math.round(spotWithSubsidyCost).toLocaleString()} <span className="text-xs font-normal text-slate-400">kr</span>
                </div>
                <div className="text-[10px] text-emerald-400/90 mt-1">{effectiveSpotOre.toFixed(1)} øre/kWh</div>
              </div>

              {/* Option 3: Norgespris */}
              <div className="p-3 rounded-xl border border-amber-400/30 bg-amber-400/10">
                <div className="text-[10px] text-amber-300 font-semibold truncate flex items-center gap-1">
                  <Target className="w-3 h-3" /> Norgespris
                </div>
                <div className="text-lg font-black text-amber-300 mt-0.5">
                  {Math.round(norgesprisCost).toLocaleString()} <span className="text-xs font-normal text-slate-400">kr</span>
                </div>
                <div className="text-[10px] text-amber-400/90 mt-1">{norgesprisOre.toFixed(1)} øre/kWh</div>
              </div>

            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
