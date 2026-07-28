import React, { useState, useEffect, useCallback } from 'react';
import Header from './components/Header';
import ZonePrices from './components/ZonePrices';
import EnergyFlowMap from './components/EnergyFlowMap';
import HistoricalStats from './components/HistoricalStats';
import PriceHistory from './components/PriceHistory';
import StromCalculator from './components/Calculator';
import DataExportModal from './components/DataExportModal';

import { fetchAllZonePrices, computeZoneStats } from './services/electricityApi';
import { fetchSSBMonthlyBalance, fetchSSBAnnualBalance } from './services/ssbApi';
import { Globe, Zap, Database, ArrowUpRight, ShieldCheck, Heart } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState('prices'); // 'prices', 'flow', 'ssb', 'calc'
  
  // Data States
  const [zonePrices, setZonePrices] = useState({});
  const [ssbMonthly, setSsbMonthly] = useState([]);
  const [ssbAnnual, setSsbAnnual] = useState([]);
  
  // UI Status States
  const [isLoadingPrices, setIsLoadingPrices] = useState(true);
  const [isLoadingSsb, setIsLoadingSsb] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [isLiveMode, setIsLiveMode] = useState(true);
  const [isExportOpen, setIsExportOpen] = useState(false);

  // Fetch all live data sources
  const loadData = useCallback(async () => {
    setIsRefreshing(true);
    const now = new Date();

    try {
      // 1. Fetch live spot prices for NO1 - NO5
      const rawPrices = await fetchAllZonePrices(now);
      const computedPrices = {};
      let isAnyMock = false;

      Object.keys(rawPrices).forEach(zoneId => {
        const stats = computeZoneStats(rawPrices[zoneId]);
        computedPrices[zoneId] = stats;
        if (stats.isMock) isAnyMock = true;
      });

      setZonePrices(computedPrices);
      setIsLiveMode(!isAnyMock);
      setIsLoadingPrices(false);

      // 2. Fetch SSB Historical Data
      const monthly = await fetchSSBMonthlyBalance();
      const annual = await fetchSSBAnnualBalance();
      setSsbMonthly(monthly);
      setSsbAnnual(annual);
      setIsLoadingSsb(false);

      setLastUpdated(now);
    } catch (err) {
      console.error('Error loading Norwegian energy data:', err);
    } finally {
      setIsRefreshing(false);
    }
  }, []);

  // Initial load & periodic background refresh timer (every 60s)
  useEffect(() => {
    loadData();
    const interval = setInterval(() => {
      loadData();
    }, 60000);

    return () => clearInterval(interval);
  }, [loadData]);

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col font-sans selection:bg-cyan-500 selection:text-slate-950">
      
      {/* Top Header Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        lastUpdated={lastUpdated}
        onRefresh={loadData}
        isRefreshing={isRefreshing}
        isLiveMode={isLiveMode}
        onToggleExport={() => setIsExportOpen(true)}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 lg:px-8 py-8 space-y-8">
        
        {/* Render Tab Views */}
        {activeTab === 'prices' && (
          <ZonePrices zonePrices={zonePrices} isLoading={isLoadingPrices} />
        )}

        {activeTab === 'flow' && (
          <EnergyFlowMap zonePrices={zonePrices} />
        )}

        {activeTab === 'history' && (
          <PriceHistory />
        )}

        {activeTab === 'ssb' && (
          <HistoricalStats monthlyData={ssbMonthly} annualData={ssbAnnual} isLoading={isLoadingSsb} />
        )}

        {activeTab === 'calc' && (
          <StromCalculator zonePrices={zonePrices} />
        )}

      </main>

      {/* Data Export Modal */}
      <DataExportModal
        isOpen={isExportOpen}
        onClose={() => setIsExportOpen(false)}
        zonePrices={zonePrices}
        ssbMonthly={ssbMonthly}
        ssbAnnual={ssbAnnual}
      />

      {/* Footer & Source Credits */}
      <footer className="border-t border-slate-900 bg-slate-950 py-8 px-4 lg:px-8 mt-12 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-cyan-400" />
            <span className="font-bold text-slate-300">Norsk KraftPuls Dashboard</span>
            <span>&copy; {new Date().getFullYear()} Dehypnotic</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-4 text-[11px]">
            <span>Datakilder:</span>
            <a href="https://www.hvakosterstrommen.no" target="_blank" rel="noreferrer" className="hover:text-cyan-400 underline">
              HvaKosterStrømmen API (Nord Pool)
            </a>
            <span>•</span>
            <a href="https://www.ssb.no" target="_blank" rel="noreferrer" className="hover:text-cyan-400 underline">
              SSB Statbank (Tabell 14091 & 08307)
            </a>
            <span>•</span>
            <a href="https://www.statnett.no" target="_blank" rel="noreferrer" className="hover:text-cyan-400 underline">
              Statnett Kraftsystemdata
            </a>
          </div>
        </div>
      </footer>

    </div>
  );
}
