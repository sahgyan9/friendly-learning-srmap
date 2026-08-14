/**
 * Calendar Utilities for University Events
 * Allows 1-click export to Google Calendar, Apple Calendar, Outlook, or .ics download.
 */

interface CalendarEventData {
  title: string;
  description: string;
  location: string;
  startDate: string; // "YYYY-MM-DD HH:mm:ss" or ISO
  endDate: string;
}

function parseDate(dateStr: string): Date {
  return new Date(dateStr.replace(" ", "T") + "+05:30");
}

function formatUtcForCalendar(date: Date): string {
  return date.toISOString().replace(/-|:|\.\d+/g, "");
}

export function getGoogleCalendarUrl(event: CalendarEventData): string {
  const start = parseDate(event.startDate);
  const end = parseDate(event.endDate);

  const params = new URLSearchParams({
    action: "TEMPLATE",
    text: event.title,
    dates: `${formatUtcForCalendar(start)}/${formatUtcForCalendar(end)}`,
    details: event.description,
    location: event.location || "SRM University-AP",
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}

export function getOutlookCalendarUrl(event: CalendarEventData): string {
  const start = parseDate(event.startDate);
  const end = parseDate(event.endDate);

  const params = new URLSearchParams({
    path: "/calendar/action/compose",
    rru: "addevent",
    subject: event.title,
    startdt: start.toISOString(),
    enddt: end.toISOString(),
    body: event.description,
    location: event.location || "SRM University-AP",
  });

  return `https://outlook.live.com/calendar/0/deeplink/compose?${params.toString()}`;
}

export function downloadIcsFile(event: CalendarEventData, filename?: string) {
  const start = parseDate(event.startDate);
  const end = parseDate(event.endDate);

  const cleanTitle = event.title.replace(/\n/g, " ");
  const cleanDesc = event.description.replace(/\n/g, "\\n");
  const cleanLoc = (event.location || "SRM University-AP").replace(/\n/g, " ");

  const icsContent = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Friendly Learning SRMAP//Events Calendar//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "BEGIN:VEVENT",
    `UID:fl-event-${Date.now()}@friendlylearning.in`,
    `DTSTAMP:${formatUtcForCalendar(new Date())}`,
    `DTSTART:${formatUtcForCalendar(start)}`,
    `DTEND:${formatUtcForCalendar(end)}`,
    `SUMMARY:${cleanTitle}`,
    `DESCRIPTION:${cleanDesc}`,
    `LOCATION:${cleanLoc}`,
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].join("\r\n");

  const blob = new Blob([icsContent], { type: "text/calendar;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename || `${cleanTitle.slice(0, 30).replace(/[^a-zA-Z0-9]/g, "_")}.ics`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
