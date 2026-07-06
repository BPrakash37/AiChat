import { useEffect, useState } from 'react'
import { MessageSquare } from 'lucide-react'
import { Sidebar } from '../components/chat/Sidebar'
import { ChatWindow } from '../components/chat/ChatWindow'
import { useAuthStore } from '../store/authStore'
import { useChatStore } from '../store/chatStore'
import { usePresence } from '../hooks/usePresence'
import { useBrowserNotifications } from '../hooks/useBrowserNotifications'
import { supabase } from '../lib/supabase'

export function ChatPage() {
  const profile = useAuthStore((s) => s.profile)
  const rooms = useChatStore((s) => s.rooms)
  const loadRooms = useChatStore((s) => s.loadRooms)
  const activeRoomId = useChatStore((s) => s.activeRoomId)
  const setActiveRoom = useChatStore((s) => s.setActiveRoom)
  const unreadCounts = useChatStore((s) => s.unreadCounts)
  const appendMessage = useChatStore((s) => s.appendMessage)
  const loadUnreadCount = useChatStore((s) => s.loadUnreadCount)

  const [mobileShowChat, setMobileShowChat] = useState(false)
  const onlineUsers = usePresence(profile?.id)
  const { notify } = useBrowserNotifications()

  useEffect(() => {
    if (!profile) return
    loadRooms(profile.id)
  }, [profile?.id])

  // Global realtime: listen for new messages in ANY of user's rooms for notifications
  useEffect(() => {
    if (!profile) return

    const roomIds = rooms.map((r) => r.id)
    if (roomIds.length === 0) return

    const channel = supabase
      .channel('global-messages')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        async (payload) => {
          const msg = payload.new
          if (msg.sender_id === profile.id) return
          if (!roomIds.includes(msg.room_id)) return

          // Update unread count if not the active room
          if (msg.room_id !== activeRoomId) {
            loadUnreadCount(msg.room_id, profile.id)

            // Browser push notification
            const { data: senderProfile } = await supabase
              .from('profiles')
              .select('display_name, username')
              .eq('id', msg.sender_id)
              .single()
            const name = senderProfile?.display_name || senderProfile?.username || 'Someone'
            notify(`New message from ${name}`, {
              body: msg.content || '📷 Image',
              tag: msg.room_id,
            })
          }
        }
      )
      .subscribe()

    return () => channel.unsubscribe()
  }, [profile?.id, rooms.length, activeRoomId])

  const activeRoom = rooms.find((r) => r.id === activeRoomId) || null

  const handleSelectRoom = (roomId) => {
    setActiveRoom(roomId)
    setMobileShowChat(true)
  }

  const handleBack = () => {
    setMobileShowChat(false)
    setActiveRoom(null)
  }

  return (
    <div className="flex h-screen bg-[#0f0f14] overflow-hidden">
      {/* Sidebar — hidden on mobile when chat is open */}
      <div className={`${mobileShowChat ? 'hidden md:flex' : 'flex'} w-full md:w-80 flex-shrink-0`}>
        <Sidebar
          rooms={rooms}
          activeRoomId={activeRoomId}
          onSelectRoom={handleSelectRoom}
          onlineUsers={onlineUsers}
          unreadCounts={unreadCounts}
        />
      </div>

      {/* Chat area */}
      <div className={`${mobileShowChat ? 'flex' : 'hidden md:flex'} flex-1 min-w-0`}>
        {activeRoom ? (
          <ChatWindow
            key={activeRoom.id}
            room={activeRoom}
            onlineUsers={onlineUsers}
            onBack={handleBack}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8">
            <div className="w-16 h-16 bg-brand-600/10 rounded-2xl flex items-center justify-center mb-4">
              <MessageSquare size={32} className="text-brand-500" />
            </div>
            <p className="text-slate-400 font-medium">Select a conversation</p>
            <p className="text-sm text-slate-600 mt-1">Choose from your rooms or find someone new</p>
          </div>
        )}
      </div>
    </div>
  )
}
