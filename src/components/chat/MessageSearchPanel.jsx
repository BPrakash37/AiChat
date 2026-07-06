import { useState } from 'react'
import { Search, X } from 'lucide-react'
import { useChatStore } from '../../store/chatStore'
import { formatMessageTime } from '../../lib/utils'

export function MessageSearchPanel({ roomId, onClose, onJumpToMessage }) {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [searching, setSearching] = useState(false)
  const searchMessages = useChatStore((s) => s.searchMessages)

  const handleSearch = async (e) => {
    e.preventDefault()
    if (!query.trim()) return
    setSearching(true)
    try {
      const data = await searchMessages(roomId, query.trim())
      setResults(data)
    } finally {
      setSearching(false)
    }
  }

  return (
    <div className="absolute inset-0 z-20 bg-[#0f0f14] flex flex-col animate-fade-in">
      <div className="flex items-center gap-2 p-3 border-b border-white/10">
        <form onSubmit={handleSearch} className="flex-1 relative">
          <Search size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-500" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search in this conversation"
            className="input-field pl-10"
            autoFocus
          />
        </form>
        <button onClick={onClose} className="p-2 hover:bg-white/10 rounded-lg">
          <X size={18} className="text-slate-400" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto p-3">
        {searching && <p className="text-sm text-slate-500 text-center mt-4">Searching...</p>}
        {!searching && results.length === 0 && query && (
          <p className="text-sm text-slate-500 text-center mt-4">No messages found.</p>
        )}
        <div className="space-y-2">
          {results.map((m) => (
            <div
              key={m.id}
              onClick={() => onJumpToMessage?.(m.id)}
              className="p-3 glass-panel cursor-pointer hover:bg-white/5"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-brand-400">
                  {m.profiles?.display_name || m.profiles?.username}
                </span>
                <span className="text-xs text-slate-600">{formatMessageTime(m.created_at)}</span>
              </div>
              <p className="text-sm text-slate-300 line-clamp-2">{m.content}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
