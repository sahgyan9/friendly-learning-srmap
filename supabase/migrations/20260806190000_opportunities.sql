-- =============================================================================
-- Opportunities — hackathons and competitions, with team formation
--
-- The growth loop. Mentorship is occasional; opportunities recur, carry
-- deadlines, and a student who needs a teammate has to invite others, so
-- recruiting is the product rather than something bolted onto it.
--
-- SCOPE, DELIBERATELY NARROW. Registration stays with the organiser. Devfolio,
-- Unstop and MLH own their signup flows and cannot be proxied, and pretending
-- otherwise would mean maintaining a fake form that silently fails to enter
-- anyone. This owns discovery and team formation — the part actually unsolved —
-- and links out for the rest. `external_url` is where a student actually
-- registers.
--
-- A TEAM IS A COMMUNITY. public.communities already has kind, visibility,
-- membership, invites, group chat and reactions, all built and working. A
-- hackathon team is exactly that with a deadline attached, so opportunity_teams
-- is a thin join rather than a parallel implementation. This is why there is no
-- team_messages table here: those messages are community_group_messages.
-- (Note: the existing public.team_members table is unrelated — it holds the
-- "about us" staff list, name/position/email. Do not reuse it.)
-- =============================================================================

-- -----------------------------------------------------------------------------
-- opportunities
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opportunities (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  slug         TEXT NOT NULL UNIQUE,

  title        TEXT NOT NULL,
  organiser    TEXT,
  kind         TEXT NOT NULL DEFAULT 'hackathon'
               CHECK (kind IN ('hackathon', 'competition', 'internship', 'conference', 'scholarship', 'other')),
  description  TEXT,

  -- What the work is about. Same shape as faculty.interests on purpose: it is
  -- what the retrieval projector embeds, so a student asking "who is doing an
  -- AI hackathon" matches without anyone maintaining a keyword list.
  tags         TEXT[] NOT NULL DEFAULT '{}',

  location     TEXT,
  is_online    BOOLEAN NOT NULL DEFAULT false,

  starts_at    TIMESTAMPTZ,
  ends_at      TIMESTAMPTZ,
  -- The field that makes this a growth loop rather than a noticeboard.
  register_by  TIMESTAMPTZ,

  -- Registration happens on the organiser's site, never here.
  external_url TEXT,

  team_min     SMALLINT CHECK (team_min IS NULL OR team_min > 0),
  team_max     SMALLINT CHECK (team_max IS NULL OR team_max > 0),

  posted_by    UUID REFERENCES public.users(id) ON DELETE SET NULL,
  is_published BOOLEAN NOT NULL DEFAULT true,

  interest_count INTEGER NOT NULL DEFAULT 0,
  team_count     INTEGER NOT NULL DEFAULT 0,

  created_at   TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunities_open
  ON public.opportunities (register_by DESC NULLS LAST) WHERE is_published;
CREATE INDEX IF NOT EXISTS idx_opportunities_kind ON public.opportunities (kind);
CREATE INDEX IF NOT EXISTS idx_opportunities_tags ON public.opportunities USING GIN (tags);

DROP TRIGGER IF EXISTS trg_opportunities_touch ON public.opportunities;
CREATE TRIGGER trg_opportunities_touch
  BEFORE UPDATE ON public.opportunities
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- opportunity_interest
--
-- One tap, no commitment. Deliberately lighter than joining a team: the point
-- is to show a fresher that eleven other people are also thinking about this,
-- which is what makes forming a team feel possible.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opportunity_interest (
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  user_id        UUID NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  -- "I can do the backend, looking for a designer" — optional, and the single
  -- most useful thing for someone scanning who to approach.
  note           TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (opportunity_id, user_id)
);

CREATE INDEX IF NOT EXISTS idx_opportunity_interest_user
  ON public.opportunity_interest (user_id);

-- -----------------------------------------------------------------------------
-- opportunity_teams
--
-- The join between an opportunity and the community that *is* the team.
-- community_id is UNIQUE: a community belongs to at most one opportunity, so a
-- team's chat can never be shared between two hackathons by accident.
-- -----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.opportunity_teams (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  opportunity_id UUID NOT NULL REFERENCES public.opportunities(id) ON DELETE CASCADE,
  community_id   UUID NOT NULL UNIQUE REFERENCES public.communities(id) ON DELETE CASCADE,

  -- Skills the team still needs. This is what turns a team list into a
  -- noticeboard a student can actually answer.
  looking_for    TEXT[] NOT NULL DEFAULT '{}',
  pitch          TEXT,
  is_open        BOOLEAN NOT NULL DEFAULT true,

  created_by     UUID REFERENCES public.users(id) ON DELETE SET NULL,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_opportunity_teams_opportunity
  ON public.opportunity_teams (opportunity_id) WHERE is_open;
CREATE INDEX IF NOT EXISTS idx_opportunity_teams_looking_for
  ON public.opportunity_teams USING GIN (looking_for);

DROP TRIGGER IF EXISTS trg_opportunity_teams_touch ON public.opportunity_teams;
CREATE TRIGGER trg_opportunity_teams_touch
  BEFORE UPDATE ON public.opportunity_teams
  FOR EACH ROW EXECUTE FUNCTION public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- Denormalised counts
--
-- Same pattern as community_members/community_posts recounts: a count shown on
-- every card must not be a subquery per row.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.opportunity_recount()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, pg_temp
AS $$
DECLARE
  target UUID := COALESCE(NEW.opportunity_id, OLD.opportunity_id);
BEGIN
  UPDATE public.opportunities o
  SET interest_count = (SELECT COUNT(*) FROM public.opportunity_interest i WHERE i.opportunity_id = target),
      team_count     = (SELECT COUNT(*) FROM public.opportunity_teams t WHERE t.opportunity_id = target)
  WHERE o.id = target;

  RETURN COALESCE(NEW, OLD);
END;
$$;

DROP TRIGGER IF EXISTS trg_opportunity_interest_recount ON public.opportunity_interest;
CREATE TRIGGER trg_opportunity_interest_recount
  AFTER INSERT OR DELETE ON public.opportunity_interest
  FOR EACH ROW EXECUTE FUNCTION public.opportunity_recount();

DROP TRIGGER IF EXISTS trg_opportunity_teams_recount ON public.opportunity_teams;
CREATE TRIGGER trg_opportunity_teams_recount
  AFTER INSERT OR DELETE ON public.opportunity_teams
  FOR EACH ROW EXECUTE FUNCTION public.opportunity_recount();

-- -----------------------------------------------------------------------------
-- RLS
-- -----------------------------------------------------------------------------
ALTER TABLE public.opportunities        ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_interest ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.opportunity_teams    ENABLE ROW LEVEL SECURITY;

-- Opportunities are public: a deadline nobody can see is worthless, and public
-- pages can rank in search, which is free distribution.
DROP POLICY IF EXISTS "Anyone can view published opportunities" ON public.opportunities;
CREATE POLICY "Anyone can view published opportunities"
  ON public.opportunities FOR SELECT USING (is_published);

DROP POLICY IF EXISTS "Signed-in users can post opportunities" ON public.opportunities;
CREATE POLICY "Signed-in users can post opportunities"
  ON public.opportunities FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = posted_by);

DROP POLICY IF EXISTS "Posters and admins can edit opportunities" ON public.opportunities;
CREATE POLICY "Posters and admins can edit opportunities"
  ON public.opportunities FOR UPDATE TO authenticated
  USING (auth.uid() = posted_by
         OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

DROP POLICY IF EXISTS "Posters and admins can delete opportunities" ON public.opportunities;
CREATE POLICY "Posters and admins can delete opportunities"
  ON public.opportunities FOR DELETE TO authenticated
  USING (auth.uid() = posted_by
         OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- Interest is visible to signed-in students only. The count is public (it comes
-- off opportunities.interest_count), but *who* is interested is not something a
-- signed-out visitor or a scraper should be able to enumerate.
DROP POLICY IF EXISTS "Signed-in users can see who is interested" ON public.opportunity_interest;
CREATE POLICY "Signed-in users can see who is interested"
  ON public.opportunity_interest FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Users manage their own interest" ON public.opportunity_interest;
CREATE POLICY "Users manage their own interest"
  ON public.opportunity_interest FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users withdraw their own interest" ON public.opportunity_interest;
CREATE POLICY "Users withdraw their own interest"
  ON public.opportunity_interest FOR DELETE TO authenticated
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "Users update their own interest note" ON public.opportunity_interest;
CREATE POLICY "Users update their own interest note"
  ON public.opportunity_interest FOR UPDATE TO authenticated
  USING (auth.uid() = user_id);

-- Teams looking for members are public, so a fresher can see there is a team to
-- join before deciding to sign up. The team's *conversation* stays private —
-- that is community_group_messages, governed by the community's own policies.
DROP POLICY IF EXISTS "Anyone can view teams" ON public.opportunity_teams;
CREATE POLICY "Anyone can view teams"
  ON public.opportunity_teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "Signed-in users can start a team" ON public.opportunity_teams;
CREATE POLICY "Signed-in users can start a team"
  ON public.opportunity_teams FOR INSERT TO authenticated
  WITH CHECK (auth.uid() = created_by);

-- Any member of the team's community can update the listing, not just the
-- creator — a teammate should be able to close the slot when it fills.
DROP POLICY IF EXISTS "Team members can edit their listing" ON public.opportunity_teams;
CREATE POLICY "Team members can edit their listing"
  ON public.opportunity_teams FOR UPDATE TO authenticated
  USING (EXISTS (
    SELECT 1 FROM public.community_members m
    WHERE m.community_id = opportunity_teams.community_id AND m.user_id = auth.uid()
  ));

DROP POLICY IF EXISTS "Team creator or admin can delete a team" ON public.opportunity_teams;
CREATE POLICY "Team creator or admin can delete a team"
  ON public.opportunity_teams FOR DELETE TO authenticated
  USING (auth.uid() = created_by
         OR EXISTS (SELECT 1 FROM public.users WHERE id = auth.uid() AND is_admin = true));

-- -----------------------------------------------------------------------------
-- Retrieval projector
--
-- The architecture claim, tested: making a new entity searchable is one
-- function plus one line in rebuild_knowledge_chunks(). No change to the embed
-- job, the search RPC, /ask, or the assistant.
--
-- Only opportunities still open are indexed. A student asking "any AI
-- hackathons?" should not be handed one that closed in March.
-- -----------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.rebuild_opportunity_chunks()
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
DECLARE
  affected INTEGER;
BEGIN
  WITH source AS (
    SELECT
      o.id,
      o.title,
      NULLIF(concat_ws(' · ', o.organiser, o.location), '') AS subtitle,
      concat_ws('. ',
        concat_ws(', ', o.title, o.kind, o.organiser),
        NULLIF(o.description, ''),
        NULLIF('Topics: ' || array_to_string(o.tags, ', '), 'Topics: '),
        CASE WHEN o.is_online THEN 'Online' ELSE NULLIF(o.location, '') END
      ) AS body,
      jsonb_build_object(
        'slug', o.slug,
        'kind', o.kind,
        'organiser', o.organiser,
        'tags', to_jsonb(o.tags),
        'register_by', o.register_by,
        'is_online', o.is_online,
        'interest_count', o.interest_count,
        'team_count', o.team_count
      ) AS metadata,
      '/opportunities/' || o.slug AS source_path
    FROM public.opportunities o
    WHERE o.is_published
      AND (o.register_by IS NULL OR o.register_by > now())
  )
  INSERT INTO public.knowledge_chunks
    (entity_type, entity_id, title, subtitle, body, metadata, visibility, source_path, content_hash)
  SELECT 'opportunity', s.id, s.title, s.subtitle, s.body, s.metadata, 'public', s.source_path, md5(s.body)
  FROM source s
  ON CONFLICT (entity_type, entity_id) DO UPDATE SET
    title        = EXCLUDED.title,
    subtitle     = EXCLUDED.subtitle,
    body         = EXCLUDED.body,
    metadata     = EXCLUDED.metadata,
    visibility   = EXCLUDED.visibility,
    source_path  = EXCLUDED.source_path,
    content_hash = EXCLUDED.content_hash,
    embedding    = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                        THEN NULL ELSE public.knowledge_chunks.embedding END,
    embedded_at  = CASE WHEN public.knowledge_chunks.content_hash IS DISTINCT FROM EXCLUDED.content_hash
                        THEN NULL ELSE public.knowledge_chunks.embedded_at END;

  GET DIAGNOSTICS affected = ROW_COUNT;

  -- Closed, unpublished and expired opportunities drop out of search. The row
  -- itself survives so the page and its teams stay reachable by link.
  DELETE FROM public.knowledge_chunks kc
  WHERE kc.entity_type = 'opportunity'
    AND NOT EXISTS (
      SELECT 1 FROM public.opportunities o
      WHERE o.id = kc.entity_id
        AND o.is_published
        AND (o.register_by IS NULL OR o.register_by > now())
    );

  RETURN affected;
END;
$$;

-- Fold it into the single rebuild the schedule already calls.
CREATE OR REPLACE FUNCTION public.rebuild_knowledge_chunks()
RETURNS TABLE (entity_type TEXT, rows_upserted INTEGER)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, pg_temp
AS $$
BEGIN
  RETURN QUERY SELECT 'faculty'::TEXT,     public.rebuild_faculty_chunks();
  RETURN QUERY SELECT 'mentor'::TEXT,      public.rebuild_mentor_chunks();
  RETURN QUERY SELECT 'opportunity'::TEXT, public.rebuild_opportunity_chunks();
END;
$$;

REVOKE ALL ON FUNCTION public.rebuild_opportunity_chunks() FROM PUBLIC, anon, authenticated;
REVOKE ALL ON FUNCTION public.opportunity_recount()        FROM PUBLIC, anon, authenticated;
