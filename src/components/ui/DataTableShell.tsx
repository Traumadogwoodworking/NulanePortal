import { Children, type MouseEvent, type ReactNode } from "react";
import { EmptyState } from "./EmptyState";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

type ColumnDef = {
  id: string;
  label: string;
  sortable?: boolean;
  align?: "left" | "center" | "right";
};

interface DataTableShellProps {
  columns?: (string | ColumnDef)[];
  title?: string;
  description?: string;
  className?: string;
  density?: "compact" | "comfortable";
  metrics?: ReactNode;
  filters?: ReactNode;
  actions?: ReactNode;
  loading?: boolean;
  rowsCount?: number;
  emptyState?: ReactNode;
  errorState?: ReactNode;
  loadingState?: ReactNode;
  content?: ReactNode;
  sortField?: string;
  sortDirection?: "asc" | "desc";
  onSort?: (columnId: string) => void;
  onRowClick?: (rowKey: string) => void;
  children: ReactNode;
}

export function DataTableShell({
  columns,
  title,
  description,
  className,
  density = "comfortable",
  metrics,
  filters,
  actions,
  loading = false,
  rowsCount,
  emptyState,
  errorState,
  loadingState,
  content,
  sortField,
  sortDirection,
  onSort,
  onRowClick,
  children,
}: DataTableShellProps) {
  const resolvedColumns: ColumnDef[] = (columns ?? []).map((column) =>
    typeof column === "string" ? { id: column, label: column } : column
  );
  const headerPaddingClass = density === "compact" ? "px-3 py-2.5" : "px-4 py-3";
  const cellPaddingClass = density === "compact" ? "px-3 py-2" : "px-4 py-3";
  const hasRows = rowsCount !== undefined ? rowsCount > 0 : content ? true : Children.count(children) > 0;
  const shouldShowEmpty = !loading && !hasRows;

  const handleRowClick = (event: MouseEvent<HTMLTableSectionElement>) => {
    if (!onRowClick) return;
    const row = (event.target as HTMLElement).closest("tr[data-row-key]");
    const key = row?.getAttribute("data-row-key");
    if (key) {
      onRowClick(key);
    }
  };

  const renderEmptyState = () => (
    emptyState ?? (
      <EmptyState title="No rows" description="No records match the current filters." />
    )
  );

  const renderSortIndicator = (column: ColumnDef) => {
    if (!column.sortable) return null;
    const isActive = sortField === column.id;
    if (!isActive) {
      return <ArrowUpDown className="ml-1 h-3 w-3 text-slate-400" />;
    }
    return sortDirection === "asc" ? (
      <ArrowUp className="ml-1 h-3 w-3 text-slate-700" />
    ) : (
      <ArrowDown className="ml-1 h-3 w-3 text-slate-700" />
    );
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
            <div className="h-3 w-full max-w-[180px] animate-pulse rounded-full bg-[color:var(--border-subtle)]" />
          </td>
        ))}
      </tr>
    ));

  return (
    <div className={`overflow-hidden rounded-xl border border-slate-200 bg-white shadow-md ${className ?? ""}`}>
      {(title || description || actions) && (
        <header className="border-b border-slate-200 bg-slate-50/50 px-4 py-3">
          <div className="flex flex-col gap-1 md:flex-row md:items-start md:justify-between">
            {(title || description) && (
              <div className="space-y-1">
                {title && <h3 className="text-lg font-bold tracking-tight text-slate-950">{title}</h3>}
                {description ? <p className="mt-0.5 text-sm font-medium leading-5 text-slate-600">{description}</p> : null}
              </div>
            )}
            {actions && <div className="mt-2 flex shrink-0 items-center gap-2 md:mt-0">{actions}</div>}
          </div>
        </header>
      )}
      {metrics ? <div className="border-b border-slate-200 bg-white px-4 py-3">{metrics}</div> : null}
      {filters ? <div className="border-b border-slate-200 bg-slate-50/40 px-4 py-3">{filters}</div> : null}
      {errorState ? <div className="border-b border-slate-200 bg-white px-4 py-3">{errorState}</div> : null}
      {content ? (
        <div className="relative">
          {loading ? (
            loadingState ?? <div className="px-4 py-8 text-center text-sm text-slate-500">Loading...</div>
          ) : shouldShowEmpty ? (
            emptyState ?? <div className="px-4 py-8 text-center text-sm text-slate-500">{renderEmptyState()}</div>
          ) : (
            content
          )}
        </div>
      ) : (
        <div className="overflow-x-auto relative">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b-2 border-slate-200 bg-slate-50">
                {resolvedColumns.map((column) => (
                  <th
                    key={column.id}
                    scope="col"
                    className={`${headerPaddingClass} ${column.align === "right" ? "text-right" : column.align === "center" ? "text-center" : "text-left"} text-sm font-semibold uppercase tracking-wider leading-none text-slate-500 cursor-${column.sortable ? "pointer" : "default"}`}
                    onClick={() => sortColumn(column)}
                  >
                    <div className="flex items-center">
                      {column.label}
                      {renderSortIndicator(column)}
                    </div>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody
              className="divide-y divide-slate-100"
              onClick={handleRowClick}
              role={onRowClick ? "button" : undefined}
            >
              {loading ? (
                renderLoadingRows()
              ) : shouldShowEmpty ? (
                <tr>
                  <td colSpan={resolvedColumns.length} className={`${cellPaddingClass} py-8 text-center text-sm text-slate-500`}>
                    {renderEmptyState()}
                  </td>
                </tr>
              ) : (
                children
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
