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
  // Pronouns & conversational subjects
  "i", "me", "my", "myself", "we", "us", "our", "ours", "you", "your", "yours",
  "he", "him", "his", "she", "her", "hers", "they", "them", "their", "theirs", "it", "its",
  "anyone", "anybody", "anything", "someone", "somebody", "something", "everyone", "everybody", "everything",
  "one", "ones", "person", "people", "guy", "guys", "folks", "any", "some", "none", "all", "each", "every",

  // Inquiry & Question words
  "who", "whom", "whose", "which", "what", "where", "when", "why", "how",

  // Helping / Auxiliary / Action verbs in conversational questions
  "can", "could", "would", "should", "will", "shall", "may", "might", "must",
  "am", "is", "are", "was", "were", "be", "been", "being",
  "have", "has", "had", "having",
  "do", "does", "did", "doing",
  "get", "gets", "got", "getting",
  "take", "takes", "took", "taking",
  "make", "makes", "made", "making",
  "want", "wants", "wanted", "wanting",
  "need", "needs", "needed", "needing",
  "like", "likes", "liked", "liking",
  "know", "knows", "knew", "knowing",
  "find", "finds", "found", "finding",
  "look", "looks", "looking", "looked",
  "search", "searching", "searched",
  "contact", "contacts", "contacting", "contacted",
  "connect", "connects", "connecting", "connected",
  "reach", "reaches", "reaching", "reached",
  "talk", "talks", "talking", "talked",
  "speak", "speaks", "speaking", "spoke",
  "ask", "asks", "asking", "asked",
  "tell", "tells", "telling", "told",
  "show", "shows", "showing", "showed",
  "give", "gives", "giving", "gave",
  "learn", "learns", "learning", "learned",
  "teach", "teaches", "teaching", "taught",
  "study", "studies", "studying", "studied",
  "guide", "guides", "guiding", "guided",
  "help", "helps", "helping", "helped",

  // Prepositions, Conjunctions & Articles
  "a", "an", "the", "for", "in", "on", "of", "to", "at", "by", "from", "with", "about",
  "into", "through", "during", "before", "after", "above", "below", "between", "under",
  "and", "or", "but", "if", "so", "as", "than", "because", "while", "wherever", "whenever",
  "please", "thanks", "thank", "good", "great", "best", "top", "better", "really", "very", "also", "just", "well"
]);

/**
 * Multi-word technical terms whose other half is an ordinary English word.
 *
 * "learning" is a stop word for good reason — "help me learning python" — and
 * "systems", "science" and "processing" are generic research noise on their
 * own. But dropping them mid-phrase destroys the term: "machine learning
 * faculty" was distilling to "machine", which embeds toward *mechanical*
 * engineering, and the search returned metallurgy professors for the most
 * common technical query on this campus.
 *
 * A word listed here survives filtering only when the query actually contains
 * the whole phrase, so "learning" is still dropped from "want help learning
 * python" — the stop word is right in isolation and wrong inside a term.
 */
export const TECHNICAL_PHRASES = [
  "machine learning",
  "deep learning",
  "reinforcement learning",
  "transfer learning",
  "federated learning",
  "supervised learning",
  "unsupervised learning",
  "statistical learning",
  "representation learning",
  "data structures",
  "data science",
  "computer science",
  "computer vision",
  "natural language processing",
  "signal processing",
  "image processing",
  "quantum computing",
  "high performance computing",
  "distributed systems",
  "embedded systems",
  "operating systems",
  "control systems",
  "software engineering",
  "materials science",
];

/** Words that must survive filtering because the query used them inside a technical phrase. */
export function protectedPhraseWords(normalized: string): Set<string> {
  const protectedWords = new Set<string>();
  for (const phrase of TECHNICAL_PHRASES) {
    if (normalized.includes(phrase)) {
      phrase.split(" ").forEach((word) => protectedWords.add(word));
    }
  }
  return protectedWords;
}

// Generic research modifier words that should not trigger isolated full-table matches
export const GENERIC_RESEARCH_WORDS = new Set([
  "development", "design", "systems", "system", "analysis", "engineering", "structures", "structure",
  "studies", "study", "science", "technologies", "technology", "applications", "application",
  "materials", "material", "methods", "method", "models", "model", "modeling", "computation",
  "computational", "algorithms", "algorithm", "theory", "theoretical", "experimental", "experiments",
  "experiment", "optimization", "processing", "framework", "frameworks", "approach", "approaches",
  "solutions", "solution", "investigation", "advancement", "advancements"
]);

