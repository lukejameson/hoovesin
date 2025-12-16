<script lang="ts">
  import type { HorseHardiness } from '$lib/server/weather';

  interface Props {
    recommendation: 'stables' | 'paddock';
    rainPredicted: boolean;
    windWarning: boolean;
    rainHours: string[];
    peakWindGust: number;
    hardiness: HorseHardiness;
    onHardinessChange: (hardiness: HorseHardiness) => void;
  }

  let {
    recommendation,
    rainPredicted,
    windWarning,
    rainHours,
    peakWindGust,
    hardiness,
    onHardinessChange,
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

  const hardinessOptions: { value: HorseHardiness; label: string; emoji: string }[] = [
    { value: 'hardy', label: 'Hardy', emoji: '💪' },
    { value: 'normal', label: 'Normal', emoji: '🐴' },
    { value: 'soft', label: 'Soft', emoji: '🌸' },
  ];

  const currentOption = $derived(hardinessOptions.find(o => o.value === hardiness) || hardinessOptions[1]);
</script>

<div
  class="glass-card p-8 text-center animate-fade-in relative {isStables
    ? 'pulse-warning'
    : ''}"
>
  <!-- Hardiness Dropdown (top right) -->
  <div class="absolute top-3 right-3">
    <select
      class="bg-slate-700/50 border border-slate-600 rounded-lg px-2 py-1 text-xs text-slate-300 cursor-pointer hover:bg-slate-600/50 transition-colors appearance-none pr-6"
      style="background-image: url('data:image/svg+xml;charset=US-ASCII,%3Csvg%20xmlns%3D%22http%3A//www.w3.org/2000/svg%22%20width%3D%2212%22%20height%3D%2212%22%20viewBox%3D%220%200%2024%2024%22%20fill%3D%22none%22%20stroke%3D%22%2394a3b8%22%20stroke-width%3D%222%22%3E%3Cpath%20d%3D%22M6%209l6%206%206-6%22/%3E%3C/svg%3E'); background-repeat: no-repeat; background-position: right 0.3rem center;"
      value={hardiness}
      onchange={(e) => onHardinessChange(e.currentTarget.value as HorseHardiness)}
    >
      {#each hardinessOptions as option}
        <option value={option.value}>{option.emoji} {option.label}</option>
      {/each}
    </select>
  </div>

  <!-- Icon -->
  <div class="text-7xl mb-6">
    {#if isStables}
      🏠
    {:else}
      🐎
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
