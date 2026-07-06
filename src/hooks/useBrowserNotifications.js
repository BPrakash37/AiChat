import { useEffect, useCallback } from 'react'

export function useBrowserNotifications() {
  useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission()
    }
  }, [])

  const notify = useCallback((title, options = {}) => {
    if (!('Notification' in window)) return
    if (Notification.permission !== 'granted') return
    if (document.hasFocus()) return // don't notify if tab is focused

    const notification = new Notification(title, {
      icon: '/favicon.svg',
      badge: '/favicon.svg',
      ...options,
    })
    notification.onclick = () => {
      window.focus()
      notification.close()
    }
  }, [])

  return { notify }
}
