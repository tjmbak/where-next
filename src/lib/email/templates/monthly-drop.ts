import type { DropPick } from "@/lib/drops/rank";
import type { MonthNumber } from "@/types/content";
import { getMonthLabel } from "@/data/taxonomy";

export type MonthlyDropEmailInput = {
  email: string;
  handle: string;
  month: MonthNumber;
  year: number;
  picks: DropPick[];
  permalinkUrl: string;
  unsubscribeUrl: string;
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

export function renderMonthlyDropEmail(input: MonthlyDropEmailInput) {
  const monthLabel = getMonthLabel(input.month);
  const subject = `Where to go in ${monthLabel.toLowerCase()} ${input.year}`;

  const introHtml = input.picks.length === 0
    ? `<p style="margin:24px 0;color:#888;">No matches this month. Update your scenes or budget at <a href="${esc(input.siteUrl)}/onboarding" style="color:#111;">your settings</a>.</p>`
    : "";

  const picksHtml = input.picks
    .map((pick, index) => {
      const eventLine = pick.topEventTitle
        ? `<p style="margin:6px 0 0;color:#666;font-size:13px;">Headline: ${esc(pick.topEventTitle)}</p>`
        : "";
      const whyLine = pick.whyNow[0]
        ? `<p style="margin:8px 0 0;color:#333;font-size:14px;line-height:22px;">${esc(pick.whyNow[0])}</p>`
        : "";
      const url = `${input.siteUrl}/destinations/${pick.slug}?month=${input.month}&utm_source=drop&utm_medium=email&utm_campaign=${input.year}-${String(input.month).padStart(2, "0")}`;
      return `
        <tr>
          <td style="padding:24px 0;border-top:1px solid #eee;">
            <p style="margin:0;color:#888;font-family:'JetBrains Mono', ui-monospace, monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;">
              ${String(index + 1).padStart(2, "0")} · ${esc(pick.region)} · score ${pick.score}/100
            </p>
            <h2 style="margin:8px 0 0;font-size:22px;font-weight:500;letter-spacing:-0.01em;color:#111;">
              <a href="${esc(url)}" style="color:#111;text-decoration:none;">${esc(pick.city)}, ${esc(pick.country)}</a>
            </h2>
            <p style="margin:8px 0 0;color:#444;font-size:14px;line-height:22px;">${esc(pick.tagline)}</p>
            ${whyLine}
            ${eventLine}
            <p style="margin:14px 0 0;">
              <a href="${esc(url)}" style="color:#111;font-family:'JetBrains Mono', ui-monospace, monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-bottom:1px solid #111;padding-bottom:2px;">
                read the guide →
              </a>
            </p>
          </td>
        </tr>`;
    })
    .join("");

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#fafafa;font-family:'Inter',-apple-system,sans-serif;color:#111;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;">
      <p style="margin:0;color:#888;font-family:'JetBrains Mono', ui-monospace, monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;">
        Where Next · the drop · ${monthLabel.toLowerCase()} ${input.year}
      </p>
      <h1 style="margin:18px 0 0;font-size:32px;font-weight:500;line-height:1.05;letter-spacing:-0.02em;color:#111;">
        Where to go this ${monthLabel.toLowerCase()}.
      </h1>
      <p style="margin:14px 0 0;color:#555;font-size:15px;line-height:24px;">
        Five places that line up with your scenes, regions, and budget. Curated, not scraped.
      </p>
      ${introHtml}
      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:8px;">
        ${picksHtml}
      </table>
      <p style="margin:32px 0 0;padding-top:24px;border-top:1px solid #eee;color:#666;font-size:13px;line-height:22px;">
        Saved any of these? See your full plan at
        <a href="${esc(input.permalinkUrl)}" style="color:#111;">${esc(input.permalinkUrl)}</a>.
      </p>
      <p style="margin:18px 0 0;color:#999;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;font-family:'JetBrains Mono', ui-monospace, monospace;">
        <a href="${esc(input.unsubscribeUrl)}" style="color:#999;">unsubscribe</a>
        &nbsp;·&nbsp;
        <a href="${esc(input.siteUrl)}/onboarding" style="color:#999;">tune preferences</a>
      </p>
    </div>
  </body>
</html>`;

  const text = [
    `Where Next — the drop — ${monthLabel.toLowerCase()} ${input.year}`,
    "",
    `Where to go this ${monthLabel.toLowerCase()}.`,
    "",
    ...input.picks.map(
      (pick, index) =>
        `${String(index + 1).padStart(2, "0")}. ${pick.city}, ${pick.country} (score ${pick.score}/100)\n   ${pick.tagline}\n   ${input.siteUrl}/destinations/${pick.slug}?month=${input.month}`
    ),
    "",
    `Permalink: ${input.permalinkUrl}`,
    `Unsubscribe: ${input.unsubscribeUrl}`
  ].join("\n");

  return { subject, html, text };
}
