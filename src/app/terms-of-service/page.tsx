import { PublicRedirect } from "@/components/PublicRedirect";
import { publicBranding } from "@/lib/publicBranding";

export const metadata = {
  title: `Terms of Service - ${publicBranding.appName}`,
};

export default function TermsOfServiceAliasPage() {
  return <PublicRedirect to="/terms/" />;
}
