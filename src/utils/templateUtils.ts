// Template Download Helpers & Parser with Native Microsoft Excel (.xls) and CSV Support

export interface TemplateDefinition {
  id: string;
  filenameXls: string;
  filenameCsv: string;
  titleUz: string;
  descriptionUz: string;
  icon: string;
  headers: string[];
  sampleRows: string[][];
  notesUz?: string[];
}

export const IMPORT_TEMPLATES: TemplateDefinition[] = [
  {
    id: 'products',
    filenameXls: 'mahsulotlar_import_shablon.xls',
    filenameCsv: 'mahsulotlar_import_shablon.csv',
    titleUz: "Mahsulotlar (Katalog) Excel Shablon",
    descriptionUz: "Mahsulot nomi, shtrix-kod, SKU, sotish narxi, tannarxi, o'lchov birligi va brend ma'lumotlarini Excel orqali ommaviy yuklash uchun maxsus shablon",
    icon: '📦',
    headers: [
      'Mahsulot Nomi (Uz)',
      'Kategoriya ID',
      'Shtrix Kod (Barcode)',
      'SKU Kodi',
      'Sotish Narxi (UZS)',
      'Tannarx (UZS)',
      'O\'lchov Birligi',
      'Brend',
      'Minimal Zaxira Chegarasi',
    ],
    sampleRows: [
      [
        'Coca-Cola Classic 1.5L',
        'cat_drinks',
        '5449000000996',
        'SKU-COCA-15',
        '14000',
        '10500',
        'dona',
        'Coca-Cola',
        '50',
      ],
      [
        'Nestle Sut 3.2% 1L',
        'cat_dairy',
        '4870002011029',
        'SKU-NEST-SUT1',
        '18000',
        '13500',
        'dona',
        'Nestle',
        '30',
      ],
      [
        'MacCoffee 3in1 Original 20g',
        'cat_grocery',
        '8888088000101',
        'SKU-MAC-3IN1',
        '2500',
        '1800',
        'pachka',
        'MacCoffee',
        '200',
      ],
      [
        'Lays Paprika 140g',
        'cat_snacks',
        '4870003001290',
        'SKU-LAYS-PAP140',
        '16000',
        '12000',
        'pachka',
        'Lays',
        '40',
      ],
    ],
    notesUz: [
      "📌 DIQQAT: 'Shtrix Kod' ustuni faqat raqamlardan iborat bo'lishi lozim (Masalan: 4780000000000).",
      "📌 'Sotish Narxi' va 'Tannarx' ustunlarida probel va harflar ishlatmang (Masalan: 15000).",
      "📌 'O'lchov Birligi' uchun: dona, kg, litr, quti, pachka so'zlaridan birini ishlating.",
    ],
  },
  {
    id: 'clients',
    filenameXls: 'mijozlar_crm_import_shablon.xls',
    filenameCsv: 'mijozlar_crm_import_shablon.csv',
    titleUz: "B2B Mijozlar (CRM) Excel Shablon",
    descriptionUz: "Distributsiya mijozlari, do'kon nomlari, INN, telefon, manzil, kredit limiti va biriktirilgan teritoriyalarni import qilish shabloni",
    icon: '🏢',
    headers: [
      'Kompaniya Nomi (Mijoz)',
      'INN Raqami',
      'Mas\'ul Shaxs',
      'Telefon Raqami',
      'Manzil',
      'Kredit Limiti (UZS)',
      'Boshlang\'ich Qarz (UZS)',
      'Teritoriya Nomi',
      'Biriktirilgan Agent',
    ],
    sampleRows: [
      [
        'Oasis Supermarket MCHJ',
        '304892104',
        'Alisher Qodirov',
        '+998 90 123 45 67',
        'Toshkent sh., Yunusobod 4-mavze, 12-uy',
        '50000000',
        '0',
        'Yunusobod tumani',
        'Ravshanbek Agent',
      ],
      [
        'Fayz Market XK',
        '309112849',
        'Jamshid Toirov',
        '+998 91 987 65 43',
        'Toshkent sh., Chilonzor 19-mavze, 4-uy',
        '30000000',
        '0',
        'Chilonzor tumani',
        'Xamidullo Agent',
      ],
    ],
    notesUz: [
      "📌 INN raqami 9 ta xonali bo'lishi kerak.",
      "📌 Telefon raqami xalqaro formatda kiritilishi tavsiya etiladi (+998 90 123 45 67).",
    ],
  },
  {
    id: 'categories',
    filenameXls: 'kategoriyalar_import_shablon.xls',
    filenameCsv: 'kategoriyalar_import_shablon.csv',
    titleUz: "Kategoriyalar Excel Shablon",
    descriptionUz: "Mahsulot toifalari va bo'limlarini import qilish shabloni",
    icon: '🗂️',
    headers: [
      'Kategoriya ID',
      'Kategoriya Nomi (Uz)',
      'Kategoriya Nomi (Ru)',
      'Tartib Raqami',
      'Tavsif',
    ],
    sampleRows: [
      [
        'cat_grocery',
        'Oziq-ovqat va Baqallik',
        'Продукты питания',
        '1',
        'Oziq-ovqat va baqallik mahsulotlari bo\'limi',
      ],
      [
        'cat_drinks',
        'Ichimliklar va Sharbatlar',
        'Напитки и Соки',
        '2',
        'Barcha turdagi salqin ichimliklar va sharbatlar',
      ],
    ],
  },
  {
    id: 'staff',
    filenameXls: 'xodimlar_agentlar_import_shablon.xls',
    filenameCsv: 'xodimlar_agentlar_import_shablon.csv',
    titleUz: "Xodimlar va Agentlar Excel Shablon",
    descriptionUz: "Savdo agentlari, kuryerlar, kassa xodimlari va omborchilarni ommaviy kiritish shabloni",
    icon: '👥',
    headers: [
      'Xodim F.I.O.',
      'Roli (sales_agent/driver/warehouse_manager/cashier)',
      'Telefon Raqami',
      'Email',
      'Biriktirilgan Filial ID',
      'Biriktirilgan Teritoriya',
    ],
    sampleRows: [
      [
        'Sardorbek Rahimov',
        'sales_agent',
        '+998 90 111 22 33',
        'sardor@osiyo-go.uz',
        'br_chilonzor',
        'Chilonzor tumani',
      ],
      [
        'Farrux Kuryer',
        'driver',
        '+998 93 444 55 66',
        'farrux@osiyo-go.uz',
        'br_chilonzor',
        'Chilonzor tumani',
      ],
    ],
  },
  {
    id: 'territories',
    filenameXls: 'teritoriyalar_import_shablon.xls',
    filenameCsv: 'teritoriyalar_import_shablon.csv',
    titleUz: "Teritoriyalar (Hududlar) Excel Shablon",
    descriptionUz: "Agentlar va do'konlar biriktiriladigan hudud va tumanlarni import qilish shabloni",
    icon: '📍',
    headers: [
      'Teritoriya Nomi',
      'Hudud Kodi (Qisqartma)',
      'Izoh va Chegaralari',
    ],
    sampleRows: [
      [
        'Chilonzor tumani',
        'CHIL',
        'Chilonzor 1-26 mavzelar va Farhod bozori atrofi',
      ],
      [
        'Yunusobod tumani',
        'YUN',
        'Yunusobod 1-19 kvartallar va Megaplanet atrofi',
      ],
    ],
  },
];

