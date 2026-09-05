import React, { useState } from 'react';
import { Inbox } from 'lucide-react';

export function DataTable({
  columns = [],
  data = [],
  keyField = 'id',
  onRowClick,
  emptyMessage = 'No records found',
  pageSize = 10,
}) {
  const [sortCol, setSortCol] = useState(null);
  const [sortDir, setSortDir] = useState('asc');
  const [currentPage, setCurrentPage] = useState(1);

  const handleSort = (key) => {
    if (sortCol === key) {
      setSortDir(sortDir === 'asc' ? 'desc' : 'asc');
    } else {
      setSortCol(key);
      setSortDir('asc');
    }
  };

  let sortedData = [...data];
  if (sortCol) {
    sortedData.sort((a, b) => {
      let valA = a[sortCol];
      let valB = b[sortCol];
      if (valA === undefined || valA === null) return 1;
      if (valB === undefined || valB === null) return -1;
      if (typeof valA === 'string') {
        return sortDir === 'asc'
          ? valA.localeCompare(valB)
          : valB.localeCompare(valA);
      }
      return sortDir === 'asc' ? valA - valB : valB - valA;
    });
  }

  const totalPages = Math.ceil(sortedData.length / pageSize) || 1;
  const paginatedData = sortedData.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  return (
    <div className="w-full flex flex-col border border-border rounded-[var(--radius-sm)] bg-surface overflow-hidden shadow-xs select-none">
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-muted border-b border-border text-ink-600 text-xs font-semibold uppercase tracking-wider h-10">
              {columns.map((col) => (
                <th
                  key={col.key}
                  onClick={() => col.sortable !== false && handleSort(col.key)}
                  className={`px-4 py-2 font-semibold transition-colors text-ink-600 ${
                    col.sortable !== false ? 'cursor-pointer select-none hover:text-primary-600' : ''
                  } ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}`}
                >
                  <span>{col.header}</span>
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border text-sm text-ink-900">
            {paginatedData.length > 0 ? (
              paginatedData.map((row) => (
                <tr
                  key={row[keyField] || JSON.stringify(row)}
                  onClick={() => onRowClick && onRowClick(row)}
                  className={`h-10 transition-colors ${
                    onRowClick ? 'cursor-pointer hover:bg-surface-muted/80' : 'hover:bg-surface-sunken'
                  }`}
                >
                  {columns.map((col) => (
                    <td
                      key={col.key}
                      className={`px-4 py-2 text-xs md:text-sm whitespace-nowrap ${
                        col.align === 'right'
                          ? 'text-right'
                          : col.align === 'center'
                          ? 'text-center'
                          : 'text-left'
                      }`}
                    >
                      {col.render ? col.render(row[col.key], row) : row[col.key]}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-12 text-center text-ink-400">
                  <div className="flex flex-col items-center justify-center gap-2">
                    <Inbox className="w-8 h-8 text-ink-400 stroke-1" />
                    <span className="text-sm font-medium">{emptyMessage}</span>
                  </div>
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Pagination Footer */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-2.5 border-t border-border bg-surface-sunken text-xs text-ink-600">
          <span>
            Showing {Math.min((currentPage - 1) * pageSize + 1, data.length)} to{' '}
            {Math.min(currentPage * pageSize, data.length)} of {data.length} entries
          </span>
          <div className="flex items-center gap-1">
            <button
              disabled={currentPage === 1}
              onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
              className="px-2.5 py-1 rounded-sm border border-border bg-surface hover:bg-surface-muted text-ink-900 disabled:opacity-30 focus-visible:outline-none cursor-pointer"
            >
              Previous
            </button>
            <span className="px-2 font-bold text-primary-600">
              {currentPage} / {totalPages}
            </span>
            <button
              disabled={currentPage === totalPages}
              onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
              className="px-2.5 py-1 rounded-sm border border-border bg-surface hover:bg-surface-muted text-ink-900 disabled:opacity-30 focus-visible:outline-none cursor-pointer"
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
