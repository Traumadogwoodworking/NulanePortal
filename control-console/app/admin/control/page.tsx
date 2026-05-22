import { registerDefaultSurfaces } from "@lib/registry/registerDefaultSurfaces";
import { controlSurfaceRegistry } from "@lib/registry/ControlSurfaceRegistry";
import { ControlConsoleClient } from "@lib/services/controlConsoleClient";
import { SectionTitle } from "@components/ui/SectionTitle";

export default async function ControlConsolePage() {
  const registry = registerDefaultSurfaces();
  const surfaces = registry.getSurfaces();
  const categories = registry.getCategorySummaries();
  const client = new ControlConsoleClient();

  const surfaceViews = await Promise.all(
    surfaces.map(async (surface) => ({
      surface,
      view: await surface.component({ client })
    }))
  );

  return (
    <section className="space-y-8">
      <div className="space-y-3">
        <SectionTitle
          title="Command center"
          description="Registry-driven entry for the automation, monitoring, and operations surfaces built for the control plane."
        />
        <div className="grid gap-3 sm:grid-cols-3">
          {categories.map((category) => (
            <div key={category.category} className="rounded-2xl border border-white/5 bg-white/5 px-4 py-3 text-sm text-slate-200">
              <p className="font-semibold text-white">{category.category}</p>
              <p className="text-xs text-slate-400">{category.count} surfaces</p>
            </div>
          ))}
        </div>
      </div>

      <div className="space-y-6">
        {surfaceViews.map(({ surface, view }) => (
          <article key={surface.key} className="space-y-4">
            <h2 className="text-2xl font-semibold text-white">{surface.title}</h2>
            <p className="text-sm text-slate-400">{surface.description}</p>
            <div>{view}</div>
          </article>
        ))}
      </div>
    </section>
  );
}
