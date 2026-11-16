// src/lib/format.ts
// Campus-local human-readable date, time, and currency formatting helpers

/**
 * Parses SQL datetime string 'YYYY-MM-DD HH:mm:ss' or ISO string safely
 */
function parseDateParts(dateInput: string | Date | null | undefined): {
  year: number;
  month: number;
  day: number;
  hours: number;
  minutes: number;
} | null {
  if (!dateInput) return null;

  if (dateInput instanceof Date) {
    return {
      year: dateInput.getFullYear(),
      month: dateInput.getMonth(),
      day: dateInput.getDate(),
      hours: dateInput.getHours(),
      minutes: dateInput.getMinutes(),
    };
  }

  const str = String(dateInput).trim();
  // Match YYYY-MM-DD HH:mm(:ss)? or YYYY-MM-DDTHH:mm(:ss)?
  const match = str.match(/^(\d{4})-(\d{2})-(\d{2})[T\s](\d{2}):(\d{2})/);
  if (match) {
    return {
      year: parseInt(match[1]),
      month: parseInt(match[2]) - 1, // 0-indexed
      day: parseInt(match[3]),
      hours: parseInt(match[4]),
      minutes: parseInt(match[5]),
    };
  }

  const parsed = new Date(str);
  if (isNaN(parsed.getTime())) return null;
  return {
    year: parsed.getFullYear(),
    month: parsed.getMonth(),
    day: parsed.getDate(),
    hours: parsed.getHours(),
    minutes: parsed.getMinutes(),
  };
}

const MONTH_NAMES = [
  "Jan", "Feb", "Mar", "Apr", "May", "Jun",
  "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
];

function format12Hour(hours: number, minutes: number): string {
  const ampm = hours >= 12 ? "PM" : "AM";
  const h = hours % 12 || 12;
  const m = minutes < 10 ? `0${minutes}` : `${minutes}`;
  return `${h}:${m} ${ampm}`;
}

/**
 * Format date & time: "15 Apr 2027 • 02:00 PM"
 */
export function formatCampusDateTime(dateInput: string | Date | null | undefined): string {
  const parts = parseDateParts(dateInput);
  if (!parts) return "—";
  const month = MONTH_NAMES[parts.month];
  const time = format12Hour(parts.hours, parts.minutes);
  return `${parts.day} ${month} ${parts.year} • ${time}`;
}

/**
 * Format date only: "15 Apr 2027"
 */
export function formatCampusDate(dateInput: string | Date | null | undefined): string {
  const parts = parseDateParts(dateInput);
  if (!parts) return "—";
  const month = MONTH_NAMES[parts.month];
  return `${parts.day} ${month} ${parts.year}`;
}

/**
 * Format time only: "02:00 PM"
 */
export function formatCampusTime(dateInput: string | Date | null | undefined): string {
  const parts = parseDateParts(dateInput);
  if (!parts) return "—";
  return format12Hour(parts.hours, parts.minutes);
}

/**
 * Format range: "15 Apr 2027, 02:00 PM – 05:00 PM" or "15 Apr 2027, 09:00 AM – 16 Apr 2027, 06:00 PM"
 */
export function formatCampusRange(
  startInput: string | Date | null | undefined,
  endInput: string | Date | null | undefined
): string {
  const start = parseDateParts(startInput);
  const end = parseDateParts(endInput);

  if (!start && !end) return "—";
  if (!start) return formatCampusDateTime(endInput);
  if (!end) return formatCampusDateTime(startInput);

  const startMonth = MONTH_NAMES[start.month];
  const startTime = format12Hour(start.hours, start.minutes);
  const endTime = format12Hour(end.hours, end.minutes);

  const isSameDay =
    start.year === end.year && start.month === end.month && start.day === end.day;

  if (isSameDay) {
    return `${start.day} ${startMonth} ${start.year}, ${startTime} – ${endTime}`;
  }

  const endMonth = MONTH_NAMES[end.month];
  return `${start.day} ${startMonth} ${start.year}, ${startTime} – ${end.day} ${endMonth} ${end.year}, ${endTime}`;
}
