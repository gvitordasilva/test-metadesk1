/**
 * Export data as CSV or Excel-compatible CSV (UTF-8 BOM for proper accent handling).
 */
export function exportToCsv(
  filename: string,
  headers: string[],
  rows: (string | number | null | undefined)[][],
) {
  const BOM = "\uFEFF";
  const escape = (val: string | number | null | undefined) => {
    const s = val == null ? "" : String(val);
    // Wrap in quotes if it contains comma, quote, or newline
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`;
    }
    return s;
  };

  const csvContent =
    BOM +
    [headers.map(escape).join(";"), ...rows.map((row) => row.map(escape).join(";"))].join("\r\n");

  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = `${filename}-${new Date().toISOString().split("T")[0]}.csv`;
  link.click();
  URL.revokeObjectURL(url);
}
