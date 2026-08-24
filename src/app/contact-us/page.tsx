import { PublicFooter, PublicHeader, SectionLabel, SUPPORT_EMAIL } from "@/components/public-site";
import { publicBranding } from "@/lib/publicBranding";

const contactItems = [
  {
    label: "Portal Support",
    value: SUPPORT_EMAIL,
    href: `mailto:${SUPPORT_EMAIL}`,
    detail: "Portal access, report routing, and inspection workflow questions.",
  },
  {
    label: "Portal",
    value: publicBranding.openPortalButtonLabel,
    href: publicBranding.portalUrl,
    detail: `Open the ${publicBranding.appName} portal when you are ready to sign in.`,
  },
];

export default function ContactUsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f3f4f6_24%,#ffffff_24%,#eef2f7_100%)] text-slate-900">
      <PublicHeader />
      <section className="mx-auto w-full max-w-5xl px-6 py-16 lg:px-8">
        <SectionLabel>Contact Us</SectionLabel>
        <h1 className="mt-4 text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">Contact {publicBranding.appName}</h1>
        <p className="mt-5 max-w-3xl text-base leading-7 text-slate-600">
          Reach the portal team for support, account access, report review, and inspection workflow questions.
        </p>
        <div className="mt-10 grid gap-5 md:grid-cols-2">
          {contactItems.map((item) => (
            <a
              key={item.label}
              href={item.href}
              className="block rounded-[1.75rem] border border-slate-200 bg-white p-6 no-underline shadow-[0_18px_48px_rgba(15,23,42,0.08)] transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-[0_22px_56px_rgba(15,23,42,0.11)]"
            >
              <p className="text-xs font-black uppercase tracking-[0.28em] text-slate-500">{item.label}</p>
              <p className="mt-4 text-2xl font-black tracking-tight text-slate-950">{item.value}</p>
              <p className="mt-3 text-sm leading-7 text-slate-600">{item.detail}</p>
            </a>
          ))}
        </div>
        <div className="mt-10 rounded-[1.75rem] border border-slate-200 bg-slate-950 p-6 text-sm font-bold leading-7 text-slate-100 shadow-[0_18px_48px_rgba(15,23,42,0.12)]">
          <p>
            Portal Support:{" "}
            <a className="text-amber-300 no-underline hover:text-amber-200" href={`mailto:${SUPPORT_EMAIL}`}>
              {SUPPORT_EMAIL}
            </a>
          </p>
        </div>
      </section>
      <PublicFooter />
    </main>
  );
}
