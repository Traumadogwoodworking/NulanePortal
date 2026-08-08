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
        <p className="text-xs font-semibold tracking-wide text-slate-600">
          {eyebrow}
        </p>
      )}
      <h1
        className={`text-2xl font-extrabold tracking-tight sm:text-[28px] ${titleClassName}`}
        style={{ fontFamily: "var(--font-inter), var(--font-geist-sans), sans-serif" }}
      >
        {title}
      </h1>
      {subtitle && (
        <p className="text-sm font-medium leading-6 text-slate-600">
          {subtitle}
        </p>
      )}
    </header>
  );
}
