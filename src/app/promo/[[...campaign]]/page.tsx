import { PromoCodeClient } from "./PromoCodeClient";

type PromoPageProps = {
  params: Promise<{ campaign?: string[] }>;
};

function normalizeCampaign(parts?: string[]): string {
  const value = parts?.[0]?.trim().toLowerCase() ?? "";
  return /^[a-z0-9][a-z0-9-]{0,63}$/.test(value) ? value : "";
}

export default async function PromoPage({ params }: PromoPageProps) {
  const { campaign } = await params;
  return <PromoCodeClient campaign={normalizeCampaign(campaign)} />;
}
