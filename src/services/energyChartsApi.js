/**
 * Service for fetching European power generation from Fraunhofer ISE Energy-Charts API
 * Endpoint: https://api.energy-charts.info/public_power
 * License: CC BY 4.0 (Energy-Charts.info)
 */

const BASE_URL = 'https://api.energy-charts.info/public_power';

export const EUROPEAN_COUNTRIES = [
  { code: 'de', name: 'Tyskland', flag: '🇩🇪' },
  { code: 'no', name: 'Norge', flag: '🇳🇴' },
  { code: 'se', name: 'Sverige', flag: '🇸🇪' },
  { code: 'dk', name: 'Danmark', flag: '🇩🇰' },
  { code: 'fi', name: 'Finland', flag: '🇫🇮' },
  { code: 'nl', name: 'Nederland', flag: '🇳🇱' },
  { code: 'uk', name: 'Storbritannia', flag: '🇬🇧' },
  { code: 'fr', name: 'Frankrike', flag: '🇫🇷' },
  { code: 'es', name: 'Spania', flag: '🇪🇸' },
  { code: 'it', name: 'Italia', flag: '🇮🇹' },
  { code: 'at', name: 'Østerrike', flag: '🇦🇹' },
  { code: 'ch', name: 'Sveits', flag: '🇨🇭' },
  { code: 'pl', name: 'Polen', flag: '🇵🇱' },
  { code: 'be', name: 'Belgia', flag: '🇧🇪' },
  { code: 'cz', name: 'Tsjekkia', flag: '🇨🇿' },
];

export const SOURCE_TRANSLATIONS = {
  'Solar': 'Solkraft',
  'Wind onshore': 'Vindkraft (Land)',
  'Wind offshore': 'Vindkraft (Hav)',
  'Hydro Run-of-River': 'Vannkraft (Elv)',
  'Hydro water reservoir': 'Vannkraft (Magasin)',
  'Hydro pumped storage': 'Pumpekraft',
  'Hydro pumped storage consumption': 'Pumpekraft (Forbruk)',
  'Biomass': 'Biomasse',
  'Geothermal': 'Geotermisk',
  'Fossil gas': 'Fossil gass',
  'Fossil hard coal': 'Steinkull',
  'Fossil brown coal / lignite': 'Brunkull',
  'Fossil oil': 'Fossil olje',
  'Fossil coal-derived gas': 'Kullgass',
  'Waste renewable': 'Avfall (Fornybart)',
  'Waste non-renewable': 'Avfall (Fossil)',
  'Waste': 'Avfall',
  'Nuclear': 'Atomkraft',
  'Others': 'Andre kilder',
  'Other renewables': 'Andre fornybare',
  'Cross border electricity trading': 'Nettutveksling'
};

export function translateSource(name) {
  return SOURCE_TRANSLATIONS[name] || name;
}

export const SOURCE_COLORS = {
  'Solar': '#f59e0b',
  'Wind onshore': '#84cc16',
  'Wind offshore': '#15803d',
  'Hydro Run-of-River': '#2563eb',
  'Hydro water reservoir': '#0284c7',
  'Hydro pumped storage': '#06b6d4',
  'Biomass': '#16a34a',
  'Fossil gas': '#f97316',
  'Fossil hard coal': '#334155',
  'Fossil brown coal / lignite': '#78350f',
  'Fossil oil': '#451a03',
  'Fossil coal-derived gas': '#d97706',
  'Waste renewable': '#a16207',
  'Waste non-renewable': '#713f12',
  'Waste': '#713f12',
  'Nuclear': '#e11d48',
  'Geothermal': '#f43f5e',
  'Others': '#64748b',
  'Other renewables': '#10b981',
  'Cross border electricity trading': '#94a3b8',
  'Fossil': '#64748b',
  'Renewable': '#eab308'
};

const RENEWABLE_TYPES = new Set([
  'Solar',
  'Wind onshore',
  'Wind offshore',
  'Hydro Run-of-River',
  'Hydro water reservoir',
  'Hydro pumped storage',
  'Biomass',
  'Waste renewable',
  'Geothermal',
  'Other renewables'
]);

const FOSSIL_TYPES = new Set([
  'Fossil gas',
  'Fossil hard coal',
  'Fossil brown coal / lignite',
  'Fossil oil',
  'Fossil coal-derived gas',
  'Waste non-renewable',
  'Waste',
  'Nuclear'
]);

const cache = new Map();

/**
 * Formats YYYY-MM-DD string
 */
export function formatDateStr(year, month, day) {
  const m = String(month).padStart(2, '0');
  const d = String(day).padStart(2, '0');
  return `${year}-${m}-${d}`;
}

/**
 * Gets start and end dates for week number
 */
export function getDatesForISOWeek(year, week) {
  const simple = new Date(year, 0, 1 + (week - 1) * 7);
  const dow = simple.getDay();
  const ISOweekStart = simple;
  if (dow <= 4)
    ISOweekStart.setDate(simple.getDate() - simple.getDay() + 1);
  else
    ISOweekStart.setDate(simple.getDate() + 8 - simple.getDay());
  
  const ISOweekEnd = new Date(ISOweekStart);
  ISOweekEnd.setDate(ISOweekStart.getDate() + 6);

  return {
    startStr: formatDateStr(ISOweekStart.getFullYear(), ISOweekStart.getMonth() + 1, ISOweekStart.getDate()),
    endStr: formatDateStr(ISOweekEnd.getFullYear(), ISOweekEnd.getMonth() + 1, ISOweekEnd.getDate())
  };
}

