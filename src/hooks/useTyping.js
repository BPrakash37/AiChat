import { useEffect, useRef, useCallback } from 'react'
import { supabase } from '../lib/supabase'
import { TYPING_TIMEOUT_MS } from '../lib/constants'

export function useTyping(roomId, userId, username, onTypingChange) {
  const channelRef = useRef(null)
  const typingTimeoutRef = useRef(null)
  const lastSentRef = useRef(0)

  useEffect(() => {
    if (!roomId) return

    const channel = supabase.channel(`typing:${roomId}`)
    channel
      .on('broadcast', { event: 'typing' }, ({ payload }) => {
        if (payload.userId === userId) return // ignore self
        onTypingChange?.(payload.userId, payload.username, payload.isTyping)
      })
      .subscribe()

    channelRef.current = channel

    return () => {
      channel.unsubscribe()
      clearTimeout(typingTimeoutRef.current)
    }
  }, [roomId, userId])

  const notifyTyping = useCallback(() => {
    if (!channelRef.current) return
    const now = Date.now()

    // Throttle: only send "started typing" once every 2s
    if (now - lastSentRef.current > 2000) {
      channelRef.current.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, username, isTyping: true },
      })
      lastSentRef.current = now
    }

    clearTimeout(typingTimeoutRef.current)
    typingTimeoutRef.current = setTimeout(() => {
      channelRef.current?.send({
        type: 'broadcast',
        event: 'typing',
        payload: { userId, username, isTyping: false },
      })
    }, TYPING_TIMEOUT_MS)
  }, [userId, username])

  const stopTyping = useCallback(() => {
    clearTimeout(typingTimeoutRef.current)
    channelRef.current?.send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, username, isTyping: false },
    })
  }, [userId, username])

  return { notifyTyping, stopTyping }
}
