import Database from 'better-sqlite3';
import { drizzle } from 'drizzle-orm/better-sqlite3';
import fs from 'fs';
import path from 'path';
import { weatherCache } from './schema';

// Determine database path - use /data in production (Docker), local in dev
const isDev = process.env.NODE_ENV !== 'production';
const dbDir = isDev ? './data' : '/data';
const dbPath = path.join(dbDir, 'weather.db');

// Ensure directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const sqlite = new Database(dbPath);

// Enable WAL mode for better concurrent access
sqlite.pragma('journal_mode = WAL');

export const db = drizzle(sqlite);

// Initialize database schema
function initializeDatabase() {
  sqlite.exec(`
    CREATE TABLE IF NOT EXISTS weather_cache (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      fetched_at TEXT NOT NULL,
      rain_predicted INTEGER NOT NULL,
      total_rain_mm REAL NOT NULL,
      peak_wind_speed REAL NOT NULL,
      peak_wind_gust REAL NOT NULL,
      recommendation TEXT NOT NULL,
      wind_warning INTEGER NOT NULL,
      rain_hours TEXT NOT NULL,
      hourly_breakdown TEXT NOT NULL,
      raw_response TEXT NOT NULL
    )
  `);
}

initializeDatabase();

export { weatherCache };
