<script lang="ts">
  let { name = 'world' }: { name?: string } = $props()
</script>

<div data-testid="svelte-hello">Hello {name} (svelte)</div>
