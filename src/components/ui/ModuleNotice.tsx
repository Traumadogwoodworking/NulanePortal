import { PageSection } from "./PageSection";

interface ModuleNoticeProps {
  title: string;
  description: string;
  message?: string;
}

export function ModuleNotice({ title, description, message }: ModuleNoticeProps) {
  return (
    <PageSection title={title} description={description} variant="panel">
      <div className="py-12 text-center text-sm text-slate-500 uppercase tracking-[0.3em] font-black">
        {message ?? "This module is currently unavailable."}
      </div>
    </PageSection>
  );
}