/**
 * Helper to fetch with strict timeout and JSON schema validation
 */
async function fetchWithTimeout(url, isAllOriginsGet = false, timeoutMs = 5000) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, { signal: controller.signal });
    clearTimeout(timer);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const raw = await res.json();

    let data = raw;
    if (isAllOriginsGet && raw.contents) {
      data = typeof raw.contents === 'string' ? JSON.parse(raw.contents) : raw.contents;
    }

    if (!data || data.error || !data.production_types || !data.unix_seconds) {
      throw new Error(data?.error || 'Ugyldig Energy-Charts datastruktur');
    }

    return data;
  } catch (err) {
    clearTimeout(timer);
    throw err;
  }
}

/**
 * Fetch raw JSON chunk from Energy-Charts with CORS proxy fallbacks for static hosts
 */
async function fetchRawDataChunk(country, startStr, endStr) {
  const devProxyUrl = `/api/energy-charts/public_power?country=${country}&start=${startStr}&end=${endStr}`;
  const directUrl = `${BASE_URL}?country=${country}&start=${startStr}&end=${endStr}`;

  // 1. Local Vite dev server proxy (Fastest on local machine, ~150ms)
  try {
    return await fetchWithTimeout(devProxyUrl, false, 1200);
  } catch (e) {}

  // 2. Direct fetch (In case browser CORS policy permits or extension is active)
  try {
    return await fetchWithTimeout(directUrl, false, 1200);
  } catch (e) {}

  // 3. User Dedicated Cloudflare Worker CORS Proxy (Ultra-fast & dedicated for GitHub Pages, ~300ms!)
  try {
    const cfWorkerUrl = `https://energy-charts-proxy.jegrmeg.workers.dev/?url=${encodeURIComponent(directUrl)}`;
    return await fetchWithTimeout(cfWorkerUrl, false, 4000);
  } catch (e) {}

  // 4. AllOrigins GET wrapper endpoint (Fallback proxy)
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(directUrl)}`;
    return await fetchWithTimeout(proxyUrl, true, 5000);
  } catch (e) {}

  throw new Error(`Kunne ikke koble til live API for ${country}`);
}

/**
 * Merges two JSON data chunks from Energy-Charts
 */
function mergeDataChunks(p1, p2) {
  if (!p1 || !p1.unix_seconds) return p2;
  if (!p2 || !p2.unix_seconds) return p1;

  const mergedSeconds = [...p1.unix_seconds, ...p2.unix_seconds];
  const typeMap = new Map();

  p1.production_types.forEach(pt => {
    typeMap.set(pt.name, [...pt.data]);
  });

  p2.production_types.forEach(pt => {
    if (typeMap.has(pt.name)) {
      typeMap.set(pt.name, [...typeMap.get(pt.name), ...pt.data]);
    } else {
      // Pad with nulls for first half if missing
      const pad = new Array(p1.unix_seconds.length).fill(null);
      typeMap.set(pt.name, [...pad, ...pt.data]);
    }
  });

  const mergedTypes = Array.from(typeMap.entries()).map(([name, data]) => ({
    name,
    data
  }));

  return {
    unix_seconds: mergedSeconds,
    production_types: mergedTypes
  };
}

/**
 * Fetch Energy-Charts data with caching and smart chunking
 */
export async function fetchEnergyChartsPower(country = 'de', startStr, endStr, periodType = 'DAY') {
  // Cap endStr for current year to current date to avoid downloading future empty dates
  const currentYr = new Date().getFullYear();
  const yrFromStart = parseInt(startStr.slice(0, 4), 10);
  
  let effEndStr = endStr;
  if (yrFromStart === currentYr && periodType === 'YEAR') {
    const today = new Date();
    effEndStr = formatDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());
  }

  const cacheKey = `ec_v8_${country}_${startStr}_${effEndStr}_${periodType}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const rawLocal = localStorage.getItem(cacheKey);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      cache.set(cacheKey, parsed);
      return parsed;
    }
  } catch (e) {}

  try {
    let data;

    // For past full years, fetch in 2 semi-annual chunks to keep payload under 1MB CORS proxy limits
    if (periodType === 'YEAR' && yrFromStart < currentYr) {
      const midStr1 = `${yrFromStart}-06-30`;
      const midStr2 = `${yrFromStart}-07-01`;

      const chunk1 = await fetchRawDataChunk(country, `${yrFromStart}-01-01`, midStr1);
      const chunk2 = await fetchRawDataChunk(country, midStr2, `${yrFromStart}-12-31`);
      data = mergeDataChunks(chunk1, chunk2);
    } else {
      data = await fetchRawDataChunk(country, startStr, effEndStr);
    }

    const processed = processEnergyChartsData(data, periodType);
    processed.isFallback = false;

    cache.set(cacheKey, processed);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(processed));
    } catch (e) {}

    return processed;
  } catch (err) {
    console.warn('Could not fetch Energy-Charts data, generating fallback dataset:', err);
    const fb = getFallbackEnergyChartsData(country, startStr, effEndStr, periodType);
    fb.isFallback = true;
    return fb;
  }
}

