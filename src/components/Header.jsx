import React from 'react';
import { Activity, RefreshCw, Zap, Database, MapPin, BarChart3, Calculator, Download, Sun, Moon, ShieldCheck } from 'lucide-react';

export default function Header({ 
  activeTab, 
  setActiveTab, 
  lastUpdated, 
  onRefresh, 
  isRefreshing, 
  isLiveMode,
  onToggleExport
}) {
  return (
    <header className="header-glass sticky top-0 z-50 border-b border-slate-800 bg-slate-950/80 backdrop-blur-xl px-4 lg:px-8 py-4">
      <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        
        {/* Brand Logo & Live Status */}
        <div className="flex items-center gap-4">
          <div className="relative flex items-center justify-center w-12 h-12 rounded-2xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 shadow-lg shadow-cyan-500/25 ring-1 ring-white/20">
            <Zap className="w-6 h-6 text-white animate-pulse" />
            <span className="absolute -top-1 -right-1 flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-cyan-500"></span>
            </span>
          </div>

          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-black tracking-tight text-transparent bg-clip-text bg-gradient-to-r from-white via-slate-100 to-slate-400">
                Norsk Kraft<span className="text-cyan-400">Puls</span>
              </h1>
              <span className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold border whitespace-nowrap shrink-0 ${
                isLiveMode 
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30' 
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
              }`}>
                <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${isLiveMode ? 'bg-emerald-400 animate-ping' : 'bg-amber-400'}`}></span>
                {isLiveMode ? 'LIVE API (NO1–NO5)' : 'FALLBACK DATA'}
              </span>
            </div>
            <p className="text-xs text-slate-400 font-medium">
              Reeltidssky for norske strømpriser, kraftflyt & kraftstatistikk (SSB & NVE)
            </p>
          </div>
        </div>

        {/* Navigation Tabs */}
        <nav className="flex items-center gap-1 p-1 bg-slate-900/90 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('prices')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'prices'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Activity className="w-4 h-4" />
            Strømpriser
          </button>

          <button
            onClick={() => setActiveTab('flow')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'flow'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <MapPin className="w-4 h-4" />
            Strømflyt
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <BarChart3 className="w-4 h-4" />
            Prishistorikk
          </button>

          <button
            onClick={() => setActiveTab('ssb')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'ssb'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <Database className="w-4 h-4" />
            Statistikk
          </button>

          <button
            onClick={() => setActiveTab('calc')}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-sm font-semibold transition-all ${
              activeTab === 'calc'
                ? 'bg-cyan-500 text-slate-950 shadow-md shadow-cyan-500/20'
                : 'text-slate-400 hover:text-white hover:bg-slate-800/60'
            }`}
          >
            <ShieldCheck className="w-4 h-4" />
            Støtteordning
          </button>
        </nav>

        {/* Action Controls */}
        <div className="flex items-center gap-3">
          <div className="hidden lg:block text-right">
            <div className="text-[11px] uppercase tracking-wider font-bold text-slate-500">Oppdatert</div>
            <div className="text-xs font-mono font-medium text-slate-300">
              {lastUpdated ? lastUpdated.toLocaleTimeString('no-NO') : '--:--:--'}
            </div>
          </div>

          <button
            onClick={onRefresh}
            disabled={isRefreshing}
            className="p-2.5 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 transition-all disabled:opacity-50"
            title="Oppdater live data"
          >
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin text-cyan-400' : ''}`} />
          </button>

          <button
            onClick={onToggleExport}
            className="flex items-center gap-2 px-3 py-2 rounded-xl border border-slate-800 bg-slate-900/80 text-slate-300 hover:text-white hover:bg-slate-800 text-xs font-medium transition-all"
          >
            <Download className="w-4 h-4 text-cyan-400" />
            <span className="hidden sm:inline">Eksport</span>
          </button>
        </div>

      </div>
    </header>
  );
}
