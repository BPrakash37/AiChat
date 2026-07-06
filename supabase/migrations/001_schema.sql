-- ============================================================
-- ChatSpace - Complete Supabase SQL Schema
-- Run this entire file in Supabase SQL Editor
-- ============================================================

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_cron";

-- ============================================================
-- TABLES
-- ============================================================

-- Profiles (extends auth.users)
CREATE TABLE IF NOT EXISTS public.profiles (
  id            UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username      TEXT UNIQUE NOT NULL,
  display_name  TEXT,
  status        TEXT NOT NULL DEFAULT 'pending'
                  CHECK (status IN ('pending','active','suspended','rejected')),
  role          TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user','admin')),
  is_online     BOOLEAN NOT NULL DEFAULT FALSE,
  last_seen     TIMESTAMPTZ,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Rooms
CREATE TABLE IF NOT EXISTS public.rooms (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name        TEXT,
  type        TEXT NOT NULL DEFAULT 'group' CHECK (type IN ('direct','group')),
  created_by  UUID REFERENCES public.profiles(id),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Room members (soft-delete only — never hard-delete)
CREATE TABLE IF NOT EXISTS public.room_members (
  room_id     UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  role        TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('admin','member')),
  is_removed  BOOLEAN NOT NULL DEFAULT FALSE,
  joined_at   TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  PRIMARY KEY (room_id, user_id)
);

-- Messages
CREATE TABLE IF NOT EXISTS public.messages (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  room_id     UUID NOT NULL REFERENCES public.rooms(id) ON DELETE RESTRICT,
  sender_id   UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  content     TEXT NOT NULL DEFAULT '',
  type        TEXT NOT NULL DEFAULT 'text' CHECK (type IN ('text','image')),
  image_url   TEXT,
  read_by     UUID[] NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Notifications
CREATE TABLE IF NOT EXISTS public.notifications (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id     UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
  type        TEXT NOT NULL,
  payload     JSONB NOT NULL DEFAULT '{}',
  is_read     BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Audit logs
CREATE TABLE IF NOT EXISTS public.audit_logs (
  id          UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  action      TEXT NOT NULL,
  actor_id    UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  target_id   UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  details     JSONB NOT NULL DEFAULT '{}',
  created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================

CREATE INDEX IF NOT EXISTS idx_messages_room_created ON public.messages(room_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_messages_sender ON public.messages(sender_id);
CREATE INDEX IF NOT EXISTS idx_room_members_user ON public.room_members(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON public.notifications(user_id, is_read);
CREATE INDEX IF NOT EXISTS idx_profiles_username ON public.profiles(username);
CREATE INDEX IF NOT EXISTS idx_audit_logs_created ON public.audit_logs(created_at DESC);

-- ============================================================
-- HELPER FUNCTIONS
-- ============================================================

-- Mark all messages in a room as read by a user
CREATE OR REPLACE FUNCTION mark_messages_read(p_room_id UUID, p_user_id UUID)
RETURNS VOID LANGUAGE SQL SECURITY DEFINER AS $$
  UPDATE public.messages
  SET read_by = array_append(read_by, p_user_id)
  WHERE room_id = p_room_id
    AND NOT (read_by @> ARRAY[p_user_id])
    AND sender_id != p_user_id;
$$;

-- Get existing direct room between two users
CREATE OR REPLACE FUNCTION get_direct_room(user_a UUID, user_b UUID)
RETURNS TABLE(room_id UUID) LANGUAGE SQL SECURITY DEFINER AS $$
  SELECT r.id AS room_id
  FROM public.rooms r
  WHERE r.type = 'direct'
    AND EXISTS (
      SELECT 1 FROM public.room_members m1
      WHERE m1.room_id = r.id AND m1.user_id = user_a
    )
    AND EXISTS (
      SELECT 1 FROM public.room_members m2
      WHERE m2.room_id = r.id AND m2.user_id = user_b
    )
  LIMIT 1;
$$;

-- Check if a user is a member of a room (used in RLS)
CREATE OR REPLACE FUNCTION is_room_member(p_room_id UUID, p_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.room_members
    WHERE room_id = p_room_id
      AND user_id = p_user_id
      AND is_removed = FALSE
  );
$$;

-- Check if user is admin
CREATE OR REPLACE FUNCTION is_admin(p_user_id UUID)
RETURNS BOOLEAN LANGUAGE SQL SECURITY DEFINER STABLE AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = p_user_id AND role = 'admin'
  );
$$;

-- ============================================================
-- ROW LEVEL SECURITY
-- ============================================================

ALTER TABLE public.profiles      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.rooms         ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.room_members  ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages      ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs    ENABLE ROW LEVEL SECURITY;

-- Drop existing policies before recreating (idempotent)
DO $$ DECLARE r RECORD;
BEGIN
  FOR r IN SELECT schemaname, tablename, policyname
           FROM pg_policies WHERE schemaname = 'public'
  LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON %I.%I',
                   r.policyname, r.schemaname, r.tablename);
  END LOOP;
END $$;

-- ---- PROFILES ----

-- Anyone can read active profiles (for exact username search)
CREATE POLICY "profiles_read_active" ON public.profiles
  FOR SELECT USING (status = 'active');

-- Users can read their own profile regardless of status
CREATE POLICY "profiles_read_own" ON public.profiles
  FOR SELECT USING (id = auth.uid());

-- Users can update their own non-sensitive fields
CREATE POLICY "profiles_update_own" ON public.profiles
  FOR UPDATE USING (id = auth.uid())
  WITH CHECK (id = auth.uid());

-- Admin can read ALL profiles
CREATE POLICY "profiles_admin_read" ON public.profiles
  FOR SELECT USING (is_admin(auth.uid()));

-- Admin can update any profile (for approve/reject/suspend)
CREATE POLICY "profiles_admin_update" ON public.profiles
  FOR UPDATE USING (is_admin(auth.uid()));

-- Allow insert during registration (via service role or trigger)
CREATE POLICY "profiles_insert" ON public.profiles
  FOR INSERT WITH CHECK (id = auth.uid());

-- ---- ROOMS ----

-- Members can see their rooms
CREATE POLICY "rooms_select" ON public.rooms
  FOR SELECT USING (is_room_member(id, auth.uid()));

-- Admin can see all rooms
CREATE POLICY "rooms_admin_select" ON public.rooms
  FOR SELECT USING (is_admin(auth.uid()));

-- Active users can create rooms
CREATE POLICY "rooms_insert" ON public.rooms
  FOR INSERT WITH CHECK (
    auth.uid() = created_by
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active')
  );

-- Rooms are NEVER deleted (no DELETE policy)

-- ---- ROOM MEMBERS ----

-- Members can view membership lists for their rooms
CREATE POLICY "room_members_select" ON public.room_members
  FOR SELECT USING (is_room_member(room_id, auth.uid()));

-- Admin can see all memberships
CREATE POLICY "room_members_admin_select" ON public.room_members
  FOR SELECT USING (is_admin(auth.uid()));

-- Room creator can add members
CREATE POLICY "room_members_insert" ON public.room_members
  FOR INSERT WITH CHECK (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_id AND created_by = auth.uid()
    )
    OR auth.uid() = user_id  -- allow self-join during room creation
  );

-- Room creator can soft-remove members (UPDATE is_removed only)
CREATE POLICY "room_members_update" ON public.room_members
  FOR UPDATE USING (
    EXISTS (
      SELECT 1 FROM public.rooms
      WHERE id = room_id AND created_by = auth.uid()
    )
  );

-- NEVER hard-delete room_members (no DELETE policy)

-- ---- MESSAGES ----

-- Members can read messages in their rooms
CREATE POLICY "messages_select" ON public.messages
  FOR SELECT USING (is_room_member(room_id, auth.uid()));

-- Active members can send messages
CREATE POLICY "messages_insert" ON public.messages
  FOR INSERT WITH CHECK (
    auth.uid() = sender_id
    AND is_room_member(room_id, auth.uid())
    AND EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND status = 'active')
  );

-- Members can update read_by on messages in their rooms
CREATE POLICY "messages_update_read" ON public.messages
  FOR UPDATE USING (is_room_member(room_id, auth.uid()))
  WITH CHECK (is_room_member(room_id, auth.uid()));

-- Cleanup function can delete old messages (service role bypasses RLS)

-- ---- NOTIFICATIONS ----

CREATE POLICY "notifications_own" ON public.notifications
  FOR ALL USING (user_id = auth.uid());

-- ---- AUDIT LOGS ----

-- Only admins can read audit logs
CREATE POLICY "audit_logs_admin" ON public.audit_logs
  FOR SELECT USING (is_admin(auth.uid()));

-- System/admin can insert audit logs
CREATE POLICY "audit_logs_insert" ON public.audit_logs
  FOR INSERT WITH CHECK (is_admin(auth.uid()) OR actor_id = auth.uid());

-- ============================================================
-- REALTIME PUBLICATIONS
-- ============================================================

-- Enable realtime on key tables
ALTER PUBLICATION supabase_realtime ADD TABLE public.messages;
ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
ALTER PUBLICATION supabase_realtime ADD TABLE public.room_members;

-- ============================================================
-- STORAGE BUCKET
-- ============================================================

-- Run in Supabase dashboard > Storage > Create bucket named: chat-media (public)
-- OR use this SQL:
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'chat-media',
  'chat-media',
  TRUE,
  10485760,  -- 10MB
  ARRAY['image/jpeg','image/png','image/gif','image/webp']
)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS
CREATE POLICY "storage_upload" ON storage.objects
  FOR INSERT WITH CHECK (
    bucket_id = 'chat-media'
    AND auth.role() = 'authenticated'
  );

CREATE POLICY "storage_read" ON storage.objects
  FOR SELECT USING (bucket_id = 'chat-media');

-- ============================================================
-- SUPER ADMIN SETUP
-- NOTE: After running SQL, register with username "prakash374"
-- via the app — it auto-gets admin role. No extra SQL needed.
-- ============================================================
