import { useState } from 'react'
import { Search, UserMinus, UserPlus } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { Avatar } from '../shared/Avatar'
import { supabase } from '../../lib/supabase'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'

export function ManageMembersModal({ isOpen, onClose, room }) {
  const [query, setQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const profile = useAuthStore((s) => s.profile)
  const addRoomMember = useChatStore((s) => s.addRoomMember)
  const removeRoomMember = useChatStore((s) => s.removeRoomMember)
  const loadRooms = useChatStore((s) => s.loadRooms)

  if (!room) return null

  const activeMembers = room.room_members?.filter((m) => !m.is_removed) || []
  const isCreator = room.created_by === profile.id

  const handleSearch = async (e) => {
    e.preventDefault()
    const uname = query.trim().toLowerCase()
    if (!uname) return
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .eq('username', uname)
      .eq('status', 'active')
      .maybeSingle()
    setSearchResult(data || 'not_found')
  }

  const handleAdd = async (user) => {
    await addRoomMember(room.id, user.id)
    await loadRooms(profile.id)
    setSearchResult(null)
    setQuery('')
  }

  const handleRemove = async (userId) => {
    await removeRoomMember(room.id, userId)
    await loadRooms(profile.id)
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={`Manage "${room.name}"`} size="md">
      <div className="space-y-4">
        {isCreator && (
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">Add member</label>
            <form onSubmit={handleSearch} className="relative">
              <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
              <input
                type="text"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="input-field pl-10"
                placeholder="exact username"
              />
            </form>
            {searchResult === 'not_found' && <p className="text-xs text-slate-500 mt-1.5">No user found.</p>}
            {searchResult && searchResult !== 'not_found' && (
              <div className="mt-2 flex items-center gap-2.5 p-2.5 glass-panel">
                <Avatar username={searchResult.display_name || searchResult.username} size="sm" />
                <p className="text-sm text-slate-300 flex-1">{searchResult.display_name || searchResult.username}</p>
                <button onClick={() => handleAdd(searchResult)} className="btn-ghost text-xs">
                  <UserPlus size={14} /> Add
                </button>
              </div>
            )}
          </div>
        )}

        <div>
          <p className="text-xs font-medium text-slate-400 mb-2">Members ({activeMembers.length})</p>
          <div className="space-y-1.5 max-h-64 overflow-y-auto">
            {activeMembers.map((m) => (
              <div key={m.user_id} className="flex items-center gap-2.5 p-2 rounded-xl hover:bg-white/5">
                <Avatar username={m.profiles?.display_name || m.profiles?.username} size="sm" showOnline isOnline={m.profiles?.is_online} />
                <div className="flex-1 min-w-0">
                  <p className="text-sm text-slate-300 truncate">{m.profiles?.display_name || m.profiles?.username}</p>
                  {room.created_by === m.user_id && <p className="text-xs text-brand-400">Room creator</p>}
                </div>
                {isCreator && m.user_id !== profile.id && (
                  <button onClick={() => handleRemove(m.user_id)} className="p-1.5 hover:bg-red-500/10 rounded-lg group">
                    <UserMinus size={14} className="text-slate-500 group-hover:text-red-400" />
                  </button>
                )}
              </div>
            ))}
          </div>
        </div>
      </div>
    </Modal>
  )
}
