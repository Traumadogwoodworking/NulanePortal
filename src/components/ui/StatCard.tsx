"use client";

import { Card } from "@/components/ui/Card";

interface StatCardProps {
  label: string;
  value: string | number;
  detail?: string;
  icon?: React.ReactNode;
}

export function StatCard({ label, value, detail, icon }: StatCardProps) {
  return (
    <Card className="h-full p-4">
      <div className="flex h-full items-center justify-center gap-4 text-center">
        {icon && (
          <div className="flex-shrink-0 flex items-center justify-center h-12 w-12 rounded-lg bg-slate-100 text-slate-600">
            {icon}
          </div>
        )}
        <div className="min-w-0 flex-1 text-center">
          <p className="text-sm font-semibold uppercase tracking-wider text-slate-500 truncate">
            {label}
          </p>
          <div className="mt-1 flex min-h-[3.5rem] flex-col justify-between gap-1">
            <p className="text-[20px] font-black text-slate-800 leading-none">
              {value}
            </p>
            {detail && (
              <p className="self-end text-right text-sm font-medium text-slate-500 truncate leading-none">
                {detail}
              </p>
            )}
          </div>
        </div>
      </div>
    </Card>
  );
}
