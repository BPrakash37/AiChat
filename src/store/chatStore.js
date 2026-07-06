import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { MESSAGE_PAGE_SIZE, STORAGE_BUCKET, ACCEPTED_IMAGE_TYPES, MAX_FILE_SIZE_MB } from '../lib/constants'
import { sanitizeFilename } from '../lib/utils'

export const useChatStore = create((set, get) => ({
  rooms: [],
  activeRoomId: null,
  messages: {}, // roomId -> Message[]
  typingUsers: {}, // roomId -> { userId: username }
  unreadCounts: {}, // roomId -> number
  hasMore: {}, // roomId -> boolean
  loadingMessages: false,
  realtimeSubscriptions: {},

  setActiveRoom: (roomId) => {
    set({ activeRoomId: roomId })
    if (roomId) {
      get().markRoomRead(roomId)
    }
  },

  loadRooms: async (userId) => {
    const { data, error } = await supabase
      .from('room_members')
      .select(`
        room_id,
        rooms (
          id, name, type, created_by, created_at,
          room_members (
            user_id,
            profiles ( id, username, display_name, is_online, last_seen )
          )
        )
      `)
      .eq('user_id', userId)
      .eq('is_removed', false)

    if (error) { console.error('loadRooms error', error); return }

    const rooms = (data || []).map((rm) => rm.rooms).filter(Boolean)
    set({ rooms })

    // Load unread counts
    for (const room of rooms) {
      get().loadUnreadCount(room.id, userId)
    }
  },

  loadMessages: async (roomId, before = null) => {
    set({ loadingMessages: true })
    let query = supabase
      .from('messages')
      .select(`
        id, room_id, sender_id, content, type, image_url, created_at, read_by,
        profiles ( id, username, display_name )
      `)
      .eq('room_id', roomId)
      .order('created_at', { ascending: false })
      .limit(MESSAGE_PAGE_SIZE)

    if (before) {
      query = query.lt('created_at', before)
    }

    const { data, error } = await query
    if (error) { set({ loadingMessages: false }); return }

    const msgs = (data || []).reverse()
    const existing = get().messages[roomId] || []
    const merged = before ? [...msgs, ...existing] : msgs

    set((state) => ({
      messages: { ...state.messages, [roomId]: merged },
      hasMore: { ...state.hasMore, [roomId]: (data || []).length === MESSAGE_PAGE_SIZE },
      loadingMessages: false,
    }))
  },

  sendMessage: async (roomId, senderId, content, imageFile = null) => {
    let imageUrl = null

    if (imageFile) {
      if (!ACCEPTED_IMAGE_TYPES.includes(imageFile.type)) throw new Error('Unsupported image type')
      if (imageFile.size > MAX_FILE_SIZE_MB * 1024 * 1024) throw new Error(`Image must be under ${MAX_FILE_SIZE_MB}MB`)

      const ext = imageFile.name.split('.').pop()
      const filename = `${roomId}/${Date.now()}_${sanitizeFilename(imageFile.name)}`
      const { error: uploadError } = await supabase.storage
        .from(STORAGE_BUCKET)
        .upload(filename, imageFile)

      if (uploadError) throw uploadError

      const { data: { publicUrl } } = supabase.storage
        .from(STORAGE_BUCKET)
        .getPublicUrl(filename)

      imageUrl = publicUrl
    }

    const { data, error } = await supabase.from('messages').insert({
      room_id: roomId,
      sender_id: senderId,
      content: content || '',
      type: imageFile ? 'image' : 'text',
      image_url: imageUrl,
      read_by: [senderId],
    }).select(`
      id, room_id, sender_id, content, type, image_url, created_at, read_by,
      profiles ( id, username, display_name )
    `).single()

    if (error) throw error
    return data
  },

  appendMessage: (message) => {
    const { roomId } = { roomId: message.room_id }
    set((state) => {
      const existing = state.messages[message.room_id] || []
      const alreadyExists = existing.some((m) => m.id === message.id)
      if (alreadyExists) return state
      return {
        messages: {
          ...state.messages,
          [message.room_id]: [...existing, message],
        },
      }
    })
  },

  markRoomRead: async (roomId) => {
    const userId = (await supabase.auth.getUser()).data?.user?.id
    if (!userId) return

    // Mark all messages in room as read by this user
    await supabase.rpc('mark_messages_read', { p_room_id: roomId, p_user_id: userId })

    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [roomId]: 0 },
    }))
  },

  loadUnreadCount: async (roomId, userId) => {
    const { count } = await supabase
      .from('messages')
      .select('id', { count: 'exact', head: true })
      .eq('room_id', roomId)
      .not('read_by', 'cs', `{${userId}}`)
      .neq('sender_id', userId)

    set((state) => ({
      unreadCounts: { ...state.unreadCounts, [roomId]: count || 0 },
    }))
  },

  setTyping: async (roomId, userId, isTyping) => {
    await supabase.channel(`typing:${roomId}`).send({
      type: 'broadcast',
      event: 'typing',
      payload: { userId, isTyping },
    })
  },

  setTypingUsers: (roomId, userId, username, isTyping) => {
    set((state) => {
      const current = { ...(state.typingUsers[roomId] || {}) }
      if (isTyping) current[userId] = username
      else delete current[userId]
      return { typingUsers: { ...state.typingUsers, [roomId]: current } }
    })
  },

  createDirectRoom: async (currentUserId, targetUserId) => {
    // Check if DM already exists
    const { data: existing } = await supabase.rpc('get_direct_room', {
      user_a: currentUserId,
      user_b: targetUserId,
    })

    if (existing?.length > 0) return existing[0].room_id

    // Create room
    const { data: room, error } = await supabase.from('rooms').insert({
      name: null,
      type: 'direct',
      created_by: currentUserId,
    }).select().single()

    if (error) throw error

    // Add both members
    await supabase.from('room_members').insert([
      { room_id: room.id, user_id: currentUserId },
      { room_id: room.id, user_id: targetUserId },
    ])

    return room.id
  },

  createGroupRoom: async (name, creatorId, memberIds) => {
    const { data: room, error } = await supabase.from('rooms').insert({
      name,
      type: 'group',
      created_by: creatorId,
    }).select().single()

    if (error) throw error

    const members = [creatorId, ...memberIds].map((uid) => ({
      room_id: room.id,
      user_id: uid,
      role: uid === creatorId ? 'admin' : 'member',
    }))

    await supabase.from('room_members').insert(members)
    return room.id
  },

  addRoomMember: async (roomId, userId) => {
    // Upsert: if was removed before, re-add
    const { error } = await supabase.from('room_members').upsert({
      room_id: roomId,
      user_id: userId,
      is_removed: false,
    }, { onConflict: 'room_id,user_id' })
    if (error) throw error
  },

  removeRoomMember: async (roomId, userId) => {
    // Soft delete — never hard delete room_members
    const { error } = await supabase.from('room_members')
      .update({ is_removed: true })
      .eq('room_id', roomId)
      .eq('user_id', userId)
    if (error) throw error
  },

  searchMessages: async (roomId, query) => {
    const { data, error } = await supabase
      .from('messages')
      .select(`
        id, room_id, sender_id, content, type, image_url, created_at, read_by,
        profiles ( id, username, display_name )
      `)
      .eq('room_id', roomId)
      .ilike('content', `%${query}%`)
      .order('created_at', { ascending: false })
      .limit(50)

    if (error) throw error
    return data || []
  },
}))
