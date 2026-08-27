"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { saveAs } from "file-saver";
import { Copy, Download, ExternalLink, FileCode2, QrCode } from "lucide-react";
import type { FacilityQuickStartAsset } from "@/components/facilities/facilityQuickStartAsset";

function displayTimestamp(value?: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
}

function appendTestSource(registrationUrl: string) {
  try {
    const url = new URL(registrationUrl);
    url.searchParams.set("source", "portal_test");
    return url.toString();
  } catch {
    return registrationUrl;
  }
}

export function FacilityQuickStartActions({
  facilityName,
  registrationUrl,
  slug,
  active,
  packetRevision = 1,
  lastSuccessfulEnrollmentAt,
  publishedQuickStart,
  showTestLink = false,
  compact = false,
  showProcedure = false,
}: {
  facilityName: string;
  organizationName: string;
  registrationUrl: string;
  slug: string;
  active: boolean;
  supportName?: string;
  supportEmail?: string;
  supportPhone?: string;
  appStoreUrl?: string;
  googlePlayUrl?: string;
  packetRevision?: number;
  lastSuccessfulEnrollmentAt?: string | null;
  publishedQuickStart?: FacilityQuickStartAsset | null;
  showTestLink?: boolean;
  compact?: boolean;
  showProcedure?: boolean;
}) {
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrSvg, setQrSvg] = useState("");
  const [error, setError] = useState<string | null>(null);
  const effectiveRegistrationUrl =
    publishedQuickStart?.registrationUrl || registrationUrl;
  const testUrl = useMemo(
    () => appendTestSource(effectiveRegistrationUrl),
    [effectiveRegistrationUrl],
  );

  useEffect(() => {
    let mounted = true;
    if (!active || !effectiveRegistrationUrl) {
      void Promise.resolve().then(() => {
        if (!mounted) return;
        setQrDataUrl("");
        setQrSvg("");
      });
      return () => {
        mounted = false;
      };
    }

    void Promise.all([
      QRCode.toDataURL(effectiveRegistrationUrl, {
        width: 420,
        margin: 4,
        errorCorrectionLevel: "M",
      }),
      QRCode.toString(effectiveRegistrationUrl, {
        type: "svg",
        margin: 4,
        errorCorrectionLevel: "M",
      }),
    ])
      .then(([dataUrl, svg]) => {
        if (!mounted) return;
        setQrDataUrl(dataUrl);
        setQrSvg(svg);
        setError(null);
      })
      .catch(() => {
        if (!mounted) return;
        setQrDataUrl("");
        setQrSvg("");
        setError("The QR code could not be created.");
      });

    return () => {
      mounted = false;
    };
  }, [active, effectiveRegistrationUrl]);

  const downloadQr = () => {
    if (!qrSvg) return;
    saveAs(
      new Blob([qrSvg], { type: "image/svg+xml;charset=utf-8" }),
      `${slug || "facility"}-docudent-qr.svg`,
    );
  };

  if (!active || !effectiveRegistrationUrl) {
    return (
      <div className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-xs leading-5 text-slate-600">
        <p className="font-black text-slate-900">Registration disabled</p>
        <p className="mt-1">
          No active registration link, QR, or quick-start guide is available.
        </p>
      </div>
    );
  }

  return (
    <div className="rounded-xl border border-slate-200 bg-white p-3">
      {publishedQuickStart && !showProcedure ? (
        <div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
          <p className="text-sm font-black text-blue-950">Quick start</p>
          <p className="mt-1 text-xs leading-5 text-blue-900">
            {publishedQuickStart.purpose}
          </p>
        </div>
      ) : null}
      <p className="mb-2 text-sm font-black text-slate-950">Scan to register</p>
      <div
        className={
          compact ? "flex gap-3" : "grid gap-3 sm:grid-cols-[112px_1fr]"
        }
      >
        {qrDataUrl ? (
          <Image
            src={qrDataUrl}
            alt={`Registration QR code for ${facilityName}`}
            width={compact ? 80 : 112}
            height={compact ? 80 : 112}
            unoptimized
            className={
              compact
                ? "h-20 w-20 shrink-0 rounded-lg border border-slate-200"
                : "h-28 w-28 rounded-lg border border-slate-200"
            }
          />
        ) : (
          <div
            role="status"
            aria-label={`Generating registration QR code for ${facilityName}`}
            className={
              compact
                ? "flex h-20 w-20 shrink-0 items-center justify-center rounded-lg bg-slate-100"
                : "flex h-28 w-28 items-center justify-center rounded-lg bg-slate-100"
            }
          >
            <QrCode className="h-8 w-8 text-slate-400" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-xs font-black uppercase tracking-widest text-emerald-700">
            Registration enabled
          </p>
          <p className="mt-1 break-all text-xs font-semibold text-slate-700">
            {effectiveRegistrationUrl}
          </p>
          {!compact && !showProcedure ? (
            <p className="mt-2 text-xs text-slate-500">
              Quick-start revision {packetRevision} · Last signup{" "}
              {displayTimestamp(lastSuccessfulEnrollmentAt)}
            </p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-2">
            {publishedQuickStart ? (
              <a
                href={publishedQuickStart.url}
                target="_blank"
                rel="noreferrer"
                className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl bg-slate-950 px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400 sm:w-auto"
              >
                <Download className="h-4 w-4" />
                Open {publishedQuickStart.title} PDF
              </a>
            ) : null}
            <a
              href={effectiveRegistrationUrl}
              target="_blank"
              rel="noreferrer"
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-bold text-slate-800 transition hover:border-slate-400 hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-slate-300 sm:w-auto"
            >
              <ExternalLink className="h-4 w-4" /> Open registration link
            </a>
            {!showProcedure ? (
              <>
                <button
                  type="button"
                  onClick={() =>
                    void navigator.clipboard.writeText(effectiveRegistrationUrl)
                  }
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700"
                >
                  <Copy className="h-3.5 w-3.5" /> Copy
                </button>
                <button
                  type="button"
                  onClick={downloadQr}
                  disabled={!qrSvg}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50"
                >
                  <FileCode2 className="h-3.5 w-3.5" /> QR SVG
                </button>
              </>
            ) : null}
            {showTestLink ? (
              <a
                href={testUrl}
                target="_blank"
                rel="noreferrer"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700"
              >
                <ExternalLink className="h-3.5 w-3.5" /> Test new session
              </a>
            ) : null}
          </div>
        </div>
      </div>
      {publishedQuickStart && showProcedure ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(240px,0.45fr)]">
          <ol className="space-y-3">
            {publishedQuickStart.steps.map((step, index) => (
              <li
                key={step}
                className="flex gap-3 text-sm leading-6 text-slate-700"
              >
                <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-blue-700 text-xs font-black text-white">
                  {index + 1}
                </span>
                <span>{step}</span>
              </li>
            ))}
          </ol>
          <div className="space-y-3">
            <section className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="text-sm font-black text-emerald-950">Done</h3>
              <p className="mt-2 text-sm leading-6 text-emerald-900">
                {publishedQuickStart.done}
              </p>
            </section>
            <section className="rounded-xl border border-slate-200 bg-slate-50 p-4">
              <h3 className="text-sm font-black text-slate-950">Support</h3>
              <p className="mt-2 text-sm font-bold text-slate-800">
                {publishedQuickStart.support.displayName} ·{" "}
                <a
                  href={`mailto:${publishedQuickStart.support.email}`}
                  className="text-blue-700 underline"
                >
                  {publishedQuickStart.support.email}
                </a>
              </p>
              <p className="mt-2 text-xs leading-5 text-slate-600">
                {publishedQuickStart.support.instruction}
              </p>
            </section>
          </div>
        </div>
      ) : null}
      {error ? (
        <p role="alert" className="mt-2 text-xs font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
    </div>
  );
}