/**
 * Process raw JSON from Energy-Charts into structured GWh totals and time series
 */
export function processEnergyChartsData(rawData, periodType = 'DAY') {
  if (!rawData || !rawData.production_types || !rawData.unix_seconds) {
    const fb = getFallbackEnergyChartsData('de', '2026-08-01', '2026-08-02', periodType);
    fb.isFallback = true;
    return fb;
  }

  const timeStamps = rawData.unix_seconds;
  const types = rawData.production_types;
  const numSteps = timeStamps.length;

  // Calculate step duration in hours (e.g. 15 mins = 0.25h, 1h = 1.0h)
  let stepHours = 0.25; // default 15 min
  if (numSteps > 1) {
    const diffSec = timeStamps[1] - timeStamps[0];
    stepHours = diffSec / 3600;
  }

  const sourceTotals = {};
  let totalGenerationGWh = 0;
  let totalRenewableGWh = 0;
  let totalFossilGWh = 0;
  let totalImportExportGWh = 0;

  // Process raw points
  const rawPoints = timeStamps.map((ts, tIdx) => {
    const ptDate = new Date(ts * 1000);
    const point = {
      timestamp: ts,
      dateObj: ptDate,
      sources: {}
    };

    types.forEach(pType => {
      const name = pType.name;
      const valMW = pType.data[tIdx];

      if (valMW !== null && valMW !== undefined && name !== 'Load' && name !== 'Residual load' && name !== 'Renewable share of load' && name !== 'Renewable share of generation') {
        const valGWh = (valMW * stepHours) / 1000;
        point.sources[name] = Math.max(0, valGWh);

        if (!sourceTotals[name]) sourceTotals[name] = 0;
        
        // Sum positive generation
        if (name === 'Cross border electricity trading') {
          totalImportExportGWh += valGWh;
        } else if (name !== 'Hydro pumped storage consumption') {
          if (valGWh > 0) {
            sourceTotals[name] += valGWh;
            totalGenerationGWh += valGWh;

            if (RENEWABLE_TYPES.has(name)) {
              totalRenewableGWh += valGWh;
            } else if (FOSSIL_TYPES.has(name)) {
              totalFossilGWh += valGWh;
            }
          }
        }
      }
    });

    return point;
  });

  // Aggregate time series to max 10-12 bars depending on periodType
  const timeSeries = aggregateTimeSeries(rawPoints, periodType);

  // Build sorted array of detailed source segments
  const detailedSegments = Object.keys(sourceTotals)
    .filter(name => sourceTotals[name] > 0.01)
    .map(name => ({
      name,
      displayName: translateSource(name),
      gwh: Math.round(sourceTotals[name] * 10) / 10,
      pct: totalGenerationGWh > 0 ? Math.round((sourceTotals[name] / totalGenerationGWh) * 1000) / 10 : 0,
      color: SOURCE_COLORS[name] || '#94a3b8',
      isRenewable: RENEWABLE_TYPES.has(name)
    }))
    .sort((a, b) => b.gwh - a.gwh);

  const totalNonRenewableGWh = Math.max(0, totalGenerationGWh - totalRenewableGWh);

  // Build aggregated segments (Renewable vs Fossil/Non-Renewable)
  const aggregatedSegments = [
    {
      name: 'Renewable',
      label: 'Fornybar kraft',
      gwh: Math.round(totalRenewableGWh * 10) / 10,
      pct: totalGenerationGWh > 0 ? Math.round((totalRenewableGWh / totalGenerationGWh) * 1000) / 10 : 0,
      color: '#eab308' // Yellow
    },
    {
      name: 'Fossil',
      label: 'Fossil / Ikke-fornybar',
      gwh: Math.round(totalNonRenewableGWh * 10) / 10,
      pct: totalGenerationGWh > 0 ? Math.round((totalNonRenewableGWh / totalGenerationGWh) * 1000) / 10 : 0,
      color: '#64748b' // Slate Grey
    }
  ];

  return {
    isFallback: false,
    totalGenerationGWh: Math.round(totalGenerationGWh * 10) / 10,
    grossTotalGWh: Math.round((totalGenerationGWh + Math.max(0, totalImportExportGWh)) * 10) / 10,
    totalRenewableGWh: Math.round(totalRenewableGWh * 10) / 10,
    totalFossilGWh: Math.round(totalNonRenewableGWh * 10) / 10,
    renewablePct: totalGenerationGWh > 0 ? Math.round((totalRenewableGWh / totalGenerationGWh) * 1000) / 10 : 0,
    detailedSegments,
    aggregatedSegments,
    timeSeries
  };
}

/**
 * Aggregates raw 15-minute / hourly points into max 10-12 clean bars based on periodType
 */
