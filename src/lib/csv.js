// Client-side CSV export for the admin tables. Exports exactly what is on
// screen (the rows already fetched), so what the admin sees is what they get —
// no second, differently-filtered server query to explain.

function cell(value) {
  if (value == null) return '';
  const s = String(value);
  // A leading =, +, - or @ is executed as a formula by Excel/Sheets. Prefix a
  // quote so an exported job title can never run as one.
  const safe = /^[=+\-@]/.test(s) ? `'${s}` : s;
  return /[",;\n\r]/.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/**
 * @param {string} filename  without extension
 * @param {Array<{key:string,label:string,get?:(row:any)=>any}>} columns
 * @param {Array<object>} rows
 */
export function exportCsv(filename, columns, rows) {
  const head = columns.map((c) => cell(c.label)).join(';');
  const body = rows
    .map((row) => columns.map((c) => cell(c.get ? c.get(row) : row[c.key])).join(';'))
    .join('\r\n');

  // BOM so Excel opens the Uzbek/Cyrillic text as UTF-8 rather than cp1252.
  const blob = new Blob(['﻿' + head + '\r\n' + body], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `${filename}-${new Date().toISOString().slice(0, 10)}.csv`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
