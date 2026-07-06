import { formatDateDivider } from '../../lib/utils'

export function DateDivider({ date }) {
  return (
    <div className="flex items-center gap-3 my-4">
      <div className="flex-1 h-px bg-white/10" />
      <span className="text-xs text-slate-500 font-medium px-2">{formatDateDivider(date)}</span>
      <div className="flex-1 h-px bg-white/10" />
    </div>
  )
}
