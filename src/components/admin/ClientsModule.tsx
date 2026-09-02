import React, { useState, useEffect } from 'react';
import { Users, Plus, Search, Building2, Phone, CreditCard, AlertCircle, CheckCircle2, ShieldAlert, Trash2, Download, Edit2 } from 'lucide-react';
import { Client } from '../../types';
import { fetchClients, createClient, updateClient, deleteClient } from '../../services/api';
import { subscribeAppDataSync } from '../../utils/syncManager';
import { downloadTemplateById } from '../../utils/templateUtils';

export const ClientsModule: React.FC = () => {
  const [clients, setClients] = useState<Client[]>([]);
  const [search, setSearch] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [editingClient, setEditingClient] = useState<Client | null>(null);
  const [newClient, setNewClient] = useState({
    companyName: '',
    inn: '',
    contactName: '',
    phone: '',
    address: '',
    assignedAgentName: 'Jasur Bekmirzayev',
    creditLimit: 30000000,
  });

  const loadData = () => {
    fetchClients().then((data) => setClients(data));
  };

  useEffect(() => {
    loadData();
    const unsub = subscribeAppDataSync(() => {
      loadData();
    });
    const interval = setInterval(() => {
      loadData();
    }, 6000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const handleSaveClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClient.companyName || !newClient.inn) return;
    const created = await createClient(newClient);
    setClients([created, ...clients]);
    setShowAddModal(false);
    setNewClient({
      companyName: '',
      inn: '',
      contactName: '',
      phone: '',
      address: '',
      assignedAgentName: 'Jasur Bekmirzayev',
      creditLimit: 30000000,
    });
  };

  const handleUpdateClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;
    try {
      const updated = await updateClient(editingClient.id, editingClient);
      setClients(clients.map((c) => (c.id === updated.id ? updated : c)));
      setEditingClient(null);
      alert("✅ Mijoz ma'lumotlari va kredit limiti saqlandi!");
    } catch (err) {
      alert("Xatolik yuz berdi!");
    }
  };

  const filteredClients = clients.filter(
    (c) =>
      c.companyName.toLowerCase().includes(search.toLowerCase()) ||
      c.inn.includes(search) ||
      c.contactName.toLowerCase().includes(search.toLowerCase()) ||
      c.phone.includes(search)
  );

  const totalDebtSum = clients.reduce((sum, c) => sum + c.currentDebt, 0);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Users className="w-6 h-6 text-rose-600" />
            <span>B2B Mijozlar Baza va Profillar</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Distributsiya mijozlari, INN, mas'ul agentlar va qarz limitlari ro'yxati.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => downloadTemplateById('clients')}
            className="bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-extrabold px-3.5 py-2.5 rounded-xl text-xs flex items-center gap-2 transition-all cursor-pointer"
            title="Mijozlar import shablonini yuklab olish (.csv)"
          >
            <Download className="w-4 h-4" />
            <span>Import Shablon (.CSV)</span>
          </button>

          <button
            onClick={() => setShowAddModal(true)}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi B2B Mijoz Qo'shish</span>
          </button>
        </div>
      </div>

      {/* Debt Summary Banner */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="bg-white p-4 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-slate-100 flex items-center justify-center text-slate-700 font-bold text-lg">
            🏢
          </div>
          <div>
            <div className="text-xs text-slate-500 font-medium">Jami B2B Mijozlar</div>
            <div className="text-xl font-black text-slate-900">{clients.length} ta do'kon</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-rose-200 bg-rose-50/30 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-rose-100 text-rose-700 flex items-center justify-center font-bold text-lg">
            ⚠️
          </div>
          <div>
            <div className="text-xs text-rose-700 font-medium">Umumiy Nasiya Qarz Balansi</div>
            <div className="text-xl font-black text-rose-700">{totalDebtSum.toLocaleString()} UZS</div>
          </div>
        </div>

        <div className="bg-white p-4 rounded-2xl border border-emerald-200 bg-emerald-50/30 shadow-sm flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-100 text-emerald-700 flex items-center justify-center font-bold text-lg">
            ✅
          </div>
          <div>
            <div className="text-xs text-emerald-700 font-medium">Faol Shartnomalar</div>
            <div className="text-xl font-black text-emerald-800">100% aktiv</div>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="bg-white p-3 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
        <Search className="w-4 h-4 text-slate-400 ml-2" />
        <input
          type="text"
          placeholder="Mijoz nomi, INN raqami, mas'ul shaxs yoki telefon raqam bo'yicha qidirish..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full bg-transparent text-xs text-slate-800 focus:outline-none placeholder:text-slate-400"
        />
      </div>

      {/* Clients Table */}
      <div className="bg-white rounded-lg border border-slate-300 shadow-xs overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-[11px] border-collapse">
            <thead className="bg-[#24275f] text-white font-semibold border-b border-indigo-900">
              <tr>
                <th className="p-1.5 border-r border-indigo-900">Tashkilot / Do'kon Nomi</th>
                <th className="p-1.5 border-r border-indigo-900 font-mono">STIR (INN)</th>
                <th className="p-1.5 border-r border-indigo-900">Mas'ul Shaxs & Telefon</th>
                <th className="p-1.5 border-r border-indigo-900">Biriktirilgan Agent</th>
                <th className="p-1.5 border-r border-indigo-900 text-right">Kredit Limiti</th>
                <th className="p-1.5 border-r border-indigo-900 text-right">Joriy Qarzdorlik</th>
                <th className="p-1.5 border-r border-indigo-900 text-center">Holat</th>
                <th className="p-1.5 text-right">Amal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {filteredClients.map((client) => (
                <tr key={client.id} className="hover:bg-blue-50/70 transition-colors even:bg-slate-50/50">
                  <td className="p-1.5 border-r border-slate-200 font-bold text-slate-900">
                    <div className="flex items-center gap-1.5">
                      <Building2 className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                      <span>{client.companyName}</span>
                    </div>
                    <div className="text-[10px] text-blue-600 font-normal ml-5">{client.address}</div>
                  </td>
                  <td className="p-1.5 border-r border-slate-200 font-mono font-bold text-slate-700">{client.inn}</td>
                  <td className="p-1.5 border-r border-slate-200">
                    <div className="font-semibold text-slate-900">{client.contactName}</div>
                    <div className="text-[10px] text-slate-500 font-mono">{client.phone}</div>
                  </td>
                  <td className="p-1.5 border-r border-slate-200 text-blue-700 font-bold">{client.assignedAgentName}</td>
                  <td className="p-1.5 border-r border-slate-200 text-right font-bold text-slate-700">
                    {client.creditLimit.toLocaleString('ru-RU')} SUM
                  </td>
                  <td className="p-1.5 border-r border-slate-200 text-right">
                    <span
                      className={`font-black ${
                        client.currentDebt > 0 ? 'text-rose-600' : 'text-emerald-600'
                      }`}
                    >
                      {client.currentDebt.toLocaleString('ru-RU')} SUM
                    </span>
                  </td>
                  <td className="p-1.5 border-r border-slate-200 text-center">
                    <span className="bg-emerald-100 text-emerald-800 px-2 py-0.5 rounded text-[10px] font-bold inline-flex items-center gap-1">
                      <CheckCircle2 className="w-3 h-3" />
                      Aktiv
                    </span>
                  </td>
                  <td className="p-1.5 text-right">
                    <div className="flex items-center justify-end gap-1">
                      <button
                        onClick={() => setEditingClient(client)}
                        className="p-1 text-blue-600 hover:text-blue-900 bg-blue-50 hover:bg-blue-100 rounded border border-blue-200 cursor-pointer"
                        title="Tahrirlash va Limit Sozlash"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={async () => {
                          if (confirm(`"${client.companyName}" do'konini o'chirishga ishonchingiz komilmi?`)) {
                            await deleteClient(client.id);
                            setClients((prev) => prev.filter((c) => c.id !== client.id));
                          }
                        }}
                        className="p-1 text-rose-600 hover:text-rose-900 bg-rose-50 hover:bg-rose-100 rounded border border-rose-200 cursor-pointer"
                        title="Mijozni O'chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Add Client Modal */}
      {showAddModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <Building2 className="w-5 h-5 text-rose-600" />
              <span>Yangi B2B Mijoz Ro'yxatdan O'tkazish</span>
            </h3>

            <form onSubmit={handleSaveClient} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Tashkilot / Do'kon Nomi *</label>
                <input
                  type="text"
                  required
                  placeholder='"Oasis Supermarket" MCHJ'
                  value={newClient.companyName}
                  onChange={(e) => setNewClient({ ...newClient, companyName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-rose-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">STIR (INN) Raqami *</label>
                  <input
                    type="text"
                    required
                    placeholder="305912481"
                    value={newClient.inn}
                    onChange={(e) => setNewClient({ ...newClient, inn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-rose-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Mas'ul Shaxs Nomi</label>
                  <input
                    type="text"
                    placeholder="Dilshod Raximov"
                    value={newClient.contactName}
                    onChange={(e) => setNewClient({ ...newClient, contactName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Telefon Raqam *</label>
                  <input
                    type="text"
                    required
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-rose-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Kredit Limiti (UZS)</label>
                  <input
                    type="number"
                    value={newClient.creditLimit}
                    onChange={(e) => setNewClient({ ...newClient, creditLimit: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-rose-600 font-bold text-rose-700"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Do'kon Manzili</label>
                <input
                  type="text"
                  placeholder="Toshkent sh., Yunusobod 4-mavze, 12-uy"
                  value={newClient.address}
                  onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-md shadow-rose-600/20"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Client & Credit Limit Modal */}
      {editingClient && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
              <CreditCard className="w-5 h-5 text-blue-600" />
              <span>B2B Mijoz Profilini Tahrirlash & Limit Sozlash</span>
            </h3>

            <form onSubmit={handleUpdateClient} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Tashkilot / Do'kon Nomi *</label>
                <input
                  type="text"
                  required
                  value={editingClient.companyName}
                  onChange={(e) => setEditingClient({ ...editingClient, companyName: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">STIR (INN) Raqami *</label>
                  <input
                    type="text"
                    required
                    value={editingClient.inn}
                    onChange={(e) => setEditingClient({ ...editingClient, inn: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Mas'ul Shaxs Nomi</label>
                  <input
                    type="text"
                    value={editingClient.contactName}
                    onChange={(e) => setEditingClient({ ...editingClient, contactName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Telefon Raqam *</label>
                  <input
                    type="text"
                    required
                    value={editingClient.phone}
                    onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 font-mono"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Biriktirilgan Agent</label>
                  <input
                    type="text"
                    value={editingClient.assignedAgentName}
                    onChange={(e) => setEditingClient({ ...editingClient, assignedAgentName: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 font-bold text-blue-700"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 bg-blue-50 p-3 rounded-2xl border border-blue-200">
                <div>
                  <label className="block text-blue-900 font-extrabold mb-1">Kredit Limiti (UZS) *</label>
                  <input
                    type="number"
                    required
                    value={editingClient.creditLimit}
                    onChange={(e) => setEditingClient({ ...editingClient, creditLimit: Number(e.target.value) })}
                    className="w-full bg-white border border-blue-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 font-black text-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-blue-900 font-extrabold mb-1">Joriy Qarzdorlik (UZS)</label>
                  <input
                    type="number"
                    value={editingClient.currentDebt}
                    onChange={(e) => setEditingClient({ ...editingClient, currentDebt: Number(e.target.value) })}
                    className="w-full bg-white border border-blue-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600 font-black text-slate-800"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Do'kon Manzili</label>
                <input
                  type="text"
                  value={editingClient.address}
                  onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 focus:outline-none focus:border-blue-600"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 shadow-md shadow-blue-600/20 cursor-pointer"
                >
                  O'zgarishlarni Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
