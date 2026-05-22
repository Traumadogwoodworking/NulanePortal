"use client";

import { Card } from "@/components/ui/Card";

interface EmptySelectionPanelProps {
  title?: string;
  description?: string;
  icon?: React.ReactNode;
}

export function EmptySelectionPanel({
  title = "Nothing selected",
  description = "Select an item from the list to view its details.",
  icon,
}: EmptySelectionPanelProps) {
  return (
    <Card className="h-full flex items-center justify-center p-8">
      <div className="text-center">
        {icon && (
          <div className="mx-auto w-16 h-16 bg-slate-100 text-slate-400 rounded-full flex items-center justify-center">
            {icon}
          </div>
        )}
        <h3 className="mt-4 text-lg font-semibold text-slate-800">{title}</h3>
        <p className="mt-2 text-sm text-slate-500">{description}</p>
      </div>
    </Card>
  );
}
