// Thin wrapper around Resend with graceful no-op behavior when RESEND_API_KEY
// is missing. Lets the rest of the app call `sendEmail()` without guarding for
// env config in every callsite. In production, missing config is a hard error;
// in development without env vars, sends are logged and no network call is
// made so cron + Drop work end-to-end against a local DB.

type SendEmailInput = {
  to: string;
  subject: string;
  html: string;
  text?: string;
  tag?: string;
  replyTo?: string;
};

type SendEmailResult = {
  ok: boolean;
  id?: string;
  error?: string;
  skipped?: boolean;
};

const FROM = process.env.RESEND_FROM || "Where Next <hello@wherenext.fm>";

let resendInstance: { emails: { send: (args: unknown) => Promise<{ data?: { id?: string }; error?: { message: string } | null }> } } | null = null;
let resendInitTried = false;

async function getResend() {
  if (resendInstance) return resendInstance;
  if (resendInitTried) return null;
  resendInitTried = true;

  const key = process.env.RESEND_API_KEY;
  if (!key) return null;

  try {
    const mod = (await import("resend")) as unknown as {
      Resend: new (key: string) => typeof resendInstance;
    };
    resendInstance = new mod.Resend(key);
    return resendInstance;
  } catch (error) {
    console.warn("[email] resend module unavailable:", error);
    return null;
  }
}

export async function sendEmail(input: SendEmailInput): Promise<SendEmailResult> {
  const resend = await getResend();

  if (!resend) {
    if (process.env.NODE_ENV === "development") {
      console.info("[email:dev] would send", { to: input.to, subject: input.subject, tag: input.tag });
      return { ok: true, skipped: true };
    }
    return { ok: false, error: "email-not-configured", skipped: true };
  }

  const { data, error } = await resend.emails.send({
    from: FROM,
    to: input.to,
    subject: input.subject,
    html: input.html,
    text: input.text,
    reply_to: input.replyTo,
    tags: input.tag ? [{ name: "category", value: input.tag }] : undefined
  });

  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data?.id };
}

export function isEmailConfigured() {
  return Boolean(process.env.RESEND_API_KEY);
}
