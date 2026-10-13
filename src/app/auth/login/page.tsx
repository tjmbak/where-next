import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { LoginForm } from "@/components/auth/LoginForm";
import { getCurrentUser } from "@/lib/supabase/server-auth";
import { SiteHeader } from "@/components/nav/SiteHeader";

export const metadata: Metadata = {
  title: "Sign in",
  description: "Sign in to Where Next to save trips, get monthly drops, and unlock alerts.",
  robots: { index: false }
};

type LoginPageProps = {
  searchParams: Promise<{ next?: string; error?: string }>;
};

export default async function LoginPage({ searchParams }: LoginPageProps) {
  const params = await searchParams;
  const user = await getCurrentUser();
  if (user) {
    redirect(params.next || "/");
  }

  return (
    <main className="min-h-screen w-full bg-[var(--background)]">
      <SiteHeader />

      <section className="mx-auto flex w-full max-w-[480px] flex-col gap-8 px-6 py-16 sm:px-10">
        <div>
          <p className="font-mono text-[11px] uppercase tracking-[0.22em] text-[var(--muted)]">
            sign in
          </p>
          <h1 className="mt-3 text-[clamp(2rem,4vw,2.5rem)] font-medium leading-[1.05] tracking-[-0.02em] text-[var(--foreground)]">
            One link. No password.
          </h1>
          <p className="mt-4 text-[15px] leading-7 text-[var(--muted)]">
            Save trips, get the monthly drop tuned to your scenes, and pin saved cities for alerts when tickets move.
          </p>
        </div>

        <LoginForm next={params.next} initialError={params.error} />

        <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">
          we send a single magic link · no marketing spam
        </p>
      </section>
    </main>
  );
}
