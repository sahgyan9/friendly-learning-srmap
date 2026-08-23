// Draft the four skimmable profile sections (tagline, outcomes, ideal mentees,
// ask-me-anything topics) from a mentor's OWN material.
//
// WHAT THIS REPLACES
// These four fields used to be produced by a template in
// src/utils/mentor-enhancements.ts that ran whenever the field was empty --
// which was always, because none of the four was a column. Every mentor got the
// same four "outcomes" with their skill names substituted in. See
// 20260823190000_mentor_profile_summary.sql for the full history.
//
// THE ONE RULE THAT MATTERS HERE
// This function SUMMARISES. It does not embellish, infer, or fill space. The
// output is published under a real student's name as though they wrote it, so a
// sentence the source material does not support is not a rough edge -- it is
// words put in someone's mouth. Two consequences that look like over-engineering
// but are not:
//
//   1. There is a material threshold (mentors_needing_summary). A mentor with
//      three skills and no bio gives the model nothing, and asking for four
//      outcomes anyway just recreates the template with extra steps -- harder to
//      spot, not less invented. Below the threshold we write nothing and the
//      profile shows an honest empty state.
//   2. The prompt asks for FEWER items when support is thin, and the validator
//      below accepts short lists. Any "always return exactly 4" instruction is a
//      padding instruction.
//
// A mentor's own edit always wins: rows with profile_summary_edited_at set are
// skipped, and `force` does not override that.
//
// Output is NEVER embedded into knowledge_chunks. rebuild_mentor_chunks() indexes
// the mentor's bio and skills -- the source. Indexing the summary too would make
// model-written claims retrievable by the AI chatbot, which would then cite them
// as facts about the person and feed the next generation. Keep the loop open.
//
// Auth: CRON_SECRET, the service role, or an is_admin JWT -- same shape as
// embed-knowledge. verify_jwt is off (see config.toml); the platform gate only
// checks the anon key, which ships in the client bundle.
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-cron-secret",
};

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") ?? "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";

const GEMINI_KEYS = [
  Deno.env.get("Gemini_API_Key"),
  Deno.env.get("Gemini_API_Key_2"),
  Deno.env.get("GEMINI_API_KEY"),
].filter((k): k is string => Boolean(k && k.trim().length > 0));

// Same ladder generate-ai-overview walks, for the same reason: model
// availability here moves without notice and a hard-pinned name has broken
// generation before.
const GENERATION_MODELS = [
  "gemini-3.1-flash-lite",
  "gemini-3-flash-preview",
  "gemini-flash-lite-latest",
  "gemini-flash-latest",
];

const RETRY_503_MS = 1200;
const DEFAULT_BATCH = 25;

const supabaseAdmin = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

type MentorRow = {
  id: string;
  name: string | null;
  bio: string | null;
  skills: string[] | null;
  projects: unknown;
  experiences: unknown;
  courses: unknown;
  hobbies: string | null;
  department: string | null;
  year_of_studies: string | null;
  is_alumni: boolean | null;
  job_title: string | null;
  company: string | null;
  profile_summary_edited_at: string | null;
};

type Summary = {
  tagline: string | null;
  outcomes: string[];
  ideal_mentees: string[];
  ask_me_anything: Array<{ topic: string; icon?: string }>;
};

// ---------------------------------------------------------------------------
// Prompt
// ---------------------------------------------------------------------------

function describeSource(m: MentorRow): string {
  const lines: string[] = [];
  const push = (label: string, value: unknown) => {
    if (value === null || value === undefined) return;
    const s = typeof value === "string" ? value.trim() : JSON.stringify(value);
    if (!s || s === "[]" || s === "{}") return;
    lines.push(`${label}: ${s}`);
  };

  push("Name", m.name);
  push("Department", m.department);
  push("Year", m.is_alumni ? "Alumni" : m.year_of_studies);
  if (m.is_alumni) {
    push("Current role", [m.job_title, m.company].filter(Boolean).join(" at "));
  }
  push("Bio (written by them)", m.bio);
  push("Skills they listed", (m.skills ?? []).join(", "));
  push("Projects", m.projects);
  push("Work/leadership experience", m.experiences);
  push("Interests", m.hobbies);

  // Coursework is the strongest signal we have and the only verified one (it
  // comes from the SRM portal import, not self-report), but it is long. Course
  // NAMES only -- grades, credits and semester are private and must never reach
  // a third-party model.
  const courses = Array.isArray(m.courses) ? m.courses : [];
  if (courses.length > 0) {
    const names = courses
      .map((c) => (c && typeof c === "object" ? (c as Record<string, unknown>).name : c))
      .filter((n): n is string => typeof n === "string" && n.trim().length > 0)
      .slice(0, 40);
    if (names.length > 0) push("Verified coursework", names.join(", "));
  }

  return lines.join("\n");
}

