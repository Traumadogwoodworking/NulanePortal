interface PortalTopBarProps {
  pageTitle: string;
  pageSubtitle?: string;
}

export function PortalTopBar({ pageTitle, pageSubtitle }: PortalTopBarProps) {
  return (
    <header className="portal-top-bar sticky top-0 z-50 min-h-[76px] w-full border-b border-slate-200 bg-white">
      <div className="flex min-h-[76px] w-full items-center px-6 sm:px-8">
        <div className="flex min-w-0 items-center gap-4">
          <span aria-hidden="true" className="h-9 w-1 rounded-full bg-[#0d2c71]" />
          <div className="min-w-0">
            <h1 className="truncate text-xl font-extrabold tracking-[-0.02em] text-slate-950 sm:text-2xl">
              {pageTitle}
            </h1>
            {pageSubtitle ? (
              <p className="mt-0.5 truncate text-sm font-medium text-slate-500">
                {pageSubtitle}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
