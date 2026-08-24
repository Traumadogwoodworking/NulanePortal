"use client";

import { useEffect, useMemo, useState } from "react";
import Image from "next/image";
import QRCode from "qrcode";
import { saveAs } from "file-saver";
import { Copy, Download, ExternalLink, FileCode2, QrCode, Save } from "lucide-react";
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

function displayTimestamp(value: string | null) {
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
  const [displayName, setDisplayName] = useState(facilityName);
  const [supportEmail, setSupportEmail] = useState(publicBranding.supportEmail);
  const [supportPhone, setSupportPhone] = useState("");
  const [iosStoreUrl, setIosStoreUrl] = useState(publicBranding.appStoreUrl);
  const [androidStoreUrl, setAndroidStoreUrl] = useState(publicBranding.googlePlayUrl);
  const [qrDataUrl, setQrDataUrl] = useState("");
  const [qrSvg, setQrSvg] = useState("");
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
        setDisplayName(nextConfiguration.onboardingDisplayName || facilityName);
        setSupportEmail(nextConfiguration.support.email || publicBranding.supportEmail);
        setSupportPhone(nextConfiguration.support.phone || "");
        setIosStoreUrl(nextConfiguration.stores.ios || publicBranding.appStoreUrl);
        setAndroidStoreUrl(nextConfiguration.stores.android || publicBranding.googlePlayUrl);
        setRoles(nextRoles.filter(isAllowedRole));
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load registration settings.");
      }
    })();
    return () => { active = false; };
  }, [facilityId, facilityName, organizationId]);

  const configuredRegistrationUrl = configuration?.registrationUrl;
  const registrationUrl = useMemo(() => {
    if (!slug) return "";
    if (configuredRegistrationUrl) {
      try {
        const url = new URL(configuredRegistrationUrl);
        url.searchParams.set("facility", slug);
        return url.toString();
      } catch {
        return configuredRegistrationUrl;
      }
    }
    if (typeof window === "undefined") return "";
    const localJoin = withPortalBasePath(`/join/?facility=${encodeURIComponent(slug)}`);
    return new URL(localJoin, window.location.origin).toString();
  }, [configuredRegistrationUrl, slug]);
  const testUrl = useMemo(() => appendTestSource(registrationUrl), [registrationUrl]);

  useEffect(() => {
    let active = true;
    if (!registrationUrl) {
      void Promise.resolve().then(() => {
        if (!active) return;
        setQrDataUrl("");
        setQrSvg("");
      });
    } else {
      void Promise.all([
        QRCode.toDataURL(registrationUrl, { width: 420, margin: 4, errorCorrectionLevel: "M" }),
        QRCode.toString(registrationUrl, { type: "svg", margin: 4, errorCorrectionLevel: "M" }),
      ]).then(([dataUrl, svg]) => {
        if (!active) return;
        setQrDataUrl(dataUrl);
        setQrSvg(svg);
      }).catch(() => {
        if (!active) return;
        setQrDataUrl("");
        setQrSvg("");
      });
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
        onboardingDisplayName: displayName,
        supportEmail,
        supportPhone,
        iosStoreUrl,
        androidStoreUrl,
      });
      setConfiguration(next);
      setSlug(next.slug);
      setEnabled(next.enabled);
      setRoleKey(next.defaultRoleKey);
      setMessage(next.enabled
        ? `Registration is enabled. Packet revision ${next.packetRevision} is ready.`
        : "Registration settings saved. Public registration remains closed.");
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "Unable to save registration settings.");
    } finally {
      setBusy(false);
    }
  };

  const downloadPdf = async () => {
    if (!registrationUrl) return;
    setBusy(true);
    setError(null);
    try {
      const blob = await createPdfBlob(buildFacilityGuidePdfDefinition({
        facilityName: displayName || facilityName,
        organizationName: configuration?.organizationName || organizationName || "",
        registrationUrl,
        supportName: configuration?.support.displayName || `${publicBranding.appName} Support`,
        supportEmail: supportEmail || publicBranding.supportEmail,
        supportPhone,
        appName: publicBranding.appName,
        appStoreUrl: iosStoreUrl || publicBranding.appStoreUrl,
        googlePlayUrl: androidStoreUrl || publicBranding.googlePlayUrl,
        packetRevision: configuration?.packetRevision || 1,
      }));
      saveAs(blob, `${slug || "facility"}-definian-inspection-facility-access.pdf`);
    } catch (pdfError) {
      setError(pdfError instanceof Error ? pdfError.message : "Unable to create the two-sided facility packet.");
    } finally {
      setBusy(false);
    }
  };

  const downloadSvg = () => {
    if (!qrSvg) return;
    saveAs(new Blob([qrSvg], { type: "image/svg+xml;charset=utf-8" }), `${slug || "facility"}-definian-inspection-qr.svg`);
  };

  return (
    <section className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3" aria-label="Facility registration">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">Registration</p>
          <p className="mt-1 text-xs font-semibold text-slate-700">One permanent facility link; every visit creates a short-lived, server-owned enrollment session.</p>
        </div>
        <span className={`rounded-full px-2 py-1 text-xs font-black uppercase tracking-wider ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}>
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold text-slate-700">
          Registration slug
          <input value={slug} onChange={(event) => setSlug(suggestedSlug(event.target.value))} disabled={!canManage || busy} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60" />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Printed facility name
          <input value={displayName} onChange={(event) => setDisplayName(event.target.value)} disabled={!canManage || busy} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60" />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Default role
          <select value={roleKey} onChange={(event) => setRoleKey(event.target.value)} disabled={!canManage || busy} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60">
            {roles.length ? roles.map((role) => <option key={role.key} value={role.key}>{role.name}</option>) : <option value="user">User</option>}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Support email
          <input type="email" value={supportEmail} onChange={(event) => setSupportEmail(event.target.value)} disabled={!canManage || busy} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60" />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Support phone
          <input value={supportPhone} onChange={(event) => setSupportPhone(event.target.value)} disabled={!canManage || busy} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60" />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          iPhone installation URL
          <input type="url" value={iosStoreUrl} onChange={(event) => setIosStoreUrl(event.target.value)} disabled={!canManage || busy} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60" />
        </label>
        <label className="block text-xs font-bold text-slate-700 sm:col-span-2">
          Android installation URL
          <input type="url" value={androidStoreUrl} onChange={(event) => setAndroidStoreUrl(event.target.value)} disabled={!canManage || busy} className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60" />
        </label>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs font-bold text-slate-800">
        Accept registration from this link
        <input type="checkbox" checked={enabled} onChange={(event) => setEnabled(event.target.checked)} disabled={!canManage || busy} className="h-4 w-4" />
      </label>

      {registrationUrl ? (
        <div className="rounded-xl border border-slate-200 bg-white p-3">
          <div className="grid gap-3 sm:grid-cols-[112px_1fr]">
            {qrDataUrl ? <Image src={qrDataUrl} alt={`Registration QR code for ${facilityName}`} width={112} height={112} unoptimized className="h-28 w-28 rounded-lg border border-slate-200" /> : <div className="flex h-28 w-28 items-center justify-center rounded-lg bg-slate-100"><QrCode className="h-8 w-8 text-slate-400" /></div>}
            <div className="min-w-0">
              <p className="text-xs font-black uppercase tracking-widest text-slate-400">Direct registration link</p>
              <p className="mt-2 break-all text-xs font-semibold text-slate-700">{registrationUrl}</p>
              <p className="mt-2 text-xs text-slate-500">Packet revision {configuration?.packetRevision || 1} · Last signup {displayTimestamp(configuration?.lastSuccessfulEnrollment?.completedAt || null)}</p>
              <div className="mt-3 flex flex-wrap gap-2">
                <a href={registrationUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700"><ExternalLink className="h-3.5 w-3.5" /> Open</a>
                <button type="button" onClick={() => void navigator.clipboard.writeText(registrationUrl)} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700"><Copy className="h-3.5 w-3.5" /> Copy</button>
                <button type="button" onClick={downloadSvg} disabled={!qrSvg} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50"><FileCode2 className="h-3.5 w-3.5" /> QR SVG</button>
                <button type="button" onClick={() => void downloadPdf()} disabled={busy} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1.5 text-xs font-bold text-slate-700 disabled:opacity-50"><Download className="h-3.5 w-3.5" /> Two-sided packet</button>
                <a href={testUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 rounded-lg bg-slate-950 px-2 py-1.5 text-xs font-bold text-white"><ExternalLink className="h-3.5 w-3.5" /> Test new session</a>
              </div>
            </div>
          </div>
        </div>
      ) : null}

      {configuration?.recentEnrollments.length ? (
        <details className="rounded-lg border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-slate-600">Recent enrollment activity</summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500"><tr><th className="pb-2 pr-3">Started</th><th className="pb-2 pr-3">Status</th><th className="pb-2 pr-3">User</th><th className="pb-2">Last action</th></tr></thead>
              <tbody>{configuration.recentEnrollments.map((entry) => (
                <tr key={entry.sessionId} className="border-t border-slate-100 text-slate-700">
                  <td className="py-2 pr-3 whitespace-nowrap">{displayTimestamp(entry.createdAt)}</td>
                  <td className="py-2 pr-3 font-bold">{entry.status}{entry.failureCode ? ` · ${entry.failureCode}` : ""}</td>
                  <td className="py-2 pr-3">{entry.userEmail || "Not authenticated"}</td>
                  <td className="py-2">
                    <span className="font-semibold">{entry.lastEventKey.replace("registration.", "") || "started"}</span>
                    <span className="mt-0.5 block whitespace-nowrap text-slate-500">{displayTimestamp(entry.lastEventAt || entry.createdAt)}</span>
                  </td>
                </tr>
              ))}</tbody>
            </table>
          </div>
        </details>
      ) : <p className="rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-500">No registration sessions have been recorded for this facility yet.</p>}

      <details className="rounded-lg border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-slate-600">Preview startup guide</summary>
        <div className="mt-3"><FacilityStartupSteps /></div>
      </details>

      {configuration && !configuration.globalEnabled ? <p className="rounded-lg bg-amber-100 p-2 text-xs font-semibold text-amber-900">The global registration kill switch is active. No facility can enroll users.</p> : null}
      {message ? <p role="status" className="text-xs font-semibold text-emerald-700">{message}</p> : null}
      {error ? <p role="alert" className="text-xs font-semibold text-rose-700">{error}</p> : null}
      <button type="button" onClick={() => void save()} disabled={!canManage || busy || !slug || !roleKey || !displayName} className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50">
        <Save className="h-3.5 w-3.5" /> {busy ? "Working…" : "Save Registration"}
      </button>
    </section>
  );
}
