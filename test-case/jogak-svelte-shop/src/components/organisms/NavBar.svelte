<script lang="ts">
  import { Link } from 'svelte-routing'
  import Badge from '../atoms/Badge.svelte'

  let {
    cartCount,
    userInitial = 'U',
    siteName = 'jogak shop',
  }: { cartCount: number; userInitial?: string; siteName?: string } = $props()

  const navLinks: readonly { to: string; label: string }[] = [
    { to: '/', label: '전체' },
    { to: '/category/apparel', label: 'Apparel' },
    { to: '/category/tech', label: 'Tech' },
    { to: '/category/home', label: 'Home' },
    { to: '/category/beauty', label: 'Beauty' },
    { to: '/category/sports', label: 'Sports' },
  ]

  let pathname = $state(typeof window !== 'undefined' ? window.location.pathname : '/')

  $effect(() => {
    const onpop = (): void => { pathname = window.location.pathname }
    window.addEventListener('popstate', onpop)
    return (): void => { window.removeEventListener('popstate', onpop) }
  })

  function isActive(to: string): boolean {
    return to === '/' ? pathname === '/' : pathname.startsWith(to)
  }
</script>

<header class="sticky top-0 z-10 bg-white border-b border-ink-100">
  <div class="max-w-6xl mx-auto h-14 px-4 flex items-center gap-6">
    <Link to="/" class="font-bold text-ink-900 tracking-tight">{siteName}</Link>
    <nav class="hidden md:flex items-center gap-1 flex-1">
      {#each navLinks as l}
        <Link
          to={l.to}
          class="px-3 h-9 inline-flex items-center text-sm rounded-md transition-colors {isActive(l.to) ? 'text-brand-700 bg-brand-50 font-medium' : 'text-ink-600 hover:text-ink-900 hover:bg-ink-100'}"
        >{l.label}</Link>
      {/each}
    </nav>
    <Link to="/cart" class="relative inline-flex items-center gap-2 text-sm text-ink-900 hover:text-brand-600">
      <span>🛒</span>
      {#if cartCount > 0}<Badge tone="danger" label={String(cartCount)} />{/if}
    </Link>
    <Link
      to="/account"
      class="h-9 w-9 inline-flex items-center justify-center rounded-full bg-ink-100 text-ink-900 font-medium hover:bg-ink-200"
      aria-label="account"
    >{userInitial}</Link>
  </div>
</header>
