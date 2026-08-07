"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import QRCode from "qrcode";
import { saveAs } from "file-saver";
import { Copy, Download, ExternalLink, QrCode, Save } from "lucide-react";
import { FacilityStartupSteps } from "@/components/facilities/FacilityStartupSteps";
import { buildFacilityGuidePdfDefinition } from "@/components/facilities/facilityStartupGuide";
import { createPdfBlob } from "@/lib/pdfClient";
import { publicBranding } from "@/lib/publicBranding";
import { withPortalBasePath } from "@/lib/config";
import {
  fetchFacilityRegistration,
  updateFacilityRegistration,
  type FacilityRegistrationConfiguration,
} from "@/lib/services/facilityOnboardingService";
import { UsersAdapter } from "@/lib/services/usersService";
import type { RoleCatalog } from "@/lib/types";

const blockedRoleKeys = new Set(["admin", "super_admin", "org_admin", "facility_manager", "email_admin"]);

function suggestedSlug(value: string) {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
}

function isAllowedRole(role: RoleCatalog) {
  return role.status === "active" && !blockedRoleKeys.has(role.key) &&
    !role.permissions.some((permission) => permission.endsWith(":manage") || permission === "audit:read");
}

export function FacilityRegistrationPanel({
  organizationId,
  organizationName,
  facilityId,
  facilityName,
  canManage,
}: {
  organizationId: string;
  organizationName?: string;
  facilityId: string;
  facilityName: string;
  canManage: boolean;
}) {
  const [configuration, setConfiguration] = useState<FacilityRegistrationConfiguration | null>(null);
  const [roles, setRoles] = useState<RoleCatalog[]>([]);
  const [slug, setSlug] = useState(suggestedSlug(facilityName));
  const [roleKey, setRoleKey] = useState("user");
  const [enabled, setEnabled] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    void (async () => {
      try {
        const [nextConfiguration, nextRoles] = await Promise.all([
          fetchFacilityRegistration(organizationId, facilityId),
          UsersAdapter.getRoles(organizationId),
        ]);
        if (!active) return;
        setError(null);
        setConfiguration(nextConfiguration);
        setSlug(nextConfiguration.slug || suggestedSlug(facilityName));
        setRoleKey(nextConfiguration.defaultRoleKey || "user");
        setEnabled(nextConfiguration.enabled);
        setRoles(nextRoles.filter(isAllowedRole));
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load registration settings.");
      }
    })();
    return () => { active = false; };
  }, [facilityId, facilityName, organizationId]);

  const registrationUrl = useMemo(() => {
    if (!slug) return "";
    if (configuration?.registrationUrl) return configuration.registrationUrl;
    if (typeof window === "undefined") return "";
    const localJoin = withPortalBasePath(`/join/?facility=${encodeURIComponent(slug)}`);
    return new URL(localJoin, window.location.origin).toString();
  }, [configuration?.registrationUrl, slug]);

  useEffect(() => {
    let active = true;
    if (!registrationUrl) {
      void Promise.resolve().then(() => { if (active) setQrDataUrl(""); });
    } else {
      void QRCode.toDataURL(registrationUrl, { width: 420, margin: 2, errorCorrectionLevel: "M" })
        .then((value) => { if (active) setQrDataUrl(value); })
        .catch(() => { if (active) setQrDataUrl(""); });
    }
    return () => { active = false; };
  }, [registrationUrl]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const next = await updateFacilityRegistration(organizationId, facilityId, {
        slug,
        enabled,
        defaultRoleKey: roleKey,
      });
      setConfiguration(next);
      setSlug(next.slug);
      setEnabled(next.enabled);
      setRoleKey(next.defaultRoleKey);
      setMessage(next.enabled ? "Registration is enabled and the permanent link is ready." : "Registration settings saved. Public registration remains closed.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save registration settings.");
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    if (!qrDataUrl || !registrationUrl) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await createPdfBlob(buildFacilityGuidePdfDefinition({
        facilityName,
        organizationName: configuration?.organizationName || organizationName || "",
        registrationUrl,
        qrDataUrl,
        supportName: "Inspection-Trac Support",
        supportEmail: publicBranding.supportEmail,
        appName: publicBranding.appName,
        appStoreUrl: publicBranding.appStoreUrl,
        googlePlayUrl: publicBranding.googlePlayUrl,
      }));
      saveAs(blob, `${slug || "facility"}-inspection-trac-quick-start.pdf`);
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : "Unable to create the quick-start PDF.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3" aria-label="Facility registration">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Registration</p>
          <p className="mt-1 text-xs font-semibold text-slate-700">One permanent facility link for signup, app install, and assignment.</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-black uppercase tracking-wider ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <label className="block text-xs font-bold text-slate-700">
        Registration slug
        <input
          value={slug}
          onChange={(event) => setSlug(suggestedSlug(event.target.value))}
          disabled={!canManage || busy}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60"
        />
      </label>
      <label className="block text-xs font-bold text-slate-700">
        Default role
        <select
          value={roleKey}
          onChange={(event) => setRoleKey(event.target.value)}
          disabled={!canManage || busy}
          className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60"
        >
          {roles.length ? roles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>) : <option value="user">User</option>}
        </select>
      </label>
      <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs font-bold text-slate-800">
        Accept registration from this link
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={!canManage || busy} className="h-4 w-4" />
      </label>

      {registrationUrl ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-[112px_1fr]">
            {qrDataUrl ? <Image src={qrDataUrl} alt={`Registration QR code for ${facilityName}`} width={112} height={112} unoptimized className="h-28 w-28 rounded-lg border border-slate-200" /> : <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-slate-100"><QrCode className="h-8 w-8 text-slate-400" /></div>}
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Permanent registration link</p>
              <p className="mt-2 break-all text-xs font-semibold text-slate-700">{registrationUrl}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <button type="button" onClick={() => void navigator.clipboard.writeText(registrationUrl)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700"><Copy className="h-3.5 w-3.5" /> Copy</button>
                <Link href={registrationUrl} target="_blank" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700"><ExternalLink className="h-3.5 w-3.5" /> Test</Link>
                <button type="button" onClick={() => void downloadPdf()} disabled={!qrDataUrl || busy} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50"><Download className="h-3.5 w-3.5" /> Quick Start PDF</button>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      <details className="rounded-lg border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-slate-600">Preview startup guide</summary>
        <div className="mt-3"><FacilityStartupSteps /></div>
      </details>

      {configuration && !configuration.globalEnabled ? <p className="rounded-lg bg-amber-100 p-2 text-xs font-semibold text-amber-900">The global registration kill switch is active. No facility can enroll users.</p> : null}
      {message ? <p role="status" className="text-xs font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p> : null}
      <button type="button" onClick={() => void save()} disabled={!canManage || busy || !slug || !roleKey} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">
        <Save className="h-3.5 w-3.5" /> {busy ? "Working…" : "Save Registration"}
      </button>
    </section>
  );
}
