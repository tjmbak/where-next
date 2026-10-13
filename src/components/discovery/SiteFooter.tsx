import Link from "next/link";
import { GENRE_LABELS, REGIONS, getMonthLabel, upcomingYearForMonth } from "@/data/taxonomy";
import type { Genre, MonthNumber, Region } from "@/types/content";

type SiteFooterProps = {
  month: MonthNumber;
  year?: number;
};

function monthSlug(month: MonthNumber) {
  return getMonthLabel(month).toLowerCase();
}

function regionSlug(region: Region) {
  return region.toLowerCase().replace(/ /g, "-");
}

// A focused subset so the footer stays scannable rather than exhaustive.
const FOOTER_GENRES: Genre[] = (["house", "techno", "afro-house", "hip-hop", "electronic", "jazz"] as Genre[]).filter(
  (g) => g in GENRE_LABELS
);

/**
 * Editorial footer that doubles as a secondary discovery surface and an
 * internal-linking hub for the month / genre / region SEO pages.
 */
export function SiteFooter({ month, year = upcomingYearForMonth(month) }: SiteFooterProps) {
  const slug = monthSlug(month);
  const nextMonths = [0, 1, 2, 3].map((offset) => ({
    month: (((month - 1 + offset) % 12) + 1) as MonthNumber,
    year: year + Math.floor((month - 1 + offset) / 12)
  }));

  return (
    <footer className="border-t border-[var(--border)] bg-[var(--surface)]">
      <div className="mx-auto w-full max-w-[1180px] px-6 py-14 sm:px-10">
        <div className="grid gap-10 sm:grid-cols-2 lg:grid-cols-4">
          <FooterColumn title="by month">
            {nextMonths.map((m) => (
              <FooterLink key={`${m.year}-${m.month}`} href={`/where-to-go/${monthSlug(m.month)}`}>
                {getMonthLabel(m.month).toLowerCase()} {m.year}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="by scene">
            {FOOTER_GENRES.map((genre) => (
              <FooterLink key={genre} href={`/where-to-go/${slug}/genre/${genre}`}>
                {GENRE_LABELS[genre].toLowerCase()}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="by region">
            {REGIONS.map((region) => (
              <FooterLink key={region} href={`/where-to-go/${slug}/region/${regionSlug(region)}`}>
                {region.toLowerCase()}
              </FooterLink>
            ))}
          </FooterColumn>

          <FooterColumn title="where next">
            <FooterLink href={`/events/${year}/${slug}`}>events in {slug}</FooterLink>
            <FooterLink href="/methodology">how scores work</FooterLink>
            <FooterLink href="/membership">membership</FooterLink>
          </FooterColumn>
        </div>

        <div className="mt-14 flex flex-col gap-4 border-t border-[var(--border)] pt-8 sm:flex-row sm:items-center sm:justify-between">
          <Link href="/" className="flex items-center gap-2 text-sm font-semibold tracking-tight">
            <span className="inline-flex h-6 w-6 items-center justify-center rounded-sm bg-[var(--foreground)] font-mono text-[11px] font-bold text-[var(--background)]">
              W
            </span>
            <span>where next</span>
          </Link>
          <p className="font-mono text-[10px] uppercase tracking-[0.18em] text-[var(--muted-2)]">
            © {new Date().getFullYear()} where next
          </p>
        </div>
      </div>
    </footer>
  );
}

function FooterColumn({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="font-mono text-[10px] uppercase tracking-[0.22em] text-[var(--muted-2)]">{title}</p>
      <ul className="mt-4 flex flex-col gap-2.5">{children}</ul>
    </div>
  );
}

function FooterLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <li>
      <Link
        href={href}
        className="text-[13px] text-[var(--muted)] transition hover:text-[var(--foreground)]"
      >
        {children}
      </Link>
    </li>
  );
}
