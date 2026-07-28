import React from 'react';
import { Download, X, FileText, Code, Check } from 'lucide-react';

export default function DataExportModal({ isOpen, onClose, zonePrices, ssbMonthly, ssbAnnual }) {
  if (!isOpen) return null;

  const downloadFile = (content, filename, type) => {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleExportJson = () => {
    const payload = {
      exportTimestamp: new Date().toISOString(),
      source: 'Norsk KraftPuls (Nord Pool & SSB APIs)',
      spotPrices: zonePrices,
      ssbMonthlyHistory: ssbMonthly,
      ssbAnnualHistory: ssbAnnual
    };
    downloadFile(JSON.stringify(payload, null, 2), 'norsk_kraft_data.json', 'application/json');
  };

  const handleExportCsvPrices = () => {
    let csv = 'Zone,TimeStart,TimeEnd,NOK_per_kWh,EUR_per_kWh\n';
    Object.keys(zonePrices).forEach(zoneId => {
      const items = zonePrices[zoneId]?.hourlyPrices || [];
      items.forEach(item => {
        csv += `${zoneId},${item.time_start},${item.time_end},${item.NOK_per_kWh},${item.EUR_per_kWh}\n`;
      });
    });
    downloadFile(csv, 'spotpriser_no1_no5.csv', 'text/csv');
  };

  const handleExportCsvSsb = () => {
    let csv = 'MonthLabel,Year,Month,TotalProdGWh,HydroGWh,WindGWh,ImportGWh,ExportGWh,NetExportGWh\n';
    ssbMonthly.forEach(row => {
      csv += `${row.label},${row.year},${row.month},${row.totalProd || 0},${row.hydro || 0},${row.wind || 0},${row.import || 0},${row.export || 0},${row.netExport || 0}\n`;
    });
    downloadFile(csv, 'ssb_kraftbalanse_maanedlig.csv', 'text/csv');
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-md animate-fade-in">
      <div className="glass-card w-full max-w-lg p-6 rounded-2xl border border-slate-800 bg-slate-900 shadow-2xl relative">
        
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800"
        >
          <X className="w-5 h-5" />
        </button>

        <h3 className="text-xl font-bold text-white flex items-center gap-2 mb-2">
          <Download className="w-5 h-5 text-cyan-400" />
          Eksporter Kraftdata
        </h3>
        <p className="text-xs text-slate-400 mb-6">
          Last ned gjeldende spotpriser og SSB-kraftbalansestatistikk til bruk i Excel, Python eller analyse.
        </p>

        <div className="space-y-3">
          
          <button
            onClick={handleExportJson}
            className="w-full p-4 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-800 text-left flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <Code className="w-6 h-6 text-cyan-400" />
              <div>
                <div className="text-sm font-bold text-white group-hover:text-cyan-400">Fullstendig JSON Pakke</div>
                <div className="text-xs text-slate-400">Inneholder alle priser, historikk og flytmodeller</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-cyan-400" />
          </button>

          <button
            onClick={handleExportCsvPrices}
            className="w-full p-4 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-800 text-left flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-emerald-400" />
              <div>
                <div className="text-sm font-bold text-white group-hover:text-emerald-400">Spotpriser NO1–NO5 (CSV)</div>
                <div className="text-xs text-slate-400">Time-for-time spotpriser for i dag</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-emerald-400" />
          </button>

          <button
            onClick={handleExportCsvSsb}
            className="w-full p-4 rounded-xl border border-slate-800 bg-slate-950/80 hover:bg-slate-800 text-left flex items-center justify-between group transition-all"
          >
            <div className="flex items-center gap-3">
              <FileText className="w-6 h-6 text-blue-400" />
              <div>
                <div className="text-sm font-bold text-white group-hover:text-blue-400">SSB Månedskraftbalanse (CSV)</div>
                <div className="text-xs text-slate-400">Historisk månedlig import, eksport & produksjon</div>
              </div>
            </div>
            <Download className="w-4 h-4 text-slate-500 group-hover:text-blue-400" />
          </button>

        </div>

        <div className="mt-6 pt-4 border-t border-slate-800/80 flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold"
          >
            Lukk
          </button>
        </div>

      </div>
    </div>
  );
}
