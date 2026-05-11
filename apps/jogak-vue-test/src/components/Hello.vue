<script setup lang="ts">
defineProps<{
  /** 인사 대상 이름 */
  name?: string
}>()
</script>

<template>
  <div data-testid="vue-hello">Hello {{ name ?? 'world' }} (vue)</div>
</template>
