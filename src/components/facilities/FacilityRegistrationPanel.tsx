"use client";

import { useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import { FacilityQuickStartActions } from "@/components/facilities/FacilityQuickStartActions";
import { getFacilityQuickStartAsset } from "@/components/facilities/facilityQuickStartAsset";
import { FacilityStartupSteps } from "@/components/facilities/FacilityStartupSteps";
import { publicBranding } from "@/lib/publicBranding";
import { withPortalBasePath } from "@/lib/config";
import {
  fetchFacilityRegistration,
  updateFacilityRegistration,
  type FacilityRegistrationConfiguration,
} from "@/lib/services/facilityOnboardingService";
import { UsersAdapter } from "@/lib/services/usersService";
import type { RoleCatalog } from "@/lib/types";

const blockedRoleKeys = new Set([
  "admin",
  "super_admin",
  "org_admin",
  "facility_manager",
  "email_admin",
]);

function suggestedSlug(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

function isAllowedRole(role: RoleCatalog) {
  return (
    role.status === "active" &&
    !blockedRoleKeys.has(role.key) &&
    !role.permissions.some(
      (permission) =>
        permission.endsWith(":manage") || permission === "audit:read",
    )
  );
}

function displayTimestamp(value: string | null) {
  if (!value) return "Not yet";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? value : date.toLocaleString();
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
  const [configuration, setConfiguration] =
    useState<FacilityRegistrationConfiguration | null>(null);
  const [roles, setRoles] = useState<RoleCatalog[]>([]);
  const [slug, setSlug] = useState(suggestedSlug(facilityName));
  const [roleKey, setRoleKey] = useState("user");
  const [enabled, setEnabled] = useState(false);
  const [displayName, setDisplayName] = useState(facilityName);
  const [supportEmail, setSupportEmail] = useState(publicBranding.supportEmail);
  const [supportPhone, setSupportPhone] = useState("");
  const [iosStoreUrl, setIosStoreUrl] = useState(publicBranding.appStoreUrl);
  const [androidStoreUrl, setAndroidStoreUrl] = useState(
    publicBranding.googlePlayUrl,
  );
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
        setSupportEmail(
          nextConfiguration.support.email || publicBranding.supportEmail,
        );
        setSupportPhone(nextConfiguration.support.phone || "");
        setIosStoreUrl(
          nextConfiguration.stores.ios || publicBranding.appStoreUrl,
        );
        setAndroidStoreUrl(
          nextConfiguration.stores.android || publicBranding.googlePlayUrl,
        );
        setRoles(nextRoles.filter(isAllowedRole));
      } catch (loadError) {
        if (active)
          setError(
            loadError instanceof Error
              ? loadError.message
              : "Unable to load registration settings.",
          );
      }
    })();
    return () => {
      active = false;
    };
  }, [facilityId, facilityName, organizationId]);

  const publishedQuickStart = useMemo(
    () => getFacilityQuickStartAsset({ slug, id: facilityId }),
    [facilityId, slug],
  );

  const registrationUrl = useMemo(() => {
    if (publishedQuickStart) return publishedQuickStart.registrationUrl;
    if (!slug) return "";
    if (configuration?.registrationUrl) {
      try {
        const url = new URL(configuration.registrationUrl);
        url.searchParams.set("facility", slug);
        return url.toString();
      } catch {
        return configuration.registrationUrl;
      }
    }
    if (typeof window === "undefined") return "";
    const localJoin = withPortalBasePath(
      `/join/?facility=${encodeURIComponent(slug)}`,
    );
    return new URL(localJoin, window.location.origin).toString();
  }, [configuration, publishedQuickStart, slug]);

  const save = async () => {
    setBusy(true);
    setError(null);
    setMessage(null);
    try {
      const next = await updateFacilityRegistration(
        organizationId,
        facilityId,
        {
          slug,
          enabled,
          defaultRoleKey: roleKey,
          onboardingDisplayName: displayName,
          supportEmail,
          supportPhone,
          iosStoreUrl,
          androidStoreUrl,
        },
      );
      setConfiguration(next);
      setSlug(next.slug);
      setEnabled(next.enabled);
      setRoleKey(next.defaultRoleKey);
      setMessage(
        next.enabled
          ? `Registration is enabled. Packet revision ${next.packetRevision} is ready.`
          : "Registration settings saved. Public registration remains closed.",
      );
    } catch (saveError) {
      setError(
        saveError instanceof Error
          ? saveError.message
          : "Unable to save registration settings.",
      );
    } finally {
      setBusy(false);
    }
  };

  return (
    <section
      className="space-y-3 rounded-xl border border-slate-200 bg-slate-50 p-3"
      aria-label="Facility registration"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-black uppercase tracking-widest text-slate-400">
            Registration
          </p>
          <p className="mt-1 text-xs font-semibold text-slate-700">
            Use this link, QR, and quick-start guide to give someone access to
            this facility.
          </p>
        </div>
        <span
          className={`rounded-full px-2 py-1 text-xs font-black uppercase tracking-wider ${enabled ? "bg-emerald-100 text-emerald-700" : "bg-slate-200 text-slate-600"}`}
        >
          {enabled ? "Enabled" : "Disabled"}
        </span>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <label className="block text-xs font-bold text-slate-700">
          Registration link name
          <input
            value={slug}
            onChange={(event) => setSlug(suggestedSlug(event.target.value))}
            disabled={!canManage || busy}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60"
          />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Printed facility name
          <input
            value={displayName}
            onChange={(event) => setDisplayName(event.target.value)}
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
            {roles.length ? (
              roles.map((role) => (
                <option key={role.key} value={role.key}>
                  {role.name}
                </option>
              ))
            ) : (
              <option value="user">User</option>
            )}
          </select>
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Support email
          <input
            type="email"
            value={supportEmail}
            onChange={(event) => setSupportEmail(event.target.value)}
            disabled={!canManage || busy}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60"
          />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          Support phone
          <input
            value={supportPhone}
            onChange={(event) => setSupportPhone(event.target.value)}
            disabled={!canManage || busy}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60"
          />
        </label>
        <label className="block text-xs font-bold text-slate-700">
          iPhone installation URL
          <input
            type="url"
            value={iosStoreUrl}
            onChange={(event) => setIosStoreUrl(event.target.value)}
            disabled={!canManage || busy}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60"
          />
        </label>
        <label className="block text-xs font-bold text-slate-700 sm:col-span-2">
          Android installation URL
          <input
            type="url"
            value={androidStoreUrl}
            onChange={(event) => setAndroidStoreUrl(event.target.value)}
            disabled={!canManage || busy}
            className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-950 disabled:opacity-60"
          />
        </label>
      </div>
      <label className="flex items-center justify-between gap-3 rounded-lg border border-slate-200 bg-white p-3 text-xs font-bold text-slate-800">
        Accept registration from this link
        <input
          type="checkbox"
          checked={enabled}
          onChange={(event) => setEnabled(event.target.checked)}
          disabled={!canManage || busy}
          className="h-4 w-4"
        />
      </label>

      <FacilityQuickStartActions
        facilityName={displayName || facilityName}
        organizationName={
          configuration?.organizationName || organizationName || ""
        }
        registrationUrl={registrationUrl}
        slug={slug}
        active={Boolean(
          enabled &&
          registrationUrl &&
          (configuration?.available ?? true) &&
          (configuration?.globalEnabled ?? true),
        )}
        supportName={configuration?.support.displayName}
        supportEmail={supportEmail || publicBranding.supportEmail}
        supportPhone={supportPhone}
        appStoreUrl={iosStoreUrl || publicBranding.appStoreUrl}
        googlePlayUrl={androidStoreUrl || publicBranding.googlePlayUrl}
        packetRevision={configuration?.packetRevision || 1}
        lastSuccessfulEnrollmentAt={
          configuration?.lastSuccessfulEnrollment?.completedAt
        }
        publishedQuickStart={publishedQuickStart}
        showTestLink
      />

      {configuration?.recentEnrollments.length ? (
        <details className="rounded-lg border border-slate-200 bg-white p-3">
          <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-slate-600">
            Recent enrollment activity
          </summary>
          <div className="mt-3 overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-slate-500">
                <tr>
                  <th className="pb-2 pr-3">Started</th>
                  <th className="pb-2 pr-3">Status</th>
                  <th className="pb-2 pr-3">User</th>
                  <th className="pb-2">Last action</th>
                </tr>
              </thead>
              <tbody>
                {configuration.recentEnrollments.map((entry) => (
                  <tr
                    key={entry.sessionId}
                    className="border-t border-slate-100 text-slate-700"
                  >
                    <td className="py-2 pr-3 whitespace-nowrap">
                      {displayTimestamp(entry.createdAt)}
                    </td>
                    <td className="py-2 pr-3 font-bold">
                      {entry.status}
                      {entry.failureCode ? ` · ${entry.failureCode}` : ""}
                    </td>
                    <td className="py-2 pr-3">
                      {entry.userEmail || "Not authenticated"}
                    </td>
                    <td className="py-2">
                      <span className="font-semibold">
                        {entry.lastEventKey.replace("registration.", "") ||
                          "started"}
                      </span>
                      <span className="mt-0.5 block whitespace-nowrap text-slate-500">
                        {displayTimestamp(entry.lastEventAt || entry.createdAt)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      ) : (
        <p className="rounded-lg border border-slate-200 bg-white p-3 text-xs font-semibold text-slate-500">
          No registration sessions have been recorded for this facility yet.
        </p>
      )}

      <details className="rounded-lg border border-slate-200 bg-white p-3">
        <summary className="cursor-pointer text-xs font-black uppercase tracking-widest text-slate-600">
          Preview startup guide
        </summary>
        <div className="mt-3">
          <FacilityStartupSteps
            facilityName={displayName || facilityName}
            steps={publishedQuickStart?.steps}
          />
        </div>
      </details>

      {configuration && !configuration.globalEnabled ? (
        <p className="rounded-lg bg-amber-100 p-2 text-xs font-semibold text-amber-900">
          The global registration kill switch is active. No facility can enroll
          users.
        </p>
      ) : null}
      {message ? (
        <p role="status" className="text-xs font-semibold text-emerald-700">
          {message}
        </p>
      ) : null}
      {error ? (
        <p role="alert" className="text-xs font-semibold text-rose-700">
          {error}
        </p>
      ) : null}
      <button
        type="button"
        onClick={() => void save()}
        disabled={!canManage || busy || !slug || !roleKey || !displayName}
        className="flex w-full items-center justify-center gap-2 rounded-lg bg-slate-950 px-3 py-2 text-xs font-black uppercase tracking-widest text-white disabled:opacity-50"
      >
        <Save className="h-3.5 w-3.5" />{" "}
        {busy ? "Working…" : "Save Registration"}
      </button>
    </section>
  );
}
