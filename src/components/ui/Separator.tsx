import * as React from "react";
import { cn } from "@/lib/utils";

function Separator({ className, orientation = "horizontal", ...props }: React.ComponentProps<"div"> & { orientation?: "horizontal" | "vertical" }) {
  return (
    <div
      role="separator"
      aria-orientation={orientation}
      className={cn(
        orientation === "horizontal" ? "h-px w-full" : "h-full w-px",
        "bg-slate-200",
        className
      )}
      {...props}
    />
  );
}

export { Separator };
