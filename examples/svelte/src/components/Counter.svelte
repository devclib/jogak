<script lang="ts">
  let {
    initial = 0,
    step = 1,
    label = 'count',
  }: { initial?: number; step?: number; label?: string } = $props()

  let value = $state(initial)
</script>

<div
  style="display: inline-flex; align-items: center; gap: 8px; padding: 8px; border: 1px solid #e5e7eb; border-radius: 6px; font-family: system-ui, sans-serif;"
  data-testid="svelte-counter"
>
  <button
    type="button"
    onclick={() => (value -= step)}
    style="height: 32px; width: 32px; background: #f1f5f9; border: none; border-radius: 4px; cursor: pointer;"
    aria-label="decrement"
  >
    −
  </button>
  <span style="min-width: 64px; text-align: center; font-size: 14px;">
    {label}: <strong>{value}</strong>
  </span>
  <button
    type="button"
    onclick={() => (value += step)}
    style="height: 32px; width: 32px; background: #0f172a; color: #fff; border: none; border-radius: 4px; cursor: pointer;"
    aria-label="increment"
  >
    +
  </button>
</div>
