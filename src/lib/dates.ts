// Dato-hjælpere til kalenderen. Uge starter mandag (dansk konvention).

export const DAY_LABELS = ["Man", "Tir", "Ons", "Tor", "Fre", "Lør", "Søn"];
export const DAY_LABELS_LONG = [
  "Mandag",
  "Tirsdag",
  "Onsdag",
  "Torsdag",
  "Fredag",
  "Lørdag",
  "Søndag",
];

// Kalenderens synlige tidsrum.
export const CAL_START_HOUR = 7;
export const CAL_END_HOUR = 21;

export function startOfWeek(d: Date): Date {
  const x = new Date(d);
  const dow = (x.getDay() + 6) % 7; // 0 = mandag
  x.setHours(0, 0, 0, 0);
  x.setDate(x.getDate() - dow);
  return x;
}

export function addDays(d: Date, n: number): Date {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

// Mandag-index (0..6) for en dato; DB bruger 0 = søndag, så vi konverterer.
export function mondayIndex(d: Date): number {
  return (d.getDay() + 6) % 7;
}

export function dbWeekdayToMonday(dbWeekday: number): number {
  return (dbWeekday + 6) % 7; // DB: 0=søndag -> 6
}

export function fmtTime(d: Date): string {
  return d.toLocaleTimeString("da-DK", { hour: "2-digit", minute: "2-digit" });
}

export function fmtDayMonth(d: Date): string {
  return d.toLocaleDateString("da-DK", { day: "numeric", month: "short" });
}

export function fmtMonthYear(d: Date): string {
  return d.toLocaleDateString("da-DK", { month: "long", year: "numeric" });
}

export function startOfMonth(d: Date): Date {
  const x = new Date(d);
  x.setDate(1);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addMonths(d: Date, n: number): Date {
  const x = new Date(d);
  x.setMonth(x.getMonth() + n);
  return x;
}

// Andel (0..1) af kalenderdøgnet en tid ligger på — til vertikal placering.
export function dayFraction(d: Date): number {
  const mins = d.getHours() * 60 + d.getMinutes();
  const start = CAL_START_HOUR * 60;
  const total = (CAL_END_HOUR - CAL_START_HOUR) * 60;
  return Math.max(0, Math.min(1, (mins - start) / total));
}
