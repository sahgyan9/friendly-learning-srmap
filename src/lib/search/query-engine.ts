/**
 * Intelligent Query Engine: Multi-Archetype Intent Classification,
 * Tokenization, Campus Synonyms, Department Extraction, Typo Tolerance,
 * and Cross-Field Relevance Scoring for Friendly Learning SRMAP.
 */

// ─── 1. Campus Departments & Disciplines ─────────────────────────────────────

export const CAMPUS_DEPARTMENTS: Record<string, string> = {
  physics: "Physics",
  phys: "Physics",
  cse: "Computer Science and Engineering",
  cs: "Computer Science and Engineering",
  "computer science": "Computer Science and Engineering",
  ece: "Electronics and Communication Engineering",
  electronics: "Electronics and Communication Engineering",
  me: "Mechanical Engineering",
  mech: "Mechanical Engineering",
  mechanical: "Mechanical Engineering",
  ce: "Civil Engineering",
  civil: "Civil Engineering",
  biology: "Biological Sciences",
  bio: "Biological Sciences",
  biotech: "Biological Sciences",
  biotechnology: "Biological Sciences",
  chemistry: "Chemistry",
  chem: "Chemistry",
  mathematics: "Mathematics",
  math: "Mathematics",
  maths: "Mathematics",
  economics: "Economics",
  econ: "Economics",
  management: "Management",
  mgmt: "Management",
  business: "Management",
  mba: "Management",
};

// ─── 2. Campus Synonyms & Acronyms ───────────────────────────────────────────

export const CAMPUS_SYNONYMS: Record<string, string[]> = {
  // Departments
  cse: ["computer science and engineering", "computer science", "cs"],
  cs: ["computer science and engineering", "computer science", "cse"],
  ece: ["electronics and communication engineering", "electronics"],
  ee: ["electrical and electronics engineering", "electrical"],
  eee: ["electrical and electronics engineering"],
  me: ["mechanical engineering", "mechanical", "mech"],
  mech: ["mechanical engineering", "mechanical", "me"],
  ce: ["civil engineering", "civil"],
  bio: ["biological sciences", "biology", "biotechnology"],
  mgmt: ["management", "business", "mba"],
  econ: ["economics"],
  phys: ["physics"],
  chem: ["chemistry"],
  math: ["mathematics", "maths"],

  // Fields & Technologies
  ai: ["artificial intelligence", "machine learning", "ml"],
  ml: ["machine learning", "artificial intelligence", "ai"],
  dl: ["deep learning", "neural networks"],
  nlp: ["natural language processing", "computational linguistics"],
  cv: ["computer vision", "image processing"],
  dsa: ["data structures and algorithms", "data structures", "algorithms"],
  cp: ["competitive programming", "algorithms"],
  web: ["web development", "frontend", "backend", "full stack"],
  webdev: ["web development", "frontend", "backend", "full stack"],
  dev: ["development", "developer", "software engineering"],
  app: ["mobile applications", "app development", "android", "ios"],
  cyber: ["cyber security", "cybersecurity", "information security"],
  cybersecurity: ["cyber security", "information security"],
  iot: ["internet of things", "embedded systems"],
  cloud: ["cloud computing", "aws", "azure", "gcp"],
  db: ["database", "sql", "dbms"],
  dbms: ["database management systems", "database", "sql"],
  os: ["operating systems"],
  cn: ["computer networks", "networking"],

  // Competitions & Events
  sih: ["smart india hackathon", "hackathon"],
  hackathon: ["hackathon", "smart india hackathon", "coding contest"],
  contest: ["competition", "hackathon", "contest"],

  // Student Stages & Guides
  fresher: ["first year", "freshers", "1st year", "orientation", "getting started"],
  freshers: ["first year", "fresher", "1st year", "orientation", "getting started"],
  "first year": ["freshers", "fresher", "1st year", "orientation"],
};

// Role & entity words that indicate intent but should not be treated as person names or content filters
export const ROLE_KEYWORDS = new Set([
  "mentor", "mentors", "mentorship", "faculty", "faculties", "prof", "profs",
  "professor", "professors", "teacher", "teachers", "lecturer", "lecturers",
  "senior", "seniors", "student", "students", "guide", "guides", "tutor", "tutors",
  "sir", "madam", "maam", "dr", "dr.", "mr", "mr.", "ms", "ms.", "mrs", "mrs."
]);

export const STOP_WORDS = new Set([
  "i", "am", "want", "to", "learn", "how", "can", "who", "help", "me", "with", "is",
  "a", "an", "the", "for", "in", "on", "of", "and", "or", "best", "which", "any",
  "about", "find", "looking", "need", "please", "tell", "show", "are", "what",
  "where", "do", "does", "someone", "anyone", "good", "great", "top", "as", "at",
  "from", "by", "some", "my", "our", "you", "your", "give"
]);

