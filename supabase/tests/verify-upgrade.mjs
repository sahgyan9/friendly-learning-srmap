// Proves the faculty migration is upgrade-safe.
//
// Some databases already have the earlier single-score faculty schema (from the
// reverted "Added anonymous faculty rating" change) applied. This applies that
// legacy schema first, seeds it with a rating, then runs the new migrations on
// top and asserts the data survived and the new shape is correct.
//
//   node supabase/tests/verify-upgrade.mjs
import { PGlite } from '@electric-sql/pglite';
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const HERE = fileURLToPath(new URL('.', import.meta.url));
const MIGRATIONS = path.join(HERE, '..', 'migrations');

const CURRENT_UID = '11111111-1111-1111-1111-111111111111';
const OTHER_UID = '22222222-2222-2222-2222-222222222222';

let failures = 0;
function check(label, condition, detail = '') {
  if (!condition) failures += 1;
  console.log(`  [${condition ? 'PASS' : 'FAIL'}] ${label}${detail ? ` — ${detail}` : ''}`);
}

async function scaffold(db) {
  await db.exec(`
    CREATE ROLE anon NOLOGIN;
    CREATE ROLE authenticated NOLOGIN;
    CREATE ROLE service_role NOLOGIN BYPASSRLS;

    CREATE SCHEMA IF NOT EXISTS auth;
    CREATE TABLE auth._session (uid uuid);
    INSERT INTO auth._session VALUES ('${CURRENT_UID}');
    CREATE FUNCTION auth.uid() RETURNS uuid LANGUAGE sql STABLE AS $$ SELECT uid FROM auth._session $$;

    CREATE TABLE public.users (
      id uuid PRIMARY KEY, name text, email text, role text,
      profile_image text, department text, is_admin boolean DEFAULT false
    );
    CREATE TABLE public.mentors (
      id uuid PRIMARY KEY REFERENCES public.users(id), name text, department text
    );
    CREATE FUNCTION public.is_admin_user(user_id uuid DEFAULT auth.uid())
      RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER AS
      $$ SELECT COALESCE((SELECT is_admin FROM public.users WHERE id = user_id), false) $$;

    INSERT INTO public.users (id, name, email, role, department) VALUES
      ('${CURRENT_UID}', 'Asha Student', 'asha@srmap.edu.in', 'student', 'CSE'),
      ('${OTHER_UID}',   'Ravi Mentor',  'ravi@srmap.edu.in', 'mentor',  'CSE');
    INSERT INTO public.mentors VALUES ('${OTHER_UID}', 'Ravi Mentor', 'CSE');

    CREATE TABLE public.community_posts (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      mentor_id UUID NOT NULL REFERENCES public.mentors(id) ON DELETE CASCADE,
      title TEXT NOT NULL, content TEXT NOT NULL,
      post_type TEXT NOT NULL DEFAULT 'general',
      tags TEXT[] DEFAULT ARRAY[]::TEXT[],
      status TEXT NOT NULL DEFAULT 'open',
      likes_count INTEGER NOT NULL DEFAULT 0,
      comments_count INTEGER NOT NULL DEFAULT 0,
      image_url TEXT,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
    CREATE TABLE public.post_likes (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL, created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      UNIQUE (post_id, user_id)
    );
    CREATE TABLE public.post_comments (
      id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
      post_id UUID NOT NULL REFERENCES public.community_posts(id) ON DELETE CASCADE,
      user_id UUID NOT NULL, content TEXT NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
    );
  `);
}

async function applyMigrations(db) {
  for (const file of [
    '20260726010000_faculty_ratings.sql',
    '20260726010100_community_posts_open_to_students.sql',
  ]) {
    await db.exec(fs.readFileSync(path.join(MIGRATIONS, file), 'utf8'));
  }
}

// ============================================================ scenario A: clean
console.log('Scenario A — clean database:');
{
  const db = new PGlite();
  await scaffold(db);
  try {
    await applyMigrations(db);
    check('migrations apply', true);
  } catch (error) {
    check('migrations apply', false, error.message);
    process.exit(1);
  }

  await db.query(`INSERT INTO public.faculty (slug, name, department) VALUES ('dr-test', 'Dr Test', 'Physics')`);
  const { rows: [f] } = await db.query(`SELECT slug, is_active, avg_overall FROM public.faculty`);
  check('new-shape insert works', f.slug === 'dr-test' && f.is_active === true);
}

