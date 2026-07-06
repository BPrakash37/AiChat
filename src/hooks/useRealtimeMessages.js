import { useEffect } from 'react'
import { supabase } from '../lib/supabase'
import { useChatStore } from '../store/chatStore'

/**
 * Subscribes to INSERT events on the messages table for a given room
 * and appends new messages to the store in real time.
 */
export function useRealtimeMessages(roomId) {
  const appendMessage = useChatStore((s) => s.appendMessage)

  useEffect(() => {
    if (!roomId) return

    const channel = supabase
      .channel(`messages:${roomId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        async (payload) => {
          // Fetch sender profile for display
          const { data: profile } = await supabase
            .from('profiles')
            .select('id, username, display_name')
            .eq('id', payload.new.sender_id)
            .single()

          appendMessage({ ...payload.new, profiles: profile })
        }
      )
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'messages', filter: `room_id=eq.${roomId}` },
        (payload) => {
          useChatStore.setState((state) => {
            const msgs = state.messages[roomId] || []
            const updated = msgs.map((m) => (m.id === payload.new.id ? { ...m, ...payload.new } : m))
            return { messages: { ...state.messages, [roomId]: updated } }
          })
        }
      )
      .subscribe()

    return () => {
      channel.unsubscribe()
    }
  }, [roomId, appendMessage])
}
