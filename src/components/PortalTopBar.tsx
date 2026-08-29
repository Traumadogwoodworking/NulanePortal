import { resolvePortalBranding } from "@/lib/branding";

interface PortalTopBarProps {
  pageTitle: string;
  pageSubtitle?: string;
}

export function PortalTopBar({ pageTitle, pageSubtitle }: PortalTopBarProps) {
  const branding = resolvePortalBranding({ session: null });
  const barColor = branding.portalBrandColor;
  return (
    <header
      className="portal-top-bar sticky top-0 z-50 w-full min-h-[72px] border-2 border-white backdrop-blur-md"
      style={{
        background: `linear-gradient(180deg, ${barColor} 0%, color-mix(in srgb, ${barColor} 82%, white) 100%)`,
        boxShadow: `0 10px 30px -18px var(--brand-shadow, rgba(15,23,42,0.24)), inset 0 1px 0 rgba(255,255,255,0.22), inset 0 -1px 0 rgba(255,255,255,0.22)`,
      }}
    >
      <div className="grid w-full grid-cols-[1fr_minmax(0,1.2fr)_1fr] items-center gap-3 px-4 py-[22px]">
        <div className="flex min-w-0 items-center gap-2 justify-self-start">
          <span className="hidden text-xs font-black uppercase tracking-[0.2em] text-slate-900 sm:inline">
            Nulane Systems
          </span>
        </div>

        <div className="flex min-w-0 flex-col items-center gap-1 px-4 text-center justify-self-center">
          <div className="max-w-full overflow-hidden">
            <h1
              className="truncate text-[32px] font-black leading-tight tracking-tight text-slate-950 sm:text-[36px]"
              style={{
                fontFamily: "Inter, var(--font-inter), var(--font-geist-sans), sans-serif",
                WebkitTextStroke: "1.5px rgba(255,255,255,0.98)",
                paintOrder: "stroke fill",
                textShadow: "0 0 1.5px rgba(255,255,255,0.78)",
              }}
            >
              {pageTitle}
            </h1>
            {pageSubtitle ? (
              <p
                className="mt-0.5 truncate text-sm font-semibold leading-5 text-slate-800 sm:text-base"
                style={{
                  WebkitTextStroke: "1px rgba(255,255,255,0.98)",
                  paintOrder: "stroke fill",
                  textShadow: "0 0 1px rgba(255,255,255,0.72)",
                }}
              >
                {pageSubtitle}
              </p>
            ) : null}
          </div>
        </div>

        <div aria-hidden="true" className="min-h-9" />
      </div>
    </header>
  );
}