/**
 * Programme, branch and cohort words: who is asking, not what is being asked.
 *
 * "when are midterms for btech cse 7th sem starting" is the same question as
 * "when are midterms". The extra words narrow *whose* midterms, and none of
 * them appear in the academic calendar chunk that holds the answer — but they
 * are half the tokens, so embedding them drowns the actual question. Worse,
 * "cse" also matched CAMPUS_DEPARTMENTS, which prepended the full phrase
 * "Computer Science and Engineering" to the embedded text; every faculty chunk
 * in the index reads "Department of Computer Science and Engineering" verbatim,
 * so the query landed in the middle of the people cluster and came back with 23
 * professors and zero guidelines.
 *
 * These are filters, not topic. They are kept in `tokens` and in
 * `qualifierTokens` so a future filter can use them, and dropped from the text
 * that gets embedded.
 */
export const QUALIFIER_TOKENS = new Set([
  // Programmes
  "btech", "b.tech", "be", "mtech", "m.tech", "msc", "m.sc", "bsc", "b.sc",
  "mba", "bba", "phd", "integrated", "dual",
  // Cohort / stage
  "sem", "semester", "semesters", "term", "year", "yr", "batch", "section",
  "branch", "stream", "programme", "cohort",
  "1st", "2nd", "3rd", "4th", "5th", "6th", "7th", "8th",
  "second", "third", "fourth", "fifth", "sixth", "seventh", "eighth",
]);

/** Ordinals ("7th", "12th") are qualifiers whatever number they carry. */
export function isQualifierToken(word: string): boolean {
  const clean = word.toLowerCase().trim();
  if (QUALIFIER_TOKENS.has(clean)) return true;
  return /^\d{1,2}(st|nd|rd|th)$/.test(clean);
}

/**
 * Words that make a query a question about *when*, not about *who*.
 *
 * The answer to these lives in the academic calendar and the notice board, and
 * nowhere near a person's profile. Detecting the shape is what lets retrieval
 * aim at documents before ranking ever gets a say — and ranking cannot rescue
 * a row that was never retrieved, which is exactly what went wrong here.
 */
export const TEMPORAL_MARKERS = new Set([
  "when", "date", "dates", "deadline", "deadlines", "schedule", "scheduled",
  "timetable", "timing", "timings", "starts", "start", "starting", "begin",
  "begins", "beginning", "ends", "ending", "due", "duration", "reopening",
  "reopen", "vacation", "holidays", "holiday", "exam", "exams", "midterm",
  "midterms", "endterm", "endterms", "calendar", "result", "results",
]);

export function hasTemporalMarker(rawWords: string[], normalized: string): boolean {
  return (
    rawWords.some((w) => TEMPORAL_MARKERS.has(w)) ||
    normalized.includes("last date") ||
    normalized.includes("how long")
  );
}

/**
 * Checks if a search token matches inside text using whole word boundaries.
 * Prevents subword false matches like 'to' inside 'protocol' or 'can' inside 'candidates'.
 *
 * The regex is deliberately open-ended on the right, so the token "midterm"
 * matches the text "midterms". The reverse did not hold, and that asymmetry
 * mattered: a student types the plural far more often than the corpus writes
 * it, so `hasTopicalMatch` was rejecting the very calendar section that
 * answered the question. A singular retry closes the gap in both directions.
 */
export function matchesWordBoundary(text: string, token: string): boolean {
  if (!text || !token) return false;
  const cleanTok = token.trim().toLowerCase();
  if (!cleanTok) return false;
  const escape = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  if (new RegExp(`\\b${escape(cleanTok)}`, "i").test(text)) return true;

  const singular = singularise(cleanTok);
  if (singular === cleanTok) return false;
  return new RegExp(`\\b${escape(singular)}`, "i").test(text);
}

/**
 * Crude English singulariser, used only to decide whether two forms of the
 * same word should count as the same word. Wrong on irregulars, which is
 * acceptable: the cost of a miss is one unmatched token, not a wrong answer.
 */
