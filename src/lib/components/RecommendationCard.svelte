<script lang="ts">
  interface Props {
    recommendation: 'stables' | 'paddock';
    rainPredicted: boolean;
    windWarning: boolean;
    rainHours: string[];
    peakWindGust: number;
  }

  let {
    recommendation,
    rainPredicted,
    windWarning,
    rainHours,
    peakWindGust,
  }: Props = $props();

  const isStables = $derived(recommendation === 'stables');

  const getSubtitle = $derived(() => {
    if (rainPredicted && rainHours.length > 0) {
      if (rainHours.length <= 3) {
        return `Rain expected ${rainHours.join(', ')}`;
      }
      return `Rain expected ${rainHours[0]} - ${rainHours[rainHours.length - 1]}`;
    }
    if (windWarning && !rainPredicted) {
      return 'High winds but dry conditions';
    }
    return 'Clear overnight conditions expected';
  });
</script>

<div
  class="glass-card p-8 text-center animate-fade-in {isStables
    ? 'pulse-warning'
    : ''}"
>
  <!-- Icon -->
  <div class="text-7xl mb-6">
    {#if isStables}
      🏠
    {:else}
      🐴
    {/if}
  </div>

  <!-- Main Recommendation -->
  <h1
    class="text-4xl md:text-5xl font-bold mb-4 tracking-tight {isStables
      ? 'text-horse-amber'
      : 'text-horse-green'}"
  >
    {#if isStables}
      STABLES TONIGHT
    {:else}
      PADDOCK OK
    {/if}
  </h1>

  <!-- Subtitle -->
  <p class="text-slate-400 text-lg md:text-xl">
    {getSubtitle()}
  </p>

  <!-- Wind Warning Badge -->
  {#if windWarning}
    <div
      class="mt-4 inline-flex items-center gap-2 px-4 py-2 bg-yellow-500/20 text-yellow-400 rounded-full text-sm font-medium"
    >
      <svg
        class="w-4 h-4"
        fill="none"
        stroke="currentColor"
        viewBox="0 0 24 24"
      >
        <path
          stroke-linecap="round"
          stroke-linejoin="round"
          stroke-width="2"
          d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
        />
      </svg>
      Wind Warning: Gusts up to {Math.round(peakWindGust)}mph
    </div>
  {/if}
</div>
