<script lang="ts">
  interface Props {
    loading: boolean;
    disabled: boolean;
    onclick: () => void;
  }

  let { loading, disabled, onclick }: Props = $props();
</script>

<button
  class="w-full glass-card p-4 flex items-center justify-center gap-3 font-medium transition-all duration-200
    {disabled
    ? 'opacity-50 cursor-not-allowed text-slate-500'
    : 'hover:bg-slate-700/50 text-slate-300 hover:text-slate-100 active:scale-[0.98]'}"
  {disabled}
  {onclick}
>
  <svg
    class="w-5 h-5 {loading ? 'animate-spin' : ''}"
    fill="none"
    stroke="currentColor"
    viewBox="0 0 24 24"
  >
    <path
      stroke-linecap="round"
      stroke-linejoin="round"
      stroke-width="2"
      d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
    />
  </svg>
  {#if loading}
    Refreshing...
  {:else if disabled}
    Refresh available in a few minutes
  {:else}
    Refresh Weather Data
  {/if}
</button>
