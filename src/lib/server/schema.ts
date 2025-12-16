import { integer, real, sqliteTable, text } from 'drizzle-orm/sqlite-core';

export const weatherCache = sqliteTable('weather_cache', {
  id: integer('id').primaryKey({ autoIncrement: true }),
  fetchedAt: text('fetched_at').notNull(),
  rainPredicted: integer('rain_predicted', { mode: 'boolean' }).notNull(),
  totalRainMm: real('total_rain_mm').notNull(),
  peakWindSpeed: real('peak_wind_speed').notNull(),
  peakWindGust: real('peak_wind_gust').notNull(),
  recommendation: text('recommendation').notNull(),
  windWarning: integer('wind_warning', { mode: 'boolean' }).notNull(),
  rainHours: text('rain_hours', { mode: 'json' }).$type<string[]>().notNull(),
  hourlyBreakdown: text('hourly_breakdown', { mode: 'json' })
    .$type<HourlyData[]>()
    .notNull(),
  rawResponse: text('raw_response', { mode: 'json' }).notNull(),
});

export interface HourlyData {
  time: string;
  hour: string;
  precipitation: number;
  windSpeed: number;
  windGust: number;
  hasRain: boolean;
  temperature: number;
}

export type WeatherCacheSelect = typeof weatherCache.$inferSelect;
export type WeatherCacheInsert = typeof weatherCache.$inferInsert;