/**
 * Generate Microsoft Excel Spreadsheet (.xls) with custom styling, UTF-8 BOM, and instruction headers
 */
export function generateXlsContent(template: TemplateDefinition): string {
  const notesHtml = template.notesUz && template.notesUz.length > 0
    ? `<tr><td colspan="${template.headers.length}" style="background-color: #fffbebf1; color: #b45309; font-size: 9pt; padding: 8px; border: 1px solid #fcd34d;">
        <strong>Yo'riqnoma:</strong><br/>
        ${template.notesUz.join('<br/>')}
       </td></tr>
       <tr><td colspan="${template.headers.length}" style="height: 6px; border: none;"></td></tr>`
    : '';

  const tableHtml = `
  <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
  <head>
    <meta http-equiv="Content-Type" content="text/html; charset=utf-8">
    <!--[if gte mso 9]>
    <xml>
      <x:ExcelWorkbook>
        <x:ExcelWorksheets>
          <x:ExcelWorksheet>
            <x:Name>Import Shablon</x:Name>
            <x:WorksheetOptions>
              <x:DisplayGridlines/>
            </x:WorksheetOptions>
          </x:ExcelWorksheet>
        </x:ExcelWorksheets>
      </x:ExcelWorkbook>
    </xml>
    <![endif]-->
    <style>
      body { font-family: 'Calibri', 'Segoe UI', Arial, sans-serif; }
      .brand-title { background-color: #1e293b; color: #ffffff; font-size: 13pt; font-weight: bold; text-align: center; padding: 10px; border: 1px solid #0f172a; }
      .template-title { background-color: #2563eb; color: #ffffff; font-size: 11pt; font-weight: bold; text-align: center; padding: 8px; border: 1px solid #1d4ed8; }
      .header-cell { background-color: #0f172a; color: #ffffff; font-size: 10pt; font-weight: bold; padding: 8px; border: 1px solid #334155; text-align: center; }
      .data-even { background-color: #ffffff; font-size: 9.5pt; padding: 6px; border: 1px solid #cbd5e1; }
      .data-odd { background-color: #f8fafc; font-size: 9.5pt; padding: 6px; border: 1px solid #cbd5e1; }
    </style>
  </head>
  <body>
    <table border="1" style="border-collapse: collapse; width: 100%;">
      <tr>
        <td colspan="${template.headers.length}" class="brand-title">TRADEUZ SFA — IMPORT EXCEL SHABLONI</td>
      </tr>
      <tr>
        <td colspan="${template.headers.length}" class="template-title">${template.titleUz.toUpperCase()}</td>
      </tr>
      ${notesHtml}
      <tr>
        ${template.headers.map((h) => `<td class="header-cell">${h}</td>`).join('')}
      </tr>
      ${template.sampleRows
        .map(
          (row, rIdx) => `
        <tr>
          ${row
            .map(
              (cell) =>
                `<td class="${rIdx % 2 === 0 ? 'data-even' : 'data-odd'}">${cell}</td>`
            )
            .join('')}
        </tr>`
        )
        .join('')}
    </table>
  </body>
  </html>`;

  return '\uFEFF' + tableHtml;
}

