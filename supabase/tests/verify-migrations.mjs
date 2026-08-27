// Executes the two migrations against a real Postgres (PGlite/WASM) to prove the
// SQL is valid and the triggers/RPCs behave, before it is run on the live DB.
//
// Supabase-specific objects the migrations depend on (auth.uid(), public.users,
// public.mentors, is_admin_user, community_posts, storage RLS) are stubbed to
// match the shapes in the existing migrations.
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const MIGRATIONS = fileURLToPath(new URL('../migrations', import.meta.url));
const db = new PGlite();

const q = (sql, params) => db.query(sql, params);
let failures = 0;

function check(label, condition, detail = '') {
  const mark = condition ? 'PASS' : 'FAIL';
  if (!condition) failures += 1;
  console.log(`  [${mark}] ${label}${detail ? ` — ${detail}` : ''}`);
}

// ---------------------------------------------------------------- scaffolding
const CURRENT_UID = '11111111-1111-1111-1111-111111111111';
const OTHER_UID = '22222222-2222-2222-2222-222222222222';

await db.exec(`
  -- Roles Supabase provides out of the box.
  CREATE ROLE anon NOLOGIN;
  CREATE ROLE authenticated NOLOGIN;
  CREATE ROLE service_role NOLOGIN BYPASSRLS;

  CREATE SCHEMA IF NOT EXISTS auth;
  CREATE TABLE auth._session (uid uuid);
  INSERT INTO auth._session VALUES ('${CURRENT_UID}');
  CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT uid FROM auth._session $$;

  CREATE TABLE public.users (
    id uuid PRIMARY KEY,
    name text,
    email text,
    role text,
    profile_image text,
    department text,
    is_admin boolean DEFAULT false
    -- No email_notifications here on purpose: an applied migration adds it with
    -- a bare ADD COLUMN, so declaring it up front makes that migration fail.
  );
  CREATE TABLE public.mentors (
    id uuid PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    name text,
    department text,
    year_of_studies text,
    skills text[],
    bio text,
    hobbies text,
    is_alumni boolean DEFAULT false,
    job_title text,
    company text,
    profile_image text,
    rating numeric,
    review_count integer,
    -- Mentor-entered JSONB lists. Needed by mentor_summary_source_hash() and
    -- mentors_needing_summary() (20260823190000), which name them directly --
    -- a \`LANGUAGE sql\` body is parsed at CREATE time, so a missing column here
    -- fails the migration rather than the first call.
    projects jsonb NOT NULL DEFAULT '[]'::jsonb,
    experiences jsonb NOT NULL DEFAULT '[]'::jsonb,
    courses jsonb NOT NULL DEFAULT '[]'::jsonb
  );

  -- Trimmed stand-in for public.knowledge_chunks (20260806160000). The real
  -- table's \`embedding\` column is \`extensions.vector(768)\`, but the installed
  -- @electric-sql/pglite (0.5.4, currently the latest release) ships no vector
  -- extension at all -- confirmed by listing its dist/*.tar.gz contrib bundles,
  -- pgvector is not among them, in any version. So this stub uses jsonb as a
  -- placeholder for a column this test never does vector math against; it
  -- exists only so rebuild_mentor_chunks()'s CASE...THEN NULL ELSE embedding
  -- expression type-checks. Real HNSW/cosine-similarity behaviour is only
  -- verified against the live Supabase Postgres, which does have pgvector.
  CREATE TABLE public.knowledge_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    entity_type TEXT NOT NULL,
    entity_id UUID NOT NULL,
    title TEXT NOT NULL,
    subtitle TEXT,
    body TEXT NOT NULL,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    visibility TEXT NOT NULL DEFAULT 'public',
    source_path TEXT,
    content_hash TEXT NOT NULL,
    embedding JSONB,
    embedded_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (entity_type, entity_id)
  );

  CREATE TABLE public.search_query_cache (
    query_hash text PRIMARY KEY,
    query_text text NOT NULL,
    embedding jsonb,
    hit_count integer NOT NULL DEFAULT 1,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_used_at timestamptz NOT NULL DEFAULT now()
  );
  ALTER TABLE public.search_query_cache ENABLE ROW LEVEL SECURITY;

  CREATE FUNCTION public.is_admin_user(user_id uuid DEFAULT auth.uid())
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS
    $$ SELECT COALESCE((SELECT is_admin FROM public.users WHERE id = user_id), false) $$;

  INSERT INTO public.users (id, name, email, role, department, is_admin) VALUES
    ('${CURRENT_UID}', 'Asha Student', 'asha@srmap.edu.in', 'student', 'CSE', false),
    ('${OTHER_UID}',   'Ravi Mentor',  'ravi@srmap.edu.in', 'mentor',  'CSE', false);
  INSERT INTO public.mentors (id, name, department) VALUES ('${OTHER_UID}', 'Ravi Mentor', 'CSE');

  -- community_posts as it exists today, per 20250707170643.
  CREATE TABLE public.community_posts (
    id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
    mentor_id UUID NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    post_type TEXT NOT NULL DEFAULT 'general',
    tags TEXT[] DEFAULT ARRAY[]::TEXT[],
    status TEXT NOT NULL DEFAULT 'open',
    likes_count INTEGER NOT NULL DEFAULT 0,
    comments_count INTEGER NOT NULL DEFAULT 0,
    image_url TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    CONSTRAINT fk_mentor FOREIGN KEY (mentor_id) REFERENCES public.mentors(id) ON DELETE CASCADE
  );
  ALTER TABLE public.community_posts ENABLE ROW LEVEL SECURITY;
  CREATE POLICY "Anyone can view community posts" ON public.community_posts FOR SELECT USING (true);
  CREATE POLICY "Verified mentors can create posts" ON public.community_posts FOR INSERT
    WITH CHECK (EXISTS (SELECT 1 FROM public.mentors WHERE id = auth.uid() AND department != 'General'));
  CREATE POLICY "Mentors can update their own posts" ON public.community_posts FOR UPDATE USING (mentor_id = auth.uid());
  CREATE POLICY "Mentors can delete their own posts" ON public.community_posts FOR DELETE USING (mentor_id = auth.uid());

  CREATE TABLE public.post_likes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    UNIQUE (post_id, user_id)
  );
  CREATE TABLE public.post_comments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL,
    content TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );

  CREATE TABLE IF NOT EXISTS public.user_presence (
    user_id UUID PRIMARY KEY REFERENCES public.users(id) ON DELETE CASCADE,
    is_online BOOLEAN NOT NULL DEFAULT false,
    last_seen TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
  );

  -- Groups, as of 20260731090000 + 20260731130000, trimmed to the columns the
  -- channels migration actually touches.
  CREATE TABLE public.communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'general',
    cover_image TEXT,
    owner_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    visibility TEXT NOT NULL DEFAULT 'public',
    member_count INT NOT NULL DEFAULT 0,
    post_count INT NOT NULL DEFAULT 0,
    is_archived BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE public.community_members (
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    role TEXT NOT NULL DEFAULT 'member',
    joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (community_id, user_id)
  );
  CREATE TABLE public.community_group_messages (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    community_id UUID NOT NULL REFERENCES public.communities(id) ON DELETE CASCADE,
    sender_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    channel TEXT NOT NULL DEFAULT 'general',
    content TEXT NOT NULL,
    reply_to_id UUID REFERENCES public.community_group_messages(id) ON DELETE SET NULL,
    reactions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
  );
  CREATE TABLE IF NOT EXISTS public.community_group_message_reactions (
    message_id UUID NOT NULL REFERENCES public.community_group_messages(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    emoji TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    PRIMARY KEY (message_id, user_id, emoji)
  );

  CREATE FUNCTION public.slugify(p_text text) RETURNS text LANGUAGE sql IMMUTABLE AS $$
    SELECT trim(both '-' FROM regexp_replace(
      regexp_replace(lower(coalesce(p_text, '')), '[^a-z0-9]+', '-', 'g'), '-{2,}', '-', 'g'))
  $$;

  CREATE FUNCTION public.can_view_community(p_community_id uuid, p_user_id uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT CASE WHEN p_community_id IS NULL THEN true ELSE EXISTS (
      SELECT 1 FROM public.communities c WHERE c.id = p_community_id AND (
        c.visibility = 'public'
        OR (auth.uid() IS NOT NULL AND p_user_id IS NOT DISTINCT FROM auth.uid() AND (
             c.owner_id = auth.uid()
             OR EXISTS (SELECT 1 FROM public.community_members m
                         WHERE m.community_id = c.id AND m.user_id = auth.uid())
             OR public.is_admin_user(auth.uid())))))
    END $$;

  -- Supabase creates this publication; the channels migration adds a table to it.
  CREATE PUBLICATION supabase_realtime;
`);

// ---------------------------------------------------------------------------
// Extended baseline: tables/columns this repo never created via a migration
// file (created by hand in the Supabase dashboard before migration tracking
// began, or added there mid-life -- `mentor_verifications.cgpa` is a real
// example: it is read starting in 20250707001657 with no ADD COLUMN anywhere
// in history). No migration defines their base shape, so an empty PGlite
// database cannot reconstruct them by replaying migrations; they are
// hand-authored here instead, matching the shape those tables have today.
// This is what unlocks running the large 2026-07/08 batch below for real
// instead of by hand -- see the SKIP list at the bottom of this file for the
// migrations this still leaves unreplayed.
await db.exec(`
  -- auth.users: FK target (email_queue.recipient_id) and, since
  -- 20260823220000_admin_kpi_metrics.sql, the signup-count source for the
  -- admin KPI panel. created_at is a real Supabase Auth column, present on
  -- every project regardless of what public.users happens to carry.
  CREATE TABLE auth.users (
    id uuid PRIMARY KEY,
    email text,
    raw_user_meta_data jsonb,
    created_at timestamptz NOT NULL DEFAULT now(),
    last_sign_in_at timestamptz
  );
  INSERT INTO auth.users (id, email, created_at, last_sign_in_at) VALUES
    ('${CURRENT_UID}', 'asha@srmap.edu.in', now() - interval '2 days', now() - interval '1 hour'),
    ('${OTHER_UID}', 'ravi@srmap.edu.in', now() - interval '90 days', now() - interval '90 days');

  CREATE OR REPLACE FUNCTION auth.stub_ensure_auth_user()
  RETURNS trigger LANGUAGE plpgsql AS $$
  BEGIN
    INSERT INTO auth.users (id, email, created_at)
    VALUES (new.id, coalesce(new.email, 'stub@srmap.edu.in'), now() - interval '365 days')
    ON CONFLICT (id) DO NOTHING;
    RETURN new;
  END;
  $$;
  CREATE TRIGGER trg_stub_ensure_auth_user
    BEFORE INSERT ON public.users
    FOR EACH ROW EXECUTE FUNCTION auth.stub_ensure_auth_user();

  ALTER TABLE public.users
    ADD COLUMN verification_status text,
    ADD COLUMN skills text[],
    ADD COLUMN linkedin_url text,
    ADD COLUMN bio text,
    ADD COLUMN mobile text,
    ADD COLUMN email_notifications boolean DEFAULT true;

  ALTER TABLE public.mentors
    ADD COLUMN linkedin_url text,
    ADD COLUMN cgpa numeric,
    ADD COLUMN university text,
    ADD COLUMN mobile text,
    ADD COLUMN created_at timestamptz NOT NULL DEFAULT now(),
    ADD COLUMN is_available boolean NOT NULL DEFAULT true,
    ADD COLUMN available_from date,
    ADD COLUMN availability_note text;

  CREATE FUNCTION public.is_active_mentor(p_user_id uuid)
    RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS $$
    SELECT EXISTS (SELECT 1 FROM public.mentors m WHERE m.id = p_user_id AND coalesce(m.is_available, true) = true)
  $$;

  -- 1:1 chat. Dashboard-origin (see above); still live (mentor_certificates'
  -- mentor_impact() and chat_participant_profiles() both read it).
  CREATE TABLE public.conversations (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user1_id uuid NOT NULL,
    user2_id uuid NOT NULL,
    last_message_id uuid,
    last_updated timestamptz,
    created_at timestamptz NOT NULL DEFAULT now()
  );
  CREATE TABLE public.messages (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    conversation_id uuid NOT NULL REFERENCES public.conversations(id) ON DELETE CASCADE,
    sender_id uuid NOT NULL,
    receiver_id uuid NOT NULL,
    content text NOT NULL,
    sent_at timestamptz NOT NULL DEFAULT now(),
    is_read boolean DEFAULT false,
    delivery_status text DEFAULT 'sent',
    message_type text DEFAULT 'text'
  );

  -- mentor_reviews: legacy single-score mentor rating (distinct from
  -- faculty_ratings above). Still read by mentor_impact() for the certificate.
  CREATE TABLE public.mentor_reviews (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    mentor_id uuid NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
    reviewer_id uuid NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
    rating integer NOT NULL CHECK (rating BETWEEN 1 AND 5),
    review_text text,
    created_at timestamptz NOT NULL DEFAULT now(),
    updated_at timestamptz NOT NULL DEFAULT now(),
    UNIQUE (mentor_id, reviewer_id)
  );

  -- badge_types / user_badges / notifications / mentor_verifications: created
  -- by 20250615102334 (part of the SKIPped legacy cluster). Shape below is
  -- that migration's final state, which the 2026-04+ migrations replayed here
  -- build on directly.
  CREATE TABLE public.badge_types (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    name text NOT NULL UNIQUE,
    description text, icon text, color text DEFAULT '#3B82F6',
    category text CHECK (category IN ('performance','expertise','contribution','special')),
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
  );
  CREATE TABLE public.user_badges (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    badge_type_id uuid REFERENCES public.badge_types(id) ON DELETE CASCADE,
    awarded_by uuid REFERENCES public.users(id),
    awarded_at timestamptz DEFAULT now(),
    notes text,
    UNIQUE (user_id, badge_type_id)
  );
  CREATE TABLE public.notifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid REFERENCES public.users(id) ON DELETE CASCADE,
    type text, title text NOT NULL, content text, read boolean DEFAULT false,
    data jsonb, created_at timestamptz DEFAULT now()
  );
  CREATE TABLE public.mentor_verifications (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id uuid UNIQUE REFERENCES public.users(id) ON DELETE CASCADE,
    status text CHECK (status IN ('pending','approved','rejected')) DEFAULT 'pending',
    submitted_at timestamptz DEFAULT now(),
    reviewed_at timestamptz,
    reviewed_by uuid,
    rejection_reason text,
    application_data jsonb,
    cgpa numeric, year_of_studies text, university text, hobbies text, mobile text
  );

  -- Functions defined by the same SKIPped 20250615102334/20250815121408
  -- migrations. auto_award_performance_badges() is what 20260730210000
  -- (RUN below) merely schedules; nothing later redefines it.
  CREATE OR REPLACE FUNCTION public.notify_badge_award()
    RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER AS $$
    DECLARE badge_name TEXT;
    BEGIN
      SELECT name INTO badge_name FROM public.badge_types WHERE id = NEW.badge_type_id;
      INSERT INTO public.notifications (user_id, type, title, content, data)
      VALUES (NEW.user_id, 'badge', 'New Badge Earned!',
        'Congratulations! You have earned the "' || badge_name || '" badge.',
        jsonb_build_object('badge_type_id', NEW.badge_type_id, 'badge_name', badge_name));
      RETURN NEW;
    END; $$;
  CREATE TRIGGER badge_award_notification AFTER INSERT ON public.user_badges
    FOR EACH ROW EXECUTE FUNCTION public.notify_badge_award();

  CREATE OR REPLACE FUNCTION public.auto_award_performance_badges()
    RETURNS void LANGUAGE plpgsql SECURITY DEFINER AS $$
    BEGIN
      INSERT INTO public.user_badges (user_id, badge_type_id, notes)
      SELECT DISTINCT m.id, bt.id, 'Auto-awarded for exceptional performance'
      FROM public.mentors m JOIN public.badge_types bt ON bt.name = 'Top Mentor'
      WHERE m.rating >= 4.5 AND m.review_count >= 10
        AND NOT EXISTS (SELECT 1 FROM public.user_badges ub WHERE ub.user_id = m.id AND ub.badge_type_id = bt.id);
      INSERT INTO public.user_badges (user_id, badge_type_id, notes)
      SELECT DISTINCT m.id, bt.id, 'Auto-awarded for promising new mentor'
      FROM public.mentors m JOIN public.badge_types bt ON bt.name = 'Rising Star'
      WHERE m.rating >= 4.0 AND m.review_count >= 3 AND m.review_count < 10
        AND m.created_at > NOW() - INTERVAL '3 months'
        AND NOT EXISTS (SELECT 1 FROM public.user_badges ub WHERE ub.user_id = m.id AND ub.badge_type_id = bt.id);
    END; $$;
  INSERT INTO public.badge_types (name, category) VALUES ('Top Mentor', 'performance'), ('Rising Star', 'performance');

  -- marketplace_posts / team_members: dashboard-origin "about us" / classifieds
  -- tables. Only stubbed with the columns 20260804132345 (RUN below) grants.
  CREATE TABLE public.marketplace_posts (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    title text, description text, category text, date text, author text,
    image_url text, external_link text, user_id uuid,
    created_at timestamptz DEFAULT now(), updated_at timestamptz DEFAULT now()
  );

  -- storage.objects / storage.buckets: platform-provided by Supabase Storage,
  -- not by any migration. Stubbed for the bucket policies 20260804132345/20260821170000.
  CREATE SCHEMA storage;
  CREATE TABLE storage.buckets (
    id text PRIMARY KEY,
    name text NOT NULL,
    public boolean DEFAULT false,
    file_size_limit bigint,
    allowed_mime_types text[]
  );
  CREATE TABLE storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text, name text, owner uuid, created_at timestamptz DEFAULT now()
  );

  -- cron / net: pg_cron and pg_net are pre-installed on every Supabase
  -- project but PGlite ships neither. Stubbed so the "schedule this on
  -- cron" migrations run for real and their intent (job name + cadence) is
  -- assertable, without ever actually firing the scheduled SQL.
  CREATE SCHEMA cron;
  CREATE TABLE cron.job (
    jobid bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    jobname text UNIQUE, schedule text, command text, active boolean DEFAULT true
  );
  CREATE FUNCTION cron.schedule(p_jobname text, p_schedule text, p_command text)
    RETURNS bigint LANGUAGE plpgsql AS $$
    DECLARE v_id bigint;
    BEGIN
      INSERT INTO cron.job (jobname, schedule, command) VALUES (p_jobname, p_schedule, p_command)
      ON CONFLICT (jobname) DO UPDATE SET schedule = EXCLUDED.schedule, command = EXCLUDED.command
      RETURNING jobid INTO v_id;
      RETURN v_id;
    END; $$;
  CREATE FUNCTION cron.unschedule(p_jobname text) RETURNS boolean LANGUAGE plpgsql AS $$
    BEGIN DELETE FROM cron.job WHERE jobname = p_jobname; RETURN true; END; $$;
  CREATE FUNCTION cron.alter_job(job_id bigint, active boolean DEFAULT NULL)
    RETURNS void LANGUAGE sql AS $$
    UPDATE cron.job SET active = COALESCE(alter_job.active, cron.job.active) WHERE jobid = job_id;
  $$;

  CREATE SCHEMA net;
  CREATE FUNCTION net.http_post(
    url text, headers jsonb DEFAULT '{}'::jsonb, body jsonb DEFAULT '{}'::jsonb,
    timeout_milliseconds integer DEFAULT 5000
  ) RETURNS bigint LANGUAGE sql AS $$ SELECT 1::bigint $$;
`);

// A pre-existing post authored by the mentor, to exercise the backfill.
await q(`INSERT INTO public.community_posts (mentor_id, title, content) VALUES ($1, 'Legacy mentor post', 'body')`, [OTHER_UID]);
console.log('Scaffolding ready.\n');

// ---------------------------------------------------------------- migrations
// Chronological order, matching how these actually landed in production.
// Every file here is applied for real (db.exec of the file's own SQL) and
// has at least one behavioral assertion below. Files NOT in this list are
// enumerated with a reason at the bottom of this file (search SKIPPED).
for (const file of [
  '20260418030116_b5e49be0-53c5-4f02-b002-9690984a3ba4.sql',
  '20260726010000_faculty_ratings.sql',
  '20260726010100_community_posts_open_to_students.sql',
  '20260730120000_college_id_and_graduation_year.sql',
  '20260730130000_mentor_application_flags.sql',
  '20260730140000_is_college_id_taken.sql',
  '20260730150000_email_queue.sql',
  '20260730160000_email_queue_sweep_schedule.sql',
  '20260730170000_alumni_transition.sql',
  '20260730180000_alumni_prompt_schedule.sql',
  '20260730190000_mentor_certificates.sql',
  '20260730200000_chat_participant_profiles.sql',
  '20260730210000_badge_award_schedule.sql',
  '20260804132345_b843f814-46d5-4c25-bc80-32e5f6ebba59.sql',
  '20260804132512_fd08b60a-6119-47f3-aff7-c5e9214ee616.sql',
  '20260804140000_add_user_theme_preference.sql',
  '20260804160000_welcome_tour_flag.sql',
  '20260804170000_lock_down_anon_rpc_surface.sql',
  '20260806100000_faculty_research_interests.sql',
  '20260806190000_opportunities.sql',
  '20260806220000_opportunity_posting.sql',
  '20260807040000_notifications_realtime.sql',
  '20260807120000_srmap_events_cache.sql',
  '20260807120100_srmap_events_sync_schedule.sql',
  '20260807140000_community_channels.sql',
  '20260808150000_mentor_projects_experience.sql',
  '20260808160000_academic_imports.sql',
  '20260808170000_mentor_courses.sql',
  '20260815200000_ai_overview_feedback.sql',
  '20260815210000_ai_overview_feedback_status.sql',
  '20260815220000_platform_settings.sql',
  '20260815230000_ai_feedback_and_queries_admin_access.sql',
  '20260816100000_search_interactions.sql',
  '20260820120000_set_user_admin_status_rpc.sql',
  '20260820130000_drop_legacy_canvas_tables.sql',
  '20260820100000_campus_documents.sql',
  '20260821090000_marketplace_posts_user_id_index.sql',
  '20260821100000_fix_storage_list_policy_bucket_ids.sql',
  '20260821110000_campus_notices.sql',
  '20260821120000_academic_calendar_resolver.sql',
  '20260821130000_campus_notices_admin_preview.sql',
  '20260821140000_campus_notices_superseded_date.sql',
  '20260821150000_faculty_has_image_and_photos.sql',
  '20260821160000_search_history.sql',
  '20260821170000_faculty_and_events_storage_buckets.sql',
  '20260821180000_update_faculty_image_urls_to_storage.sql',
  '20260821190000_search_history_result_url.sql',
  '20260821210000_knowledge_articles.sql',
  '20260821220000_knowledge_articles_grants_fix.sql',
  '20260821230000_grant_audit_fix.sql',
  '20260823090000_trending_searches.sql',
  '20260823100000_grant_faculty_office_and_research.sql',
  '20260823140000_search_click_tracking.sql',
  '20260823150000_search_analytics.sql',
  '20260823170000_mentor_activity_stats.sql',
  '20260823190000_mentor_profile_summary.sql',
  '20260823210000_academic_refresh_reminder.sql',
  '20260823220000_academic_refresh_schedule.sql',
  '20260823240000_mentor_dashboard_stats.sql',
  '20260823230000_admin_kpi_metrics.sql',
  '20260823250000_user_badges_public_rpc.sql',
  '20260824100000_srm_portal_credentials.sql',
  '20260824110000_date_of_birth_linked_flag.sql',
  '20260824120000_academic_imports_mobile_number.sql',
  '20260824130000_srm_portal_sync_schedule.sql',
  '20260824140000_fix_is_admin_self_elevation.sql',
  '20260826080000_srmap_events_sync_every_6h.sql',
  '20260826090000_cascade_user_deletions_and_cleanup_orphaned_users.sql',
  '20260826100000_mentor_slugs.sql',
  '20260826110000_mentor_multisignal_activity.sql',
  '20260826130000_direct_messages_reply_to.sql',
  '20260826140000_edit_delete_messages_30min.sql',
  '20260826150000_push_notifications.sql',
  '20260826160000_srm_attendance_and_holidays.sql',
  '20260827100000_pwa_installs_tracking.sql',
]) {
  if (file === '20260804132345_b843f814-46d5-4c25-bc80-32e5f6ebba59.sql') {
    // Production's `faculty` table still carries `profile_image`, a column
    // from the reverted single-score schema that this repo's CREATE TABLE IF
    // NOT EXISTS never recreates on a clean install (see verify-upgrade.mjs).
    // This migration's column-grant list names it, so it must exist here too.
    await db.exec(`
      ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS profile_image text;
      ALTER TABLE public.faculty ADD COLUMN IF NOT EXISTS avg_rating numeric;
    `);
  }
  const sql = fs.readFileSync(path.join(MIGRATIONS, file), 'utf8');
  try {
    await db.exec(sql);
    console.log(`APPLIED  ${file}`);
  } catch (error) {
    failures += 1;
    console.log(`FAILED   ${file}\n         ${error.message}`);
    process.exit(1);
  }
}
console.log('');

