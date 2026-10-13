import { notFound, redirect } from "next/navigation";
import { createSupabaseServerAuthClient } from "@/lib/supabase/server-auth";

export const dynamic = "force-dynamic";

function adminEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((email) => email.trim().toLowerCase())
    .filter(Boolean);
}

/**
 * Operator surfaces read with the service-role client, so they must never be
 * public. Production requires a signed-in user listed in ADMIN_EMAILS; local
 * dev stays open while ADMIN_EMAILS is unset.
 */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const allowed = adminEmails();
  if (allowed.length === 0) {
    if (process.env.NODE_ENV === "production") notFound();
    return children;
  }

  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) notFound();
  const { data } = await supabase.auth.getUser();
  if (!data.user) redirect("/auth/login?next=/admin");
  if (!allowed.includes((data.user.email ?? "").toLowerCase())) notFound();

  return children;
}
