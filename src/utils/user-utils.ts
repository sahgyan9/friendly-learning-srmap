
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
  const trimmed = department.trim();
  if (/^computer\s+science/i.test(trimmed)) {
    return "CSE";
  }
  if (/^electronics\s+and\s+communication/i.test(trimmed)) {
    return "ECE";
  }
  if (/^electrical\s+and\s+electronics/i.test(trimmed)) {
    return "EEE";
  }
  return trimmed;
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

