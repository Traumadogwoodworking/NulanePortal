"use client";

interface PageTitleProps {
  title: string;
  subtitle?: string;
  eyebrow?: string;
  titleClassName?: string;
}

export function PageTitle({ title, subtitle, eyebrow, titleClassName = "text-slate-900" }: PageTitleProps) {
  return (
    <header className="sticky top-0 z-20 space-y-2 bg-white/90 py-3 backdrop-blur-md">
      {eyebrow && (
        <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-600">
          {eyebrow}
        </p>
      )}
      <h1
        className={`text-[22px] font-extrabold tracking-tight ${titleClassName}`}
        style={{ fontFamily: "var(--font-inter), var(--font-geist-sans), sans-serif", textShadow: "0 1px 0 rgba(255,255,255,0.2), 0 2px 6px rgba(148,163,184,0.28)" }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="text-[12px] font-medium text-slate-600">
          {subtitle}
        </p>
      )}
    </header>
  );
}
