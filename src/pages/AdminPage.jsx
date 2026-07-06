import { useState, useEffect, useCallback } from 'react'
import { Link } from 'react-router-dom'
import {
  ArrowLeft, CheckCircle2, XCircle, AlertTriangle,
  Users, Home, ScrollText, RefreshCw
} from 'lucide-react'
import { supabase } from '../lib/supabase'
import { Avatar } from '../components/shared/Avatar'
import { formatLastSeen } from '../lib/utils'

const TABS = ['Pending', 'Users', 'Rooms', 'Audit Log']

export function AdminPage() {
  const [tab, setTab] = useState('Pending')
  const [pendingUsers, setPendingUsers] = useState([])
  const [allUsers, setAllUsers] = useState([])
  const [rooms, setRooms] = useState([])
  const [auditLogs, setAuditLogs] = useState([])
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const flash = (msg) => { setMessage(msg); setTimeout(() => setMessage(''), 3000) }

  const loadData = useCallback(async () => {
    setLoading(true)
    if (tab === 'Pending') {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('status', 'pending')
        .order('created_at', { ascending: true })
      setPendingUsers(data || [])
    } else if (tab === 'Users') {
      const { data } = await supabase
        .from('profiles')
        .select('*')
        .in('status', ['active', 'suspended', 'rejected'])
        .order('created_at', { ascending: false })
      setAllUsers(data || [])
    } else if (tab === 'Rooms') {
      const { data } = await supabase
        .from('rooms')
        .select('*, room_members(count)')
        .order('created_at', { ascending: false })
      setRooms(data || [])
    } else if (tab === 'Audit Log') {
      const { data } = await supabase
        .from('audit_logs')
        .select('*, actor:actor_id(username, display_name), target:target_id(username, display_name)')
        .order('created_at', { ascending: false })
        .limit(200)
      setAuditLogs(data || [])
    }
    setLoading(false)
  }, [tab])

  useEffect(() => { loadData() }, [loadData])

  const updateUserStatus = async (userId, status, username) => {
    await supabase.from('profiles').update({ status }).eq('id', userId)
    await supabase.from('audit_logs').insert({
      action: `user_${status}`,
      actor_id: (await supabase.auth.getUser()).data.user.id,
      target_id: userId,
      details: { username, new_status: status },
    })
    flash(`User ${status}.`)
    loadData()
  }

  const statusBadge = (status) => {
    const map = {
      active: 'bg-emerald-500/15 text-emerald-400',
      suspended: 'bg-amber-500/15 text-amber-400',
      rejected: 'bg-red-500/15 text-red-400',
      pending: 'bg-blue-500/15 text-blue-400',
    }
    return (
      <span className={`text-xs font-medium px-2 py-0.5 rounded-full ${map[status] || 'bg-white/10 text-slate-400'}`}>
        {status}
      </span>
    )
  }

  return (
    <div className="min-h-screen bg-[#0f0f14] text-slate-200">
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#0f0f14]/90 backdrop-blur border-b border-white/10 px-6 py-4 flex items-center gap-4">
        <Link to="/chat" className="p-2 hover:bg-white/10 rounded-xl">
          <ArrowLeft size={18} className="text-slate-400" />
        </Link>
        <div>
          <h1 className="font-bold text-slate-100">Admin Panel</h1>
          <p className="text-xs text-slate-500">ChatSpace management</p>
        </div>
        <button onClick={loadData} className="ml-auto p-2 hover:bg-white/10 rounded-xl" title="Refresh">
          <RefreshCw size={16} className={`text-slate-400 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {message && (
        <div className="mx-6 mt-4 p-3 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-sm text-emerald-300">
          {message}
        </div>
      )}

      {/* Tabs */}
      <div className="flex gap-1 px-6 pt-4 pb-0">
        {TABS.map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 rounded-t-xl text-sm font-medium transition-colors ${
              tab === t
                ? 'bg-brand-600/20 text-brand-300 border-b-2 border-brand-500'
                : 'text-slate-500 hover:text-slate-300 hover:bg-white/5'
            }`}
          >
            {t}
          </button>
        ))}
      </div>
      <div className="border-b border-white/10 mx-0" />

      <div className="p-6 max-w-4xl">

        {/* PENDING TAB */}
        {tab === 'Pending' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{pendingUsers.length} pending request{pendingUsers.length !== 1 ? 's' : ''}</p>
            {pendingUsers.length === 0 && (
              <div className="glass-panel p-8 text-center">
                <CheckCircle2 size={32} className="text-emerald-400 mx-auto mb-2 opacity-50" />
                <p className="text-sm text-slate-500">No pending requests</p>
              </div>
            )}
            {pendingUsers.map((u) => (
              <div key={u.id} className="glass-panel p-4 flex items-center gap-4">
                <Avatar username={u.display_name || u.username} size="md" />
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200">{u.display_name || u.username}</p>
                  <p className="text-xs text-slate-500">@{u.username} · Requested {formatLastSeen(u.created_at)}</p>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => updateUserStatus(u.id, 'active', u.username)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-lg text-sm transition-colors"
                  >
                    <CheckCircle2 size={14} /> Approve
                  </button>
                  <button
                    onClick={() => updateUserStatus(u.id, 'rejected', u.username)}
                    className="flex items-center gap-1.5 px-3 py-1.5 bg-red-500/15 hover:bg-red-500/25 text-red-400 rounded-lg text-sm transition-colors"
                  >
                    <XCircle size={14} /> Reject
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* USERS TAB */}
        {tab === 'Users' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{allUsers.length} users</p>
            {allUsers.map((u) => (
              <div key={u.id} className="glass-panel p-4 flex items-center gap-4">
                <Avatar username={u.display_name || u.username} size="md" showOnline isOnline={u.is_online} />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <p className="font-medium text-slate-200">{u.display_name || u.username}</p>
                    {statusBadge(u.status)}
                    {u.role === 'admin' && (
                      <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">admin</span>
                    )}
                  </div>
                  <p className="text-xs text-slate-500">@{u.username} · Last seen {formatLastSeen(u.last_seen)}</p>
                </div>
                {u.role !== 'admin' && (
                  <div className="flex gap-2">
                    {u.status === 'active' && (
                      <button
                        onClick={() => updateUserStatus(u.id, 'suspended', u.username)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-500/15 hover:bg-amber-500/25 text-amber-400 rounded-lg text-sm transition-colors"
                      >
                        <AlertTriangle size={14} /> Suspend
                      </button>
                    )}
                    {u.status === 'suspended' && (
                      <button
                        onClick={() => updateUserStatus(u.id, 'active', u.username)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-500/15 hover:bg-emerald-500/25 text-emerald-400 rounded-lg text-sm transition-colors"
                      >
                        <CheckCircle2 size={14} /> Restore
                      </button>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* ROOMS TAB */}
        {tab === 'Rooms' && (
          <div className="space-y-3">
            <p className="text-sm text-slate-500">{rooms.length} rooms (never deleted)</p>
            {rooms.map((r) => (
              <div key={r.id} className="glass-panel p-4 flex items-center gap-4">
                <div className="w-10 h-10 bg-brand-600/15 rounded-xl flex items-center justify-center flex-shrink-0">
                  <Home size={18} className="text-brand-400" />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-medium text-slate-200">{r.name || '(Direct Message)'}</p>
                  <p className="text-xs text-slate-500">
                    {r.type} · {r.room_members?.[0]?.count ?? 0} member(s) · Created {formatLastSeen(r.created_at)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* AUDIT LOG TAB */}
        {tab === 'Audit Log' && (
          <div className="space-y-2">
            {auditLogs.length === 0 && (
              <p className="text-sm text-slate-500 text-center mt-8">No audit log entries yet.</p>
            )}
            {auditLogs.map((log) => (
              <div key={log.id} className="glass-panel px-4 py-3 flex items-start gap-3">
                <ScrollText size={14} className="text-slate-600 mt-0.5 flex-shrink-0" />
                <div>
                  <p className="text-sm text-slate-300">
                    <span className="text-brand-400 font-medium">
                      {log.actor?.display_name || log.actor?.username || 'System'}
                    </span>{' '}
                    → <span className="font-medium">{log.action}</span>
                    {log.target && (
                      <> on <span className="text-slate-400">
                        {log.target.display_name || log.target.username}
                      </span></>
                    )}
                  </p>
                  <p className="text-xs text-slate-600 mt-0.5">{formatLastSeen(log.created_at)}</p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