function aggregateTimeSeries(rawPoints, periodType) {
  if (!rawPoints || rawPoints.length === 0) return [];

  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
  const DAY_NAMES = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];

  if (periodType === 'YEAR') {
    // Group by Month (12 bars)
    const monthBuckets = Array.from({ length: 12 }, (_, i) => ({
      dateLabel: MONTH_NAMES[i],
      sources: {}
    }));

    rawPoints.forEach(pt => {
      const mIdx = pt.dateObj.getMonth();
      const bucket = monthBuckets[mIdx];
      Object.keys(pt.sources).forEach(sName => {
        if (!bucket.sources[sName]) bucket.sources[sName] = 0;
        bucket.sources[sName] += pt.sources[sName];
      });
    });

    return monthBuckets.filter(b => Object.keys(b.sources).length > 0);
  }

  if (periodType === 'MONTH') {
    // Group by 10 3-day buckets (1-3, 4-6, 7-9, ..., 28-31)
    const dayBuckets = Array.from({ length: 10 }, (_, i) => {
      const startD = i * 3 + 1;
      const endD = i === 9 ? 31 : (i + 1) * 3;
      return {
        dateLabel: `${startD}.-${endD}.`,
        sources: {}
      };
    });

    rawPoints.forEach(pt => {
      const day = pt.dateObj.getDate();
      const bIdx = Math.min(9, Math.floor((day - 1) / 3));
      const bucket = dayBuckets[bIdx];
      Object.keys(pt.sources).forEach(sName => {
        if (!bucket.sources[sName]) bucket.sources[sName] = 0;
        bucket.sources[sName] += pt.sources[sName];
      });
    });

    return dayBuckets.filter(b => Object.keys(b.sources).length > 0);
  }

  if (periodType === 'WEEK') {
    // Group by Day of Week (7 bars)
    const weekBuckets = Array.from({ length: 7 }, (_, i) => ({
      dateLabel: DAY_NAMES[(i + 1) % 7], // Mon..Sun
      sources: {}
    }));

    rawPoints.forEach(pt => {
      let dow = pt.dateObj.getDay() - 1;
      if (dow < 0) dow = 6; // Sunday = 6
      const bucket = weekBuckets[dow];
      Object.keys(pt.sources).forEach(sName => {
        if (!bucket.sources[sName]) bucket.sources[sName] = 0;
        bucket.sources[sName] += pt.sources[sName];
      });
    });

    return weekBuckets.filter(b => Object.keys(b.sources).length > 0);
  }

  // DAY: Group into 12 2-hour buckets (00:00, 02:00, ..., 22:00)
  const hourBuckets = Array.from({ length: 12 }, (_, i) => ({
    dateLabel: `${String(i * 2).padStart(2, '0')}:00`,
    sources: {}
  }));

  rawPoints.forEach(pt => {
    const hr = pt.dateObj.getHours();
    const bIdx = Math.min(11, Math.floor(hr / 2));
    const bucket = hourBuckets[bIdx];
    Object.keys(pt.sources).forEach(sName => {
      if (!bucket.sources[sName]) bucket.sources[sName] = 0;
      bucket.sources[sName] += pt.sources[sName];
    });
  });

  return hourBuckets;
}

/**
 * Fallback dataset per country if Energy-Charts API fails or is blocked by an adblocker
 */
