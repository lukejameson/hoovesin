# 🐴 Hoovesin - Stables or Paddock?

A weather-based decision helper for horse care in Guernsey. This SvelteKit application helps decide whether horses should stay in the paddock overnight or be brought into the stables based on weather forecasts.

## Features

- **Smart Recommendations**: Automatically recommends "STABLES TONIGHT" if rain is expected or "PADDOCK OK" for clear conditions
- **Wind Warnings**: Alerts when wind gusts exceed 50km/h
- **Hourly Breakdown**: Detailed hour-by-hour forecast from 6pm to 7am
- **Weather Stats**: Total rain, peak wind speed, and peak gusts
- **Caching**: Weather data cached for 30 minutes to reduce API calls
- **Mobile-First Design**: Dark mode UI optimized for viewing at dusk/dawn

## Tech Stack

- **Framework**: SvelteKit with TypeScript
- **Styling**: Tailwind CSS v4
- **Database**: SQLite with Drizzle ORM
- **Weather Data**: Open-Meteo API (free, no key required)
- **Deployment**: Docker with Traefik integration

## Development

### Prerequisites

- Node.js 22+
- npm

### Setup

```bash
# Install dependencies
npm install

# Run development server
npm run dev
```

Visit `http://localhost:5173` to view the app.

### Build

```bash
npm run build
npm run preview
```

## Docker Deployment

### Build and Run

```bash
docker compose up -d
```

The app will be available on port 3000 with a SQLite database persisted in `./data`.

### Environment Variables

- `NODE_ENV`: Set to `production` for production builds
- `PORT`: Server port (default: 3000)

## API Endpoints

### GET /api/weather

Returns the current weather recommendation.

Query Parameters:

- `refresh=true`: Force refresh (bypasses cache, limited to once every 5 minutes)

Response:

```json
{
  "recommendation": "stables" | "paddock",
  "rainPredicted": boolean,
  "totalRainMm": number,
  "peakWindSpeed": number,
  "peakWindGust": number,
  "windWarning": boolean,
  "rainHours": ["6pm", "7pm", ...],
  "hourly": [...],
  "fetchedAt": "ISO timestamp",
  "cached": boolean
}
```

## Recommendation Logic

1. **STABLES**: If ANY rain is predicted overnight (>0.1mm in any hour)
2. **PADDOCK OK**: If no rain is expected
3. **Wind Warning**: Added when gusts exceed 50km/h

## Location

Configured for Guernsey (Channel Islands):

- Latitude: 49.4657
- Longitude: -2.5853
- Overnight window: 6pm - 7am

## GitHub Actions Deployment

The repository includes a GitHub Actions workflow (`.github/workflows/deploy.yml`) that:

1. Builds the Docker image on GitHub Actions
2. Pushes to GitHub Container Registry (ghcr.io)
3. SSHs into VPS and pulls the new image

### Required Secrets

Set these in your GitHub repository settings:

- `VPS`: Your VPS IP or hostname
- `VPS_USERNAME`: SSH username
- `VPS_SSH_KEY`: Private SSH key for deployment
- `VPS_SSH_PASSPHRASE`: SSH key passphrase (if applicable)
- `VPS_SSH_PORT`: SSH port (usually 22)

### VPS Setup

1. Create directory: `mkdir -p ~/docker-apps/hoovesin`
2. Copy `docker-compose.yml` to `~/docker-apps/hoovesin/`
3. Create data directory: `mkdir -p ~/docker-apps/hoovesin/data`
4. Ensure Docker and Docker Compose are installed
5. Configure Traefik reverse proxy on your network
6. Run initial deployment: `docker compose up -d`

## License

MIT
