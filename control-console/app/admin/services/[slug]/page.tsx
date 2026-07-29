import { ServiceStatusDashboard } from "@components/services/ServiceStatusDashboard";

export default async function ServiceDetailPage({ params }: PageProps<"/admin/services/[slug]">) {
  const { slug } = await params;
  return <ServiceStatusDashboard focusSlug={slug} />;
}
