<script setup lang="ts">
import { ref } from 'vue'
import type { Address } from '@jogak-shop/shared'
import AddressForm from './AddressForm.vue'

const props = withDefaults(
  defineProps<{ filled?: boolean; disabled?: boolean }>(),
  { filled: false, disabled: false },
)

const filledAddress: Address = {
  recipient: '홍길동',
  line1: '서울특별시 강남구 테헤란로 123',
  line2: '101동 1001호',
  city: 'Seoul',
  postalCode: '06234',
  country: 'KR',
  phone: '010-1234-5678',
}
const blank: Address = { recipient: '', line1: '', line2: '', city: '', postalCode: '', country: 'KR', phone: '' }
const v = ref<Address>(props.filled ? filledAddress : blank)
</script>

<template>
  <AddressForm :value="v" :disabled="disabled" @update="(a: Address) => v = a" />
</template>
