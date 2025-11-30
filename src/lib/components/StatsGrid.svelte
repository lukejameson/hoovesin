<script lang="ts">
  interface Props {
    totalRainMm: number;
    peakWindSpeed: number;
    peakWindGust: number;
    fetchedAt: string;
    cached: boolean;
  }

  let { totalRainMm, peakWindSpeed, peakWindGust, fetchedAt, cached }: Props =
    $props();

  // Beaufort scale based on wind speed in mph
  function getBeaufort(mph: number): { scale: number; description: string } {
    if (mph < 1) return { scale: 0, description: 'Calm' };
    if (mph <= 3) return { scale: 1, description: 'Light air' };
    if (mph <= 7) return { scale: 2, description: 'Light breeze' };
    if (mph <= 12) return { scale: 3, description: 'Gentle breeze' };
    if (mph <= 18) return { scale: 4, description: 'Moderate breeze' };
    if (mph <= 24) return { scale: 5, description: 'Fresh breeze' };
    if (mph <= 31) return { scale: 6, description: 'Strong breeze' };
    if (mph <= 38) return { scale: 7, description: 'High wind' };
    if (mph <= 46) return { scale: 8, description: 'Gale' };
    if (mph <= 54) return { scale: 9, description: 'Strong gale' };
    if (mph <= 63) return { scale: 10, description: 'Storm' };
    if (mph <= 72) return { scale: 11, description: 'Violent storm' };
    return { scale: 12, description: 'Hurricane' };
  }

  const beaufort = $derived(getBeaufort(peakWindGust));

  const formatTime = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleTimeString('en-GB', {
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString('en-GB', {
      day: 'numeric',
      month: 'short',
    });
  };
</script>

<div class="grid grid-cols-2 md:grid-cols-4 gap-4 animate-fade-in">
  <!-- Total Rain -->
  <div class="glass-card p-4 text-center">
    <div class="text-slate-400 text-sm mb-1">Total Rain</div>
    <div class="text-2xl font-bold text-slate-100">
      {totalRainMm}
      <span class="text-sm font-normal text-slate-400">mm</span>
    </div>
  </div>

  <!-- Peak Wind Speed -->
  <div class="glass-card p-4 text-center">
    <div class="text-slate-400 text-sm mb-1">Peak Wind</div>
    <div class="text-2xl font-bold text-slate-100">
      {peakWindSpeed}
      <span class="text-sm font-normal text-slate-400">mph</span>
    </div>
  </div>

  <!-- Peak Gusts -->
  <div class="glass-card p-4 text-center">
    <div class="text-slate-400 text-sm mb-1">Peak Gusts</div>
    <div
      class="text-2xl font-bold {peakWindGust > 31
        ? 'text-yellow-400'
        : 'text-slate-100'}"
    >
      {Math.round(peakWindGust)}
      <span class="text-sm font-normal text-slate-400">mph</span>
    </div>
    <div class="text-xs text-slate-500 mt-1">
      Force {beaufort.scale} · {beaufort.description}
    </div>
  </div>

  <!-- Last Updated -->
  <div class="glass-card p-4 text-center">
    <div class="text-slate-400 text-sm mb-1">Last Updated</div>
    <div class="text-xl font-bold text-slate-100">
      {formatTime(fetchedAt)}
    </div>
    <div class="text-xs text-slate-500 flex items-center justify-center gap-1">
      {formatDate(fetchedAt)}
      {#if cached}
        <span
          class="inline-block w-2 h-2 rounded-full bg-blue-400"
          title="Cached data"
        ></span>
      {:else}
        <span
          class="inline-block w-2 h-2 rounded-full bg-green-400"
          title="Fresh data"
        ></span>
      {/if}
    </div>
  </div>
</div>