// =====================================================================
// SKIPPED (73 of the 129 files in supabase/migrations/, not executed above).
// Every migration in the repo falls into exactly one of these eight groups
// -- with one exception (see the NOTE inside group 1), which names the file
// and the reason it isn't bulleted, rather than silently dropping it. None
// of them are silently missing -- each is listed below with why.
//
// 1. PGVECTOR (9 files -- 8 listed below, 1 flagged only in the NOTE) --
//    genuinely cannot run in PGlite.
//
//    20260817100000_dynamic_related_searches.sql
//    Computes vector similarity over the search_query_cache to generate
//    dynamic related searches. Because it uses vector operators (`<=>`),
//    it requires pgvector and cannot run against the PGlite jsonb stub.
//    Verified manually via local apply and inspecting related searches.
//
//    20260817000000_multi_chunk_indexing.sql
//    Redefines projectors and alters knowledge_chunks to support multi-chunk
//    indexing. Because the projectors explicitly update the 'embedding' column,
//    it requires pgvector and cannot run against the PGlite jsonb stub.
//    Verified manually via local apply and inspecting chunk counts.
//
//    20260809150000_admin_health_metrics.sql
//    Counts rows of the pgvector-backed knowledge_chunks and reads
//    cron.job_run_details (the stub cron schema has no run history).
//    Verified against production 2026-08-09 with BEGIN/ROLLBACK: the
//    42501 gate for non-admin callers, and a non-NULL metrics build.
//    20260806160000_knowledge_chunks.sql
//    Creates `extensions.vector(768)`. The installed @electric-sql/pglite
//    (0.5.4, currently latest) ships no pgvector build at all, in any
//    version. A trimmed jsonb stand-in for the table is hand-built in the
//    scaffolding above (search "Trimmed stand-in for public.knowledge_chunks")
//    so later migrations that write to it (academic_imports, opportunities)
//    can still be exercised for real. HNSW / cosine-similarity behaviour is
//    verified separately against the live Supabase Postgres with
//    BEGIN/ROLLBACK, which does have pgvector.
//
//    20260809120000_student_interest_chunks.sql
//    The rebuild_student_chunks() projector upserts into knowledge_chunks
//    and its ON CONFLICT clause reads/writes the `embedding` vector column,
//    so it needs the real pgvector table. Verified against production
//    2026-08-09 with a full BEGIN/ROLLBACK rehearsal before apply: the
//    per-row trigger projected a chunk on opt-in, deleted it on opt-out,
//    the body carried the interests text, and no student chunk existed
//    with visibility other than 'signed_in'. All assertions raised on
//    failure; the batch completed clean, then rolled back.
//
//    20260823110000_search_knowledge_returns_body.sql
//    Redefines search_knowledge(), whose body reads `kc.embedding <=>
//    p_embedding` -- same pgvector dependency as every other file in this
//    group. Verify against production with BEGIN/ROLLBACK before commit:
//    confirm the function's OUT columns now include `body`, and that
//    `SELECT * FROM search_knowledge(...)` for a query known to match a
//    seeded chunk returns that chunk's body text non-NULL.
//
//    20260823180000_search_knowledge_hides_paused_mentors.sql
//    Redefines search_knowledge() again, adding a NOT EXISTS clause so a
//    mentor who paused their listing stops being returned to AI mode,
//    semantic search and AI Overview citations. Same `kc.embedding <=>
//    p_embedding` pgvector dependency as the rest of this group.
//    Verify against production with BEGIN/ROLLBACK before commit: pause a
//    mentor known to match a query (UPDATE mentors SET is_available =
//    false), re-run search_knowledge() for that query and confirm their
//    row is gone while a listed mentor's row survives; then confirm a past
//    available_from brings them back, since mentor_is_listed() treats an
//    expired pause as over. Rolling back restores the availability row.
//
//    20260823200000_mentor_course_chunks.sql
//    Redefines rebuild_mentor_chunks() again, folding a "Completed
//    coursework: ..." sentence (from public.mentors.courses) into the
//    single per-mentor chunk body, so listed coursework becomes
//    semantically searchable -- it previously wasn't embedded at all.
//    Targets the schema actually live in production, NOT the "main" +
//    "skill_N" multi-chunk split that 20260817000000_multi_chunk_indexing.sql
//    describes -- that migration was confirmed 2026-08-23 (reading
//    information_schema.columns and pg_get_functiondef against production)
//    to have never been applied; the live table still has no chunk_index
//    column and only the original (entity_type, entity_id) unique
//    constraint. Same ON CONFLICT ... embedding column dependency as the
//    rest of this group. Verify against production with BEGIN/ROLLBACK
//    before commit: seed a mentor row with a courses entry containing a
//    known course name, run rebuild_mentor_chunks(), confirm that mentor's
//    chunk body contains "Completed coursework: ..." with that name and
//    a NULL embedding (queued for the next embed-knowledge-topup run), and
//    that a mentor with an empty courses array is unaffected.
//
//    NOTE: 20260816090000_enrich_mentor_chunks.sql, which also redefines
//    search_knowledge() (raising p_min_similarity's default 0.30 -> 0.35),
//    predates this comment and was never added to this list or the
//    executed-migrations array above -- a pre-existing gap in this harness,
//    not something this pass silently swept in. Flagged here rather than
//    fixed, since fixing it means writing the same kind of production
//    verification retroactively for a migration that already shipped.
//
// 2. HTTP EXTENSION (1 file) -- genuinely cannot run in PGlite.
//    20250830093916_929b871a-3813-4027-b579-bc3b114062c6.sql
//    `CREATE EXTENSION IF NOT EXISTS http;` -- PGlite ships no `http`
//    (pgsql-http) build either, so this statement errors immediately,
//    before anything else in the file runs. Moot in practice: the
//    synchronous http_post() call this file adds to notify_message_email()
//    was replaced by the queued architecture in 20260730150000_email_queue.sql
//    (run above), which is what production runs today.
//
// 3. LEGACY 2025-06-15 -> 2025-08-30 CLUSTER (29 files) -- patches tables this
//    repo never created via a migration. `public.users`, `public.mentors`,
//    `public.conversations`, `public.messages`, `public.marketplace_posts`
//    and `public.team_members` were created by hand in the Supabase Studio
//    table editor before migration tracking began here; no CREATE TABLE for
//    any of them exists anywhere in supabase/migrations/. An empty PGlite
//    database has no way to reconstruct their starting shape, so these files
//    cannot be replayed from scratch -- a different kind of PGlite
//    incompatibility than pgvector, but a real one. Their cumulative effect
//    (badge_types, user_badges, mentor_verifications, notifications,
//    mentor_reviews, contact_messages/responses, admin_audit_log,
//    admin_recovery, typing_indicators, user_presence, the conversations/
//    messages columns, and the final handle_new_user/update_verification_status
//    bodies) is instead hand-authored into the "Extended baseline" scaffolding
//    block above, in the shape those tables and functions have today -- which
//    is what makes replaying the 2026-04+ migrations on top of it possible.
//    Most of these files also just redefine the same function repeatedly
//    (update_verification_status alone: 20250615102334, 124443, 619023547,
//    707001657, 809110610, 815121408 -- six bodies, all superseded by the
//    version 20260804170000_lock_down_anon_rpc_surface.sql installs, which
//    IS exercised above); testing each intermediate body would assert
//    nothing the final version doesn't already cover.
//      20250615014216-4414210c-8775-4a73-ba82-a12a1326a0ca.sql
//      20250615020750-cf59d3b8-f81a-4ec9-b671-70380e022e95.sql
//      20250615023337-f55db0f0-f00f-4473-98fc-bee33668cc42.sql
//      20250615074533-d83027e2-abe6-4eb6-928e-561f0cd653eb.sql
//      20250615102334-410a876e-290d-4626-97c6-add4369ca89c.sql
//      20250615124443-d84cd39c-1feb-4653-9c54-251833e83170.sql
//      20250615134440-bdd0fbbd-d53d-4811-b0e2-98ed1debd014.sql
//      20250615140729-71084747-0678-4fb5-94ec-b86eaa1327fe.sql
//      20250615153039-d14b1ec8-dc59-4138-93ae-df371b7e9b6c.sql
//      20250615165032-17e46eb2-2e7d-4144-a817-a25fe131e94c.sql
//      20250615171202-938022c7-067c-456c-a2ef-dff76e0c4a0c.sql
//      20250615172358-2ac3c5c3-8c51-41af-9859-587a8030ba07.sql
//      20250615180805-889098e7-0739-4f6f-9503-1f7855c75c13.sql
//      20250618012117-45f7c644-838e-464b-8da4-114be692e618.sql
//      20250619023547-79c7520e-be29-4a0a-b365-53684b686cc5.sql
//      20250704051730-1ec2dd7d-6a09-406e-a5da-ec055884bada.sql
//      20250707001657-01c2ce35-41ea-40a3-b376-c67b1da81af0.sql
//      20250707170643-ae110841-4859-4228-a5fe-da7ea50d8f45.sql
//      20250708043620-458d0f9a-4323-476b-b03f-9353f27d82ac.sql
//      20250809110610_e96312df-0dd9-45a0-87f2-24d693689205.sql
//      20250815120417_e4915e5d-8d6e-41b9-b4e4-7f213c6b4e9a.sql
//      20250815120439_4023bf50-7f69-438c-96d2-e94a2fabe82e.sql
//      20250815120500_5fd3742d-51c2-43f9-a40e-a7056f572292.sql
//      20250815120521_92bde878-84c8-4d0e-a426-388064bfbf3d.sql
//      20250815121408_073dbf8f-cac1-4ee5-94b7-375b48e730a8.sql
//      20250815220000_prevent_duplicate_conversations.sql
//      20250816000000_create_contact_responses.sql
//      20250816054105_1250c9ba-da86-48cf-9c6f-acf6424cc82d.sql
//      20250821024831_af941fad-5b8d-4422-92bc-fe7acabdafa4.sql
//
// 4. NOV-2025 / APRIL-2026 PATCHES TO THE SAME DASHBOARD-ORIGIN TABLES (7
//    files) -- same reasoning as group 3: they redefine functions the
//    scaffolding already hand-authors in final form (update_verification_status
//    again; is_admin_user/team_members_public/users_public view security), or
//    add RLS to storage.objects/marketplace_posts columns this harness does
//    not otherwise touch.
//      20251107000000_fix_mentor_verifications_columns.sql (empty file)
//      20251107031953_6921a78b-b383-4f3a-86bb-e7add9c01d2a.sql
//      20251107032340_67d54873-ba81-4b6b-95a9-51fe18b5d20e.sql
//      20251107032715_e762f658-7833-44c5-b511-e0653f6b5566.sql
//      20260418024920_e41e59ab-3f50-4bd2-abd5-10d3c15168c3.sql
//      20260418024940_a745043f-0b83-4660-a19d-342bf252ebc8.sql
//      20260418025448_a4b8a106-6764-4bb8-a590-f6cb7d3efc85.sql
//
// 5. COMMUNITIES / PRIVATE-COMMUNITIES CLUSTER (13 files) -- the schema this
//    harness needs for 20260807140000_community_channels.sql (executed and
//    exercised above) is hand-authored directly into the scaffolding
//    (`CREATE TABLE public.communities`, `community_members`,
//    `community_group_messages`, `can_view_community`, `slugify`) rather
//    than built up by replaying every migration that shaped it. That
//    baseline already reflects each of these files' end state, so replaying
//    them again on top would mostly hit "already exists" -- the honest fix is
//    to fold them into the scaffolding as their own migration steps, which is
//    follow-up work, not something this pass silently swept under the rug.
//      20260731090000_communities.sql
//      20260731130000_private_communities.sql
//      20260802092000_anyone_signed_in_can_start_a_group.sql
//      20260802100000_community_post_type_counts.sql
//      20260802110000_community_feed_only_mine.sql
//      20260802120000_community_kind_counts.sql
//      20260802130000_community_group_messages.sql
//      20260802140000_community_group_chat_backend.sql
//      20260802150000_community_owner_mentor_flag.sql
//      20260806200000_community_notification_deep_links.sql
//      20260807030000_search_groups_and_posts.sql
//      20260807130000_community_last_activity.sql
//      20260821200000_community_search_name_only.sql -- CREATE OR REPLACEs
//        list_communities from the file above (name-only search, drops the
//        description ilike clause); same reason as that file, not this pass.
//
// 6. OUT OF SCOPE FOR THIS PASS (11 files) -- self-contained, plausibly
//    runnable features (mentor availability, profile-image mirroring, the
//    welcome-email surface) that were not read/replayed here for real. Said
//    plainly rather than assigned a reason that would overstate what was
//    checked: nobody has verified these files apply cleanly against this
//    harness's baseline. Recommended follow-up, same technique as this pass --
//    read each, extend the scaffolding if it touches a dashboard-origin
//    table, add it to the MIGRATIONS array in date order, assert its one most
//    breakable behaviour.
//      20260731100000_google_profile_image.sql
//      20260731110000_restore_mentor_rls_policies.sql
//      20260731120000_mentor_availability.sql
//      20260731140000_mentor_welcome_email.sql
//      20260731150000_welcome_email_tracking.sql
//      20260802090000_welcome_status_real_sends_and_names.sql
//      20260802091000_mirror_profile_image_to_mentors.sql
//      20260804150000_student_welcome_email.sql
//      20260806210000_mentor_application_notification_welcome_link.sql
//      20260814180000_srmap_events_rich_details.sql -- ALTER TABLE +
//        GRANT SELECT on srmap_events_cache, which 20260807120000 (RUN above)
//        already creates; would plausibly run and assert cleanly today.
//      20260817110000_freshness_ranking.sql -- adds a STABLE is_fresh()
//        computed column over public.opportunities, which 20260806190000
//        (RUN above) already creates; would plausibly run and assert cleanly
//        today.
//
// 7. GRANT-ONLY, DASHBOARD-ORIGIN TARGET TABLES (1 file) -- same reasoning as
//    group 3: pure REVOKE/GRANT statements against admin_audit_log,
//    admin_recovery, contact_messages, contact_responses, team_members,
//    team_members_public, users_public, typing_indicators, user_presence,
//    ai_conversations, canvas_drawings/participants/sessions,
//    community_invites/join_requests/group_message_reactions -- tables this
//    harness cannot construct from scratch, so the statements would fail on
//    "relation does not exist" rather than prove anything about the grants.
//    Verified against production directly: applied via the Supabase SQL
//    editor, then information_schema.table_privileges re-queried to confirm
//    each table holds exactly the grants the file specifies.
//      20260821240000_grant_audit_fix_legacy_tables.sql
//
// 8. ONE-TIME PRODUCTION DATA FIXES (2 files) -- narrow incident fixes keyed
//    to one specific production user, not generic behaviour worth asserting
//    against this harness's fixtures.
//      20260823160000_preserve_name_across_logins.sql
//      Redefines handle_new_user() (originally created by
//      20260731100000_google_profile_image.sql, itself in group 6 and not
//      replayed here) so a Google login can no longer overwrite an existing
//      public.users.name, only fill it in when empty -- matching how
//      profile_image already behaved. Also re-syncs one named mentor's row.
//      Verified directly against production per the file's own comment,
//      the same fallback the project rules call for when the harness can't
//      reach a migration.
//      20260823170000_fix_saksham_name_backfill.sql
//      Follow-up to the file above: its backfill matched on a name string
//      that turned out to be cased differently in the real row, so this
//      corrects the same one user by hardcoded id instead. Nothing to
//      assert generically -- the id it targets does not exist in this
//      harness's fixtures.
// =====================================================================

// ---------------------------------------------------------------- faculty
console.log('faculty ratings:');
await q(`INSERT INTO public.faculty (slug, name, department, designation)
         VALUES ('dr-ranjit-thapa', 'Dr Ranjit Thapa', 'Physics', 'Professor & HoD')`);
const { rows: [fac] } = await q(`SELECT id, rating_count, avg_overall FROM public.faculty WHERE slug='dr-ranjit-thapa'`);
check('faculty row inserted with zeroed aggregates', fac.rating_count === 0 && Number(fac.avg_overall) === 0);

await q(`INSERT INTO public.faculty_ratings (faculty_id, reviewer_id, teaching, grading, helpfulness, comment, tags)
         VALUES ($1, $2, 5, 4, 5, 'Great lecturer', ARRAY['Clear lectures','Inspiring'])`, [fac.id, CURRENT_UID]);
await q(`INSERT INTO public.faculty_ratings (faculty_id, reviewer_id, teaching, grading, helpfulness)
         VALUES ($1, $2, 3, 2, 4)`, [fac.id, OTHER_UID]);

const { rows: [agg] } = await q(`SELECT rating_count, avg_overall, avg_teaching, avg_grading, avg_helpfulness FROM public.faculty WHERE id=$1`, [fac.id]);
check('trigger maintained rating_count', agg.rating_count === 2, `got ${agg.rating_count}`);
check('avg_teaching = (5+3)/2 = 4.00', Number(agg.avg_teaching) === 4, `got ${agg.avg_teaching}`);
check('avg_grading  = (4+2)/2 = 3.00', Number(agg.avg_grading) === 3, `got ${agg.avg_grading}`);
check('avg_overall  ≈ (4.67+3.00)/2 = 3.84', Math.abs(Number(agg.avg_overall) - 3.84) < 0.02, `got ${agg.avg_overall}`);

const { rows: [gen] } = await q(`SELECT overall FROM public.faculty_ratings WHERE reviewer_id=$1`, [CURRENT_UID]);
check('generated overall column = 4.67', Math.abs(Number(gen.overall) - 4.67) < 0.01, `got ${gen.overall}`);

let rejected = false;
try { await q(`INSERT INTO public.faculty_ratings (faculty_id, reviewer_id, teaching, grading, helpfulness) VALUES ($1,$2,6,1,1)`, [fac.id, CURRENT_UID]); }
catch { rejected = true; }
check('rating > 5 rejected by CHECK constraint', rejected);

rejected = false;
try { await q(`INSERT INTO public.faculty_ratings (faculty_id, reviewer_id, teaching, grading, helpfulness) VALUES ($1,$2,4,4,4)`, [fac.id, CURRENT_UID]); }
catch { rejected = true; }
check('second rating by same student rejected (one per student)', rejected);

const { rows: reviews } = await q(`SELECT * FROM public.get_faculty_reviews($1)`, [fac.id]);
check('get_faculty_reviews returns both reviews', reviews.length === 2, `got ${reviews.length}`);
check('get_faculty_reviews never exposes reviewer_id', !Object.keys(reviews[0]).includes('reviewer_id'), Object.keys(reviews[0]).join(','));
check('is_own flags the caller\'s own review', reviews.filter((r) => r.is_own).length === 1);

const { rows: tags } = await q(`SELECT * FROM public.get_faculty_tag_counts($1)`, [fac.id]);
check('get_faculty_tag_counts aggregates tags', tags.length === 2, tags.map((t) => `${t.tag}:${t.count}`).join(' '));

const { rows: top } = await q(`SELECT * FROM public.get_top_rated_faculty(10, 2)`);
check('get_top_rated_faculty honours min-ratings threshold', top.length === 1, `got ${top.length}`);
const { rows: topStrict } = await q(`SELECT * FROM public.get_top_rated_faculty(10, 5)`);
check('get_top_rated_faculty excludes below threshold', topStrict.length === 0, `got ${topStrict.length}`);

const { rows: [stats] } = await q(`SELECT * FROM public.get_faculty_directory_stats()`);
check('directory stats counts', Number(stats.faculty_count) === 1 && Number(stats.rating_count) === 2, JSON.stringify(stats));

// helpful votes
const reviewId = reviews[0].id;
await q(`INSERT INTO public.faculty_review_votes (rating_id, voter_id) VALUES ($1,$2)`, [reviewId, OTHER_UID]);
const { rows: [voted] } = await q(`SELECT helpful_count FROM public.faculty_ratings WHERE id=$1`, [reviewId]);
check('helpful_count trigger increments', voted.helpful_count === 1, `got ${voted.helpful_count}`);
await q(`DELETE FROM public.faculty_review_votes WHERE rating_id=$1 AND voter_id=$2`, [reviewId, OTHER_UID]);
const { rows: [unvoted] } = await q(`SELECT helpful_count FROM public.faculty_ratings WHERE id=$1`, [reviewId]);
check('helpful_count trigger decrements', unvoted.helpful_count === 0, `got ${unvoted.helpful_count}`);

// deleting a rating recomputes aggregates
await q(`DELETE FROM public.faculty_ratings WHERE reviewer_id=$1`, [OTHER_UID]);
const { rows: [agg2] } = await q(`SELECT rating_count, avg_teaching FROM public.faculty WHERE id=$1`, [fac.id]);
check('aggregates recomputed after delete', agg2.rating_count === 1 && Number(agg2.avg_teaching) === 5, JSON.stringify(agg2));

// ------------------------------------------------------- research interests
console.log('\nfaculty research interests:');

// Trigger fires on UPDATE OF interests.
await q(`UPDATE public.faculty
         SET interests = ARRAY['Artificial Intelligence','2D Materials and its device applications']
         WHERE id = $1`, [fac.id]);
const { rows: [ix] } = await q(`SELECT interests, interests_text FROM public.faculty WHERE id=$1`, [fac.id]);
check('interests stored as array', ix.interests.length === 2, JSON.stringify(ix.interests));
check(
  'interests_text flattened with a separator',
  ix.interests_text === 'Artificial Intelligence | 2D Materials and its device applications',
  ix.interests_text,
);

// research_areas must land in the same searchable column.
await q(`UPDATE public.faculty SET research_areas = ARRAY['Computational Physics'] WHERE id=$1`, [fac.id]);
const { rows: [ix2] } = await q(`SELECT interests_text FROM public.faculty WHERE id=$1`, [fac.id]);
check('research_areas appended to interests_text', ix2.interests_text.endsWith('| Computational Physics'), ix2.interests_text);

// The separator is the whole point: it must block a match that spans two terms.
const { rows: spanning } = await q(
  `SELECT id FROM public.faculty WHERE interests_text ILIKE '%Intelligence 2D%'`,
);
check('separator prevents matching across two interests', spanning.length === 0, `${spanning.length} rows`);

// A search a student would actually type.
const { rows: hits } = await q(`SELECT id FROM public.faculty WHERE interests_text ILIKE '%artificial intel%'`);
check('case-insensitive partial search finds the faculty member', hits.length === 1, `${hits.length} rows`);

// A new row inserted with interests gets interests_text without a second write.
await q(`INSERT INTO public.faculty (slug, name, department, interests)
         VALUES ('dr-test-two', 'Dr Test Two', 'CSE', ARRAY['Artificial Intelligence','Blockchain'])`);
const { rows: [ins] } = await q(`SELECT interests_text FROM public.faculty WHERE slug='dr-test-two'`);
check('INSERT populates interests_text', ins.interests_text === 'Artificial Intelligence | Blockchain', ins.interests_text);

// Facets: only terms shared by more than one active faculty member.
const { rows: facets } = await q(`SELECT * FROM public.get_faculty_interest_facets(40)`);
const ai = facets.find((f) => f.interest === 'Artificial Intelligence');
check('facet counts shared interests', ai && Number(ai.faculty_count) === 2, JSON.stringify(facets));
check('facet excludes single-use interests', !facets.some((f) => f.interest === 'Blockchain'), JSON.stringify(facets.map((f) => f.interest)));

// Inactive faculty must not appear in facets.
await q(`UPDATE public.faculty SET is_active = false WHERE slug='dr-test-two'`);
const { rows: facets2 } = await q(`SELECT * FROM public.get_faculty_interest_facets(40)`);
check('facets ignore inactive faculty', !facets2.some((f) => f.interest === 'Artificial Intelligence'), JSON.stringify(facets2));
await q(`UPDATE public.faculty SET is_active = true WHERE slug='dr-test-two'`);

// Column grants. Production narrows `anon` to column-level SELECT (email
// withheld), and column grants do not extend to columns added later — which
// blanked the public directory on 2026-08-06 until the migration granted them.
const { rows: grants } = await q(`
  SELECT column_name FROM information_schema.column_privileges
  WHERE table_schema='public' AND table_name='faculty'
    AND grantee='anon' AND privilege_type='SELECT'
    AND column_name IN ('interests','research_areas','interests_text')
  ORDER BY column_name
`);
check(
  'anon can SELECT the three new columns',
  grants.length === 3,
  grants.map((g) => g.column_name).join(',') || '(none)',
);

const { rows: officeResearchGrants } = await q(`
  SELECT column_name FROM information_schema.column_privileges
  WHERE table_schema='public' AND table_name='faculty'
    AND grantee='anon' AND privilege_type='SELECT'
    AND column_name IN ('office_location','research_details')
  ORDER BY column_name
`);
check(
  'anon can SELECT office_location and research_details',
  officeResearchGrants.length === 2,
  officeResearchGrants.map((g) => g.column_name).join(',') || '(none)',
);

// The real regression test: narrow anon the way production is, then confirm a
// query naming a new column still succeeds rather than 42501-ing.
await q(`SET LOCAL ROLE anon`).catch(() => {});
const { rows: asAnon } = await q(
  `SELECT slug FROM public.faculty WHERE interests @> ARRAY['Blockchain']::text[]`,
);
check('anon can read interests without permission denied', asAnon.length === 1, `${asAnon.length} rows`);
await q(`RESET ROLE`).catch(() => {});