export function singularise(word: string): string {
  const clean = word.toLowerCase().trim();
  if (clean.length <= 3) return clean;
  if (clean.endsWith("ies") && clean.length > 4) return `${clean.slice(0, -3)}y`;
  if (clean.endsWith("ses") || clean.endsWith("xes") || clean.endsWith("zes") || clean.endsWith("ches") || clean.endsWith("shes")) {
    return clean.slice(0, -2);
  }
  if (clean.endsWith("s") && !clean.endsWith("ss") && !clean.endsWith("us")) return clean.slice(0, -1);
  return clean;
}

/**
 * Extracts meaningful subject and name tokens from a search query for SERP highlighting.
 * Strictly excludes stop words, conversational verbs, and role keywords.
 */
export function extractMeaningfulTokens(query: string): string[] {
  if (!query || !query.trim()) return [];
  const parsed = parseQuery(query);
  const rawTokens = [
    ...parsed.subjectTokens,
    ...parsed.nameTokens,
    ...(parsed.detectedDepartment ? [parsed.detectedDepartment] : []),
  ];
  return Array.from(
    new Set(
      rawTokens
        .map((t) => t.toLowerCase().trim())
        .filter(
          (t) =>
            t.length >= 2 &&
            !STOP_WORDS.has(t) &&
            !ROLE_KEYWORDS.has(t),
        ),
    ),
  );
}

