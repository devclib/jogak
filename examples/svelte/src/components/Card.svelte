<script lang="ts">
  let {
    title = 'Card',
    description = '',
  }: { title?: string; description?: string } = $props()
</script>

<div
  style="width: 320px; padding: 24px; border-radius: 8px; border: 1px solid #e5e7eb; box-shadow: 0 1px 2px rgba(0,0,0,0.05); font-family: system-ui, sans-serif; background: #fff;"
  data-testid="svelte-card"
>
  <h3 style="margin: 0 0 4px; font-size: 16px; font-weight: 600;">{title}</h3>
  {#if description}
    <p style="margin: 0; font-size: 14px; color: #6b7280;">{description}</p>
  {/if}
</div>
