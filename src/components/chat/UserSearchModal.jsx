import { useState } from 'react'
import { Search, UserCheck } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { Avatar } from '../shared/Avatar'
import { supabase } from '../../lib/supabase'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'

export function UserSearchModal({ isOpen, onClose, onRoomCreated }) {
  const [query, setQuery] = useState('')
  const [result, setResult] = useState(null)
  const [searching, setSearching] = useState(false)
  const [notFound, setNotFound] = useState(false)
  const profile = useAuthStore((s) => s.profile)
  const createDirectRoom = useChatStore((s) => s.createDirectRoom)

  const handleSearch = async (e) => {
    e.preventDefault()
    const uname = query.trim().toLowerCase()
    if (!uname) return

    setSearching(true)
    setNotFound(false)
    setResult(null)

    // Exact username match only — Instagram-style discovery, no listing all users
    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name, is_online, last_seen')
      .eq('username', uname)
      .eq('status', 'active')
      .neq('id', profile.id)
      .maybeSingle()

    setSearching(false)
    if (data) setResult(data)
    else setNotFound(true)
  }

  const handleStartChat = async () => {
    if (!result) return
    const roomId = await createDirectRoom(profile.id, result.id)
    onRoomCreated(roomId)
    setQuery('')
    setResult(null)
    onClose()
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Find someone" size="sm">
      <form onSubmit={handleSearch} className="space-y-3">
        <div className="relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Enter exact username"
            className="input-field pl-10"
            autoFocus
          />
        </div>
        <button type="submit" disabled={searching} className="btn-primary w-full">
          {searching ? 'Searching...' : 'Search'}
        </button>
      </form>

      {notFound && (
        <p className="text-sm text-slate-500 text-center mt-4">No user found with that exact username.</p>
      )}

      {result && (
        <div className="mt-4 flex items-center gap-3 p-3 glass-panel">
          <Avatar username={result.display_name || result.username} showOnline isOnline={result.is_online} />
          <div className="flex-1 min-w-0">
            <p className="text-sm font-medium text-slate-200 truncate">{result.display_name || result.username}</p>
            <p className="text-xs text-slate-500">@{result.username}</p>
          </div>
          <button onClick={handleStartChat} className="btn-ghost text-xs">
            <UserCheck size={14} /> Chat
          </button>
        </div>
      )}
    </Modal>
  )
}
