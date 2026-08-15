/**
 * Intelligent Query Engine: Tokenization, Campus Synonyms, Department Extraction,
 * Typo Tolerance, and Cross-Field Relevance Scoring for Friendly Learning SRMAP.
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
};

// Role & entity words that indicate intent but should not be treated as person names or content filters
export const ROLE_KEYWORDS = new Set([
  "mentor", "mentors", "mentorship", "faculty", "faculties", "prof", "profs",
  "professor", "professors", "teacher", "teachers", "lecturer", "lecturers",
  "senior", "seniors", "student", "students", "guide", "guides", "tutor", "tutors",
  "sir", "madam", "maam", "dr", "dr.", "mr", "mr.", "ms", "ms.", "mrs", "mrs."
]);

export const STOP_WORDS = new Set([
  "i", "want", "to", "learn", "how", "can", "who", "help", "me", "with", "is",
  "a", "an", "the", "for", "in", "on", "of", "and", "or", "best", "which", "any",
  "about", "find", "looking", "need", "please", "tell", "show", "am", "are", "what",
  "where", "do", "does", "someone", "anyone", "good", "great", "top", "as", "at"
]);

// Campus vocabulary for typo correction
export const CAMPUS_VOCABULARY = [
  "python", "javascript", "typescript", "react", "node", "fastapi", "docker", "kubernetes",
  "c++", "java", "rust", "golang", "sql", "postgresql", "mongodb", "redis", "qiskit", "pennylane",
  "quantum", "machine", "learning", "artificial", "intelligence", "neural", "networks", "vision",
  "computer", "science", "engineering", "electronics", "mechanical", "physics", "chemistry",
  "mathematics", "biology", "economics", "management", "hackathon", "competition", "internship",
  "mentor", "faculty", "professor", "cybersecurity", "blockchain", "robotics", "algorithms",
  "structures", "research", "project", "database", "cloud", "security"
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

export interface ParsedQuery {
  raw: string;
  cleaned: string;
  tokens: string[];
  /** Core subject/person tokens (excluding stop words AND role keywords like "faculty", "mentor") */
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
  intent: "general" | "people" | "faculty" | "mentor" | "opportunity" | "community" | "post";
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

  // 1. Detect Intent
  let intent: ParsedQuery["intent"] = "general";
  if (rawWords.some((w) => ["prof", "professor", "dr", "faculty", "teacher", "lecturer"].includes(w))) {
    intent = "faculty";
  } else if (rawWords.some((w) => ["mentor", "senior", "buddy", "tutor", "mentorship"].includes(w))) {
    intent = "mentor";
  } else if (rawWords.some((w) => ["hackathon", "contest", "competition", "sih", "internship"].includes(w))) {
    intent = "opportunity";
  } else if (rawWords.some((w) => ["group", "club", "society", "community"].includes(w))) {
    intent = "community";
  } else if (rawWords.some((w) => ["post", "thread", "discussion", "reply"].includes(w))) {
    intent = "post";
  }

  // 2. Detect Department from single words or multi-word phrases
  let detectedDepartment: string | null = null;
  const expandedPhrasesSet = new Set<string>();

  // Check multi-word department phrases first (e.g. "computer science")
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

    // Expand synonyms / acronyms
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

    // Name tokens (strip honorifics and stop words)
    if (!ROLE_KEYWORDS.has(word) && !STOP_WORDS.has(word)) {
      subjectTokens.push(word);
      nameTokens.push(word);
    }
  }

  const suggestedQuery = hasCorrection ? correctedWords.join(" ") : null;

  // Clean human-readable topic for AI Overview
  let cleanTopic = subjectTokens.join(" ").trim();
  if (detectedDepartment && !cleanTopic.toLowerCase().includes(detectedDepartment.toLowerCase())) {
    cleanTopic = `${detectedDepartment} ${cleanTopic}`.trim();
  }
  if (!cleanTopic) cleanTopic = normalized;

  // Capitalize nicely
  cleanTopic = cleanTopic.charAt(0).toUpperCase() + cleanTopic.slice(1);

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

  // Full exact match
  if (titleLower === queryLower) return 1.0;

  // Title contains exact phrase
  if (titleLower.includes(queryLower)) return 0.9;

  // Title contains all name tokens
  if (nameTokens.length > 0 && nameTokens.every((token) => titleLower.includes(token))) {
    return 0.8;
  }

  return 0;
}
