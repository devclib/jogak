import { createRouter, createWebHistory, type RouteRecordRaw } from 'vue-router'

const routes: RouteRecordRaw[] = [
  { path: '/', component: () => import('../pages/ProductsPage.vue') },
  { path: '/category/:slug', component: () => import('../pages/ProductsPage.vue') },
  { path: '/product/:slug', component: () => import('../pages/ProductDetailPage.vue') },
  { path: '/cart', component: () => import('../pages/CartPage.vue') },
  { path: '/checkout', component: () => import('../pages/CheckoutPage.vue') },
  { path: '/account', component: () => import('../pages/AccountPage.vue') },
]

export const router = createRouter({
  history: createWebHistory(),
  routes,
})
