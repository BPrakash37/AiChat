import { getInitials, getAvatarColor } from '../../lib/utils'

export function Avatar({ username = '', size = 'md', showOnline = false, isOnline = false, className = '' }) {
  const initials = getInitials(username)
  const colorClass = getAvatarColor(username)

  const sizes = {
    xs: 'w-6 h-6 text-xs',
    sm: 'w-8 h-8 text-xs',
    md: 'w-10 h-10 text-sm',
    lg: 'w-12 h-12 text-base',
    xl: 'w-16 h-16 text-xl',
  }

  const dotSizes = {
    xs: 'w-1.5 h-1.5',
    sm: 'w-2 h-2',
    md: 'w-2.5 h-2.5',
    lg: 'w-3 h-3',
    xl: 'w-3.5 h-3.5',
  }

  return (
    <div className={`relative flex-shrink-0 ${className}`}>
      <div
        className={`${sizes[size]} ${colorClass} rounded-full flex items-center justify-center
                    font-semibold text-white uppercase select-none`}
      >
        {initials || '?'}
      </div>
      {showOnline && (
        <span
          className={`absolute -bottom-0.5 -right-0.5 ${dotSizes[size]} rounded-full border-2 border-slate-900
                      ${isOnline ? 'bg-emerald-400' : 'bg-slate-500'}`}
        />
      )}
    </div>
  )
}
