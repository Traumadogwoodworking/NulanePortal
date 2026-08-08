import type { RuntimeRenderPayload } from "../types";
import { getWidgetSpan, groupLayoutSections, orderWidgetsByLayout } from "../layout-utils";
import { DashboardWidgetRenderer } from "./DashboardWidgetRenderer";

export function DashboardLayoutGrid({ payload }: { payload: RuntimeRenderPayload }) {
  const orderedWidgets = orderWidgetsByLayout(payload.widgets, payload.layout);
  const sections = groupLayoutSections(payload.layout);

  return (
    <div className="space-y-6">
      {sections.map((section) => {
        const widgets = orderedWidgets.filter((widget) => section.widgetIds.includes(widget.id));
        if (!widgets.length) return null;
        return (
          <section key={section.section} className="space-y-3">
            <div>
              <h2 className="text-lg font-black tracking-tight text-slate-950">{section.section}</h2>
            </div>
            <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
              {widgets.map((widget) => (
                <div key={widget.id} className={getWidgetSpan(widget.id, payload.layout)}>
                  <DashboardWidgetRenderer payload={payload} widget={widget} />
                </div>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}
