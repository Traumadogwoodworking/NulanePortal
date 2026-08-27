import { PublicRedirect } from "@/components/PublicRedirect";

export const metadata = {
  title: "Terms of Service - DocuDent",
};

export default function TermsOfServiceAliasPage() {
  return <PublicRedirect to="/terms/" />;
}
