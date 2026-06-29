<script lang="ts">
  import type { Address } from '@jogak-shop/shared'
  import AddressForm from './AddressForm.svelte'

  let {
    filled = false,
    disabled = false,
  }: { filled?: boolean; disabled?: boolean } = $props()

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
  let v = $state<Address>(filled ? filledAddress : blank)
</script>

<AddressForm value={v} {disabled} onupdate={(a) => (v = a)} />
