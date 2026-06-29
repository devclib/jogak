import type { ReactElement } from 'react'

export interface ProductImageProps {
  readonly color: string
  readonly label: string
  readonly aspect?: 'square' | 'portrait' | 'landscape'
  readonly rounded?: 'none' | 'sm' | 'md' | 'lg'
}

const aspectMap = { square: 'aspect-square', portrait: 'aspect-[3/4]', landscape: 'aspect-[4/3]' }
const roundedMap = { none: '', sm: 'rounded', md: 'rounded-md', lg: 'rounded-xl' }

/**
 * 정적 이미지 대신 색상 블록 + 두문자 라벨로 mock thumbnail 표현.
 * 실제 이미지 호스팅 없이 디자인 검증용.
 */
export function ProductImage({
  color,
  label,
  aspect = 'square',
  rounded = 'md',
}: ProductImageProps): ReactElement {
  const initials = label
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0] ?? '')
    .join('')
    .toUpperCase()
  return (
    <div
      className={`flex items-center justify-center ${aspectMap[aspect]} ${roundedMap[rounded]} text-white font-semibold tracking-tight select-none`}
      style={{ background: color }}
      aria-label={label}
    >
      <span className="text-2xl drop-shadow">{initials || '◆'}</span>
    </div>
  )
}
