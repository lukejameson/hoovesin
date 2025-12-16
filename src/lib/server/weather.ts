import { desc } from 'drizzle-orm';
import { db, weatherCache } from './db';
import type { HourlyData, WeatherCacheSelect } from './schema';

// Guernsey coordinates
const LAT = 49.4657;
const LON = -2.5853;

// Cache TTL in milliseconds (30 minutes)
const CACHE_TTL = 30 * 60 * 1000;

// Rain threshold in mm
const RAIN_THRESHOLD = 0.1;

// Horse hardiness types and thresholds
export type HorseHardiness = 'hardy' | 'normal' | 'soft';

interface WeatherThresholds {
  maxRainHours: number;
  maxTotalRain: number; // mm
  maxSustainedWind: number; // mph
  combinedRainThreshold: number; // mm
  combinedWindThreshold: number; // mph
  windGustThreshold: number; // mph
}

const THRESHOLDS: Record<HorseHardiness, WeatherThresholds> = {
  hardy: {
    maxRainHours: 8,           // Tolerates prolonged rain
    maxTotalRain: 15,          // Can handle heavy rain
    maxSustainedWind: 50,      // Very wind-tolerant
    combinedRainThreshold: 8,  // Needs both to be significant
    combinedWindThreshold: 35,
    windGustThreshold: 65,     // High gust tolerance
  },
  normal: {
    maxRainHours: 4,           // Current default setting
    maxTotalRain: 5,           // Current default setting
    maxSustainedWind: 40,      // Current default setting
    combinedRainThreshold: 2,  // Current default setting
    combinedWindThreshold: 25, // Current default setting
    windGustThreshold: 55,     // Moderate gust tolerance
  },
  soft: {
    maxRainHours: 2,           // Minimal rain tolerance
    maxTotalRain: 2,           // Light rain triggers stables
    maxSustainedWind: 30,      // Lower wind tolerance
    combinedRainThreshold: 1,  // Any rain + moderate wind
    combinedWindThreshold: 20,
    windGustThreshold: 45,     // Conservative on gusts
  },
};

// Convert km/h to mph
function kmhToMph(kmh: number): number {
  return kmh * 0.621371;
}

interface OpenMeteoResponse {
  hourly: {
    time: string[];
    precipitation: number[];
    wind_speed_10m: number[];
    wind_gusts_10m: number[];
    temperature_2m: number[];
  };
  daily: {
    time: string[];
    sunrise: string[];
    sunset: string[];
  };
}

export interface WeatherResult {
  recommendation: 'stables' | 'paddock';
  rainPredicted: boolean;
  totalRainMm: number;
  peakWindSpeed: number;
  peakWindGust: number;
  windWarning: boolean;
  rainHours: string[];
  hourly: HourlyData[];
  fetchedAt: string;
  cached: boolean;
  minTemp: number;
  maxTemp: number;
  avgTemp: number;
  overnightStart: string;
  overnightEnd: string;
}

// Get date range for API call (we need today and tomorrow to cover overnight)
function getDateRange(): { startDate: string; endDate: string } {
  const now = new Date();
  const today = now.toISOString().split('T')[0];
  
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  // If before sunrise, we need yesterday too
  if (now.getHours() < 9) {
    const yesterday = new Date(now);
    yesterday.setDate(yesterday.getDate() - 1);
    return { startDate: yesterday.toISOString().split('T')[0], endDate: today };
  }
  
  return { startDate: today, endDate: tomorrowStr };
}

// Calculate overnight window from actual sunset/sunrise times
function getOvernightWindowFromSunTimes(
  daily: { time: string[]; sunrise: string[]; sunset: string[] }
): { start: Date; end: Date; startHour: string; endHour: string } {
  const now = new Date();
  
  // Find today's and tomorrow's sun times
  let todaySunset: Date | null = null;
  let tomorrowSunrise: Date | null = null;
  let yesterdaySunset: Date | null = null;
  let todaySunrise: Date | null = null;
  
  const todayStr = now.toISOString().split('T')[0];
  const yesterday = new Date(now);
  yesterday.setDate(yesterday.getDate() - 1);
  const yesterdayStr = yesterday.toISOString().split('T')[0];
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = tomorrow.toISOString().split('T')[0];
  
  for (let i = 0; i < daily.time.length; i++) {
    const date = daily.time[i];
    if (date === todayStr) {
      todaySunset = new Date(daily.sunset[i]);
      todaySunrise = new Date(daily.sunrise[i]);
    } else if (date === tomorrowStr) {
      tomorrowSunrise = new Date(daily.sunrise[i]);
    } else if (date === yesterdayStr) {
      yesterdaySunset = new Date(daily.sunset[i]);
    }
  }
  
  // Determine which overnight window to use based on current time
  // If before today's sunrise, use yesterday sunset -> today sunrise
  // Otherwise, use today sunset -> tomorrow sunrise
  
  let start: Date;
  let end: Date;
  
  if (todaySunrise && now < todaySunrise && yesterdaySunset) {
    // It's before sunrise - show last night (yesterday sunset -> today sunrise)
    start = yesterdaySunset;
    end = todaySunrise;
  } else if (todaySunset && tomorrowSunrise) {
    // Show tonight (today sunset -> tomorrow sunrise)
    start = todaySunset;
    end = tomorrowSunrise;
  } else {
    // Fallback to fixed times if sun data missing
    start = new Date(now);
    start.setHours(18, 0, 0, 0);
    end = new Date(now);
    end.setDate(end.getDate() + 1);
    end.setHours(7, 0, 0, 0);
  }
  
  // Format hours for display (round to nearest hour)
  const formatHourShort = (date: Date): string => {
    const hours = date.getHours();
    const ampm = hours >= 12 ? 'pm' : 'am';
    const hour12 = hours % 12 || 12;
    return `${hour12}${ampm}`;
  };
  
  return {
    start,
    end,
    startHour: formatHourShort(start),
    endHour: formatHourShort(end),
  };
}

