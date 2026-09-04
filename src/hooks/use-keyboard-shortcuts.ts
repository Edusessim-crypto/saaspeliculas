'use client'

import { useEffect } from 'react'

/**
 * Atalhos de desktop. Ignora quando o foco esta em um campo de texto,
 * para nao atrapalhar a digitacao (§81).
 */
export function useKeyboardShortcut(
  key: string,
  handler: () => void,
  enabled = true,
) {
  useEffect(() => {
    if (!enabled) return

    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      const typing =
        target?.tagName === 'INPUT' ||
        target?.tagName === 'TEXTAREA' ||
        target?.isContentEditable

      if (typing || event.metaKey || event.ctrlKey || event.altKey) return
      if (event.key.toLowerCase() !== key.toLowerCase()) return

      event.preventDefault()
      handler()
    }

    window.addEventListener('keydown', onKeyDown)
    return () => window.removeEventListener('keydown', onKeyDown)
  }, [key, handler, enabled])
}
