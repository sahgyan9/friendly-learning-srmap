import { Mentor } from "@/types/mentor";

export interface EnhancedMentor extends Omit<Mentor, "ask_me_anything"> {
  tagline: string;
  year_of_studies_text: string;
  outcomes: string[];
  ask_me_anything: Array<{ topic: string; icon: string }>;
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
  availability_schedule: {
    status_text: string;
    response_time: string;
    response_rate: string;
    mentees_count: number;
    available_days: string[];
    typical_time: string;
  };
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
  const dept = mentor.department || "CSE";

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

  // 2. Tagline
  let tagline = mentor.tagline;
  if (!tagline) {
    const topSkills = skills.slice(0, 3).join(", ");
    if (topSkills) {
      tagline = `I help students master ${topSkills} and excel in ${dept} projects & hackathons.`;
    } else {
      tagline = `Passionate mentor helping students excel in ${dept} and crack tech goals.`;
    }
  }

  // 3. Year of studies text
  const yearText = mentor.is_alumni
    ? `Alumni ${mentor.graduation_year ? `'${String(mentor.graduation_year).slice(-2)}` : ""}`
    : `${mentor.university || "SRM AP"} • ${dept}`;

  // 4. Outcomes ("What I can help you achieve")
  let outcomes = mentor.outcomes;
  if (!outcomes || outcomes.length === 0) {
    const s1 = skills[0] || "Programming";
    const s2 = skills[1] || "Backend development";
    outcomes = [
      `Build your first end-to-end ${s1} project`,
      `Learn and master ${s2} step-by-step`,
      `Crack hackathons & build winning portfolio projects`,
      `Prepare for technical coding interviews & code reviews`,
    ];
  }

  // 5. Ask me anything about
  let askMe = mentor.ask_me_anything?.map((topic) => ({ topic, icon: getEmojiForTopic(topic) }));
  if (!askMe || askMe.length === 0) {
    const defaultTopics = [
      skills[0] || "Python",
      skills[1] || "Backend",
      "Hackathons",
      skills[2] || "Docker",
      "Interview Prep",
    ];
    askMe = defaultTopics.map((topic) => ({
      topic,
      icon: getEmojiForTopic(topic),
    }));
  }

  // 6. Ideal Mentees ("Perfect if you are...")
  let idealMentees = mentor.ideal_mentees;
  if (!idealMentees || idealMentees.length === 0) {
    const mainSkill = skills[0] || "coding";
    idealMentees = [
      `Beginner looking to start with ${mainSkill}`,
      `Preparing for upcoming hackathons & competitions`,
      `Building portfolio projects in ${dept}`,
      `Wanting clear, step-by-step guidance & roadmaps`,
    ];
  }

  // 7. Experiences — mentor-entered, no fallback. An invented work history
  // read as real, so an empty list now just means the section is empty.
  const experiences = mentor.experiences || [];

  // 8. Projects — same as experiences: real entries only.
  const projects = mentor.projects || [];

  // 9. Availability Schedule
  const availability_schedule = {
    status_text: mentor.is_available === false ? "Currently paused" : "Usually replies today",
    response_time: mentor.availability_schedule?.response_time || "Replies within 3 hours",
    response_rate: mentor.availability_schedule?.response_rate || "91% response rate",
    mentees_count: mentor.availability_schedule?.mentees_count || Math.max(12, Math.floor(mentor.review_count * 4 + 8)),
    available_days: mentor.availability_schedule?.available_days || ["Mon", "Wed", "Fri"],
    typical_time: mentor.availability_schedule?.typical_time || "Evening (6 PM - 10 PM)",
  };

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
    availability_schedule,
  };
}

function getEmojiForTopic(topic: string): string {
  const t = topic.toLowerCase();
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
