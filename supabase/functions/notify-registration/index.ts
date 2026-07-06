// supabase/functions/notify-registration/index.ts
// Sends a Telegram message to the admin when a new user registers.

Deno.serve(async (req) => {
  try {
    const { username, displayName } = await req.json()

    const botToken = Deno.env.get('TELEGRAM_BOT_TOKEN')
    const chatId = Deno.env.get('TELEGRAM_CHAT_ID')

    if (!botToken || !chatId) {
      console.warn('Telegram credentials not configured — skipping notification')
      return new Response(JSON.stringify({ skipped: true }), { status: 200 })
    }

    const text =
      `🔔 *New registration request*\n\n` +
      `👤 Username: \`${username}\`\n` +
      `📛 Display name: ${displayName}\n\n` +
      `Go to the admin panel to approve or reject.`

    const res = await fetch(`https://api.telegram.org/bot${botToken}/sendMessage`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: 'Markdown',
      }),
    })

    const data = await res.json()
    if (!data.ok) throw new Error(data.description)

    return new Response(JSON.stringify({ sent: true }), { status: 200 })
  } catch (err) {
    console.error('Telegram notification error:', err)
    return new Response(JSON.stringify({ error: err.message }), { status: 500 })
  }
})
