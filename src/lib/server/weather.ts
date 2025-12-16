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

// Wind gust warning threshold in mph
const WIND_GUST_THRESHOLD = 31;

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
}

function getOvernightWindow(): { start: Date; end: Date } {
  const now = new Date();
  const today6pm = new Date(now);
  today6pm.setHours(18, 0, 0, 0);

  const tomorrow7am = new Date(now);
  tomorrow7am.setDate(tomorrow7am.getDate() + 1);
  tomorrow7am.setHours(7, 0, 0, 0);

  // If it's before 6pm, use today's 6pm to tomorrow's 7am
  // If it's after 7am but before 6pm, use today's 6pm to tomorrow's 7am
  // If it's between 6pm and midnight, use today's 6pm to tomorrow's 7am
  // If it's between midnight and 7am, use yesterday's 6pm to today's 7am

  if (now.getHours() < 7) {
    // Between midnight and 7am - use yesterday's 6pm to today's 7am
    const yesterday6pm = new Date(now);
    yesterday6pm.setDate(yesterday6pm.getDate() - 1);
    yesterday6pm.setHours(18, 0, 0, 0);

    const today7am = new Date(now);
    today7am.setHours(7, 0, 0, 0);

    return { start: yesterday6pm, end: today7am };
  }

  return { start: today6pm, end: tomorrow7am };
}

function formatHour(isoString: string): string {
  const date = new Date(isoString);
  const hours = date.getHours();
  const ampm = hours >= 12 ? 'pm' : 'am';
  const hour12 = hours % 12 || 12;
  return `${hour12}${ampm}`;
}

async function fetchFromOpenMeteo(): Promise<OpenMeteoResponse> {
  const { start, end } = getOvernightWindow();

  const startDate = start.toISOString().split('T')[0];
  const endDate = end.toISOString().split('T')[0];

  const url = new URL('https://api.open-meteo.com/v1/forecast');
  url.searchParams.set('latitude', LAT.toString());
  url.searchParams.set('longitude', LON.toString());
  url.searchParams.set('hourly', 'precipitation,wind_speed_10m,wind_gusts_10m,temperature_2m');
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
  const { start, end } = getOvernightWindow();

  const hourlyData: HourlyData[] = [];
  const rainHours: string[] = [];
  const temperatures: number[] = [];
  let totalRain = 0;
  let peakWindSpeed = 0;
  let peakWindGust = 0;

  for (let i = 0; i < data.hourly.time.length; i++) {
    const time = new Date(data.hourly.time[i]);

    // Filter to only overnight hours (6pm - 7am)
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

  // Balanced approach: multiple factors trigger stables recommendation
  // - More than 4 hours of any rain, OR
  // - More than 5mm total rain, OR
  // - Sustained wind over 40mph, OR
  // - Combined moderate conditions (>2mm rain AND wind >25mph)
  const rainPredicted = 
    rainHours.length > 4 || 
    totalRain > 5 || 
    peakWindSpeed > 40 || 
    (totalRain > 2 && peakWindSpeed > 25);
  const windWarning = peakWindGust > WIND_GUST_THRESHOLD;
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
