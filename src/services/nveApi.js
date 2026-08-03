/**
 * Service for fetching NVE Magasinstatistikk (Water Reservoirs)
 * API Docs: https://api.nve.no/doc/magasinstatistikk/
 * Public Endpoints:
 * - HentOffentligData: https://biapi.nve.no/magasinstatistikk/api/Magasinstatistikk/HentOffentligData
 * - HentOffentligDataMinMaxMedian: https://biapi.nve.no/magasinstatistikk/api/Magasinstatistikk/HentOffentligDataMinMaxMedian
 *
 * Implements SWR (Stale-While-Revalidate) & Persistent LocalStorage Caching
 */

const NVE_BASE_URL = 'https://biapi.nve.no/magasinstatistikk/api/Magasinstatistikk';
const CACHE_KEY = 'norsk_kraftpuls_nve_data_v1';
const CACHE_TIME_KEY = 'norsk_kraftpuls_nve_data_time';
const CACHE_TTL_MS = 6 * 60 * 60 * 1000; // 6 hours cache validity

export const RESERVOIR_AREAS = [
  { id: 'NO', label: 'Norge (Hele landet)', omrType: 'NO', omrnr: 0 },
  { id: 'NO1', label: 'NO1 (Østlandet)', omrType: 'EL', omrnr: 1 },
  { id: 'NO2', label: 'NO2 (Sørlandet)', omrType: 'EL', omrnr: 2 },
  { id: 'NO3', label: 'NO3 (Midt-Norge)', omrType: 'EL', omrnr: 3 },
  { id: 'NO4', label: 'NO4 (Nord-Norge)', omrType: 'EL', omrnr: 4 },
  { id: 'NO5', label: 'NO5 (Vestlandet)', omrType: 'EL', omrnr: 5 },
];

let inMemoryCache = null;

/**
 * Reads data from persistent localStorage cache if available
 */
function getLocalCache() {
  if (inMemoryCache) return inMemoryCache;

  try {
    const raw = localStorage.getItem(CACHE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      inMemoryCache = parsed;
      return parsed;
    }
  } catch (err) {
    console.warn('Failed to read NVE cache from localStorage:', err);
  }
  return null;
}

/**
 * Saves processed data to persistent localStorage cache
 */
function saveLocalCache(data) {
  inMemoryCache = data;
  try {
    localStorage.setItem(CACHE_KEY, JSON.stringify(data));
    localStorage.setItem(CACHE_TIME_KEY, String(Date.now()));
  } catch (err) {
    console.warn('Failed to save NVE cache to localStorage:', err);
  }
}

/**
 * Checks if cache is expired
 */
function isCacheExpired() {
  try {
    const time = localStorage.getItem(CACHE_TIME_KEY);
    if (!time) return true;
    return Date.now() - Number(time) > CACHE_TTL_MS;
  } catch (e) {
    return true;
  }
}

/**
 * Fetch NVE Reservoir Data with SWR & LocalStorage persistence
 * If cached data exists, it returns cached data instantly while quietly revalidating in background if stale.
 */
export async function fetchNVEMagasinData(forceRefresh = false) {
  const cached = getLocalCache();

  // 1. If cache exists and is not forced, return cached data instantly
  if (cached && !forceRefresh && !isCacheExpired()) {
    return cached;
  }

  // 2. If cached exists but is stale, return cached immediately AND revalidate in background
  if (cached && !forceRefresh && isCacheExpired()) {
    // Background revalidate quietly
    revalidateNveData().then(newData => {
      if (newData) saveLocalCache(newData);
    }).catch(e => console.warn('Background NVE revalidation error:', e));

    return cached;
  }

  // 3. Otherwise fetch live data from network
  try {
    const fresh = await revalidateNveData();
    if (fresh) {
      saveLocalCache(fresh);
      return fresh;
    }
  } catch (err) {
    console.warn('Could not fetch live NVE data, checking fallback/cache:', err);
  }

  if (cached) return cached;
  return getFallbackNveData();
}

/**
 * Performs actual network request to NVE API endpoints
 */
async function revalidateNveData() {
  const [rawMinMaxResponse, rawDataResponse] = await Promise.all([
    fetch(`${NVE_BASE_URL}/HentOffentligDataMinMaxMedian`),
    fetch(`${NVE_BASE_URL}/HentOffentligData`)
  ]);

  if (!rawMinMaxResponse.ok || !rawDataResponse.ok) {
    throw new Error(`NVE API error: ${rawMinMaxResponse.status} / ${rawDataResponse.status}`);
  }

  const minMaxMedianData = await rawMinMaxResponse.json();
  const weeklyData = await rawDataResponse.json();

  return processNveData(minMaxMedianData, weeklyData);
}

/**
 * Process raw JSON into structured area data map
 */
