/**
 * Excel Export Utilities for Tradeuz SFA / ERP System
 * Generates beautifully formatted, branded Excel templates (.xls) with UTF-8 support,
 * custom headers, zebra stripes, formatted columns, and totals rows.
 */

export interface ExcelColumn {
  header: string;
  key: string;
  align?: 'left' | 'center' | 'right';
  width?: string;
}

export interface ExcelExportOptions {
  filename: string;
  title: string;
  subtitle?: string;
  columns: ExcelColumn[];
  data: Array<Record<string, any>>;
  summary?: Record<string, string | number>;
  companyName?: string;
}

export function exportToExcel({
  filename,
  title,
  subtitle,
  columns,
  data,
  summary,
  companyName = 'TRADEUZ SFA DISTRIBUTION SYSTEM',
}: ExcelExportOptions) {
  const dateStr = new Date().toLocaleString('uz-UZ', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  });

  const tableHtml = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Hisobot</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body { font-family: 'Segoe UI', Arial, sans-serif; margin: 0; padding: 10px; background-color: #ffffff; }
      .company-header { background-color: #1e293b; color: #ffffff; font-size: 15pt; font-weight: bold; text-align: center; padding: 10px; border: 1px solid #0f172a; }
      .title-header { background-color: #2563eb; color: #ffffff; font-size: 12pt; font-weight: bold; text-align: center; padding: 8px; border: 1px solid #1d4ed8; }
      .meta-header { background-color: #f1f5f9; color: #334155; font-size: 9.5pt; text-align: left; padding: 6px; border: 1px solid #cbd5e1; }
      .table-header { background-color: #0f172a; color: #ffffff; font-size: 10.5pt; font-weight: bold; border: 1px solid #334155; padding: 8px; }
      .data-cell { border: 1px solid #cbd5e1; font-size: 9.5pt; padding: 6px; }
      .data-cell-even { background-color: #ffffff; }
      .data-cell-odd { background-color: #f8fafc; }
      .summary-cell { background-color: #e2e8f0; color: #0f172a; font-size: 10.5pt; font-weight: bold; border: 2px solid #64748b; padding: 8px; }
      .text-left { text-align: left; }
      .text-center { text-align: center; }
      .text-right { text-align: right; }
    </style>
  </head>
  <body>
    <table border="1" style="border-collapse: collapse; width: 100%;">
      <tr>
        <td colspan="${columns.length}" class="company-header">${companyName}</td>
      </tr>
      <tr>
        <td colspan="${columns.length}" class="title-header">${title.toUpperCase()}</td>
      </tr>
      ${subtitle ? `<tr><td colspan="${columns.length}" class="meta-header"><strong>Ma'lumot:</strong> ${subtitle}</td></tr>` : ''}
      <tr>
        <td colspan="${columns.length}" class="meta-header"><strong>Eksport sanasi:</strong> ${dateStr} | <strong>Jami satrlar:</strong> ${data.length} ta</td>
      </tr>
      <tr><td colspan="${columns.length}" style="height: 10px; background-color: #ffffff; border: none;"></td></tr>
      
      <!-- Table Headers -->
      <tr>
        ${columns
          .map(
            (col) =>
              `<td class="table-header ${col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left'}">${col.header}</td>`
          )
          .join('')}
      </tr>

      <!-- Data Rows -->
      ${data
        .map((row, idx) => {
          const bgClass = idx % 2 === 0 ? 'data-cell-even' : 'data-cell-odd';
          return `
          <tr>
            ${columns
              .map((col) => {
                const val = row[col.key] !== undefined && row[col.key] !== null ? row[col.key] : '';
                const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
                return `<td class="data-cell ${bgClass} ${alignClass}">${val}</td>`;
              })
              .join('')}
          </tr>`;
        })
        .join('')}

      <!-- Summary Row -->
      ${
        summary
          ? `
        <tr><td colspan="${columns.length}" style="height: 6px; background-color: #ffffff; border: none;"></td></tr>
        <tr>
          ${columns
            .map((col, idx) => {
              const val = summary[col.key] !== undefined ? summary[col.key] : idx === 0 ? 'JAMI / ИТОГО:' : '';
              const alignClass = col.align === 'right' ? 'text-right' : col.align === 'center' ? 'text-center' : 'text-left';
              return `<td class="summary-cell ${alignClass}">${val}</td>`;
            })
            .join('')}
        </tr>`
          : ''
      }
    </table>
  </body>
  </html>
  `;

  // UTF-8 BOM byte sequence \uFEFF ensures Excel renders Uzbek Cyrillic/Latin, special characters properly
  const blob = new Blob(['\uFEFF' + tableHtml], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  const cleanFilename = filename.endsWith('.xls') ? filename : `${filename}.xls`;
  a.setAttribute('download', cleanFilename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}
