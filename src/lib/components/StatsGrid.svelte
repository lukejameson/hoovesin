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
      <span class="text-sm font-normal text-slate-400">km/h</span>
    </div>
  </div>

  <!-- Peak Gusts -->
  <div class="glass-card p-4 text-center">
    <div class="text-slate-400 text-sm mb-1">Peak Gusts</div>
    <div
      class="text-2xl font-bold {peakWindGust > 50
        ? 'text-yellow-400'
        : 'text-slate-100'}"
    >
      {peakWindGust}
      <span class="text-sm font-normal text-slate-400">km/h</span>
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
