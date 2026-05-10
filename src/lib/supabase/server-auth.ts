import { cookies } from "next/headers";
import { createServerClient } from "@supabase/ssr";

// Cookie-aware Supabase client for server components, server actions, and
// route handlers. Distinct from the service-role client in `./server.ts`,
// which bypasses RLS and is reserved for admin / cron / webhook code paths.
export async function createSupabaseServerAuthClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !anon) return null;

  const cookieStore = await cookies();

  return createServerClient(url, anon, {
    cookies: {
      getAll: () => cookieStore.getAll(),
      setAll: (toSet) => {
        try {
          for (const { name, value, options } of toSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Server components can't write cookies; the middleware refreshes
          // the session on every request, so this is safe to ignore here.
        }
      }
    }
  });
}

export async function getCurrentUser() {
  const supabase = await createSupabaseServerAuthClient();
  if (!supabase) return null;
  const { data } = await supabase.auth.getUser();
  return data.user ?? null;
}
