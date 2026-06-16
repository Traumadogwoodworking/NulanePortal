import { PublicFooter, PublicHeader, REPORTS_EMAIL, SectionLabel } from "@/components/public-site";

export default function SupportTicketsPage() {
  return (
    <main className="min-h-screen bg-[linear-gradient(180deg,#ffffff_0%,#f3f4f6_24%,#ffffff_24%,#eef2f7_100%)] text-slate-900">
      <PublicHeader />
      <section className="mx-auto w-full max-w-3xl px-6 py-16 lg:px-8">
        <SectionLabel>Support</SectionLabel>
        <h1 className="mt-4 text-5xl font-black tracking-tight text-slate-950 sm:text-6xl">Support tickets</h1>
        <p className="mt-5 max-w-2xl text-base leading-7 text-slate-600">
          Open a support ticket and the Inspection-Trac team will follow up at{" "}
          <a className="font-semibold text-amber-600 no-underline" href={`mailto:${REPORTS_EMAIL}`}>
            {REPORTS_EMAIL}
          </a>
          .
        </p>

        <form
          action={`mailto:${REPORTS_EMAIL}`}
          method="get"
          encType="text/plain"
          className="mt-10 space-y-5 rounded-[1.75rem] border border-slate-200 bg-white p-6 shadow-[0_18px_48px_rgba(15,23,42,0.08)] sm:p-8"
        >
          <div>
            <label htmlFor="subject" className="block text-xs font-black uppercase tracking-widest text-slate-500">
              Subject
            </label>
            <input
              id="subject"
              name="subject"
              type="text"
              required
              placeholder="Brief summary of your issue"
              className="mt-2 w-full rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
          <div>
            <label htmlFor="body" className="block text-xs font-black uppercase tracking-widest text-slate-500">
              Message
            </label>
            <textarea
              id="body"
              name="body"
              required
              rows={6}
              placeholder="Describe the issue or question..."
              className="mt-2 w-full resize-none rounded-xl border border-slate-200 px-4 py-3 text-sm font-medium text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-400/20"
            />
          </div>
          <button
            type="submit"
            className="w-full rounded-xl bg-amber-400 px-6 py-3.5 text-base font-extrabold text-slate-950 shadow-md transition hover:bg-amber-300"
          >
            Send support ticket
          </button>
          <p className="text-center text-xs text-slate-500">
            This will open your email app addressed to <span className="font-semibold">{REPORTS_EMAIL}</span>.
          </p>
        </form>
      </section>
      <PublicFooter />
    </main>
  );
}
