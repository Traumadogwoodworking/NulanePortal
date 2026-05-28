"use client";

import { Badge } from "@/components/ui/Badge";
import { Card, CardContent } from "@/components/ui/Card";
import { normalizeMediaUrl } from "@/lib/config";
import type { ReportDamageApiRow } from "@/lib/types";
import { MapPin } from "lucide-react";

export function DamageMapCard({ report }: { report?: ReportDamageApiRow | null }) {
  const splatUrl = report?.splat_urls?.[0] ? normalizeMediaUrl(report.splat_urls[0]) : null;

  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
      <div className="flex items-center justify-between gap-3 border-b border-slate-200/80 bg-slate-50/80 px-5 py-4">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <MapPin className="h-4 w-4 text-blue-600" />
            <p className="text-sm font-bold text-slate-900">Damage Map</p>
          </div>
          <p className="text-xs font-medium text-slate-500">Splat overlay</p>
        </div>
        <Badge variant="secondary" className="border-slate-200 bg-white text-slate-700">
          {splatUrl ? "1 item" : "0 items"}
        </Badge>
      </div>
      <CardContent className="p-5">
        {splatUrl ? (
          <div className="overflow-hidden rounded-[2rem] border border-slate-200 bg-white shadow-sm">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={splatUrl} alt="Damage splat" className="h-[34rem] w-full object-contain bg-white sm:h-[42rem]" />
          </div>
        ) : (
          <div className="flex min-h-[24rem] items-center justify-center rounded-[2rem] border border-dashed border-slate-200 bg-white px-4 py-10 text-center">
            <p className="text-sm font-semibold text-slate-700">Splat unavailable</p>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
