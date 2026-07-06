-- ============================================================
-- Schedule daily cleanup via pg_cron
-- Run this in Supabase SQL Editor AFTER deploying the cleanup Edge Function
-- ============================================================

-- Replace <YOUR_PROJECT_REF> with your actual Supabase project ref
-- Replace <YOUR_CRON_SECRET> with the secret you set in Edge Function env vars

SELECT cron.schedule(
  'daily-chat-cleanup',           -- job name (unique)
  '0 2 * * *',                    -- every day at 02:00 UTC
  $$
  SELECT net.http_post(
    url := 'https://<YOUR_PROJECT_REF>.supabase.co/functions/v1/cleanup',
    headers := '{"Authorization": "Bearer <YOUR_CRON_SECRET>", "Content-Type": "application/json"}'::jsonb,
    body := '{}'::jsonb
  );
  $$
);

-- To view scheduled jobs:
-- SELECT * FROM cron.job;

-- To remove the job if needed:
-- SELECT cron.unschedule('daily-chat-cleanup');
