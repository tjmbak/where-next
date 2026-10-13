import { getMonthLabel } from "@/data/taxonomy";
import type { MonthNumber } from "@/types/content";

export type WatchAlertEvent = {
  title: string;
  startDate: string;
  endDate: string | null;
  type: string;
  summary: string;
};

export type WatchAlertSection = {
  slug: string;
  city: string;
  country: string;
  month: MonthNumber;
  year: number;
  newEvents: WatchAlertEvent[];
};

export type WatchAlertsEmailInput = {
  email: string;
  sections: WatchAlertSection[];
  siteUrl: string;
};

const ESC_RE = /[&<>"']/g;
const ESC_MAP: Record<string, string> = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;"
};

function esc(value: string): string {
  return value.replace(ESC_RE, (ch) => ESC_MAP[ch] ?? ch);
}

function formatDate(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", timeZone: "UTC" });
}

export function renderWatchAlertsEmail(input: WatchAlertsEmailInput) {
  const totalNew = input.sections.reduce((n, s) => n + s.newEvents.length, 0);
  const first = input.sections[0];
  const subject =
    input.sections.length === 1
      ? `${first.city}: ${totalNew} new ${totalNew === 1 ? "event" : "events"} for ${getMonthLabel(first.month).toLowerCase()} ${first.year}`
      : `${totalNew} new events across ${input.sections.length} cities you're watching`;

  const sectionsHtml = input.sections
    .map((section) => {
      const monthLabel = getMonthLabel(section.month).toLowerCase();
      const url = `${input.siteUrl}/destinations/${section.slug}?month=${section.month}&year=${section.year}&utm_source=watch&utm_medium=email`;
      const eventsHtml = section.newEvents
        .map((ev) => {
          const dates = ev.endDate && ev.endDate !== ev.startDate
            ? `${formatDate(ev.startDate)} – ${formatDate(ev.endDate)}`
            : formatDate(ev.startDate);
          return `
            <tr>
              <td style="padding:14px 0;border-top:1px solid #eee;">
                <p style="margin:0;color:#888;font-family:'JetBrains Mono', ui-monospace, monospace;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;">
                  ${esc(dates)} · ${esc(ev.type.replace("-", " "))}
                </p>
                <p style="margin:6px 0 0;font-size:16px;font-weight:500;color:#111;">${esc(ev.title)}</p>
                <p style="margin:6px 0 0;color:#555;font-size:13px;line-height:20px;">${esc(ev.summary)}</p>
              </td>
            </tr>`;
        })
        .join("");

      return `
        <tr>
          <td style="padding:28px 0 6px;">
            <p style="margin:0;color:#888;font-family:'JetBrains Mono', ui-monospace, monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
              ${esc(section.country)} · ${esc(monthLabel)} ${section.year}
            </p>
            <h2 style="margin:6px 0 0;font-size:22px;font-weight:500;letter-spacing:-0.01em;color:#111;">
              <a href="${esc(url)}" style="color:#111;text-decoration:none;">${esc(section.city)}</a>
            </h2>
          </td>
        </tr>
        ${eventsHtml}
        <tr>
          <td style="padding:12px 0 8px;">
            <a href="${esc(url)}" style="color:#111;font-family:'JetBrains Mono', ui-monospace, monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-bottom:1px solid #111;padding-bottom:2px;">
              open the ${esc(section.city.toLowerCase())} guide →
            </a>
          </td>
        </tr>`;
    })
    .join("");

  const html = `
  <div style="background:#faf6ee;padding:32px 16px;">
    <table role="presentation" width="100%" style="max-width:560px;margin:0 auto;background:#fffdf8;border:1px solid #eee7d9;border-radius:12px;padding:32px;font-family:-apple-system, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif;">
      <tr>
        <td>
          <p style="margin:0;color:#888;font-family:'JetBrains Mono', ui-monospace, monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;">
            where next · watch alert
          </p>
          <h1 style="margin:12px 0 0;font-size:26px;font-weight:500;letter-spacing:-0.02em;color:#111;">
            New events confirmed in ${input.sections.length === 1 ? esc(first.city) : "cities you watch"}.
          </h1>
          <table role="presentation" width="100%">
            ${sectionsHtml}
          </table>
          <p style="margin:32px 0 0;color:#999;font-size:12px;line-height:18px;">
            You get these because you're watching ${input.sections.length === 1 ? "this city-month" : "these city-months"} on Where Next.
            Manage watches in <a href="${esc(input.siteUrl)}/settings" style="color:#666;">settings</a>.
          </p>
        </td>
      </tr>
    </table>
  </div>`;

  const text = input.sections
    .map((s) => {
      const lines = s.newEvents
        .map((ev) => `  - ${formatDate(ev.startDate)} ${ev.title}`)
        .join("\n");
      return `${s.city} (${getMonthLabel(s.month)} ${s.year}):\n${lines}`;
    })
    .join("\n\n");

  return { subject, html, text };
}
