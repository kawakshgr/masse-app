/**
 * Booked video calls (29 Sep 2026): how a call reads on screen, and the
 * calendar file both sides add it with. Plain module — server and client
 * components share it. Calls are held in France's time.
 */

export const CALL_ZONE = "Europe/Paris";

/** "jeudi 1 octobre à 18:00", in Paris time whatever the server's zone. */
export function callLabel(startsAt: string, locale = "fr"): string {
  const date = new Date(startsAt);
  const day = date.toLocaleDateString(locale, { timeZone: CALL_ZONE, weekday: "long", day: "numeric", month: "long" });
  const time = date.toLocaleTimeString(locale, { timeZone: CALL_ZONE, hour: "2-digit", minute: "2-digit" });
  return locale.startsWith("fr") ? `${day} à ${time}` : `${day}, ${time}`;
}

/** 1080 → "18:00". */
export function hm(minutes: number): string {
  return `${String(Math.floor(minutes / 60)).padStart(2, "0")}:${String(minutes % 60).padStart(2, "0")}`;
}

/** Every half hour of the day, as minutes from midnight: 0, 30 … 1440. */
export const HALF_HOURS = Array.from({ length: 49 }, (_, i) => i * 30);

/** An instant in the UTC form calendars read: 20261001T160000Z. */
function icsTime(date: Date): string {
  return date.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "");
}

/** Commas, semicolons and line breaks are escaped in iCalendar text. */
function icsText(value: string): string {
  return value.replace(/\\/g, "\\\\").replace(/;/g, "\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n");
}

/** One event, readable by Apple Calendar, Google Calendar and Outlook. */
export function callIcs(call: {
  id: string;
  startsAt: string;
  minutes: number;
  title: string;
  description: string;
  link: string | null;
  cancelled?: boolean;
}): string {
  const start = new Date(call.startsAt);
  const end = new Date(start.getTime() + call.minutes * 60_000);
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Masse//Visio//FR",
    "CALSCALE:GREGORIAN",
    `METHOD:${call.cancelled ? "CANCEL" : "PUBLISH"}`,
    "BEGIN:VEVENT",
    `UID:${call.id}@masse`,
    `DTSTAMP:${icsTime(new Date())}`,
    `DTSTART:${icsTime(start)}`,
    `DTEND:${icsTime(end)}`,
    `SUMMARY:${icsText(call.title)}`,
    `DESCRIPTION:${icsText(call.description)}`,
    ...(call.link ? [`URL:${call.link}`, `LOCATION:${icsText(call.link)}`] : []),
    `STATUS:${call.cancelled ? "CANCELLED" : "CONFIRMED"}`,
    "BEGIN:VALARM",
    "ACTION:DISPLAY",
    "DESCRIPTION:Visio",
    "TRIGGER:-PT15M",
    "END:VALARM",
    "END:VEVENT",
    "END:VCALENDAR",
  ];
  return `${lines.join("\r\n")}\r\n`;
}

/** Calls still worth showing: to come, or started less than an hour ago. */
export function callsShownFrom(): string {
  return new Date(Date.now() - 60 * 60_000).toISOString();
}

/** Whether a call's time has fully run. */
export function callEnded(startsAt: string, minutes: number): boolean {
  return new Date(startsAt).getTime() + minutes * 60_000 < Date.now();
}
