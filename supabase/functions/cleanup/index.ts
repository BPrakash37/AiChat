// supabase/functions/cleanup/index.ts
// Supabase Edge Function — deletes messages, images, notifications older than 7 days.
// Rooms and room_members are NEVER deleted.
// Schedule: daily via pg_cron (see README for setup).

import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const SEVEN_DAYS_AGO = () => {
  const d = new Date()
  d.setDate(d.getDate() - 7)
  return d.toISOString()
}

Deno.serve(async (req) => {
  // Validate secret header to prevent unauthorized invocations
  const authHeader = req.headers.get('Authorization')
  const cronSecret = Deno.env.get('CRON_SECRET')
  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401 })
  }

  const supabaseUrl = Deno.env.get('SUPABASE_URL')!
  const serviceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
  const supabase = createClient(supabaseUrl, serviceKey)

  const cutoff = SEVEN_DAYS_AGO()
  const results: Record<string, any> = {}

  // 1. Find old messages with images before deleting them
  const { data: oldImageMessages } = await supabase
    .from('messages')
    .select('image_url')
    .lt('created_at', cutoff)
    .eq('type', 'image')
    .not('image_url', 'is', null)

  // 2. Delete old messages (rooms/room_members untouched)
  const { error: msgErr, count: msgCount } = await supabase
    .from('messages')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)

  results.messages_deleted = msgCount
  if (msgErr) results.messages_error = msgErr.message

  // 3. Delete images from storage for those messages
  if (oldImageMessages && oldImageMessages.length > 0) {
    const paths = oldImageMessages
      .map((m) => {
        try {
          // Extract storage path from public URL
          const url = new URL(m.image_url)
          // Path is after /storage/v1/object/public/chat-media/
          const match = url.pathname.match(/\/chat-media\/(.+)$/)
          return match ? match[1] : null
        } catch {
          return null
        }
      })
      .filter(Boolean) as string[]

    if (paths.length > 0) {
      const { error: storageErr } = await supabase.storage
        .from('chat-media')
        .remove(paths)

      results.images_deleted = paths.length
      if (storageErr) results.storage_error = storageErr.message
    }
  }

  // 4. Delete old notifications
  const { error: notifErr, count: notifCount } = await supabase
    .from('notifications')
    .delete({ count: 'exact' })
    .lt('created_at', cutoff)

  results.notifications_deleted = notifCount
  if (notifErr) results.notifications_error = notifErr.message

  // 5. Log cleanup action
  await supabase.from('audit_logs').insert({
    action: 'automated_cleanup',
    details: { cutoff, ...results },
  })

  console.log('Cleanup complete:', results)

  return new Response(JSON.stringify({ success: true, cutoff, ...results }), {
    headers: { 'Content-Type': 'application/json' },
  })
})
