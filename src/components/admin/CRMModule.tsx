import React, { useState, useEffect } from 'react';
import { Users, Send } from 'lucide-react';
import { fetchClients, fetchOrders } from '../../services/api';
import { Client, Order } from '../../types';

export const CRMModule: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [broadcastMessage, setBroadcastMessage] = useState(
    'Hurmatli mijoz! Dam olish kunlari barcha mevalarga -20% chegirma!'
  );
  const [broadcastSegment, setBroadcastSegment] = useState('all');

  useEffect(() => {
    Promise.all([fetchClients(), fetchOrders()]).then(([cls, ords]) => {
      setClients(cls);
      setOrders(ords);
    });
  }, []);

  const totalClients = clients.length;
  const vipClientsCount = clients.filter((c) => (c.creditLimit || 0) >= 30000000).length;
  const atRiskCount = clients.filter((c) => (c.currentDebt || 0) > (c.creditLimit || 0) * 0.8).length;
  const totalDebtBalance = clients.reduce((sum, c) => sum + (c.currentDebt || 0), 0);

  const customerRows = clients.map((c) => {
    const clientOrders = orders.filter(
      (o) => o.customerId === c.id || o.customerName === c.companyName || o.customerName === c.contactName
    );
    const orderCount = clientOrders.length;
    const spent = clientOrders.reduce((sum, o) => sum + o.finalTotal, 0);

    let tier = 'Bronze';
    if (spent > 5000000 || c.creditLimit >= 50000000) tier = 'VIP Platinum';
    else if (spent > 2000000 || c.creditLimit >= 30000000) tier = 'VIP Gold';
    else if (spent > 500000 || c.creditLimit >= 15000000) tier = 'VIP Silver';

    const status = (c.currentDebt || 0) > (c.creditLimit || 1) ? 'At-Risk' : 'Active';

    return {
      id: c.id,
      name: c.companyName || c.contactName,
      contact: c.contactName,
      phone: c.phone,
      tier,
      orders: orderCount,
      spent,
      debt: c.currentDebt || 0,
      status,
    };
  });

  const handleSendBroadcast = () => {
    alert(`Telegram Broadcast xabari (${broadcastSegment} segmenti) yuborildi!`);
  };

  return (
    <div className="space-y-6">
      {/* CRM Overview Cards */}
      <div className="grid grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-lg">
          <span className="text-slate-400">Jami Mijozlar Baza</span>
          <h3 className="text-xl font-extrabold text-slate-100">{totalClients} ta</h3>
          <span className="text-[10px] text-emerald-400">Real B2B mijozlar</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-lg">
          <span className="text-slate-400">VIP Mijozlar (Gold & Platinum)</span>
          <h3 className="text-xl font-extrabold text-amber-400">{vipClientsCount} ta</h3>
          <span className="text-[10px] text-slate-400">Yuqori kredit limitli</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-lg">
          <span className="text-slate-400">Ketish xavfida (At-Risk)</span>
          <h3 className="text-xl font-extrabold text-rose-400">{atRiskCount} ta</h3>
          <span className="text-[10px] text-rose-400">Limitga yaqin qarzlar</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-lg">
          <span className="text-slate-400">Jami Nasiya Balansi</span>
          <h3 className="text-xl font-extrabold text-emerald-400">{totalDebtBalance.toLocaleString()} UZS</h3>
          <span className="text-[10px] text-slate-400">Mijozlar qarzi summasi</span>
        </div>
      </div>

      {/* Broadcast Sender & Customer Table */}
      <div className="grid grid-cols-3 gap-6">
        {/* Customer Table */}
        <div className="col-span-2 bg-slate-900 border border-slate-800 rounded-2xl p-4 space-y-3 shadow-xl">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Users className="w-4 h-4 text-sky-400" />
            <span>Mijozlar va Sadoqat (Loyalty) Tizimi</span>
          </h3>

          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs text-slate-300">
              <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px]">
                <tr>
                  <th className="p-2.5">Mijoz</th>
                  <th className="p-2.5">Daraja (Tier)</th>
                  <th className="p-2.5">Buyurtmalar</th>
                  <th className="p-2.5">Jami Xarid</th>
                  <th className="p-2.5">Qarzdorlik</th>
                  <th className="p-2.5">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {customerRows.map((c) => (
                  <tr key={c.id} className="hover:bg-slate-800/40">
                    <td className="p-2.5">
                      <span className="font-semibold text-slate-100 block">{c.name}</span>
                      <span className="text-[10px] text-slate-500">{c.phone}</span>
                    </td>

                    <td className="p-2.5">
                      <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 px-2 py-0.5 rounded text-[10px] font-bold">
                        {c.tier}
                      </span>
                    </td>

                    <td className="p-2.5 font-bold">{c.orders} ta</td>

                    <td className="p-2.5 text-emerald-400 font-mono">
                      {c.spent.toLocaleString()} UZS
                    </td>

                    <td className="p-2.5 text-rose-400 font-mono">
                      {c.debt.toLocaleString()} UZS
                    </td>

                    <td className="p-2.5">
                      <span
                        className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          c.status === 'Active'
                            ? 'bg-emerald-500/10 text-emerald-400'
                            : 'bg-rose-500/10 text-rose-400'
                        }`}
                      >
                        {c.status}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Telegram Broadcast Campaign Form */}
        <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl flex flex-col justify-between">
          <div className="space-y-3 text-xs">
            <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
              <Send className="w-4 h-4 text-emerald-400" />
              <span>Mass Telegram Broadcast</span>
            </h3>

            <div>
              <label className="text-slate-400 block mb-1">Auditoriya Segmenti:</label>
              <select
                value={broadcastSegment}
                onChange={(e) => setBroadcastSegment(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 p-2.5 rounded-xl border border-slate-700"
              >
                <option value="all">Barcha Telegram foydalanuvchilar ({totalClients})</option>
                <option value="vip">Faqat VIP Gold & Platinum ({vipClientsCount})</option>
                <option value="at_risk">Ketish xavfidagilar ({atRiskCount})</option>
              </select>
            </div>

            <div>
              <label className="text-slate-400 block mb-1">Xabar Matni:</label>
              <textarea
                rows={4}
                value={broadcastMessage}
                onChange={(e) => setBroadcastMessage(e.target.value)}
                className="w-full bg-slate-950 text-slate-100 p-2.5 rounded-xl border border-slate-700 leading-relaxed font-sans"
              ></textarea>
            </div>

            <button
              onClick={handleSendBroadcast}
              className="w-full bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold py-2.5 rounded-xl shadow-lg transition-all flex items-center justify-center gap-1.5"
            >
              <Send className="w-4 h-4" />
              <span>Xabarni Telegram orqali Yuborish</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
