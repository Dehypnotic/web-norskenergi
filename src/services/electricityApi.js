// Service for fetching live electricity prices for Norwegian bidding zones NO1 - NO5
// Source API: https://www.hvakosterstrommen.no/api/v1/prices/[YEAR]/[MM]-[DD]_[ZONE].json

export const ZONES = [
  { id: 'NO1', name: 'NO1 - Østlandet', city: 'Oslo / Østlandet', color: '#3b82f6', bg: 'rgba(59, 130, 246, 0.15)' },
  { id: 'NO2', name: 'NO2 - Sørlandet', city: 'Kristiansand / Sørlandet', color: '#10b981', bg: 'rgba(16, 185, 129, 0.15)' },
  { id: 'NO3', name: 'NO3 - Midt-Norge', city: 'Trondheim / Midt-Norge', color: '#f59e0b', bg: 'rgba(245, 158, 11, 0.15)' },
  { id: 'NO4', name: 'NO4 - Nord-Norge', city: 'Tromsø / Nord-Norge', color: '#8b5cf6', bg: 'rgba(139, 92, 246, 0.15)' },
  { id: 'NO5', name: 'NO5 - Vestlandet', city: 'Bergen / Vestlandet', color: '#ec4899', bg: 'rgba(236, 72, 153, 0.15)' },
];

/**
 * Calculates government subsidy (strømstøtte) for household consumption.
 * Threshold is 73 øre/kWh excl. VAT (91.25 øre/kWh incl. VAT in regions with VAT).
 * Subsidy covers 90% of price exceeding threshold.
 */
export function calculateStromstotte(nokPerKwh, includeVat = true) {
  const thresholdExVat = 0.73; // 73 øre/kWh
  const threshold = includeVat ? thresholdExVat * 1.25 : thresholdExVat;
  const price = includeVat ? nokPerKwh * 1.25 : nokPerKwh;

  if (price > threshold) {
    const subsidy = (price - threshold) * 0.90;
    return {
      subsidyPerKwh: subsidy,
      effectivePricePerKwh: price - subsidy,
      hasSubsidy: true
    };
  }

  return {
    subsidyPerKwh: 0,
    effectivePricePerKwh: price,
    hasSubsidy: false
  };
}

/**
 * Returns future-proof Norgespris (base rate 40 øre/kWh excl. VAT, easily updated annually)
 * Returns price in øre/kWh
 */
export function getNorgespris(date = new Date(), includeVat = true, isNo4 = false) {
  const year = date ? new Date(date).getFullYear() : new Date().getFullYear();
  // Yearly Norgespris base rates excl. VAT (øre/kWh)
  const yearlyRatesExVat = {
    2024: 40,
    2025: 40,
    2026: 40,
    2027: 40,
    2028: 40,
  };

  const baseExVat = yearlyRatesExVat[year] || 40;
  const vatFactor = (includeVat && !isNo4) ? 1.25 : 1.0;
  
  return baseExVat * vatFactor;
}

/**
 * Formats a date object to YYYY/MM-DD format needed by API
 */
function formatDateForApi(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return { year, monthDay: `${month}-${day}`, fullDateStr: `${year}-${month}-${day}` };
}

/**
 * Generates fallback mock hourly prices if API call is blocked (e.g. offline or CORS)
 */
function generateFallbackPrices(zoneId, dateStr) {
  const basePrices = {
    NO1: 0.85,
    NO2: 0.92,
    NO3: 0.45,
    NO4: 0.38,
    NO5: 0.82
  };
  const base = basePrices[zoneId] || 0.75;
  const hours = [];

  for (let i = 0; i < 24; i++) {
    // Peak hours around 08:00 and 19:00
    const morningPeak = Math.exp(-Math.pow(i - 8, 2) / 6) * 0.45;
    const eveningPeak = Math.exp(-Math.pow(i - 19, 2) / 8) * 0.55;
    const nightDrop = i < 6 ? -0.20 : 0;
    const randomVariation = (Math.sin(i * 0.8 + zoneId.charCodeAt(2)) * 0.08);

    const nok = Math.max(0.12, base + morningPeak + eveningPeak + nightDrop + randomVariation);
    const eur = nok / 11.2;

    const startHour = String(i).padStart(2, '0');
    const endHour = String((i + 1) % 24).padStart(2, '0');

    hours.push({
      NOK_per_kWh: parseFloat(nok.toFixed(4)),
      EUR_per_kWh: parseFloat(eur.toFixed(4)),
      EXR: 11.2,
      time_start: `${dateStr}T${startHour}:00:00+02:00`,
      time_end: `${dateStr}T${endHour}:00:00+02:00`,
      isMock: true
    });
  }

  return hours;
}

/**
 * Fetch spot prices for a specific zone and date
 */
export async function fetchZonePrices(zoneId = 'NO1', date = new Date()) {
  const { year, monthDay, fullDateStr } = formatDateForApi(date);
  const url = `https://www.hvakosterstrommen.no/api/v1/prices/${year}/${monthDay}_${zoneId}.json`;

  try {
    const response = await fetch(url);
    if (!response.ok) {
      throw new Error(`HTTP ${response.status} when fetching prices for ${zoneId}`);
    }
    const data = await response.json();
    return data;
  } catch (err) {
    console.warn(`Failed to fetch live prices for ${zoneId}, using fallback model:`, err.message);
    return generateFallbackPrices(zoneId, fullDateStr);
  }
}

/**
 * Fetch prices for ALL 5 Norwegian zones simultaneously
 */
export async function fetchAllZonePrices(date = new Date()) {
  const results = {};
  const promises = ZONES.map(async (zone) => {
    const prices = await fetchZonePrices(zone.id, date);
    results[zone.id] = prices;
  });

  await Promise.all(promises);
  return results;
}

/**
 * Compute statistical metrics for a zone's daily prices
 */
export function computeZoneStats(hourlyPrices = []) {
  if (!hourlyPrices || hourlyPrices.length === 0) {
    return { current: 0, min: 0, max: 0, avg: 0, currentHour: 0 };
  }

  const now = new Date();
  const currentHour = now.getHours();
  
  const nokValues = hourlyPrices.map(item => item.NOK_per_kWh);
  const min = Math.min(...nokValues);
  const max = Math.max(...nokValues);
  const avg = nokValues.reduce((a, b) => a + b, 0) / nokValues.length;

  const currentItem = hourlyPrices[currentHour] || hourlyPrices[hourlyPrices.length - 1];
  const current = currentItem ? currentItem.NOK_per_kWh : avg;

  return {
    current,
    min,
    max,
    avg,
    currentHour,
    hourlyPrices,
    isMock: hourlyPrices[0]?.isMock || false
  };
}
