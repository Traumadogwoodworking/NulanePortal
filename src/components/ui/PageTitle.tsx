"use client";

interface PageTitleProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  titleClassName?: string;
}

export function PageTitle({ title, subtitle, eyebrow, titleClassName = "text-slate-900" }: PageTitleProps) {
  return (
    <header className="space-y-2">
      {eyebrow && (
        <p className="text-[10px] font-bold uppercase tracking-wider text-slate-500">
          {eyebrow}
        </p>
      )}
      <h1 className={`text-[20px] font-bold tracking-tight ${titleClassName}`}>
        {title}
      </h1>
      {subtitle && (
        <p className="text-[12px] text-slate-600">
          {subtitle}
        </p>
      )}
    </header>
  );
}
