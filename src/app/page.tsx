import { DiscoveryExperience } from "@/components/discovery/DiscoveryExperience";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function pickString(value: string | string[] | undefined): string | null {
  if (typeof value === "string") return value;
  if (Array.isArray(value)) return value[0] ?? null;
  return null;
}

export default async function Home({ searchParams }: PageProps) {
  const params = await searchParams;
  const initial = {
    month: pickString(params.month),
    stay: pickString(params.stay),
    genre: pickString(params.genre),
    vibe: pickString(params.vibe),
    budget: pickString(params.budget),
    region: pickString(params.region),
    city: pickString(params.city)
  };
  return <DiscoveryExperience initial={initial} />;
}
