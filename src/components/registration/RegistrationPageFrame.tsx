import type { ReactNode } from "react";
import Image from "next/image";
import { ExternalLink } from "lucide-react";
import { publicBranding } from "@/lib/publicBranding";

export function RegistrationPageFrame({
  eyebrow,
  title,
  subtitle,
  children,
  headerClassName = "bg-slate-950",
  eyebrowClassName = "text-slate-400",
}: {
  eyebrow: string;
  title: string;
  subtitle?: string | null;
  children: ReactNode;
  headerClassName?: string;
  eyebrowClassName?: string;
}) {
  return (
    <main className="min-h-screen bg-slate-100 px-4 py-8 text-slate-950 sm:py-12">
      <div className="mx-auto max-w-3xl overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-xl">
        <header className={`${headerClassName} px-6 py-7 text-white sm:px-10`}>
          <Image
            src={publicBranding.logoPath}
            alt={publicBranding.appName}
            width={240}
            height={48}
            priority
            className="h-10 w-auto object-contain"
          />
          <p className={`mt-6 text-xs font-black uppercase tracking-[0.25em] ${eyebrowClassName}`}>
            {eyebrow}
          </p>
          <h1 className="mt-2 text-3xl font-black tracking-tight sm:text-4xl">{title}</h1>
          {subtitle ? <p className="mt-2 text-sm font-semibold text-slate-300">{subtitle}</p> : null}
        </header>
        <div className="space-y-6 p-6 sm:p-10">{children}</div>
      </div>
    </main>
  );
}

export function RegistrationInstallLinks({
  iosUrl,
  androidUrl,
  onInstall,
  children,
}: {
  iosUrl: string;
  androidUrl: string;
  onInstall?: (platform: "ios" | "android") => void;
  children?: ReactNode;
}) {
  return (
    <section className="grid gap-3 sm:grid-cols-2">
      <a
        href={iosUrl}
        onClick={() => onInstall?.("ios")}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900"
      >
        Install for iPhone <ExternalLink className="h-4 w-4" />
      </a>
      <a
        href={androidUrl}
        onClick={() => onInstall?.("android")}
        target="_blank"
        rel="noreferrer"
        className="inline-flex items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-black text-slate-900"
      >
        Install for Android <ExternalLink className="h-4 w-4" />
      </a>
      {children}
    </section>
  );
}