function buildPrompt(m: MentorRow): string {
  return `You are writing three short sections of a peer-mentor profile for a university mentoring site. Students skim these to decide whether to message this mentor.

SOURCE MATERIAL — this is everything known about this person:
${describeSource(m)}

Write ONLY what this source material supports. This text is published under this person's real name as if they wrote it, so an unsupported claim is not a stylistic problem, it is a false statement about a real student.

Rules:
- Never invent a project, job, achievement, tool, or area of expertise that is not above.
- Prefer FEWER items over padding. If the source only supports two outcomes, return two. Returning a thin list is correct behaviour, not failure.
- No superlatives, no hype, no "passionate about", no "dedicated". Plain, concrete, specific.
- Do not mention grades, CGPA, or academic standing.
- Write for a student reader in simple language.

Return JSON with exactly this shape:
{
  "tagline": string | null,
  "outcomes": string[],
  "ideal_mentees": string[],
  "ask_me_anything": [{ "topic": string }]
}

"tagline": one line, under 120 characters, what this person actually helps with. Null if the source is too thin to say anything specific.

"outcomes": 2 to 4 items, each under 80 characters. Concrete things a student could ACHIEVE by talking to them, phrased as the student's result — e.g. "Get your first React app deployed". Not a description of the mentor.

"ideal_mentees": 2 to 4 items, each under 80 characters. Describes the STUDENT this mentor suits, so a reader can self-select — e.g. "First-year who has never used Git". Not a description of the mentor.

"ask_me_anything": 3 to 6 topics, each 1-3 words. The specialities this person is genuinely credible on. IMPORTANT: if they listed many skills, pick only the ones their bio, projects, experience or coursework actually back up — a long skill list is usually aspirational, and listing all of it helps nobody. Prefer specific topics over generic ones.`;
}

// ---------------------------------------------------------------------------
// Gemini
// ---------------------------------------------------------------------------

function cleanJsonText(raw: string): string {
  let text = raw.trim();
  if (text.startsWith("```json")) {
    text = text.replace(/^```json\s*/, "").replace(/\s*```$/, "");
  } else if (text.startsWith("```")) {
    text = text.replace(/^```\s*/, "").replace(/\s*```$/, "");
  }
  return text.trim();
}

async function generate(prompt: string): Promise<unknown> {
  const tried: string[] = [];

  for (let keyIdx = 0; keyIdx < GEMINI_KEYS.length; keyIdx++) {
    const key = GEMINI_KEYS[keyIdx];

    for (const model of GENERATION_MODELS) {
      const call = () =>
        fetch(
          `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`,
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              contents: [{ parts: [{ text: prompt }] }],
              generationConfig: {
                // Low, deliberately. This is summarisation; creative variance
                // here shows up as invented detail.
                temperature: 0.15,
                maxOutputTokens: 900,
                responseMimeType: "application/json",
              },
            }),
          },
        );

      let response = await call();
      if (response.status === 503) {
        await new Promise((r) => setTimeout(r, RETRY_503_MS));
        response = await call();
      }
      if (response.status === 429) {
        tried.push(`key_${keyIdx + 1}:${model}=429`);
        break; // whole key is rate-limited; move to the next one
      }
      if (!response.ok) {
        tried.push(`key_${keyIdx + 1}:${model}=${response.status}`);
        continue;
      }

      const body = await response.json();
      const candidate = body.candidates?.[0];
      const text = candidate?.content?.parts?.[0]?.text;

      if (text && candidate?.finishReason === "MAX_TOKENS") {
        tried.push(`key_${keyIdx + 1}:${model}=truncated`);
        continue;
      }
      if (text) {
        try {
          return JSON.parse(cleanJsonText(text));
        } catch (e) {
          tried.push(
            `key_${keyIdx + 1}:${model}=parse:${e instanceof Error ? e.message : String(e)}`,
          );
          continue;
        }
      }
      tried.push(`key_${keyIdx + 1}:${model}=empty`);
    }
  }

  throw new Error(`Gemini failed across all keys and models: ${tried.join(" | ")}`);
}

