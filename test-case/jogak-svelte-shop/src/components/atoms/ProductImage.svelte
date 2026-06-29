<script lang="ts">
  let {
    color,
    label,
    aspect = 'square' as 'square' | 'portrait' | 'landscape',
    rounded = 'md' as 'none' | 'sm' | 'md' | 'lg',
  }: {
    color: string
    label: string
    aspect?: 'square' | 'portrait' | 'landscape'
    rounded?: 'none' | 'sm' | 'md' | 'lg'
  } = $props()

  const aspectMap = { square: 'aspect-square', portrait: 'aspect-[3/4]', landscape: 'aspect-[4/3]' }
  const roundedMap = { none: '', sm: 'rounded', md: 'rounded-md', lg: 'rounded-xl' }

  let initials = $derived(
    label.split(/\s+/).slice(0, 2).map((w) => w[0] ?? '').join('').toUpperCase(),
  )
</script>

<div
  class="flex items-center justify-center text-white font-semibold tracking-tight select-none {aspectMap[aspect]} {roundedMap[rounded]}"
  style:background={color}
  aria-label={label}
>
  <span class="text-2xl drop-shadow">{initials || '◆'}</span>
</div>
