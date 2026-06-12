import { PublicLanding } from "@/components/public-landing";
import HomePage from "./home/page";
import { publicBranding } from "@/lib/publicBranding";

export default function RootPage() {
  if (publicBranding.mode === "inspectionTrac" || publicBranding.mode === "definianInspection") {
    return <PublicLanding />;
  }
  return <HomePage />;
}
