
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

