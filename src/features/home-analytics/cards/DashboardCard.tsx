import type { ReactNode } from "react";
import { Card, CardContent, CardHeader } from "@/components/ui/Card";

export function DashboardCard({
  title,
  children,
  isLoading = false,
  error,
  isEmpty = false,
  emptyLabel = "No data available.",
}: {
  title: string;
  children: ReactNode;
  isLoading?: boolean;
  error?: string | null;
  isEmpty?: boolean;
  emptyLabel?: string;
}) {
  return (
    <Card className="overflow-hidden border-slate-200/80 bg-white shadow-sm">
      <CardHeader title={title} />
      <CardContent>
        {error ? (
          <p className="text-sm text-red-600">{error}</p>
        ) : isLoading ? (
          <p className="text-sm text-slate-500">Loading...</p>
        ) : isEmpty ? (
          <p className="text-sm text-slate-500">{emptyLabel}</p>
        ) : (
          children
        )}
      </CardContent>
    </Card>
  );
}