function processNveData(minMaxList, weeklyList) {
  const resultByArea = {};

  RESERVOIR_AREAS.forEach(area => {
    // 1. Filter Min/Max/Median for this area
    const areaMinMax = minMaxList
      .filter(item => {
        if (area.omrType === 'NO') {
          return item.omrType === 'NO' || item.omrnr === 0;
        }
        return item.omrType === 'EL' && Number(item.omrnr) === area.omrnr;
      })
      .sort((a, b) => a.iso_uke - b.iso_uke)
      .map(item => ({
        week: item.iso_uke,
        minPct: Math.round((item.minFyllingsgrad || 0) * 1000) / 10,
        medianPct: Math.round((item.medianFyllingsGrad || 0) * 1000) / 10,
        maxPct: Math.round((item.maxFyllingsgrad || 0) * 1000) / 10,
        minTwh: Math.round((item.minFyllingTWH || 0) * 10) / 10,
        medianTwh: Math.round((item.medianFylling_TWH || 0) * 10) / 10,
        maxTwh: Math.round((item.maxFyllingTWH || 0) * 10) / 10,
      }));

    // 2. Filter Weekly Data for this area
    const areaWeekly = weeklyList.filter(item => {
      if (area.omrType === 'NO') {
        return item.omrType === 'NO' || item.omrnr === 0;
      }
      return item.omrType === 'EL' && Number(item.omrnr) === area.omrnr;
    });

    // Extract available years
    const availableYears = Array.from(new Set(areaWeekly.map(w => w.iso_aar)))
      .sort((a, b) => b - a);

    // Group weekly data by year
    const yearlyMap = {};
    availableYears.forEach(yr => {
      yearlyMap[yr] = areaWeekly
        .filter(w => w.iso_aar === yr)
        .sort((a, b) => a.iso_uke - b.iso_uke)
        .map(w => ({
          week: w.iso_uke,
          date: w.dato_Id,
          fillingPct: Math.round((w.fyllingsgrad || 0) * 1000) / 10,
          fillingTwh: Math.round((w.fylling_TWh || 0) * 10) / 10,
          capacityTwh: Math.round((w.kapasitet_TWh || 0) * 10) / 10,
          changePct: Math.round((w.endring_fyllingsgrad || 0) * 1000) / 10,
        }));
    });

    resultByArea[area.id] = {
      areaId: area.id,
      label: area.label,
      minMaxMedian: areaMinMax,
      availableYears,
      yearlyData: yearlyMap,
      latestYear: availableYears[0] || new Date().getFullYear(),
    };
  });

  return resultByArea;
}

/**
 * Fallback dataset if NVE API is unavailable
 */
function getFallbackNveData() {
  const resultByArea = {};
  const currentYear = new Date().getFullYear();
  const availableYears = Array.from({ length: 30 }, (_, i) => currentYear - i);

  RESERVOIR_AREAS.forEach(area => {
    const minMaxMedian = [];
    for (let uke = 1; uke <= 52; uke++) {
      const seasonal = Math.sin(((uke - 15) / 52) * 2 * Math.PI);
      const baseMedian = 55 + seasonal * 25;
      const minPct = Math.max(10, baseMedian - 22);
      const maxPct = Math.min(98, baseMedian + 18);

      minMaxMedian.push({
        week: uke,
        minPct: Math.round(minPct * 10) / 10,
        medianPct: Math.round(baseMedian * 10) / 10,
        maxPct: Math.round(maxPct * 10) / 10,
        minTwh: Math.round(minPct * 0.85 * 10) / 10,
        medianTwh: Math.round(baseMedian * 0.85 * 10) / 10,
        maxTwh: Math.round(maxPct * 0.85 * 10) / 10,
      });
    }

    const yearlyMap = {};
    availableYears.forEach(yr => {
      const weeksCount = yr === currentYear ? 31 : 52;
      const yearData = [];
      for (let uke = 1; uke <= weeksCount; uke++) {
        const ref = minMaxMedian[uke - 1];
        const val = Math.min(ref.maxPct, Math.max(ref.minPct, ref.medianPct + (Math.sin(uke * 0.5) * 6)));
        yearData.push({
          week: uke,
          date: `${yr}-W${uke}`,
          fillingPct: Math.round(val * 10) / 10,
          fillingTwh: Math.round(val * 0.85 * 10) / 10,
          capacityTwh: 85,
          changePct: uke === 1 ? 0 : Math.round((Math.sin(uke) * 1.5) * 10) / 10,
        });
      }
      yearlyMap[yr] = yearData;
    });

    resultByArea[area.id] = {
      areaId: area.id,
      label: area.label,
      minMaxMedian,
      availableYears,
      yearlyData: yearlyMap,
      latestYear: currentYear,
    };
  });

  return resultByArea;
}