function getFallbackEnergyChartsData(country, startStr, endStr) {
  const countryFallbackMap = {
    de: {
      totalGen: 300.5,
      grossTotal: 321.2,
      segments: [
        { name: 'Wind onshore', gwh: 88.8, isRenewable: true },
        { name: 'Fossil brown coal / lignite', gwh: 60.4, isRenewable: false },
        { name: 'Fossil gas', gwh: 37.3, isRenewable: false },
        { name: 'Wind offshore', gwh: 34.0, isRenewable: true },
        { name: 'Biomass', gwh: 26.2, isRenewable: true },
        { name: 'Fossil hard coal', gwh: 24.2, isRenewable: false },
        { name: 'Hydro Run-of-River', gwh: 9.6, isRenewable: true },
        { name: 'Waste non-renewable', gwh: 4.7, isRenewable: false },
        { name: 'Waste renewable', gwh: 4.2, isRenewable: true },
        { name: 'Fossil coal-derived gas', gwh: 3.8, isRenewable: false },
        { name: 'Solar', gwh: 2.9, isRenewable: true },
        { name: 'Fossil oil', gwh: 2.9, isRenewable: false }
      ]
    },
    no: {
      totalGen: 140.3,
      grossTotal: 142.5,
      segments: [
        { name: 'Hydro water reservoir', gwh: 82.0, isRenewable: true },
        { name: 'Hydro Run-of-River', gwh: 35.2, isRenewable: true },
        { name: 'Wind onshore', gwh: 18.4, isRenewable: true },
        { name: 'Biomass', gwh: 2.1, isRenewable: true },
        { name: 'Solar', gwh: 1.5, isRenewable: true },
        { name: 'Fossil gas', gwh: 1.1, isRenewable: false }
      ]
    },
    se: {
      totalGen: 160.0,
      grossTotal: 165.0,
      segments: [
        { name: 'Hydro water reservoir', gwh: 72.0, isRenewable: true },
        { name: 'Nuclear', gwh: 56.0, isRenewable: false },
        { name: 'Wind onshore', gwh: 24.0, isRenewable: true },
        { name: 'Biomass', gwh: 5.0, isRenewable: true },
        { name: 'Solar', gwh: 3.0, isRenewable: true }
      ]
    },
    dk: {
      totalGen: 35.0,
      grossTotal: 38.0,
      segments: [
        { name: 'Wind onshore', gwh: 19.2, isRenewable: true },
        { name: 'Wind offshore', gwh: 8.5, isRenewable: true },
        { name: 'Solar', gwh: 4.2, isRenewable: true },
        { name: 'Biomass', gwh: 2.1, isRenewable: true },
        { name: 'Fossil gas', gwh: 1.0, isRenewable: false }
      ]
    },
    fi: {
      totalGen: 75.0,
      grossTotal: 79.0,
      segments: [
        { name: 'Nuclear', gwh: 26.2, isRenewable: false },
        { name: 'Hydro Run-of-River', gwh: 18.7, isRenewable: true },
        { name: 'Wind onshore', gwh: 15.0, isRenewable: true },
        { name: 'Biomass', gwh: 9.1, isRenewable: true },
        { name: 'Fossil gas', gwh: 6.0, isRenewable: false }
      ]
    },
    nl: {
      totalGen: 115.0,
      grossTotal: 122.0,
      segments: [
        { name: 'Wind onshore', gwh: 38.0, isRenewable: true },
        { name: 'Fossil gas', gwh: 36.0, isRenewable: false },
        { name: 'Solar', gwh: 22.0, isRenewable: true },
        { name: 'Wind offshore', gwh: 12.0, isRenewable: true },
        { name: 'Biomass', gwh: 7.0, isRenewable: true }
      ]
    },
    uk: {
      totalGen: 280.0,
      grossTotal: 295.0,
      segments: [
        { name: 'Fossil gas', gwh: 98.0, isRenewable: false },
        { name: 'Wind offshore', gwh: 52.0, isRenewable: true },
        { name: 'Wind onshore', gwh: 42.0, isRenewable: true },
        { name: 'Nuclear', gwh: 42.0, isRenewable: false },
        { name: 'Solar', gwh: 26.0, isRenewable: true },
        { name: 'Biomass', gwh: 20.0, isRenewable: true }
      ]
    },
    fr: {
      totalGen: 480.0,
      grossTotal: 510.0,
      segments: [
        { name: 'Nuclear', gwh: 326.0, isRenewable: false },
        { name: 'Hydro water reservoir', gwh: 62.0, isRenewable: true },
        { name: 'Wind onshore', gwh: 48.0, isRenewable: true },
        { name: 'Solar', gwh: 24.0, isRenewable: true },
        { name: 'Fossil gas', gwh: 20.0, isRenewable: false }
      ]
    },
    es: {
      totalGen: 260.0,
      grossTotal: 275.0,
      segments: [
        { name: 'Solar', gwh: 91.0, isRenewable: true },
        { name: 'Wind onshore', gwh: 65.0, isRenewable: true },
        { name: 'Nuclear', gwh: 46.8, isRenewable: false },
        { name: 'Hydro water reservoir', gwh: 31.2, isRenewable: true },
        { name: 'Fossil gas', gwh: 20.8, isRenewable: false },
        { name: 'Biomass', gwh: 5.2, isRenewable: true }
      ]
    },
    it: {
      totalGen: 270.0,
      grossTotal: 285.0,
      segments: [
        { name: 'Fossil gas', gwh: 129.6, isRenewable: false },
        { name: 'Solar', gwh: 59.4, isRenewable: true },
        { name: 'Hydro water reservoir', gwh: 37.8, isRenewable: true },
        { name: 'Wind onshore', gwh: 29.7, isRenewable: true },
        { name: 'Geothermal', gwh: 8.1, isRenewable: true },
        { name: 'Biomass', gwh: 5.4, isRenewable: true }
      ]
    },
    at: {
      totalGen: 65.0,
      grossTotal: 69.0,
      segments: [
        { name: 'Hydro Run-of-River', gwh: 42.2, isRenewable: true },
        { name: 'Wind onshore', gwh: 9.1, isRenewable: true },
        { name: 'Solar', gwh: 6.5, isRenewable: true },
        { name: 'Fossil gas', gwh: 3.9, isRenewable: false },
        { name: 'Biomass', gwh: 3.3, isRenewable: true }
      ]
    },
    ch: {
      totalGen: 60.0,
      grossTotal: 63.0,
      segments: [
        { name: 'Hydro water reservoir', gwh: 36.0, isRenewable: true },
        { name: 'Nuclear', gwh: 19.8, isRenewable: false },
        { name: 'Solar', gwh: 2.4, isRenewable: true },
        { name: 'Waste non-renewable', gwh: 1.8, isRenewable: false }
      ]
    },
    pl: {
      totalGen: 150.0,
      grossTotal: 158.0,
      segments: [
        { name: 'Fossil hard coal', gwh: 82.5, isRenewable: false },
        { name: 'Fossil brown coal / lignite', gwh: 30.0, isRenewable: false },
        { name: 'Wind onshore', gwh: 18.0, isRenewable: true },
        { name: 'Solar', gwh: 10.5, isRenewable: true },
        { name: 'Fossil gas', gwh: 6.0, isRenewable: false },
        { name: 'Biomass', gwh: 3.0, isRenewable: true }
      ]
    },
    be: {
      totalGen: 80.0,
      grossTotal: 85.0,
      segments: [
        { name: 'Nuclear', gwh: 32.0, isRenewable: false },
        { name: 'Wind onshore', gwh: 20.0, isRenewable: true },
        { name: 'Solar', gwh: 12.0, isRenewable: true },
        { name: 'Fossil gas', gwh: 12.0, isRenewable: false },
        { name: 'Biomass', gwh: 4.0, isRenewable: true }
      ]
    },
    cz: {
      totalGen: 75.0,
      grossTotal: 79.0,
      segments: [
        { name: 'Nuclear', gwh: 30.0, isRenewable: false },
        { name: 'Fossil brown coal / lignite', gwh: 26.2, isRenewable: false },
        { name: 'Fossil hard coal', gwh: 7.5, isRenewable: false },
        { name: 'Solar', gwh: 4.5, isRenewable: true },
        { name: 'Fossil gas', gwh: 3.8, isRenewable: false },
        { name: 'Hydro Run-of-River', gwh: 3.0, isRenewable: true }
      ]
    }
  };

  const fallback = countryFallbackMap[country] || countryFallbackMap['de'];
  const totalGenerationGWh = fallback.totalGen;
  const grossTotalGWh = fallback.grossTotal;

  const detailedSegments = fallback.segments.map(seg => ({
    name: seg.name,
    displayName: translateSource(seg.name),
    gwh: seg.gwh,
    pct: Math.round((seg.gwh / totalGenerationGWh) * 1000) / 10,
    color: SOURCE_COLORS[seg.name] || '#94a3b8',
    isRenewable: seg.isRenewable
  }));

  const renewableGWh = detailedSegments.filter(s => s.isRenewable).reduce((sum, s) => sum + s.gwh, 0);
  const fossilGWh = detailedSegments.filter(s => !s.isRenewable).reduce((sum, s) => sum + s.gwh, 0);
  const renewablePct = Math.round((renewableGWh / totalGenerationGWh) * 1000) / 10;

  const aggregatedSegments = [
    { name: 'Renewable', label: 'Fornybar kraft', gwh: Math.round(renewableGWh * 10) / 10, pct: renewablePct, color: '#eab308' },
    { name: 'Fossil', label: 'Fossil / Ikke-fornybar', gwh: Math.round(fossilGWh * 10) / 10, pct: Math.round((100 - renewablePct) * 10) / 10, color: '#64748b' }
  ];

  // Generate synthetic time series points for chart
  const timeSeries = [];
  for (let h = 0; h < 24; h++) {
    const ts = Math.floor(new Date(startStr).getTime() / 1000) + h * 3600;
    const sources = {};
    detailedSegments.forEach(seg => {
      sources[seg.name] = (seg.gwh / 24) * (0.8 + Math.sin(h * 0.3) * 0.3);
    });
    timeSeries.push({
      timestamp: ts,
      dateLabel: `${h}:00`,
      sources
    });
  }

  return {
    totalGenerationGWh,
    grossTotalGWh,
    totalRenewableGWh: Math.round(renewableGWh * 10) / 10,
    totalFossilGWh: Math.round(fossilGWh * 10) / 10,
    renewablePct,
    detailedSegments,
    aggregatedSegments,
    timeSeries
  };
}

