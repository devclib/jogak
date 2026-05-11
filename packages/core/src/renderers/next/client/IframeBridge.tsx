'use client'

import { useEffect } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'

/**
 * 알파.13: jogak preview의 RSC 모드 bridge (client component).
 *
 * 흐름:
 * 1. mount 시 부모(jogak SPA)에 `jogak:ready` 전송.
 * 2. 부모로부터 `jogak:setProps` 수신 시 `router.replace`로 URL searchParams 갱신
 *    (`?entryId=<id>&args=<json>`) → Next.js가 server component 재실행.
 * 3. searchParams가 갱신될 때마다 부모에 `jogak:rendered` 전송 (server-render 완료 신호).
 *
 * UI/IframeMount는 변경 없이 동일 postMessage 프로토콜 그대로 사용한다.
 * Bridge가 router.replace로 navigate를 일으키므로 사용자 컴포넌트가 server component여도
 * 새 args로 서버에서 다시 렌더된다.
 */
export function JogakIframeBridge(): null {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const handler = (event: MessageEvent): void => {
      const data = event.data as { type?: unknown; entryId?: unknown; args?: unknown } | null
      if (data === null || typeof data !== 'object') return
      if (data.type === 'jogak:setProps') {
        const entryId = String(data.entryId ?? '')
        if (entryId === '') return
        const args =
          data.args !== undefined && data.args !== null
            ? JSON.stringify(data.args as Record<string, unknown>)
            : '{}'
        const params = new URLSearchParams()
        params.set('entryId', entryId)
        params.set('args', args)
        // soft navigation → server component 재실행. scroll/focus 보존.
        router.replace(`?${params.toString()}`, { scroll: false })
      } else if (data.type === 'jogak:unmount') {
        // RSC 모드에서는 unmount 시 root URL로 navigate (entry 미지정 상태)
        router.replace('?', { scroll: false })
      }
    }
    window.addEventListener('message', handler)
    // 첫 mount 시 부모에 ready 전송. 부모(IframeMount)는 이후 setProps 전송.
    window.parent.postMessage({ type: 'jogak:ready' }, '*')
    return () => {
      window.removeEventListener('message', handler)
    }
  }, [router])

  // searchParams 변경 후 server-render가 끝나면 (이 client component가 다시 평가됨)
  // 부모에 rendered 신호 전송.
  useEffect(() => {
    const entryId = searchParams.get('entryId')
    if (entryId !== null && entryId !== '') {
      window.parent.postMessage({ type: 'jogak:rendered', entryId }, '*')
    }
  }, [searchParams])

  return null
}
