import { Avatar } from '../shared/Avatar'
import { classNames } from '../../lib/utils'
import { formatLastSeen } from '../../lib/utils'

export function RoomListItem({ room, currentUserId, isActive, onlineUsers, unreadCount, onClick }) {
  const isDirect = room.type === 'direct'
  const otherMember = isDirect
    ? room.room_members?.find((m) => m.user_id !== currentUserId)?.profiles
    : null

  const displayName = isDirect
    ? (otherMember?.display_name || otherMember?.username || 'Unknown user')
    : room.name

  const isOnline = isDirect && otherMember ? !!onlineUsers[otherMember.id] : false

  return (
    <div
      onClick={onClick}
      className={classNames('sidebar-item', isActive && 'sidebar-item-active')}
    >
      <Avatar
        username={displayName}
        size="md"
        showOnline={isDirect}
        isOnline={isOnline}
      />
      <div className="flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <p className="text-sm font-medium text-slate-200 truncate">{displayName}</p>
        </div>
        <p className="text-xs text-slate-500 truncate">
          {isDirect
            ? (isOnline ? 'Online' : formatLastSeen(otherMember?.last_seen))
            : `${room.room_members?.filter((m) => !m.is_removed).length || 0} members`}
        </p>
      </div>
      {unreadCount > 0 && (
        <span className="flex-shrink-0 bg-brand-600 text-white text-xs font-semibold rounded-full min-w-[20px] h-5 px-1.5 flex items-center justify-center">
          {unreadCount > 99 ? '99+' : unreadCount}
        </span>
      )}
    </div>
  )
}