/**
 * Fetch Cross-Border Electricity Trading (CBET) data for Norway
 */
export async function fetchEnergyChartsCBET(startStr, endStr, periodType = 'DAY') {
  const country = 'no';
  // Cap endStr for current year to current date
  const currentYr = new Date().getFullYear();
  const yrFromStart = parseInt(startStr.slice(0, 4), 10);
  
  let effEndStr = endStr;
  if (yrFromStart === currentYr && periodType === 'YEAR') {
    const today = new Date();
    effEndStr = formatDateStr(today.getFullYear(), today.getMonth() + 1, today.getDate());
  }

  const cacheKey = `ec_cbet_v3_${country}_${startStr}_${effEndStr}_${periodType}`;
  
  if (cache.has(cacheKey)) {
    return cache.get(cacheKey);
  }

  try {
    const rawLocal = localStorage.getItem(cacheKey);
    if (rawLocal) {
      const parsed = JSON.parse(rawLocal);
      cache.set(cacheKey, parsed);
      return parsed;
    }
  } catch (e) {}

  try {
    const directUrl = `https://api.energy-charts.info/v2/cbet?country=${country}&start=${startStr}&end=${effEndStr}`;
    const cfWorkerUrl = `https://energy-charts-proxy.jegrmeg.workers.dev/?url=${encodeURIComponent(directUrl)}`;

    const res = await fetch(cfWorkerUrl);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const rawData = await res.json();

    if (!rawData || !rawData.data || rawData.data.length === 0) {
      throw new Error('Invalid or empty CBET data');
    }

    const processed = processCBETData(rawData, periodType);
    processed.isFallback = false;

    cache.set(cacheKey, processed);
    try {
      localStorage.setItem(cacheKey, JSON.stringify(processed));
    } catch (e) {}

    return processed;
  } catch (err) {
    console.warn('Could not fetch CBET data, generating fallback:', err);
    const fb = getFallbackCBETData(startStr, effEndStr, periodType);
    fb.isFallback = true;
    return fb;
  }
}

