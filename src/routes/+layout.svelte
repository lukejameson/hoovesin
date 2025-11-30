<script lang="ts">
  import favicon from '$lib/assets/favicon.svg';
  import '../app.css';

  let { children } = $props();
</script>

<svelte:head>
  <link rel="icon" href={favicon} />
  <title>Hoovesin - Stables or Paddock?</title>
  <meta
    name="description"
    content="Weather-based decision helper for horse care in Guernsey"
  />
</svelte:head>

<div class="dark min-h-screen bg-slate-900">
  {@render children()}
</div>