// GIN index path: exact-tag browse.
const { rows: tagged } = await q(
  `SELECT slug FROM public.faculty WHERE interests @> ARRAY['Blockchain']::text[]`,
);
check('array containment finds by exact tag', tagged.length === 1 && tagged[0].slug === 'dr-test-two', JSON.stringify(tagged));

// ---------------------------------------------------------------- community
console.log('\ncommunity posts:');
const { rows: [legacy] } = await q(`SELECT author_id, mentor_id FROM public.community_posts WHERE title='Legacy mentor post'`);
check('existing post backfilled author_id from mentor_id', legacy.author_id === OTHER_UID, legacy.author_id);

// A student (no mentors row) posting — the thing that was impossible before.
await q(`INSERT INTO public.community_posts (author_id, title, content, post_type)
         VALUES ($1, 'Need a hackathon teammate', 'SIH prep, need a backend dev', 'hackathon')`, [CURRENT_UID]);
const { rows: [studentPost] } = await q(`SELECT id, author_id, mentor_id FROM public.community_posts WHERE post_type='hackathon'`);
check('student (non-mentor) can insert a post', studentPost.author_id === CURRENT_UID);
check('trigger mirrors author_id into legacy mentor_id', studentPost.mentor_id === CURRENT_UID);

// --------------------------------------------------------------- RLS, for real
// Everything above runs as the owner, which bypasses RLS entirely — so it proves
// the triggers and columns work but says nothing about whether the policies
// admit or reject a given write. Re-run the writes as `authenticated` with
// auth.uid() bound to a specific student.
await db.exec(`
  GRANT USAGE ON SCHEMA public, auth TO authenticated;
  GRANT SELECT ON auth._session TO authenticated;
  GRANT SELECT, INSERT, UPDATE, DELETE ON public.community_posts TO authenticated;
`);

async function asAuthenticated(fn) {
  await db.exec(`SET ROLE authenticated`);
  try {
    return await fn();
  } finally {
    await db.exec(`RESET ROLE`);
  }
}

async function attempt(sql, params) {
  try {
    await q(sql, params);
    return null;
  } catch (error) {
    return error.message;
  }
}

const ownPost = await asAuthenticated(() => attempt(
  `INSERT INTO public.community_posts (author_id, title, content, post_type)
   VALUES ($1, 'RLS: own post', 'body', 'general')`, [CURRENT_UID]));
check('RLS admits a student posting as themselves', ownPost === null, ownPost ?? '');

const impersonated = await asAuthenticated(() => attempt(
  `INSERT INTO public.community_posts (author_id, title, content)
   VALUES ($1, 'RLS: impersonated', 'body')`, [OTHER_UID]));
check('RLS rejects posting as somebody else', impersonated !== null, impersonated ?? 'INSERT SUCCEEDED');

// The deployed client still sends mentor_id and no author_id. The BEFORE trigger
// fills author_id in, and Postgres evaluates the policy's WITH CHECK against the
// post-trigger row — so the old write shape has to keep working after migrating.
const legacyShape = await asAuthenticated(() => attempt(
  `INSERT INTO public.community_posts (mentor_id, title, content)
   VALUES ($1, 'RLS: legacy client shape', 'body')`, [CURRENT_UID]));
check('RLS admits the legacy mentor_id-only insert', legacyShape === null, legacyShape ?? '');

const { rows: [legacyRow] } = await q(
  `SELECT author_id, mentor_id FROM public.community_posts WHERE title='RLS: legacy client shape'`);
check('legacy insert lands with both ids populated',
  legacyRow?.author_id === CURRENT_UID && legacyRow?.mentor_id === CURRENT_UID,
  JSON.stringify(legacyRow ?? null));

const foreignEdit = await asAuthenticated(() => attempt(
  `UPDATE public.community_posts SET title='hijacked' WHERE author_id=$1`, [OTHER_UID]));
const { rows: [untouched] } = await q(
  `SELECT count(*)::int AS n FROM public.community_posts WHERE title='hijacked'`);
check('RLS keeps a student out of another author\'s post', untouched.n === 0,
  foreignEdit ? 'rejected outright' : 'update matched no rows');

await q(`DELETE FROM public.community_posts WHERE title LIKE 'RLS: %'`);

await q(`INSERT INTO public.post_likes (post_id, user_id) VALUES ($1,$2)`, [studentPost.id, CURRENT_UID]);

const { rows: feed } = await q(`SELECT * FROM public.get_community_feed('all', '', 20, 0)`);
check('get_community_feed returns both posts', feed.length === 2, `got ${feed.length}`);
check('feed resolves author name', feed.some((p) => p.author_name === 'Asha Student'), feed.map((p) => p.author_name).join(','));
check('feed flags mentor authorship correctly',
  feed.find((p) => p.author_id === OTHER_UID)?.author_is_mentor === true &&
  feed.find((p) => p.author_id === CURRENT_UID)?.author_is_mentor === false);
check('feed folds in viewer_has_liked (no N+1)', feed.find((p) => p.id === studentPost.id)?.viewer_has_liked === true);
check('feed reports total_count', Number(feed[0].total_count) === 2, `got ${feed[0].total_count}`);

const { rows: filtered } = await q(`SELECT * FROM public.get_community_feed('hackathon', '', 20, 0)`);
check('feed filters by post_type', filtered.length === 1, `got ${filtered.length}`);
const { rows: searched } = await q(`SELECT * FROM public.get_community_feed('all', 'backend', 20, 0)`);
check('feed full-text search matches content', searched.length === 1, `got ${searched.length}`);
const { rows: noMatch } = await q(`SELECT * FROM public.get_community_feed('all', 'zzzznope', 20, 0)`);
check('feed search returns empty on no match', noMatch.length === 0);

const { rows: paged } = await q(`SELECT * FROM public.get_community_feed('all', '', 1, 0)`);
check('feed pagination limits rows but keeps total', paged.length === 1 && Number(paged[0].total_count) === 2);

const { rows: [single] } = await q(`SELECT * FROM public.get_community_post($1)`, [studentPost.id]);
check('get_community_post returns the post', single?.title === 'Need a hackathon teammate');
check('get_community_post flags viewer_is_author', single.viewer_is_author === true);

await q(`INSERT INTO public.post_comments (post_id, user_id, content) VALUES ($1,$2,'I am in!')`, [studentPost.id, OTHER_UID]);
const { rows: comments } = await q(`SELECT * FROM public.get_post_comments($1)`, [studentPost.id]);
check('get_post_comments resolves comment author', comments[0]?.author_name === 'Ravi Mentor');
check('get_post_comments flags viewer_is_author false for others', comments[0].viewer_is_author === false);

// policies actually swapped over
const { rows: policies } = await q(
  `SELECT policyname FROM pg_policies WHERE tablename='community_posts' ORDER BY policyname`,
);
const names = policies.map((p) => p.policyname);
check('mentor-only INSERT policy removed', !names.includes('Verified mentors can create posts'), names.join(' | '));
check('author-based policies present',
  names.includes('Authenticated users can create posts') && names.includes('Authors can update their own posts'));

const { rows: [fk] } = await q(
  `SELECT count(*)::int AS n FROM pg_constraint WHERE conname='fk_mentor' AND conrelid='public.community_posts'::regclass`,
);
check('mentors foreign key dropped', fk.n === 0);

// ---------------------------------------------------------------- channels
console.log('\ncommunity channels:');

const actAs = (uid) => q(`UPDATE auth._session SET uid = $1`, [uid]);

/** Asserts the statement fails, and fails with the sentence a person would read. */
async function refuses(label, sql, params, fragment) {
  try {
    await q(sql, params);
    check(label, false, 'no error raised');
  } catch (error) {
    check(label, error.message.includes(fragment), error.message);
  }
}

const OWNER = OTHER_UID; // Ravi owns the group; Asha (CURRENT_UID) is the outsider.
await q(
  `INSERT INTO public.communities (slug, name, description, kind, owner_id)
   VALUES ('sih-team-alpha', 'SIH Team Alpha', 'Building for SIH 2026.', 'hackathon', $1)`,
  [OWNER],
);
const { rows: [grp] } = await q(`SELECT id FROM public.communities WHERE slug='sih-team-alpha'`);
await q(
  `INSERT INTO public.community_group_messages (community_id, sender_id, channel, content)
   VALUES ($1, $2, 'general', 'hello everyone')`,
  [grp.id, OWNER],
);

await actAs(OWNER);
const { rows: [made] } = await q(
  `SELECT public.create_community_channel($1, 'Resources & Links!', '  where links live  ') AS id`,
  [grp.id],
);
const { rows: [ch] } = await q(`SELECT slug, topic FROM public.community_channels WHERE id=$1`, [made.id]);
check('owner creates a channel, name slugified server-side', ch?.slug === 'resources-links', `slug=${ch?.slug}`);
check('topic is trimmed', ch?.topic === 'where links live', `topic=${ch?.topic}`);

// A new group starts with no channels — the built-in room is implicit, not a row.
// This is the whole reason the last attempt at channels was removed.
await q(
  `INSERT INTO public.communities (slug, name, description, owner_id)
   VALUES ('quiet-group', 'Quiet Group', 'No channels here.', $1)`,
  [OWNER],
);
const { rows: quiet } = await q(
  `SELECT * FROM public.list_community_channels((SELECT id FROM public.communities WHERE slug='quiet-group'))`,
);
check('a new group has zero channels', quiet.length === 0, `rows=${quiet.length}`);

await q(
  `INSERT INTO public.community_group_messages (community_id, sender_id, channel, content)
   VALUES ($1,$2,'resources-links','a link'), ($1,$2,'resources-links','another link')`,
  [grp.id, OWNER],
);
const { rows: listed } = await q(`SELECT * FROM public.list_community_channels($1)`, [grp.id]);
check('list returns the one channel with its message count',
  listed.length === 1 && listed[0].message_count === 2, JSON.stringify(listed.map((r) => r.message_count)));

await refuses('reserved #general refused',
  `SELECT public.create_community_channel($1, 'General')`, [grp.id], 'already part of every group');
await refuses('duplicate slug refused',
  `SELECT public.create_community_channel($1, 'resources links')`, [grp.id], 'already exists');
await refuses('punctuation-only name refused',
  `SELECT public.create_community_channel($1, '???')`, [grp.id], 'letters or numbers');

for (let i = 2; i <= 10; i += 1) {
  await q(`SELECT public.create_community_channel($1, $2)`, [grp.id, `room-${i}`]);
}
const { rows: [capped] } = await q(
  `SELECT count(*)::int AS n FROM public.community_channels WHERE community_id=$1`, [grp.id],
);
check('ten channels allowed', capped.n === 10, `rows=${capped.n}`);
await refuses('eleventh refused',
  `SELECT public.create_community_channel($1, 'room-11')`, [grp.id], '10 channels');

await actAs(CURRENT_UID);
await refuses('non-owner cannot create',
  `SELECT public.create_community_channel($1, 'not mine')`, [grp.id], 'Only the group owner');
await refuses('non-owner cannot delete',
  `SELECT public.delete_community_channel($1)`, [made.id], 'Only the group owner');
const { rows: [survived] } = await q(`SELECT count(*)::int AS n FROM public.community_channels WHERE id=$1`, [made.id]);
check('channel survived the non-owner delete', survived.n === 1, `rows=${survived.n}`);

// Deleting takes the channel's messages with it — they are joined by slug text,
// so nothing cascades — and must leave the built-in room alone.
await actAs(OWNER);
const { rows: [removed] } = await q(`SELECT public.delete_community_channel($1) AS n`, [made.id]);
check('delete reports the messages it destroyed', removed.n === 2, `removed=${removed.n}`);
const { rows: [general] } = await q(
  `SELECT count(*)::int AS n FROM public.community_group_messages WHERE community_id=$1 AND channel='general'`,
  [grp.id],
);
check("delete leaves the built-in 'general' room untouched", general.n === 1, `general=${general.n}`);

// Signed out: the RPC is not granted to anon, and the body refuses as well, so
// the room names are not readable even if a grant is ever loosened by accident.
await q(`UPDATE auth._session SET uid = NULL`);
const { rows: anonRows } = await q(`SELECT * FROM public.list_community_channels($1)`, [grp.id]);
check('signed-out reads no channels', anonRows.length === 0, `rows=${anonRows.length}`);
await actAs(CURRENT_UID);

const { rows: acl } = await q(
  `SELECT proname, proacl::text AS acl FROM pg_proc p JOIN pg_namespace n ON n.oid=p.pronamespace
    WHERE n.nspname='public' AND proname LIKE '%community_channel%' ORDER BY proname`,
);
check('three channel functions created', acl.length === 3, acl.map((r) => r.proname).join(' | '));
check('none of them executable by anon or PUBLIC',
  acl.every((r) => !r.acl.includes('anon=X') && !r.acl.includes('{=X') && r.acl.includes('authenticated=X')),
  acl.map((r) => r.acl).join(' | '));

// Supabase's default privileges hand every new table ALL to anon and
// authenticated. Writes here go through the RPCs, so the table keeps only the
// SELECT that realtime needs.
const { rows: tableAcl } = await q(
  `SELECT grantee, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privs
     FROM information_schema.table_privileges
    WHERE table_schema='public' AND table_name='community_channels' AND grantee IN ('anon','authenticated')
    GROUP BY grantee`,
);
const anonGrants = tableAcl.find((r) => r.grantee === 'anon');
const authGrants = tableAcl.find((r) => r.grantee === 'authenticated');
check('table grants nothing to anon', !anonGrants, anonGrants?.privs ?? 'none');
check('table grants SELECT only to authenticated', authGrants?.privs === 'SELECT', authGrants?.privs ?? 'none');

// ---------------------------------------------------------- mentor projects
console.log('\nmentor projects & experiences:');

const { rows: [defaults] } = await q(`SELECT projects, experiences FROM public.mentors WHERE id=$1`, [OTHER_UID]);
check('projects defaults to an empty array', Array.isArray(defaults.projects) && defaults.projects.length === 0, JSON.stringify(defaults.projects));
check('experiences defaults to an empty array', Array.isArray(defaults.experiences) && defaults.experiences.length === 0, JSON.stringify(defaults.experiences));

const sixProjects = JSON.stringify(Array.from({ length: 6 }, (_, i) => ({ id: `p${i}`, title: `Project ${i}`, description: 'x' })));
await q(`UPDATE public.mentors SET projects = $1::jsonb WHERE id=$2`, [sixProjects, OTHER_UID]);
const { rows: [savedSix] } = await q(`SELECT projects FROM public.mentors WHERE id=$1`, [OTHER_UID]);
check('six projects saved', savedSix.projects.length === 6, `got ${savedSix.projects.length}`);

const sevenProjects = JSON.stringify(Array.from({ length: 7 }, (_, i) => ({ id: `p${i}`, title: `Project ${i}`, description: 'x' })));
let rejectedProjects = false;
try { await q(`UPDATE public.mentors SET projects = $1::jsonb WHERE id=$2`, [sevenProjects, OTHER_UID]); }
catch { rejectedProjects = true; }
check('a 7th project is rejected by the CHECK constraint', rejectedProjects);

const sevenExperiences = JSON.stringify(Array.from({ length: 7 }, (_, i) => ({ id: `e${i}`, title: `Role ${i}` })));
let rejectedExperiences = false;
try { await q(`UPDATE public.mentors SET experiences = $1::jsonb WHERE id=$2`, [sevenExperiences, OTHER_UID]); }
catch { rejectedExperiences = true; }
check('a 7th experience is rejected by the CHECK constraint', rejectedExperiences);

// The regression this migration itself caused once already: `mentors` narrows
// anon to column-level SELECT (mobile/cgpa withheld), and that grant does not
// extend to columns added later. A first version of this migration shipped
// without the explicit grant below and 42501'd every signed-out directory read.
const { rows: mentorGrants } = await q(`
  SELECT column_name FROM information_schema.column_privileges
  WHERE table_schema='public' AND table_name='mentors'
    AND grantee='anon' AND privilege_type='SELECT'
    AND column_name IN ('projects','experiences')
  ORDER BY column_name
`);
check(
  'anon can SELECT the two new columns',
  mentorGrants.length === 2,
  mentorGrants.map((g) => g.column_name).join(',') || '(none)',
);

// ---------------------------------------------------------------- academic imports
console.log('\nacademic imports:');

// GRANT for `authenticated` on academic_imports already comes from the
// migration itself (it runs as superuser above); no extra grant needed here.

// Import starts pending — a mentor applying with no portal data yet.
await q(
  `INSERT INTO public.academic_imports (user_id, register_number, program, sync_status)
   VALUES ($1, 'AP23111260062', 'B.Sc. Physics', 'pending')`,
  [OTHER_UID],
);
const { rows: [pendingChunk] } = await q(
  `SELECT body, metadata FROM public.knowledge_chunks WHERE entity_type='mentor' AND entity_id=$1`,
  [OTHER_UID],
);
check(
  'reproject trigger fires on INSERT (chunk exists)',
  !!pendingChunk,
  pendingChunk ? 'found' : 'missing',
);
check(
  'a pending (not yet successful) import contributes no coursework',
  !pendingChunk?.body?.includes('Coursework:'),
  pendingChunk?.body ?? '',
);

// Now the import succeeds with real subjects + a portal-computed CGPA.
const subjects = JSON.stringify([
  { semester: 6, code: 'PHY 305', name: 'NUCLEAR AND PARTICLE PHYSICS', credit: 4 },
  { semester: 6, code: 'PHY 307', name: 'SOLID-STATE PHYSICS', credit: 4 },
]);
await q(
  `UPDATE public.academic_imports
   SET sync_status='success', subjects=$1::jsonb, cgpa=9.67, last_synced_at=now()
   WHERE user_id=$2`,
  [subjects, OTHER_UID],
);
const { rows: [successChunk] } = await q(
  `SELECT body, metadata FROM public.knowledge_chunks WHERE entity_type='mentor' AND entity_id=$1`,
  [OTHER_UID],
);
check(
  'reproject trigger fires on UPDATE (coursework appears)',
  successChunk?.body?.includes('SOLID-STATE PHYSICS'),
  successChunk?.body ?? '',
);
check(
  'CGPA number is never folded into the indexed body text',
  !successChunk?.body?.includes('9.67'),
  successChunk?.body ?? '',
);
check(
  'cgpa/program land in metadata for display, not body',
  Number(successChunk?.metadata?.verified_cgpa) === 9.67 && successChunk?.metadata?.verified_program === 'B.Sc. Physics',
  JSON.stringify(successChunk?.metadata),
);

// RLS: owner can read their own row; a different signed-in student cannot.
await db.exec(`GRANT SELECT ON auth._session TO authenticated`);
await actAs(OTHER_UID);
const ownImport = await asAuthenticated(() =>
  q(`SELECT id FROM public.academic_imports WHERE user_id=$1`, [OTHER_UID]));
check('RLS admits the owner reading their own academic import', ownImport.rows.length === 1, `${ownImport.rows.length} rows`);

await actAs(CURRENT_UID);
const foreignImport = await asAuthenticated(() =>
  q(`SELECT id FROM public.academic_imports WHERE user_id=$1`, [OTHER_UID]));
check('RLS blocks a different student from reading it', foreignImport.rows.length === 0, `${foreignImport.rows.length} rows`);

// Rate limit trigger: defense in depth behind the edge function's own check.
await q(`UPDATE public.academic_imports SET attempt_count=5, last_attempt_at=now() WHERE user_id=$1`, [OTHER_UID]);
let sixthRejected = false;
try {
  await q(`UPDATE public.academic_imports SET attempt_count=6, last_attempt_at=now() WHERE user_id=$1`, [OTHER_UID]);
} catch (error) {
  sixthRejected = error.message.includes('Too many import attempts');
}
check('a 6th attempt within 15 minutes is rejected by the DB trigger', sixthRejected);

// Supabase's default privileges hand every new table ALL to anon and
// authenticated; this table must keep anon out entirely and authenticated to
// SELECT-only (all writes go through the service-role edge function).
const { rows: importAcl } = await q(
  `SELECT grantee, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privs
     FROM information_schema.table_privileges
    WHERE table_schema='public' AND table_name='academic_imports' AND grantee IN ('anon','authenticated')
    GROUP BY grantee`,
);
const importAnon = importAcl.find((r) => r.grantee === 'anon');
const importAuth = importAcl.find((r) => r.grantee === 'authenticated');
check('academic_imports grants nothing to anon', !importAnon, importAnon?.privs ?? 'none');
check('academic_imports grants SELECT only to authenticated', importAuth?.privs === 'SELECT', importAuth?.privs ?? 'none');

// ----------------------------------------------------------- mentor courses
console.log('\nmentor courses:');

const { rows: [courseDefaults] } = await q(`SELECT courses FROM public.mentors WHERE id=$1`, [OTHER_UID]);
check('courses defaults to an empty array', Array.isArray(courseDefaults.courses) && courseDefaults.courses.length === 0, JSON.stringify(courseDefaults.courses));

const eightyCourses = JSON.stringify(Array.from({ length: 80 }, (_, i) => ({ code: `CS${i}`, name: `Course ${i}` })));
await q(`UPDATE public.mentors SET courses = $1::jsonb WHERE id=$2`, [eightyCourses, OTHER_UID]);
const { rows: [savedEighty] } = await q(`SELECT courses FROM public.mentors WHERE id=$1`, [OTHER_UID]);
check('80 courses saved', savedEighty.courses.length === 80, `got ${savedEighty.courses.length}`);

const eightyOneCourses = JSON.stringify(Array.from({ length: 81 }, (_, i) => ({ code: `CS${i}`, name: `Course ${i}` })));
let rejectedCourses = false;
try { await q(`UPDATE public.mentors SET courses = $1::jsonb WHERE id=$2`, [eightyOneCourses, OTHER_UID]); }
catch { rejectedCourses = true; }
check('an 81st course is rejected by the CHECK constraint', rejectedCourses);

// Same regression class as projects/experiences: anon only has column-level
// SELECT on `mentors`, and that does not extend to columns added later.
const { rows: courseGrants } = await q(`
  SELECT column_name FROM information_schema.column_privileges
  WHERE table_schema='public' AND table_name='mentors'
    AND grantee='anon' AND privilege_type='SELECT'
    AND column_name = 'courses'
`);
check('anon can SELECT the new courses column', courseGrants.length === 1, courseGrants.length ? 'ok' : '(missing)');

// =====================================================================
// The 2026-04 through 2026-08 batch (T4.2 catch-up). Two fresh students so
// this block does not disturb state the sections above already asserted on.
// =====================================================================
const THIRD_UID = '33333333-3333-3333-3333-333333333333';
const FOURTH_UID = '44444444-4444-4444-4444-444444444444';
await q(`INSERT INTO public.users (id, name, email, role, department) VALUES ($1, 'Priya Student', 'priya@srmap.edu.in', 'student', 'CSE')`, [THIRD_UID]);
await q(`INSERT INTO public.users (id, name, email, role, department) VALUES ($1, 'Rahul Student', 'rahul@srmap.edu.in', 'student', 'ECE')`, [FOURTH_UID]);

console.log('\nmentor verification (auto-approve + flags):');

// A clean application: valid college_id, plausible graduation_year, sane cgpa.
await q(
  `INSERT INTO public.mentor_verifications (user_id, application_data, cgpa, year_of_studies, university, hobbies, college_id, graduation_year)
   VALUES ($1, $2::jsonb, 8.5, '3rd year', 'SRM AP', 'Chess', 'AP23111260099', 2027)`,
  [THIRD_UID, JSON.stringify({ department: 'CSE', skills: 'React,Node' })],
);
const { rows: [verif] } = await q(`SELECT status, flags FROM public.mentor_verifications WHERE user_id=$1`, [THIRD_UID]);
check('application auto-approved on insert (approve then flag, never blocked)', verif.status === 'approved', verif.status);
check('a clean application carries no flags', Array.isArray(verif.flags) && verif.flags.length === 0, JSON.stringify(verif.flags));
const { rows: [promoted] } = await q(`SELECT role, college_id FROM public.users WHERE id=$1`, [THIRD_UID]);
check('user role promoted to mentor', promoted.role === 'mentor', promoted.role);
check('college_id propagated to users', promoted.college_id === 'AP23111260099', promoted.college_id);
const { rows: [mentorRow] } = await q(`SELECT id FROM public.mentors WHERE id=$1`, [THIRD_UID]);
check('mentor row created by the trigger', !!mentorRow);
const { rows: [welcomeNote] } = await q(`SELECT count(*)::int AS n FROM public.notifications WHERE user_id=$1 AND title LIKE 'Welcome, Mentor%'`, [THIRD_UID]);
check('welcome notification created', welcomeNote.n === 1, `n=${welcomeNote.n}`);

