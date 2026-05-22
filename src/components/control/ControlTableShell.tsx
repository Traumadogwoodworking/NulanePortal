import { Children, type MouseEvent, type ReactNode } from "react";
import { EmptyState } from "@/components/ui/EmptyState";

type ColumnDef = {
  id: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
};

interface ControlTableShellProps {
  columns: (string | ColumnDef)[];
  title?: string;
  description?: string;
  density?: "compact" | "comfortable";
  actions?: ReactNode;
  loading?: boolean;
  rowsCount?: number;
  emptyState?: ReactNode;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (columnId: string) => void;
  onRowClick?: (rowKey: string) => void;
  children: ReactNode;
}

export function ControlTableShell({
  columns,
  title,
  description,
  density = "comfortable",
  actions,
  loading = false,
  rowsCount,
  emptyState,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
  children,
}: ControlTableShellProps) {
  const resolvedColumns: ColumnDef[] = columns.map((column) =>
    typeof column === "string" ? { id: column, label: column } : column
  );
  const headerPaddingClass = density === "compact" ? "px-3 py-2.5" : "px-4 py-3";
  const cellPaddingClass = density === "compact" ? "px-3 py-2" : "px-4 py-3";
  const hasRows = rowsCount !== undefined ? rowsCount > 0 : Children.count(children) > 0;
  const shouldShowEmpty = !loading && !hasRows;

  const handleRowClick = (event: MouseEvent<HTMLTableSectionElement>) => {
    if (!onRowClick) return;
    const row = (event.target as HTMLElement).closest("tr[data-row-key]");
    const key = row?.getAttribute("data-row-key");
    if (key) {
      onRowClick(key);
    }
  };

  const renderEmptyState = () =>
    emptyState ?? <EmptyState title="No rows" description="No records match the current filters." />;

  const renderSortIndicator = (column: ColumnDef) => {
    if (!column.sortable) return null;
    const isActive = sortField === column.id;
    const indicator = isActive ? (sortDirection === "asc" ? "▲" : "▼") : "⇅";
    return <span className="ml-1 text-[9px] font-black text-[color:var(--text-secondary)]">{indicator}</span>;
  };

  const sortColumn = (column: ColumnDef) => {
    if (!column.sortable) return;
    onSort?.(column.id);
  };

  const renderLoadingRows = () =>
    Array.from({ length: 4 }).map((_, index) => (
      <tr key={`loading-${index}`}>
        {resolvedColumns.map((column) => (
          <td key={column.id} className={`${cellPaddingClass} py-3`}>
            <div className="h-3 w-full max-w-[190px] animate-pulse rounded-full bg-[color:var(--border-subtle)]" />
          </td>
        ))}
      </tr>
    ));

  return (
    <div className="overflow-hidden rounded-[1.5rem] border border-[color:var(--border-subtle)] bg-[color:var(--surface-panel)] shadow-[0_20px_48px_rgba(15,23,42,0.08)]">
      {(title || description || actions) && (
        <header className="border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] px-4 py-3">
          <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
            {(title || description) && (
              <div className="space-y-1">
                {title ? <h3 className="text-sm font-semibold tracking-tight text-[color:var(--text-primary)]">{title}</h3> : null}
                {description ? <p className="text-xs text-[color:var(--text-secondary)]">{description}</p> : null}
              </div>
            )}
            {actions ? <div className="mt-2 flex shrink-0 items-center gap-2 md:mt-0">{actions}</div> : null}
          </div>
        </header>
      )}
      <div className="overflow-x-auto">
        <table className="w-full text-left">
          <thead className="sticky top-0 z-10">
            <tr className="border-b border-[color:var(--border-subtle)] bg-[color:var(--surface-panel-muted)] backdrop-blur">
              {resolvedColumns.map((column) => (
                <th
                  key={column.id}
                  scope="col"
                  className={`${headerPaddingClass} ${
                    column.align === "right"
                      ? "text-right"
                      : column.align === "center"
                        ? "text-center"
                        : "text-left"
                  } text-[9px] font-semibold uppercase tracking-[0.38em] text-[color:var(--text-muted)] ${
                    column.sortable ? "cursor-pointer" : ""
                  }`}
                  onClick={() => sortColumn(column)}
                >
                  <span className="inline-flex items-center">
                    {column.label}
                    {renderSortIndicator(column)}
                  </span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody
            className="divide-y divide-[color:var(--border-subtle)] [&>tr:nth-child(even)]:bg-[color:var(--surface-panel-muted)]/45"
            onClick={handleRowClick}
            role={onRowClick ? "button" : undefined}
          >
            {loading ? (
              renderLoadingRows()
            ) : shouldShowEmpty ? (
              <tr>
                <td colSpan={resolvedColumns.length} className={`${cellPaddingClass} py-10 text-center`}>
                  {renderEmptyState()}
                </td>
              </tr>
            ) : (
              children
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
