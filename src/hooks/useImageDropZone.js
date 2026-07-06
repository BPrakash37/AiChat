import { useEffect, useCallback, useState } from 'react'

/**
 * Handles Ctrl+V paste and drag & drop image attachment on a container element.
 */
export function useImageDropZone(containerRef, onImage) {
  const [isDragging, setIsDragging] = useState(false)

  const handlePaste = useCallback((e) => {
    const items = e.clipboardData?.items
    if (!items) return
    for (const item of items) {
      if (item.type.startsWith('image/')) {
        const file = item.getAsFile()
        if (file) onImage(file)
        e.preventDefault()
        break
      }
    }
  }, [onImage])

  useEffect(() => {
    const el = containerRef.current
    if (!el) return

    const handleDragOver = (e) => { e.preventDefault(); setIsDragging(true) }
    const handleDragLeave = (e) => {
      if (e.target === el) setIsDragging(false)
    }
    const handleDrop = (e) => {
      e.preventDefault()
      setIsDragging(false)
      const file = e.dataTransfer?.files?.[0]
      if (file && file.type.startsWith('image/')) onImage(file)
    }

    el.addEventListener('paste', handlePaste)
    el.addEventListener('dragover', handleDragOver)
    el.addEventListener('dragleave', handleDragLeave)
    el.addEventListener('drop', handleDrop)

    return () => {
      el.removeEventListener('paste', handlePaste)
      el.removeEventListener('dragover', handleDragOver)
      el.removeEventListener('dragleave', handleDragLeave)
      el.removeEventListener('drop', handleDrop)
    }
  }, [containerRef, handlePaste, onImage])

  return { isDragging }
}