// Campus vocabulary for typo correction
export const CAMPUS_VOCABULARY = [
  "python", "javascript", "typescript", "react", "node", "fastapi", "docker", "kubernetes",
  "c++", "java", "rust", "golang", "sql", "postgresql", "mongodb", "redis", "qiskit", "pennylane",
  "quantum", "machine", "learning", "artificial", "intelligence", "neural", "networks", "vision",
  "computer", "science", "engineering", "electronics", "mechanical", "physics", "chemistry",
  "mathematics", "biology", "economics", "management", "hackathon", "competition", "internship",
  "mentor", "faculty", "professor", "cybersecurity", "blockchain", "robotics", "algorithms",
  "structures", "research", "project", "database", "cloud", "security", "freshers", "electives"
];

// ─── 3. Levenshtein Distance for Typo Tolerance ─────────────────────────────

export function levenshteinDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  const matrix: number[][] = [];
  for (let i = 0; i <= b.length; i++) {
    matrix[i] = [i];
  }
  for (let j = 0; j <= a.length; j++) {
    matrix[0][j] = j;
  }

  for (let i = 1; i <= b.length; i++) {
    for (let j = 1; j <= a.length; j++) {
      if (b.charAt(i - 1) === a.charAt(j - 1)) {
        matrix[i][j] = matrix[i - 1][j - 1];
      } else {
        matrix[i][j] = Math.min(
          matrix[i - 1][j - 1] + 1,
          matrix[i][j - 1] + 1,
          matrix[i - 1][j] + 1,
        );
      }
    }
  }

  return matrix[b.length][a.length];
}

export function correctTypo(word: string): string | null {
  const clean = word.toLowerCase().trim();
  if (clean.length < 3) return null;
  if (CAMPUS_VOCABULARY.includes(clean)) return null;

  let bestMatch: string | null = null;
  let minDistance = 3;

  for (const vocab of CAMPUS_VOCABULARY) {
    const dist = levenshteinDistance(clean, vocab);
    const threshold = clean.length <= 5 ? 1 : 2;
    if (dist <= threshold && dist < minDistance) {
      minDistance = dist;
      bestMatch = vocab;
    }
  }

  return bestMatch;
}

// ─── 4. Query Analysis & Tokenization ────────────────────────────────────────

export type QueryIntent =
  | "informational"    // Guides, How-To, Stage-based (e.g. "I am fresher need help", "how to choose electives")
  | "entity_lookup"    // Exact person search (e.g. "Dr. Krishna Prasad", "Aarav Raj")
  | "domain_subject"   // Subject/Skill search (e.g. "Physics", "Machine learning", "Quantum")
  | "opportunity"      // Events & Competitions (e.g. "Hackathons", "SIH 2026")
  | "community"        // Groups & Clubs (e.g. "Robotics club")
  | "post"             // Discussion threads (e.g. "Campus posts")
  | "general";         // Broad overview

export interface ParsedQuery {
  raw: string;
  cleaned: string;
  tokens: string[];
  /** Core subject/person tokens (excluding stop words AND role keywords) */
  subjectTokens: string[];
  /** Name tokens for person exact matching (excludes honorifics) */
  nameTokens: string[];
  /** Explicitly detected department if any (e.g. "Physics", "Computer Science and Engineering") */
  detectedDepartment: string | null;
  /** Expanded department / domain phrases */
  expandedPhrases: string[];
  /** Suggested typo correction for the entire query, if any */
  suggestedQuery: string | null;
  /** Clean human-readable topic summary for AI Overview */
  cleanTopic: string;
  /** Primary search intent */
  intent: QueryIntent;
  /** Sub-intent for informational guidance */
  infoTopic?: "fresher_guide" | "academic_help" | "faculty_contact" | "electives" | "hackathon_prep" | "general_guide";
}

