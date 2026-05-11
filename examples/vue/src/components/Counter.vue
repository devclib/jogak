<script setup lang="ts">
import { ref } from 'vue'

const props = withDefaults(
  defineProps<{
    /** 초기값 */
    initial?: number
    /** 증감 단위 */
    step?: number
    /** 라벨 */
    label?: string
  }>(),
  { initial: 0, step: 1, label: 'count' },
)

const value = ref(props.initial)
</script>

<template>
  <div
    :style="{
      display: 'inline-flex',
      alignItems: 'center',
      gap: '8px',
      padding: '8px',
      border: '1px solid #e5e7eb',
      borderRadius: '6px',
      fontFamily: 'system-ui, sans-serif',
    }"
    data-testid="vue-counter"
  >
    <button
      type="button"
      @click="value -= step"
      :style="{
        height: '32px',
        width: '32px',
        background: '#f1f5f9',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }"
      aria-label="decrement"
    >
      −
    </button>
    <span :style="{ minWidth: '64px', textAlign: 'center', fontSize: '14px' }">
      {{ label }}: <strong>{{ value }}</strong>
    </span>
    <button
      type="button"
      @click="value += step"
      :style="{
        height: '32px',
        width: '32px',
        background: '#0f172a',
        color: '#fff',
        border: 'none',
        borderRadius: '4px',
        cursor: 'pointer',
      }"
      aria-label="increment"
    >
      +
    </button>
  </div>
</template>
