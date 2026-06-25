import { redirect } from "next/navigation";
import { getAuthContext } from "@/lib/auth";
import AppShell from "@/components/AppShell";

export default async function AppGroupLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await getAuthContext();
  if (!ctx) redirect("/login");

  return (
    <AppShell
      role={ctx.profile?.role}
      name={ctx.profile?.full_name ?? ctx.email ?? ""}
    >
      {children}
    </AppShell>
  );
}
