import { useState, useRef, useCallback } from 'react'
import { Send, Image as ImageIcon, X } from 'lucide-react'
import { useImageDropZone } from '../../hooks/useImageDropZone'

export function MessageInput({ onSend, onTyping, onStopTyping, disabled }) {
  const [text, setText] = useState('')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setImagePreview] = useState(null)
  const [sending, setSending] = useState(false)
  const containerRef = useRef(null)
  const fileInputRef = useRef(null)
  const textareaRef = useRef(null)

  const handleImage = useCallback((file) => {
    setImageFile(file)
    setImagePreview(URL.createObjectURL(file))
  }, [])

  const { isDragging } = useImageDropZone(containerRef, handleImage)

  const handleTextChange = (e) => {
    setText(e.target.value)
    onTyping?.()
    // Auto-resize
    e.target.style.height = 'auto'
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + 'px'
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    if ((!text.trim() && !imageFile) || sending) return

    setSending(true)
    try {
      await onSend(text.trim(), imageFile)
      setText('')
      setImageFile(null)
      setImagePreview(null)
      onStopTyping?.()
      if (textareaRef.current) textareaRef.current.style.height = 'auto'
    } finally {
      setSending(false)
    }
  }

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault()
      handleSubmit(e)
    }
  }

  const handleFilePick = (e) => {
    const file = e.target.files?.[0]
    if (file) handleImage(file)
    e.target.value = ''
  }

  return (
    <div
      ref={containerRef}
      tabIndex={-1}
      className={`border-t border-white/10 p-3 transition-colors ${isDragging ? 'bg-brand-500/10' : ''}`}
    >
      {isDragging && (
        <div className="text-center py-2 text-sm text-brand-400 font-medium">Drop image to attach</div>
      )}

      {imagePreview && (
        <div className="relative inline-block mb-2 ml-1">
          <img src={imagePreview} alt="Preview" className="h-20 rounded-lg border border-white/10" />
          <button
            onClick={() => { setImageFile(null); setImagePreview(null) }}
            className="absolute -top-1.5 -right-1.5 bg-slate-800 rounded-full p-1 hover:bg-slate-700"
          >
            <X size={12} className="text-slate-300" />
          </button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="flex items-end gap-2">
        <input ref={fileInputRef} type="file" accept="image/*" onChange={handleFilePick} className="hidden" />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="p-2.5 hover:bg-white/5 rounded-xl transition-colors flex-shrink-0"
        >
          <ImageIcon size={18} className="text-slate-400" />
        </button>

        <textarea
          ref={textareaRef}
          value={text}
          onChange={handleTextChange}
          onKeyDown={handleKeyDown}
          onBlur={onStopTyping}
          placeholder="Message... (Ctrl+V to paste an image)"
          rows={1}
          disabled={disabled}
          className="flex-1 bg-white/5 border border-white/10 rounded-xl px-4 py-2.5 text-sm text-slate-200
                     placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-brand-500
                     resize-none max-h-32"
        />

        <button
          type="submit"
          disabled={(!text.trim() && !imageFile) || sending || disabled}
          className="p-2.5 bg-brand-600 hover:bg-brand-500 disabled:opacity-40 disabled:hover:bg-brand-600
                     rounded-xl transition-colors flex-shrink-0"
        >
          <Send size={18} className="text-white" />
        </button>
      </form>
    </div>
  )
}
