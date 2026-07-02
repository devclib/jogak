/**
 * @jogak/codemod — Storybook CSF3 (.stories.tsx) → jogak entry (.jogak.tsx) 변환.
 *
 * 사용법 (CLI):
 * ```bash
 * npx @jogak/codemod src/**\/*.stories.tsx
 * ```
 *
 * 사용법 (프로그래밍):
 * ```ts
 * import { transformSource } from '@jogak/codemod'
 * const { source, changes } = transformSource(await readFile('Button.stories.tsx', 'utf8'))
 * ```
 */

export { transformSource, type TransformOptions, type TransformResult } from './transform.js'
