"use client";

import Link from "next/link";
import { PageTitle } from "@/components/ui/PageTitle";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";
import { usePortalSession } from "@/lib/portalSession";
import { usePortalDirectorySnapshot } from "@/lib/portalData";
import { Building2, Shield, Users } from "lucide-react";
import { StatCard } from "@/components/ui/StatCard";

export default function OrganizationsPage() {
  const { session, organizationId } = usePortalSession();
  const { data: directory } = usePortalDirectorySnapshot();

  const currentOrganizationName = session?.organization?.name || "Not assigned";
  const facilityCount = directory?.facilities?.length ?? 0;
  const userCount = directory?.users?.length ?? 0;

  return (
    <div className="space-y-6">
        <PageTitle
          title="Organizations"
          subtitle="Manage your connected organizations and tenant data."
          titleClassName="text-slate-900"
        />

        <Card className="overflow-hidden shadow-sm bg-slate-50">
          <CardHeader
            title={currentOrganizationName}
            subtitle={organizationId ? `ID: ${organizationId}` : ""}
          />
          <CardContent className="p-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
              <div className="text-center">
                <StatCard
                  label="Organizations"
                  value={1}
                  icon={<Shield />}
                />
              </div>
              <div className="text-center">
                <StatCard
                  label="Facilities"
                  value={`${directory?.facilities?.filter((facility) => facility.active).length ?? 0}/${facilityCount}`}
                  icon={<Building2 />}
                />
              </div>
              <div className="text-center">
                <StatCard
                  label="Users"
                  value={`${directory?.users?.filter((user) => user.isActive).length ?? 0}/${userCount}`}
                  icon={<Users />}
                />
              </div>
            </div>
            </CardContent>
          </Card>

      </div>
  );
}
