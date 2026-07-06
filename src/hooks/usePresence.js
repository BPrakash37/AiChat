import { useEffect, useRef, useState } from 'react'
import { supabase } from '../lib/supabase'

/**
 * Tracks the current user's online presence using Supabase Realtime Presence,
 * and exposes a map of { userId: { online, last_seen } } for everyone in the channel.
 */
export function usePresence(userId) {
  const [onlineUsers, setOnlineUsers] = useState({})
  const channelRef = useRef(null)
  const heartbeatRef = useRef(null)

  useEffect(() => {
    if (!userId) return

    const channel = supabase.channel('presence:global', {
      config: { presence: { key: userId } },
    })

    channel
      .on('presence', { event: 'sync' }, () => {
        const state = channel.presenceState()
        const map = {}
        Object.entries(state).forEach(([uid, presences]) => {
          map[uid] = { online: true, ...presences[0] }
        })
        setOnlineUsers(map)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ user_id: userId, online_at: new Date().toISOString() })
        }
      })

    channelRef.current = channel

    // Heartbeat: update last_seen every 30s while tab is open
    heartbeatRef.current = setInterval(async () => {
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString(), is_online: true })
        .eq('id', userId)
    }, 30_000)

    const handleBeforeUnload = () => {
      supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', userId)
    }
    window.addEventListener('beforeunload', handleBeforeUnload)

    return () => {
      clearInterval(heartbeatRef.current)
      window.removeEventListener('beforeunload', handleBeforeUnload)
      supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', userId)
      channel.unsubscribe()
    }
  }, [userId])

  return onlineUsers
}
