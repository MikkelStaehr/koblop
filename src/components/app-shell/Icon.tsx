import {
  LayoutGrid,
  Users,
  Layers,
  Settings,
  Calendar,
  type LucideIcon,
} from "lucide-react";
import type { IconName } from "./nav";

const ICONS: Record<IconName, LucideIcon> = {
  grid: LayoutGrid,
  users: Users,
  layers: Layers,
  settings: Settings,
  calendar: Calendar,
};

export function Icon({
  name,
  className = "h-5 w-5",
}: {
  name: IconName;
  className?: string;
}) {
  const Cmp = ICONS[name];
  return <Cmp className={className} strokeWidth={1.8} aria-hidden />;
}
