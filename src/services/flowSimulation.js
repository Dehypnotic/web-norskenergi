// Real-time inter-zone and international energy flow model & simulation service
// Simulates / calculates physical power exchange (MW) between Norwegian bidding zones and foreign interconnectors.

export const CONNECTIONS = [
  // Inter-zone connections (internal Norway grid)
  { id: 'NO1-NO2', source: 'NO1', target: 'NO2', capacityMW: 2200, label: 'Østlandet ↔ Sørlandet' },
  { id: 'NO1-NO3', source: 'NO1', target: 'NO3', capacityMW: 1200, label: 'Østlandet ↔ Midt-Norge' },
  { id: 'NO1-NO5', source: 'NO1', target: 'NO5', capacityMW: 1500, label: 'Østlandet ↔ Vestlandet' },
  { id: 'NO1-SE3', source: 'NO1', target: 'SE3', capacityMW: 2150, label: 'Østlandet ↔ Sverige (SE3)' },

  { id: 'NO2-NO5', source: 'NO2', target: 'NO5', capacityMW: 800, label: 'Sørlandet ↔ Vestlandet' },
  { id: 'NO2-DK1', source: 'NO2', target: 'DK1', capacityMW: 1700, label: 'Skagerrak (NO2 ↔ DK)' },
  { id: 'NO2-DE', source: 'NO2', target: 'DE', capacityMW: 1400, label: 'NordLink (NO2 ↔ Tyskland)' },
  { id: 'NO2-NL', source: 'NO2', target: 'NL', capacityMW: 700, label: 'NorNed (NO2 ↔ Nederland)' },
  { id: 'NO2-UK', source: 'NO2', target: 'UK', capacityMW: 1400, label: 'North Sea Link (NO2 ↔ UK)' },

  { id: 'NO3-NO4', source: 'NO3', target: 'NO4', capacityMW: 1200, label: 'Midt-Norge ↔ Nord-Norge' },
  { id: 'NO3-NO5', source: 'NO3', target: 'NO5', capacityMW: 500, label: 'Midt-Norge ↔ Vestlandet' },
  { id: 'NO3-SE2', source: 'NO3', target: 'SE2', capacityMW: 1000, label: 'Nea ↔ Järpströmmen (NO3 ↔ SE2)' },

  { id: 'NO4-SE1', source: 'NO4', target: 'SE1', capacityMW: 700, label: 'Ofoten ↔ Ritsem (NO4 ↔ SE1)' },
  { id: 'NO4-FI', source: 'NO4', target: 'FI', capacityMW: 100, label: 'Pasvik (NO4 ↔ Finland)' },
];

export const FOREIGN_COUNTRIES = [
  { id: 'SE3', name: 'Sverige (SE3)', x: 140, y: 135, flag: '🇸🇪', priceNok: 0.78 },
  { id: 'SE2', name: 'Sverige (SE2)', x: 145, y: 90, flag: '🇸🇪', priceNok: 0.48 },
  { id: 'SE1', name: 'Sverige (SE1)', x: 155, y: 48, flag: '🇸🇪', priceNok: 0.40 },
  { id: 'FI', name: 'Finland', x: 160, y: 20, flag: '🇫🇮', priceNok: 0.52 },
  { id: 'DK1', name: 'Danmark (DK1)', x: 55, y: 196, flag: '🇩🇰', priceNok: 1.15 },
  { id: 'DE', name: 'Tyskland (DE)', x: 90, y: 196, flag: '🇩🇪', priceNok: 1.35 },
  { id: 'NL', name: 'Nederland (NL)', x: 22, y: 192, flag: '🇳🇱', priceNok: 1.25 },
  { id: 'UK', name: 'Storbritannia (UK)', x: 12, y: 145, flag: '🇬🇧', priceNok: 1.45 },
];

/**
 * Calculates live estimated energy flow (MW) based on spot price differences and time of day
 */
export function calculateLiveFlows(zonePrices = {}) {
  const getPrice = (zoneId) => {
    if (zonePrices[zoneId]?.current !== undefined) {
      return zonePrices[zoneId].current;
    }
    const defaultPrices = { NO1: 0.85, NO2: 0.92, NO3: 0.45, NO4: 0.38, NO5: 0.82 };
    return defaultPrices[zoneId] || 0.70;
  };

  const foreignPrices = {};
  FOREIGN_COUNTRIES.forEach(fc => {
    foreignPrices[fc.id] = fc.priceNok;
  });

  const hour = new Date().getHours();
  // Peak demand multiplier
  const demandFactor = Math.sin((hour - 6) * Math.PI / 12) * 0.15 + 0.90;

  return CONNECTIONS.map(conn => {
    const pSource = zonePrices[conn.source] ? getPrice(conn.source) : (foreignPrices[conn.source] || 0.80);
    const pTarget = zonePrices[conn.target] ? getPrice(conn.target) : (foreignPrices[conn.target] || 0.80);

    // Power flows from lower price region to higher price region
    const priceDelta = pTarget - pSource;
    
    // Utilization percentage (0% to 100%) based on price delta
    let rawUtil = Math.min(1.0, Math.abs(priceDelta) / 0.30);
    if (rawUtil < 0.15) rawUtil = 0.15 + (Math.sin(conn.capacityMW) * 0.05);

    let flowMW = Math.min(conn.capacityMW, Math.round(conn.capacityMW * rawUtil * demandFactor));
    let utilizationPercent = Math.min(100, Math.round((flowMW / conn.capacityMW) * 100));

    let fromZone = conn.source;
    let toZone = conn.target;

    // If source price > target price, flow reverses
    if (priceDelta < 0) {
      fromZone = conn.target;
      toZone = conn.source;
    }

    const isExportAbroad = (conn.target !== 'NO1' && conn.target !== 'NO2' && conn.target !== 'NO3' && conn.target !== 'NO4' && conn.target !== 'NO5');

    return {
      ...conn,
      fromZone,
      toZone,
      flowMW,
      utilizationPercent,
      isExportAbroad,
      status: utilizationPercent > 85 ? 'HIGH_LOAD' : utilizationPercent > 40 ? 'NORMAL' : 'LOW_LOAD'
    };
  });
}
