import { PublicRedirect } from "@/components/PublicRedirect";
import { publicBranding } from "@/lib/publicBranding";

export const metadata = {
  title: `Contact - ${publicBranding.appName}`,
};

export default function ContactAliasPage() {
  return <PublicRedirect to="/contact-us/" />;
}
