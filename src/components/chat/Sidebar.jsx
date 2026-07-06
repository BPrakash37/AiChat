import { useState } from 'react'
import { Link } from 'react-router-dom'
import { Search, Users, LogOut, Shield, MessageSquare } from 'lucide-react'
import { Avatar } from '../shared/Avatar'
import { RoomListItem } from './RoomListItem'
import { UserSearchModal } from './UserSearchModal'
import { CreateRoomModal } from './CreateRoomModal'
import { useAuthStore } from '../../store/authStore'
import { useChatStore } from '../../store/chatStore'

export function Sidebar({ rooms, activeRoomId, onSelectRoom, onlineUsers, unreadCounts }) {
  const profile = useAuthStore((s) => s.profile)
  const isAdmin = useAuthStore((s) => s.isAdmin)
  const logout = useAuthStore((s) => s.logout)
  const setActiveRoom = useChatStore((s) => s.setActiveRoom)
  const [showUserSearch, setShowUserSearch] = useState(false)
  const [showCreateRoom, setShowCreateRoom] = useState(false)

  const handleRoomCreated = (roomId) => {
    setActiveRoom(roomId)
    onSelectRoom(roomId)
  }

  return (
    <div className="w-full md:w-80 flex flex-col h-full border-r border-white/10 bg-[#0f0f14] flex-shrink-0">
      {/* Header */}
      <div className="p-4 border-b border-white/10 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 bg-brand-600 rounded-xl flex items-center justify-center">
            <MessageSquare size={16} className="text-white" />
          </div>
          <span className="font-bold text-slate-100">ChatSpace</span>
        </div>
        <div className="flex items-center gap-1">
          {isAdmin && (
            <Link to="/admin" className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Admin panel">
              <Shield size={17} className="text-amber-400" />
            </Link>
          )}
          <button onClick={logout} className="p-2 hover:bg-white/10 rounded-lg transition-colors" title="Sign out">
            <LogOut size={17} className="text-slate-400" />
          </button>
        </div>
      </div>

      {/* Actions */}
      <div className="p-3 flex gap-2">
        <button onClick={() => setShowUserSearch(true)} className="btn-ghost flex-1 justify-center text-sm">
          <Search size={15} /> Find user
        </button>
        <button onClick={() => setShowCreateRoom(true)} className="btn-ghost flex-1 justify-center text-sm">
          <Users size={15} /> New room
        </button>
      </div>

      {/* Room list */}
      <div className="flex-1 overflow-y-auto px-2 pb-2 space-y-0.5">
        {rooms.length === 0 && (
          <p className="text-sm text-slate-600 text-center mt-8 px-4">
            No conversations yet. Find a user or create a room to get started.
          </p>
        )}
        {rooms.map((room) => (
          <RoomListItem
            key={room.id}
            room={room}
            currentUserId={profile.id}
            isActive={room.id === activeRoomId}
            onlineUsers={onlineUsers}
            unreadCount={unreadCounts[room.id] || 0}
            onClick={() => { setActiveRoom(room.id); onSelectRoom(room.id) }}
          />
        ))}
      </div>

      {/* Current user footer */}
      <div className="p-3 border-t border-white/10 flex items-center gap-2.5">
        <Avatar username={profile.display_name || profile.username} size="sm" showOnline isOnline />
        <div className="min-w-0">
          <p className="text-sm font-medium text-slate-200 truncate">{profile.display_name || profile.username}</p>
          <p className="text-xs text-slate-500 truncate">@{profile.username}</p>
        </div>
      </div>

      <UserSearchModal
        isOpen={showUserSearch}
        onClose={() => setShowUserSearch(false)}
        onRoomCreated={handleRoomCreated}
      />
      <CreateRoomModal
        isOpen={showCreateRoom}
        onClose={() => setShowCreateRoom(false)}
        onRoomCreated={handleRoomCreated}
      />
    </div>
  )
}