function processCBETData(rawData, periodType) {
  const dataPoints = rawData.data || [];
  const numSteps = dataPoints.length;
  let stepHours = 1.0;
  if (numSteps > 1) {
    const t0 = new Date(dataPoints[0].timestamp).getTime();
    const t1 = new Date(dataPoints[1].timestamp).getTime();
    stepHours = Math.abs(t1 - t0) / (3600 * 1000);
  }

  const labelGroups = {};

  dataPoints.forEach(point => {
    const date = new Date(point.timestamp);
    let label = '';
    const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
    if (periodType === 'YEAR') {
      label = MONTH_NAMES[date.getMonth()];
    } else if (periodType === 'MONTH') {
      label = `${date.getDate()}. ${MONTH_NAMES[date.getMonth()]}`;
    } else if (periodType === 'WEEK') {
      const DAY_NAMES = ['Søn', 'Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør'];
      label = DAY_NAMES[date.getDay()];
    } else {
      label = `${String(date.getHours()).padStart(2, '0')}:00`;
    }

    if (!labelGroups[label]) {
      labelGroups[label] = {
        label,
        denmark: 0,
        germany: 0,
        netherlands: 0,
        sweden: 0,
        united_kingdom: 0,
        finland: 0,
        count: 0
      };
    }

    const v = point.values || {};
    labelGroups[label].denmark += (v.denmark || 0) * stepHours;
    labelGroups[label].germany += (v.germany || 0) * stepHours;
    labelGroups[label].netherlands += (v.netherlands || 0) * stepHours;
    labelGroups[label].sweden += (v.sweden || 0) * stepHours;
    labelGroups[label].united_kingdom += (v.united_kingdom || 0) * stepHours;
    labelGroups[label].finland += (v.finland || 0) * stepHours;
    labelGroups[label].count++;
  });

  const timeSeries = Object.values(labelGroups);

  const zoneData = {
    NO1: { id: 'NO1', name: 'NO1 - Østlandet', utlandImport: 0, utlandExport: 0, inlandImport: 0, inlandExport: 0, swedenImport: 0, swedenExport: 0, history: [] },
    NO2: { id: 'NO2', name: 'NO2 - Sørlandet', utlandImport: 0, utlandExport: 0, inlandImport: 0, inlandExport: 0, denmarkImport: 0, denmarkExport: 0, germanyImport: 0, germanyExport: 0, netherlandsImport: 0, netherlandsExport: 0, ukImport: 0, ukExport: 0, history: [] },
    NO3: { id: 'NO3', name: 'NO3 - Midt-Norge', utlandImport: 0, utlandExport: 0, inlandImport: 0, inlandExport: 0, swedenImport: 0, swedenExport: 0, history: [] },
    NO4: { id: 'NO4', name: 'NO4 - Nord-Norge', utlandImport: 0, utlandExport: 0, inlandImport: 0, inlandExport: 0, swedenImport: 0, swedenExport: 0, finlandImport: 0, finlandExport: 0, history: [] },
    NO5: { id: 'NO5', name: 'NO5 - Vestlandet', utlandImport: 0, utlandExport: 0, inlandImport: 0, inlandExport: 0, history: [] }
  };

  timeSeries.forEach(group => {
    const dk = group.denmark;
    const de = group.germany;
    const nl = group.netherlands;
    const uk = group.united_kingdom;
    const se = group.sweden;
    const fi = group.finland;

    const getImpExp = (val) => {
      return val > 0 ? { imp: val, exp: 0 } : { imp: 0, exp: Math.abs(val) };
    };

    const dkIE = getImpExp(dk);
    const deIE = getImpExp(de);
    const nlIE = getImpExp(nl);
    const ukIE = getImpExp(uk);
    const fiIE = getImpExp(fi);

    const seNO1 = getImpExp(se * 0.56);
    const seNO3 = getImpExp(se * 0.26);
    const seNO4 = getImpExp(se * 0.18);

    const utland = {
      NO1: { imp: seNO1.imp, exp: seNO1.exp },
      NO2: { imp: dkIE.imp + deIE.imp + nlIE.imp + ukIE.imp, exp: dkIE.exp + deIE.exp + nlIE.exp + ukIE.exp },
      NO3: { imp: seNO3.imp, exp: seNO3.exp },
      NO4: { imp: seNO4.imp + fiIE.imp, exp: seNO4.exp + fiIE.exp },
      NO5: { imp: 0, exp: 0 }
    };

    const stressFactor = 1.0 + Math.abs(group.denmark + group.germany + group.sweden) / 10.0;
    const daySeed = group.label.charCodeAt(0) || 5;
    const hourlySeed = 0.9 + Math.sin(daySeed * 0.5) * 0.15;
    const scale = stepHours * stressFactor * hourlySeed;

    const flow5to1 = 1.2 * scale;
    const flow5to2 = 0.5 * scale;
    const flow3to1 = 0.8 * scale;
    const flow4to3 = 0.6 * scale;
    const flow1to2 = 0.8 * scale;

    const inland = {
      NO1: { imp: flow5to1 + flow3to1, exp: flow1to2 },
      NO2: { imp: flow1to2 + flow5to2, exp: 0 },
      NO3: { imp: flow4to3, exp: flow3to1 },
      NO4: { imp: 0, exp: flow4to3 },
      NO5: { imp: 0, exp: flow5to1 + flow5to2 }
    };

    Object.keys(zoneData).forEach(zId => {
      const zU = utland[zId];
      const zI = inland[zId];

      zoneData[zId].utlandImport += zU.imp;
      zoneData[zId].utlandExport += zU.exp;
      zoneData[zId].inlandImport += zI.imp;
      zoneData[zId].inlandExport += zI.exp;

      // Accumulate specific borders
      if (zId === 'NO1') {
        zoneData.NO1.swedenImport += seNO1.imp;
        zoneData.NO1.swedenExport += seNO1.exp;
      } else if (zId === 'NO2') {
        zoneData.NO2.denmarkImport += dkIE.imp;
        zoneData.NO2.denmarkExport += dkIE.exp;
        zoneData.NO2.germanyImport += deIE.imp;
        zoneData.NO2.germanyExport += deIE.exp;
        zoneData.NO2.netherlandsImport += nlIE.imp;
        zoneData.NO2.netherlandsExport += nlIE.exp;
        zoneData.NO2.ukImport += ukIE.imp;
        zoneData.NO2.ukExport += ukIE.exp;
      } else if (zId === 'NO3') {
        zoneData.NO3.swedenImport += seNO3.imp;
        zoneData.NO3.swedenExport += seNO3.exp;
      } else if (zId === 'NO4') {
        zoneData.NO4.swedenImport += seNO4.imp;
        zoneData.NO4.swedenExport += seNO4.exp;
        zoneData.NO4.finlandImport += fiIE.imp;
        zoneData.NO4.finlandExport += fiIE.exp;
      }

      zoneData[zId].history.push({
        label: group.label,
        utlandImport: Math.round(zU.imp * 10) / 10,
        utlandExport: Math.round(zU.exp * 10) / 10,
        inlandImport: Math.round(zI.imp * 10) / 10,
        inlandExport: Math.round(zI.exp * 10) / 10,
        totalImport: Math.round((zU.imp + zI.imp) * 10) / 10,
        totalExport: Math.round((zU.exp + zI.exp) * 10) / 10,
        netExchange: Math.round((zU.imp + zI.imp - (zU.exp + zI.exp)) * 10) / 10
      });
    });
  });

  Object.keys(zoneData).forEach(zId => {
    zoneData[zId].utlandImport = Math.round(zoneData[zId].utlandImport * 10) / 10;
    zoneData[zId].utlandExport = Math.round(zoneData[zId].utlandExport * 10) / 10;
    zoneData[zId].inlandImport = Math.round(zoneData[zId].inlandImport * 10) / 10;
    zoneData[zId].inlandExport = Math.round(zoneData[zId].inlandExport * 10) / 10;
    if (zId === 'NO1' || zId === 'NO3') {
      zoneData[zId].swedenImport = Math.round(zoneData[zId].swedenImport * 10) / 10;
      zoneData[zId].swedenExport = Math.round(zoneData[zId].swedenExport * 10) / 10;
    } else if (zId === 'NO2') {
      zoneData.NO2.denmarkImport = Math.round(zoneData.NO2.denmarkImport * 10) / 10;
      zoneData.NO2.denmarkExport = Math.round(zoneData.NO2.denmarkExport * 10) / 10;
      zoneData.NO2.germanyImport = Math.round(zoneData.NO2.germanyImport * 10) / 10;
      zoneData.NO2.germanyExport = Math.round(zoneData.NO2.germanyExport * 10) / 10;
      zoneData.NO2.netherlandsImport = Math.round(zoneData.NO2.netherlandsImport * 10) / 10;
      zoneData.NO2.netherlandsExport = Math.round(zoneData.NO2.netherlandsExport * 10) / 10;
      zoneData.NO2.ukImport = Math.round(zoneData.NO2.ukImport * 10) / 10;
      zoneData.NO2.ukExport = Math.round(zoneData.NO2.ukExport * 10) / 10;
    } else if (zId === 'NO4') {
      zoneData.NO4.swedenImport = Math.round(zoneData.NO4.swedenImport * 10) / 10;
      zoneData.NO4.swedenExport = Math.round(zoneData.NO4.swedenExport * 10) / 10;
      zoneData.NO4.finlandImport = Math.round(zoneData.NO4.finlandImport * 10) / 10;
      zoneData.NO4.finlandExport = Math.round(zoneData.NO4.finlandExport * 10) / 10;
    }
  });

  return {
    timeSeries,
    zoneData
  };
}

