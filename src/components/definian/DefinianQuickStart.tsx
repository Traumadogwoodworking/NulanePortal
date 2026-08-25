import Image from "next/image";
import { publicBranding } from "@/lib/publicBranding";

const portalAccessUrl = "https://vercel-portal-exact-traumadogwoodworkings-projects.vercel.app/definian/start";

const steps = [
  ["Scan or open secure login", "The dedicated start link bypasses the embedded Signal page and opens Definian's secure login."],
  ["Sign in or create your account", "Existing users sign in. New users choose Sign up and use their work email."],
  ["Open the portal", "After verification, sign in and return to the Definian home page."],
  ["Install Definian Inspection", "Download the Definian app for iPhone, iPad, or Android using the verified store links below."],
  ["Use the same email", "Sign in to Definian Inspection with the same verified account you created in the portal."],
] as const;

export function DefinianQuickStart({ embedded = false }: { embedded?: boolean }) {
  return (
    <main className={embedded ? "text-slate-950" : "min-h-screen bg-slate-100 px-4 py-10 text-slate-950"}>
      <div className={`mx-auto overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl ${embedded ? "max-w-4xl" : "max-w-3xl"}`}>
        <header className="bg-[#0d2c71] p-7 text-white sm:p-10">
          <Image
            src="/media/definian-logo-inverted-rgb.svg"
            alt={publicBranding.appName}
            width={240}
            height={64}
            className="h-14 w-auto object-contain"
            priority
          />
          <p className="mt-8 text-xs font-black uppercase tracking-[0.25em] text-[#8ae1b8]">Getting Started</p>
          <h1 className="mt-2 text-3xl font-black">Definian Inspection quick start</h1>
          <p className="mt-3 max-w-2xl text-sm leading-relaxed text-slate-200">
            Scan, create your secure account, and continue in the Definian Inspection app.
          </p>
        </header>

        <div className="p-7 sm:p-10">
          <div className="grid gap-7 sm:grid-cols-[220px_1fr] sm:items-center">
            <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <Image
                src="/resources/definian/definian-inspection-signup-qr.png"
                alt="QR code for Definian Inspection signup"
                width={420}
                height={420}
                className="h-auto w-full"
                unoptimized
              />
            </div>
            <div>
              <h2 className="text-2xl font-black">Scan to sign in or sign up</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-600">
                The QR contains only the dedicated Definian start URL. It bypasses the embedded Signal page and contains no name, email, password, or invitation.
              </p>
              <a href={portalAccessUrl} className="mt-5 inline-flex rounded-xl bg-[#00ab63] px-5 py-3 text-sm font-black text-white transition hover:bg-[#008f53]">
                Open secure login
              </a>
              <p className="mt-3 break-all text-xs font-semibold text-[#0d2c71]">{portalAccessUrl}</p>
            </div>
          </div>

          <ol className="mt-9 grid gap-3">
            {steps.map(([title, detail], index) => (
              <li key={title} className="grid grid-cols-[2.25rem_1fr] gap-3 rounded-xl border border-slate-200 bg-slate-50 p-4">
                <span className="flex h-9 w-9 items-center justify-center rounded-full border border-[#c8d7f0] bg-[#eef4ff] text-sm font-black text-[#081b3a]" aria-hidden="true">
                  {index + 1}
                </span>
                <div>
                  <p className="font-black text-slate-900">{title}</p>
                  <p className="mt-1 text-sm leading-relaxed text-slate-600">{detail}</p>
                </div>
              </li>
            ))}
          </ol>

          <a
            href="/resources/definian/definian-inspection-quick-start.pdf?v=5"
            className="mt-7 inline-flex rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-black text-slate-800 transition hover:bg-slate-50"
          >
            Download printable quick-start PDF
          </a>

          <div className="mt-7 grid gap-3 sm:grid-cols-2">
            <a href={publicBranding.appStoreUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-slate-800">
              Install Definian for iPhone or iPad
            </a>
            <a href={publicBranding.googlePlayUrl} target="_blank" rel="noreferrer" className="rounded-xl bg-slate-950 px-4 py-3 text-center text-sm font-black text-white transition hover:bg-slate-800">
              Install Definian for Android
            </a>
          </div>

          <p className="mt-6 text-sm text-slate-600">
            Need help?{" "}
            <a className="font-bold text-slate-950 underline" href={`mailto:${publicBranding.supportEmail}`}>
              {publicBranding.supportEmail}
            </a>
          </p>
        </div>
      </div>
    </main>
  );
}
