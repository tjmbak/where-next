"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { PRIMARY_NAV } from "./SiteHeader";

const HIDDEN_PREFIXES = ["/admin", "/auth", "/onboarding"];

const ICONS: Record<string, React.ReactNode> = {
  "/": (
    <>
      <circle cx="12" cy="12" r="8.5" />
      <path d="m15.5 8.5-2.2 4.8-4.8 2.2 2.2-4.8 4.8-2.2Z" />
    </>
  ),
  "/events": (
    <>
      <rect x="3.5" y="5" width="17" height="15" rx="3" />
      <path d="M3.5 10h17M8 3v4M16 3v4" />
    </>
  ),
  "/find": (
    <>
      <circle cx="11" cy="11" r="6.5" />
      <path d="m20 20-4.2-4.2" />
    </>
  ),
  "/compose": <path d="M12 3.5 14 10l6.5 2-6.5 2-2 6.5-2-6.5-6.5-2 6.5-2 2-6.5Z" />
};

const SHORT_LABELS: Record<string, string> = {
  "/": "Explore",
  "/events": "Events",
  "/find": "Dates",
  "/compose": "Plan"
};

export function MobileTabBar() {
  const pathname = usePathname() ?? "/";
  if (HIDDEN_PREFIXES.some((prefix) => pathname.startsWith(prefix))) return null;
  const activeIndex = PRIMARY_NAV.findIndex((item) => item.match(pathname));

  return (
    <nav
      aria-label="Primary"
      className="wn-glass wn-hide-while-searching fixed inset-x-3 bottom-[calc(env(safe-area-inset-bottom)+0.625rem)] z-40 mx-auto max-w-md rounded-[26px] p-1 md:hidden"
    >
      <ul className="relative grid grid-cols-4">
        <li
          aria-hidden
          className={`wn-lens pointer-events-none absolute inset-y-0 left-0 w-1/4 rounded-[22px] ${activeIndex < 0 ? "opacity-0" : ""}`}
          style={{ transform: `translateX(${Math.max(activeIndex, 0) * 100}%)` }}
        />
        {PRIMARY_NAV.map((item, index) => {
          const active = index === activeIndex;
          return (
            <li key={item.href} className="relative">
              <Link
                href={item.href}
                aria-current={active ? "page" : undefined}
                className={`flex h-14 flex-col items-center justify-center gap-0.5 text-[10.5px] font-medium transition-[color,transform] duration-300 active:scale-[0.94] ${
                  active ? "text-[var(--foreground)]" : "text-[var(--muted)]"
                }`}
              >
                <svg
                  aria-hidden
                  viewBox="0 0 24 24"
                  className={`h-[22px] w-[22px] transition-colors duration-300 ${active ? "text-[var(--signal)]" : ""}`}
                  fill="none"
                  stroke="currentColor"
                  strokeWidth={active ? 2 : 1.7}
                  strokeLinecap="round"
                  strokeLinejoin="round"
                >
                  {ICONS[item.href]}
                </svg>
                {SHORT_LABELS[item.href]}
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
