import { controlSurfaceRegistry } from "@lib/registry/ControlSurfaceRegistry";
import { automationPlaybookSurface } from "@components/surfaces/AutomationPlaybookSurface";
import { managementOverviewSurface } from "@components/surfaces/ManagementOverviewSurface";

let surfacesRegistered = false;

export function registerDefaultSurfaces() {
  if (surfacesRegistered) {
    return controlSurfaceRegistry;
  }

  controlSurfaceRegistry.register(managementOverviewSurface);
  controlSurfaceRegistry.register(automationPlaybookSurface);
  surfacesRegistered = true;

  return controlSurfaceRegistry;
}
