import type React from "react";

export interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string;
  description?: string;
}

export function Card({ title, description, className = "", children, ...rest }: CardProps) {
  return (
    <div
      className={`rounded-3xl border border-white/5 bg-slate-900/60 p-6 shadow-lg backdrop-blur ${className}`}
      {...rest}
    >
      {title && <h3 className="text-lg font-semibold text-slate-100">{title}</h3>}
      {description && <p className="mt-1 text-sm text-slate-400">{description}</p>}
      {children && <div className="mt-4 space-y-4">{children}</div>}
    </div>
  );
}
