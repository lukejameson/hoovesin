<script lang="ts">
  import HourlyBreakdown from '$lib/components/HourlyBreakdown.svelte';
  import RecommendationCard from '$lib/components/RecommendationCard.svelte';
  import RefreshButton from '$lib/components/RefreshButton.svelte';
  import StatsGrid from '$lib/components/StatsGrid.svelte';
  import type { WeatherResult } from '$lib/server/weather';
  import { onMount } from 'svelte';

  interface Props {
    data: {
      weather: WeatherResult | null;
      canRefresh: boolean;
      error: string | null;
    };
  }

  let { data }: Props = $props();

  let weather = $state(data.weather);
  let canRefreshNow = $state(data.canRefresh);
  let error = $state(data.error);
  let isLoading = $state(false);

  // Auto-refresh interval (30 minutes)
  const AUTO_REFRESH_INTERVAL = 30 * 60 * 1000;

  onMount(() => {
    // Auto-refresh every 30 minutes
    const interval = setInterval(async () => {
      await silentRefresh();
    }, AUTO_REFRESH_INTERVAL);

    // Also refresh if tab becomes visible after being hidden
    const handleVisibilityChange = async () => {
      if (document.visibilityState === 'visible' && weather) {
        const fetchedAt = new Date(weather.fetchedAt);
        const now = new Date();
        // If data is older than 30 minutes, refresh
        if (now.getTime() - fetchedAt.getTime() > AUTO_REFRESH_INTERVAL) {
          await silentRefresh();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  });

  // Silent refresh (no loading state, doesn't affect manual refresh button)
  async function silentRefresh() {
    try {
      const response = await fetch('/api/weather');
      if (response.ok) {
        const newData = await response.json();
        weather = newData;
      }
    } catch {
      // Silently fail for auto-refresh
    }
  }

  async function refresh() {
    if (isLoading || !canRefreshNow) return;

    isLoading = true;
    error = null;

    try {
      const response = await fetch('/api/weather?refresh=true');

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to refresh weather data');
      }

      const newData = await response.json();
      weather = newData;
      canRefreshNow = false;

      // Re-enable refresh after 5 minutes
      setTimeout(
        () => {
          canRefreshNow = true;
        },
        5 * 60 * 1000
      );
    } catch (e) {
      error = e instanceof Error ? e.message : 'Failed to refresh weather data';
    } finally {
      isLoading = false;
    }
  }
</script>

<main class="min-h-screen px-4 py-8 md:py-12">
  <div class="max-w-2xl mx-auto space-y-6">
    <!-- Header -->
    <header class="text-center mb-8">
      <h1 class="text-2xl font-bold text-slate-200 mb-1">🐴 Hoovesin</h1>
      <p class="text-slate-500 text-sm">
        Guernsey overnight weather for horses
      </p>
    </header>

    {#if error && !weather}
      <!-- Error State -->
      <div class="glass-card p-8 text-center">
        <div class="text-6xl mb-4">⚠️</div>
        <h2 class="text-xl font-bold text-red-400 mb-2">
          Something went wrong
        </h2>
        <p class="text-slate-400 mb-6">{error}</p>
        <button
          class="px-6 py-3 bg-slate-700 hover:bg-slate-600 rounded-lg font-medium transition-colors"
          onclick={refresh}
        >
          Try Again
        </button>
      </div>
    {:else if weather}
      <!-- Recommendation Card -->
      <RecommendationCard
        recommendation={weather.recommendation}
        rainPredicted={weather.rainPredicted}
        windWarning={weather.windWarning}
        rainHours={weather.rainHours}
      />

      <!-- Stats Grid -->
      <StatsGrid
        totalRainMm={weather.totalRainMm}
        peakWindSpeed={weather.peakWindSpeed}
        peakWindGust={weather.peakWindGust}
        fetchedAt={weather.fetchedAt}
        cached={weather.cached}
      />

      <!-- Hourly Breakdown -->
      {#if weather.hourly && weather.hourly.length > 0}
        <HourlyBreakdown hourly={weather.hourly} />
      {/if}

      <!-- Refresh Button -->
      <RefreshButton
        loading={isLoading}
        disabled={!canRefreshNow || isLoading}
        onclick={refresh}
      />

      <!-- Error Toast -->
      {#if error}
        <div
          class="fixed bottom-4 left-4 right-4 md:left-auto md:right-4 md:w-96 glass-card p-4 bg-red-500/20 border-red-500/50 text-red-300 animate-fade-in"
        >
          <div class="flex items-start gap-3">
            <svg
              class="w-5 h-5 shrink-0 mt-0.5"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fill-rule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clip-rule="evenodd"
              />
            </svg>
            <div>
              <p class="font-medium">Refresh failed</p>
              <p class="text-sm text-red-400">{error}</p>
            </div>
            <button
              class="ml-auto text-red-400 hover:text-red-300"
              onclick={() => (error = null)}
            >
              <svg class="w-5 h-5" fill="currentColor" viewBox="0 0 20 20">
                <path
                  fill-rule="evenodd"
                  d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                  clip-rule="evenodd"
                />
              </svg>
            </button>
          </div>
        </div>
      {/if}
    {:else}
      <!-- Loading State -->
      <div class="space-y-6">
        <div class="glass-card p-8">
          <div class="skeleton h-16 w-16 rounded-full mx-auto mb-6"></div>
          <div class="skeleton h-10 w-64 mx-auto mb-4"></div>
          <div class="skeleton h-6 w-48 mx-auto"></div>
        </div>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4">
          {#each [1, 2, 3, 4] as _}
            <div class="glass-card p-4">
              <div class="skeleton h-4 w-16 mx-auto mb-2"></div>
              <div class="skeleton h-8 w-20 mx-auto"></div>
            </div>
          {/each}
        </div>
      </div>
    {/if}

    <!-- Footer -->
    <footer class="text-center text-slate-600 text-xs mt-8">
      <p>Weather data from Open-Meteo • Location: Guernsey</p>
      <p class="mt-1">
        Overnight window: 6pm - 7am • Auto-refreshes every 30 min
      </p>
    </footer>
  </div>
</main>
