import type { RuntimeLayoutItem, RuntimeWidgetDefinition } from "./types";

export function orderWidgetsByLayout(widgets: RuntimeWidgetDefinition[], layout: RuntimeLayoutItem[]): RuntimeWidgetDefinition[] {
  const order = new Map(layout.map((item, index) => [item.widgetId, index]));
  return [...widgets].sort((a, b) => (order.get(a.id) ?? 999) - (order.get(b.id) ?? 999));
}

export function groupLayoutSections(layout: RuntimeLayoutItem[]): Array<{ section: string; widgetIds: string[] }> {
  const sections = new Map<string, string[]>();
  layout.forEach((item) => {
    const section = item.section || "Dashboard";
    sections.set(section, [...(sections.get(section) ?? []), item.widgetId]);
  });
  return [...sections.entries()].map(([section, widgetIds]) => ({ section, widgetIds }));
}

export function getWidgetSpan(widgetId: string, layout: RuntimeLayoutItem[]): string {
  const item = layout.find((entry) => entry.widgetId === widgetId);
  const width = item?.w ?? 4;
  if (width >= 12) return "lg:col-span-12";
  if (width >= 8) return "lg:col-span-8";
  if (width >= 6) return "lg:col-span-6";
  return "lg:col-span-3";
}
