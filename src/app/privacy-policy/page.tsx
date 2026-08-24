import { PublicRedirect } from "@/components/PublicRedirect";
import { publicBranding } from "@/lib/publicBranding";

export const metadata = {
  title: `Privacy Policy - ${publicBranding.appName}`,
};

export default function PrivacyPolicyAliasPage() {
  return <PublicRedirect to="/privacy/" />;
}
