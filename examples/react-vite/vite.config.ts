import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
// 1.1.0 post-1.0: MDX docs addon — jogak preview 툴바 [component | docs] toggle
// 클릭 시 iframe이 사용자 vite scope로 .mdx 파일을 dynamic import한다. 컴파일러는
// 아래 rollup plugin이 담당. 미설치 시 preview는 error 메시지 표시.
import mdx from '@mdx-js/rollup'

export default defineConfig({
  plugins: [{ enforce: 'pre', ...mdx() }, react(), tailwindcss()],
})
