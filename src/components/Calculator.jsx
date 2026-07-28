import React, { useState } from 'react';
import { ZONES, calculateStromstotte } from '../services/electricityApi';
import { Calculator, Zap, ShieldCheck, Home, Car, Flame, Check, Info } from 'lucide-react';

export default function StromCalculator({ zonePrices }) {
  const [selectedZone, setSelectedZone] = useState('NO1');
  const [monthlyKwh, setMonthlyKwh] = useState(1200);
  const [hasEv, setHasEv] = useState(true);
  const [heatingType, setHeatingType] = useState('HEAT_PUMP'); // 'HEAT_PUMP', 'ELECTRIC', 'WOOD'

  const currentZoneData = zonePrices[selectedZone] || {};
  const currentSpotNok = currentZoneData.current || 0.85;
  const isNo4 = selectedZone === 'NO4';

  // Subsidy calculations
  const vatRate = isNo4 ? 1.0 : 1.25;
  const spotWithVat = currentSpotNok * vatRate;

  const support = calculateStromstotte(currentSpotNok, !isNo4);
  const subsidyPerKwh = support.subsidyPerKwh;
  const netSpotPerKwh = spotWithVat - subsidyPerKwh;

  // Grid tariff (Nettleie) estimate ~ 48 øre/kWh incl capacity charge
  const gridTariffPerKwh = 0.48;

  // Monthly totals
  const rawSpotCost = monthlyKwh * spotWithVat;
  const totalSubsidy = monthlyKwh * subsidyPerKwh;
  const netSpotCost = rawSpotCost - totalSubsidy;
  const totalGridCost = monthlyKwh * gridTariffPerKwh;
  const grandTotalCost = netSpotCost + totalGridCost;

  return (
    <div className="space-y-8 animate-fade-in">
      
      {/* Title Header */}
      <div className="glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/80">
        <h2 className="text-xl font-bold text-white flex items-center gap-2">
          <Calculator className="w-5 h-5 text-cyan-400" />
          Kalkulator for Strømregning & Strømstøtte
        </h2>
        <p className="text-xs text-slate-400">
          Beregn nøyaktig månedskostnad basert på dagens gjeldende spotpris i din sone og statens 90% strømstøtte.
        </p>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        
        {/* Input Form (7 Cols) */}
        <div className="lg:col-span-7 glass-card p-6 rounded-2xl border border-slate-800 bg-slate-950/90 space-y-6">
          
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

          {/* Additional Options */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-2">
            
            {/* Heating */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60">
              <label className="text-xs font-bold text-slate-300 block mb-2">Hovedoppvarming</label>
              <div className="space-y-2 text-xs">
                <button
                  onClick={() => setHeatingType('HEAT_PUMP')}
                  className={`w-full text-left p-2 rounded-lg border flex items-center justify-between ${
                    heatingType === 'HEAT_PUMP' ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-2"><Home className="w-3.5 h-3.5 text-cyan-400" /> Varmepumpe</span>
                  {heatingType === 'HEAT_PUMP' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
                <button
                  onClick={() => setHeatingType('ELECTRIC')}
                  className={`w-full text-left p-2 rounded-lg border flex items-center justify-between ${
                    heatingType === 'ELECTRIC' ? 'border-cyan-500 bg-cyan-500/10 text-white' : 'border-slate-800 text-slate-400'
                  }`}
                >
                  <span className="flex items-center gap-2"><Zap className="w-3.5 h-3.5 text-amber-400" /> Panelovner</span>
                  {heatingType === 'ELECTRIC' && <Check className="w-3.5 h-3.5 text-cyan-400" />}
                </button>
              </div>
            </div>

            {/* EV Charger */}
            <div className="p-4 rounded-xl border border-slate-800 bg-slate-900/60 flex flex-col justify-between">
              <label className="text-xs font-bold text-slate-300 block mb-2">Lader du elbil hjemme?</label>
              <button
                onClick={() => setHasEv(!hasEv)}
                className={`w-full p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-between transition-all ${
                  hasEv ? 'border-emerald-500 bg-emerald-500/10 text-emerald-400' : 'border-slate-800 text-slate-400'
                }`}
              >
                <span className="flex items-center gap-2"><Car className="w-4 h-4" /> {hasEv ? 'Ja, har elbil' : 'Nei'}</span>
                {hasEv && <Check className="w-4 h-4 text-emerald-400" />}
              </button>
            </div>

          </div>

        </div>

        {/* Calculation Summary Card (5 Cols) */}
        <div className="lg:col-span-5 glass-card p-6 rounded-2xl border border-slate-800 bg-gradient-to-b from-slate-900 to-slate-950 space-y-6">
          
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Zap className="w-5 h-5 text-cyan-400" />
            Estimert Månedsregning ({selectedZone})
          </h3>

          <div className="space-y-3 text-sm border-b border-slate-800/80 pb-4">
            <div className="flex justify-between text-slate-300">
              <span>Brutto spotpris ({ (spotWithVat * 100).toFixed(1) } øre/kWh):</span>
              <span className="font-mono">{Math.round(rawSpotCost)} kr</span>
            </div>

            {support.hasSubsidy ? (
              <div className="flex justify-between text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                <span className="flex items-center gap-1.5"><ShieldCheck className="w-4 h-4" /> Statens Strømstøtte (90%):</span>
                <span className="font-mono">-{Math.round(totalSubsidy)} kr</span>
              </div>
            ) : (
              <div className="text-xs text-slate-400 italic">
                Spotpris er under støtteterskel (73 øre eks. mva). Ingen strømstøtte utbetales.
              </div>
            )}

            <div className="flex justify-between text-slate-300">
              <span>Estimert nettleie (~48 øre/kWh):</span>
              <span className="font-mono">{Math.round(totalGridCost)} kr</span>
            </div>
          </div>

          <div>
            <div className="text-xs uppercase tracking-wider text-slate-400 font-semibold mb-1">
              Totalt Å Betale (Inkl. Nettleie & Støtte)
            </div>
            <div className="text-4xl font-black font-mono text-cyan-400 tracking-tight">
              {Math.round(grandTotalCost).toLocaleString('no-NO')} <span className="text-lg font-normal text-slate-400">kr / mnd</span>
            </div>
            <div className="text-xs text-slate-400 mt-2 flex items-center gap-1">
              <Info className="w-3.5 h-3.5 text-slate-500" />
              Effektiv kWh-pris alt inkludert: <strong className="text-slate-200">{((grandTotalCost / monthlyKwh) * 100).toFixed(1)} øre/kWh</strong>
            </div>
          </div>

        </div>

      </div>

    </div>
  );
}
