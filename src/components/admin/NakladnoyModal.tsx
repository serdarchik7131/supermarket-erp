import React, { useState } from 'react';
import { Printer, Download, X, CheckCircle, Truck, Building2, User, Phone, MapPin, FileText, Stamp, Edit } from 'lucide-react';
import { Order, OrderStatus } from '../../types';
import { printElementById } from '../../utils/printUtils';
import { exportToExcel } from '../../utils/excelUtils';

interface NakladnoyModalProps {
  order: Order;
  onClose: () => void;
  onStatusChange?: (orderId: string, status: OrderStatus) => void;
  onEditOrder?: (order: Order) => void;
}

export const NakladnoyModal: React.FC<NakladnoyModalProps> = ({
  order,
  onClose,
  onStatusChange,
  onEditOrder,
}) => {
  const [showStamp, setShowStamp] = useState(true);

  const totalQuantity = order.items.reduce((sum, item) => sum + item.quantity, 0);

  const handlePrint = () => {
    printElementById('printable-nakladnoy-document', `Nakladnoy_${order.orderNumber}`);
  };

  const handleExcelExport = () => {
    exportToExcel({
      filename: `Yuk_Nakladnosi_${order.orderNumber}`,
      title: `TRADEUZ SFA — YUK NAKLADNOSI № ${order.orderNumber}`,
      subtitle: `Mijoz: ${order.customerName} (${order.customerPhone}) | Manzil: ${order.deliveryAddress?.address || '-'} | Agent: ${order.agentName || 'Tizim'}`,
      columns: [
        { header: '№', key: 'idx', align: 'center' },
        { header: 'Shtrixkod', key: 'barcode', align: 'center' },
        { header: 'Mahsulot Nomi', key: 'productName', align: 'left' },
        { header: 'Birlik', key: 'unit', align: 'center' },
        { header: 'Miqdori', key: 'quantity', align: 'center' },
        { header: 'Birlik Narxi (UZS)', key: 'unitPrice', align: 'right' },
        { header: 'Jami Summa (UZS)', key: 'totalPrice', align: 'right' },
      ],
      data: order.items.map((it, idx) => ({
        idx: idx + 1,
        barcode: it.barcode || '-',
        productName: it.productName,
        unit: 'dona',
        quantity: it.quantity,
        unitPrice: it.unitPrice.toLocaleString('uz-UZ'),
        totalPrice: it.totalPrice.toLocaleString('uz-UZ'),
      })),
      summary: {
        productName: `JAMI (${order.items.length} tur, ${totalQuantity} dona):`,
        totalPrice: `${order.finalTotal.toLocaleString('uz-UZ')} UZS`,
      },
    });
  };

  const formatPaymentMethod = (method: string) => {
    switch (method) {
      case 'cash':
        return 'Naqd pul';
      case 'bank_transfer':
        return 'Perexod (Bank o\'tkazmasi)';
      case 'card':
        return 'Plastik karta (Terminal)';
      default:
        return method;
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
      <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-3xl flex flex-col max-h-[95vh] my-auto">
        {/* Modal Top Control Bar (Hidden when printing) */}
        <div className="no-print p-3 bg-slate-900 text-white rounded-t-2xl flex flex-wrap items-center justify-between gap-2 border-b border-slate-800 shrink-0">
          <div className="flex items-center gap-2">
            <FileText className="w-4 h-4 text-amber-400" />
            <span className="font-bold text-xs sm:text-sm">YUK NAKLADNOSI #{order.orderNumber}</span>
            <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-mono uppercase">
              {order.orderStatus}
            </span>
          </div>

          <div className="flex items-center gap-2">
            {onEditOrder && (
              <button
                onClick={() => {
                  onClose();
                  onEditOrder(order);
                }}
                className="px-2.5 py-1 bg-amber-600 hover:bg-amber-500 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 shadow-xs"
              >
                <Edit className="w-3.5 h-3.5" />
                <span>Tahrirlash</span>
              </button>
            )}

            <button
              onClick={() => setShowStamp(!showStamp)}
              className={`px-2.5 py-1 text-[11px] font-medium rounded-lg border transition-all flex items-center gap-1 ${
                showStamp
                  ? 'bg-blue-600/30 text-blue-300 border-blue-500/50'
                  : 'bg-slate-800 text-slate-400 border-slate-700 hover:text-white'
              }`}
            >
              <Stamp className="w-3.5 h-3.5" />
              <span>M.P. Muhr</span>
            </button>

            <button
              onClick={handleExcelExport}
              className="px-2.5 py-1 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 shadow-xs"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white font-bold text-[11px] rounded-lg transition-all flex items-center gap-1 shadow-xs"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Chop etish</span>
            </button>

            <button
              onClick={onClose}
              className="p-1 hover:bg-slate-800 text-slate-400 hover:text-white rounded-lg transition-colors ml-1"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* PRINTABLE COMPACT NAKLADNOY CONTAINER */}
        <div className="p-4 sm:p-6 overflow-y-auto space-y-4 font-sans text-slate-900 bg-white" id="printable-nakladnoy-document">
          {/* Header Banner */}
          <div className="border-b-2 border-slate-900 pb-3 flex flex-wrap justify-between items-start gap-4">
            <div>
              <div className="flex items-center gap-2">
                <div className="w-7 h-7 bg-[#24275f] text-white rounded-lg flex items-center justify-center font-black text-xs tracking-tighter">
                  TZ
                </div>
                <h2 className="text-base font-black text-[#24275f] tracking-tight uppercase">
                  TRADEUZ SFA DISTRIBUTION LLC
                </h2>
              </div>
              <p className="text-[10px] text-slate-500 font-bold mt-0.5">
                Ulgurji savdo va logistika distributsiya markazi | STIR: 308291042
              </p>
              <p className="text-[10px] text-slate-500">
                Manzil: Toshkent sh., Sergeli tumani, Sanoat zonasi 4A | Tel: +998 (71) 200-55-99
              </p>
            </div>

            <div className="text-right border-l-2 border-amber-500 pl-3">
              <div className="text-xs font-black uppercase text-slate-500 tracking-wider">YUK XATI-NAKLADNOY</div>
              <div className="text-lg font-black text-blue-950 font-mono tracking-tight">№ {order.orderNumber}</div>
              <div className="text-[10px] font-mono text-slate-600 mt-0.5">
                Sana: {new Date(order.createdAt).toLocaleDateString('uz-UZ')} {new Date(order.createdAt).toLocaleTimeString('uz-UZ', { hour: '2-digit', minute: '2-digit' })}
              </div>
            </div>
          </div>

          {/* Supplier & Recipient Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 bg-slate-50 p-3 rounded-xl border border-slate-300 text-[11px] leading-tight">
            {/* Sender / Warehouse */}
            <div className="space-y-1">
              <div className="text-[10px] font-black text-[#24275f] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1">
                <Building2 className="w-3 h-3 text-blue-600" />
                <span>YUK TOPSHIRUVCHI (OMBOR):</span>
              </div>
              <div><span className="text-slate-500">Tashkilot:</span> <strong>TRADEUZ Toshkent Markaziy Ombor</strong></div>
              <div><span className="text-slate-500">Omborchi / Mas'ul:</span> <strong>Sardor Raximov</strong></div>
              <div><span className="text-slate-500">Savdo Agenti:</span> <strong>{order.agentName || 'Tizim Agenti'}</strong></div>
              <div><span className="text-slate-500">Yetkazib beruvchi / Kuryer:</span> <strong>{(order as any).delivererName || 'Biriktirilmagan'}</strong></div>
            </div>

            {/* Recipient / Customer */}
            <div className="space-y-1">
              <div className="text-[10px] font-black text-[#24275f] uppercase tracking-wider border-b border-slate-200 pb-1 flex items-center gap-1">
                <User className="w-3 h-3 text-emerald-600" />
                <span>YUK OLUVCHI (MIJOZ / DO'KON):</span>
              </div>
              <div><span className="text-slate-500">Mijoz Nomi:</span> <strong className="text-blue-900 text-xs">{order.customerName}</strong></div>
              <div><span className="text-slate-500">Telefon:</span> <strong className="font-mono">{order.customerPhone}</strong></div>
              <div><span className="text-slate-500">Yetkazish Manzili:</span> <strong>{order.deliveryAddress?.address || 'Do\'kon manzili'}</strong></div>
              <div>
                <span className="text-slate-500">To'lov Turi:</span>{' '}
                <strong className="text-emerald-700 uppercase bg-emerald-50 px-1.5 py-0.5 rounded border border-emerald-200">
                  {formatPaymentMethod(order.paymentMethod)}
                </strong>
              </div>
            </div>
          </div>

          {/* Status selector (Only in UI modal, hidden in print if status control option) */}
          {onStatusChange && (
            <div className="no-print bg-blue-50/70 p-2.5 rounded-xl border border-blue-200 flex flex-wrap items-center justify-between gap-2 text-xs">
              <div className="font-bold text-blue-950 flex items-center gap-1.5">
                <Truck className="w-4 h-4 text-blue-600" />
                <span>Buyurtma Statusini O'zgartirish:</span>
              </div>
              <select
                value={order.orderStatus}
                onChange={(e) => onStatusChange(order.id, e.target.value as OrderStatus)}
                className="font-bold text-xs p-1.5 rounded-lg border border-blue-300 bg-white text-slate-900 focus:ring-2 focus:ring-blue-500 outline-none"
              >
                <option value="pending">🆕 Yangi (Kutilmoqda)</option>
                <option value="assembling">📦 Ombor yig'moqda</option>
                <option value="in_delivery">🚚 Kuryer yetkazmoqda</option>
                <option value="delivered">✅ Muvaffaqiyatli yetkazildi</option>
                <option value="cancelled">❌ Bekor qilindi</option>
              </select>
            </div>
          )}

          {/* Compact Product Items Table */}
          <div className="border border-slate-300 rounded-lg overflow-hidden shadow-2xs">
            <table className="w-full text-left text-[11px] border-collapse">
              <thead>
                <tr className="bg-[#24275f] text-white font-bold uppercase text-[9.5px] tracking-wider">
                  <th className="p-2 border-r border-indigo-900 text-center w-8">№</th>
                  <th className="p-2 border-r border-indigo-900 w-28">Shtrixkod</th>
                  <th className="p-2 border-r border-indigo-900">Mahsulot Nomi va Tavsifi</th>
                  <th className="p-2 border-r border-indigo-900 text-center w-16">Birlik</th>
                  <th className="p-2 border-r border-indigo-900 text-center w-16">Miqdori</th>
                  <th className="p-2 border-r border-indigo-900 text-right w-24">Narxi (UZS)</th>
                  <th className="p-2 text-right w-28">Jami (UZS)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 text-slate-800 font-medium">
                {order.items.map((it, idx) => (
                  <tr key={idx} className={idx % 2 === 0 ? 'bg-white' : 'bg-slate-50/60'}>
                    <td className="p-1.5 text-center font-bold border-r border-slate-200 text-slate-500">{idx + 1}</td>
                    <td className="p-1.5 font-mono text-[10px] text-slate-600 border-r border-slate-200">{it.barcode || '-'}</td>
                    <td className="p-1.5 font-bold text-slate-900 border-r border-slate-200">{it.productName}</td>
                    <td className="p-1.5 text-center text-slate-600 border-r border-slate-200">dona</td>
                    <td className="p-1.5 text-center font-extrabold bg-amber-50/80 text-amber-900 border-r border-slate-200">{it.quantity}</td>
                    <td className="p-1.5 text-right font-mono border-r border-slate-200">{it.unitPrice.toLocaleString('uz-UZ')}</td>
                    <td className="p-1.5 text-right font-black font-mono text-slate-900">{it.totalPrice.toLocaleString('uz-UZ')}</td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-slate-100 border-t-2 border-slate-300 font-bold text-[11px] text-slate-900">
                  <td colSpan={4} className="p-2 text-right uppercase font-black text-slate-700">
                    JAMI ({order.items.length} pozitsiya):
                  </td>
                  <td className="p-2 text-center font-black bg-amber-100 text-amber-950">{totalQuantity} dona</td>
                  <td className="p-2 text-right text-slate-500">Yakuniy:</td>
                  <td className="p-2 text-right font-black text-xs text-blue-950 font-mono">
                    {order.finalTotal.toLocaleString('uz-UZ')} UZS
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>

          {/* Totals Summary Card & Verbal Text */}
          <div className="bg-slate-50 p-3 rounded-xl border border-slate-300 flex flex-wrap justify-between items-center gap-2 text-xs">
            <div>
              <div className="text-[10px] text-slate-500 uppercase font-bold">Summa so'z bilan (Verbal):</div>
              <div className="font-bold text-slate-800 italic mt-0.5">
                "{order.finalTotal.toLocaleString('uz-UZ')} (so'm) nol tiyin"
              </div>
            </div>

            <div className="text-right">
              <span className="text-[10px] text-slate-500 font-bold uppercase block">JAMI TO'LANADIGAN SUMMA:</span>
              <span className="text-base font-black text-rose-700 font-mono">{order.finalTotal.toLocaleString('uz-UZ')} UZS</span>
            </div>
          </div>

          {/* Signatures & Official Stamp Block */}
          <div className="pt-2 border-t border-slate-300 grid grid-cols-2 gap-6 text-[11px] relative">
            {/* Sender Sign */}
            <div className="space-y-4">
              <div className="font-bold text-slate-900">
                Topshirdi (Omborchi / Haydovchi):
              </div>
              <div className="border-b border-slate-400 pb-1 flex justify-between items-end text-slate-500">
                <span>Imzo: ___________________</span>
                <span>/ S. Raximov /</span>
              </div>
            </div>

            {/* Recipient Sign */}
            <div className="space-y-4">
              <div className="font-bold text-slate-900">
                Qabul qildi (Mijoz / Do'kon):
              </div>
              <div className="border-b border-slate-400 pb-1 flex justify-between items-end text-slate-500">
                <span>Imzo: ___________________</span>
                <span>/ M.P. /</span>
              </div>
            </div>

            {/* Optional Decorative Official Seal/Stamp */}
            {showStamp && (
              <div className="absolute right-12 bottom-1 pointer-events-none opacity-80 transform -rotate-12 select-none">
                <div className="w-24 h-24 rounded-full border-2 border-dashed border-blue-600 flex flex-col items-center justify-center p-1 text-center bg-blue-50/20 backdrop-blur-[1px]">
                  <div className="text-[7px] font-black uppercase text-blue-800 tracking-tighter">
                    TRADEUZ SFA DISTRIBUTION
                  </div>
                  <div className="text-[8px] font-black text-blue-900 my-0.5">M.P. / MUHR</div>
                  <div className="text-[6px] font-mono text-blue-700">STIR: 308291042</div>
                  <div className="text-[6px] font-bold text-emerald-700 mt-0.5">TASDIQLANDI</div>
                </div>
              </div>
            )}
          </div>

          {/* Notice Note */}
          <div className="text-[9px] text-slate-400 text-center border-t border-slate-100 pt-2 font-mono">
            Hujjat Tradeuz SFA Avtomatlashtirilgan Tizimida Yaratildi. E'tirozlar yuk topshirilgandan so'ng 24 soat ichida qabul qilinadi.
          </div>
        </div>

        {/* Modal Bottom Action Bar (Hidden when printing) */}
        <div className="no-print p-3 bg-slate-100 border-t border-slate-200 rounded-b-2xl flex justify-between items-center shrink-0">
          <div className="text-xs text-slate-500">
            Pozitsiyalar: <strong className="text-slate-800">{order.items.length} ta</strong> | Jami: <strong className="text-slate-800">{totalQuantity} dona</strong>
          </div>

          <div className="flex gap-2">
            <button
              onClick={handleExcelExport}
              className="px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Download className="w-3.5 h-3.5" />
              <span>Excel</span>
            </button>

            <button
              onClick={handlePrint}
              className="px-4 py-1.5 bg-[#24275f] hover:bg-indigo-900 text-white font-bold rounded-xl text-xs flex items-center gap-1.5 shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Chop etish (Print)</span>
            </button>

            <button
              onClick={onClose}
              className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl text-xs transition-colors"
            >
              Yopish
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
