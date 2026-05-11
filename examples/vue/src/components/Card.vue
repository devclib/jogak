<script setup lang="ts">
withDefaults(
  defineProps<{
    /** 제목 */
    title?: string
    /** 설명 */
    description?: string
  }>(),
  { title: 'Card', description: '' },
)
</script>

<template>
  <div
    :style="{
      width: '320px',
      padding: '24px',
      borderRadius: '8px',
      border: '1px solid #e5e7eb',
      boxShadow: '0 1px 2px rgba(0,0,0,0.05)',
      fontFamily: 'system-ui, sans-serif',
      background: '#fff',
    }"
    data-testid="vue-card"
  >
    <h3 :style="{ margin: '0 0 4px', fontSize: '16px', fontWeight: 600 }">{{ title }}</h3>
    <p v-if="description" :style="{ margin: 0, fontSize: '14px', color: '#6b7280' }">
      {{ description }}
    </p>
  </div>
</template>
