import { siteUrl } from "@/lib/structured-data";

export function ogImageUrl(args: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  stat?: string;
}) {
  const params = new URLSearchParams();
  params.set("title", args.title);
  if (args.eyebrow) params.set("eyebrow", args.eyebrow);
  if (args.subtitle) params.set("subtitle", args.subtitle);
  if (args.stat) params.set("stat", args.stat);
  return `${siteUrl()}/api/og?${params.toString()}`;
}
