<script setup lang="ts">
import { useRoute } from 'vue-router'
import type { CategorySlug } from '@jogak-shop/shared'
import IndexPage from '~/pages/index.vue'

const route = useRoute()
const slug = route.params.slug as CategorySlug
</script>

<template>
  <IndexPage :slug="slug" />
</template>
