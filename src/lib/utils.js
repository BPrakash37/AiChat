import { format, isToday, isYesterday, formatDistanceToNow, parseISO } from 'date-fns'

export function formatMessageTime(dateStr) {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  if (isToday(date)) return format(date, 'HH:mm')
  if (isYesterday(date)) return `Yesterday ${format(date, 'HH:mm')}`
  return format(date, 'dd MMM, HH:mm')
}

export function formatLastSeen(dateStr) {
  if (!dateStr) return 'Never'
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  if (isToday(date)) return `Today at ${format(date, 'HH:mm')}`
  if (isYesterday(date)) return `Yesterday at ${format(date, 'HH:mm')}`
  return formatDistanceToNow(date, { addSuffix: true })
}

export function formatDateDivider(dateStr) {
  const date = typeof dateStr === 'string' ? parseISO(dateStr) : dateStr
  if (isToday(date)) return 'Today'
  if (isYesterday(date)) return 'Yesterday'
  return format(date, 'MMMM d, yyyy')
}

export function isSameDay(a, b) {
  const da = typeof a === 'string' ? parseISO(a) : a
  const db = typeof b === 'string' ? parseISO(b) : b
  return format(da, 'yyyy-MM-dd') === format(db, 'yyyy-MM-dd')
}

export function generateId() {
  return crypto.randomUUID()
}

export function classNames(...classes) {
  return classes.filter(Boolean).join(' ')
}

export async function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.readAsDataURL(file)
    reader.onload = () => resolve(reader.result)
    reader.onerror = reject
  })
}

export function getInitials(name = '') {
  return name
    .split(/\s+/)
    .map((w) => w[0]?.toUpperCase() ?? '')
    .slice(0, 2)
    .join('')
}

export function getAvatarColor(username = '') {
  const colors = [
    'bg-rose-500', 'bg-pink-500', 'bg-fuchsia-500', 'bg-purple-500',
    'bg-violet-500', 'bg-indigo-500', 'bg-blue-500', 'bg-cyan-500',
    'bg-teal-500', 'bg-emerald-500', 'bg-green-500', 'bg-amber-500',
    'bg-orange-500', 'bg-red-500',
  ]
  let hash = 0
  for (let i = 0; i < username.length; i++) hash = username.charCodeAt(i) + ((hash << 5) - hash)
  return colors[Math.abs(hash) % colors.length]
}

export function sanitizeFilename(name) {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_')
}
