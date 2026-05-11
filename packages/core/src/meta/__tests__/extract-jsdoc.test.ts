/**
 * 알파.12: JSDoc description + defaultValue 추출 단위 테스트.
 *
 * extractFromSourceFile를 직접 호출 (자식 프로세스 격리 없이 in-process).
 * ts-morph Project를 인메모리로 구성 — 디스크 fixture 불필요.
 */
import { describe, expect, it } from 'vitest'
import { Project } from 'ts-morph'
import { extractFromSourceFile } from '../extract-core.js'

function extract(source: string): Record<string, unknown> {
  const project = new Project({
    useInMemoryFileSystem: true,
    compilerOptions: { jsx: 4 /* ReactJSX */, target: 99, module: 99 },
  })
  const file = project.createSourceFile('test.tsx', source)
  return extractFromSourceFile(file)
}

describe('extractFromSourceFile — JSDoc description + defaultValue (알파.12)', () => {
  it('Props 인터페이스의 JSDoc description을 추출한다', () => {
    const result = extract(`
      interface Props {
        /** 표시할 텍스트. */
        label: string
      }
      function Comp(props: Props) { return null as any }
      export default { title: 'X', component: Comp }
    `)
    expect(result['label']).toMatchObject({
      type: 'string',
      description: '표시할 텍스트.',
    })
  })

  it('@default JSDoc 태그에서 string literal default를 추출한다', () => {
    const result = extract(`
      interface Props {
        /**
         * variant.
         * @default 'primary'
         */
        variant?: 'primary' | 'secondary'
      }
      function Comp(props: Props) { return null as any }
      export default { title: 'X', component: Comp }
    `)
    expect(result['variant']).toMatchObject({
      defaultValue: 'primary',
      description: 'variant.',
    })
  })

  it('@default JSDoc 태그에서 number/boolean default를 파싱한다', () => {
    const result = extract(`
      interface Props {
        /** @default 42 */
        size?: number
        /** @default true */
        disabled?: boolean
      }
      function Comp(props: Props) { return null as any }
      export default { title: 'X', component: Comp }
    `)
    expect(result['size']).toMatchObject({ defaultValue: 42 })
    expect(result['disabled']).toMatchObject({ defaultValue: true })
  })

  it('함수 매개변수 destructure default를 fallback으로 사용한다', () => {
    const result = extract(`
      interface Props {
        variant?: 'a' | 'b'
        count?: number
      }
      function Comp({ variant = 'a', count = 10 }: Props) { return null as any }
      export default { title: 'X', component: Comp }
    `)
    expect(result['variant']).toMatchObject({ defaultValue: 'a' })
    expect(result['count']).toMatchObject({ defaultValue: 10 })
  })

  it('@default 태그가 destructure default보다 우선한다', () => {
    const result = extract(`
      interface Props {
        /** @default 'tag-wins' */
        variant?: string
      }
      function Comp({ variant = 'destructure-loses' }: Props) { return null as any }
      export default { title: 'X', component: Comp }
    `)
    expect(result['variant']).toMatchObject({ defaultValue: 'tag-wins' })
  })

  it('JSDoc이 없으면 description/defaultValue 모두 미설정', () => {
    const result = extract(`
      interface Props { name: string }
      function Comp(props: Props) { return null as any }
      export default { title: 'X', component: Comp }
    `)
    expect(result['name']).toBeDefined()
    expect((result['name'] as Record<string, unknown>)['description']).toBeUndefined()
    expect((result['name'] as Record<string, unknown>)['defaultValue']).toBeUndefined()
  })

  it('multi-line JSDoc 본문을 하나의 description으로 합산한다', () => {
    const result = extract(`
      interface Props {
        /**
         * 첫 번째 줄.
         * 두 번째 줄.
         */
        text: string
      }
      function Comp(props: Props) { return null as any }
      export default { title: 'X', component: Comp }
    `)
    const desc = (result['text'] as Record<string, unknown>)['description'] as string
    expect(desc).toContain('첫 번째 줄.')
    expect(desc).toContain('두 번째 줄.')
  })
})
