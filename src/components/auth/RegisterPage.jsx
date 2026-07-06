import { useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import { UserPlus, Eye, EyeOff, AlertCircle, CheckCircle2 } from 'lucide-react'
import { useAuthStore } from '../../store/authStore'

const USERNAME_RE = /^[a-z0-9_]{3,20}$/

export function RegisterPage() {
  const navigate = useNavigate()
  const register = useAuthStore((s) => s.register)
  const [username, setUsername] = useState('')
  const [displayName, setDisplayName] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPw, setShowPw] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [done, setDone] = useState(false)

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    const uname = username.trim().toLowerCase()
    if (!USERNAME_RE.test(uname)) {
      setError('Username must be 3-20 characters: lowercase letters, numbers, underscore only.')
      return
    }
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match.')
      return
    }

    setLoading(true)
    try {
      await register(uname, password, displayName.trim() || uname)
      setDone(true)
    } catch (err) {
      if (err.message?.includes('already registered') || err.message?.includes('duplicate')) {
        setError('That username is already taken.')
      } else {
        setError(err.message || 'Registration failed')
      }
    } finally {
      setLoading(false)
    }
  }

  if (done) {
    return (
      <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f0f14]">
        <div className="w-full max-w-sm glass-panel p-8 text-center">
          <div className="w-14 h-14 bg-emerald-500/15 rounded-2xl flex items-center justify-center mx-auto mb-4">
            <CheckCircle2 size={28} className="text-emerald-400" />
          </div>
          <h2 className="text-lg font-semibold text-slate-100 mb-2">Request submitted</h2>
          <p className="text-sm text-slate-400 mb-6">
            Your account is awaiting Super Admin approval. You'll be able to sign in once approved.
          </p>
          <Link to="/login" className="btn-primary w-full">Back to sign in</Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0f0f14]">
      <div className="w-full max-w-sm">
        <div className="flex flex-col items-center mb-8">
          <div className="w-14 h-14 bg-brand-600 rounded-2xl flex items-center justify-center mb-4 shadow-lg shadow-brand-600/30">
            <UserPlus size={28} className="text-white" />
          </div>
          <h1 className="text-2xl font-bold text-slate-100">Request Access</h1>
          <p className="text-sm text-slate-500 mt-1 text-center">New accounts require admin approval</p>
        </div>

        <div className="glass-panel p-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            {error && (
              <div className="flex items-start gap-2.5 bg-red-500/10 border border-red-500/20 rounded-xl p-3.5">
                <AlertCircle size={16} className="text-red-400 mt-0.5 flex-shrink-0" />
                <p className="text-sm text-red-300">{error}</p>
              </div>
            )}

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Username</label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="input-field"
                placeholder="lowercase_username"
                autoComplete="username"
                required
              />
              <p className="text-xs text-slate-600 mt-1">3-20 chars: lowercase, numbers, underscore</p>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Display name (optional)</label>
              <input
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                className="input-field"
                placeholder="How others see you"
              />
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Password</label>
              <div className="relative">
                <input
                  type={showPw ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input-field pr-11"
                  placeholder="At least 8 characters"
                  autoComplete="new-password"
                  required
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-slate-400 mb-1.5">Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                className="input-field"
                placeholder="Re-enter password"
                autoComplete="new-password"
                required
              />
            </div>

            <button type="submit" disabled={loading} className="btn-primary w-full">
              {loading ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : 'Submit request'}
            </button>
          </form>

          <p className="text-center text-sm text-slate-500 mt-5">
            Already have an account?{' '}
            <Link to="/login" className="text-brand-400 hover:text-brand-300 font-medium transition-colors">
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  )
}
