// Domæne-typer, danske labels og regler — spejler enums i databasen.
// Holdes på linje med supabase/migrations/20260625130000_init_schema.sql og
// den modulopbyggede kat. B-uddannelse (gældende 1.7.2026).

export type UserRole = "admin" | "instructor" | "student";
export type LessonType = "teori" | "praksis";
export type PracticalVenue =
  | "teorilokale"
  | "vej"
  | "lukket_oevelsesplads"
  | "koereteknisk_anlaeg";
export type LessonStatus =
  | "ikke_planlagt"
  | "planlagt"
  | "gennemfoert"
  | "godkendt";
export type ModuleStatus =
  | "laast"
  | "i_gang"
  | "afventer_godkendelse"
  | "gennemfoert";
export type RequirementType = "kursus" | "proeve";

export const VENUE_LABEL: Record<PracticalVenue, string> = {
  teorilokale: "Teorilokale",
  vej: "Vej",
  lukket_oevelsesplads: "Manøvrebane",
  koereteknisk_anlaeg: "Glatbane",
};

export const LESSON_STATUS_LABEL: Record<LessonStatus, string> = {
  ikke_planlagt: "Ikke planlagt",
  planlagt: "Planlagt",
  gennemfoert: "Gennemført",
  godkendt: "Godkendt",
};

export const MODULE_STATUS_LABEL: Record<ModuleStatus, string> = {
  laast: "Låst",
  i_gang: "I gang",
  afventer_godkendelse: "Afventer godkendelse",
  gennemfoert: "Gennemført",
};

export const LESSON_TYPE_LABEL: Record<LessonType, string> = {
  teori: "Teori",
  praksis: "Køretime",
};

// Kun praksislektioner bookes 1-til-1 af eleven; teori er holdundervisning.
export const STUDENT_BOOKABLE_TYPE: LessonType = "praksis";

// ── Regler (kat. B — kan variere pr. kategori, autoritativt i DB) ──────────
export const KATEGORI_B_RULES = {
  maxSelvstudiumLessons: 7,
  maxLessonsPerDay: 8,
  maxPracticalLessonsPerDay: 3,
  totalTheoryLessons: 30,
  totalPracticalLessons: 24,
} as const;
