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
  );
  CREATE TABLE public.mentors (
    id uuid PRIMARY KEY REFERENCES public.users(id),
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
    review_count integer
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

  -- Groups, as of 20260731090000 + 20260731130000, trimmed to the columns the
  -- channels migration actually touches.
  CREATE TABLE public.communities (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    slug TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    description TEXT NOT NULL,
    kind TEXT NOT NULL DEFAULT 'general',
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
  -- auth.users: only needed as an FK target (email_queue.recipient_id).
  CREATE TABLE auth.users (id uuid PRIMARY KEY, email text, raw_user_meta_data jsonb);
  INSERT INTO auth.users (id, email) VALUES
    ('${CURRENT_UID}', 'asha@srmap.edu.in'),
    ('${OTHER_UID}', 'ravi@srmap.edu.in');

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

  -- storage.objects: platform-provided by Supabase Storage, not by any
  -- migration. Only stubbed for the bucket policies 20260804132345 adds.
  CREATE SCHEMA storage;
  CREATE TABLE storage.objects (
    id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
    bucket_id text, name text, owner uuid, created_at timestamptz DEFAULT now()
  );

  -- cron / net: pg_cron and pg_net are pre-installed on every Supabase
  -- project but PGlite ships neither. Stubbed so the four "schedule this on
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
// SKIPPED (61 of the 89 files in supabase/migrations/, not executed above).
// Every migration in the repo falls into exactly one of these five groups.
// None of them are silently missing -- each is listed below with why.
//
// 1. PGVECTOR (5 files) -- genuinely cannot run in PGlite.
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
// 5. COMMUNITIES / PRIVATE-COMMUNITIES CLUSTER (12 files) -- the schema this
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
//
// 6. OUT OF SCOPE FOR THIS PASS (9 files) -- self-contained, plausibly
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
const { rows: [eventsJob] } = await q(`SELECT schedule FROM cron.job WHERE jobname='sync-srmap-events-daily'`);
check('events sync job scheduled daily at 20:30 UTC (02:00 IST)', eventsJob?.schedule === '30 20 * * *', eventsJob?.schedule);

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

console.log('\nsearch history (record_search_history rpc):');
await actAs(CURRENT_UID);
await asAuthenticated(() => q(`SELECT public.record_search_history('  Quantum Computing faculty  ')`));
const { rows: h1 } = await asAuthenticated(() => q(`SELECT query FROM public.search_history WHERE user_id = $1`, [CURRENT_UID]));
check('record_search_history trims and stores the query', h1.length === 1 && h1[0].query === 'Quantum Computing faculty', JSON.stringify(h1));

await asAuthenticated(() => q(`SELECT public.record_search_history('quantum computing faculty')`));
const { rows: h2 } = await asAuthenticated(() => q(`SELECT query FROM public.search_history WHERE user_id = $1`, [CURRENT_UID]));
check('re-searching the same query case-insensitively bumps it instead of duplicating', h2.length === 1, `got ${h2.length}`);

for (let i = 0; i < 10; i++) {
  await asAuthenticated(() => q(`SELECT public.record_search_history($1)`, [`history entry ${i}`]));
}
const { rows: h3 } = await asAuthenticated(() => q(`SELECT query FROM public.search_history WHERE user_id = $1`, [CURRENT_UID]));
check('history is capped at 8 rows per user', h3.length === 8, `got ${h3.length}`);

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

console.log(failures === 0
  ? '\nAll migration checks passed against real Postgres.'
  : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
