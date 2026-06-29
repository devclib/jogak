<script lang="ts">
  import type { Address } from '@jogak-shop/shared'

  let {
    value,
    disabled = false,
    onupdate,
  }: { value: Address; disabled?: boolean; onupdate: (next: Address) => void } = $props()

  interface FieldDef {
    key: keyof Address
    label: string
    placeholder: string
    span?: 'full' | 'half'
  }

  const fields: readonly FieldDef[] = [
    { key: 'recipient', label: '수령인', placeholder: '홍길동', span: 'half' },
    { key: 'phone', label: '연락처', placeholder: '010-0000-0000', span: 'half' },
    { key: 'line1', label: '주소 1', placeholder: '서울특별시 ...', span: 'full' },
    { key: 'line2', label: '상세 주소', placeholder: '101동 1001호', span: 'full' },
    { key: 'city', label: '도시', placeholder: 'Seoul', span: 'half' },
    { key: 'postalCode', label: '우편번호', placeholder: '06000', span: 'half' },
    { key: 'country', label: '국가', placeholder: 'KR', span: 'full' },
  ]

  function update(key: keyof Address, e: Event): void {
    onupdate({ ...value, [key]: (e.target as HTMLInputElement).value })
  }
</script>

<div class="grid grid-cols-2 gap-3">
  {#each fields as f}
    <label class="flex flex-col gap-1 {f.span === 'full' ? 'col-span-2' : ''}">
      <span class="text-xs font-medium text-ink-600">{f.label}</span>
      <input
        type="text"
        value={value[f.key]}
        placeholder={f.placeholder}
        {disabled}
        class="h-10 px-3 rounded-md border border-ink-200 bg-white text-sm focus:outline-none focus:border-brand-500 disabled:bg-ink-100"
        oninput={(e) => update(f.key, e)}
      />
    </label>
  {/each}
</div>
