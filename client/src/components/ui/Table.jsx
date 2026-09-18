import { ChevronUp, ChevronDown, ChevronsUpDown } from 'lucide-react';

export function Table({ columns, data, onSort, sortKey, sortDirection, emptyState }) {
  return (
    <div className="overflow-x-auto">
      <table className="w-full">
        <thead>
          <tr className="border-b border-border-light dark:border-border-dark">
            {columns.map((column) => (
              <th
                key={column.key}
                className={`px-6 py-3 text-left text-xs font-semibold uppercase tracking-wider text-gray-500 dark:text-gray-400 ${
                  column.sortable ? 'cursor-pointer select-none' : ''
                }`}
                onClick={() => column.sortable && onSort?.(column.key)}
              >
                <span className="inline-flex items-center gap-1">
                  {column.header || column.label}
                  {column.sortable && (
                    <span>
                      {sortKey === column.key ? (
                        <ChevronUp className="h-3 w-3" />
                      ) : (
                        <ChevronsUpDown className="h-3 w-3" />
                      )}
                    </span>
                  )}
                </span>
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border-light dark:divide-border-dark">
          {data.length === 0 ? (
            <tr>
              <td colSpan={columns.length} className="px-6 py-12">
                {emptyState}
              </td>
            </tr>
          ) : (
            data.map((row, index) => (
              <tr
                key={row._id || index}
                className="hover:bg-gray-50 dark:hover:bg-gray-800/50 transition-colors"
              >
                {columns.map((column) => (
                  <td key={column.key} className="px-6 py-4 text-sm text-ink-light dark:text-ink-dark">
                    {column.render ? column.render(row) : row[column.key]}
                  </td>
                ))}
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  );
}

export default Table;