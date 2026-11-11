const TIME_ZONE = "Asia/Karachi";

function toDate(value: string | number | Date | undefined | null): Date | null {
  if (!value) return null;
  const d = value instanceof Date ? value : new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function formatDateTimePKT(value: string | number | Date, opts?: Intl.DateTimeFormatOptions) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleString("en-US", {
    timeZone: TIME_ZONE,
    hour12: true,
    ...opts,
  });
}

export function formatTimePKT(value: string | number | Date, opts?: Intl.DateTimeFormatOptions) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleTimeString("en-US", {
    timeZone: TIME_ZONE,
    hour12: true,
    ...opts,
  });
}

export function formatDatePKT(value: string | number | Date, opts?: Intl.DateTimeFormatOptions) {
  const d = toDate(value);
  if (!d) return "—";
  return d.toLocaleDateString("en-US", {
    timeZone: TIME_ZONE,
    ...opts,
  });
}

export function clinicTimeZone() {
  return TIME_ZONE;
}