// Campus vocabulary for typo correction
export const CAMPUS_VOCABULARY = [
  "python", "javascript", "typescript", "react", "node", "fastapi", "docker", "kubernetes",
  "c++", "java", "rust", "golang", "sql", "postgresql", "mongodb", "redis", "qiskit", "pennylane",
  "quantum", "machine", "learning", "artificial", "intelligence", "neural", "networks", "vision",
  "computer", "science", "engineering", "electronics", "mechanical", "physics", "chemistry",
  "mathematics", "biology", "economics", "management", "hackathon", "competition", "internship",
  "mentor", "faculty", "professor", "cybersecurity", "blockchain", "robotics", "algorithms",
  "structures", "research", "project", "database", "cloud", "security", "freshers", "electives",
  "tomorrow", "today", "yesterday", "holiday", "holidays", "calendar", "midterm", "endterm", "curfew", "attendance"
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

/**
 * A misspelling is not the same thing as a word this list happens not to hold.
 *
 * CAMPUS_VOCABULARY stores "midterm", so a student typing "midterms" — correct
 * English, and the commoner form — was told *Did you mean "midterm"?* on the
 * first line of the results page. Levenshtein distance cannot tell an inflection
 * from a typo: both are one edit away. Only morphology can, so plural, gerund
 * and past forms of a known word are treated as known.
 *
 * Programme and cohort words are exempt too — "sem" is a real thing students
 * type and sits one edit from several vocabulary entries.
 */
export function correctTypo(word: string): string | null {
  const clean = word.toLowerCase().trim();
  if (clean.length < 3) return null;
  if (CAMPUS_VOCABULARY.includes(clean)) return null;
  if (isQualifierToken(clean)) return null;
  if (CAMPUS_VOCABULARY.includes(singularise(clean))) return null;

  let bestMatch: string | null = null;
  let minDistance = 3;

  for (const vocab of CAMPUS_VOCABULARY) {
    // An inflection of a vocabulary word is that word, not a typo of it.
    if (isInflectionOf(clean, vocab)) return null;

    const dist = levenshteinDistance(clean, vocab);
    const threshold = clean.length <= 5 ? 1 : 2;
    if (dist <= threshold && dist < minDistance) {
      minDistance = dist;
      bestMatch = vocab;
    }
  }

  // A "correction" that only changes the ending is a stem, and suggesting it
  // reads as the search not knowing English rather than as a helpful fix.
  if (bestMatch && isInflectionOf(clean, bestMatch)) return null;

  return bestMatch;
}

/** True when `word` is `base` carrying an ordinary English suffix, or vice versa. */
export function isInflectionOf(word: string, base: string): boolean {
  if (word === base) return true;
  if (singularise(word) === singularise(base)) return true;
  const [longer, shorter] = word.length >= base.length ? [word, base] : [base, word];
  if (!longer.startsWith(shorter)) return false;
  return ["s", "es", "ing", "ed", "d", "ly"].includes(longer.slice(shorter.length));
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

export type TargetCategory = "mentors" | "faculty" | "opportunities" | "communities" | "posts" | "blog" | "documents";

/**
 * Words re-added to the embedded query when the reader named a category.
 *
 * Only the two people types are listed. Faculty and mentor chunks are near
 * neighbours in embedding space — both are "a person at SRM-AP who knows
 * about X" — so the role noun is what separates them, and it is exactly the
 * word the distiller strips. The other categories are already well separated
 * by their own content and gain nothing from keyword stuffing.
 */
const ROLE_TERMS: Partial<Record<TargetCategory, string[]>> = {
  faculty: ["faculty", "professor"],
  mentors: ["senior", "student", "mentor"],
};

export interface ParsedQuery {
  raw: string;
  cleaned: string;
  tokens: string[];
  /** Core subject/person tokens (excluding stop words AND role keywords) */
  subjectTokens: string[];
  /** Specific domain tokens (excluding generic modifier words like 'development', 'design', 'systems') */
  specificTokens: string[];
  /** Specific subject tokens excluding generic research noise (e.g. 'development', 'analysis') */
  filteredFacultyTokens: string[];
  /** Name tokens for person exact matching (excludes honorifics) */
  nameTokens: string[];
  /** Programme / branch / cohort words: who is asking, not what is asked. */
  qualifierTokens: string[];
  /** Explicitly detected department if any (e.g. "Physics", "Computer Science and Engineering") */
  detectedDepartment: string | null;
  /** Expanded department / domain phrases */
  expandedPhrases: string[];
  /** Suggested typo correction for the entire query, if any */
  suggestedQuery: string | null;
  /** Clean human-readable topic summary for AI Overview */
  cleanTopic: string;
  /** Distilled semantic query for vector embedding search without conversational noise */
  semanticQuery: string;
  /** Every phrasing to embed and fuse. `semanticQuery` is always the first. */
  retrievalQueries: string[];
  /**
   * What the reader is asking *about*, for the full-text leg — content words
   * only, with no role noun and nothing this parser synthesised.
   *
   * Not the same string as `semanticQuery`, and the difference matters. The
   * vector leg wants the role noun because the corpus writes it verbatim
   * ("Faculty member at SRM University-AP"), so ROLE_TERMS gets appended there.
   * A keyword search on that same string matches the literal word "professor"
   * wherever it appears — and a policy document containing it then scores
   * lexical evidence for a query about quantum computing.
   */
  keywordQuery: string;
  /** Primary search intent */
  intent: QueryIntent;
  /** Explicit targeted entity category (e.g. 'mentors', 'faculty', 'opportunities') */
  targetCategory?: TargetCategory;
  /** Sub-intent for informational guidance */
  infoTopic?: "fresher_guide" | "academic_help" | "faculty_contact" | "electives" | "hackathon_prep" | "general_guide";
}

export function parseQuery(query: string): ParsedQuery {
  const raw = query.trim();
  const lower = raw.toLowerCase();

  // Normalize punctuation: split periods, commas, slashes into spaces so words aren't glued together
  const normalized = lower.replace(/[^\w\s\+\#\-]/g, " ").replace(/\s+/g, " ").trim();
  const rawWords = normalized.split(" ").filter(Boolean);

  const tokens: string[] = [];
  const subjectTokens: string[] = [];
  const nameTokens: string[] = [];
  const qualifierTokens: string[] = [];
  const correctedWords: string[] = [];
  let hasCorrection = false;

  // 1. Detect Target Category & Intent
  let intent: QueryIntent = "general";
  let targetCategory: TargetCategory | undefined = undefined;
  let infoTopic: ParsedQuery["infoTopic"] = undefined;

  const isMentorExplicit =
    rawWords.some((w) => ["mentor", "mentors", "mentorship", "senior", "seniors", "tutor", "tutors"].includes(w)) ||
    normalized.includes("senior mentor") ||
    normalized.includes("student mentor") ||
    normalized.includes("peer guide");

  const isMentorConversational =
    normalized.includes("want someone") ||
    normalized.includes("need someone") ||
    normalized.includes("looking for someone") ||
    normalized.includes("find someone") ||
    normalized.includes("who can help") ||
    normalized.includes("who can teach") ||
    normalized.includes("who is good in") ||
    normalized.includes("who knows");

  const isFacultyExplicit =
    rawWords.some((w) => ["faculty", "faculties", "prof", "profs", "professor", "professors", "lecturer", "dr", "dr."].includes(w)) ||
    normalized.includes("faculty member") ||
    normalized.includes("assistant professor") ||
    normalized.includes("associate professor");

  const isOppExplicit =
    rawWords.some((w) => ["hackathon", "hackathons", "sih", "contest", "contests", "competition", "competitions", "internship", "internships"].includes(w));

  const isCommunityExplicit =
    rawWords.some((w) => ["group", "groups", "club", "clubs", "society", "societies", "community", "communities", "workspace"].includes(w));

  const isPostExplicit =
    rawWords.some((w) => ["post", "posts", "thread", "threads", "discussion", "discussions", "reply"].includes(w));

  const isDocumentExplicit =
    rawWords.some((w) => ["penalty", "penalties", "curfew", "misconduct", "disciplinary", "attendance", "calendar", "midterm", "midterms", "endterm", "endterms", "holiday", "holidays", "regulations"].includes(w)) ||
    normalized.includes("code of conduct") ||
    normalized.includes("academic calendar") ||
    normalized.includes("what is the penalty") ||
    normalized.includes("what are the rules");

  // "when does X happen" is a calendar question even when X is a word this
  // parser has never seen. isDocumentExplicit only fires on a fixed list of
  // nouns, so "when do classes reopen" and "last date for re-registration"
  // both fell through to a generic people search.
  const isTemporalQuery = hasTemporalMarker(rawWords, normalized);

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

  // Container nouns before topic nouns. "group", "club" and "discussion"
  // describe *where* an answer lives and are almost never the subject; words
  // like "hackathon" and "internship" are usually the subject and only
  // sometimes the category. Checking opportunities first made "discussion
  // about internship experience" an opportunity query, which pushed the
  // matching threads below unrelated groups.
  if (isMentorExplicit || isMentorConversational) {
    targetCategory = "mentors";
  } else if (isFacultyExplicit) {
    targetCategory = "faculty";
  } else if (isCommunityExplicit) {
    targetCategory = "communities";
  } else if (isPostExplicit) {
    targetCategory = "posts";
  } else if (isOppExplicit) {
    targetCategory = "opportunities";
  } else if (isDocumentExplicit || isTemporalQuery) {
    // Last in the chain on purpose. "when can i meet a professor" is still a
    // faculty query — naming a person category outranks asking about a date.
    targetCategory = "documents";
  }

  if (isFresherQuery && !isMentorConversational) {
    intent = "informational";
    infoTopic = "fresher_guide";
    targetCategory = targetCategory || "blog";
  } else if (isElectiveQuery) {
    intent = "informational";
    infoTopic = "electives";
    targetCategory = targetCategory || "blog";
  } else if (isHackathonGuide) {
    intent = "informational";
    infoTopic = "hackathon_prep";
    targetCategory = targetCategory || "opportunities";
  } else if (isHowToQuery) {
    intent = "informational";
    infoTopic = rawWords.some((w) => ["prof", "professor", "faculty"].includes(w))
      ? "faculty_contact"
      : "academic_help";
    targetCategory = targetCategory || (infoTopic === "faculty_contact" ? "faculty" : "mentors");
  } else if (isOppExplicit) {
    intent = "opportunity";
  } else if (isCommunityExplicit) {
    intent = "community";
  } else if (isPostExplicit) {
    intent = "post";
  } else if (
    (rawWords.some((w) => ["dr", "dr.", "prof", "prof."].includes(w)) && rawWords.length >= 2) ||
    (rawWords.length >= 2 && rawWords.length <= 4 && !rawWords.some((w) => STOP_WORDS.has(w) || ROLE_KEYWORDS.has(w)))
  ) {
    intent = "entity_lookup";
  } else if (isMentorExplicit || isMentorConversational || isFacultyExplicit || rawWords.length > 0) {
    intent = "domain_subject";
  }

  // 2. Detect Department using strict word boundaries (prevents 'someone' matching 'me' or 'guidance' matching 'ce')
  let detectedDepartment: string | null = null;
  const expandedPhrasesSet = new Set<string>();

  for (const [key, deptName] of Object.entries(CAMPUS_DEPARTMENTS)) {
    // "me" is the department code for Mechanical Engineering and also the
    // commonest word in a conversational query. "who can help me with a
    // machine learning project" was being read as a Mechanical Engineering
    // search, which prepended "Mechanical Engineering" to the embedded query
    // and narrowed the faculty lookup to that one department. Anyone actually
    // looking for the department types "mech" or "mechanical", both of which
    // still work.
    if (!key.includes(" ") && STOP_WORDS.has(key)) continue;

    const isMultiWord = key.includes(" ");
    const isExactMatch = isMultiWord
      ? normalized.includes(key)
      : rawWords.includes(key) || new RegExp(`(^|\\s)${key}(\\s|$)`, "i").test(normalized);

    if (isExactMatch) {
      detectedDepartment = deptName;
      expandedPhrasesSet.add(deptName.toLowerCase());
      if (CAMPUS_SYNONYMS[key]) {
        CAMPUS_SYNONYMS[key].forEach((syn) => expandedPhrasesSet.add(syn));
      }
      break;
    }
  }

  const protectedWords = protectedPhraseWords(normalized);

  for (const word of rawWords) {
    tokens.push(word);

    // Expand synonyms — same stop-word guard as the department scan above,
    // or "help me" quietly expands into mechanical-engineering phrases.
    if (CAMPUS_SYNONYMS[word] && !STOP_WORDS.has(word)) {
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

    // Filter subject & name tokens. Qualifiers are held back the same way role
    // keywords are: recorded, because they say who is asking, but kept out of
    // the topic so they cannot dominate the embedded text.
    if (isQualifierToken(word) && !protectedWords.has(word)) {
      qualifierTokens.push(word);
    } else if (protectedWords.has(word) || (!ROLE_KEYWORDS.has(word) && !STOP_WORDS.has(word))) {
      subjectTokens.push(word);
      nameTokens.push(word);
    }
  }

  // Filter out generic research noise words if other specific tokens exist
  const specificTokens = subjectTokens.filter((t) => protectedWords.has(t) || !GENERIC_RESEARCH_WORDS.has(t));
  const filteredFacultyTokens = specificTokens.length > 0 ? specificTokens : subjectTokens;

  const suggestedQuery = hasCorrection ? correctedWords.join(" ") : null;

  // 3. Clean human-readable topic summary & semantic vector query
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

  // Semantic query: concise domain topic for vector search
  let semanticQuery = subjectTokens.join(" ").trim();

  // Expanding "cse" to "Computer Science and Engineering" helps when the reader
  // is looking for a person in that department, because that exact phrase is in
  // every faculty and mentor chunk. On a calendar or policy question it does
  // the opposite: it is the longest, most distinctive phrase in the embedded
  // text, and it points at people the question was never about.
  const departmentIsTopic = targetCategory !== "documents";
  if (
    detectedDepartment &&
    departmentIsTopic &&
    !semanticQuery.toLowerCase().includes(detectedDepartment.toLowerCase())
  ) {
    semanticQuery = `${detectedDepartment} ${semanticQuery}`.trim();
  }
  if (!semanticQuery) semanticQuery = normalized;

  // Keep the role word the reader actually used.
  //
  // Chunk text in the knowledge index literally reads "Faculty member at SRM
  // University-AP. Department of X" or "Senior student mentor…", so the role
  // noun is the single strongest discriminator the corpus offers. Stripping it
  // as a "category word" while simultaneously using it to set targetCategory
  // told the retriever the opposite of what the parser had just concluded:
  // "i am a fresher and want help from faculty" distilled to "fresher help",
  // which came back as mentors exclusively, with no faculty in the results at
  // all — no amount of re-ranking can recover a row that was never retrieved.
  const roleTerm = targetCategory ? ROLE_TERMS[targetCategory] : undefined;
  if (roleTerm && !roleTerm.some((word) => semanticQuery.includes(word))) {
    semanticQuery = `${semanticQuery} ${roleTerm.join(" ")}`.trim();
  }

  return {
    raw,
    cleaned: normalized,
    tokens,
    subjectTokens: subjectTokens.length > 0 ? subjectTokens : tokens,
    specificTokens,
    filteredFacultyTokens,
    nameTokens: nameTokens.length > 0 ? nameTokens : tokens,
    qualifierTokens,
    detectedDepartment,
    expandedPhrases: Array.from(expandedPhrasesSet),
    suggestedQuery,
    cleanTopic,
    semanticQuery,
    // Deliberately built from subjectTokens, which already exclude role
    // keywords, stop words and programme qualifiers — the words left are the
    // ones a lexical match should actually count for.
    keywordQuery: subjectTokens.length > 0 ? subjectTokens.join(" ") : normalized,
    retrievalQueries: buildRetrievalQueries({
      semanticQuery,
      normalized,
      subjectTokens,
      rawWords,
      isTemporalQuery,
    }),
    intent,
    targetCategory,
    infoTopic,
  };
}

/**
 * The two or three phrasings of one question that get embedded and fused.
 *
 * One question has to land in one place in vector space, and distillation
 * decides where. When distillation is right the single query is excellent;
 * when it drops the wrong word — or keeps one word too many — there is no
 * second chance, and the page comes back with the wrong category entirely.
 *
 * Asking two or three ways and fusing the rankings removes that single point
 * of failure. Repeats are free: semantic-search caches each variant by hash,
 * so the second student to ask spends no embedding quota at all.
 *
 * Deliberately capped at three, and deliberately one for short queries — a
 * two-word search does not need the insurance and should not pay for it.
 */
export function buildRetrievalQueries(input: {
  semanticQuery: string;
  normalized: string;
  subjectTokens: string[];
  rawWords: string[];
  isTemporalQuery: boolean;
}): string[] {
  const { semanticQuery, normalized, subjectTokens, rawWords, isTemporalQuery } = input;
  const variants: string[] = [semanticQuery];

  // A date question asked in the corpus's own words. The academic calendar
  // does not contain the sentence "when are midterms"; it contains a table
  // headed with these nouns.
  if (isTemporalQuery && subjectTokens.length > 0) {
    variants.push(`academic calendar ${subjectTokens.join(" ")} dates schedule`);
  }

  // The reader's own sentence, undistilled — the backstop for everything the
  // stop-word list threw away. Only worth an embedding on a long query, which
  // is where distillation actually loses information.
  if (rawWords.length >= 5) variants.push(normalized);

  return Array.from(
    new Set(variants.map((v) => v.trim()).filter((v) => v.length >= 3)),
  ).slice(0, 3);
}

/**
 * Determines whether candidate text satisfies the query's specific topical requirement.
 * If query has specific non-generic tokens (e.g. 'qubit' in 'qubit design'),
 * matching ONLY generic words (e.g. 'design') is rejected.
 */
export function hasTopicalMatch(
  candidateText: string,
  parsed: ParsedQuery,
): boolean {
  if (!candidateText) return false;
  const text = candidateText.toLowerCase();

  // If query is an entity lookup or name query, check name tokens
  if (parsed.intent === "entity_lookup" && parsed.nameTokens.length > 0) {
    return parsed.nameTokens.some((tok) => matchesWordBoundary(text, tok));
  }

  // If specific tokens exist (e.g. "qubit", "react", "python", "dsa"), candidate MUST match at least one specific token or synonym
  if (parsed.specificTokens.length > 0) {
    const matchesSpecific = parsed.specificTokens.some((tok) => matchesWordBoundary(text, tok));
    if (matchesSpecific) return true;

    // Check expanded synonyms
    const matchesSynonym = parsed.expandedPhrases.some((phrase) => text.includes(phrase));
    if (matchesSynonym) return true;

    // Check department match if query explicitly requested a department
    if (parsed.detectedDepartment && text.includes(parsed.detectedDepartment.toLowerCase())) {
      return true;
    }

    return false;
  }

  // If no specific tokens exist (all tokens are generic, e.g. "system design" or "research studies"), match subject tokens
  if (parsed.subjectTokens.length > 0) {
    return parsed.subjectTokens.some((tok) => matchesWordBoundary(text, tok));
  }

  return true;
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
 * Requires exact or strong full-name token containment.
 */
export function calculateExactBoost(title: string, query: string, nameTokens: string[]): number {
  if (!title || !query) return 0;
  const titleLower = title.toLowerCase().trim();
  const queryLower = query.toLowerCase().trim();

  // Strip common titles from comparison
  const cleanTitle = titleLower.replace(/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, "").trim();
  const cleanQuery = queryLower.replace(/^(dr\.?|prof\.?|mr\.?|ms\.?|mrs\.?)\s+/i, "").trim();

  if (titleLower === queryLower || cleanTitle === cleanQuery) return 1.0;
  if (titleLower.startsWith(queryLower) || cleanTitle.startsWith(cleanQuery)) return 0.9;

  // Name tokens check: all name tokens must appear in title
  if (nameTokens.length >= 2 && nameTokens.every((token) => titleLower.includes(token.toLowerCase()))) {
    return 0.85;
  }

  return 0;
}
