import React, { useState, useEffect } from 'react';
import { Wallet, Plus, Calendar, ArrowDownRight, CreditCard, Building2, CheckCircle2, Search, Filter } from 'lucide-react';
import { PaymentRecord, Client } from '../../types';
import { fetchPayments, createPayment, fetchClients } from '../../services/api';
import { subscribeAppDataSync } from '../../utils/syncManager';

export const PaymentsModule: React.FC = () => {
  const [payments, setPayments] = useState<PaymentRecord[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [startDate, setStartDate] = useState<string>('2026-08-01');
  const [endDate, setEndDate] = useState<string>('2026-08-31');
  const [search, setSearch] = useState('');

  const [showModal, setShowModal] = useState(false);
  const [newPayment, setNewPayment] = useState({
    clientId: '',
    amount: 1000000,
    paymentMethod: 'bank_transfer' as 'cash' | 'bank_transfer' | 'click' | 'payme',
    referenceNo: '',
    notes: '',
  });

  useEffect(() => {
    fetchClients().then((cls) => {
      setClients(cls);
      if (cls.length > 0) {
        setNewPayment((prev) => ({ ...prev, clientId: cls[0].id }));
      }
    });
  }, []);

  useEffect(() => {
    loadPayments();
    const unsub = subscribeAppDataSync(() => {
      loadPayments();
    });
    const interval = setInterval(() => {
      loadPayments();
    }, 6000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, [startDate, endDate]);

  const loadPayments = async () => {
    const data = await fetchPayments(startDate, endDate);
    setPayments(data);
  };

  const handleSavePayment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newPayment.clientId || newPayment.amount <= 0) return;

    const clientObj = clients.find((c) => c.id === newPayment.clientId);
    const created = await createPayment({
      ...newPayment,
      clientName: clientObj?.companyName || 'Mijoz',
    });

    setPayments([created, ...payments]);
    setShowModal(false);
    setNewPayment({
      clientId: clients[0]?.id || '',
      amount: 1000000,
      paymentMethod: 'bank_transfer',
      referenceNo: '',
      notes: '',
    });
  };

  const filteredPayments = payments.filter(
    (p) =>
      p.clientName.toLowerCase().includes(search.toLowerCase()) ||
      p.paymentNumber.toLowerCase().includes(search.toLowerCase()) ||
      p.referenceNo.toLowerCase().includes(search.toLowerCase())
  );

  const totalCollected = filteredPayments.reduce((sum, p) => sum + p.amount, 0);

  return (
    <div className="space-y-2 text-xs font-sans">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-2 rounded-lg border border-slate-300 shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 rounded bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold">
            <Wallet className="w-4 h-4" />
          </div>
          <div>
            <h2 className="text-xs font-black text-slate-900 flex items-center gap-1.5">
              <span>Kassa va To'lovlar (Tradeuz SFA)</span>
            </h2>
            <p className="text-[10px] text-slate-500">
              B2B do'konlardan kelgan barcha to'lovlarni kiritish va kassa kirimlarini boshqarish
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="text-[11px] font-bold text-slate-700 bg-emerald-50 border border-emerald-300 px-2.5 py-1 rounded">
            Jami Kirim: <span className="text-emerald-700 font-extrabold">{totalCollected.toLocaleString('ru-RU')} SUM</span>
          </div>

          <button
            onClick={() => setShowModal(true)}
            className="bg-[#22c55e] hover:bg-green-600 text-white font-bold px-3 py-1 rounded text-[11px] flex items-center gap-1 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Yangi To'lov Kiritish</span>
          </button>
        </div>
      </div>

      {/* Date Filter & Search */}
      <div className="bg-slate-200/70 p-1.5 rounded-lg border border-slate-300 flex flex-wrap items-center justify-between gap-2">
        <div className="flex items-center gap-2 flex-1 min-w-[240px]">
          <Search className="w-3.5 h-3.5 text-slate-400 ml-1" />
          <input
            type="text"
            placeholder="To'lov raqami, mijoz nomi bo'yicha qidirish..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full bg-white border border-slate-300 text-slate-900 px-2 py-1 rounded text-[11px] focus:outline-none focus:border-blue-500 font-medium placeholder:text-slate-400"
          />
        </div>

        <div className="flex items-center gap-1.5 text-[11px] text-slate-700 font-medium">
          <Calendar className="w-3.5 h-3.5 text-blue-600" />
          <span>Sana:</span>
          <input
            type="date"
            value={startDate}
            onChange={(e) => setStartDate(e.target.value)}
            className="bg-white border border-slate-300 text-slate-900 px-1.5 py-0.5 rounded focus:outline-none"
          />
          <span>—</span>
          <input
            type="date"
            value={endDate}
            onChange={(e) => setEndDate(e.target.value)}
            className="bg-white border border-slate-300 text-slate-900 px-1.5 py-0.5 rounded focus:outline-none"
          />
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-white border border-slate-300 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-[#24275f] text-white font-semibold border-b border-indigo-900">
              <tr>
                <th className="p-1.5 border-r border-indigo-900 font-mono">To'lov #</th>
                <th className="p-1.5 border-r border-indigo-900">Mijoz (Tashkilot Nomi)</th>
                <th className="p-1.5 border-r border-indigo-900">To'lov Turi</th>
                <th className="p-1.5 border-r border-indigo-900">Topshiriqnoma / Hujjat #</th>
                <th className="p-1.5 border-r border-indigo-900 text-right">Kirim Summasi</th>
                <th className="p-1.5 border-r border-indigo-900">Sana & Vaqt</th>
                <th className="p-1.5 text-left">Mas'ul Xodim</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {filteredPayments.map((p) => (
                <tr key={p.id} className="hover:bg-blue-50/70 transition-colors even:bg-slate-50/50">
                  <td className="p-1.5 border-r border-slate-200 font-mono font-bold text-blue-700">
                    {p.paymentNumber}
                  </td>
                  <td className="p-1.5 border-r border-slate-200 font-bold text-slate-900">
                    {p.clientName}
                  </td>
                  <td className="p-1.5 border-r border-slate-200">
                    <span className="bg-slate-100 text-slate-800 px-1.5 py-0.5 rounded border border-slate-200 font-semibold text-[10px]">
                      {p.paymentMethod === 'bank_transfer'
                        ? '🏛️ Перечисление'
                        : p.paymentMethod === 'cash'
                        ? '💵 Naqd'
                        : '💳 Click / Payme'}
                    </span>
                  </td>
                  <td className="p-1.5 border-r border-slate-200 font-mono text-slate-700">
                    {p.referenceNo || '—'}
                  </td>
                  <td className="p-1.5 border-r border-slate-200 font-black text-emerald-700 text-right whitespace-nowrap">
                    +{p.amount.toLocaleString('ru-RU')} SUM
                  </td>
                  <td className="p-1.5 border-r border-slate-200 text-slate-600 whitespace-nowrap">
                    {new Date(p.date).toLocaleDateString('ru-RU', { day: '2-digit', month: 'short' })}{' '}
                    {new Date(p.date).toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' })}
                  </td>
                  <td className="p-1.5 text-slate-700 font-medium">
                    {p.createdBy}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add New Payment Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Wallet className="w-5 h-5 text-rose-600" />
              <span>Yangi Oplata (Kassa Kirim) Kiritish</span>
            </h3>

            <form onSubmit={handleSavePayment} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">1. Mijozni Tanlang *</label>
                <select
                  value={newPayment.clientId}
                  onChange={(e) => setNewPayment({ ...newPayment, clientId: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-rose-600"
                >
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.companyName} (Joriy qarz: {c.currentDebt.toLocaleString()} UZS)
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">2. To'lov Summasi (UZS) *</label>
                  <input
                    type="number"
                    required
                    value={newPayment.amount}
                    onChange={(e) => setNewPayment({ ...newPayment, amount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-black text-rose-700 text-sm focus:outline-none focus:border-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">3. To'lov Turi *</label>
                  <select
                    value={newPayment.paymentMethod}
                    onChange={(e) =>
                      setNewPayment({ ...newPayment, paymentMethod: e.target.value as any })
                    }
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-rose-600"
                  >
                    <option value="bank_transfer">🏦 Bank (Perechisleniye)</option>
                    <option value="cash">💵 Naqd Kassa</option>
                    <option value="click">📱 Click / Payme</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">4. Topshiriqnoma / Hujjat #</label>
                <input
                  type="text"
                  placeholder="Masalan: N-88219"
                  value={newPayment.referenceNo}
                  onChange={(e) => setNewPayment({ ...newPayment, referenceNo: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono focus:outline-none focus:border-rose-600"
                />
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">5. Izoh / Kommentariya</label>
                <input
                  type="text"
                  placeholder="Masalan: Aprel oyi nakladnoylari uchun to'lov"
                  value={newPayment.notes}
                  onChange={(e) => setNewPayment({ ...newPayment, notes: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-md shadow-rose-600/20"
                >
                  Kassa Kirimini Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