// ---------------------------------------------------------------------------
// Validation — never write raw model output
//
// The DB has CHECK constraints on these shapes, but a constraint violation
// fails the whole batch. Clamping here means one odd generation degrades to a
// shorter list instead of taking the other 24 mentors down with it.
// ---------------------------------------------------------------------------

function cleanList(value: unknown, max: number, maxLen: number): string[] {
  if (!Array.isArray(value)) return [];
  const out: string[] = [];
  const seen = new Set<string>();
  for (const item of value) {
    if (typeof item !== "string") continue;
    const s = item.trim().replace(/\s+/g, " ");
    if (s.length === 0 || s.length > maxLen) continue;
    const key = s.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(s);
    if (out.length >= max) break;
  }
  return out;
}

function validate(raw: unknown): Summary | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Record<string, unknown>;

  const tagline =
    typeof r.tagline === "string" && r.tagline.trim().length > 0
      ? r.tagline.trim().replace(/\s+/g, " ").slice(0, 200)
      : null;

  const outcomes = cleanList(r.outcomes, 4, 120);
  const ideal_mentees = cleanList(r.ideal_mentees, 4, 120);

  const topics = Array.isArray(r.ask_me_anything) ? r.ask_me_anything : [];
  const flat = topics
    .map((t) =>
      typeof t === "string"
        ? t
        : t && typeof t === "object"
          ? String((t as Record<string, unknown>).topic ?? "")
          : "",
    )
    .filter((s) => s.length > 0);
  const ask_me_anything = cleanList(flat, 6, 40).map((topic) => ({ topic }));

  // Nothing usable came back. Writing an all-empty summary would mark the row
  // generated and stop the sweeper retrying it, so report it as a failure.
  if (!tagline && outcomes.length === 0 && ideal_mentees.length === 0) return null;

  return { tagline, outcomes, ideal_mentees, ask_me_anything };
}

// ---------------------------------------------------------------------------

async function isAuthorised(req: Request): Promise<boolean> {
  const cronSecret = Deno.env.get("CRON_SECRET");
  if (cronSecret && req.headers.get("x-cron-secret") === cronSecret) return true;

  const authHeader = req.headers.get("Authorization");
  if (
    SUPABASE_SERVICE_ROLE_KEY &&
    (authHeader === `Bearer ${SUPABASE_SERVICE_ROLE_KEY}` ||
      req.headers.get("apikey") === SUPABASE_SERVICE_ROLE_KEY)
  ) {
    return true;
  }

  if (!authHeader?.startsWith("Bearer ")) return false;
  const { data, error } = await supabaseAdmin.auth.getUser(
    authHeader.replace("Bearer ", ""),
  );
  if (error || !data?.user) return false;

  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("is_admin")
    .eq("id", data.user.id)
    .maybeSingle();

  return profile?.is_admin === true;
}

