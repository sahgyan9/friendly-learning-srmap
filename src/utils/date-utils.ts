
import { formatDistanceToNow, isToday, isYesterday } from "date-fns";

export const formatRelativeTime = (dateInput: string | Date): string => {
  if (!dateInput) return "";
  const formatted = formatDistanceToNow(new Date(dateInput), { addSuffix: true });
  return formatted
    .replace(/^about\s+/i, "")
    .replace(/^less than a minute ago/i, "just now")
    .replace(/^over\s+/i, "")
    .replace(/^almost\s+/i, "");
};

export const formatMessageTime = (timestamp: string) => {
  const messageDate = new Date(timestamp);

  if (isToday(messageDate)) {
    return messageDate.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  } else if (isYesterday(messageDate)) {
    return "Yesterday";
  } else {
    return messageDate.toLocaleDateString([], { month: 'short', day: 'numeric' });
  }
};

