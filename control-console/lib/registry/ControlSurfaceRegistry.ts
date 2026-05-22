import { ControlSurfaceDefinition } from "@lib/types/control-surface";

export interface ControlSurfaceCategorySummary {
  category: string;
  count: number;
}

export class ControlSurfaceRegistry {
  private surfaces = new Map<string, ControlSurfaceDefinition>();

  register(surface: ControlSurfaceDefinition): void {
    if (this.surfaces.has(surface.key)) {
      return;
    }

    this.surfaces.set(surface.key, surface);
  }

  getSurfaces(): ControlSurfaceDefinition[] {
    return Array.from(this.surfaces.values()).sort((a, b) => (b.priority ?? 0) - (a.priority ?? 0));
  }

  getCategorySummaries(): ControlSurfaceCategorySummary[] {
    const summary = new Map<string, number>();

    this.surfaces.forEach((surface) => {
      summary.set(surface.category, (summary.get(surface.category) ?? 0) + 1);
    });

    return Array.from(summary.entries()).map(([category, count]) => ({ category, count }));
  }
}

export const controlSurfaceRegistry = new ControlSurfaceRegistry();
