import { create } from 'zustand'
import { supabase } from '../lib/supabase'
import { SUPER_ADMIN_USERNAME } from '../lib/constants'

export const useAuthStore = create((set, get) => ({
  user: null,
  profile: null,
  session: null,
  loading: true,
  isAdmin: false,

  initialize: async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (session) {
      await get().loadProfile(session.user)
    }
    set({ loading: false })

    supabase.auth.onAuthStateChange(async (_event, session) => {
      set({ session })
      if (session?.user) {
        await get().loadProfile(session.user)
      } else {
        set({ user: null, profile: null, isAdmin: false })
      }
    })
  },

  loadProfile: async (authUser) => {
    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', authUser.id)
      .single()

    if (profile) {
      const isAdmin = profile.username === SUPER_ADMIN_USERNAME
      set({ user: authUser, profile, isAdmin })
      // Update last_seen
      await supabase
        .from('profiles')
        .update({ last_seen: new Date().toISOString(), is_online: true })
        .eq('id', authUser.id)
    }
  },

  login: async (username, password) => {
    // We store email as username@chatspaceapp.com
    const email = `${username}@chatspaceapp.com`
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    if (error) throw error

    const { data: profile } = await supabase
      .from('profiles')
      .select('status')
      .eq('id', data.user.id)
      .single()

    if (!profile) throw new Error('Profile not found')
    if (profile.status === 'pending') throw new Error('Your account is pending admin approval.')
    if (profile.status === 'suspended') throw new Error('Your account has been suspended.')
    if (profile.status === 'rejected') throw new Error('Your registration was rejected.')

    return data
  },

  register: async (username, password, displayName) => {
    const email = `${username}@chatspaceapp.com`
    const { data, error } = await supabase.auth.signUp({ email, password })
    if (error) throw error

    // Create profile
    const { error: profileError } = await supabase.from('profiles').insert({
      id: data.user.id,
      username,
      display_name: displayName || username,
      status: username === SUPER_ADMIN_USERNAME ? 'active' : 'pending',
      role: username === SUPER_ADMIN_USERNAME ? 'admin' : 'user',
    })
    if (profileError) throw profileError

    return data
  },

  logout: async () => {
    const { profile } = get()
    if (profile) {
      await supabase
        .from('profiles')
        .update({ is_online: false, last_seen: new Date().toISOString() })
        .eq('id', profile.id)
    }
    await supabase.auth.signOut()
    set({ user: null, profile: null, session: null, isAdmin: false })
  },

  refreshProfile: async () => {
    const { user } = get()
    if (user) await get().loadProfile(user)
  },
}))