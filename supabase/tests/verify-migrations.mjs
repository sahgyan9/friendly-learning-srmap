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

// A pre-existing post authored by the mentor, to exercise the backfill.
await q(`INSERT INTO public.community_posts (mentor_id, title, content) VALUES ($1, 'Legacy mentor post', 'body')`, [OTHER_UID]);
console.log('Scaffolding ready.\n');

// ---------------------------------------------------------------- migrations
for (const file of [
  '20260726010000_faculty_ratings.sql',
  '20260726010100_community_posts_open_to_students.sql',
  '20260806100000_faculty_research_interests.sql',
  '20260807140000_community_channels.sql',
  '20260808150000_mentor_projects_experience.sql',
  '20260808160000_academic_imports.sql',
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

console.log(failures === 0
  ? '\nAll migration checks passed against real Postgres.'
  : `\n${failures} check(s) FAILED.`);
process.exit(failures === 0 ? 0 : 1);
