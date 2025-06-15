
export const getInitials = (name?: string | null): string => {
  if (!name || typeof name !== "string") return "U";
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .substring(0, 2);
};
