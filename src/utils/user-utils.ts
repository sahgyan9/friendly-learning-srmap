
export const getBadgeVariant = (badge?: string | null): string => {
  switch (badge?.toLowerCase()) {
    case "mentor":
      return "bg-primary/15 text-primary border-primary/30";
    case "alumni":
      return "bg-purple-500/15 text-purple-600 dark:text-purple-400 border-purple-500/30";
    case "admin":
      return "bg-amber-500/15 text-amber-600 dark:text-amber-400 border-amber-500/30";
    default:
      return "bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 border-emerald-500/30";
  }
};

export const getInitials = (name?: string | null): string => {
  if (!name || typeof name !== "string") return "U";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};

export const formatDepartment = (department?: string | null): string => {
  if (!department) return "";
  const raw = department.trim();

  let degreePrefix = "";
  if (/^b\.?sc\.?\s*[-–—]?\s*/i.test(raw)) {
    degreePrefix = "BSc ";
  } else if (/^b\.?tech\.?\s*[-–—]?\s*/i.test(raw)) {
    degreePrefix = "BTech ";
  } else if (/^m\.?tech\.?\s*[-–—]?\s*/i.test(raw)) {
    degreePrefix = "MTech ";
  } else if (/^m\.?sc\.?\s*[-–—]?\s*/i.test(raw)) {
    degreePrefix = "MSc ";
  } else if (/^ph\.?d\.?\s*[-–—]?\s*/i.test(raw)) {
    degreePrefix = "PhD ";
  } else if (/^bba\s*[-–—]?\s*/i.test(raw)) {
    degreePrefix = "BBA ";
  } else if (/^mba\s*[-–—]?\s*/i.test(raw)) {
    degreePrefix = "MBA ";
  } else if (/^b\.?com\.?\s*[-–—]?\s*/i.test(raw)) {
    degreePrefix = "BCom ";
  }

  const clean = raw
    .replace(/^b\.?sc\.?\s*[-–—]?\s*/i, "")
    .replace(/^b\.?tech\.?\s*[-–—]?\s*/i, "")
    .replace(/^m\.?tech\.?\s*[-–—]?\s*/i, "")
    .replace(/^m\.?sc\.?\s*[-–—]?\s*/i, "")
    .replace(/^ph\.?d\.?\s*[-–—]?\s*/i, "")
    .replace(/^bba\s*[-–—]?\s*/i, "")
    .replace(/^mba\s*[-–—]?\s*/i, "")
    .replace(/^b\.?com\.?\s*[-–—]?\s*/i, "")
    .replace(/\s*\[.*?\]/g, "")
    .replace(/\s*\(.*?\)/g, "")
    .trim();

  let branch = clean;
  if (/^computer\s+science/i.test(clean) || /^cse$/i.test(clean)) {
    branch = "CSE";
  } else if (/^electronics\s+and\s+communication/i.test(clean) || /^ece$/i.test(clean)) {
    branch = "ECE";
  } else if (/^electrical\s+and\s+electronics/i.test(clean) || /^eee$/i.test(clean)) {
    branch = "EEE";
  } else if (/^mechanical/i.test(clean) || /^mech$/i.test(clean)) {
    branch = "Mechanical";
  } else if (/^civil/i.test(clean)) {
    branch = "Civil";
  } else if (/^physics/i.test(clean) || /^phys$/i.test(clean)) {
    branch = "Physics";
  } else if (/^chemistry/i.test(clean) || /^chem$/i.test(clean)) {
    branch = "Chemistry";
  } else if (/^mathematics|^maths?/i.test(clean)) {
    branch = "Mathematics";
  } else if (/^biological|^biology|^biotech/i.test(clean)) {
    branch = "Biological Sciences";
  } else if (/^economics/i.test(clean) || /^econ$/i.test(clean)) {
    branch = "Economics";
  } else if (/^management|^business/i.test(clean)) {
    branch = "Management";
  }

  if (degreePrefix && branch) {
    return `${degreePrefix}${branch}`.trim();
  }
  return branch || raw;
};

export const matchFacultyDepartment = (
  userDept?: string | null,
  availableDepts: string[] = []
): string | null => {
  if (!userDept || typeof userDept !== "string") return null;
  const raw = userDept.trim();
  if (!raw) return null;
  const lower = raw.toLowerCase();

  // Common department alias dictionary
  const DEPT_ALIASES: Record<string, string> = {
    physics: "Physics",
    phys: "Physics",
    cse: "Computer Science and Engineering",
    cs: "Computer Science and Engineering",
    "computer science": "Computer Science and Engineering",
    ece: "Electronics and Communication Engineering",
    electronics: "Electronics and Communication Engineering",
    eee: "Electrical and Electronics Engineering",
    ee: "Electrical and Electronics Engineering",
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
    paari: "Management",
    mgmt: "Management",
    business: "Management",
    mba: "Management",
  };

  // 1. Direct match in available departments (case-insensitive)
  if (availableDepts.length > 0) {
    const directMatch = availableDepts.find((d) => d.toLowerCase() === lower);
    if (directMatch) return directMatch;
  }

  // 2. Lookup in alias dictionary
  const mapped = DEPT_ALIASES[lower];
  if (mapped) {
    if (availableDepts.length === 0) return mapped;
    const directMappedMatch = availableDepts.find((d) => d.toLowerCase() === mapped.toLowerCase());
    if (directMappedMatch) return directMappedMatch;
  }

  // 3. Substring match against available departments
  if (availableDepts.length > 0) {
    const substringMatch = availableDepts.find(
      (d) => d.toLowerCase().includes(lower) || lower.includes(d.toLowerCase())
    );
    if (substringMatch) return substringMatch;
  }

  return mapped || (availableDepts.length > 0 ? null : raw);
};

