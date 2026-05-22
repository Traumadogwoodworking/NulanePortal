"use client";

import { usePortalSession } from "@/lib/portalSession";
import { useCallback, useEffect, useState, FormEvent, type ChangeEvent } from "react";
import { fetchBranding, saveBranding, uploadBrandingLogo } from "@/lib/services/brandingService";
import type { BrandingSnapshot } from "@/lib/types";
import Image from "next/image";
import { PageSection } from "@/components/ui/PageSection";
import { PageTitle } from "@/components/ui/PageTitle";

export default function BrandingPage() {
  const { organizationId, isOrgAdmin, isAdmin, isSuperAdmin } = usePortalSession();
  const canEditBranding = isOrgAdmin || isAdmin || isSuperAdmin;
  const [formState, setFormState] = useState<BrandingSnapshot>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [uploadMessage, setUploadMessage] = useState<string | null>(null);

  // Live preview states (stored in custom_theme_data)
  const [cardPadding, setCardPadding] = useState(18);
  const [buttonRadius, setButtonRadius] = useState(12);

  const loadBranding = useCallback(async () => {
    if (!organizationId) return;
    setLoading(true);
    try {
      const payload = await fetchBranding(organizationId);
      setFormState(payload);
      
      // Load preview values from theme data if they exist
      const themeData = payload.custom_theme_data as Record<string, unknown>;
      if (themeData?.cardPadding) setCardPadding(themeData.cardPadding as number);
      if (themeData?.buttonRadius) setButtonRadius(themeData.buttonRadius as number);
    } catch (err: unknown) {
      console.error("Failed to load branding", err);
    } finally {
      setLoading(false);
    }
  }, [organizationId]);

  useEffect(() => {
    loadBranding();
  }, [loadBranding]);

  const handleFieldChange = (key: keyof BrandingSnapshot, value: unknown) => {
    setFormState((prev) => ({ ...prev, [key]: value }));
  };

  const handleLogoUpload = async (event: ChangeEvent<HTMLInputElement>) => {
    if (!organizationId || !canEditBranding) return;
    const file = event.target.files?.[0];
    if (!file) return;
    setUploading(true);
    setUploadMessage(null);
    try {
      const logoUrl = await uploadBrandingLogo(organizationId, file);
      setFormState((prev) => ({ ...prev, logo_url: logoUrl }));
      setUploadMessage("Logo uploaded.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to upload logo.";
      setUploadMessage(message);
    } finally {
      setUploading(false);
      event.target.value = "";
    }
  };



  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault();
    if (!organizationId || !canEditBranding) return;
    setSaving(true);
    setStatusMessage(null);
    
    // Finalize theme data in form state
    const finalFormState = {
      ...formState,
      custom_theme_data: {
        ...(formState.custom_theme_data as Record<string, unknown> || {}),
        cardPadding,
        buttonRadius
      }
    };

    try {
      const updated = await saveBranding(organizationId, finalFormState);
      setFormState(updated);
      setStatusMessage("Branding saved. Changes will appear in reports and emails.");
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : "Unable to save branding.";
      setStatusMessage(message);
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-[60vh] items-center justify-center text-slate-700">
        <div className="text-center animate-pulse">
            <div className="w-12 h-12 border-4 border-current border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
            <p className="text-[var(--text-muted)] font-medium">Syncing Branding Studio...</p>
        </div>
      </div>
    );
  }

  return (
    <article className="space-y-6 pb-20">
      <PageTitle
        eyebrow="Administration"
        title="Branding Studio"
        subtitle="Tailor the visual identity of your organization across the portal, PDF reports, and automated emails."
      />

      <form id="brandingForm" className="grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1.6fr)_minmax(320px,0.9fr)]" onSubmit={handleSubmit}>
        <div className="space-y-6">
          <PageSection title="Brand Assets" description="Logo and core organization identity." variant="panel">
            <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
              <div className="space-y-2 md:col-span-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Logo Image URL</label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                  placeholder="https://cdn.yoursite.com/logo.png"
                  value={formState.logo_url || ""}
                  onChange={(e) => handleFieldChange("logo_url", e.target.value)}
                  disabled={!canEditBranding}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Upload Logo</label>
                <input
                  type="file"
                  accept="image/*"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none file:mr-4 file:rounded-full file:border-0 file:bg-slate-100 file:px-3 file:py-1.5 file:text-xs file:font-black file:uppercase file:tracking-widest file:text-slate-700"
                  onChange={handleLogoUpload}
                  disabled={!canEditBranding || uploading}
                />
                <p className="text-xs text-slate-500">
                  {uploading ? "Uploading logo…" : "Use the verified photo upload endpoint for branding assets."}
                </p>
              </div>

              <div className="md:col-span-2 flex items-center gap-6 rounded-3xl border border-slate-100 bg-slate-50 p-4">
                <div className="flex h-20 w-20 flex-shrink-0 items-center justify-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                  {formState.logo_url ? (
                    <Image src={formState.logo_url} alt="Logo preview" width={64} height={64} className="object-contain" />
                  ) : (
                    <span className="text-xs font-black text-slate-300">LOGO</span>
                  )}
                </div>
                <div className="min-w-0">
                  <p className="text-sm font-bold text-slate-900">Logo Preview</p>
                  <p className="text-xs text-slate-500">Appears in header, PDFs, and emails. SVG or transparent PNG recommended.</p>
                  <p className="mt-1 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
                    {formState.organization_name || "Organization branding"}
                  </p>
                </div>
              </div>
            </div>
          </PageSection>

          <PageSection title="Company Metadata" description="Contact info for reports and support." variant="panel">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Support Email</label>
                <input
                  type="email"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                  placeholder="operations@example.com"
                  value={formState.company_email || ""}
                  onChange={(e) => handleFieldChange("company_email", e.target.value)}
                  disabled={!isOrgAdmin}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Contact Phone</label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                  placeholder="(555) 000-0000"
                  value={formState.company_phone || ""}
                  onChange={(e) => handleFieldChange("company_phone", e.target.value)}
                  disabled={!isOrgAdmin}
                />
              </div>
              <div className="md:col-span-2 space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Mailing Address</label>
                <input
                  type="text"
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all"
                  placeholder="123 Facility Way, Suite 400..."
                  value={formState.company_address || ""}
                  onChange={(e) => handleFieldChange("company_address", e.target.value)}
                  disabled={!isOrgAdmin}
                />
              </div>
            </div>
          </PageSection>

          <PageSection title="Email Personalization" description="Closing tags for outbound notifications." variant="panel">
            <div className="space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Email Signature</label>
                <textarea
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all min-h-[100px]"
                  placeholder="Best regards,&#10;Valad Logistics Team"
                  value={formState.email_signature || ""}
                  onChange={(e) => handleFieldChange("email_signature", e.target.value)}
                  disabled={!isOrgAdmin}
                />
              </div>
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Legal Footer</label>
                <textarea
                  className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition-all min-h-[80px]"
                  placeholder="Confidentiality Notice: This message contains information..."
                  value={formState.email_footer || ""}
                  onChange={(e) => handleFieldChange("email_footer", e.target.value)}
                  disabled={!isOrgAdmin}
                />
              </div>
            </div>
          </PageSection>
        </div>

        <div className="space-y-6 text-slate-800">
          <PageSection title="Visual Configuration" description="Layout density & feel." variant="panel">
            <div className="space-y-8 py-2">
              <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Card Spacing</label>
                    <span className="text-xs font-black text-slate-700">{cardPadding}px</span>
                </div>
                <input 
                    type="range" min="8" max="40" step="2"
                    value={cardPadding}
                    onChange={(e) => setCardPadding(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-4">
                <div className="flex justify-between items-center">
                    <label className="text-xs font-bold uppercase tracking-wider text-slate-500">Corner Radius</label>
                    <span className="text-xs font-black text-slate-700">{buttonRadius}px</span>
                </div>
                <input 
                    type="range" min="0" max="32" step="2"
                    value={buttonRadius}
                    onChange={(e) => setButtonRadius(parseInt(e.target.value))}
                    className="w-full h-1.5 bg-slate-200 rounded-lg appearance-none cursor-pointer"
                />
              </div>

              <div className="space-y-4">
                <label className="text-xs font-bold uppercase tracking-wider text-slate-500 block">Typography</label>
                <select 
                    className="w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm outline-none focus:border-slate-400"
                    value={formState.font_family || "Inter"}
                    onChange={(e) => handleFieldChange("font_family", e.target.value)}
                >
                    <option value="Inter">Inter (SaaS Default)</option>
                    <option value="Roboto">Roboto</option>
                    <option value="Space Grotesk">Space Grotesk</option>
                    <option value="Montserrat">Montserrat</option>
                    <option value="Poppins">Poppins</option>
                </select>
              </div>
            </div>
          </PageSection>

          <div className="sticky bottom-6 z-20">
            <div className="flex flex-col gap-3 rounded-3xl border border-slate-200 bg-white p-4 shadow-2xl">
              {statusMessage && (
                <p className={`text-xs font-bold text-center ${statusMessage.includes("Unable") ? "text-rose-500" : "text-emerald-500"}`}>
                    {statusMessage}
                </p>
              )}
              <button
                type="submit"
                disabled={saving || !canEditBranding}
                style={{
                  borderRadius: `${buttonRadius}px`,
                  backgroundColor: "var(--brand-accent)",
                }}
                className="w-full py-4 text-sm font-black text-white hover:opacity-90 transition-all shadow-lg shadow-brand/20 disabled:opacity-50"
              >
                {saving ? "Deploying Changes..." : "Publish Brand Update"}
              </button>
            </div>
          </div>
        </div>
      </form>
      {uploadMessage ? (
        <div className="rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700 shadow-sm">
          {uploadMessage}
        </div>
      ) : null}
    </article>
  );
}
