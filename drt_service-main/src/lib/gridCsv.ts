import type { GridApi } from "ag-grid-community";

/** Neutralize spreadsheet formulas without changing displayed cell formatting. */
export function safeCsvCell(value: unknown): string {
  const text = value == null ? "" : String(value);
  return /^[\s\uFEFF]*[=+\-@]/.test(text) || /^[\t\r\n]/.test(text) ? `'${text}` : text;
}

export function currentGridCsv(api: GridApi): string | undefined {
  const csv = api.getDataAsCsv({
    columnKeys: api.getAllDisplayedColumns(),
    exportedRows: "filteredAndSorted",
    onlySelected: false,
    skipPinnedTop: true,
    skipPinnedBottom: true,
    suppressQuotes: false,
    processCellCallback: (params) => safeCsvCell(params.formatValue(params.value) ?? params.value),
    processHeaderCallback: ({ column }) => safeCsvCell(api.getDisplayNameForColumn(column, "csv")),
  });
  return csv == null ? undefined : `\uFEFF${csv}`;
}
