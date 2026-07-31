import React from "react";
import { cn } from "@/lib/utils";

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function Card({ children, className = "", ...props }: CardProps) {
  return (
    <div
      className={`min-w-0 bg-white border border-slate-200 rounded-xl shadow-[0_18px_50px_-24px_var(--brand-shadow,rgba(15,23,42,0.24)),0_0_0_1px_var(--brand-glow,rgba(37,99,235,0.08))] ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

interface CardHeaderProps {
  title: string;
  subtitle?: string;
  actions?: React.ReactNode;
}

export function CardHeader({ title, subtitle, actions }: CardHeaderProps) {
  return (
    <div className="flex flex-col gap-3 border-b border-slate-200 px-6 py-4 sm:flex-row sm:items-start sm:justify-between">
      <div className="space-y-1">
        <h3 className="text-lg font-bold tracking-tight text-slate-950">{title}</h3>
        {subtitle && <p className="text-sm font-medium leading-5 text-slate-600">{subtitle}</p>}
      </div>
      {actions && <div className="flex min-w-0 flex-wrap items-center gap-2 sm:ml-4 sm:justify-end">{actions}</div>}
    </div>
  );
}

interface CardContentProps extends React.HTMLAttributes<HTMLDivElement> {
  children: React.ReactNode;
}

export function CardContent({ children, className = "", ...props }: CardContentProps) {
  return (
    <div className={cn("p-6", className)} {...props}>
      {children}
    </div>
  );
}