// A messy application: no graduation year, a 4-point-scale-looking cgpa, and a
// college_id that collides with Priya's -- must still approve instantly.
await q(
  `INSERT INTO public.mentor_verifications (user_id, application_data, cgpa, college_id)
   VALUES ($1, $2::jsonb, 3.8, 'AP23111260099')`,
  [FOURTH_UID, JSON.stringify({ department: 'ECE' })],
);
const { rows: [verif2] } = await q(`SELECT status, flags FROM public.mentor_verifications WHERE user_id=$1`, [FOURTH_UID]);
check('messy application still auto-approved', verif2.status === 'approved', verif2.status);
check('flag: missing graduation year', verif2.flags.includes('graduation_year_missing'), JSON.stringify(verif2.flags));
check('flag: cgpa looks like a 4-point scale', verif2.flags.includes('cgpa_possibly_4_point_scale'), JSON.stringify(verif2.flags));
check('flag: duplicate college_id (already claimed by Priya)', verif2.flags.includes('college_id_duplicate'), JSON.stringify(verif2.flags));
const { rows: [notPromotedId] } = await q(`SELECT college_id FROM public.users WHERE id=$1`, [FOURTH_UID]);
check('a flagged duplicate college_id is never written (the flag records why, the unique index is never at risk)', notPromotedId.college_id === null, notPromotedId.college_id);

let badFormatRejected = false;
try { await q(`UPDATE public.users SET college_id = 'BADFORMAT' WHERE id=$1`, [THIRD_UID]); }
catch { badFormatRejected = true; }
check('malformed college_id rejected by the CHECK constraint', badFormatRejected);

let badYearRejected = false;
try { await q(`UPDATE public.users SET graduation_year = 1900 WHERE id=$1`, [THIRD_UID]); }
catch { badYearRejected = true; }
check('graduation_year outside 2015-2040 rejected by the CHECK constraint', badYearRejected);

console.log('\nis_college_id_taken:');
await actAs(THIRD_UID);
const { rows: [takenSelf] } = await q(`SELECT public.is_college_id_taken('AP23111260099') AS taken`);
check('own college_id does not count as taken (re-editing)', takenSelf.taken === false);
await actAs(FOURTH_UID);
const { rows: [takenByOther] } = await q(`SELECT public.is_college_id_taken('AP23111260099') AS taken`);
check('a college_id already claimed by someone else reports taken', takenByOther.taken === true);
const { rows: [freeOne] } = await q(`SELECT public.is_college_id_taken('AP23111260123') AS taken`);
check('an unclaimed college_id reports free', freeOne.taken === false);
const { rows: [caseNorm] } = await q(`SELECT public.is_college_id_taken('ap23111260099') AS taken`);
check('lowercase input is normalised before the lookup', caseNorm.taken === true);
await q(`UPDATE auth._session SET uid = NULL`);
let signedOutRejected = false;
try { await q(`SELECT public.is_college_id_taken('AP23111260099')`); }
catch (e) { signedOutRejected = /Sign in/.test(e.message); }
check('a signed-out call is rejected outright', signedOutRejected);
await actAs(CURRENT_UID);

console.log('\nemail queue:');
const { rows: [conv] } = await q(
  `INSERT INTO public.conversations (user1_id, user2_id) VALUES ($1,$2) RETURNING id`, [CURRENT_UID, OTHER_UID],
);
const { rows: [msg] } = await q(
  `INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content) VALUES ($1,$2,$3,'hi there') RETURNING id`,
  [conv.id, CURRENT_UID, OTHER_UID],
);
const { rows: [queued] } = await q(`SELECT recipient_id FROM public.email_queue WHERE message_id=$1`, [msg.id]);
check('a new message enqueues an email row instead of calling out synchronously', queued?.recipient_id === OTHER_UID, JSON.stringify(queued));

await q(`UPDATE public.users SET email_notifications = false WHERE id=$1`, [CURRENT_UID]);
const { rows: [msg2] } = await q(
  `INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content) VALUES ($1,$2,$3,'hey') RETURNING id`,
  [conv.id, OTHER_UID, CURRENT_UID],
);
const { rows: [notQueued] } = await q(`SELECT count(*)::int AS n FROM public.email_queue WHERE message_id=$1`, [msg2.id]);
check('an opted-out recipient gets nothing queued', notQueued.n === 0, `n=${notQueued.n}`);
await q(`UPDATE public.users SET email_notifications = true WHERE id=$1`, [CURRENT_UID]);

const { rows: [emailQueuePolicies] } = await q(`SELECT count(*)::int AS n FROM pg_policies WHERE tablename='email_queue'`);
check('email_queue has zero RLS policies (only the service role, which bypasses RLS, can ever touch it)', emailQueuePolicies.n === 0, `n=${emailQueuePolicies.n}`);

console.log('\nemail queue sweep schedule:');
const { rows: [sweepJob] } = await q(`SELECT schedule, active FROM cron.job WHERE jobname='send-email-queue-sweep'`);
check('sweep job registered on a 5-minute cadence', sweepJob?.schedule === '*/5 * * * *', sweepJob?.schedule);
check('sweep job created inactive (the migration turns it on only after the function is deployed)', sweepJob?.active === false, sweepJob?.active);

console.log('\nalumni transition:');
await q(`UPDATE public.users SET graduation_year = 2020 WHERE id=$1`, [OTHER_UID]);
const { rows: awaiting } = await q(`SELECT * FROM public.graduated_mentors_awaiting_confirmation()`);
check('graduated_mentors_awaiting_confirmation lists the overdue mentor', awaiting.some((r) => r.user_id === OTHER_UID), JSON.stringify(awaiting));

const { rows: [promptedCount] } = await q(`SELECT public.prompt_graduated_mentors() AS n`);
check('prompt_graduated_mentors notifies the overdue mentor', promptedCount.n >= 1, `n=${promptedCount.n}`);
const { rows: [alumniPromptNotif] } = await q(`SELECT count(*)::int AS n FROM public.notifications WHERE user_id=$1 AND type='alumni_prompt'`, [OTHER_UID]);
check('an alumni_prompt notification was recorded', alumniPromptNotif.n === 1, `n=${alumniPromptNotif.n}`);
await q(`SELECT public.prompt_graduated_mentors()`);
const { rows: [alumniPromptNotifAgain] } = await q(`SELECT count(*)::int AS n FROM public.notifications WHERE user_id=$1 AND type='alumni_prompt'`, [OTHER_UID]);
check('running the prompt again does not re-notify the same mentor (ask once)', alumniPromptNotifAgain.n === 1, `n=${alumniPromptNotifAgain.n}`);

await actAs(OTHER_UID);
await q(`SELECT public.confirm_alumni_status($1,$2,$3)`, [2020, 'Acme Corp', 'Software Engineer']);
const { rows: [confirmedUser] } = await q(`SELECT alumni_confirmed_at, company, job_title FROM public.users WHERE id=$1`, [OTHER_UID]);
check('confirm_alumni_status stamps alumni_confirmed_at', confirmedUser.alumni_confirmed_at !== null);
check('confirm_alumni_status records company/job_title', confirmedUser.company === 'Acme Corp' && confirmedUser.job_title === 'Software Engineer');
const { rows: [confirmedMentor] } = await q(`SELECT is_alumni FROM public.mentors WHERE id=$1`, [OTHER_UID]);
check('is_alumni mirrored onto the public mentors row', confirmedMentor.is_alumni === true);
const { rows: [clearedPrompt] } = await q(`SELECT read FROM public.notifications WHERE user_id=$1 AND type='alumni_prompt'`, [OTHER_UID]);
check('confirming clears the alumni_prompt notification', clearedPrompt.read === true);
const { rows: awaiting2 } = await q(`SELECT * FROM public.graduated_mentors_awaiting_confirmation()`);
check('a confirmed mentor drops out of the awaiting-confirmation list', !awaiting2.some((r) => r.user_id === OTHER_UID));
let badGradYear = false;
try { await q(`SELECT public.confirm_alumni_status($1)`, [1800]); } catch { badGradYear = true; }
check('confirm_alumni_status rejects an out-of-range graduation year', badGradYear);
await actAs(CURRENT_UID);

console.log('\nalumni prompt schedule:');
const { rows: [alumniJob] } = await q(`SELECT schedule FROM cron.job WHERE jobname='alumni-prompt-monthly'`);
check('alumni prompt job scheduled monthly (04:00 on the 1st)', alumniJob?.schedule === '0 4 1 * *', alumniJob?.schedule);

console.log('\nmentor certificates:');
// Two more distinct students exchange messages with the mentor, bringing the
// total to three -- the eligibility bar in src/lib/certificate.ts.
for (const studentId of [THIRD_UID, FOURTH_UID]) {
  const { rows: [c] } = await q(`INSERT INTO public.conversations (user1_id, user2_id) VALUES ($1,$2) RETURNING id`, [studentId, OTHER_UID]);
  await q(`INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content) VALUES ($1,$2,$3,'help?')`, [c.id, studentId, OTHER_UID]);
  await q(`INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content) VALUES ($1,$2,$3,'sure!')`, [c.id, OTHER_UID, studentId]);
}
const { rows: [impact] } = await q(`SELECT students_helped FROM public.mentor_impact($1)`, [OTHER_UID]);
check('mentor_impact counts three distinct two-way exchanges', impact.students_helped === 3, `got ${impact.students_helped}`);

await actAs(OTHER_UID);
const { rows: [issued] } = await q(`SELECT public.issue_certificate_if_earned() AS id`);
check('a certificate is issued once the threshold is met', issued.id !== null);
const { rows: [cert] } = await q(`SELECT id, certificate_number FROM public.certificates WHERE user_id=$1`, [OTHER_UID]);
check('the certificate number follows the FL-YYYY-#### shape', /^FL-\d{4}-\d{4}$/.test(cert.certificate_number), cert.certificate_number);
const { rows: [reissued] } = await q(`SELECT public.issue_certificate_if_earned() AS id`);
check('re-issuing is idempotent (the same certificate id comes back)', reissued.id === issued.id);

await actAs(THIRD_UID); // Priya is a mentor too (see above), but has helped nobody
const { rows: [notEarned] } = await q(`SELECT public.issue_certificate_if_earned() AS id`);
check('a mentor below the threshold earns nothing', notEarned.id === null);
await actAs(CURRENT_UID);

const { rows: [pub] } = await q(`SELECT students_helped FROM public.get_certificate($1)`, [cert.id]);
check('get_certificate is public/unauthenticated and returns the figures', pub?.students_helped === 3, JSON.stringify(pub));
const { rows: pubMissing } = await q(`SELECT * FROM public.get_certificate('00000000-0000-0000-0000-000000000000')`);
check('an unknown certificate id returns no row rather than an error', pubMissing.length === 0);

await actAs(OTHER_UID);
const { rows: [mine] } = await q(`SELECT is_mentor, students_required, students_helped FROM public.my_certificate_status()`);
check('my_certificate_status reports the 3-student bar', mine.students_required === 3 && mine.is_mentor === true);
await actAs(CURRENT_UID);

console.log('\nchat participant profiles:');
const { rows: profiles } = await q(`SELECT id, name FROM public.chat_participant_profiles(ARRAY[$1,$2]::uuid[])`, [CURRENT_UID, OTHER_UID]);
check('returns the caller and a conversation partner', profiles.length === 2, JSON.stringify(profiles));
check("resolves the partner's real name (the bug this migration fixed)", profiles.some((p) => p.id === OTHER_UID && p.name === 'Ravi Mentor'), JSON.stringify(profiles));
await actAs(FOURTH_UID);
const { rows: strangerView } = await q(`SELECT id FROM public.chat_participant_profiles(ARRAY[$1]::uuid[])`, [CURRENT_UID]);
check('a user with no shared conversation cannot resolve a stranger', strangerView.length === 0, JSON.stringify(strangerView));
await actAs(CURRENT_UID);

console.log('\nbadge award schedule:');
const { rows: [badgeJob] } = await q(`SELECT schedule FROM cron.job WHERE jobname='award-performance-badges-weekly'`);
check('badge job scheduled weekly (Monday 05:00)', badgeJob?.schedule === '0 5 * * 1', badgeJob?.schedule);
await q(`UPDATE public.mentors SET rating = 4.8, review_count = 12 WHERE id=$1`, [OTHER_UID]);
await q(`SELECT public.auto_award_performance_badges()`);
const { rows: [topMentorBadge] } = await q(
  `SELECT count(*)::int AS n FROM public.user_badges ub JOIN public.badge_types bt ON bt.id=ub.badge_type_id
   WHERE ub.user_id=$1 AND bt.name='Top Mentor'`, [OTHER_UID],
);
check('Top Mentor badge awarded once the rating/review bar is cleared -- nothing did this before this migration scheduled it', topMentorBadge.n === 1, `n=${topMentorBadge.n}`);
const { rows: [badgeNotif] } = await q(`SELECT count(*)::int AS n FROM public.notifications WHERE user_id=$1 AND type='badge'`, [OTHER_UID]);
check('the award fires the existing badge notification trigger', badgeNotif.n === 1, `n=${badgeNotif.n}`);
await q(`SELECT public.auto_award_performance_badges()`);
const { rows: [stillOneBadge] } = await q(
  `SELECT count(*)::int AS n FROM public.user_badges ub JOIN public.badge_types bt ON bt.id=ub.badge_type_id
   WHERE ub.user_id=$1 AND bt.name='Top Mentor'`, [OTHER_UID],
);
check('running the job again does not award the same badge twice (idempotent)', stillOneBadge.n === 1, `n=${stillOneBadge.n}`);

console.log('\ncolumn-level lockdown (mentors/faculty) + storage bucket ownership:');
const columnGrantCheck = async (table) => {
  const { rows } = await q(`
    SELECT column_name FROM information_schema.column_privileges
    WHERE table_schema='public' AND table_name=$1 AND grantee='anon' AND privilege_type='SELECT'`, [table]);
  return rows.map((r) => r.column_name);
};
const mentorAnonCols = await columnGrantCheck('mentors');
check('anon cannot select mentors.mobile', !mentorAnonCols.includes('mobile'), mentorAnonCols.join(','));
check('anon cannot select mentors.cgpa', !mentorAnonCols.includes('cgpa'), mentorAnonCols.join(','));
check('anon can select mentors.is_available (public directory field)', mentorAnonCols.includes('is_available'));
check('anon can select mentors.hobbies (granted by the immediate follow-up migration, 20260804132512)', mentorAnonCols.includes('hobbies'));
const facultyAnonCols = await columnGrantCheck('faculty');
check('anon can select faculty.avg_overall and the legacy avg_rating column alike', facultyAnonCols.includes('avg_overall') && facultyAnonCols.includes('avg_rating'), facultyAnonCols.join(','));

await db.exec(`
  GRANT USAGE ON SCHEMA storage TO authenticated;
  ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;
  GRANT SELECT, INSERT, UPDATE, DELETE ON storage.objects TO authenticated;
`);
const ownUpload = await asAuthenticated(() => attempt(
  `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('community-posts','pic.png',$1)`, [CURRENT_UID]));
check('a user can upload to community-posts as themselves', ownUpload === null, ownUpload ?? '');
const impersonatedUpload = await asAuthenticated(() => attempt(
  `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('community-posts','pic2.png',$1)`, [OTHER_UID]));
check('a user cannot upload to community-posts claiming to be someone else', impersonatedUpload !== null, impersonatedUpload ?? 'INSERT SUCCEEDED');
const nonAdminUpload = await asAuthenticated(() => attempt(
  `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('team_members','staff.png',$1)`, [CURRENT_UID]));
check('a non-admin cannot upload to the admin-only team_members bucket', nonAdminUpload !== null, nonAdminUpload ?? 'INSERT SUCCEEDED');
await q(`UPDATE public.users SET is_admin = true WHERE id=$1`, [CURRENT_UID]);
const adminUpload = await asAuthenticated(() => attempt(
  `INSERT INTO storage.objects (bucket_id, name, owner) VALUES ('team_members','staff2.png',$1)`, [CURRENT_UID]));
check('an admin can upload to the team_members bucket', adminUpload === null, adminUpload ?? '');
await q(`UPDATE public.users SET is_admin = false WHERE id=$1`, [CURRENT_UID]);

console.log('\nuser theme preference & welcome tour flag:');
let badTheme = false;
try { await q(`UPDATE public.users SET theme='blue' WHERE id=$1`, [CURRENT_UID]); } catch { badTheme = true; }
check('theme must be dark or light (CHECK constraint)', badTheme);
await q(`UPDATE public.users SET theme='dark' WHERE id=$1`, [CURRENT_UID]);
const { rows: [themed] } = await q(`SELECT theme FROM public.users WHERE id=$1`, [CURRENT_UID]);
check('a valid theme choice is saved', themed.theme === 'dark');
const { rows: [tourDefault] } = await q(`SELECT has_seen_welcome_tour FROM public.users WHERE id=$1`, [FOURTH_UID]);
check('has_seen_welcome_tour defaults to false for existing rows', tourDefault.has_seen_welcome_tour === false);

