<script lang="ts">
  import { untrack } from 'svelte'

  let {
    initial = 0,
    step = 1,
    label = 'count',
  }: { initial?: number; step?: number; label?: string } = $props()

  // initial 프롭은 최초 1회만 사용 — 이후 사용자 클릭으로 mutate.
  // 직접 $state(initial)은 svelte5 state_referenced_locally 경고를 유발하므로
  // untrack으로 의도를 명시한다.
  let value = $state(untrack(() => initial))
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