// ================================================ scenario B: legacy schema present
console.log('\nScenario B — legacy single-score schema already applied:');
{
  const db = new PGlite();
  await scaffold(db);

  // Apply the reverted schema exactly as it landed in the live database.
  const legacy = fs.readFileSync(path.join(HERE, 'fixtures-legacy-faculty.sql'), 'utf8');
  await db.exec(legacy);
  const { rows: [seeded] } = await db.query(`SELECT count(*)::int AS n FROM public.faculty`);
  check('legacy schema applied with seed data', seeded.n > 0, `${seeded.n} rows`);

  // A real student rating on the old schema, which must survive the upgrade.
  const { rows: [target] } = await db.query(`SELECT id, name FROM public.faculty ORDER BY name LIMIT 1`);
  await db.query(
    `INSERT INTO public.faculty_ratings (faculty_id, reviewer_id, rating, comment) VALUES ($1,$2,4,'Solid teacher')`,
    [target.id, CURRENT_UID],
  );
  // And an orphan rating whose author no longer exists.
  await db.query(
    `INSERT INTO public.faculty_ratings (faculty_id, reviewer_id, rating) VALUES ($1,'99999999-9999-9999-9999-999999999999',2)`,
    [target.id],
  );
  const { rows: [pre] } = await db.query(`SELECT avg_rating, rating_count FROM public.faculty WHERE id=$1`, [target.id]);
  check('legacy trigger recorded the rating', pre.rating_count === 2, `count=${pre.rating_count} avg=${pre.avg_rating}`);

  // ---- the upgrade ----
  try {
    await applyMigrations(db);
    check('migrations apply on top of legacy schema', true);
  } catch (error) {
    check('migrations apply on top of legacy schema', false, error.message);
    process.exit(1);
  }

  const { rows: [after] } = await db.query(
    `SELECT slug, is_active, source, avg_overall, avg_teaching, rating_count FROM public.faculty WHERE id=$1`,
    [target.id],
  );
  check('slug backfilled from name', /^[a-z0-9-]+$/.test(after.slug), `${target.name} -> ${after.slug}`);
  check('is_active defaulted true', after.is_active === true);
  check('source defaulted', after.source === 'srmap-directory');

  const { rows: [dupes] } = await db.query(
    `SELECT count(*)::int AS n FROM (SELECT slug FROM public.faculty GROUP BY slug HAVING count(*) > 1) d`,
  );
  check('no duplicate slugs after backfill', dupes.n === 0, `${dupes.n} dupes`);

  const { rows: [surviving] } = await db.query(`SELECT count(*)::int AS n FROM public.faculty_ratings`);
  check('orphan rating removed, real rating kept', surviving.n === 1, `${surviving.n} rows`);

  const { rows: [migrated] } = await db.query(
    `SELECT teaching, grading, helpfulness, overall, comment FROM public.faculty_ratings`,
  );
  check('legacy score copied onto all three criteria',
    migrated.teaching === 4 && migrated.grading === 4 && migrated.helpfulness === 4,
    JSON.stringify(migrated));
  check('generated overall computed', Number(migrated.overall) === 4, `${migrated.overall}`);
  check('comment preserved', migrated.comment === 'Solid teacher');

  const { rows: legacyCol } = await db.query(
    `SELECT column_name FROM information_schema.columns
     WHERE table_schema='public' AND table_name='faculty_ratings' AND column_name='rating'`,
  );
  check('legacy NOT NULL rating column dropped', legacyCol.length === 0);

  // Aggregates recompute under the new trigger.
  await db.query(`UPDATE public.faculty_ratings SET grading = 2`);
  const { rows: [recomputed] } = await db.query(
    `SELECT rating_count, avg_teaching, avg_grading, avg_overall FROM public.faculty WHERE id=$1`, [target.id],
  );
  check('new trigger recomputes aggregates', recomputed.rating_count === 1 && Number(recomputed.avg_grading) === 2,
    JSON.stringify(recomputed));

  // New client insert path works against the upgraded table.
  const { rows: [other] } = await db.query(`SELECT id FROM public.faculty ORDER BY name OFFSET 1 LIMIT 1`);
  await db.query(
    `INSERT INTO public.faculty_ratings (faculty_id, reviewer_id, teaching, grading, helpfulness, tags, course_code)
     VALUES ($1,$2,5,4,5,ARRAY['Clear lectures'],'CSE202')`, [other.id, OTHER_UID],
  );
  check('new multi-criteria insert accepted', true);

  const { rows: reviews } = await db.query(`SELECT * FROM public.get_faculty_reviews($1)`, [other.id]);
  check('get_faculty_reviews works on upgraded table', reviews.length === 1);
  check('still never exposes reviewer_id', !Object.keys(reviews[0]).includes('reviewer_id'));

  const { rows: oldFn } = await db.query(
    `SELECT proname FROM pg_proc WHERE proname = 'get_faculty_ratings'`,
  );
  check('legacy get_faculty_ratings RPC dropped', oldFn.length === 0);

  const { rows: pols } = await db.query(
    `SELECT policyname FROM pg_policies WHERE tablename='faculty' ORDER BY policyname`,
  );
  check('legacy faculty policies replaced',
    !pols.some((p) => p.policyname.startsWith('Only admins')),
    pols.map((p) => p.policyname).join(' | '));

  // Deactivated faculty must not be publicly visible.
  const { rows: [selectPol] } = await db.query(
    `SELECT pg_get_expr(polqual, polrelid) AS q FROM pg_policy
     WHERE polrelid='public.faculty'::regclass AND polcmd='r' LIMIT 1`,
  );
  check('public SELECT policy gates on is_active', /is_active/.test(selectPol.q), selectPol.q);
}

console.log(failures === 0
  ? '\nUpgrade path verified: clean and legacy databases both migrate correctly.'
  : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