export function generateCsvContent(headers: string[], sampleRows: string[][]): string {
  const escapeCell = (cell: string) => {
    if (cell.includes(',') || cell.includes('"') || cell.includes('\n') || cell.includes(';')) {
      return `"${cell.replace(/"/g, '""')}"`;
    }
    return cell;
  };

  const lines = [
    headers.map(escapeCell).join(','),
    ...sampleRows.map((row) => row.map(escapeCell).join(',')),
  ];

  // UTF-8 BOM prefix \uFEFF ensures Excel displays Uzbek characters cleanly
  return '\uFEFF' + lines.join('\r\n');
}

export function downloadTemplateById(templateId: string, format: 'xls' | 'csv' = 'xls'): void {
  const template = IMPORT_TEMPLATES.find((t) => t.id === templateId);
  if (!template) return;

  if (format === 'xls') {
    const xlsContent = generateXlsContent(template);
    const blob = new Blob([xlsContent], { type: 'application/vnd.ms-excel;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = template.filenameXls;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  } else {
    const csvContent = generateCsvContent(template.headers, template.sampleRows);
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = template.filenameCsv;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }
}

/**
 * Universal File Parser for Excel HTML, CSV, or TSV files uploaded by users
 */
export async function parseExcelOrCsvFile(file: File): Promise<{ headers: string[]; rows: Record<string, string>[] }> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = (e.target?.result as string) || '';
        const cleanText = text.replace(/^\uFEFF/, ''); // Remove UTF-8 BOM if present

        // Check if HTML Table (Excel .xls generated)
        if (cleanText.includes('<table') || cleanText.includes('<tr')) {
          const parser = new DOMParser();
          const doc = parser.parseFromString(cleanText, 'text/html');
          const rowsElements = Array.from(doc.querySelectorAll('tr'));

          const allRowsData: string[][] = [];
          rowsElements.forEach((tr) => {
            const cells = Array.from(tr.querySelectorAll('td, th')).map((cell) =>
              cell.textContent ? cell.textContent.trim() : ''
            );
            if (cells.length > 0) {
              allRowsData.push(cells);
            }
          });

          // Find header row (first row with at least 3 columns)
          let headerIdx = allRowsData.findIndex(
            (r) => r.length >= 3 && !r[0].toLowerCase().includes('tradeuz') && !r[0].toLowerCase().includes('import excel')
          );
          if (headerIdx === -1) headerIdx = 0;

          const headers = allRowsData[headerIdx] || [];
          const rows: Record<string, string>[] = [];

          for (let i = headerIdx + 1; i < allRowsData.length; i++) {
            const rData = allRowsData[i];
            if (!rData || rData.length === 0) continue;
            // Skip title / empty instruction rows
            if (rData.length === 1 || rData[0].toLowerCase().includes("yo'riqnoma")) continue;

            const rowObj: Record<string, string> = {};
            headers.forEach((h, hIdx) => {
              if (h) {
                rowObj[h] = rData[hIdx] || '';
              }
            });
            if (Object.values(rowObj).some((v) => v.trim() !== '')) {
              rows.push(rowObj);
            }
          }

          return resolve({ headers, rows });
        }

        // CSV / TSV Parsing
        const lines = cleanText.split(/\r?\n/).filter((l) => l.trim() !== '');
        if (lines.length === 0) {
          return resolve({ headers: [], rows: [] });
        }

        // Determine delimiter (, or ; or \t)
        const firstLine = lines[0];
        let delimiter = ',';
        if (firstLine.includes('\t')) delimiter = '\t';
        else if (firstLine.includes(';') && !firstLine.includes(',')) delimiter = ';';

        const parseCsvLine = (line: string): string[] => {
          const result: string[] = [];
          let current = '';
          let inQuotes = false;

          for (let i = 0; i < line.length; i++) {
            const char = line[i];
            if (char === '"') {
              inQuotes = !inQuotes;
            } else if (char === delimiter && !inQuotes) {
              result.push(current.trim().replace(/^"|"$/g, ''));
              current = '';
            } else {
              current += char;
            }
          }
          result.push(current.trim().replace(/^"|"$/g, ''));
          return result;
        };

        const headers = parseCsvLine(lines[0]);
        const rows: Record<string, string>[] = [];

        for (let i = 1; i < lines.length; i++) {
          const vals = parseCsvLine(lines[i]);
          if (vals.length === 0) continue;
          const rowObj: Record<string, string> = {};
          headers.forEach((h, hIdx) => {
            if (h) {
              rowObj[h] = vals[hIdx] || '';
            }
          });
          if (Object.values(rowObj).some((v) => v.trim() !== '')) {
            rows.push(rowObj);
          }
        }

        resolve({ headers, rows });
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = (err) => reject(err);
    reader.readAsText(file);
  });
}

