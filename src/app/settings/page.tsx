"use client";

import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { PageTitle } from "@/components/ui/PageTitle";
import { StatusBadge } from "@/components/ui/StatusBadge";
import { portalConfig } from "@/lib/config";
import { usePortalSession } from "@/lib/portalSession";

export default function SettingsPage() {
  const { user } = usePortalSession();
  const environmentTone = portalConfig.environment === "production" ? "positive" : "warning";

  return (
    <div className="mx-auto w-full max-w-5xl space-y-6 pb-10">
      <PageTitle title="Settings" subtitle="Review your account and DocuDent workspace." />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader title="Account" subtitle="Your authenticated portal session." />
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-600">Email</span>
              <span className="truncate font-medium text-slate-900">{user?.email || "Signed in"}</span>
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-600">Role</span>
              <StatusBadge label={user?.role || "User"} />
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader title="Product" subtitle="The product enabled for this portal." />
          <CardContent className="space-y-4 text-sm">
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-600">Application</span>
              <StatusBadge label="DocuDent" tone="positive" />
            </div>
            <div className="flex items-center justify-between gap-4">
              <span className="font-semibold text-slate-600">Module</span>
              <StatusBadge label="Damage Submissions" tone="positive" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader title="Environment" subtitle="Review build context without exposing service endpoints." />
        <CardContent>
          <div className="flex items-center justify-between gap-4 text-sm">
            <span className="font-semibold text-slate-600">Portal environment</span>
            <StatusBadge label={portalConfig.environment} tone={environmentTone} />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
