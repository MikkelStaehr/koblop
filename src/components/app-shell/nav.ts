import type { UserRole } from "@/lib/database.types";

export type IconName =
  | "grid"
  | "users"
  | "layers"
  | "settings"
  | "calendar";

export interface NavItem {
  href: string;
  label: string;
  icon: IconName;
}

// Navigation pr. rolle. Elever/Hold/Indstillinger er kørelærer-værktøjer.
export function navFor(role: UserRole | undefined | null): NavItem[] {
  if (role === "student") {
    return [
      { href: "/", label: "Mit forløb", icon: "grid" },
      { href: "/kalender", label: "Kalender", icon: "calendar" },
      { href: "/book", label: "Book tid", icon: "calendar" },
    ];
  }
  if (role === "instructor" || role === "admin") {
    return [
      { href: "/", label: "Oversigt", icon: "grid" },
      { href: "/kalender", label: "Kalender", icon: "calendar" },
      { href: "/elever", label: "Elever", icon: "users" },
      { href: "/hold", label: "Hold", icon: "layers" },
      { href: "/indstillinger", label: "Indstillinger", icon: "settings" },
    ];
  }
  return [];
}

export function roleLabel(role: UserRole | undefined | null): string {
  return role === "student"
    ? "Elev"
    : role === "instructor"
      ? "Kørelærer"
      : role === "admin"
        ? "Admin"
        : "";
}
