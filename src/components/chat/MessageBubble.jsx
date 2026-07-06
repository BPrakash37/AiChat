import { Check, CheckCheck } from 'lucide-react'
import { Avatar } from '../shared/Avatar'
import { formatMessageTime, classNames } from '../../lib/utils'

export function MessageBubble({ message, isMine, showAvatar, isRead, isGroup }) {
  const senderName = message.profiles?.display_name || message.profiles?.username || 'Unknown'

  return (
    <div className={classNames('flex gap-2 items-end', isMine ? 'justify-end' : 'justify-start')}>
      {!isMine && (
        <div className="w-7">
          {showAvatar && <Avatar username={senderName} size="sm" />}
        </div>
      )}

      <div className={classNames('flex flex-col', isMine ? 'items-end' : 'items-start')}>
        {!isMine && isGroup && showAvatar && (
          <p className="text-xs text-slate-500 mb-1 ml-1">{senderName}</p>
        )}

        <div className={isMine ? 'chat-bubble-mine' : 'chat-bubble-other'}>
          {message.type === 'image' && message.image_url && (
            <img
              src={message.image_url}
              alt="Shared image"
              className="rounded-lg max-w-full mb-1.5 cursor-pointer hover:opacity-90 transition-opacity"
              loading="lazy"
              onClick={() => window.open(message.image_url, '_blank')}
            />
          )}
          {message.content && (
            <p className="text-sm whitespace-pre-wrap break-words">{message.content}</p>
          )}
        </div>

        <div className={classNames('flex items-center gap-1 mt-1 px-1', isMine ? 'flex-row-reverse' : '')}>
          <span className="text-[10px] text-slate-600">{formatMessageTime(message.created_at)}</span>
          {isMine && (
            isRead
              ? <CheckCheck size={12} className="text-brand-400" />
              : <Check size={12} className="text-slate-600" />
          )}
        </div>
      </div>
    </div>
  )
}
