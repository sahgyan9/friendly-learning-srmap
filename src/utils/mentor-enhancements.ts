import { Mentor } from "@/types/mentor";
import { formatDepartment } from "@/utils/user-utils";

export interface EnhancedMentor extends Omit<Mentor, "ask_me_anything" | "tagline"> {
  /** Null when the mentor has no tagline. Render nothing — never a stand-in. */
  tagline: string | null;
  year_of_studies_text: string;
  /** May be empty. An empty list means the section does not appear. */
  outcomes: string[];
  /** May be empty. The icon is a decorative lookup, the topic is the mentor's. */
  ask_me_anything: Array<{ topic: string; icon: string }>;
  /** May be empty. An empty list means the section does not appear. */
  ideal_mentees: string[];
  categorized_skills: Record<string, string[]>;
  experiences: Array<{
    id: string;
    title: string;
    organization?: string;
    period?: string;
  }>;
  projects: Array<{
    id: string;
    title: string;
    description: string;
    link?: string;
  }>;
}

const SKILL_CATEGORIES: Record<string, string[]> = {
  Programming: ["Python", "C++", "Java", "C", "JavaScript", "TypeScript", "Go", "Rust", "C#", "Kotlin", "Swift"],
  "Backend & APIs": ["FastAPI", "Node.js", "Express", "Django", "Spring Boot", "REST", "REST APIs", "GraphQL", "Kafka", "Microservices"],
  "Database & Storage": ["Postgres", "PostgreSQL", "MongoDB", "MySQL", "Redis", "Supabase", "Firebase", "SQL", "Database"],
  "DevOps & Tools": ["Docker", "Kubernetes", "Git", "Linux", "AWS", "CI/CD", "GitHub", "Cloud"],
  "Frontend & Web": ["React", "Next.js", "HTML", "CSS", "Tailwind", "TailwindCSS", "Vue", "Angular"],
  "AI & Data": ["Machine Learning", "PyTorch", "TensorFlow", "Data Analysis", "Pandas", "NumPy", "AI", "NLP"],
};

export function getEnhancedMentorProfile(mentor: Mentor): EnhancedMentor {
  const skills = mentor.skills || [];
  const dept = formatDepartment(mentor.department) || "CSE";

  // 1. Categorize Skills
  const categorized: Record<string, string[]> = {};
  const assignedSkills = new Set<string>();

  Object.entries(SKILL_CATEGORIES).forEach(([category, matchers]) => {
    const matched = skills.filter((s) =>
      matchers.some((m) => s.toLowerCase() === m.toLowerCase() || s.toLowerCase().includes(m.toLowerCase()))
    );
    if (matched.length > 0) {
      categorized[category] = Array.from(new Set(matched));
      matched.forEach((s) => assignedSkills.add(s));
    }
  });

  const remaining = skills.filter((s) => !assignedSkills.has(s));
  if (remaining.length > 0) {
    categorized["Other Skills & Focus"] = remaining;
  }

  if (Object.keys(categorized).length === 0 && skills.length > 0) {
    categorized["General Skills"] = skills;
  }

  // 2. Tagline — the mentor's, or nothing.
  //
  // The template that used to live here ("I help students master X, Y, Z and
  // excel in CSE projects & hackathons.") ran for every mentor, because tagline
  // was not a column until 20260823190000_mentor_profile_summary.sql. It is one
  // now, drafted by generate-mentor-summary from what the mentor actually
  // wrote. An empty tagline renders as no tagline.
  const tagline = mentor.tagline?.trim() || null;

  // 3. Year of studies text
  const yearText = mentor.is_alumni
    ? `Alumni ${mentor.graduation_year ? `'${String(mentor.graduation_year).slice(-2)}` : ""}`
    : `${mentor.university || "SRM AP"} • ${dept}`;

  // 4. Outcomes ("What I can help you achieve") — real entries only.
  //
  // The four lines that used to be generated here were the same four lines on
  // every profile, with skills[0] and skills[1] swapped in. A student comparing
  // two mentors was reading one template twice. Now: whatever the mentor (or a
  // summary drafted from their own material) actually says, and an empty list
  // hides the section.
  const outcomes = (mentor.outcomes ?? []).filter(
    (o): o is string => typeof o === "string" && o.trim().length > 0,
  );

  // 5. Ask me anything about — the mentor's topics.
  //
  // The emoji is decoration chosen by a lookup table, not a claim, so deriving
  // it here is fine. The topics themselves are never invented; the default list
  // that used to sit here ("Python", "Backend", "Hackathons", "Docker",
  // "Interview Prep") is gone.
  const askMe = (mentor.ask_me_anything ?? [])
    .map((item) => {
      const topic = typeof item === "string" ? item : String(item?.topic ?? "");
      const icon =
        typeof item === "object" && item?.icon ? item.icon : getEmojiForTopic(topic);
      return { topic: topic.trim(), icon };
    })
    .filter((t) => t.topic.length > 0);

  // 6. Ideal Mentees ("Perfect if you are...") — same treatment as outcomes.
  const idealMentees = (mentor.ideal_mentees ?? []).filter(
    (m): m is string => typeof m === "string" && m.trim().length > 0,
  );

  // 7. Experiences — mentor-entered, no fallback. An invented work history
  // read as real, so an empty list now just means the section is empty.
  const experiences = mentor.experiences || [];

  // 8. Projects — same as experiences: real entries only.
  const projects = mentor.projects || [];

  // 9. Availability — no schedule block any more.
  //
  // What used to be here invented six fields: "91% response rate", "Replies
  // within 3 hours", "Mon/Wed/Fri", "Evening (6 PM - 10 PM)" and a mentee count
  // of `max(12, review_count * 4 + 8)`. They read as measured facts and were
  // shown on every profile, because they fell back off `mentor.availability_
  // schedule` -- a field on the TypeScript interface that is not a column and
  // never has been, so the fallback fired 100% of the time for 100% of mentors.
  //
  // Reply statistics now come from public.mentor_activity(), computed from
  // conversations that actually happened; see src/lib/mentor-activity.ts. The
  // stated schedule (which days, which hours) has no source at all, so it is
  // simply gone rather than guessed -- same call this file already made for
  // experiences and projects above.

  return {
    ...mentor,
    tagline,
    year_of_studies_text: yearText,
    outcomes,
    ask_me_anything: askMe,
    ideal_mentees: idealMentees,
    categorized_skills: categorized,
    experiences,
    projects,
  };
}

function getEmojiForTopic(topic: string | any): string {
  let str = "";
  if (typeof topic === "string") {
    str = topic;
  } else if (topic && typeof topic === "object" && "topic" in topic) {
    str = String(topic.topic || "");
  } else {
    str = String(topic || "");
  }
  const t = str.toLowerCase();
  if (t.includes("python")) return "🐍";
  if (t.includes("hackathon")) return "⚡";
  if (t.includes("backend")) return "💻";
  if (t.includes("docker")) return "📦";
  if (t.includes("interview") || t.includes("prep")) return "🧠";
  if (t.includes("react") || t.includes("frontend") || t.includes("web")) return "🌐";
  if (t.includes("ai") || t.includes("ml") || t.includes("data")) return "🤖";
  if (t.includes("database") || t.includes("sql") || t.includes("postgres")) return "🗄️";
  if (t.includes("cpp") || t.includes("c++") || t.includes("dsa")) return "🚀";
  return "✨";
}