const SOURCE_COLUMNS =
  "id, name, bio, skills, projects, experiences, courses, hobbies, department, year_of_studies, is_alumni, job_title, company, profile_summary_edited_at";

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), {
      status,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  if (!(await isAuthorised(req))) return json({ error: "Unauthorized" }, 401);
  if (GEMINI_KEYS.length === 0) return json({ error: "No Gemini API key configured" }, 500);

  let payload: {
    mentorIds?: string[];
    limit?: number;
    // Regenerate even when the source hash is unchanged. Does NOT override a
    // mentor's hand-edit -- nothing does, except the mentor.
    force?: boolean;
    // Generate and return, write nothing. For reviewing output before it goes
    // live on real people's profiles.
    dryRun?: boolean;
  } = {};
  try {
    payload = await req.json();
  } catch {
    // Empty body means "sweep the default batch".
  }

  const dryRun = payload.dryRun === true;
  const limit = Math.min(Math.max(payload.limit ?? DEFAULT_BATCH, 1), 100);

  // --- pick the batch --------------------------------------------------------
  let targets: Array<{ id: string; source_hash: string | null }> = [];

  if (payload.mentorIds && payload.mentorIds.length > 0) {
    targets = payload.mentorIds.slice(0, limit).map((id) => ({ id, source_hash: null }));
  } else if (payload.force) {
    const { data, error } = await supabaseAdmin
      .from("mentors")
      .select("id")
      .is("profile_summary_edited_at", null)
      .limit(limit);
    if (error) return json({ error: error.message }, 500);
    targets = (data ?? []).map((r) => ({ id: r.id as string, source_hash: null }));
  } else {
    const { data, error } = await supabaseAdmin.rpc("mentors_needing_summary", {
      p_limit: limit,
    });
    if (error) return json({ error: error.message }, 500);
    targets = (data ?? []) as Array<{ id: string; source_hash: string | null }>;
  }

  if (targets.length === 0) {
    return json({ ok: true, considered: 0, generated: 0, skipped: 0, failed: 0, results: [] });
  }

  const { data: rows, error: rowsError } = await supabaseAdmin
    .from("mentors")
    .select(SOURCE_COLUMNS)
    .in("id", targets.map((t) => t.id));
  if (rowsError) return json({ error: rowsError.message }, 500);

  const byId = new Map((rows ?? []).map((r) => [(r as MentorRow).id, r as MentorRow]));

  const results: Array<Record<string, unknown>> = [];
  let generated = 0;
  let skipped = 0;
  let failed = 0;

  for (const target of targets) {
    const mentor = byId.get(target.id);
    if (!mentor) {
      skipped++;
      results.push({ id: target.id, status: "skipped", reason: "mentor not found" });
      continue;
    }

    // Belt and braces: mentors_needing_summary already excludes these, but an
    // explicit mentorIds call bypasses that filter entirely.
    if (mentor.profile_summary_edited_at) {
      skipped++;
      results.push({ id: target.id, status: "skipped", reason: "mentor edited this by hand" });
      continue;
    }

    const bioLength = (mentor.bio ?? "").trim().length;
    const hasProjects = Array.isArray(mentor.projects) && mentor.projects.length > 0;
    const hasExperience = Array.isArray(mentor.experiences) && mentor.experiences.length > 0;
    if (bioLength < 80 && !hasProjects && !hasExperience) {
      skipped++;
      results.push({
        id: target.id,
        status: "skipped",
        reason: "not enough source material to summarise without inventing",
      });
      continue;
    }

    let summary: Summary | null = null;
    try {
      summary = validate(await generate(buildPrompt(mentor)));
    } catch (e) {
      failed++;
      results.push({
        id: target.id,
        status: "failed",
        reason: e instanceof Error ? e.message : String(e),
      });
      continue;
    }

    if (!summary) {
      failed++;
      results.push({ id: target.id, status: "failed", reason: "model returned nothing usable" });
      continue;
    }

    if (dryRun) {
      generated++;
      results.push({ id: target.id, name: mentor.name, status: "dry-run", summary });
      continue;
    }

    // Recompute the hash from the row we actually summarised, rather than
    // trusting the value the RPC handed us -- the mentor could have saved an
    // edit between the two queries, and stamping the newer hash onto an older
    // generation would mean the change never gets picked up again.
    const { data: hash, error: hashError } = await supabaseAdmin.rpc(
      "mentor_summary_source_hash",
      {
        p_bio: mentor.bio,
        p_skills: mentor.skills,
        p_projects: mentor.projects ?? [],
        p_experiences: mentor.experiences ?? [],
        p_courses: mentor.courses ?? [],
        p_hobbies: mentor.hobbies,
        p_department: mentor.department,
        p_year: mentor.year_of_studies,
        p_is_alumni: mentor.is_alumni ?? false,
        p_job_title: mentor.job_title,
        p_company: mentor.company,
      },
    );
    if (hashError) {
      failed++;
      results.push({ id: target.id, status: "failed", reason: hashError.message });
      continue;
    }

    const { error: updateError } = await supabaseAdmin
      .from("mentors")
      .update({
        tagline: summary.tagline,
        outcomes: summary.outcomes,
        ideal_mentees: summary.ideal_mentees,
        ask_me_anything: summary.ask_me_anything,
        profile_summary_source_hash: hash,
        profile_summary_generated_at: new Date().toISOString(),
      })
      .eq("id", target.id)
      // Racing a mentor's own edit: if they saved one while Gemini was
      // thinking, their version wins and this write is a no-op.
      .is("profile_summary_edited_at", null);

    if (updateError) {
      failed++;
      results.push({ id: target.id, status: "failed", reason: updateError.message });
      continue;
    }

    generated++;
    results.push({ id: target.id, name: mentor.name, status: "generated", summary });
  }

  return json({
    ok: true,
    dryRun,
    considered: targets.length,
    generated,
    skipped,
    failed,
    results,
  });
});
