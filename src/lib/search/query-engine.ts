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
 * Checks if a search token matches inside text using whole word boundaries.
 * Prevents subword false matches like 'to' inside 'protocol' or 'can' inside 'candidates'.
 */
export function matchesWordBoundary(text: string, token: string): boolean {
  if (!text || !token) return false;
  const cleanTok = token.trim().toLowerCase();
  if (!cleanTok) return false;
  const escaped = cleanTok.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const regex = new RegExp(`\\b${escaped}`, "i");
  return regex.test(text);
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

export type TargetCategory = "mentors" | "faculty" | "opportunities" | "communities" | "posts" | "blog";

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

  if (isMentorExplicit || isMentorConversational) {
    targetCategory = "mentors";
  } else if (isFacultyExplicit) {
    targetCategory = "faculty";
  } else if (isOppExplicit) {
    targetCategory = "opportunities";
  } else if (isCommunityExplicit) {
    targetCategory = "communities";
  } else if (isPostExplicit) {
    targetCategory = "posts";
  } else if (isDocumentExplicit) {
    targetCategory = "documents" as any;
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

  // Filter out generic research noise words if other specific tokens exist
  const specificTokens = subjectTokens.filter((t) => !GENERIC_RESEARCH_WORDS.has(t));
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
  if (detectedDepartment && !semanticQuery.toLowerCase().includes(detectedDepartment.toLowerCase())) {
    semanticQuery = `${detectedDepartment} ${semanticQuery}`.trim();
  }
  if (!semanticQuery) semanticQuery = normalized;

  return {
    raw,
    cleaned: normalized,
    tokens,
    subjectTokens: subjectTokens.length > 0 ? subjectTokens : tokens,
    specificTokens,
    filteredFacultyTokens,
    nameTokens: nameTokens.length > 0 ? nameTokens : tokens,
    detectedDepartment,
    expandedPhrases: Array.from(expandedPhrasesSet),
    suggestedQuery,
    cleanTopic,
    semanticQuery,
    intent,
    targetCategory,
    infoTopic,
  };
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
