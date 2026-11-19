import React, { useMemo, useState } from "react";
import { ArrowDownUp, ChevronLeft, ChevronRight, Download, Search } from "lucide-react";
import { EmptyState } from "./EmptyState";
import { Skeleton } from "./Skeleton";

export interface DataTableColumn<T> {
  key: keyof T & string;
  header: string;
  sortable?: boolean;
  sortValue?: (row: T) => string | number;
  render: (row: T) => React.ReactNode;
}

export interface DataTableFilterChip {
  value: string;
  label: string;
}

export interface DataTableProps<T extends { id: string }> {
  title: string;
  subtitle?: string;
  rows: T[];
  columns: DataTableColumn<T>[];
  searchPlaceholder: string;
  searchableFields: Array<keyof T & string>;
  filterField?: keyof T & string;
  filterChips?: DataTableFilterChip[];
  allFilterLabel: string;
  exportLabel: string;
  onExport?: (filteredRows: T[]) => void;
  pageSize?: number;
  loading?: boolean;
  emptyTitle: string;
  emptyDescription: string;
  resetLabel: string;
  rangeLabel: (from: number, to: number, total: number) => string;
  prevLabel: string;
  nextLabel: string;
}

export function DataTable<T extends { id: string }>({
  title,
  subtitle,
  rows,
  columns,
  searchPlaceholder,
  searchableFields,
  filterField,
  filterChips = [],
  allFilterLabel,
  exportLabel,
  onExport,
  pageSize = 5,
  loading = false,
  emptyTitle,
  emptyDescription,
  resetLabel,
  rangeLabel,
  prevLabel,
  nextLabel,
}: DataTableProps<T>) {
  const [query, setQuery] = useState("");
  const [selectedFilter, setSelectedFilter] = useState<string>("ALL");
  const [sortKey, setSortKey] = useState<string | null>(null);
  const [sortDir, setSortDir] = useState<"asc" | "desc">("asc");
  const [page, setPage] = useState(1);

  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase();
    const filtered = rows.filter((row) => {
      const matchesFilter =
        !filterField || selectedFilter === "ALL" || String(row[filterField]) === selectedFilter;
      if (!matchesFilter) return false;
      if (!q) return true;
      return searchableFields.some((f) => String(row[f] ?? "").toLowerCase().includes(q));
    });

    if (!sortKey) return filtered;
    const col = columns.find((c) => c.key === sortKey);
    if (!col) return filtered;

    return [...filtered].sort((a, b) => {
      const av = col.sortValue ? col.sortValue(a) : String(a[col.key] ?? "");
      const bv = col.sortValue ? col.sortValue(b) : String(b[col.key] ?? "");
      const cmp =
        typeof av === "number" && typeof bv === "number"
          ? av - bv
          : String(av).localeCompare(String(bv));
      return sortDir === "asc" ? cmp : -cmp;
    });
  }, [rows, query, selectedFilter, sortKey, sortDir, filterField, searchableFields, columns]);

  const totalPages = Math.max(1, Math.ceil(filteredAndSorted.length / pageSize));
  const safePage = Math.min(page, totalPages);
  const startIdx = (safePage - 1) * pageSize;
  const pageRows = filteredAndSorted.slice(startIdx, startIdx + pageSize);

  const toggleSort = (key: string) => {
    if (sortKey === key) {
      setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("asc");
    }
    setPage(1);
  };

  if (loading) {
    return <Skeleton lines={6} />;
  }

  return (
    <section data-testid="ui-data-table" data-no-tilt="true" className="ss-card overflow-hidden">
      <div
        className="flex flex-wrap items-center justify-between gap-3 border-b p-5"
        style={{ borderColor: "var(--color-border)" }}
      >
        <div>
          <h3 className="text-base font-bold text-[var(--color-text)]">{title}</h3>
          {subtitle ? <p className="text-xs text-[var(--color-text-muted)]">{subtitle}</p> : null}
        </div>
        {onExport ? (
          <button
            type="button"
            data-testid="table-export-btn"
            onClick={() => onExport(filteredAndSorted)}
            className="inline-flex min-h-11 cursor-pointer items-center gap-2 rounded-full border px-4 text-xs font-semibold transition-colors hover:bg-[var(--color-surface-alt)]"
            style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            <span>{exportLabel}</span>
          </button>
        ) : null}
      </div>

      {/* Controls: Search & Filter Chips */}
      <div
        className="flex flex-col gap-3 border-b p-4 lg:flex-row lg:items-center lg:justify-between"
        style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-alt)" }}
      >
        <div className="relative w-full lg:max-w-sm">
          <Search
            className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--color-text-muted)]"
            aria-hidden="true"
          />
          <input
            type="search"
            value={query}
            data-testid="table-search-input"
            onChange={(e) => {
              setQuery(e.target.value);
              setPage(1);
            }}
            placeholder={searchPlaceholder}
            aria-label={searchPlaceholder}
            className="min-h-11 w-full rounded-full border bg-[var(--color-surface)] pl-10 pr-4 text-sm text-[var(--color-text)] placeholder:text-[var(--color-text-muted)]"
            style={{ borderColor: "var(--color-border)" }}
          />
        </div>

        {filterChips.length > 0 ? (
          <div className="flex flex-wrap items-center gap-1.5" role="group" aria-label={allFilterLabel}>
            <button
              type="button"
              data-testid="table-filter-ALL"
              onClick={() => {
                setSelectedFilter("ALL");
                setPage(1);
              }}
              aria-pressed={selectedFilter === "ALL"}
              className="min-h-11 cursor-pointer rounded-full border px-3.5 text-xs font-semibold transition-colors"
              style={
                selectedFilter === "ALL"
                  ? {
                      backgroundColor: "var(--color-primary)",
                      color: "var(--color-primary-contrast)",
                      borderColor: "var(--color-primary)",
                    }
                  : {
                      backgroundColor: "var(--color-surface)",
                      color: "var(--color-text-muted)",
                      borderColor: "var(--color-border)",
                    }
              }
            >
              {allFilterLabel}
            </button>
            {filterChips.map((chip) => (
              <button
                key={chip.value}
                type="button"
                data-testid={`table-filter-${chip.value}`}
                onClick={() => {
                  setSelectedFilter(chip.value);
                  setPage(1);
                }}
                aria-pressed={selectedFilter === chip.value}
                className="min-h-11 cursor-pointer rounded-full border px-3.5 text-xs font-semibold transition-colors"
                style={
                  selectedFilter === chip.value
                    ? {
                        backgroundColor: "var(--color-primary)",
                        color: "var(--color-primary-contrast)",
                        borderColor: "var(--color-primary)",
                      }
                    : {
                        backgroundColor: "var(--color-surface)",
                        color: "var(--color-text-muted)",
                        borderColor: "var(--color-border)",
                      }
                }
              >
                {chip.label}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {pageRows.length === 0 ? (
        <div className="p-6">
          <EmptyState
            title={emptyTitle}
            description={emptyDescription}
            actionLabel={resetLabel}
            onAction={() => {
              setQuery("");
              setSelectedFilter("ALL");
              setSortKey(null);
              setPage(1);
            }}
          />
        </div>
      ) : (
        <>
          {/* Desktop & Tablet Table View (>= 768px) */}
          <div className="hidden overflow-x-auto md:block">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr
                  className="border-b text-xs uppercase tracking-wider text-[var(--color-text-muted)]"
                  style={{ borderColor: "var(--color-border)", backgroundColor: "var(--color-surface-alt)" }}
                >
                  {columns.map((col) => {
                    const isSorted = sortKey === col.key;
                    const ariaSort = isSorted
                      ? sortDir === "asc"
                        ? "ascending"
                        : "descending"
                      : undefined;
                    return (
                      <th key={col.key} scope="col" aria-sort={ariaSort} className="px-4 py-3 font-semibold">
                        {col.sortable ? (
                          <button
                            type="button"
                            data-testid={`table-sort-${col.key}`}
                            onClick={() => toggleSort(col.key)}
                            className="inline-flex min-h-11 cursor-pointer items-center gap-1.5 font-semibold text-[var(--color-text)] hover:text-[var(--color-primary)]"
                          >
                            <span>{col.header}</span>
                            <ArrowDownUp className="h-3.5 w-3.5" aria-hidden="true" />
                          </button>
                        ) : (
                          col.header
                        )}
                      </th>
                    );
                  })}
                </tr>
              </thead>
              <tbody className="divide-y" style={{ borderColor: "var(--color-border)" }}>
                {pageRows.map((row) => (
                  <tr
                    key={row.id}
                    data-testid="table-row"
                    className="transition-colors hover:bg-[var(--color-surface-alt)]"
                    style={{ borderColor: "var(--color-border)" }}
                  >
                    {columns.map((col) => (
                      <td key={col.key} className="px-4 py-3.5 align-middle text-[var(--color-text)]">
                        {col.render(row)}
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Mobile Stacked Card View (< 768px — eliminates right-edge table clipping) */}
          <div className="divide-y md:hidden" style={{ borderColor: "var(--color-border)" }}>
            {pageRows.map((row) => (
              <div
                key={row.id}
                data-testid="mobile-table-card"
                className="space-y-2.5 p-4"
                style={{ borderColor: "var(--color-border)" }}
              >
                {columns.map((col) => (
                  <div key={col.key} className="flex items-start justify-between gap-3 text-sm">
                    <span className="shrink-0 text-xs font-semibold text-[var(--color-text-muted)]">
                      {col.header}
                    </span>
                    <div className="min-w-0 text-right text-[var(--color-text)]">{col.render(row)}</div>
                  </div>
                ))}
              </div>
            ))}
          </div>

          {/* Pagination Footer */}
          <div
            className="flex flex-wrap items-center justify-between gap-3 border-t px-4 py-3 text-xs text-[var(--color-text-muted)]"
            style={{ borderColor: "var(--color-border)" }}
          >
            <span>
              {rangeLabel(startIdx + 1, startIdx + pageRows.length, filteredAndSorted.length)}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center gap-1 rounded-full border px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              >
                <ChevronLeft className="h-4 w-4" aria-hidden="true" />
                <span>{prevLabel}</span>
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="inline-flex min-h-11 min-w-11 cursor-pointer items-center gap-1 rounded-full border px-3 font-semibold disabled:cursor-not-allowed disabled:opacity-45"
                style={{ borderColor: "var(--color-border)", color: "var(--color-text)" }}
              >
                <span>{nextLabel}</span>
                <ChevronRight className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          </div>
        </>
      )}
    </section>
  );
}
