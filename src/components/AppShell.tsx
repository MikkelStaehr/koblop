import Logo from "@/components/Logo";
import SignOutButton from "@/components/SignOutButton";
import NavLinks from "@/components/app-shell/NavLinks";
import MobileNav from "@/components/app-shell/MobileNav";
import { navFor, roleLabel } from "@/components/app-shell/nav";
import type { UserRole } from "@/lib/database.types";

export default function AppShell({
  role,
  name,
  children,
}: {
  role: UserRole | null | undefined;
  name: string;
  children: React.ReactNode;
}) {
  const items = navFor(role);
  return (
    <div className="flex min-h-dvh bg-neutral-50 text-neutral-900">
      {/* Sidebar (desktop) */}
      <aside className="hidden w-60 shrink-0 flex-col border-r border-neutral-200 bg-white md:flex">
        <div className="px-5 py-5">
          <Logo className="text-3xl" />
        </div>
        <NavLinks items={items} />
        <div className="border-t border-neutral-200 p-4">
          <div className="truncate text-sm font-medium">{name}</div>
          <div className="mb-2 text-xs text-neutral-500">{roleLabel(role)}</div>
          <SignOutButton />
        </div>
      </aside>

      {/* Indhold */}
      <div className="flex min-w-0 flex-1 flex-col">
        {/* Top bar (mobil) */}
        <header className="flex items-center justify-between border-b border-neutral-200 bg-white px-4 py-3 md:hidden">
          <Logo className="text-2xl" />
          <SignOutButton />
        </header>

        <main className="flex-1 px-4 py-6 pb-24 md:px-8 md:py-8 md:pb-8">
          <div className="mx-auto w-full max-w-7xl">{children}</div>
        </main>

        <MobileNav items={items} />
      </div>
    </div>
  );
}