function formatHour(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 || 12;
  return `${hour12}${ampm}`;
}

async function fetchFromOpenMeteo(): Promise<OpenMeteoResponse> {
  const { startDate, endDate } = getDateRange();

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', LAT.toString());
  url.searchParams.set('longitude', LON.toString());
  url.searchParams.set('hourly', 'precipitation,wind_speed_10m,wind_gusts_10m,temperature_2m');
  url.searchParams.set('daily', 'sunrise,sunset');
  url.searchParams.set('start_date', startDate);
  url.searchParams.set('end_date', endDate);
  url.searchParams.set('timezone', 'Europe/London');

  const response = await fetch(url.toString());

  if (!response.ok) {
    throw new Error(
      `Open-Meteo API error: ${response.status} ${response.statusText}`
    );
  }

  return response.json();
}

function processWeatherData(
  data: OpenMeteoResponse
): Omit<WeatherResult, 'cached'> {
  // Get overnight window based on actual sunset/sunrise times
  const { start, end, startHour, endHour } = getOvernightWindowFromSunTimes(data.daily);

  const hourlyData: HourlyData[] = [];
  const rainHours: string[] = [];
  const temperatures: number[] = [];
  let totalRain = 0;
  let peakWindSpeed = 0;
  let peakWindGust = 0;

  for (let i = 0; i < data.hourly.time.length; i++) {
    const time = new Date(data.hourly.time[i]);

    // Filter to only overnight hours (sunset to sunrise)
    if (time >= start && time <= end) {
      const precipitation = data.hourly.precipitation[i] || 0;
      const windSpeed = kmhToMph(data.hourly.wind_speed_10m[i] || 0);
      const windGust = kmhToMph(data.hourly.wind_gusts_10m[i] || 0);
      const temperature = data.hourly.temperature_2m[i] ?? 0;
      const hasRain = precipitation > RAIN_THRESHOLD;

      const hourStr = formatHour(data.hourly.time[i]);

      hourlyData.push({
        time: data.hourly.time[i],
        hour: hourStr,
        precipitation,
        windSpeed: Math.round(windSpeed),
        windGust: Math.round(windGust),
        hasRain,
        temperature: Math.round(temperature * 10) / 10,
      });

      temperatures.push(temperature);

      if (hasRain) {
        rainHours.push(hourStr);
      }

      totalRain += precipitation;
      peakWindSpeed = Math.max(peakWindSpeed, windSpeed);
      peakWindGust = Math.max(peakWindGust, windGust);
    }
  }

  // Calculate temperature stats
  const minTemp = temperatures.length > 0 ? Math.min(...temperatures) : 0;
  const maxTemp = temperatures.length > 0 ? Math.max(...temperatures) : 0;
  const avgTemp = temperatures.length > 0 
    ? temperatures.reduce((sum, t) => sum + t, 0) / temperatures.length 
    : 0;

  // Use normal thresholds as default for processing
  // The actual recommendation will be recalculated based on user's hardiness setting
  const thresholds = THRESHOLDS.normal;
  
  const rainPredicted = 
    rainHours.length > thresholds.maxRainHours || 
    totalRain > thresholds.maxTotalRain || 
    peakWindSpeed > thresholds.maxSustainedWind || 
    (totalRain > thresholds.combinedRainThreshold && peakWindSpeed > thresholds.combinedWindThreshold);
  const windWarning = peakWindGust > thresholds.windGustThreshold;
  const recommendation = rainPredicted ? 'stables' : 'paddock';

  return {
    recommendation,
    rainPredicted,
    totalRainMm: Math.round(totalRain * 10) / 10,
    peakWindSpeed: Math.round(peakWindSpeed),
    peakWindGust: Math.round(peakWindGust),
    windWarning,
    rainHours,
    hourly: hourlyData,
    fetchedAt: new Date().toISOString(),
    minTemp: Math.round(minTemp * 10) / 10,
    maxTemp: Math.round(maxTemp * 10) / 10,
    avgTemp: Math.round(avgTemp * 10) / 10,
    overnightStart: startHour,
    overnightEnd: endHour,
  };
}

