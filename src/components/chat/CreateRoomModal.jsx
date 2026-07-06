import { useState } from 'react'
import { Search, X, Users } from 'lucide-react'
import { Modal } from '../shared/Modal'
import { Avatar } from '../shared/Avatar'
import { supabase } from '../../lib/supabase'
import { useChatStore } from '../../store/chatStore'
import { useAuthStore } from '../../store/authStore'

export function CreateRoomModal({ isOpen, onClose, onRoomCreated }) {
  const [name, setName] = useState('')
  const [query, setQuery] = useState('')
  const [searchResult, setSearchResult] = useState(null)
  const [members, setMembers] = useState([])
  const [error, setError] = useState('')
  const [creating, setCreating] = useState(false)
  const profile = useAuthStore((s) => s.profile)
  const createGroupRoom = useChatStore((s) => s.createGroupRoom)

  const handleSearch = async (e) => {
    e.preventDefault()
    const uname = query.trim().toLowerCase()
    if (!uname) return

    const { data } = await supabase
      .from('profiles')
      .select('id, username, display_name')
      .eq('username', uname)
      .eq('status', 'active')
      .neq('id', profile.id)
      .maybeSingle()

    setSearchResult(data || 'not_found')
  }

  const addMember = (user) => {
    if (!members.some((m) => m.id === user.id)) {
      setMembers([...members, user])
    }
    setSearchResult(null)
    setQuery('')
  }

  const removeMember = (id) => setMembers(members.filter((m) => m.id !== id))

  const handleCreate = async () => {
    setError('')
    if (!name.trim()) { setError('Room name is required.'); return }
    if (members.length === 0) { setError('Add at least one member.'); return }

    setCreating(true)
    try {
      const roomId = await createGroupRoom(name.trim(), profile.id, members.map((m) => m.id))
      onRoomCreated(roomId)
      setName(''); setMembers([]); setQuery(''); setSearchResult(null)
      onClose()
    } catch (err) {
      setError(err.message || 'Failed to create room')
    } finally {
      setCreating(false)
    }
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Create a room" size="md">
      <div className="space-y-4">
        {error && <p className="text-sm text-red-400">{error}</p>}

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Room name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="input-field"
            placeholder="e.g. Project Phoenix"
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-slate-400 mb-1.5">Add members (exact username)</label>
          <form onSubmit={handleSearch} className="relative">
            <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              className="input-field pl-10"
              placeholder="username"
            />
          </form>
          {searchResult === 'not_found' && (
            <p className="text-xs text-slate-500 mt-1.5">No user found.</p>
          )}
          {searchResult && searchResult !== 'not_found' && (
            <div
              onClick={() => addMember(searchResult)}
              className="mt-2 flex items-center gap-2.5 p-2.5 glass-panel cursor-pointer hover:bg-white/5"
            >
              <Avatar username={searchResult.display_name || searchResult.username} size="sm" />
              <p className="text-sm text-slate-300">{searchResult.display_name || searchResult.username}</p>
              <span className="ml-auto text-xs text-brand-400">Add</span>
            </div>
          )}
        </div>

        {members.length > 0 && (
          <div>
            <p className="text-xs font-medium text-slate-400 mb-2">Members ({members.length})</p>
            <div className="flex flex-wrap gap-2">
              {members.map((m) => (
                <span key={m.id} className="flex items-center gap-1.5 bg-white/5 rounded-full pl-1 pr-2 py-1">
                  <Avatar username={m.display_name || m.username} size="xs" />
                  <span className="text-xs text-slate-300">{m.display_name || m.username}</span>
                  <button onClick={() => removeMember(m.id)}>
                    <X size={12} className="text-slate-500 hover:text-slate-300" />
                  </button>
                </span>
              ))}
            </div>
          </div>
        )}

        <button onClick={handleCreate} disabled={creating} className="btn-primary w-full">
          <Users size={16} /> {creating ? 'Creating...' : 'Create room'}
        </button>
      </div>
    </Modal>
  )
}
