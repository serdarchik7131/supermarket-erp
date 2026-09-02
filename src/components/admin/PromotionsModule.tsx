import React, { useState, useEffect } from 'react';
import { Tag, Plus, Calendar, CheckCircle2, XCircle, Edit, Trash2, Search, ToggleLeft, ToggleRight, Sparkles } from 'lucide-react';
import { Promotion } from '../../types';
import { fetchPromotions, createPromotion, updatePromotion, deletePromotion, togglePromotionStatus } from '../../services/api';

export const PromotionsModule: React.FC = () => {
  const [promotions, setPromotions] = useState<Promotion[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingPromo, setEditingPromo] = useState<Promotion | null>(null);

  const [formState, setFormState] = useState({
    title: '',
    code: '',
    discountType: 'percent' as 'percent' | 'fixed',
    discountValue: 10,
    minOrderAmount: 100000,
    startDate: new Date().toISOString().split('T')[0],
    endDate: '2026-12-31',
    description: '',
    active: true,
  });

  const loadPromotions = async () => {
    try {
      const p = await fetchPromotions();
      setPromotions(p);
    } catch (e) {
      console.error('Failed to load promotions:', e);
    }
  };

  useEffect(() => {
    loadPromotions();
  }, []);

  const handleOpenAdd = () => {
    setEditingPromo(null);
    setFormState({
      title: '',
      code: '',
      discountType: 'percent',
      discountValue: 10,
      minOrderAmount: 100000,
      startDate: new Date().toISOString().split('T')[0],
      endDate: '2026-12-31',
      description: '',
      active: true,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (p: Promotion) => {
    setEditingPromo(p);
    setFormState({
      title: p.title,
      code: p.code,
      discountType: p.discountType,
      discountValue: p.discountValue,
      minOrderAmount: p.minOrderAmount || 0,
      startDate: p.startDate || new Date().toISOString().split('T')[0],
      endDate: p.endDate || '2026-12-31',
      description: p.description || '',
      active: p.active !== false,
    });
    setShowModal(true);
  };

  const handleSavePromo = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formState.title || !formState.code) return;

    if (editingPromo) {
      const updated = await updatePromotion(editingPromo.id, formState);
      setPromotions(promotions.map((p) => (p.id === editingPromo.id ? updated : p)));
    } else {
      const created = await createPromotion(formState);
      setPromotions([created, ...promotions]);
    }
    setShowModal(false);
  };

  const handleDelete = async (id: string, title: string) => {
    if (confirm(`"${title}" aksiyasini o'chirishga ishonchingiz komilmi?`)) {
      await deletePromotion(id);
      setPromotions(promotions.filter((p) => p.id !== id));
    }
  };

  const handleToggle = async (id: string) => {
    const updated = await togglePromotionStatus(id);
    setPromotions(promotions.map((p) => (p.id === id ? updated : p)));
  };

  const filteredPromotions = promotions.filter(
    (p) =>
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.code.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-sm flex flex-wrap items-center justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-slate-900 flex items-center gap-2">
            <Tag className="w-6 h-6 text-rose-600" />
            <span>Aksiya va Chegirmalar Boshqaruvi (CRUD)</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Ulgurji B2B va chakana xaridlar uchun aksiyalar, promokodlar va maxsus skidka qoidalarini yarating va boshqaring.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
            <input
              type="text"
              placeholder="Aksiya yoki promokod..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold text-slate-800 focus:outline-none focus:border-rose-600 w-48 md:w-64"
            />
          </div>

          <button
            onClick={handleOpenAdd}
            className="bg-rose-600 hover:bg-rose-700 text-white font-bold px-4 py-2.5 rounded-xl text-xs flex items-center gap-2 shadow-md shadow-rose-600/20 transition-all cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Aksiya Yaratish</span>
          </button>
        </div>
      </div>

      {/* Promos Grid */}
      {filteredPromotions.length === 0 ? (
        <div className="bg-white rounded-2xl border border-slate-200 p-8 text-center space-y-3 shadow-xs">
          <Tag className="w-10 h-10 text-slate-300 mx-auto" />
          <h3 className="font-bold text-slate-700 text-sm">Hozircha aksiyalar topilmadi</h3>
          <p className="text-xs text-slate-500">Yangi aksiya yoki skidka qo'shish uchun tugmani bosing</p>
          <button
            onClick={handleOpenAdd}
            className="inline-flex items-center gap-2 bg-rose-50 text-rose-700 border border-rose-200 font-bold px-4 py-2 rounded-xl text-xs hover:bg-rose-100"
          >
            <Plus className="w-4 h-4" />
            <span>Aksiya yaratish</span>
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredPromotions.map((p) => (
            <div
              key={p.id}
              className={`bg-white p-5 rounded-2xl border shadow-sm space-y-3 relative transition-all ${
                p.active ? 'border-slate-200 hover:border-rose-300' : 'border-slate-200 bg-slate-50/70 opacity-75'
              }`}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-xs font-black bg-rose-100 text-rose-800 px-2.5 py-1 rounded-xl border border-rose-200 flex items-center gap-1">
                  🏷️ {p.code}
                </span>

                <div className="flex items-center gap-1.5">
                  <button
                    onClick={() => handleToggle(p.id)}
                    className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full flex items-center gap-1 cursor-pointer transition-colors ${
                      p.active
                        ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                        : 'bg-slate-200 text-slate-600 hover:bg-slate-300'
                    }`}
                    title="Aktivlik holatini o'zgartirish"
                  >
                    {p.active ? <CheckCircle2 className="w-3 h-3 text-emerald-600" /> : <XCircle className="w-3 h-3 text-slate-500" />}
                    <span>{p.active ? 'Aktiv' : 'Nofaol'}</span>
                  </button>
                </div>
              </div>

              <div>
                <h3 className="font-extrabold text-slate-900 text-sm">{p.title}</h3>
                {p.description && <p className="text-xs text-slate-500 mt-1 line-clamp-2">{p.description}</p>}
              </div>

              <div className="bg-slate-50 p-3 rounded-xl border border-slate-100 text-xs space-y-1.5">
                <div className="flex justify-between items-center">
                  <span className="text-slate-600 font-medium">Chegirma:</span>
                  <span className="font-black text-rose-700 text-sm">
                    {p.discountType === 'percent' ? `${p.discountValue}%` : `${p.discountValue.toLocaleString()} UZS`}
                  </span>
                </div>
                <div className="flex justify-between items-center text-[11px]">
                  <span className="text-slate-500">Min. buyurtma:</span>
                  <span className="font-bold text-slate-800">{p.minOrderAmount ? `${p.minOrderAmount.toLocaleString()} UZS` : 'Cheklovsiz'}</span>
                </div>
              </div>

              <div className="flex items-center justify-between text-[11px] text-slate-400 font-mono pt-2 border-t border-slate-100">
                <div className="flex items-center gap-1.5">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>
                    {p.startDate} — {p.endDate}
                  </span>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleOpenEdit(p)}
                    className="p-1.5 rounded-lg text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="Tahrirlash"
                  >
                    <Edit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(p.id, p.title)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-colors"
                    title="O'chirish"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Add / Edit Promo Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-900 flex items-center gap-2">
                <Tag className="w-5 h-5 text-rose-600" />
                <span>{editingPromo ? "Aksiyani Tahrirlash" : "Yangi Aksiya / Skidka Yaratish"}</span>
              </h3>
              <button
                type="button"
                onClick={() => setShowModal(false)}
                className="text-slate-400 hover:text-slate-600 font-bold text-lg px-2"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSavePromo} className="space-y-3 text-xs">
              <div>
                <label className="block text-slate-600 font-bold mb-1">Aksiya Sarlavhasi *</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Yozgi Mega Chegirma -15%"
                  value={formState.title}
                  onChange={(e) => setFormState({ ...formState, title: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Promokod / Kod *</label>
                  <input
                    type="text"
                    required
                    placeholder="SUMMER2026"
                    value={formState.code}
                    onChange={(e) => setFormState({ ...formState, code: e.target.value.toUpperCase() })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-mono font-bold focus:outline-none focus:border-rose-600 uppercase"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Chegirma Turi *</label>
                  <select
                    value={formState.discountType}
                    onChange={(e) => setFormState({ ...formState, discountType: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-rose-600"
                  >
                    <option value="percent">Foiz (%) Chegirma</option>
                    <option value="fixed">Aniq Summa (UZS) Chegirma</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Chegirma Qiymati *</label>
                  <input
                    type="number"
                    required
                    min="1"
                    value={formState.discountValue}
                    onChange={(e) => setFormState({ ...formState, discountValue: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-black text-rose-700 focus:outline-none focus:border-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Min. Buyurtma Summasi (UZS)</label>
                  <input
                    type="number"
                    value={formState.minOrderAmount}
                    onChange={(e) => setFormState({ ...formState, minOrderAmount: Number(e.target.value) })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-600 font-bold mb-1">Boshlanish Sanasi</label>
                  <input
                    type="date"
                    value={formState.startDate}
                    onChange={(e) => setFormState({ ...formState, startDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-rose-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-600 font-bold mb-1">Tugash Sanasi</label>
                  <input
                    type="date"
                    value={formState.endDate}
                    onChange={(e) => setFormState({ ...formState, endDate: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-rose-600"
                  />
                </div>
              </div>

              <div>
                <label className="block text-slate-600 font-bold mb-1">Aksiya Haqida Izoh / Tavsif</label>
                <textarea
                  rows={2}
                  placeholder="Shartlar yoki qo'shimcha ma'lumotlar..."
                  value={formState.description}
                  onChange={(e) => setFormState({ ...formState, description: e.target.value })}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 text-slate-900 font-medium focus:outline-none focus:border-rose-600"
                />
              </div>

              <div className="flex items-center gap-2 pt-1">
                <input
                  type="checkbox"
                  id="promoActive"
                  checked={formState.active}
                  onChange={(e) => setFormState({ ...formState, active: e.target.checked })}
                  className="w-4 h-4 text-rose-600 rounded border-slate-300 focus:ring-rose-500"
                />
                <label htmlFor="promoActive" className="font-bold text-slate-800 text-xs cursor-pointer">
                  Aksiya darhol aktiv holatga o'tsin
                </label>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-200 text-slate-700 font-bold hover:bg-slate-300 cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-rose-600 text-white font-bold hover:bg-rose-700 shadow-md shadow-rose-600/20 cursor-pointer"
                >
                  {editingPromo ? "Saqlash" : "Aksiyani Yaratish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