export function parseQuery(query: string): ParsedQuery {
  const raw = query.trim();
  const lower = raw.toLowerCase();

  // Normalize punctuation
  const normalized = lower.replace(/[^\w\s\+\#\.\-]/g, " ").replace(/\s+/g, " ").trim();
  const rawWords = normalized.split(" ").filter(Boolean);

  const tokens: string[] = [];
  const subjectTokens: string[] = [];
  const nameTokens: string[] = [];
  const correctedWords: string[] = [];
  let hasCorrection = false;

  // 1. Check for Informational / Stage-based Intent
  let intent: QueryIntent = "general";
  let infoTopic: ParsedQuery["infoTopic"] = undefined;

  const isFresherQuery = rawWords.some((w) =>
    ["fresher", "freshers", "firstyear", "beginner", "newbie"].includes(w)
  ) || normalized.includes("first year") || normalized.includes("1st year");

  const isHowToQuery =
    normalized.startsWith("how to") ||
    normalized.startsWith("how do") ||
    normalized.startsWith("how can") ||
    normalized.startsWith("where do") ||
    rawWords.includes("guide") ||
    rawWords.includes("tips") ||
    rawWords.includes("advice") ||
    normalized.includes("help from") ||
    normalized.includes("need help");

  const isElectiveQuery = rawWords.some((w) => ["elective", "electives", "registration", "credits"].includes(w));
  const isHackathonGuide = (rawWords.includes("hackathon") || rawWords.includes("sih")) && (isHowToQuery || rawWords.includes("teammates") || rawWords.includes("team"));

  if (isFresherQuery) {
    intent = "informational";
    infoTopic = "fresher_guide";
  } else if (isElectiveQuery) {
    intent = "informational";
    infoTopic = "electives";
  } else if (isHackathonGuide) {
    intent = "informational";
    infoTopic = "hackathon_prep";
  } else if (isHowToQuery) {
    intent = "informational";
    infoTopic = rawWords.some((w) => ["prof", "professor", "faculty"].includes(w))
      ? "faculty_contact"
      : "academic_help";
  } else if (rawWords.some((w) => ["hackathon", "contest", "competition", "sih", "internship"].includes(w))) {
    intent = "opportunity";
  } else if (rawWords.some((w) => ["group", "club", "society", "community"].includes(w))) {
    intent = "community";
  } else if (rawWords.some((w) => ["post", "thread", "discussion", "reply"].includes(w))) {
    intent = "post";
  } else if (rawWords.some((w) => ["dr", "prof", "sir"].includes(w)) || (rawWords.length >= 2 && !rawWords.some(w => STOP_WORDS.has(w)))) {
    intent = "entity_lookup";
  } else if (rawWords.some((w) => ["faculty", "prof", "professor", "mentor"].includes(w))) {
    intent = "domain_subject";
  }

  // 2. Detect Department from single words or multi-word phrases
  let detectedDepartment: string | null = null;
  const expandedPhrasesSet = new Set<string>();

  for (const [key, deptName] of Object.entries(CAMPUS_DEPARTMENTS)) {
    if (normalized.includes(key)) {
      detectedDepartment = deptName;
      expandedPhrasesSet.add(deptName.toLowerCase());
      if (CAMPUS_SYNONYMS[key]) {
        CAMPUS_SYNONYMS[key].forEach((syn) => expandedPhrasesSet.add(syn));
      }
      break;
    }
  }

  for (const word of rawWords) {
    tokens.push(word);

    // Expand synonyms
    if (CAMPUS_SYNONYMS[word]) {
      CAMPUS_SYNONYMS[word].forEach((syn) => expandedPhrasesSet.add(syn));
    }

    // Check for typo
    const correction = correctTypo(word);
    if (correction && correction !== word) {
      correctedWords.push(correction);
      hasCorrection = true;
      if (CAMPUS_SYNONYMS[correction]) {
        CAMPUS_SYNONYMS[correction].forEach((syn) => expandedPhrasesSet.add(syn));
      }
    } else {
      correctedWords.push(word);
    }

    // Filter subject & name tokens
    if (!ROLE_KEYWORDS.has(word) && !STOP_WORDS.has(word)) {
      subjectTokens.push(word);
      nameTokens.push(word);
    }
  }

  const suggestedQuery = hasCorrection ? correctedWords.join(" ") : null;

  // 3. Clean human-readable topic formulation
  let cleanTopic = "";
  if (intent === "informational") {
    if (infoTopic === "fresher_guide") {
      cleanTopic = "Fresher Onboarding & Faculty Guidance";
    } else if (infoTopic === "faculty_contact") {
      cleanTopic = "Approaching Faculty & Office Hours";
    } else if (infoTopic === "electives") {
      cleanTopic = "Choosing Electives & Course Selection";
    } else if (infoTopic === "hackathon_prep") {
      cleanTopic = "Hackathon Preparation & Team Building";
    } else {
      cleanTopic = "Academic Help & Mentorship";
    }
  } else {
    cleanTopic = subjectTokens.join(" ").trim();
    if (detectedDepartment && !cleanTopic.toLowerCase().includes(detectedDepartment.toLowerCase())) {
      cleanTopic = `${detectedDepartment} ${cleanTopic}`.trim();
    }
    if (!cleanTopic) cleanTopic = normalized;
    cleanTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);
  }

  return {
    raw,
    cleaned: normalized,
    tokens,
    subjectTokens: subjectTokens.length > 0 ? subjectTokens : tokens,
    nameTokens: nameTokens.length > 0 ? nameTokens : tokens,
    detectedDepartment,
    expandedPhrases: Array.from(expandedPhrasesSet),
    suggestedQuery,
    cleanTopic,
    intent,
    infoTopic,
  };
}

/**
 * Checks if target string matches all or majority of search tokens.
 */
export function fuzzyMatchTokens(target: string, tokens: string[]): boolean {
  if (!target || tokens.length === 0) return false;
  const targetLower = target.toLowerCase();
  return tokens.every((token) => targetLower.includes(token.toLowerCase()));
}

/**
 * Computes exact match score boost (0 to 1).
 */
export function calculateExactBoost(title: string, query: string, nameTokens: string[]): number {
  if (!title || !query) return 0;
  const titleLower = title.toLowerCase();
  const queryLower = query.toLowerCase().trim();

  if (titleLower === queryLower) return 1.0;
  if (titleLower.includes(queryLower)) return 0.9;
  if (nameTokens.length > 0 && nameTokens.every((token) => titleLower.includes(token))) {
    return 0.8;
  }

  return 0;
}
