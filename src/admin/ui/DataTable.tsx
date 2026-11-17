import React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";

export interface Column<T> {
  header: string;
  accessor?: keyof T;
  render?: (row: T) => React.ReactNode;
  width?: string;
  align?: "left" | "center" | "right";
}

interface DataTableProps<T> {
  columns: Column<T>[];
  data: T[];
  loading?: boolean;
  emptyMessage?: string;
  page?: number;
  totalPages?: number;
  onPageChange?: (page: number) => void;
  keyExtractor: (row: T, index: number) => string;
}

export function DataTable<T>({
  columns,
  data,
  loading = false,
  emptyMessage = "No records found",
  page,
  totalPages,
  onPageChange,
  keyExtractor,
}: DataTableProps<T>) {
  if (loading) {
    return (
      <div style={{ padding: "40px", textAlign: "center", color: "#64748b" }}>
        Loading records...
      </div>
    );
  }

  if (!data || data.length === 0) {
    return (
      <div
        style={{
          padding: "48px 24px",
          textAlign: "center",
          color: "#94a3b8",
          fontSize: "13.5px",
        }}
      >
        {emptyMessage}
      </div>
    );
  }

  return (
    <div>
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              {columns.map((col, idx) => (
                <th
                  key={idx}
                  style={{
                    width: col.width,
                    textAlign: col.align || "left",
                  }}
                >
                  {col.header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {data.map((row, rowIdx) => (
              <tr key={keyExtractor(row, rowIdx)}>
                {columns.map((col, colIdx) => (
                  <td
                    key={colIdx}
                    style={{
                      textAlign: col.align || "left",
                    }}
                  >
                    {col.render
                      ? col.render(row)
                      : col.accessor
                      ? String(row[col.accessor] ?? "")
                      : null}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {totalPages && totalPages > 1 && onPageChange && page && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            padding: "16px 20px",
            borderTop: "1px solid #e2e8f0",
            fontSize: "12.5px",
            color: "#64748b",
          }}
        >
          <span>
            Page {page} of {totalPages}
          </span>
          <div style={{ display: "flex", gap: "6px" }}>
            <button
              onClick={() => onPageChange(page - 1)}
              disabled={page <= 1}
              style={{
                padding: "6px 10px",
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                borderRadius: "6px",
                cursor: page <= 1 ? "not-allowed" : "pointer",
                opacity: page <= 1 ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronLeft size={16} />
            </button>
            <button
              onClick={() => onPageChange(page + 1)}
              disabled={page >= totalPages}
              style={{
                padding: "6px 10px",
                border: "1px solid #e2e8f0",
                background: "#ffffff",
                borderRadius: "6px",
                cursor: page >= totalPages ? "not-allowed" : "pointer",
                opacity: page >= totalPages ? 0.5 : 1,
                display: "flex",
                alignItems: "center",
              }}
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default DataTable;

