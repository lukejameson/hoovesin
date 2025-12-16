<script lang="ts">
  import type { HourlyData } from '$lib/server/schema';

  interface Props {
    hourly: HourlyData[];
    overnightStart: string;
    overnightEnd: string;
  }

  let { hourly, overnightStart, overnightEnd }: Props = $props();

  let isExpanded = $state(false);
</script>

<div class="glass-card overflow-hidden animate-fade-in">
  <!-- Header Button -->
  <button
    class="w-full p-4 flex items-center justify-between text-left hover:bg-slate-700/30 transition-colors"
    onclick={() => (isExpanded = !isExpanded)}
  >
    <div class="flex items-center gap-3">
      <svg
        class="w-5 h-5 text-slate-400"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      <span class="font-medium text-slate-200">Hourly Breakdown</span>
      <span class="text-sm text-slate-500">{overnightStart} - {overnightEnd}</span>
    </div>
    <svg
      class="w-5 h-5 text-slate-400 transition-transform {isExpanded
        ? 'rotate-180'
        : ''}"
      fill="none"
      stroke="currentColor"
      viewBox="0 0 24 24"
    >
      <path
        stroke-linecap="round"
        stroke-linejoin="round"
        stroke-width="2"
        d="M19 9l-7 7-7-7"
      />
    </svg>
  </button>

  <!-- Expandable Content -->
  {#if isExpanded}
    <div class="border-t border-slate-700/50">
      <div class="max-h-96 overflow-y-auto">
        {#each hourly as hour}
          <div
            class="px-4 py-3 border-b border-slate-700/30 last:border-b-0 {hour.hasRain
              ? 'bg-amber-500/10'
              : ''}"
          >
            <!-- Mobile: Stack layout -->
            <div class="flex items-center justify-between">
              <!-- Time -->
              <div class="w-14 shrink-0">
                <span
                  class="font-semibold text-base {hour.hasRain
                    ? 'text-amber-400'
                    : 'text-slate-300'}"
                >
                  {hour.hour}
                </span>
              </div>

              <!-- Temperature -->
              <div class="w-16 shrink-0">
                <span class="text-slate-200 font-medium tabular-nums">{hour.temperature}°</span>
              </div>

              <!-- Rain -->
              <div class="flex items-center gap-2 min-w-[70px]">
                {#if hour.hasRain}
                  <svg
                    class="w-4 h-4 text-blue-400 shrink-0"
                    fill="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path d="M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z" />
                  </svg>
                  <span class="text-blue-300 font-medium"
                    >{hour.precipitation}mm</span
                  >
                {:else}
                  <span class="text-slate-500">—</span>
                {/if}
              </div>

              <!-- Wind - Desktop only (inline) -->
              <div class="hidden sm:flex items-center gap-4 text-sm">
                <div class="text-slate-400">
                  <span class="text-slate-500">Wind:</span>
                  {Math.round(hour.windSpeed)}mph
                </div>
                <div
                  class={hour.windGust > 31
                    ? 'text-yellow-400'
                    : 'text-slate-400'}
                >
                  <span class="text-slate-500">Gust:</span>
                  {Math.round(hour.windGust)}mph
                </div>
              </div>

              <!-- Wind - Mobile (compact) -->
              <div
                class="flex sm:hidden items-center gap-3 text-xs text-slate-400"
              >
                <span
                  >{Math.round(hour.windSpeed)}<span class="text-slate-600"
                    >mph</span
                  ></span
                >
                <span class={hour.windGust > 31 ? 'text-yellow-400' : ''}>
                  💨{Math.round(hour.windGust)}
                </span>
              </div>
            </div>
          </div>
        {/each}
      </div>
    </div>
  {/if}
</div>
