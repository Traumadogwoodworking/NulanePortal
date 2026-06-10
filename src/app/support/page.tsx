import Link from "next/link";
import {
  PORTAL_URL,
  PublicFooter,
  PublicHeader,
  SectionLabel,
  SUPPORT_EMAIL,
  SupportCard,
} from "@/components/public-site";
import { publicBranding } from "@/lib/publicBranding";
import { ArrowRight, Mail } from "lucide-react";

const supportCategories = [
  {
    title: "Login or portal access",
    description: "Sign-in and account access.",
  },
  {
    title: "Report visibility",
    description: "Missing reports or visibility issues.",
  },
  {
    title: "Facility or user permissions",
    description: "Access updates for a location or user.",
  },
  {
    title: "File/download/PDF issue",
    description: "Open or download issues.",
  },
  {
    title: "Routing or notification issue",
    description: "Routing or notification problems.",
  },
  {
    title: "General support",
    description: "Anything else you need help with.",
  },
];

export default function SupportPage() {
  const brand = publicBranding;

  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f3f4f6_24%,#ffffff_24%,#eef2f7_100%)] text-slate-900">
      <PublicHeader />

      <section className="mx-auto w-full max-w-4xl px-6 py-16 lg:px-8">
        <div className="max-w-3xl">
          <SectionLabel>Support</SectionLabel>
          <h1 className="mt-4 text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
            {brand.appName} Support
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Get help with access, reports, downloads, routing, and account issues.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2">
          {supportCategories.map((item) => (
            <SupportCard
              key={item.title}
              title={item.title}
              description={item.description}
              link={`mailto:${SUPPORT_EMAIL}?subject=${encodeURIComponent(item.title)}&body=${encodeURIComponent(
                "Please include your account, organization, facility, and a short description of the issue."
              )}`}
              />
          ))}
        </div>

        <div className="mt-10 rounded-[1.5rem] border border-slate-200 bg-white p-8 shadow-[0_16px_40px_rgba(15,23,42,0.06)]">
          <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Direct support</p>
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-slate-700" />
              <a className="text-lg font-bold text-slate-950 no-underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </div>
            <p className="text-sm leading-7 text-slate-600">
              Include your account, organization, facility, and a short description of the issue.
            </p>
          </div>
          <div className="mt-6 flex flex-wrap gap-4">
            <Link
              href={PORTAL_URL}
              className="inline-flex items-center gap-2 rounded-full bg-amber-400 px-6 py-3 text-sm font-bold text-slate-950 no-underline transition hover:bg-amber-300"
            >
              {brand.openPortalButtonLabel}
              <ArrowRight className="h-4 w-4" />
            </Link>
            <Link
              href="/"
              className="inline-flex items-center rounded-full border border-slate-300 bg-white px-6 py-3 text-sm font-bold text-slate-900 no-underline transition hover:bg-slate-50"
            >
              Back to Home
            </Link>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
