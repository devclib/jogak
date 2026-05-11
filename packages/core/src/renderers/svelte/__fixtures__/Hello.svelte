<script>
  let { name = 'world', onPing = () => {} } = $props()
</script>

<div data-testid="hello">Hello {name}</div>
<button data-testid="ping" onclick={onPing}>ping</button>
