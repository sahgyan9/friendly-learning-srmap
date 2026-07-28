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
    department text
  );
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
`);

// A pre-existing post authored by the mentor, to exercise the backfill.
await q(`INSERT INTO public.community_posts (mentor_id, title, content) VALUES ($1, 'Legacy mentor post', 'body')`, [OTHER_UID]);
console.log('Scaffolding ready.\n');

// ---------------------------------------------------------------- migrations
for (const file of [
  '20260726010000_faculty_ratings.sql',
  '20260726010100_community_posts_open_to_students.sql',
]) {
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

console.log(failures === 0
  ? '\nAll migration checks passed against real Postgres.'
  : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