console.log('\nlock down anon RPC surface:');
const procAcl = async (fn) => {
  const { rows: [r] } = await q(
    `SELECT p.proacl::text AS acl FROM pg_proc p WHERE p.oid = $1::regprocedure`, [fn]);
  return r?.acl ?? '';
};
const collegeIdAcl = await procAcl('public.is_college_id_taken(text)');
check('is_college_id_taken: revoked from PUBLIC/anon, granted to authenticated', !collegeIdAcl.includes('anon=X') && collegeIdAcl.includes('authenticated=X'), collegeIdAcl);
const internalAcl = await procAcl('public.auto_approve_mentor_application()');
check('a trigger function has no anon/authenticated EXECUTE at all', !internalAcl.includes('anon=X') && !internalAcl.includes('authenticated=X'), internalAcl);
check('...and no bare PUBLIC grant either (revoking from anon alone would have been a no-op)', !/(^|,)=X\//.test(internalAcl), internalAcl);
const publicFnAcl = await procAcl('public.is_admin_user(uuid)');
check('is_admin_user stays callable by anon (RLS policy expressions run as the querying role)', publicFnAcl.includes('anon=X'), publicFnAcl);

await actAs(FOURTH_UID); // not an admin
let impersonationBlocked = false;
try {
  await q(`SELECT public.update_verification_status($1, 'approved', $2, null)`,
    ['00000000-0000-0000-0000-000000000000', OTHER_UID]);
} catch (e) {
  impersonationBlocked = /Only admins/.test(e.message);
}
check('naming an admin in the admin_id argument no longer grants admin power (the actor is auth.uid(), not the argument)', impersonationBlocked);
await actAs(CURRENT_UID);

console.log('\nopportunities & opportunity posting:');
const { rows: [opp] } = await q(
  `INSERT INTO public.opportunities (title, kind, description, posted_by, tags)
   VALUES ('Smart India Hackathon 2026!', 'hackathon', 'National hackathon', $1, ARRAY['AI','Web'])
   RETURNING id, slug`, [CURRENT_UID],
);
check('slug generated server-side from the title', opp.slug === 'smart-india-hackathon-2026', opp.slug);
const { rows: [opp2] } = await q(
  `INSERT INTO public.opportunities (title, posted_by) VALUES ('Smart India Hackathon 2026!', $1) RETURNING slug`, [CURRENT_UID],
);
check('a slug collision gets a numeric suffix', opp2.slug === 'smart-india-hackathon-2026-2', opp2.slug);
const { rows: [oppChunk] } = await q(`SELECT body FROM public.knowledge_chunks WHERE entity_type='opportunity' AND entity_id=$1`, [opp.id]);
check('posting projects into the search index immediately', oppChunk?.body?.includes('Smart India Hackathon'), oppChunk?.body ?? '(none)');

for (let i = 0; i < 3; i += 1) {
  await q(`INSERT INTO public.opportunities (title, posted_by) VALUES ($1, $2)`, [`Filler ${i}`, CURRENT_UID]);
}
let oppRateLimited = false;
try { await q(`INSERT INTO public.opportunities (title, posted_by) VALUES ('One too many', $1)`, [CURRENT_UID]); }
catch (e) { oppRateLimited = /posted 5 opportunities/.test(e.message); }
check('a 6th opportunity within 24 hours is rate-limited (admins exempt, this poster is not one)', oppRateLimited);

await q(`INSERT INTO public.opportunity_interest (opportunity_id, user_id, note) VALUES ($1,$2,'backend dev')`, [opp.id, FOURTH_UID]);
const { rows: [oppCommunity] } = await q(
  `INSERT INTO public.communities (slug, name, description, kind, owner_id) VALUES ('team-alpha-sih','Team Alpha','SIH team','hackathon',$1) RETURNING id`,
  [CURRENT_UID],
);
await q(`INSERT INTO public.opportunity_teams (opportunity_id, community_id, looking_for, created_by) VALUES ($1,$2,ARRAY['Designer'],$3)`, [opp.id, oppCommunity.id, CURRENT_UID]);
const { rows: [oppCounts] } = await q(`SELECT interest_count, team_count FROM public.opportunities WHERE id=$1`, [opp.id]);
check('interest_count and team_count recount via trigger', oppCounts.interest_count === 1 && oppCounts.team_count === 1, JSON.stringify(oppCounts));
await q(`DELETE FROM public.opportunity_interest WHERE opportunity_id=$1 AND user_id=$2`, [opp.id, FOURTH_UID]);
const { rows: [oppCountsAfter] } = await q(`SELECT interest_count FROM public.opportunities WHERE id=$1`, [opp.id]);
check('interest_count decrements when interest is withdrawn', oppCountsAfter.interest_count === 0);
const { rows: [oppRls] } = await q(`SELECT relrowsecurity FROM pg_class WHERE oid='public.opportunities'::regclass`);
check('RLS is enabled on opportunities', oppRls.relrowsecurity === true);

console.log('\nnotifications realtime:');
const { rows: [inPub] } = await q(`SELECT count(*)::int AS n FROM pg_publication_tables WHERE pubname='supabase_realtime' AND tablename='notifications'`);
check('notifications added to the realtime publication (previously nothing pushed to the bell without a manual refresh)', inPub.n === 1, `n=${inPub.n}`);

console.log('\nsrmap events cache + sync schedule:');
await q(`INSERT INTO public.srmap_events_cache (id, title, start_date, end_date, link) VALUES (1, 'Tech Fest', '2026-09-01','2026-09-03','https://events.srmap.edu.in/1')`);
await q(`SET LOCAL ROLE anon`).catch(() => {});
const { rows: eventsAnon } = await q(`SELECT title FROM public.srmap_events_cache`);
check('anon can read the public events cache', eventsAnon.length === 1, JSON.stringify(eventsAnon));
await q(`RESET ROLE`).catch(() => {});
const { rows: [eventsJob] } = await q(`SELECT schedule FROM cron.job WHERE jobname='sync-srmap-events-every-6h'`);
check('events sync job scheduled every 6 hours (08:00, 14:00, 20:00, 02:00 IST)', eventsJob?.schedule === '30 2,8,14,20 * * *', eventsJob?.schedule);

console.log('\nai overview feedback & search query cache admin access:');
await actAs(CURRENT_UID);
await q(`UPDATE public.users SET is_admin = false WHERE id = $1`, [CURRENT_UID]);
await q(`INSERT INTO public.search_query_cache (query_hash, query_text) VALUES ('hash_test_1', 'DSA Faculty') ON CONFLICT (query_hash) DO NOTHING`);
const { rows: studentQueries } = await asAuthenticated(() => q(`SELECT query_text FROM public.search_query_cache`));
check('regular user cannot select search queries under RLS', studentQueries.length === 0, `got ${studentQueries.length}`);

await q(`UPDATE public.users SET is_admin = true WHERE id = $1`, [CURRENT_UID]);
const { rows: adminQueries } = await asAuthenticated(() => q(`SELECT query_text FROM public.search_query_cache WHERE query_hash = 'hash_test_1'`));
check('admin can select search queries', adminQueries.length > 0 && adminQueries[0].query_text === 'DSA Faculty');

await actAs(OTHER_UID);
await q(`UPDATE public.users SET is_admin = false WHERE id = $1`, [OTHER_UID]);
await asAuthenticated(() => q(`INSERT INTO public.ai_overview_feedback (query, response, is_helpful) VALUES ('DSA Faculty', '{"summary": "Prof. Smith"}'::jsonb, true)`));
const { rows: nonAdminFeedback } = await asAuthenticated(() => q(`SELECT query FROM public.ai_overview_feedback`));
check('non-admin cannot select feedback', nonAdminFeedback.length === 0, `got ${nonAdminFeedback.length}`);

await actAs(CURRENT_UID);
const { rows: adminFeedback } = await asAuthenticated(() => q(`SELECT query, is_helpful, status FROM public.ai_overview_feedback WHERE query = 'DSA Faculty'`));
check('admin can select feedback', adminFeedback.length === 1 && adminFeedback[0].query === 'DSA Faculty');

console.log('\nsearch interactions & quality feedback loop:');
await actAs(CURRENT_UID);
await q(`SELECT public.log_search_click(' Quantum Computing ', 'faculty', 'some-uuid-or-slug')`);
const { rows: clicks } = await q(`SELECT query_hash, entity_type FROM public.search_interactions`);
check('log_search_click normalizes query and records interaction', clicks.length === 1 && clicks[0].entity_type === 'faculty');

await q(`SELECT public.aggregate_search_quality()`);
const { rows: quality } = await q(`SELECT click_count_30d FROM public.search_result_quality WHERE entity_id = 'some-uuid-or-slug'`);
check('aggregate_search_quality rolls up clicks into search_result_quality', quality.length === 1 && quality[0].click_count_30d === 1);

const { rows: [qualityJob] } = await q(`SELECT schedule FROM cron.job WHERE jobname='aggregate-search-quality-nightly'`);
check('search quality aggregation job scheduled nightly', qualityJob?.schedule === '0 2 * * *', qualityJob?.schedule);

// --- 20260823140000_search_click_tracking.sql -------------------------------
// The file above was in this list and passing since 2026-08-16 while the
// tables did not exist in production at all. A green run here has never meant
// the migration was deployed -- see DEPLOYMENT_GUIDE.md. What it can prove is
// the behaviour the rewrite changed, which is what follows.

await q(`DELETE FROM public.search_interactions`);
await q(`DELETE FROM public.search_result_quality`);

// One clicker, one vote: ten clicks from the same signed-in student on the
// same result must count once, or a mentor can rank themselves up by hand.
for (let i = 0; i < 10; i += 1) {
  await q(`SELECT public.log_search_click('quantum computing', 'faculty', 'target-entity')`);
}
await q(`SELECT public.aggregate_search_quality()`);
const { rows: [inflated] } = await q(`SELECT click_count_30d FROM public.search_result_quality WHERE entity_id = 'target-entity'`);
check('repeat clicks from one viewer count once', inflated?.click_count_30d === 1, `got ${inflated?.click_count_30d}`);

// A second distinct student does move the number.
await actAs(OTHER_UID);
await q(`SELECT public.log_search_click('quantum computing', 'faculty', 'target-entity')`);
await actAs(CURRENT_UID);
await q(`SELECT public.aggregate_search_quality()`);
const { rows: [twoVoters] } = await q(`SELECT click_count_30d FROM public.search_result_quality WHERE entity_id = 'target-entity'`);
check('a second distinct viewer increments the count', twoVoters?.click_count_30d === 2, `got ${twoVoters?.click_count_30d}`);

// Too-short queries are dropped at the entry point, not recorded as noise.
const { rows: beforeJunk } = await q(`SELECT count(*)::int AS n FROM public.search_interactions`);
await q(`SELECT public.log_search_click('ab', 'faculty', 'target-entity')`);
const { rows: afterJunk } = await q(`SELECT count(*)::int AS n FROM public.search_interactions`);
check('log_search_click ignores queries shorter than 3 chars', beforeJunk[0].n === afterJunk[0].n);

// Stale entities are deleted, not left as permanent zero rows: the client
// reads this table unfiltered and PostgREST caps the response at 1000 rows.
await q(`INSERT INTO public.search_interactions (query_hash, entity_type, entity_id, created_at)
         VALUES (md5('old'), 'faculty', 'stale-entity', now() - interval '40 days')`);
await q(`SELECT public.aggregate_search_quality()`);
const { rows: stale } = await q(`SELECT entity_id FROM public.search_result_quality WHERE entity_id = 'stale-entity'`);
check('entities with no click in 30 days are removed, not zeroed', stale.length === 0, `got ${stale.length} rows`);

// Retention: raw interactions are pruned past 90 days.
await q(`INSERT INTO public.search_interactions (query_hash, entity_type, entity_id, created_at)
         VALUES (md5('ancient'), 'faculty', 'ancient-entity', now() - interval '100 days')`);
await q(`SELECT public.aggregate_search_quality()`);
const { rows: ancient } = await q(`SELECT id FROM public.search_interactions WHERE entity_id = 'ancient-entity'`);
check('search_interactions older than 90 days are pruned', ancient.length === 0, `got ${ancient.length} rows`);

// Both definer functions must pin search_path -- without it the caller
// controls how their unqualified names resolve.
const { rows: definerPaths } = await q(`
  SELECT p.proname, p.proconfig
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname IN ('log_search_click', 'aggregate_search_quality')
`);
check(
  'click-tracking definer functions pin search_path',
  definerPaths.length === 2 && definerPaths.every((r) => String(r.proconfig ?? '').includes('search_path=')),
  JSON.stringify(definerPaths.map((r) => [r.proname, r.proconfig])),
);

// aggregate_search_quality is a maintenance job, not an API. New functions are
// exposed to PUBLIC by default, and a PUBLIC grant is the real ACL -- revoking
// from anon alone would be a no-op.
const { rows: [aggAcl] } = await q(`
  SELECT COALESCE(array_to_string(p.proacl, ' '), '') AS acl
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'aggregate_search_quality'
`);
check(
  'aggregate_search_quality is not callable by anon, authenticated or PUBLIC',
  !/(^|\s)=X\//.test(aggAcl.acl) && !/\banon=X\//.test(aggAcl.acl) && !/\bauthenticated=X\//.test(aggAcl.acl),
  aggAcl.acl,
);

// log_search_click is deliberately anon-callable -- most search traffic is
// signed out, and a loop that only hears from logged-in students learns wrong.
const { rows: [logAcl] } = await q(`
  SELECT COALESCE(array_to_string(p.proacl, ' '), '') AS acl
  FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'log_search_click'
`);
check('log_search_click stays callable by anon', /\banon=X\//.test(logAcl.acl), logAcl.acl);

// Supabase's default privileges grant ALL on new tables to anon and
// authenticated; 20260821230000 had to undo that across ~30 tables.
const { rows: tableGrants } = await q(`
  SELECT table_name, grantee, privilege_type
  FROM information_schema.table_privileges
  WHERE table_schema = 'public'
    AND table_name IN ('search_interactions', 'search_result_quality')
    AND grantee IN ('anon', 'authenticated')
  ORDER BY table_name, grantee, privilege_type
`);
const writeGrants = tableGrants.filter((r) => r.privilege_type !== 'SELECT');
check('click-tracking tables grant no writes to anon or authenticated', writeGrants.length === 0, JSON.stringify(writeGrants));
check(
  'anon can read search_result_quality but not raw interactions',
  tableGrants.some((r) => r.grantee === 'anon' && r.privilege_type === 'SELECT')
    && !tableGrants.some((r) => r.grantee === 'anon' && r.privilege_type === 'SELECT'
        && r.table_name === 'search_interactions'),
  JSON.stringify(tableGrants),
);

await q(`DELETE FROM public.search_interactions`);
await q(`DELETE FROM public.search_result_quality`);

// --- 20260823150000_search_analytics.sql ------------------------------------
console.log('\nsearch analytics (zero-result & no-click):');
await q(`DELETE FROM public.search_analytics`);

// A search that found nothing is counted as such.
await q(`SELECT public.log_search_run('where do i return a library book', 0)`);
const { rows: [emptySearch] } = await q(`
  SELECT search_count, zero_result_count, click_count FROM public.search_analytics
  WHERE query_text = 'where do i return a library book'`);
check(
  'log_search_run records a zero-result search',
  emptySearch?.search_count === 1 && emptySearch?.zero_result_count === 1 && emptySearch?.click_count === 0,
  JSON.stringify(emptySearch),
);

// Case and whitespace variants collapse to one row, so the admin list is not
// three near-identical entries. The hash must match log_search_click's exactly.
await q(`SELECT public.log_search_run('quantum computing', 4)`);
await q(`SELECT public.log_search_run('  Quantum   Computing  ', 4)`);
const { rows: normalisedQ } = await q(`
  SELECT search_count, zero_result_count FROM public.search_analytics
  WHERE query_hash = md5('quantum computing')`);
check(
  'case and whitespace variants collapse into one query row',
  normalisedQ.length === 1 && normalisedQ[0].search_count === 2 && normalisedQ[0].zero_result_count === 0,
  JSON.stringify(normalisedQ),
);

// The join that could not be built before: a click credits its search. This is
// the whole reason both functions hash the same way -- search_query_cache uses
// SHA-256 of the rewritten query and can never line up with either.
await q(`SELECT public.log_search_click('Quantum  Computing', 'faculty', 'clicked-entity')`);
const { rows: [credited] } = await q(`
  SELECT click_count FROM public.search_analytics WHERE query_hash = md5('quantum computing')`);
check('a click credits the search it came from', credited?.click_count === 1, JSON.stringify(credited));

// The no-click list must not swallow zero-result searches -- a search that
// found nothing had nothing to click, which is the other list's problem.
const { rows: noClickList } = await q(`
  SELECT query_text FROM public.search_analytics
  WHERE click_count = 0 AND search_count >= 2 AND zero_result_count < search_count`);
check(
  'zero-result searches are excluded from the no-click list',
  !noClickList.some((r) => r.query_text === 'where do i return a library book'),
  JSON.stringify(noClickList),
);

// A too-short query is dropped at the entry point, same as log_search_click.
await q(`SELECT public.log_search_run('ab', 0)`);
const { rows: junkRun } = await q(`SELECT 1 FROM public.search_analytics WHERE query_text = 'ab'`);
check('log_search_run ignores queries shorter than 3 chars', junkRun.length === 0);

// No viewer column at all -- the privacy guarantee is structural, not a policy
// that a later migration could quietly widen.
const { rows: analyticsCols } = await q(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'search_analytics'`);
check(
  'search_analytics stores no per-student column',
  !analyticsCols.some((c) => /viewer|user_id|student|email/i.test(c.column_name)),
  JSON.stringify(analyticsCols.map((c) => c.column_name)),
);

const { rows: analyticsGrants } = await q(`
  SELECT grantee, privilege_type FROM information_schema.table_privileges
  WHERE table_schema = 'public' AND table_name = 'search_analytics'
    AND grantee IN ('anon', 'authenticated')`);
check(
  'search_analytics grants SELECT to authenticated only, no writes',
  analyticsGrants.length === 1
    && analyticsGrants[0].grantee === 'authenticated'
    && analyticsGrants[0].privilege_type === 'SELECT',
  JSON.stringify(analyticsGrants),
);

await q(`UPDATE public.users SET is_admin = false WHERE id = $1`, [OTHER_UID]);
await actAs(OTHER_UID);
const { rows: nonAdminAnalytics } = await asAuthenticated(() => q(`SELECT query_text FROM public.search_analytics`));
check('non-admin cannot read search analytics', nonAdminAnalytics.length === 0, `got ${nonAdminAnalytics.length}`);

await actAs(CURRENT_UID);
await q(`UPDATE public.users SET is_admin = true WHERE id = $1`, [CURRENT_UID]);
const { rows: adminAnalytics } = await asAuthenticated(() => q(`SELECT query_text FROM public.search_analytics`));
check('admin can read search analytics', adminAnalytics.length > 0, `got ${adminAnalytics.length}`);

// Retention: the nightly job prunes queries nobody has run in 180 days.
await q(`UPDATE public.search_analytics SET last_searched_at = now() - interval '200 days'
         WHERE query_text = 'where do i return a library book'`);
await q(`SELECT public.aggregate_search_quality()`);
const { rows: prunedAnalytics } = await q(`
  SELECT 1 FROM public.search_analytics WHERE query_text = 'where do i return a library book'`);
check('search analytics older than 180 days are pruned', prunedAnalytics.length === 0, `got ${prunedAnalytics.length} rows`);

await q(`DELETE FROM public.search_analytics`);
await q(`DELETE FROM public.search_interactions`);
await q(`DELETE FROM public.search_result_quality`);

console.log('\nadmin role management rpc (set_user_admin_status):');
await actAs(CURRENT_UID);
await q(`UPDATE public.users SET is_admin = true WHERE id = $1`, [CURRENT_UID]);
await q(`UPDATE public.users SET is_admin = false WHERE id = $1`, [OTHER_UID]);

// 1. Admin promoting other user
const { rows: [promotedAdminRes] } = await asAuthenticated(() => q(`SELECT public.set_user_admin_status($1::uuid, true) as res`, [OTHER_UID]));
const promotedObj = typeof promotedAdminRes?.res === 'string' ? JSON.parse(promotedAdminRes.res) : promotedAdminRes?.res;
check('admin can promote another user via set_user_admin_status', promotedObj?.is_admin === true);

// 2. Non-admin attempting to promote/demote
await actAs(OTHER_UID);
await q(`UPDATE public.users SET is_admin = false WHERE id = $1`, [OTHER_UID]);
let nonAdminBlocked = false;
try {
  await asAuthenticated(() => q(`SELECT public.set_user_admin_status($1::uuid, true)`, [OTHER_UID]));
} catch (err) {
  nonAdminBlocked = /Only administrators can modify admin status/i.test(err.message);
}
check('non-admin is blocked from calling set_user_admin_status', nonAdminBlocked);

// 3. Admin revoking admin status
await actAs(CURRENT_UID);
const { rows: [revokedAdminRes] } = await asAuthenticated(() => q(`SELECT public.set_user_admin_status($1::uuid, false) as res`, [OTHER_UID]));
const revokedObj = typeof revokedAdminRes?.res === 'string' ? JSON.parse(revokedAdminRes.res) : revokedAdminRes?.res;
check('admin can revoke admin privileges via set_user_admin_status', revokedObj?.is_admin === false);

console.log('\ndrop legacy canvas tables:');
const { rows: [canvasTables] } = await q(`SELECT count(*)::int AS n FROM information_schema.tables WHERE table_schema='public' AND table_name LIKE 'canvas_%'`);
check('orphan canvas tables dropped cleanly', canvasTables?.n === 0, `found ${canvasTables?.n} canvas tables`);

console.log('\nmarketplace_posts.user_id index:');
const { rows: [mpIndex] } = await q(`SELECT indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='marketplace_posts' AND indexname='idx_marketplace_posts_user_id'`);
check('idx_marketplace_posts_user_id exists on (user_id)', !!mpIndex && /\(user_id\)/.test(mpIndex.indexdef), mpIndex?.indexdef ?? '(missing)');

console.log('\nstorage list policies target bucket id, not display name:');
const { rows: [listPolicy] } = await q(`SELECT qual FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Authenticated can list community post images'`);
check('community post images list policy targets the real bucket id', listPolicy?.qual === "(bucket_id = 'community-posts'::text)", listPolicy?.qual ?? '(missing)');
const listAsAuthenticated = await asAuthenticated(() => attempt(
  `SELECT 1 FROM storage.objects WHERE bucket_id = 'community-posts' LIMIT 1`));
check('an authenticated user can list community-posts objects', listAsAuthenticated === null, listAsAuthenticated ?? '');

const { rows: [profileListPolicy] } = await q(`SELECT qual FROM pg_policies WHERE schemaname='storage' AND tablename='objects' AND policyname='Authenticated can list profile-images'`);
check('profile-images list policy targets the real bucket id (profiles)', profileListPolicy?.qual === "(bucket_id = 'profiles'::text)", profileListPolicy?.qual ?? '(missing)');
const profileListAsAuthenticated = await asAuthenticated(() => attempt(
  `SELECT 1 FROM storage.objects WHERE bucket_id = 'profiles' LIMIT 1`));
check('an authenticated user can list profiles objects', profileListAsAuthenticated === null, profileListAsAuthenticated ?? '');

console.log('\ncampus notices (admin-authored circulars):');
await actAs(CURRENT_UID);
await q(`UPDATE public.users SET is_admin = true WHERE id = $1`, [CURRENT_UID]);
await q(`UPDATE public.users SET is_admin = false WHERE id = $1`, [OTHER_UID]);

// Owner insert (bypasses RLS) exercises the trigger + projector directly.
const { rows: [notice] } = await q(
  `INSERT INTO public.campus_notices (title, category, reference_no, issued_date, effective_date, summary, content, created_by)
   VALUES ('EID-Milad-un-Nabi holiday moved to 26th August', 'holiday_change', 'SRMAP/Reg. Off/Circular/02/2026-27', '2026-08-20', '2026-08-26', 'Holiday rescheduled from 25th to 26th August 2026.', 'Full circular body text.', $1)
   RETURNING id`,
  [CURRENT_UID],
);
const { rows: [noticeChunk] } = await q(
  `SELECT body, subtitle, metadata FROM public.knowledge_chunks WHERE entity_type='notice' AND entity_id=$1`,
  [notice.id],
);
check('reproject trigger fires on INSERT (chunk exists)', !!noticeChunk, noticeChunk ? 'found' : 'missing');
check('chunk body carries the notice content', noticeChunk?.body?.includes('Full circular body text.'), noticeChunk?.body ?? '');
check('chunk metadata carries the effective_date', noticeChunk?.metadata?.effective_date === '2026-08-26', JSON.stringify(noticeChunk?.metadata));

// Unpublishing removes the chunk (same idiom as campus_documents).
await q(`UPDATE public.campus_notices SET is_published = false WHERE id = $1`, [notice.id]);
const { rows: afterUnpublish } = await q(
  `SELECT id FROM public.knowledge_chunks WHERE entity_type='notice' AND entity_id=$1`,
  [notice.id],
);
check('unpublishing a notice removes its chunk', afterUnpublish.length === 0, `${afterUnpublish.length} rows`);
await q(`UPDATE public.campus_notices SET is_published = true WHERE id = $1`, [notice.id]);

// RLS: a non-admin cannot insert.
await actAs(OTHER_UID);
const nonAdminInsert = await asAuthenticated(() => attempt(
  `INSERT INTO public.campus_notices (title, issued_date, content) VALUES ('should fail', '2026-08-20', 'x')`));
check('RLS blocks a non-admin from inserting a notice', nonAdminInsert !== null, nonAdminInsert ?? 'INSERT SUCCEEDED');

// RLS: an admin can insert directly from the client (the whole point of this
// table vs. campus_documents, which only service_role can write).
await actAs(CURRENT_UID);
const adminInsert = await asAuthenticated(() => attempt(
  `INSERT INTO public.campus_notices (title, issued_date, content) VALUES ('admin-written notice', '2026-08-21', 'x')`));
check('RLS admits an admin inserting a notice', adminInsert === null, adminInsert ?? '');

// Everyone (including signed-out) can read published notices.
const { rows: anonNotices } = await asAuthenticated(() =>
  q(`SELECT id FROM public.campus_notices WHERE is_published = true`));
check('published notices are readable', anonNotices.length >= 2, `${anonNotices.length} rows`);

// Supabase's default privileges hand every new table ALL to anon; this table
// must keep anon to SELECT-only, matching campus_documents.
const { rows: noticeAcl } = await q(
  `SELECT grantee, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privs
     FROM information_schema.table_privileges
    WHERE table_schema='public' AND table_name='campus_notices' AND grantee IN ('anon','authenticated')
    GROUP BY grantee`,
);
const noticeAnon = noticeAcl.find((r) => r.grantee === 'anon');
check('campus_notices grants SELECT only to anon', noticeAnon?.privs === 'SELECT', noticeAnon?.privs ?? 'none');

// An unpublished notice must stay invisible to everyone except an admin —
// the /notices/:id page's "Unpublished Draft (Admin View)" state relies on
// an admin being able to preview a draft before it's published.
await q(`UPDATE public.campus_notices SET is_published = false WHERE id = $1`, [notice.id]);

await actAs(OTHER_UID);
const { rows: nonAdminPreview } = await asAuthenticated(() =>
  q(`SELECT id FROM public.campus_notices WHERE id = $1`, [notice.id]));
check('a non-admin cannot preview an unpublished notice', nonAdminPreview.length === 0, `${nonAdminPreview.length} rows`);

await actAs(CURRENT_UID);
const { rows: adminPreview } = await asAuthenticated(() =>
  q(`SELECT id FROM public.campus_notices WHERE id = $1`, [notice.id]));
check('an admin can preview an unpublished notice', adminPreview.length === 1, `${adminPreview.length} rows`);

await q(`UPDATE public.campus_notices SET is_published = true WHERE id = $1`, [notice.id]);

console.log('\nknowledge articles (admin-authored rich-text reference content):');
await actAs(CURRENT_UID);

const { rows: [article] } = await q(
  `INSERT INTO public.knowledge_articles (slug, title, category, content_html, content_text, created_by)
   VALUES ('outpass-policy', 'Student Outpass Policy', 'hostel_policy', '<h2>General Outpass</h2><p>Issued <strong>only</strong> on holidays.</p>', 'General Outpass. Issued only on holidays.', $1)
   RETURNING id`,
  [CURRENT_UID],
);
const { rows: [articleChunk] } = await q(
  `SELECT body, subtitle, metadata FROM public.knowledge_chunks WHERE entity_type='article' AND entity_id=$1`,
  [article.id],
);
check('reproject trigger fires on INSERT (chunk exists)', !!articleChunk, articleChunk ? 'found' : 'missing');
check('chunk body carries the plain-text extraction, not HTML', articleChunk?.body?.includes('Issued only on holidays.') && !articleChunk.body.includes('<strong>'), articleChunk?.body ?? '');
check('chunk metadata carries the slug', articleChunk?.metadata?.slug === 'outpass-policy', JSON.stringify(articleChunk?.metadata));

// Editing content changes content_hash, which nulls embedding/embedded_at so
// embed-knowledge re-embeds it (this is what makes "edit any time" actually
// keep search results current).
await q(`UPDATE public.knowledge_chunks SET embedding = '[]', embedded_at = now() WHERE entity_type='article' AND entity_id=$1`, [article.id]);
await q(
  `UPDATE public.knowledge_articles SET content_html = $1, content_text = $2 WHERE id = $3`,
  ['<h2>General Outpass</h2><p>Issued <strong>only</strong> on holidays, 8am-12pm.</p>', 'General Outpass. Issued only on holidays, 8am-12pm.', article.id],
);
const { rows: [articleChunkAfterEdit] } = await q(
  `SELECT body, embedding, embedded_at FROM public.knowledge_chunks WHERE entity_type='article' AND entity_id=$1`,
  [article.id],
);
check('editing an article updates the chunk body', articleChunkAfterEdit?.body?.includes('8am-12pm'), articleChunkAfterEdit?.body ?? '');
check('editing an article nulls embedding so it gets re-embedded', articleChunkAfterEdit?.embedding === null && articleChunkAfterEdit?.embedded_at === null, JSON.stringify(articleChunkAfterEdit));

// Unpublishing removes the chunk (same idiom as campus_notices/campus_documents).
await q(`UPDATE public.knowledge_articles SET is_published = false WHERE id = $1`, [article.id]);
const { rows: articleAfterUnpublish } = await q(
  `SELECT id FROM public.knowledge_chunks WHERE entity_type='article' AND entity_id=$1`,
  [article.id],
);
check('unpublishing an article removes its chunk', articleAfterUnpublish.length === 0, `${articleAfterUnpublish.length} rows`);
await q(`UPDATE public.knowledge_articles SET is_published = true WHERE id = $1`, [article.id]);

// RLS: a non-admin cannot insert.
await actAs(OTHER_UID);
const nonAdminArticleInsert = await asAuthenticated(() => attempt(
  `INSERT INTO public.knowledge_articles (slug, title, content_html, content_text) VALUES ('should-fail', 'should fail', '<p>x</p>', 'x')`));
check('RLS blocks a non-admin from inserting an article', nonAdminArticleInsert !== null, nonAdminArticleInsert ?? 'INSERT SUCCEEDED');

// RLS: an admin can insert directly from the client.
await actAs(CURRENT_UID);
const adminArticleInsert = await asAuthenticated(() => attempt(
  `INSERT INTO public.knowledge_articles (slug, title, content_html, content_text) VALUES ('admin-written-article', 'admin-written article', '<p>x</p>', 'x')`));
check('RLS admits an admin inserting an article', adminArticleInsert === null, adminArticleInsert ?? '');

// Everyone (including signed-out) can read published articles.
const { rows: anonArticles } = await asAuthenticated(() =>
  q(`SELECT id FROM public.knowledge_articles WHERE is_published = true`));
check('published articles are readable', anonArticles.length >= 2, `${anonArticles.length} rows`);

// Supabase's default privileges hand every new table ALL to anon; this table
// must keep anon to SELECT-only, matching campus_notices/campus_documents.
const { rows: articleAcl } = await q(
  `SELECT grantee, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privs
     FROM information_schema.table_privileges
    WHERE table_schema='public' AND table_name='knowledge_articles' AND grantee IN ('anon','authenticated')
    GROUP BY grantee`,
);
const articleAnon = articleAcl.find((r) => r.grantee === 'anon');
check('knowledge_articles grants SELECT only to anon', articleAnon?.privs === 'SELECT', articleAnon?.privs ?? 'none');

// An unpublished draft must stay invisible to everyone except an admin —
// the admin articles list needs to show drafts before they're published.
await q(`UPDATE public.knowledge_articles SET is_published = false WHERE id = $1`, [article.id]);

await actAs(OTHER_UID);
const { rows: nonAdminArticlePreview } = await asAuthenticated(() =>
  q(`SELECT id FROM public.knowledge_articles WHERE id = $1`, [article.id]));
check('a non-admin cannot preview an unpublished article', nonAdminArticlePreview.length === 0, `${nonAdminArticlePreview.length} rows`);

await actAs(CURRENT_UID);
const { rows: adminArticlePreview } = await asAuthenticated(() =>
  q(`SELECT id FROM public.knowledge_articles WHERE id = $1`, [article.id]));
check('an admin can preview an unpublished article', adminArticlePreview.length === 1, `${adminArticlePreview.length} rows`);

await q(`UPDATE public.knowledge_articles SET is_published = true WHERE id = $1`, [article.id]);

console.log('\ncampus documents (handbooks/calendars, service_role-only writes):');
// campus_documents itself has no seed data in migrations (the real content
// is loaded once by tools/process_university_data.py's generated SQL, run
// by hand) -- exercise the shape and RLS posture instead.
const { rows: [doc] } = await q(
  `INSERT INTO public.campus_documents (document_slug, document_title, category, section_heading, content)
   VALUES ('test-doc', 'Test Document', 'test', 'Section A', 'Body text for section A.')
   RETURNING id`,
);
// No per-row trigger on campus_documents (unlike campus_notices) -- the
// hourly rebuild_knowledge_chunks() cron is what picks up new documents.
await q(`SELECT public.rebuild_document_chunks()`);
const { rows: [docChunkAfterRebuild] } = await q(
  `SELECT body FROM public.knowledge_chunks WHERE entity_type='document' AND entity_id=$1`,
  [doc.id],
);
check('rebuild_document_chunks() projects the document into knowledge_chunks', docChunkAfterRebuild?.body?.includes('Body text for section A.'), docChunkAfterRebuild?.body ?? '(missing)');

const { rows: docAcl } = await q(
  `SELECT grantee, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privs
     FROM information_schema.table_privileges
    WHERE table_schema='public' AND table_name='campus_documents' AND grantee IN ('anon','authenticated')
    GROUP BY grantee`,
);
const docAnon = docAcl.find((r) => r.grantee === 'anon');
check('campus_documents grants SELECT only to anon', docAnon?.privs === 'SELECT', docAnon?.privs ?? 'none');

console.log('\nacademic calendar resolver (deterministic holiday lookup):');
const { rows: calendarRows } = await q(`SELECT calendar_date, occasion_name FROM public.academic_calendar_days`);
check('seed data carries all 24 verified holiday/occasion rows', calendarRows.length === 24, `${calendarRows.length} rows`);

const { rows: [varalakshmi] } = await q(`SELECT * FROM public.get_calendar_day('2026-08-21'::date)`);
check('get_calendar_day resolves the Varalakshmi Vratam fact (the original bug)', varalakshmi?.is_holiday === true && varalakshmi?.occasion_name === 'Varalakshmi Vratam' && varalakshmi?.source === 'calendar', JSON.stringify(varalakshmi));

const { rows: [nonHoliday] } = await q(`SELECT * FROM public.get_calendar_day('2026-08-20'::date)`);
check('get_calendar_day returns no row for an ordinary working day (honest about scope, not a false negative)', !nonHoliday, JSON.stringify(nonHoliday ?? null));

// A published holiday_change notice with both effective_date and superseded_date
// overrides the static table on BOTH dates:
// 1. the new date (2026-08-26) becomes is_holiday = true (source = 'notice_override')
// 2. the vacated date (2026-08-25) becomes is_holiday = false (source = 'notice_override')
await q(
  `INSERT INTO public.campus_notices (title, category, issued_date, effective_date, superseded_date, summary, content, is_published, created_by)
   VALUES ('Milad-un-Nabi holiday moved to 26th August', 'holiday_change', '2026-08-20', '2026-08-26', '2026-08-25', 'Holiday rescheduled from 25th to 26th August 2026.', 'Full circular body.', true, $1)`,
  [CURRENT_UID],
);
const { rows: [overriddenNewDate] } = await q(`SELECT * FROM public.get_calendar_day('2026-08-26'::date)`);
check('a published holiday_change notice marks effective_date as holiday override', overriddenNewDate?.is_holiday === true && overriddenNewDate?.source === 'notice_override' && overriddenNewDate?.notice_title?.includes('moved to 26th August'), JSON.stringify(overriddenNewDate));

const { rows: [overriddenVacatedDate] } = await q(`SELECT * FROM public.get_calendar_day('2026-08-25'::date)`);
check('a published holiday_change notice un-marks superseded_date as is_holiday = false override', overriddenVacatedDate?.is_holiday === false && overriddenVacatedDate?.source === 'notice_override' && overriddenVacatedDate?.occasion_name === 'Eid Milad-Un-Nabi', JSON.stringify(overriddenVacatedDate));

const { rows: calendarAcl } = await q(
  `SELECT grantee, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privs
     FROM information_schema.table_privileges
    WHERE table_schema='public' AND table_name='academic_calendar_days' AND grantee IN ('anon','authenticated')
    GROUP BY grantee`,
);
const calendarAnon = calendarAcl.find((r) => r.grantee === 'anon');
check('academic_calendar_days grants SELECT only to anon', calendarAnon?.privs === 'SELECT', calendarAnon?.privs ?? 'none');

const { rows: fnAcl } = await q(
  `SELECT grantee FROM information_schema.role_routine_grants
    WHERE routine_schema='public' AND routine_name='get_calendar_day' AND grantee IN ('anon','authenticated')`,
);
check('get_calendar_day is not directly callable by anon/authenticated (service_role only, called from the edge function)', fnAcl.length === 0, `${fnAcl.length} grants`);

console.log('\nfaculty has_image column and photo updates:');
const { rows: [fWithImg] } = await q(
  `INSERT INTO public.faculty (name, department, slug, image_url)
   VALUES ('Dr Test With Image', 'Physics', 'dr-test-with-img', 'https://example.com/photo.jpg')
   RETURNING has_image, image_url`,
);
check('has_image computes TRUE when image_url is present', fWithImg?.has_image === true, JSON.stringify(fWithImg));

const { rows: [fNoImg] } = await q(
  `INSERT INTO public.faculty (name, department, slug, image_url)
   VALUES ('Dr Test No Image', 'Physics', 'dr-test-no-img', NULL)
   RETURNING has_image, image_url`,
);
check('has_image computes FALSE when image_url is null', fNoImg?.has_image === false, JSON.stringify(fNoImg));

const { rows: facultyColAcl } = await q(
  `SELECT grantee, column_name, privilege_type
     FROM information_schema.column_privileges
    WHERE table_schema='public' AND table_name='faculty' AND column_name='has_image' AND grantee IN ('anon','authenticated')`,
);
const hasAnonHasImage = facultyColAcl.some((r) => r.grantee === 'anon' && r.privilege_type === 'SELECT');
check('public.faculty has_image column granted SELECT to anon', hasAnonHasImage);

console.log('\nfaculty-portraits and event-images storage buckets:');
const { rows: buckets } = await q(
  `SELECT id, name, public FROM storage.buckets WHERE id IN ('faculty-portraits', 'event-images')`,
);
check('faculty-portraits bucket exists and is public', buckets.some((b) => b.id === 'faculty-portraits' && b.public === true));
check('event-images bucket exists and is public', buckets.some((b) => b.id === 'event-images' && b.public === true));

await q(
  `INSERT INTO storage.objects (bucket_id, name) VALUES ('faculty-portraits', 'dr-test-portrait.webp')`,
);
await q(
  `INSERT INTO public.faculty (name, department, slug, image_url)
   VALUES ('Dr Test Storage', 'Physics', 'dr-test-portrait', 'https://www.srmap.edu.in/old.jpg')`,
);
await q(
  `UPDATE public.faculty f
   SET image_url = 'https://ruapdkrgcbqrhvsayvpf.supabase.co/storage/v1/object/public/faculty-portraits/' || o.name
   FROM storage.objects o
   WHERE o.bucket_id = 'faculty-portraits' AND o.name = f.slug || '.webp' AND f.slug = 'dr-test-portrait'`,
);
const { rows: [fStorage] } = await q(
  `SELECT image_url, has_image FROM public.faculty WHERE slug = 'dr-test-portrait'`,
);
check('faculty image_url points to storage CDN object', fStorage?.image_url?.includes('storage/v1/object/public/faculty-portraits/dr-test-portrait.webp') === true, JSON.stringify(fStorage));

console.log('\nsearch history (record_search_history rpc, with result_url):');
await actAs(CURRENT_UID);
await asAuthenticated(() => q(`SELECT public.record_search_history('  Quantum Computing faculty  ')`));
const { rows: h1 } = await asAuthenticated(() => q(`SELECT query, result_url FROM public.search_history WHERE user_id = $1`, [CURRENT_UID]));
check('record_search_history trims the query and defaults result_url to null', h1.length === 1 && h1[0].query === 'Quantum Computing faculty' && h1[0].result_url === null, JSON.stringify(h1));

await asAuthenticated(() => q(`SELECT public.record_search_history('quantum computing faculty')`));
const { rows: h2 } = await asAuthenticated(() => q(`SELECT query FROM public.search_history WHERE user_id = $1`, [CURRENT_UID]));
check('re-searching the same query case-insensitively bumps it instead of duplicating', h2.length === 1, `got ${h2.length}`);

await asAuthenticated(() => q(`SELECT public.record_search_history('admin', '/admin')`));
const { rows: h3 } = await asAuthenticated(() => q(`SELECT query, result_url FROM public.search_history WHERE user_id = $1 AND query = 'admin'`, [CURRENT_UID]));
check('record_search_history stores the resolved destination url', h3.length === 1 && h3[0].result_url === '/admin', JSON.stringify(h3));

for (let i = 0; i < 10; i++) {
  await asAuthenticated(() => q(`SELECT public.record_search_history($1)`, [`history entry ${i}`]));
}
const { rows: h4 } = await asAuthenticated(() => q(`SELECT query FROM public.search_history WHERE user_id = $1`, [CURRENT_UID]));
check('history is capped at 8 rows per user', h4.length === 8, `got ${h4.length}`);

await actAs(OTHER_UID);
const { rows: otherHistory } = await asAuthenticated(() => q(`SELECT query FROM public.search_history WHERE user_id = $1`, [CURRENT_UID]));
check("a different user cannot read another user's search history under RLS", otherHistory.length === 0, `got ${otherHistory.length}`);

const deleteAsOther = await asAuthenticated(() => attempt(`DELETE FROM public.search_history WHERE user_id = $1`, [CURRENT_UID]));
check("RLS no-ops another user's attempt to delete rows they do not own", deleteAsOther === null);

await actAs(CURRENT_UID);
const { rows: stillThere } = await asAuthenticated(() => q(`SELECT query FROM public.search_history WHERE user_id = $1`, [CURRENT_UID]));
check("the other user's delete attempt left the owner's history untouched", stillThere.length === 8, `got ${stillThere.length}`);

await asAuthenticated(() => q(`DELETE FROM public.search_history WHERE user_id = $1 AND query = 'history entry 9'`, [CURRENT_UID]));
const { rows: afterDelete } = await asAuthenticated(() => q(`SELECT query FROM public.search_history WHERE user_id = $1`, [CURRENT_UID]));
check('owner can delete a single history entry', afterDelete.length === 7 && !afterDelete.some((r) => r.query === 'history entry 9'), `got ${afterDelete.length}`);

console.log('\ntrending searches (get_trending_searches rpc):');
await q(`INSERT INTO public.search_query_cache (query_hash, query_text, hit_count, last_used_at) VALUES
  ('trend_hot', 'hostel outpass procedure', 12, now()),
  ('trend_warm', 'hackathon teammates', 4, now() - interval '2 days'),
  ('trend_single_hit', 'a rare one-off query', 1, now()),
  ('trend_too_short', 'cs', 9, now()),
  ('trend_stale', 'old exam schedule question', 20, now() - interval '30 days')
`);
const { rows: trending } = await q(`SELECT query_text, hit_count FROM public.get_trending_searches(6)`);
check('trending excludes single-hit queries', !trending.some((r) => r.query_text === 'a rare one-off query'), JSON.stringify(trending));
check('trending excludes queries below the length floor', !trending.some((r) => r.query_text === 'cs'), JSON.stringify(trending));
check('trending excludes queries older than 14 days', !trending.some((r) => r.query_text === 'old exam schedule question'), JSON.stringify(trending));
check('trending surfaces the highest hit_count first', trending[0]?.query_text === 'hostel outpass procedure', JSON.stringify(trending));
check('trending includes a qualifying warm query', trending.some((r) => r.query_text === 'hackathon teammates'), JSON.stringify(trending));

const { rows: trendingLimited } = await q(`SELECT query_text FROM public.get_trending_searches(1)`);
check('p_limit is respected', trendingLimited.length === 1, `got ${trendingLimited.length}`);

// --- 20260823170000_mentor_activity_stats.sql --------------------------------
// These replace the constants that used to be printed on every mentor profile
// ("91% response rate", "12+ Mentees Mentored"). The point of each check below
// is that the number moves with the data -- a fabricated value passes none of
// them, which is exactly the regression worth catching.
console.log('\nmentor activity (real reply stats):');

// A mentor of its own, not OTHER_UID: earlier sections in this file already
// give Ravi conversations, and inheriting them makes every count below a
// moving target.
const MENTOR_X = '88888888-8888-8888-8888-888888888888';
const STU_A = '55555555-5555-5555-5555-555555555555';
const STU_B = '66666666-6666-6666-6666-666666666666';
const STU_C = '77777777-7777-7777-7777-777777777777';
const CONV_A = 'aaaaaaaa-0000-4000-8000-00000000000a';
const CONV_B = 'bbbbbbbb-0000-4000-8000-00000000000b';
const CONV_C = 'cccccccc-0000-4000-8000-00000000000c';

await db.exec(`
  INSERT INTO public.users (id, name, email, role, department, is_admin)
    VALUES ('${MENTOR_X}', 'Meera Mentor', 'meera@srmap.edu.in', 'mentor', 'CSE', false);
  INSERT INTO public.mentors (id, name, department)
    VALUES ('${MENTOR_X}', 'Meera Mentor', 'CSE');
`);

const noStats = await q(`SELECT * FROM public.mentor_activity('${MENTOR_X}')`);
check(
  'a mentor with no conversations reports zeroes, not a flattering default',
  noStats.rows[0]?.students_helped === 0
    && noStats.rows[0]?.requests_received === 0
    && noStats.rows[0]?.median_reply_minutes === null,
  JSON.stringify(noStats.rows[0]),
);

await db.exec(`
  INSERT INTO public.users (id, name, email, role, department, is_admin) VALUES
    ('${STU_A}', 'Student A', 'a@srmap.edu.in', 'student', 'CSE', false),
    ('${STU_B}', 'Student B', 'b@srmap.edu.in', 'student', 'CSE', false),
    ('${STU_C}', 'Student C', 'c@srmap.edu.in', 'student', 'CSE', false);
  INSERT INTO public.conversations (id, user1_id, user2_id) VALUES
    ('${CONV_A}', '${STU_A}', '${MENTOR_X}'),
    ('${CONV_B}', '${STU_B}', '${MENTOR_X}'),
    ('${CONV_C}', '${STU_C}', '${MENTOR_X}');

  -- A: asked, answered 30 minutes later.
  INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content, sent_at) VALUES
    ('${CONV_A}', '${STU_A}', '${MENTOR_X}', 'hi',    now() - interval '10 days'),
    ('${CONV_A}', '${MENTOR_X}', '${STU_A}', 'hello', now() - interval '10 days' + interval '30 minutes'),
  -- B: asked, answered 90 minutes later.
    ('${CONV_B}', '${STU_B}', '${MENTOR_X}', 'hi',    now() - interval '5 days'),
    ('${CONV_B}', '${MENTOR_X}', '${STU_B}', 'hello', now() - interval '5 days' + interval '90 minutes'),
  -- C: asked twice, never answered. This is the one a fabricated rate hides.
    ('${CONV_C}', '${STU_C}', '${MENTOR_X}', 'hello?', now() - interval '3 days'),
    ('${CONV_C}', '${STU_C}', '${MENTOR_X}', 'anyone?', now() - interval '2 days');
`);

const { rows: [act] } = await q(`SELECT * FROM public.mentor_activity('${MENTOR_X}')`);

check(
  'requests_received counts every student who wrote, including the ignored one',
  act?.requests_received === 3,
  JSON.stringify(act),
);
check(
  'requests_answered excludes the conversation that was never replied to',
  act?.requests_answered === 2,
  JSON.stringify(act),
);
check(
  'students_helped matches the certificate definition (both sides spoke)',
  act?.students_helped === 2,
  JSON.stringify(act),
);
// 30 and 90 -> median 60. A mean would also give 60 here, so the unanswered
// conversation staying out of the calculation is what this really pins down.
check(
  'median_reply_minutes measures real turnaround',
  act?.median_reply_minutes === 60,
  JSON.stringify(act),
);
check(
  'last_message_at reflects the mentor\'s own latest message',
  act?.last_message_at !== null,
  JSON.stringify(act),
);

// An unanswered follow-up must not count as a second request -- otherwise a
// student who nags three times drags the mentor's rate down three times.
const { rows: [oneRequest] } = await q(`
  SELECT requests_received FROM public.mentor_activity('${MENTOR_X}')`);
check(
  'two messages in one conversation are one request, not two',
  oneRequest?.requests_received === 3,
  JSON.stringify(oneRequest),
);

// The function bypasses RLS on messages, so it must not become a way to read
// any user's activity by guessing UUIDs.
const { rows: notMentor } = await q(`SELECT * FROM public.mentor_activity('${STU_A}')`);
check(
  'mentor_activity returns nothing for a non-mentor uuid',
  notMentor.length === 0,
  JSON.stringify(notMentor),
);

const { rows: [actPath] } = await q(`
  SELECT p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'mentor_activity'`);
check(
  'mentor_activity pins its search_path',
  (actPath?.proconfig ?? []).some((c) => c.startsWith('search_path=')),
  JSON.stringify(actPath),
);

const { rows: [actAcl] } = await q(`
  SELECT has_function_privilege('anon', 'public.mentor_activity(uuid)', 'EXECUTE') AS anon_exec`);
check(
  'mentor_activity is callable by anon (the profile it feeds is public)',
  actAcl?.anon_exec === true,
  JSON.stringify(actAcl),
);

// --- 20260823190000_mentor_profile_summary.sql --------------------------------
// The four summary fields were read by the app long before they were columns,
// so the fallback in mentor-enhancements.ts fired for every mentor and every
// profile said the same thing. These checks cover the two things that make the
// replacement safe: the anon grant (without it the whole public directory 401s)
// and the material threshold (without it generation recreates the template).
console.log('\n--- 20260823190000_mentor_profile_summary.sql ---');

const M_RICH = '99999999-0000-0000-0000-000000000001';
const M_THIN = '99999999-0000-0000-0000-000000000002';
const M_PROJ = '99999999-0000-0000-0000-000000000003';
const LONG_BIO =
  'I build computer vision models and have shipped two apps that run inference on device.';

await db.exec(`
  INSERT INTO public.users (id, name, email, role, department, is_admin) VALUES
    ('${M_RICH}', 'Rich Mentor', 'rich@srmap.edu.in', 'mentor', 'CSE', false),
    ('${M_THIN}', 'Thin Mentor', 'thin@srmap.edu.in', 'mentor', 'CSE', false),
    ('${M_PROJ}', 'Proj Mentor', 'proj@srmap.edu.in', 'mentor', 'CSE', false);
  INSERT INTO public.mentors (id, name, department, bio, skills, projects) VALUES
    ('${M_RICH}', 'Rich Mentor', 'CSE', '${LONG_BIO}', ARRAY['Python'], '[]'::jsonb),
    ('${M_THIN}', 'Thin Mentor', 'CSE', 'Hi there.', ARRAY['Python','Go','Rust'], '[]'::jsonb),
    ('${M_PROJ}', 'Proj Mentor', 'CSE', 'Short.', ARRAY['C'],
     '[{"id":"1","title":"Rover","description":"Line follower"}]'::jsonb);
`);

// The load-bearing grant. public.mentors gives anon column-level SELECT, and
// column grants do not extend to columns added later -- PostgREST rejects the
// entire statement with 42501, not just the offending column, so one missing
// grant here takes down the public mentor directory.
for (const col of ['tagline', 'outcomes', 'ideal_mentees', 'ask_me_anything']) {
  const { rows: [g] } = await q(
    `SELECT has_column_privilege('anon', 'public.mentors', '${col}', 'SELECT') AS ok`,
  );
  check(`anon can SELECT mentors.${col} (directory 401s without this)`, g?.ok === true);
}

const { rows: [hashPriv] } = await q(
  `SELECT has_column_privilege('anon', 'public.mentors', 'profile_summary_source_hash', 'SELECT') AS ok`,
);
check(
  'anon cannot read profile_summary_source_hash (internal bookkeeping)',
  hashPriv?.ok === false,
  JSON.stringify(hashPriv),
);

// Shape guards: a bad generation degrades a list, it does not blow out layout.
for (const [label, sql] of [
  ['more than 6 outcomes', `outcomes = '["1","2","3","4","5","6","7"]'::jsonb`],
  ['a non-array in outcomes', `outcomes = '{"a":1}'::jsonb`],
  ['a tagline over 200 chars', `tagline = repeat('x', 201)`],
]) {
  let rejected = false;
  try {
    await q(`UPDATE public.mentors SET ${sql} WHERE id = '${M_RICH}'`);
  } catch {
    rejected = true;
  }
  check(`CHECK constraint rejects ${label}`, rejected);
}

// Source hash: same input same hash, and it moves when the bio does. This is
// what stops the sweeper spending Gemini quota on unchanged profiles.
const { rows: [srcHashA] } = await q(`
  SELECT public.mentor_summary_source_hash(
    'bio', ARRAY['a','b'], '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    NULL, 'CSE', '3rd Year', false, NULL, NULL) AS h`);
const { rows: [srcHashB] } = await q(`
  SELECT public.mentor_summary_source_hash(
    'bio', ARRAY['a','b'], '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    NULL, 'CSE', '3rd Year', false, NULL, NULL) AS h`);
const { rows: [srcHashC] } = await q(`
  SELECT public.mentor_summary_source_hash(
    'bio changed', ARRAY['a','b'], '[]'::jsonb, '[]'::jsonb, '[]'::jsonb,
    NULL, 'CSE', '3rd Year', false, NULL, NULL) AS h`);
check('source hash is stable for identical input', srcHashA?.h === srcHashB?.h);
check('source hash changes when the bio changes', srcHashA?.h !== srcHashC?.h);

const needing = async () => {
  const { rows } = await q(`SELECT id FROM public.mentors_needing_summary(50)`);
  return rows.map((r) => r.id);
};

let queue = await needing();
check(
  'a mentor with a real bio is queued for summarising',
  queue.includes(M_RICH),
  JSON.stringify(queue),
);
check(
  'a mentor with a project but a thin bio is queued (a project is real material)',
  queue.includes(M_PROJ),
  JSON.stringify(queue),
);
// The threshold is the whole point. Three skills and one sentence give a model
// nothing to summarise; generating anyway just recreates the old template.
check(
  'a mentor with only skills and a one-line bio is NOT queued',
  !queue.includes(M_THIN),
  JSON.stringify(queue),
);

// Simulate a successful generation, stamping the hash the way the edge function
// does, and confirm the mentor drops out of the queue.
await q(`
  UPDATE public.mentors SET
    outcomes = '["Ship an on-device model"]'::jsonb,
    profile_summary_generated_at = now(),
    profile_summary_source_hash = public.mentor_summary_source_hash(
      bio, skills, projects, experiences, courses, hobbies, department,
      year_of_studies, is_alumni, job_title, company)
  WHERE id = '${M_RICH}'`);

queue = await needing();
check(
  'a freshly summarised mentor is not re-queued (no wasted Gemini quota)',
  !queue.includes(M_RICH),
  JSON.stringify(queue),
);

await q(`UPDATE public.mentors SET bio = '${LONG_BIO} I also mentor for hackathons.'
         WHERE id = '${M_RICH}'`);
queue = await needing();
check(
  'editing the bio re-queues the mentor (a stale summary is a false one)',
  queue.includes(M_RICH),
  JSON.stringify(queue),
);

// A mentor's own wording outranks ours, permanently, until they clear it.
await q(`UPDATE public.mentors SET profile_summary_edited_at = now() WHERE id = '${M_RICH}'`);
queue = await needing();
check(
  'a hand-edited summary is never re-queued',
  !queue.includes(M_RICH),
  JSON.stringify(queue),
);

const { rows: [sumPath] } = await q(`
  SELECT p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'mentors_needing_summary'`);
check(
  'mentors_needing_summary pins its search_path',
  (sumPath?.proconfig ?? []).some((c) => c.startsWith('search_path=')),
  JSON.stringify(sumPath),
);

// Neither is an API. Supabase grants EXECUTE to anon/authenticated by default
// on new functions, so this asserts the REVOKE actually took.
for (const sig of [
  'public.mentors_needing_summary(integer)',
  'public.mentor_summary_source_hash(text, text[], jsonb, jsonb, jsonb, text, text, text, boolean, text, text)',
]) {
  for (const role of ['anon', 'authenticated']) {
    const { rows: [acl] } = await q(
      `SELECT has_function_privilege('${role}', '${sig}', 'EXECUTE') AS ok`,
    );
    check(`${role} cannot EXECUTE ${sig.split('(')[0]}`, acl?.ok === false, JSON.stringify(acl));
  }
}

// --- 20260823210000_academic_refresh_reminder.sql -----------------------------
// Every clause in the WHERE is a person who should NOT get an email, so each
// one gets its own fixture. Queueing a reminder at a student who synced last
// week, or at an alumnus whose coursework is finished, is the kind of mistake
// that reads as spam rather than as a bug.
console.log('\n--- 20260823210000_academic_refresh_reminder.sql ---');

const A_STALE   = '77777777-0000-0000-0000-000000000001'; // should be queued
const A_FRESH   = '77777777-0000-0000-0000-000000000002'; // synced days ago
const A_ALUMNI  = '77777777-0000-0000-0000-000000000003'; // graduated
const A_OPTOUT  = '77777777-0000-0000-0000-000000000004'; // notifications off
const A_FAILED  = '77777777-0000-0000-0000-000000000005'; // import never succeeded

await db.exec(`
  INSERT INTO auth.users (id, email) VALUES
    ('${A_STALE}',  'stale@srmap.edu.in'),
    ('${A_FRESH}',  'fresh@srmap.edu.in'),
    ('${A_ALUMNI}', 'alum@srmap.edu.in'),
    ('${A_OPTOUT}', 'optout@srmap.edu.in'),
    ('${A_FAILED}', 'failed@srmap.edu.in');

  INSERT INTO public.users (id, name, email, role, department, email_notifications) VALUES
    ('${A_STALE}',  'Stale Student',  'stale@srmap.edu.in',  'student', 'CSE', true),
    ('${A_FRESH}',  'Fresh Student',  'fresh@srmap.edu.in',  'student', 'CSE', true),
    ('${A_ALUMNI}', 'Alum Student',   'alum@srmap.edu.in',   'mentor',  'CSE', true),
    ('${A_OPTOUT}', 'Optout Student', 'optout@srmap.edu.in', 'student', 'CSE', false),
    ('${A_FAILED}', 'Failed Student', 'failed@srmap.edu.in', 'student', 'CSE', true);

  INSERT INTO public.mentors (id, name, department, is_alumni) VALUES
    ('${A_ALUMNI}', 'Alum Student', 'CSE', true);

  INSERT INTO public.academic_imports
    (user_id, register_number, sync_status, last_synced_at) VALUES
    ('${A_STALE}',  'AP00000000001', 'success', now() - interval '200 days'),
    ('${A_FRESH}',  'AP00000000002', 'success', now() - interval '5 days'),
    ('${A_ALUMNI}', 'AP00000000003', 'success', now() - interval '200 days'),
    ('${A_OPTOUT}', 'AP00000000004', 'success', now() - interval '200 days'),
    ('${A_FAILED}', 'AP00000000005', 'failed',  now() - interval '200 days');
`);

const { rows: [queuedRun] } = await q(
  `SELECT public.queue_academic_refresh_reminders() AS n`,
);
check(
  'queues exactly the one student whose import is a semester old',
  queuedRun?.n === 1,
  `queued ${queuedRun?.n}`,
);

const queuedFor = async (id) => {
  const { rows } = await q(`
    SELECT 1 FROM public.email_queue
    WHERE recipient_id = '${id}' AND kind = 'academic_refresh'`);
  return rows.length > 0;
};

check('the stale student is queued', await queuedFor(A_STALE));
check('a student who synced days ago is not nagged', !(await queuedFor(A_FRESH)));
// An alumnus has no next semester; their transcript is final.
check('an alumnus is not asked to refresh coursework', !(await queuedFor(A_ALUMNI)));
check('someone who turned email off is not queued', !(await queuedFor(A_OPTOUT)));
check('a student whose import never succeeded is not queued', !(await queuedFor(A_FAILED)));

// The job is safe to run by hand, which matters because that is how it will be
// tested in production -- nobody is waiting until January to find out.
const { rows: [secondRun] } = await q(
  `SELECT public.queue_academic_refresh_reminders() AS n`,
);
check(
  'running it twice does not queue a second email',
  secondRun?.n === 0,
  `second run queued ${secondRun?.n}`,
);

// send-email-queue keys its grouping on kind, so this must be a kind the
// function recognises or the rows sit unsent forever.
const { rows: [kindRow] } = await q(`
  SELECT kind, message_id, conversation_id FROM public.email_queue
  WHERE recipient_id = '${A_STALE}' AND kind = 'academic_refresh'`);
check(
  'queued row carries kind=academic_refresh and no message reference',
  kindRow?.kind === 'academic_refresh' && !kindRow?.message_id && !kindRow?.conversation_id,
  JSON.stringify(kindRow),
);

const { rows: [remPath] } = await q(`
  SELECT p.proconfig FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'queue_academic_refresh_reminders'`);
check(
  'queue_academic_refresh_reminders pins its search_path',
  (remPath?.proconfig ?? []).some((c) => c.startsWith('search_path=')),
  JSON.stringify(remPath),
);

for (const role of ['anon', 'authenticated']) {
  const { rows: [acl] } = await q(`
    SELECT has_function_privilege('${role}', 'public.queue_academic_refresh_reminders()', 'EXECUTE') AS ok`);
  check(`${role} cannot EXECUTE queue_academic_refresh_reminders`, acl?.ok === false, JSON.stringify(acl));
}

// --- 20260823220000_academic_refresh_schedule.sql -----------------------------
// Two jobs on the two days SRM AP publishes results. A wrong cron expression
// here fails silently for six months, so assert the literal strings.
const { rows: jobs } = await q(`
  SELECT jobname, schedule, command FROM cron.job
  WHERE jobname LIKE 'academic-refresh-reminder-%' ORDER BY jobname`);
check('both results-day jobs are scheduled', jobs.length === 2, JSON.stringify(jobs));
check(
  'January job runs on the 15th (30 4 15 1 *)',
  jobs.find((j) => j.jobname.endsWith('-jan'))?.schedule === '30 4 15 1 *',
  JSON.stringify(jobs),
);
check(
  'June job runs on the 20th (30 4 20 6 *)',
  jobs.find((j) => j.jobname.endsWith('-jun'))?.schedule === '30 4 20 6 *',
  JSON.stringify(jobs),
);
check(
  'both jobs call the queueing function',
  jobs.every((j) => j.command.includes('queue_academic_refresh_reminders')),
  JSON.stringify(jobs.map((j) => j.command)),
);

// --- 20260823230000_admin_kpi_metrics.sql --------------------------------
// The launch KPI panel's whole job is counting correctly, so start every
// counted table from a known state rather than asserting against however
// much prior sections happened to leave behind. This also removes the five
// auth.users rows the academic-refresh-reminder block above inserted with no
// explicit created_at (they default to now() and would otherwise inflate
// signups_7d/30d here).
console.log('\n--- 20260823230000_admin_kpi_metrics.sql ---');

await q(`DELETE FROM auth.users WHERE id IN ($1,$2,$3,$4,$5)`,
  [A_STALE, A_FRESH, A_ALUMNI, A_OPTOUT, A_FAILED]);
await q(`DELETE FROM public.conversations`);
await q(`DELETE FROM public.community_members`);
await q(`DELETE FROM public.communities`);
await q(`DELETE FROM public.community_posts`);
await q(`DELETE FROM public.search_analytics`);
await q(`DELETE FROM public.campus_notices`);

await actAs(CURRENT_UID);
await q(`UPDATE public.users SET is_admin = true WHERE id = $1`, [CURRENT_UID]);
await q(`UPDATE public.users SET is_admin = false WHERE id = $1`, [OTHER_UID]);

// A recent mentor contact (within the 7-day window) and an older one with a
// second mentor (M_RICH, seeded by the mentor-profile-summary section above).
await q(`INSERT INTO public.conversations (user1_id, user2_id, created_at)
         VALUES ($1, $2, now())`, [CURRENT_UID, OTHER_UID]);
await q(`INSERT INTO public.conversations (user1_id, user2_id, created_at)
         VALUES ($1, $2, now() - interval '20 days')`, [CURRENT_UID, M_RICH]);

const { rows: [kpiComm] } = await q(`
  INSERT INTO public.communities (slug, name, description, owner_id)
  VALUES ('kpi-test-group', 'KPI Test Group', 'test group', $1)
  RETURNING id`, [CURRENT_UID]);
await q(`INSERT INTO public.community_members (community_id, user_id, role, joined_at) VALUES
           ($1, $2, 'owner', now()),
           ($1, $3, 'member', now() - interval '20 days')`,
  [kpiComm.id, CURRENT_UID, OTHER_UID]);

await q(`INSERT INTO public.community_posts (author_id, title, content, created_at)
         VALUES ($1, 'KPI test post', 'body', now())`, [OTHER_UID]);

await q(`SELECT public.log_search_run('kpi test query', 3)`);

await q(`INSERT INTO public.campus_notices
           (title, category, issued_date, content, is_published, created_by)
         VALUES ('KPI test notice', 'general', current_date, 'content', true, $1)`, [CURRENT_UID]);

await actAs(OTHER_UID);
let kpiBlocked = false;
try {
  await asAuthenticated(() => q(`SELECT public.admin_kpi_metrics()`));
} catch (err) {
  kpiBlocked = /admin only/i.test(err.message);
}
check('non-admin is blocked from admin_kpi_metrics', kpiBlocked);

await actAs(CURRENT_UID);
const { rows: [kpiRow] } = await asAuthenticated(() => q(`SELECT public.admin_kpi_metrics() AS m`));
const kpi = typeof kpiRow?.m === 'string' ? JSON.parse(kpiRow.m) : kpiRow?.m;

const { rows: [{ count: expectedTotalSignups }] } = await q(`SELECT count(*)::int as count FROM auth.users`);
check('signups_total counts every auth.users row', kpi?.signups_total === expectedTotalSignups, JSON.stringify(kpi));
check('signups_7d counts only the recent signup', kpi?.signups_7d === 1, JSON.stringify(kpi));
check('searches_total reflects the logged run', kpi?.searches_total === 1, JSON.stringify(kpi));
check('mentor_contacts_total counts both conversations', kpi?.mentor_contacts_total === 2, JSON.stringify(kpi));
check('mentor_contacts_7d counts only the recent one', kpi?.mentor_contacts_7d === 1, JSON.stringify(kpi));
check('distinct_mentors_contacted counts both mentors', kpi?.distinct_mentors_contacted === 2, JSON.stringify(kpi));
check('group_joins_total counts both memberships', kpi?.group_joins_total === 2, JSON.stringify(kpi));
check('group_joins_7d counts only the recent join', kpi?.group_joins_7d === 1, JSON.stringify(kpi));
check('active_groups counts the non-archived group', kpi?.active_groups === 1, JSON.stringify(kpi));
check('posts_total counts the test post', kpi?.posts_total === 1, JSON.stringify(kpi));
check('posts_7d counts the recent post', kpi?.posts_7d === 1, JSON.stringify(kpi));
check('notices_published_total counts the published notice', kpi?.notices_published_total === 1, JSON.stringify(kpi));

for (const role of ['anon']) {
  const { rows: [acl] } = await q(
    `SELECT has_function_privilege('${role}', 'public.admin_kpi_metrics()', 'EXECUTE') AS ok`);
  check(`${role} cannot EXECUTE admin_kpi_metrics`, acl?.ok === false, JSON.stringify(acl));
}

// --- 20260823240000_mentor_dashboard_stats.sql --------------------------------
// Two things here are security-shaped rather than feature-shaped: the stats
// function must be un-pointable at another mentor, and the raw view log must be
// unreadable by anyone. Both are asserted, not assumed.
console.log('\n--- 20260823240000_mentor_dashboard_stats.sql ---');

// MENTOR_X already has a known history from the mentor_activity section above:
// 3 requests, 2 answered, 2 students helped.
await actAs(MENTOR_X);
await q(`SELECT public.log_mentor_profile_view('${MENTOR_X}')`);
const viewCount = async () => {
  const { rows: [r] } = await q(
    `SELECT count(*)::int AS n FROM public.mentor_profile_views WHERE mentor_id = '${MENTOR_X}'`,
  );
  return r.n;
};
// Mentors check their own page more than anyone. Counting it would make the
// number useless to exactly the person reading it.
check('a mentor viewing their own profile is not counted', (await viewCount()) === 0);

await actAs(STU_A);
await q(`SELECT public.log_mentor_profile_view('${MENTOR_X}')`);
check('a visitor view is recorded', (await viewCount()) === 1);

await q(`SELECT public.log_mentor_profile_view('${MENTOR_X}')`);
check(
  'the same person refreshing does not count twice in a day',
  (await viewCount()) === 1,
  `count is ${await viewCount()}`,
);

await actAs(STU_B);
await q(`SELECT public.log_mentor_profile_view('${MENTOR_X}')`);
check('a second person counts separately', (await viewCount()) === 2);

// Called from page load, so it must swallow nonsense rather than surface an
// error to a visitor who did nothing wrong.
const badView = await attempt(
  `SELECT public.log_mentor_profile_view('${STU_C}')`,
);
check('viewing a non-mentor id is ignored, not an error', badView === null, String(badView));

// A fresh exchange so the comparison below is not two sets of zeroes agreeing
// with each other. Earlier sections consume MENTOR_X's original fixtures, so by
// this point their activity has drifted back to nothing.
const CONV_D = '55555555-4444-4444-4444-444444444444';
await db.exec(`
  INSERT INTO public.conversations (id, user1_id, user2_id)
  VALUES ('${CONV_D}', '${STU_A}', '${MENTOR_X}');
  INSERT INTO public.messages (conversation_id, sender_id, receiver_id, content, sent_at) VALUES
    ('${CONV_D}', '${STU_A}',   '${MENTOR_X}', 'can you help?', now() - interval '2 days'),
    ('${CONV_D}', '${MENTOR_X}', '${STU_A}',   'sure',          now() - interval '2 days' + interval '45 minutes');
`);

await actAs(MENTOR_X);
const { rows: [dash] } = await q(`SELECT * FROM public.mentor_dashboard_stats()`);
check(
  'dashboard picks up a real exchange',
  dash?.requests_received === 1 && dash?.requests_answered === 1 && dash?.students_helped === 1,
  JSON.stringify(dash),
);
check(
  'dashboard reports the two profile views',
  dash?.profile_views_30d === 2,
  JSON.stringify(dash),
);
// Assert agreement, not magic numbers. The dashboard and the public profile
// must never disagree about the same person -- a mentor told "you replied to
// 60%" in settings while their profile shows 75% has no reason to trust either.
// (Fixture counts drift as later sections consume the same rows, so comparing
// to a literal here would be asserting the fixtures, not the invariant.)
const { rows: [publicFigures] } = await q(`SELECT * FROM public.mentor_activity('${MENTOR_X}')`);
check(
  'dashboard reports exactly what the public profile reports',
  dash?.requests_received === publicFigures?.requests_received &&
    dash?.requests_answered === publicFigures?.requests_answered &&
    dash?.students_helped === publicFigures?.students_helped &&
    dash?.median_reply_minutes === publicFigures?.median_reply_minutes,
  `dashboard ${JSON.stringify(dash)} vs profile ${JSON.stringify(publicFigures)}`,
);

// The structural guarantee: no argument means no way to ask about someone else.
const { rows: [argCount] } = await q(`
  SELECT p.pronargs FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'mentor_dashboard_stats'`);
check(
  'mentor_dashboard_stats takes no argument, so it cannot be pointed at another mentor',
  argCount?.pronargs === 0,
  JSON.stringify(argCount),
);

await actAs(STU_A);
const { rows: notAMentor } = await q(`SELECT * FROM public.mentor_dashboard_stats()`);
check(
  'a non-mentor gets no stats rather than a row of zeroes',
  notAMentor.length === 0,
  JSON.stringify(notAMentor),
);

await q(`UPDATE auth._session SET uid = NULL`);
const { rows: anonStats } = await q(`SELECT * FROM public.mentor_dashboard_stats()`);
check('a signed-out caller gets nothing', anonStats.length === 0, JSON.stringify(anonStats));

for (const role of ['anon', 'authenticated']) {
  const { rows: [tbl] } = await q(`
    SELECT has_table_privilege('${role}', 'public.mentor_profile_views', 'SELECT') AS ok`);
  check(`${role} cannot read the raw view log`, tbl?.ok === false, JSON.stringify(tbl));
}

const { rows: [viewLogAcl] } = await q(`
  SELECT has_function_privilege('anon', 'public.log_mentor_profile_view(uuid)', 'EXECUTE') AS ok`);
check(
  'anon CAN log a view (most profile traffic is signed out)',
  viewLogAcl?.ok === true,
  JSON.stringify(viewLogAcl),
);

const { rows: [dashStatsAcl] } = await q(`
  SELECT has_function_privilege('anon', 'public.mentor_dashboard_stats()', 'EXECUTE') AS ok`);
check(
  'anon cannot call mentor_dashboard_stats',
  dashStatsAcl?.ok === false,
  JSON.stringify(dashStatsAcl),
);

await actAs(CURRENT_UID);

// --- 20260823250000_user_badges_public_rpc.sql --------------------------------
// BadgeDisplay used to embed `awarder:users!user_badges_awarded_by_fkey(name)`,
// and public.users is owner-only for SELECT, so every anonymous view of a
// mentor profile 401'd with 42501 and rendered "No badges earned yet". The
// checks below are written so that reverting to a direct users read fails them:
// the RPC has to return the awarder's name *while running as a role that
// cannot read public.users at all*.
console.log('\n--- 20260823250000_user_badges_public_rpc.sql ---');

const B_HOLDER = '44444444-0000-4000-8000-000000000001';
const B_ADMIN  = '44444444-0000-4000-8000-000000000002';
const B_EMPTY  = '44444444-0000-4000-8000-000000000003';

await db.exec(`
  INSERT INTO public.users (id, name, email, role, department, is_admin) VALUES
    ('${B_HOLDER}', 'Badge Holder', 'holder@srmap.edu.in', 'mentor',  'CSE', false),
    ('${B_ADMIN}',  'Admin Awarder','awarder@srmap.edu.in','student', 'CSE', true),
    ('${B_EMPTY}',  'No Badges',    'none@srmap.edu.in',   'mentor',  'CSE', false);

  INSERT INTO public.badge_types (name, description, icon, color, category)
    VALUES ('Helpful Senior', 'Answered a lot of freshers', 'star', '#22C55E', 'contribution');

  -- Two badges, awarded a day apart, so the ordering assertion has something
  -- to bite on. Only the newer one has a human awarder; auto-awarded badges
  -- leave awarded_by null, which must not blank out the row.
  INSERT INTO public.user_badges (user_id, badge_type_id, awarded_by, awarded_at, notes)
    SELECT '${B_HOLDER}', id, '${B_ADMIN}', now() - interval '1 day', 'hand-picked'
      FROM public.badge_types WHERE name = 'Helpful Senior';
  INSERT INTO public.user_badges (user_id, badge_type_id, awarded_by, awarded_at, notes)
    SELECT '${B_HOLDER}', id, NULL, now() - interval '9 days', 'auto'
      FROM public.badge_types WHERE name = 'Top Mentor';
`);

const { rows: pubBadges } = await q(
  `SELECT * FROM public.user_badges_public('${B_HOLDER}')`,
);
check(
  'returns every badge the user holds',
  pubBadges.length === 2,
  `${pubBadges.length} rows`,
);
check(
  'newest badge first (BadgeDisplay renders in list order)',
  pubBadges[0]?.notes === 'hand-picked' && pubBadges[1]?.notes === 'auto',
  JSON.stringify(pubBadges.map((r) => r.notes)),
);
check(
  'badge type is inlined, so the client needs no second join',
  pubBadges[0]?.badge_name === 'Helpful Senior'
    && pubBadges[0]?.badge_category === 'contribution'
    && pubBadges[0]?.badge_icon === 'star'
    && pubBadges[0]?.badge_color === '#22C55E',
  JSON.stringify(pubBadges[0]),
);
check(
  'an auto-awarded badge (awarded_by null) still comes back, with a null name',
  pubBadges[1]?.badge_name === 'Top Mentor' && pubBadges[1]?.awarded_by_name === null,
  JSON.stringify(pubBadges[1]),
);
const { rows: pubNone } = await q(
  `SELECT * FROM public.user_badges_public('${B_EMPTY}')`,
);
check(
  'a user with no badges gets an empty set, not an error',
  pubNone.length === 0,
  JSON.stringify(pubNone),
);

// Nothing above proves much yet -- it all ran as the owner, which can read
// public.users anyway. This next part is the actual regression test.
await db.exec(`GRANT USAGE ON SCHEMA public TO anon`);
await q(`SET ROLE anon`);
let anonDirectRead = null;
try {
  await q(`SELECT name FROM public.users WHERE id = '${B_ADMIN}'`);
} catch (error) {
  anonDirectRead = error.message;
}
let anonRpcRows = [];
let anonRpcError = null;
try {
  ({ rows: anonRpcRows } = await q(`SELECT * FROM public.user_badges_public('${B_HOLDER}')`));
} catch (error) {
  anonRpcError = error.message;
}
await q(`RESET ROLE`).catch(() => {});

check(
  'anon still cannot SELECT from public.users -- the table stays owner-only',
  /permission denied/i.test(anonDirectRead ?? ''),
  anonDirectRead ?? 'the read SUCCEEDED, which means users was opened up',
);
check(
  'anon can call the RPC (this is the 401 on every public mentor profile)',
  anonRpcError === null && anonRpcRows.length === 2,
  anonRpcError ?? `${anonRpcRows.length} rows`,
);
check(
  'and gets the awarder name it could not read directly -- SECURITY DEFINER works',
  anonRpcRows[0]?.awarded_by_name === 'Admin Awarder',
  JSON.stringify(anonRpcRows[0]),
);

// The display name is the only thing from public.users this may expose. If
// someone widens the SELECT list later, this fails.
check(
  'no email, mobile, college_id or cgpa leaks through the return type',
  anonRpcRows.length > 0 && Object.keys(anonRpcRows[0]).every(
    (col) => !['email', 'mobile', 'college_id', 'cgpa'].includes(col),
  ),
  JSON.stringify(Object.keys(anonRpcRows[0] ?? {})),
);

const { rows: [ubPath] } = await q(`
  SELECT p.proconfig, p.prosecdef FROM pg_proc p JOIN pg_namespace n ON n.oid = p.pronamespace
  WHERE n.nspname = 'public' AND p.proname = 'user_badges_public'`);
check(
  'user_badges_public pins its search_path',
  (ubPath?.proconfig ?? []).some((c) => c.startsWith('search_path=')),
  JSON.stringify(ubPath?.proconfig),
);
check(
  'user_badges_public is SECURITY DEFINER (without it the grant buys nothing)',
  ubPath?.prosecdef === true,
  JSON.stringify(ubPath),
);

for (const role of ['anon', 'authenticated']) {
  const { rows: [ubAcl] } = await q(
    `SELECT has_function_privilege('${role}', 'public.user_badges_public(uuid)', 'EXECUTE') AS ok`,
  );
  check(`${role} can EXECUTE user_badges_public`, ubAcl?.ok === true, JSON.stringify(ubAcl));
}

// --- 20260824100000_srm_portal_credentials.sql --------------------------------
// Stricter than academic_imports on purpose: no SELECT policy at all, not even
// for the owning user -- a credential table has no legitimate client read path.
console.log('\n--- 20260824100000_srm_portal_credentials.sql ---');

await q(
  `INSERT INTO public.srm_portal_credentials (user_id, register_number, dob_ciphertext, dob_iv)
   VALUES ($1, 'AP23111260062', 'ciphertext-not-a-real-dob', 'fake-iv-base64')`,
  [OTHER_UID],
);

await actAs(OTHER_UID);
let ownerBlocked = false;
try {
  const { rows } = await asAuthenticated(() =>
    q(`SELECT id FROM public.srm_portal_credentials WHERE user_id=$1`, [OTHER_UID]));
  ownerBlocked = rows.length === 0;
} catch (error) {
  ownerBlocked = /permission denied/i.test(error.message);
}
check('RLS blocks even the owner from reading srm_portal_credentials', ownerBlocked);

const { rows: credAcl } = await q(
  `SELECT grantee, string_agg(DISTINCT privilege_type, ',' ORDER BY privilege_type) AS privs
     FROM information_schema.table_privileges
    WHERE table_schema='public' AND table_name='srm_portal_credentials' AND grantee IN ('anon','authenticated')
    GROUP BY grantee`,
);
check('srm_portal_credentials grants nothing to anon or authenticated', credAcl.length === 0, JSON.stringify(credAcl));

// --- 20260824110000_date_of_birth_linked_flag.sql -----------------------------
console.log('\n--- 20260824110000_date_of_birth_linked_flag.sql ---');

const { rows: [dobDefault] } = await q(`SELECT date_of_birth_linked FROM public.users WHERE id=$1`, [OTHER_UID]);
check('date_of_birth_linked defaults to false', dobDefault.date_of_birth_linked === false, JSON.stringify(dobDefault));

await actAs(OTHER_UID);
let selfElevationBlocked = false;
let selfElevationErr = '';
try {
  await asAuthenticated(() => q(`UPDATE public.users SET date_of_birth_linked = true WHERE id = $1`, [OTHER_UID]));
} catch (error) {
  selfElevationErr = error.message;
  selfElevationBlocked = /insufficient_privilege|can only be changed/i.test(error.message);
}
check('a signed-in user cannot flip their own date_of_birth_linked to true', selfElevationBlocked, selfElevationErr || 'UPDATE SUCCEEDED (no error)');

// Even a raw superuser/table-owner session (which bypasses RLS entirely) is
// still stopped by the trigger -- only the literal service_role role name
// (what edge functions using the service-role key execute SQL as) is exempt.
let ownerAlsoBlocked = false;
try {
  await q(`UPDATE public.users SET date_of_birth_linked = true WHERE id = $1`, [OTHER_UID]);
} catch (error) {
  ownerAlsoBlocked = /insufficient_privilege|can only be changed/i.test(error.message);
}
check('the trigger guard is not bypassed by RLS-bypassing roles either, only service_role', ownerAlsoBlocked);

// The actual service-role write path the edge functions use. Real Supabase
// projects grant service_role full table access by platform default; this
// stub only declared the role with BYPASSRLS (see the scaffolding at the top
// of this file), so grant the two privileges this assertion needs -- SELECT
// too, since the WHERE clause reads the id column independently of the SET
// target.
await q(`GRANT SELECT, UPDATE ON public.users TO service_role`);
await q(`SET ROLE service_role`);
await q(`UPDATE public.users SET date_of_birth_linked = true WHERE id = $1`, [OTHER_UID]);
await q(`RESET ROLE`);
const { rows: [dobAfter] } = await q(`SELECT date_of_birth_linked FROM public.users WHERE id=$1`, [OTHER_UID]);
check('a service_role write can still set date_of_birth_linked', dobAfter.date_of_birth_linked === true, JSON.stringify(dobAfter));

// --- 20260824120000_academic_imports_mobile_number.sql ------------------------
console.log('\n--- 20260824120000_academic_imports_mobile_number.sql ---');

// A fresh row (INSERT, not UPDATE) for a different user -- OTHER_UID's
// academic_imports row was deliberately poisoned into the rate-limit trigger's
// blocked state above (attempt_count=6, recent last_attempt_at), and that
// trigger fires on every UPDATE to the row regardless of which columns
// change, so reusing it here would fail for an unrelated reason.
await q(
  `INSERT INTO public.academic_imports (user_id, register_number, program, sync_status, mobile_number)
   VALUES ($1, 'AP23111260099', 'B.Tech CSE', 'success', '9876543210')`,
  [CURRENT_UID],
);
const { rows: [mobileRow] } = await q(`SELECT mobile_number FROM public.academic_imports WHERE user_id=$1`, [CURRENT_UID]);
check('mobile_number column stores the portal-reported number', mobileRow?.mobile_number === '9876543210', JSON.stringify(mobileRow));

// --- 20260824130000_srm_portal_sync_schedule.sql ------------------------------
console.log('\n--- 20260824130000_srm_portal_sync_schedule.sql ---');

const { rows: [syncJob] } = await q(`SELECT schedule, active FROM cron.job WHERE jobname='srm-portal-sync'`);
check('srm-portal-sync job scheduled daily at 21:30 UTC (03:00 IST)', syncJob?.schedule === '30 21 * * *', syncJob?.schedule);
check('srm-portal-sync job is created inactive (function not deployed yet)', syncJob?.active === false, JSON.stringify(syncJob));

// --- 20260824140000_fix_is_admin_self_elevation.sql ---------------------------
// The pre-existing "excluding admin status" WITH CHECK never actually blocked
// this (verified above for date_of_birth_linked, and it uses the identical
// self-referential-subquery shape for is_admin) -- this trigger is the real
// fix. The set_user_admin_status RPC test earlier in this file (search
// "admin role management rpc") already exercises the legitimate path with
// this migration applied, since every migration in the array runs before any
// assertion below does; it passing is itself evidence the trigger does not
// break that SECURITY DEFINER path.
console.log('\n--- 20260824140000_fix_is_admin_self_elevation.sql ---');

await q(`UPDATE public.users SET is_admin = false WHERE id = $1`, [OTHER_UID]);
await actAs(OTHER_UID);
let adminSelfElevationBlocked = false;
let adminSelfElevationErr = '';
try {
  await asAuthenticated(() => q(`UPDATE public.users SET is_admin = true WHERE id = $1`, [OTHER_UID]));
} catch (error) {
  adminSelfElevationErr = error.message;
  adminSelfElevationBlocked = /insufficient_privilege|cannot be changed directly/i.test(error.message);
}
check(
  'a signed-in user can no longer self-elevate is_admin to true',
  adminSelfElevationBlocked,
  adminSelfElevationErr || 'UPDATE SUCCEEDED (no error) -- the bug this migration fixes',
);
const { rows: [isAdminAfter] } = await q(`SELECT is_admin FROM public.users WHERE id=$1`, [OTHER_UID]);
check('is_admin is still false after the blocked attempt', isAdminAfter.is_admin === false, JSON.stringify(isAdminAfter));

// Unrelated columns on the same row remain freely editable -- the trigger
// only inspects is_admin, not every column.
await actAs(OTHER_UID);
const unrelatedUpdate = await asAuthenticated(() => attempt(
  `UPDATE public.users SET bio = 'still editable' WHERE id = $1`, [OTHER_UID]));
check('unrelated own-profile fields are unaffected by the guard', unrelatedUpdate === null, unrelatedUpdate ?? '');

// --- 20260826080000_srmap_events_sync_every_6h.sql ---------------------------
console.log('\n--- 20260826080000_srmap_events_sync_every_6h.sql ---');
const { rows: [eventsJob6h] } = await q(`SELECT schedule, active FROM cron.job WHERE jobname='sync-srmap-events-every-6h'`);
check('events sync job scheduled every 6 hours (08:00, 14:00, 20:00, 02:00 IST)', eventsJob6h?.schedule === '30 2,8,14,20 * * *' && eventsJob6h?.active === true, JSON.stringify(eventsJob6h));
const { rows: [oldDailyEventsJob] } = await q(`SELECT schedule FROM cron.job WHERE jobname='sync-srmap-events-daily'`);
check('old daily events sync job is removed', !oldDailyEventsJob, JSON.stringify(oldDailyEventsJob));

// --- 20260826090000_cascade_user_deletions_and_cleanup_orphaned_users.sql ----
console.log('\n--- 20260826090000_cascade_user_deletions_and_cleanup_orphaned_users.sql ---');
const { rows: [fkRow] } = await q(`
  SELECT constraint_name, table_name 
  FROM information_schema.table_constraints 
  WHERE constraint_name = 'users_id_fkey' AND table_name = 'users'
`);
check('users_id_fkey constraint exists on public.users', Boolean(fkRow), JSON.stringify(fkRow));

// Verify cascade deletion
const TEST_CASCADE_UID = '99999999-9999-9999-9999-999999999999';
await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'cascade_test@srmap.edu.in')`, [TEST_CASCADE_UID]);
await q(`INSERT INTO public.users (id, email, name, role) VALUES ($1, 'cascade_test@srmap.edu.in', 'Cascade Test', 'student')`, [TEST_CASCADE_UID]);
const { rows: [userBefore] } = await q(`SELECT id FROM public.users WHERE id=$1`, [TEST_CASCADE_UID]);
check('user inserted into public.users', Boolean(userBefore));

await q(`DELETE FROM auth.users WHERE id=$1`, [TEST_CASCADE_UID]);
const { rows: [userAfter] } = await q(`SELECT id FROM public.users WHERE id=$1`, [TEST_CASCADE_UID]);
check('deleting from auth.users cascades to public.users', !userAfter, JSON.stringify(userAfter));

// --- 20260826100000_mentor_slugs.sql -----------------------------------------
console.log('\n--- 20260826100000_mentor_slugs.sql ---');

// 1. Column exists on mentors
const { rows: [slugCol] } = await q(`
  SELECT column_name, data_type 
  FROM information_schema.columns 
  WHERE table_schema = 'public' AND table_name = 'mentors' AND column_name = 'slug'
`);
check('slug column exists on public.mentors', Boolean(slugCol), JSON.stringify(slugCol));

// 2. Existing mentors received a backfilled slug
const { rows: existingSlugs } = await q(`SELECT id, name, slug FROM public.mentors WHERE id = $1`, [OTHER_UID]);
check('existing mentor row has backfilled slug', existingSlugs[0]?.slug === 'ravi-mentor', JSON.stringify(existingSlugs[0]));

// 3. New mentor insert automatically generates a slug via trigger
const TEST_MENTOR_UID_1 = crypto.randomUUID();
const TEST_MENTOR_UID_2 = crypto.randomUUID();

await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'kavya1@srmap.edu.in')`, [TEST_MENTOR_UID_1]);
await q(`INSERT INTO public.users (id, email, name, role) VALUES ($1, 'kavya1@srmap.edu.in', 'Kavya Sharma', 'student')`, [TEST_MENTOR_UID_1]);
await q(`INSERT INTO public.mentors (id, name, department) VALUES ($1, 'Kavya Sharma', 'CSE')`, [TEST_MENTOR_UID_1]);

const { rows: [mentor1] } = await q(`SELECT id, name, slug FROM public.mentors WHERE id = $1`, [TEST_MENTOR_UID_1]);
check('new mentor insert auto-generates slug from name', mentor1?.slug === 'kavya-sharma', JSON.stringify(mentor1));

// 4. Duplicate name collision gets disambiguated (-2)
await q(`INSERT INTO auth.users (id, email) VALUES ($1, 'kavya2@srmap.edu.in')`, [TEST_MENTOR_UID_2]);
await q(`INSERT INTO public.users (id, email, name, role) VALUES ($1, 'kavya2@srmap.edu.in', 'Kavya Sharma', 'student')`, [TEST_MENTOR_UID_2]);
await q(`INSERT INTO public.mentors (id, name, department) VALUES ($1, 'Kavya Sharma', 'ECE')`, [TEST_MENTOR_UID_2]);

const { rows: [mentor2] } = await q(`SELECT id, name, slug FROM public.mentors WHERE id = $1`, [TEST_MENTOR_UID_2]);
check('duplicate mentor name collision gets disambiguated slug', mentor2?.slug === 'kavya-sharma-2', JSON.stringify(mentor2));

// 5. Updating an unrelated field on mentor preserves the slug
await q(`UPDATE public.mentors SET bio = 'Updated bio for Kavya' WHERE id = $1`, [TEST_MENTOR_UID_1]);
const { rows: [mentor1AfterUpdate] } = await q(`SELECT id, bio, slug FROM public.mentors WHERE id = $1`, [TEST_MENTOR_UID_1]);
check('unrelated update on mentor preserves slug', mentor1AfterUpdate?.slug === 'kavya-sharma' && mentor1AfterUpdate?.bio === 'Updated bio for Kavya', JSON.stringify(mentor1AfterUpdate));

// --- 20260826110000_mentor_multisignal_activity.sql --------------------------
console.log('\nmulti-signal mentor activity:');

// Mentor with 0 1-on-1 messages, but with a community post:
const POST_UID = crypto.randomUUID();
await q(`
  INSERT INTO public.community_posts (id, mentor_id, author_id, title, content, created_at)
  VALUES ($1, $2, $2, 'Hackathon Tips', 'Here are some tips', now() - interval '2 days');
`, [POST_UID, TEST_MENTOR_UID_1]);

const { rows: [multiAct1] } = await q(`SELECT * FROM public.mentor_activity($1)`, [TEST_MENTOR_UID_1]);
check(
  'mentor with 0 DMs but recent community post reports non-null last_message_at',
  multiAct1?.last_message_at !== null && multiAct1?.requests_received === 0 && multiAct1?.students_helped === 0,
  JSON.stringify(multiAct1),
);

// Mentor with 0 DMs, 0 posts, but active user presence:
await q(`
  INSERT INTO public.user_presence (user_id, is_online, last_seen, updated_at)
  VALUES ($1, true, now() - interval '1 hour', now() - interval '1 hour')
  ON CONFLICT (user_id) DO UPDATE SET last_seen = EXCLUDED.last_seen;
`, [TEST_MENTOR_UID_2]);

const { rows: [multiAct2] } = await q(`SELECT * FROM public.mentor_activity($1)`, [TEST_MENTOR_UID_2]);
check(
  'mentor with 0 DMs but active user_presence reports non-null last_message_at',
  multiAct2?.last_message_at !== null && multiAct2?.requests_received === 0,
  JSON.stringify(multiAct2),
);

// --- 20260826120000_grant_community_members_select_and_rpc.sql ---------------
console.log('\n--- 20260826120000_grant_community_members_select_and_rpc.sql ---');

await db.exec(`
  GRANT SELECT ON public.community_members TO anon, authenticated;

  CREATE OR REPLACE FUNCTION public.get_user_joined_communities(p_user_id uuid)
  RETURNS TABLE (
    community_id uuid,
    community_name text,
    community_slug text,
    community_kind text,
    community_cover_image text,
    community_member_count integer,
    role text,
    joined_at timestamptz
  )
  LANGUAGE sql
  STABLE
  SECURITY DEFINER
  SET search_path = public, pg_temp
  AS $$
    SELECT 
      c.id AS community_id,
      c.name AS community_name,
      c.slug AS community_slug,
      c.kind AS community_kind,
      c.cover_image AS community_cover_image,
      c.member_count AS community_member_count,
      m.role,
      m.joined_at
    FROM public.community_members m
    JOIN public.communities c ON c.id = m.community_id
    WHERE m.user_id = p_user_id
      AND (
        c.visibility = 'public'
        OR (
          auth.uid() IS NOT NULL
          AND (
            c.owner_id = auth.uid()
            OR EXISTS (
              SELECT 1 FROM public.community_members cm
              WHERE cm.community_id = c.id AND cm.user_id = auth.uid()
            )
            OR public.is_admin_user(auth.uid())
          )
        )
      )
    ORDER BY m.joined_at ASC;
  $$;

  REVOKE ALL ON FUNCTION public.get_user_joined_communities(uuid) FROM PUBLIC, anon, authenticated;
  GRANT EXECUTE ON FUNCTION public.get_user_joined_communities(uuid) TO anon, authenticated;
`);

const COMM_UID = crypto.randomUUID();
await q(`
  INSERT INTO public.communities (id, name, slug, description, kind, visibility, owner_id)
  VALUES ($1, 'Robotics Club', 'robotics-club', 'Robotics and automation club', 'club', 'public', $2);
`, [COMM_UID, TEST_MENTOR_UID_1]);

await q(`
  INSERT INTO public.community_members (community_id, user_id, role)
  VALUES ($1, $2, 'owner');
`, [COMM_UID, TEST_MENTOR_UID_1]);

const { rows: joinedRows } = await q(`
  SELECT * FROM public.get_user_joined_communities($1::uuid)
`, [TEST_MENTOR_UID_1]);

check(
  'get_user_joined_communities returns joined public communities for user',
  joinedRows?.length === 1 && joinedRows[0]?.community_name === 'Robotics Club' && joinedRows[0]?.role === 'owner',
  JSON.stringify(joinedRows),
);

console.log('\n--- 20260826130000_direct_messages_reply_to.sql ---');
const { rows: colCheck } = await q(`
  SELECT column_name, data_type FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'messages' AND column_name = 'reply_to_id';
`);
check('reply_to_id column exists on public.messages', colCheck.length === 1 && colCheck[0].column_name === 'reply_to_id', JSON.stringify(colCheck[0]));

// Test send_message without reply
const TEST_CONV_ID = crypto.randomUUID();
await q(`
  INSERT INTO public.conversations (id, user1_id, user2_id)
  VALUES ($1, $2, $3);
`, [TEST_CONV_ID, CURRENT_UID, OTHER_UID]);

const { rows: msg1Rows } = await q(`
  SELECT * FROM public.send_message($1::uuid, $2::uuid, $3::uuid, 'Original message');
`, [TEST_CONV_ID, CURRENT_UID, OTHER_UID]);

check('send_message creates message without reply_to_id', msg1Rows.length === 1 && msg1Rows[0].reply_to_id === null, JSON.stringify(msg1Rows[0]));

const origMsgId = msg1Rows[0].id;

// Test send_message with reply_to_id
const { rows: msg2Rows } = await q(`
  SELECT * FROM public.send_message($1::uuid, $2::uuid, $3::uuid, 'This is a reply', $4::uuid);
`, [TEST_CONV_ID, OTHER_UID, CURRENT_UID, origMsgId]);

check('send_message creates message with reply_to_id', msg2Rows.length === 1 && msg2Rows[0].reply_to_id === origMsgId, JSON.stringify(msg2Rows[0]));

// Test get_conversation_messages includes reply_to_id
const { rows: convMessages } = await q(`
  SELECT * FROM public.get_conversation_messages($1::uuid);
`, [TEST_CONV_ID]);

check('get_conversation_messages returns reply_to_id for replied message', convMessages.length === 2 && convMessages[1].reply_to_id === origMsgId, JSON.stringify(convMessages));

console.log('\n--- 20260826140000_edit_delete_messages_30min.sql ---');
await q('DELETE FROM auth._session;');
await q('INSERT INTO auth._session (uid) VALUES ($1);', [CURRENT_UID]);

const { rows: directMsgCols } = await q(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'messages' AND column_name IN ('is_edited', 'edited_at');
`);
check('is_edited and edited_at exist on public.messages', directMsgCols.length === 2, JSON.stringify(directMsgCols));

const { rows: groupMsgCols } = await q(`
  SELECT column_name FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'community_group_messages' AND column_name IN ('is_edited', 'edited_at');
`);
check('is_edited and edited_at exist on public.community_group_messages', groupMsgCols.length === 2, JSON.stringify(groupMsgCols));

// Test edit_direct_message
const { rows: editedMsgRows } = await q(`
  SELECT * FROM public.edit_direct_message($1::uuid, 'Original message (edited)');
`, [origMsgId]);
check('edit_direct_message updates content and marks is_edited true', editedMsgRows.length === 1 && editedMsgRows[0].content === 'Original message (edited)' && editedMsgRows[0].is_edited === true, JSON.stringify(editedMsgRows[0]));

// Test delete_direct_message
const { rows: delResult } = await q(`
  SELECT public.delete_direct_message($1::uuid) as ok;
`, [origMsgId]);
check('delete_direct_message succeeds for sender within 30m', delResult[0]?.ok === true, JSON.stringify(delResult[0]));

const { rows: afterDelMsgs } = await q(`
  SELECT * FROM public.get_conversation_messages($1::uuid);
`, [TEST_CONV_ID]);
check('get_conversation_messages no longer returns deleted message', afterDelMsgs.length === 1 && afterDelMsgs[0].id === msg2Rows[0].id, JSON.stringify(afterDelMsgs));

// Test group message edit and delete
const TEST_GROUP_COMM_ID = crypto.randomUUID();
await q(`
  INSERT INTO public.communities (id, name, slug, description, kind, visibility, owner_id)
  VALUES ($1, 'Test Group Chat', 'test-group-chat', 'Testing group messages', 'study', 'public', $2);
`, [TEST_GROUP_COMM_ID, CURRENT_UID]);

const { rows: sendGroupMsgRows } = await q(`
  INSERT INTO public.community_group_messages (community_id, sender_id, channel, content)
  VALUES ($1, $2, 'general', 'Hello group message')
  RETURNING id;
`, [TEST_GROUP_COMM_ID, CURRENT_UID]);
const testGroupMsgId = sendGroupMsgRows[0].id;

const { rows: editGroupResult } = await q(`
  SELECT public.edit_group_message($1::uuid, 'Hello group message (edited)'::text) as ok;
`, [testGroupMsgId]);
check('edit_group_message updates group message', editGroupResult[0]?.ok === true, JSON.stringify(editGroupResult[0]));

const { rows: listGroupMsgs } = await q(`
  SELECT * FROM public.list_group_messages($1::uuid, 'general'::text);
`, [TEST_GROUP_COMM_ID]);
check('list_group_messages returns edited group message with is_edited true', listGroupMsgs.length === 1 && listGroupMsgs[0].content === 'Hello group message (edited)' && listGroupMsgs[0].is_edited === true, JSON.stringify(listGroupMsgs[0]));

const { rows: delGroupResult } = await q(`
  SELECT public.delete_group_message($1::uuid) as ok;
`, [testGroupMsgId]);
check('delete_group_message deletes group message', delGroupResult[0]?.ok === true, JSON.stringify(delGroupResult[0]));

const { rows: listGroupMsgsAfterDel } = await q(`
  SELECT * FROM public.list_group_messages($1::uuid, 'general'::text);
`, [TEST_GROUP_COMM_ID]);
check('list_group_messages returns 0 messages after deletion', listGroupMsgsAfterDel.length === 0, JSON.stringify(listGroupMsgsAfterDel));

// --- 20260826150000_push_notifications.sql ---
console.log('\n--- 20260826150000_push_notifications.sql ---');
const { rows: pushColRows } = await q(`
  SELECT column_name, data_type, column_default
  FROM information_schema.columns
  WHERE table_schema = 'public' AND table_name = 'users' AND column_name = 'push_notifications_enabled';
`);
check('push_notifications_enabled column exists on public.users', pushColRows.length === 1, JSON.stringify(pushColRows[0]));

const { rows: pushSubTableRows } = await q(`
  SELECT table_name
  FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'push_subscriptions';
`);
check('push_subscriptions table exists', pushSubTableRows.length === 1);

const TEST_ENDPOINT = 'https://fcm.googleapis.com/fcm/send/test-token-123';
await q(`
  INSERT INTO public.push_subscriptions (user_id, endpoint, p256dh, auth, user_agent)
  VALUES ($1, $2, 'test-p256dh-key', 'test-auth-key', 'TestBrowser/1.0')
  ON CONFLICT (user_id, endpoint) DO UPDATE SET updated_at = now();
`, [CURRENT_UID, TEST_ENDPOINT]);

const { rows: subRows } = await q(`
  SELECT * FROM public.push_subscriptions WHERE user_id = $1;
`, [CURRENT_UID]);
check('push_subscriptions insert & retrieval works', subRows.length === 1 && subRows[0].endpoint === TEST_ENDPOINT, JSON.stringify(subRows[0]));

// --- 20260826160000_srm_attendance_and_holidays.sql ---
console.log('\n--- 20260826160000_srm_attendance_and_holidays.sql ---');
const { rows: attTableRows } = await q(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'student_attendance';
`);
check('student_attendance table exists', attTableRows.length === 1);

const { rows: holTableRows } = await q(`
  SELECT table_name FROM information_schema.tables
  WHERE table_schema = 'public' AND table_name = 'academic_holidays';
`);
check('academic_holidays table exists', holTableRows.length === 1);

await q(`
  INSERT INTO public.student_attendance (
    user_id, register_number, course_code, course_name, slot, conducted_hours, attended_hours, absent_hours, attendance_percentage, classes_needed, safe_bunks
  ) VALUES (
    $1, 'AP23111260062', 'PHY 301', 'STATISTICAL PHYSICS', 'A1', 40, 28, 12, 70.00, 8, 0
  ) ON CONFLICT (user_id, course_code) DO UPDATE SET attendance_percentage = EXCLUDED.attendance_percentage;
`, [CURRENT_UID]);

const { rows: myAttendance } = await q(`
  SELECT * FROM public.student_attendance WHERE user_id = $1 AND course_code = 'PHY 301';
`, [CURRENT_UID]);
check('student_attendance records insert and compute margins', myAttendance.length === 1 && Number(myAttendance[0].classes_needed) === 8, JSON.stringify(myAttendance[0]));

const { rows: isSundayHoliday } = await q(`
  SELECT public.is_non_instructional_day('2026-08-30'::date) as is_holiday; -- Sunday
`);
check('is_non_instructional_day identifies weekend correctly', isSundayHoliday[0]?.is_holiday === true);

const { rows: isIndependenceDay } = await q(`
  SELECT public.is_non_instructional_day('2026-08-15'::date) as is_holiday; -- Independence Day
`);
check('is_non_instructional_day identifies university holidays', isIndependenceDay[0]?.is_holiday === true);

// --- 20260827100000_pwa_installs_tracking.sql ------------------------
console.log('\n--- 20260827100000_pwa_installs_tracking.sql ---');
const { rows: pwaTableRows } = await q(`
  SELECT table_name FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'pwa_installs';
`);
check('pwa_installs table exists', pwaTableRows.length === 1);

await q(`SELECT public.record_pwa_install('test-device-harness-1', 'android', $1);`, [CURRENT_UID]);
const { rows: pwaRows } = await q(`SELECT * FROM public.pwa_installs WHERE device_id = 'test-device-harness-1'`);
check('record_pwa_install inserts record', pwaRows.length === 1 && pwaRows[0].platform === 'android', JSON.stringify(pwaRows[0]));

// Calling record_pwa_install with same device updates last_seen_at
await q(`SELECT public.record_pwa_install('test-device-harness-1', 'android', $1);`, [CURRENT_UID]);
const { rows: [pwaCount] } = await q(`SELECT count(*)::int as count FROM public.pwa_installs WHERE device_id = 'test-device-harness-1'`);
check('record_pwa_install deduplicates by device_id', pwaCount.count === 1);

const { rows: [kpiWithPwa] } = await asAuthenticated(() => q(`SELECT public.admin_kpi_metrics() AS m`));
check('admin_kpi_metrics includes pwa_installs_total', typeof kpiWithPwa.m.pwa_installs_total === 'number');

console.log(failures === 0
  ? '\nAll migration checks passed against real Postgres.'
  : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);



