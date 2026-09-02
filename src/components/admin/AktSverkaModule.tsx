import React, { useState, useEffect } from 'react';
import { FileText, Calendar, Download, Printer, Filter, Building2, CheckCircle, ArrowDownRight, ArrowUpRight, DollarSign, FileSpreadsheet } from 'lucide-react';
import { Client, AktSverkaEntry } from '../../types';
import { fetchClients, fetchAktSverka } from '../../services/api';
import { printElementById } from '../../utils/printUtils';
import { exportToExcel } from '../../utils/excelUtils';

export const AktSverkaModule: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [selectedClientId, setSelectedClientId] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('2026-08-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');

  const [aktData, setAktData] = useState<{
    client: Client;
    startDate: string;
    endDate: string;
    openingBalance: number;
    closingBalance: number;
    totalDebit: number;
    totalCredit: number;
    entries: AktSverkaEntry[];
  } | null>(null);

  useEffect(() => {
    fetchClients().then((cls) => {
      setClients(cls);
      if (cls.length > 0) {
        setSelectedClientId(cls[0].id);
      }
    });
  }, []);

  useEffect(() => {
    if (selectedClientId) {
      loadAktSverka();
    }
  }, [selectedClientId, startDate, endDate]);

  const loadAktSverka = async () => {
    if (!selectedClientId) return;
    const res = await fetchAktSverka(selectedClientId, startDate, endDate);
    setAktData(res);
  };

  const handlePrint = () => {
    printElementById('printable-akt-sverka', `AktSverka_${aktData?.client?.companyName || 'Document'}`);
  };

  const handleExcelExport = () => {
    if (!aktData) return;
    exportToExcel({
      filename: `akt_sverka_${aktData.client.companyName.replace(/\s+/g, '_')}_${Date.now()}`,
      title: `TRADEUZ SFA — Solishtirma Dalolatnoma (Akt Sverka)`,
      subtitle: `Mijoz: ${aktData.client.companyName} (STIR: ${aktData.client.inn}) | Davr: ${aktData.startDate} — ${aktData.endDate}`,
      columns: [
        { header: 'Sana', key: 'date', align: 'center' },
        { header: 'Hujjat №', key: 'docNo', align: 'center' },
        { header: 'Operatsiya Mazmuni', key: 'description', align: 'left' },
        { header: 'Debet (Yuk Berildi, UZS)', key: 'debit', align: 'right' },
        { header: 'Kredit (To\'lov Qilindi, UZS)', key: 'credit', align: 'right' },
        { header: 'Qoldiq Balans (UZS)', key: 'balance', align: 'right' },
      ],
      data: [
        {
          date: aktData.startDate,
          docNo: 'SALDO-START',
          description: 'Davr boshidagi qarzdorlik qoldig\'i (Boshlang\'ich Saldo)',
          debit: '-',
          credit: '-',
          balance: aktData.openingBalance.toLocaleString('uz-UZ'),
        },
        ...aktData.entries.map((e) => ({
          date: e.date,
          docNo: e.documentNo,
          description: e.description,
          debit: e.debit > 0 ? e.debit.toLocaleString('uz-UZ') : '-',
          credit: e.credit > 0 ? e.credit.toLocaleString('uz-UZ') : '-',
          balance: e.runningBalance.toLocaleString('uz-UZ'),
        })),
      ],
      summary: {
        description: `JAMI OBOROT: Debet ${aktData.totalDebit.toLocaleString('uz-UZ')} UZS | Kredit ${aktData.totalCredit.toLocaleString('uz-UZ')} UZS`,
        balance: `YAKUNIY SALDO: ${aktData.closingBalance.toLocaleString('uz-UZ')} UZS`,
      },
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Filter Bar */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4 print:hidden">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <FileText className="w-6 h-6 text-rose-600" />
            <span>Akt Sverka — Solishtirma Dalolatnoma</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            B2B Mijozlar bilan o'zaro hisob-kitoblar (Yuk va to'lovlar) harakatlari va balansi.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handlePrint}
            className="bg-slate-800 hover:bg-slate-900 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <Printer className="w-4 h-4" />
            <span>Chop etish (PDF)</span>
          </button>
          <button
            onClick={handleExcelExport}
            className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-2 transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Excel Export</span>
          </button>
        </div>
      </div>

      {/* Selector Controls (Period & Client) */}
      <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm grid grid-cols-1 sm:grid-cols-3 gap-4 print:hidden">
        <div>
          <label className="block text-slate-600 text-xs font-bold mb-1 flex items-center gap-1">
            <Building2 className="w-3.5 h-3.5 text-rose-600" />
            <span>1. B2B Mijozni Tanlang:</span>
          </label>
          <select
            value={selectedClientId}
            onChange={(e) => setSelectedClientId(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-rose-600"
          >
            {clients.map((c) => (
              <option key={c.id} value={c.id}>
                {c.companyName} (STIR: {c.inn})
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="block text-slate-600 text-xs font-bold mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>2. Boshlanish Sanasi:</span>
          </label>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-rose-600"
          />
        </div>

        <div>
          <label className="block text-slate-600 text-xs font-bold mb-1 flex items-center gap-1">
            <Calendar className="w-3.5 h-3.5 text-emerald-600" />
            <span>3. Tugash Sanasi:</span>
          </label>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-xs text-slate-900 font-bold focus:outline-none focus:border-rose-600"
          />
        </div>
      </div>

      {/* Akt Sverka Printable Document */}
      {aktData && (
        <div id="printable-akt-sverka" className="bg-white p-6 sm:p-8 rounded-2xl border border-slate-200 shadow-lg space-y-6 text-slate-900 font-sans">
          {/* Header Invoice Banner */}
          <div className="border-b border-slate-300 pb-5 flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="text-2xl font-black tracking-tight text-rose-700">OSIYO SUPERMARKET GO</div>
              <div className="text-xs text-slate-500 font-bold">Ulgurji Distributsiya va Savdo Tarmog'i</div>
              <div className="text-xs text-slate-600 mt-2">
                STIR: 301988231 • Manzil: Toshkent sh., Yunusobod 4-mavze • Tel: +998 71 200 55 55
              </div>
            </div>

            <div className="text-right">
              <div className="text-lg font-black text-slate-900">HISOB-KITOB SOLISHTIRMA DALOLATNOMASI</div>
              <div className="text-xs font-bold text-rose-600 mt-1">
                Davr: {aktData.startDate} va {aktData.endDate} oralig'ida
              </div>
              <div className="text-[11px] text-slate-400 font-mono mt-1">Hujjat #: AKT-{Date.now().toString().slice(-6)}</div>
            </div>
          </div>

          {/* Client Details Grid */}
          <div className="bg-slate-50 p-4 rounded-xl border border-slate-200 grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
            <div>
              <span className="text-slate-500 font-bold">Mijoz (Tashkilot):</span>
              <div className="font-black text-slate-900 text-sm mt-0.5">{aktData.client.companyName}</div>
              <div className="text-slate-600 mt-1">STIR (INN): <span className="font-mono font-bold">{aktData.client.inn}</span></div>
              <div className="text-slate-600">Mas'ul: {aktData.client.contactName} ({aktData.client.phone})</div>
            </div>

            <div className="sm:text-right">
              <span className="text-slate-500 font-bold">Guruh va Agent:</span>
              <div className="font-bold text-emerald-700 mt-0.5">{aktData.client.assignedAgentName}</div>
              <div className="text-slate-600 mt-1">Kredit Limiti: <span className="font-bold">{aktData.client.creditLimit.toLocaleString()} UZS</span></div>
              <div className="text-slate-600">Manzil: {aktData.client.address}</div>
            </div>
          </div>

          {/* Ledger Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-[#24275f] text-white font-semibold border-b border-indigo-900">
                  <th className="p-1.5 border-r border-indigo-900">Sana</th>
                  <th className="p-1.5 border-r border-indigo-900 font-mono">Hujjat #</th>
                  <th className="p-1.5 border-r border-indigo-900">Operatsiya Mazmuni</th>
                  <th className="p-1.5 border-r border-indigo-900 text-right">Debet (Yuk Berildi)</th>
                  <th className="p-1.5 border-r border-indigo-900 text-right">Kredit (To'lov Qilindi)</th>
                  <th className="p-1.5 text-right font-black">Qoldiq Balans</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
                {/* Opening Balance Row */}
                <tr className="bg-amber-50 font-bold">
                  <td className="p-1.5 border-r border-slate-200 font-mono">{aktData.startDate}</td>
                  <td className="p-1.5 border-r border-slate-200 font-mono text-amber-900">SALDO-START</td>
                  <td className="p-1.5 border-r border-slate-200 text-slate-800">Davr boshidagi qarzdorlik qoldig'i (Boshlang'ich Saldo)</td>
                  <td className="p-1.5 border-r border-slate-200 text-right">-</td>
                  <td className="p-1.5 border-r border-slate-200 text-right">-</td>
                  <td className="p-1.5 text-right text-rose-700 font-black whitespace-nowrap">
                    {aktData.openingBalance.toLocaleString('ru-RU')} SUM
                  </td>
                </tr>

                {aktData.entries.map((entry) => (
                  <tr key={entry.id} className="hover:bg-blue-50/70 transition-colors even:bg-slate-50/50">
                    <td className="p-1.5 border-r border-slate-200 font-mono text-slate-600">{entry.date}</td>
                    <td className="p-1.5 border-r border-slate-200 font-bold font-mono text-blue-700">{entry.documentNo}</td>
                    <td className="p-1.5 border-r border-slate-200 text-slate-800">{entry.description}</td>
                    <td className="p-1.5 border-r border-slate-200 text-right font-bold text-rose-600 whitespace-nowrap">
                      {entry.debit > 0 ? `${entry.debit.toLocaleString('ru-RU')} SUM` : '-'}
                    </td>
                    <td className="p-1.5 border-r border-slate-200 text-right font-bold text-emerald-600 whitespace-nowrap">
                      {entry.credit > 0 ? `${entry.credit.toLocaleString('ru-RU')} SUM` : '-'}
                    </td>
                    <td className="p-1.5 text-right font-black text-slate-900 whitespace-nowrap">
                      {entry.runningBalance.toLocaleString('ru-RU')} SUM
                    </td>
                  </tr>
                ))}

                {/* Total Summary Row */}
                <tr className="bg-slate-100 font-black text-slate-900 border-t-2 border-slate-300">
                  <td className="p-1.5 border-r border-slate-300" colSpan={3}>
                    JAMI OBOROT (DAVR MOBAYNIDA):
                  </td>
                  <td className="p-1.5 border-r border-slate-300 text-right text-rose-700 font-bold text-xs whitespace-nowrap">
                    {aktData.totalDebit.toLocaleString('ru-RU')} SUM
                  </td>
                  <td className="p-1.5 border-r border-slate-300 text-right text-emerald-700 font-bold text-xs whitespace-nowrap">
                    {aktData.totalCredit.toLocaleString('ru-RU')} SUM
                  </td>
                  <td className="p-1.5 text-right text-rose-700 font-black text-xs whitespace-nowrap">
                    {aktData.closingBalance.toLocaleString('ru-RU')} SUM
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Final Saldo Box */}
          <div className="p-4 bg-rose-50 rounded-xl border border-rose-200 flex flex-wrap items-center justify-between gap-4">
            <div>
              <div className="text-xs text-rose-800 font-bold uppercase tracking-wide">
                Davr oxiriga yakuniy holat ({aktData.endDate}):
              </div>
              <div className="text-sm font-medium text-slate-700 mt-1">
                Mijoz <span className="font-bold">{aktData.client.companyName}</span> ning sotuvchi oldidagi yakuniy qarz summasi:
              </div>
            </div>

            <div className="text-2xl font-black text-rose-700 font-mono">
              {aktData.closingBalance.toLocaleString()} UZS
            </div>
          </div>

          {/* Signatures */}
          <div className="pt-8 border-t border-slate-200 grid grid-cols-2 gap-8 text-xs font-bold text-slate-700">
            <div>
              <div>ETKAZIB BERUVCHI (SOTUVCHI):</div>
              <div className="text-slate-500 font-normal">"OSIYO SUPERMARKET GO" MCHJ</div>
              <div className="mt-8 border-b border-slate-400 w-48"></div>
              <div className="text-[10px] text-slate-400 mt-1">Bosh Buhgalter (Imzo va M.O'.)</div>
            </div>

            <div>
              <div>MIJOZ (XARIDOR):</div>
              <div className="text-slate-500 font-normal">{aktData.client.companyName}</div>
              <div className="mt-8 border-b border-slate-400 w-48"></div>
              <div className="text-[10px] text-slate-400 mt-1">Rahbar / Mas'ul (Imzo va M.O'.)</div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