function getFallbackCBETData(startStr, effEndStr, periodType) {
  const MONTH_NAMES = ['Jan', 'Feb', 'Mar', 'Apr', 'Mai', 'Jun', 'Jul', 'Aug', 'Sep', 'Okt', 'Nov', 'Des'];
  const labels = [];
  if (periodType === 'YEAR') {
    labels.push(...MONTH_NAMES);
  } else if (periodType === 'MONTH') {
    for (let i = 1; i <= 30; i++) labels.push(`${i}. Aug`);
  } else if (periodType === 'WEEK') {
    labels.push('Man', 'Tir', 'Ons', 'Tor', 'Fre', 'Lør', 'Søn');
  } else {
    for (let h = 0; h < 24; h++) labels.push(`${String(h).padStart(2, '0')}:00`);
  }

  const rawData = {
    data: labels.map((lbl, idx) => {
      const dayFactor = 1.0 + Math.sin(idx * 0.5) * 0.15;
      return {
        timestamp: new Date().toISOString(),
        values: {
          denmark: -1.2 * dayFactor,
          germany: -1.0 * dayFactor,
          netherlands: 0.1 * dayFactor,
          sweden: 0.8 * dayFactor,
          united_kingdom: -1.5 * dayFactor,
          finland: 0.05 * dayFactor
        }
      };
    })
  };

  return processCBETData(rawData, periodType);
}
