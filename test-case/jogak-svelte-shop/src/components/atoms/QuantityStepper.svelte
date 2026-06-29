<script lang="ts">
  let {
    value,
    min = 1,
    max = 99,
    size = 'md' as 'sm' | 'md',
    onchange,
  }: {
    value: number
    min?: number
    max?: number
    size?: 'sm' | 'md'
    onchange: (next: number) => void
  } = $props()

  const sizeMap = {
    sm: { btn: 'h-7 w-7 text-sm', input: 'h-7 w-10 text-sm' },
    md: { btn: 'h-9 w-9 text-base', input: 'h-9 w-12 text-base' },
  }

  function clamp(n: number): number {
    return Math.max(min, Math.min(max, n))
  }
  function dec(): void { onchange(clamp(value - 1)) }
  function inc(): void { onchange(clamp(value + 1)) }
  function onInput(e: Event): void {
    const n = Number((e.target as HTMLInputElement).value)
    if (Number.isFinite(n)) onchange(clamp(n))
  }
</script>

<div class="inline-flex items-center rounded-md border border-ink-200 bg-white">
  <button
    type="button"
    class="{sizeMap[size].btn} flex items-center justify-center text-ink-900 hover:bg-ink-100 disabled:text-ink-400 disabled:cursor-not-allowed"
    disabled={value <= min}
    aria-label="quantity-decrement"
    onclick={dec}
  >−</button>
  <input
    type="number"
    {value}
    {min}
    {max}
    class="{sizeMap[size].input} border-x border-ink-200 text-center font-medium tabular-nums focus:outline-none [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
    oninput={onInput}
  />
  <button
    type="button"
    class="{sizeMap[size].btn} flex items-center justify-center text-ink-900 hover:bg-ink-100 disabled:text-ink-400 disabled:cursor-not-allowed"
    disabled={value >= max}
    aria-label="quantity-increment"
    onclick={inc}
  >＋</button>
</div>
