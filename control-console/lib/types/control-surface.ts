import type { ControlConsoleClient } from "@lib/services/controlConsoleClient";

export interface ControlSurfaceRenderProps {
  client: ControlConsoleClient;
}

export type ControlSurfaceComponent = (
  props: ControlSurfaceRenderProps
) => Promise<React.ReactNode> | React.ReactNode;

export interface ControlSurfaceDefinition {
  key: string;
  title: string;
  description: string;
  category: string;
  icon?: string;
  priority?: number;
  component: ControlSurfaceComponent;
}
