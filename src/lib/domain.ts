// Domæne-typer og danske labels, der spejler enums i databasen.
// Holdes på linje med supabase/migrations/20260625130000_init_schema.sql.

export type UserRole = "admin" | "instructor" | "student";
export type ModuleTrack = "theory" | "practical" | "event";
export type ModuleType =
  | "theory"
  | "driving"
  | "maneuver"
  | "skidpad"
  | "firstaid";
export type ProgressStatus = "locked" | "available" | "booked" | "completed";
export type BookingStatus = "booked" | "completed" | "cancelled";

export const MODULE_TYPE_LABEL: Record<ModuleType, string> = {
  theory: "Teori",
  driving: "Køretime",
  maneuver: "Manøvrebane",
  skidpad: "Glatbane",
  firstaid: "Førstehjælp",
};

export const TRACK_LABEL: Record<ModuleTrack, string> = {
  theory: "Teori",
  practical: "Kørsel",
  event: "Event",
};

export const PROGRESS_LABEL: Record<ProgressStatus, string> = {
  locked: "Låst",
  available: "Klar",
  booked: "Booket",
  completed: "Afkrydset",
};

// Hvilke moduler eleven selv booker (1-til-1 køretimer).
export const BOOKABLE_TYPES: ModuleType[] = ["driving"];
// Hvilke moduler håndteres som events oprettet af læreren.
export const EVENT_TYPES: ModuleType[] = ["maneuver", "skidpad", "firstaid"];
