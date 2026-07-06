export function TypingIndicator({ usernames }) {
  if (!usernames || usernames.length === 0) return null

  const label = usernames.length === 1
    ? `${usernames[0]} is typing`
    : `${usernames.join(', ')} are typing`

  return (
    <div className="flex items-center gap-2 px-4 py-1.5 text-xs text-slate-500">
      <div className="flex gap-1">
        <span className="typing-dot" />
        <span className="typing-dot" />
        <span className="typing-dot" />
      </div>
      <span>{label}</span>
    </div>
  )
}
