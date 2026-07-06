import { useEffect, useRef, useState, useCallback, useMemo } from 'react'
import { Search as SearchIcon, Users, ArrowLeft, MoreVertical } from 'lucide-react'
import { Avatar } from '../shared/Avatar'
import { MessageBubble } from './MessageBubble'
import { DateDivider } from './DateDivider'
import { MessageInput } from './MessageInput'
import { TypingIndicator } from './TypingIndicator'
import { MessageSearchPanel } from './MessageSearchPanel'
import { ManageMembersModal } from './ManageMembersModal'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'
import { useRealtimeMessages } from '../../hooks/useRealtimeMessages'
import { useTyping } from '../../hooks/useTyping'
import { isSameDay } from '../../lib/utils'

export function ChatWindow({ room, onlineUsers, onBack }) {
  const profile = useAuthStore((s) => s.profile)
  const messages = useChatStore((s) => s.messages[room.id] || [])
  const hasMore = useChatStore((s) => s.hasMore[room.id])
  const loadMessages = useChatStore((s) => s.loadMessages)
  const sendMessage = useChatStore((s) => s.sendMessage)
  const markRoomRead = useChatStore((s) => s.markRoomRead)
  const typingUsersMap = useChatStore((s) => s.typingUsers[room.id] || {})
  const setTypingUsers = useChatStore((s) => s.setTypingUsers)

  const [showSearch, setShowSearch] = useState(false)
  const [showMembers, setShowMembers] = useState(false)
  const [loadingMore, setLoadingMore] = useState(false)
  const scrollRef = useRef(null)
  const bottomRef = useRef(null)
  const isInitialLoad = useRef(true)

  useRealtimeMessages(room.id)

  const { notifyTyping, stopTyping } = useTyping(
    room.id,
    profile.id,
    profile.display_name || profile.username,
    (userId, username, isTyping) => setTypingUsers(room.id, userId, username, isTyping)
  )

  const isDirect = room.type === 'direct'
  const otherMember = isDirect
    ? room.room_members?.find((m) => m.user_id !== profile.id)?.profiles
    : null
  const headerName = isDirect ? (otherMember?.display_name || otherMember?.username) : room.name
  const isOnline = isDirect && otherMember ? !!onlineUsers[otherMember.id] : false
  const isCreator = room.created_by === profile.id

  useEffect(() => {
    isInitialLoad.current = true
    loadMessages(room.id).then(() => {
      setTimeout(() => {
        bottomRef.current?.scrollIntoView({ behavior: 'auto' })
        isInitialLoad.current = false
      }, 50)
    })
  }, [room.id])

  useEffect(() => {
    if (!isInitialLoad.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' })
      markRoomRead(room.id)
    }
  }, [messages.length])

  const handleScroll = useCallback(async () => {
    const el = scrollRef.current
    if (!el || loadingMore || !hasMore) return
    if (el.scrollTop < 100) {
      setLoadingMore(true)
      const prevHeight = el.scrollHeight
      const oldest = messages[0]?.created_at
      await loadMessages(room.id, oldest)
      requestAnimationFrame(() => {
        el.scrollTop = el.scrollHeight - prevHeight
      })
      setLoadingMore(false)
    }
  }, [room.id, messages, hasMore, loadingMore])

  const handleSend = async (text, imageFile) => {
    await sendMessage(room.id, profile.id, text, imageFile)
  }

  const typingNames = Object.values(typingUsersMap)

  const groupedMessages = useMemo(() => {
    return messages.map((msg, i) => {
      const prev = messages[i - 1]
      const showDateDivider = !prev || !isSameDay(prev.created_at, msg.created_at)
      const showAvatar = !prev || prev.sender_id !== msg.sender_id || showDateDivider
      return { msg, showDateDivider, showAvatar }
    })
  }, [messages])

  return (
    <div className="flex-1 flex flex-col h-full relative bg-[#0f0f14]">
      {showSearch && (
        <MessageSearchPanel
          roomId={room.id}
          onClose={() => setShowSearch(false)}
          onJumpToMessage={() => setShowSearch(false)}
        />
      )}

      {/* Header */}
      <div className="flex items-center gap-3 p-4 border-b border-white/10 flex-shrink-0">
        <button onClick={onBack} className="md:hidden p-1 hover:bg-white/10 rounded-lg">
          <ArrowLeft size={18} className="text-slate-400" />
        </button>
        <Avatar username={headerName} showOnline={isDirect} isOnline={isOnline} />
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-slate-100 truncate">{headerName}</p>
          <p className="text-xs text-slate-500">
            {isDirect
              ? (isOnline ? 'Online' : 'Offline')
              : `${room.room_members?.filter((m) => !m.is_removed).length || 0} members`}
          </p>
        </div>
        <button onClick={() => setShowSearch(true)} className="p-2 hover:bg-white/10 rounded-lg">
          <SearchIcon size={17} className="text-slate-400" />
        </button>
        {!isDirect && (
          <button onClick={() => setShowMembers(true)} className="p-2 hover:bg-white/10 rounded-lg">
            <Users size={17} className="text-slate-400" />
          </button>
        )}
      </div>

      {/* Messages */}
      <div ref={scrollRef} onScroll={handleScroll} className="flex-1 overflow-y-auto px-4 py-3 space-y-1.5">
        {loadingMore && (
          <div className="text-center py-2">
            <div className="w-5 h-5 border-2 border-white/20 border-t-brand-500 rounded-full animate-spin mx-auto" />
          </div>
        )}
        {messages.length === 0 && (
          <div className="flex flex-col items-center justify-center h-full text-center">
            <p className="text-sm text-slate-500">No messages yet. Say hello 👋</p>
          </div>
        )}
        {groupedMessages.map(({ msg, showDateDivider, showAvatar }) => (
          <div key={msg.id}>
            {showDateDivider && <DateDivider date={msg.created_at} />}
            <MessageBubble
              message={msg}
              isMine={msg.sender_id === profile.id}
              showAvatar={showAvatar}
              isRead={(msg.read_by || []).length > 1}
              isGroup={!isDirect}
            />
          </div>
        ))}
        <div ref={bottomRef} />
      </div>

      <TypingIndicator usernames={typingNames} />

      <MessageInput
        onSend={handleSend}
        onTyping={notifyTyping}
        onStopTyping={stopTyping}
      />

      <ManageMembersModal isOpen={showMembers} onClose={() => setShowMembers(false)} room={room} />
    </div>
  )
}
