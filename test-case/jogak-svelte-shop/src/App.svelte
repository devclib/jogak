<script lang="ts">
  import { Router, Route } from 'svelte-routing'
  import ShopLayout from './components/layouts/ShopLayout.svelte'
  import ProductsPage from './pages/ProductsPage.svelte'
  import ProductDetailPage from './pages/ProductDetailPage.svelte'
  import CartPage from './pages/CartPage.svelte'
  import CheckoutPage from './pages/CheckoutPage.svelte'
  import AccountPage from './pages/AccountPage.svelte'
</script>

<Router>
  <ShopLayout>
    {#snippet children()}
      <Route path="/"><ProductsPage /></Route>
      <Route path="/category/:slug" let:params>
        <ProductsPage slug={params.slug ?? ''} />
      </Route>
      <Route path="/product/:slug" let:params>
        <ProductDetailPage slug={params.slug ?? ''} />
      </Route>
      <Route path="/cart"><CartPage /></Route>
      <Route path="/checkout"><CheckoutPage /></Route>
      <Route path="/account"><AccountPage /></Route>
    {/snippet}
  </ShopLayout>
</Router>
