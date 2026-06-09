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
import { ArrowRight, Mail, MessageSquareText, PhoneCall } from "lucide-react";

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

      <section className="mx-auto w-full max-w-7xl px-6 py-16 lg:px-8">
        <div className="max-w-3xl">
          <SectionLabel>Support</SectionLabel>
          <h1 className="mt-4 text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">
            {brand.appName} Support
          </h1>
          <p className="mt-5 text-lg leading-8 text-slate-600">
            Get help with access, reports, downloads, routing, and account issues.
          </p>
        </div>

        <div className="mt-10 grid gap-6 md:grid-cols-2 xl:grid-cols-3">
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

        <div className="mt-12 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
          <div className="rounded-[1.75rem] border border-slate-200 bg-white p-8 shadow-[0_18px_48px_rgba(15,23,42,0.06)]">
            <p className="text-xs font-black uppercase tracking-[0.35em] text-slate-500">Direct support</p>
            <div className="mt-4 space-y-4">
            <div className="flex items-center gap-3">
              <Mail className="h-5 w-5 text-slate-700" />
              <a className="text-lg font-bold text-slate-950 no-underline" href={`mailto:${SUPPORT_EMAIL}`}>
                {SUPPORT_EMAIL}
              </a>
            </div>
              <div className="flex items-center gap-3">
                <PhoneCall className="h-5 w-5 text-slate-700" />
                <p className="text-sm leading-7 text-slate-600">
                  Use email for the fastest response.
                </p>
              </div>
              <div className="flex items-center gap-3">
                <MessageSquareText className="h-5 w-5 text-slate-700" />
                <p className="text-sm leading-7 text-slate-600">
                  Include a short description and your organization.
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-[1.75rem] border border-slate-900 bg-slate-950 p-8 text-white shadow-[0_24px_70px_rgba(15,23,42,0.16)]">
            <p className="text-[10px] font-black uppercase tracking-[0.35em] text-amber-300">Portal access</p>
            <h2 className="mt-4 text-3xl font-black tracking-tight">Need the portal now?</h2>
            <p className="mt-4 text-sm leading-7 text-slate-300">
              Open the portal to continue with reports and operational views.
            </p>
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
                className="inline-flex items-center rounded-full border border-white/15 bg-white/5 px-6 py-3 text-sm font-bold text-white no-underline transition hover:bg-white/10"
              >
                Back to Home
              </Link>
            </div>
          </div>
        </div>
      </section>

      <PublicFooter />
    </main>
  );
}