function getCachedData(): WeatherCacheSelect | null {
  const results = db
    .select()
    .from(weatherCache)
    .orderBy(desc(weatherCache.id))
    .limit(1)
    .all();

  if (results.length === 0) {
    return null;
  }

  const cached = results[0];
  const fetchedAt = new Date(cached.fetchedAt);
  const now = new Date();

  // Check if cache is still valid
  if (now.getTime() - fetchedAt.getTime() < CACHE_TTL) {
    return cached;
  }

  return null;
}

function saveToCache(
  data: Omit<WeatherResult, 'cached'>,
  rawResponse: OpenMeteoResponse
): void {
  db.insert(weatherCache)
    .values({
      fetchedAt: data.fetchedAt,
      rainPredicted: data.rainPredicted,
      totalRainMm: data.totalRainMm,
      peakWindSpeed: data.peakWindSpeed,
      peakWindGust: data.peakWindGust,
      recommendation: data.recommendation,
      windWarning: data.windWarning,
      rainHours: data.rainHours,
      hourlyBreakdown: data.hourly,
      rawResponse: rawResponse as unknown as string,
    })
    .run();
}

export async function getWeatherData(
  forceRefresh = false
): Promise<WeatherResult> {
  // Check cache first (unless force refresh)
  if (!forceRefresh) {
    const cached = getCachedData();
    if (cached) {
      // Calculate temperature stats from cached hourly data
      const temps = cached.hourlyBreakdown
        .map((h) => h.temperature)
        .filter((t): t is number => t !== undefined && t !== null);
      const minTemp = temps.length > 0 ? Math.min(...temps) : 0;
      const maxTemp = temps.length > 0 ? Math.max(...temps) : 0;
      const avgTemp = temps.length > 0
        ? temps.reduce((sum, t) => sum + t, 0) / temps.length
        : 0;

      // Get overnight times from the cached hourly data
      const firstHour = cached.hourlyBreakdown[0]?.hour || '4pm';
      const lastHour = cached.hourlyBreakdown[cached.hourlyBreakdown.length - 1]?.hour || '8am';

      return {
        recommendation: cached.recommendation as 'stables' | 'paddock',
        rainPredicted: cached.rainPredicted,
        totalRainMm: cached.totalRainMm,
        peakWindSpeed: cached.peakWindSpeed,
        peakWindGust: cached.peakWindGust,
        windWarning: cached.windWarning,
        rainHours: cached.rainHours,
        hourly: cached.hourlyBreakdown,
        fetchedAt: cached.fetchedAt,
        cached: true,
        minTemp: Math.round(minTemp * 10) / 10,
        maxTemp: Math.round(maxTemp * 10) / 10,
        avgTemp: Math.round(avgTemp * 10) / 10,
        overnightStart: firstHour,
        overnightEnd: lastHour,
      };
    }
  }

  // Fetch fresh data
  const rawResponse = await fetchFromOpenMeteo();
  const processedData = processWeatherData(rawResponse);

  // Save to cache
  saveToCache(processedData, rawResponse);

  return {
    ...processedData,
    cached: false,
  };
}

// Calculate recommendation based on weather data and hardiness level
export function calculateRecommendation(
  weatherData: Pick<WeatherResult, 'rainHours' | 'totalRainMm' | 'peakWindSpeed' | 'peakWindGust'>,
  hardiness: HorseHardiness
): { recommendation: 'stables' | 'paddock'; rainPredicted: boolean; windWarning: boolean } {
  const thresholds = THRESHOLDS[hardiness];
  
  const rainPredicted = 
    weatherData.rainHours.length > thresholds.maxRainHours || 
    weatherData.totalRainMm > thresholds.maxTotalRain || 
    weatherData.peakWindSpeed > thresholds.maxSustainedWind || 
    (weatherData.totalRainMm > thresholds.combinedRainThreshold && weatherData.peakWindSpeed > thresholds.combinedWindThreshold);
  
  const windWarning = weatherData.peakWindGust > thresholds.windGustThreshold;
  const recommendation = rainPredicted ? 'stables' : 'paddock';
  
  return { recommendation, rainPredicted, windWarning };
}

export function canRefresh(): boolean {
  const results = db
    .select()
    .from(weatherCache)
    .orderBy(desc(weatherCache.id))
    .limit(1)
    .all();

  if (results.length === 0) {
    return true;
  }

  const cached = results[0];
  const fetchedAt = new Date(cached.fetchedAt);
  const now = new Date();

  // Can refresh if data is older than 5 minutes
  return now.getTime() - fetchedAt.getTime() > 5 * 60 * 1000;
}
