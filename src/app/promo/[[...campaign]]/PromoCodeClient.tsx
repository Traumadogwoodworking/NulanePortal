"use client";

import { FormEvent, useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";
import { CheckCircle2, Download, Gift, KeyRound, LoaderCircle, QrCode } from "lucide-react";
import { apiFetch, PortalApiHttpError } from "@/portal/core/data/apiClient";
import { usePortalSession } from "@/lib/portalSession";
import { publicBranding } from "@/lib/publicBranding";

type PromoCodeClientProps = {
  campaign: string;
};

type PromoRedemptionResponse = {
  code?: string;
  message?: string;
  coupon?: {
    code?: string;
    description?: string;
  };
};

function promoErrorMessage(error: unknown): string {
  if (error instanceof PortalApiHttpError && error.userMessage) {
    return error.userMessage;
  }
  return "That promo code could not be applied. Check the code and try again.";
}

export function PromoCodeClient({ campaign }: PromoCodeClientProps) {
  const { session } = usePortalSession();
  const [code, setCode] = useState("");
  const [submitting, startPromoSubmission] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const scanStartedRef = useRef(false);

  const userIdentity = useMemo(
    () => ({
      userId: session?.user?.user_id?.trim() ?? "",
      email: session?.user?.email?.trim().toLowerCase() ?? "",
    }),
    [session?.user?.email, session?.user?.user_id],
  );

  const trackPromoEvent = useCallback(
    async (event: "scan" | "download", asset: string) => {
      if (!userIdentity.userId && !userIdentity.email) return;
      const query = new URLSearchParams({
        code: "__DEFINIAN_EVENT__",
        event,
        asset,
        source: "definian_portal",
        ...(campaign ? { campaign } : {}),
      });
      await apiFetch(`/coupons?${query.toString()}`, {
        portal: {
          callerLabel: `promo.${event}`,
          skipAuthRedirect: true,
        },
      });
    },
    [campaign, userIdentity.email, userIdentity.userId],
  );

  useEffect(() => {
    if (!campaign || scanStartedRef.current || (!userIdentity.userId && !userIdentity.email)) return;
    scanStartedRef.current = true;
    const storageKey = `definian-promo-scan:v1:${campaign}`;
    try {
      if (window.sessionStorage.getItem(storageKey) === "1") return;
      window.sessionStorage.setItem(storageKey, "1");
    } catch {
      // Session storage is an optimization only; the authenticated request is the durable record.
    }
    void trackPromoEvent("scan", "promo_qr").catch((trackingError) => {
      console.warn("[definian-promo] scan tracking failed", trackingError);
      try {
        window.sessionStorage.removeItem(storageKey);
      } catch {
        // A blocked storage API does not block the promo screen.
      }
    });
  }, [campaign, trackPromoEvent, userIdentity.email, userIdentity.userId]);

  const submitPromo = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    const normalizedCode = code.trim().toUpperCase();
    if (!normalizedCode) {
      setError("Enter a promo code to continue.");
      setMessage(null);
      return;
    }

    setError(null);
    setMessage(null);
    startPromoSubmission(async () => {
      try {
        const response = await apiFetch<PromoRedemptionResponse>("/discounts", {
          method: "POST",
          body: JSON.stringify({
            code: normalizedCode,
            user: userIdentity.userId,
            email: userIdentity.email,
            metadata: {
              source: "definian_portal",
              ...(campaign ? { campaign } : {}),
            },
          }),
          portal: { callerLabel: "promo.redeem" },
        });
        setMessage(response.message || `Promo code ${response.coupon?.code || response.code || normalizedCode} applied.`);
      } catch (submitError) {
        setError(promoErrorMessage(submitError));
      }
    });
  };

  const trackDownload = (asset: string) => {
    void trackPromoEvent("download", asset).catch((trackingError) => {
      console.warn("[definian-promo] download tracking failed", trackingError);
    });
  };

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <section className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-[0_24px_80px_-42px_rgba(13,44,113,0.45)]">
        <div className="bg-[#0d2c71] px-6 py-8 text-white sm:px-9">
          <div className="flex flex-wrap items-center gap-3">
            <span className="inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-xs font-black uppercase tracking-[0.2em]">
              <Gift className="h-4 w-4" /> Definian promo access
            </span>
            {campaign ? (
              <span className="rounded-full bg-[#00ab63] px-3 py-1 text-xs font-bold text-white">Campaign: {campaign}</span>
            ) : null}
          </div>
          <h1 className="mt-5 text-3xl font-black tracking-tight sm:text-4xl">Enter a promo code</h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-blue-100 sm:text-base">
            Promo codes are optional right now. Every signed-in Definian account keeps normal access whether or not a code is entered.
          </p>
        </div>

        <div className="grid gap-8 p-6 sm:p-9 lg:grid-cols-[1.2fr_0.8fr]">
          <form onSubmit={submitPromo} className="space-y-4" aria-label="Apply promo code">
            <div>
              <label htmlFor="promo-code" className="text-sm font-black text-slate-900">
                Promo code
              </label>
              <div className="mt-2 flex rounded-2xl border border-slate-300 bg-white shadow-sm focus-within:border-[#0d2c71] focus-within:ring-4 focus-within:ring-blue-100">
                <span className="flex items-center pl-4 text-slate-400" aria-hidden="true">
                  <KeyRound className="h-5 w-5" />
                </span>
                <input
                  id="promo-code"
                  value={code}
                  onChange={(inputEvent) => setCode(inputEvent.target.value.toUpperCase())}
                  autoComplete="off"
                  inputMode="text"
                  placeholder="ENTER CODE"
                  className="min-w-0 flex-1 bg-transparent px-3 py-4 text-base font-black uppercase tracking-[0.12em] text-slate-950 outline-none placeholder:text-slate-400"
                />
              </div>
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-2xl bg-[#00ab63] px-5 py-3 text-sm font-black text-white shadow-sm transition hover:bg-[#008f53] disabled:cursor-not-allowed disabled:opacity-60"
            >
              {submitting ? <LoaderCircle className="h-5 w-5 animate-spin" /> : <Gift className="h-5 w-5" />}
              {submitting ? "Applying..." : "Apply promo code"}
            </button>
            {message ? (
              <div role="status" className="flex items-start gap-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm font-semibold text-emerald-900">
                <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0" />
                <span>{message}</span>
              </div>
            ) : null}
            {error ? (
              <div role="alert" className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm font-semibold text-rose-900">
                {error}
              </div>
            ) : null}
          </form>

          <aside className="rounded-[1.5rem] border border-slate-200 bg-slate-50 p-5">
            <div className="flex items-center gap-3">
              <span className="rounded-xl bg-white p-2 text-[#0d2c71] shadow-sm"><QrCode className="h-5 w-5" /></span>
              <div>
                <h2 className="font-black text-slate-950">Tracked promo QR</h2>
                <p className="text-xs text-slate-500">Scan and download actions are recorded after sign-in.</p>
              </div>
            </div>
            <div className="mt-5 space-y-3">
              <a
                href={publicBranding.appStoreUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackDownload("ios_app")}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 transition hover:border-[#0d2c71]"
              >
                Install for iPhone or iPad <Download className="h-4 w-4" />
              </a>
              <a
                href={publicBranding.googlePlayUrl}
                target="_blank"
                rel="noreferrer"
                onClick={() => trackDownload("android_app")}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 transition hover:border-[#0d2c71]"
              >
                Install for Android <Download className="h-4 w-4" />
              </a>
              <a
                href="/resources/definian/definian-inspection-quick-start.pdf?v=7"
                target="_blank"
                rel="noreferrer"
                onClick={() => trackDownload("quick_start_pdf")}
                className="flex items-center justify-between rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm font-black text-slate-900 transition hover:border-[#0d2c71]"
              >
                Download quick-start guide <Download className="h-4 w-4" />
              </a>
            </div>
          </aside>
        </div>
      </section>
    </div>
  );
}
