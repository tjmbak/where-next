export type TripForkedEmailInput = {
  recipientEmail: string;
  recipientFirstName?: string | null;
  originalTitle: string;
  originalCity: string;
  originalUrl: string;
  originalDurationDays: number;
  originalForkCount: number;
  forkerHandle?: string | null;
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

export function renderTripForkedEmail(input: TripForkedEmailInput) {
  const greeting = input.recipientFirstName ? `Hey ${esc(input.recipientFirstName)},` : "Hey,";
  const forkerLabel = input.forkerHandle ? `@${esc(input.forkerHandle)}` : "Someone";
  const forkCountLine =
    input.originalForkCount > 1
      ? `That's <strong style="color:#111;">${input.originalForkCount} travelers</strong> who've now planned their version of your trip.`
      : `You're the first creator they wanted to copy from.`;
  const subject =
    input.originalForkCount > 1
      ? `${forkerLabel} just forked your ${input.originalCity} trip (+${input.originalForkCount - 1} earlier)`
      : `${forkerLabel} forked your ${input.originalCity} trip`;

  const html = `<!doctype html>
<html lang="en">
  <body style="margin:0;background:#fafafa;font-family:'Inter',-apple-system,sans-serif;color:#111;">
    <div style="max-width:560px;margin:0 auto;padding:32px 24px;background:#fff;">
      <p style="margin:0;color:#888;font-family:'JetBrains Mono', ui-monospace, monospace;font-size:11px;letter-spacing:0.22em;text-transform:uppercase;">
        Where Next · your trip got forked
      </p>

      <h1 style="margin:18px 0 0;font-size:30px;font-weight:500;line-height:1.05;letter-spacing:-0.02em;color:#111;">
        ${forkerLabel} just made your<br/>${esc(input.originalCity)} trip their own.
      </h1>

      <p style="margin:16px 0 0;color:#444;font-size:15px;line-height:24px;">
        ${greeting} ${forkCountLine}
      </p>

      <table role="presentation" cellpadding="0" cellspacing="0" border="0" width="100%" style="margin-top:28px;border:1px solid #eee;border-radius:14px;">
        <tr>
          <td style="padding:22px;">
            <p style="margin:0;color:#ff6b35;font-family:'JetBrains Mono', ui-monospace, monospace;font-size:10px;letter-spacing:0.22em;text-transform:uppercase;">
              your trip · ${input.originalDurationDays} ${input.originalDurationDays === 1 ? "day" : "days"} in ${esc(input.originalCity.toLowerCase())}
            </p>
            <h2 style="margin:8px 0 0;font-size:20px;font-weight:500;letter-spacing:-0.01em;color:#111;">
              <a href="${esc(input.originalUrl)}" style="color:#111;text-decoration:none;">${esc(input.originalTitle)}</a>
            </h2>
            <p style="margin:14px 0 0;color:#666;font-size:13px;line-height:22px;">
              ${input.originalForkCount} ${input.originalForkCount === 1 ? "fork" : "forks"} so far · public on Where Next
            </p>
            <p style="margin:18px 0 0;">
              <a href="${esc(input.originalUrl)}?utm_source=trip-forked&utm_medium=email" style="display:inline-block;background:#111;color:#fff;font-family:'JetBrains Mono', ui-monospace, monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;padding:11px 18px;border-radius:999px;">
                view your trip →
              </a>
            </p>
          </td>
        </tr>
      </table>

      <p style="margin:28px 0 0;color:#555;font-size:14px;line-height:24px;">
        Want to plan another? Where Next has ${esc(input.originalCity)} mapped through 2026 — anchors, venues, real ticket links.
      </p>
      <p style="margin:14px 0 0;">
        <a href="${esc(input.siteUrl)}/destinations/?from=trip-forked&utm_source=trip-forked&utm_medium=email" style="color:#111;font-family:'JetBrains Mono', ui-monospace, monospace;font-size:11px;letter-spacing:0.18em;text-transform:uppercase;text-decoration:none;border-bottom:1px solid #111;padding-bottom:2px;">
          plan another →
        </a>
      </p>

      <p style="margin:36px 0 0;padding-top:24px;border-top:1px solid #eee;color:#999;font-size:11px;letter-spacing:0.16em;text-transform:uppercase;font-family:'JetBrains Mono', ui-monospace, monospace;">
        <a href="${esc(input.unsubscribeUrl)}" style="color:#999;">turn off fork emails</a>
        &nbsp;·&nbsp;
        <a href="${esc(input.siteUrl)}/settings" style="color:#999;">settings</a>
      </p>
    </div>
  </body>
</html>`;

  const text = [
    `Where Next — your trip got forked`,
    "",
    `${forkerLabel} just made your ${input.originalCity} trip their own.`,
    "",
    `${greeting} ${
      input.originalForkCount > 1
        ? `That's ${input.originalForkCount} travelers who've now planned their version of your trip.`
        : `You're the first creator they wanted to copy from.`
    }`,
    "",
    `Your trip: ${input.originalTitle}`,
    `${input.originalDurationDays} ${input.originalDurationDays === 1 ? "day" : "days"} in ${input.originalCity}`,
    `${input.originalForkCount} ${input.originalForkCount === 1 ? "fork" : "forks"} so far`,
    "",
    `View: ${input.originalUrl}`,
    "",
    `Turn off fork emails: ${input.unsubscribeUrl}`
  ].join("\n");

  return { subject, html, text };
}
