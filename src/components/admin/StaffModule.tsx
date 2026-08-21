import React, { useState, useEffect } from 'react';
import {
  UserCheck,
  Plus,
  Shield,
  Mail,
  Phone,
  Building2,
  User,
  CheckCircle2,
  Edit3,
  Smartphone,
  Info,
  Trash2,
  Lock as LockIcon,
  KeyRound,
  Layers,
  Tag,
  Percent,
} from 'lucide-react';
import { StaffMember, Category, PriceType } from '../../types';
import { fetchStaff, createStaff, updateStaff, deleteStaff, fetchCategories, fetchPriceTypes } from '../../services/api';

export const StaffModule: React.FC = () => {
  const [staff, setStaff] = useState<StaffMember[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [priceTypes, setPriceTypes] = useState<PriceType[]>([]);
  const [showModal, setShowModal] = useState(false);
  const [editingStaff, setEditingStaff] = useState<StaffMember | null>(null);

  const [formData, setFormData] = useState({
    name: '',
    role: 'sales_agent' as StaffMember['role'],
    phone: '+998 ',
    email: '',
    login: '',
    password: '',
    branchName: 'Toshkent Central Supermarket',
    status: 'active' as StaffMember['status'],
    allowedCategoryIds: [] as string[],
    assignedPriceTypeId: 'optom',
    maxDiscountPercent: 10,
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      const [stData, catData, ptData] = await Promise.all([
        fetchStaff(),
        fetchCategories(),
        fetchPriceTypes(),
      ]);
      setStaff(stData);
      setCategories(catData);
      setPriceTypes(ptData);
    } catch (err) {
      console.error('Error loading staff data:', err);
    }
  };

  const handleOpenAdd = () => {
    setEditingStaff(null);
    setFormData({
      name: '',
      role: 'sales_agent',
      phone: '+998 ',
      email: '',
      login: `agent_${Math.floor(10 + Math.random() * 90)}`,
      password: '123',
      branchName: 'Toshkent Central Supermarket',
      status: 'active',
      allowedCategoryIds: [],
      assignedPriceTypeId: 'optom',
      maxDiscountPercent: 10,
    });
    setShowModal(true);
  };

  const handleOpenEdit = (st: StaffMember) => {
    setEditingStaff(st);
    setFormData({
      name: st.name,
      role: st.role,
      phone: st.phone,
      email: st.email || '',
      login: st.login || `agent_${st.id.slice(-3)}`,
      password: st.password || '123',
      branchName: st.branchName,
      status: st.status,
      allowedCategoryIds: st.permissions?.allowedCategoryIds || [],
      assignedPriceTypeId: st.permissions?.assignedPriceTypeId || 'optom',
      maxDiscountPercent: st.permissions?.maxDiscountPercent || 10,
    });
    setShowModal(true);
  };

  const handleToggleCategoryPermission = (catId: string) => {
    setFormData((prev) => {
      const current = prev.allowedCategoryIds;
      if (current.includes(catId)) {
        return { ...prev, allowedCategoryIds: current.filter((id) => id !== catId) };
      } else {
        return { ...prev, allowedCategoryIds: [...current, catId] };
      }
    });
  };

  const handleSaveStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.name.trim() || !formData.phone.trim()) return;

    const payload: Partial<StaffMember> = {
      name: formData.name,
      role: formData.role,
      phone: formData.phone,
      email: formData.email,
      login: formData.login,
      password: formData.password,
      branchName: formData.branchName,
      status: formData.status,
      permissions: {
        allowedCategoryIds: formData.allowedCategoryIds,
        assignedPriceTypeId: formData.assignedPriceTypeId,
        maxDiscountPercent: formData.maxDiscountPercent,
        canCollectPayments: true,
        canCreateClients: true,
      },
    };

    if (editingStaff) {
      const updated = await updateStaff(editingStaff.id, payload);
      setStaff(staff.map((s) => (s.id === updated.id ? updated : s)));
    } else {
      const created = await createStaff(payload);
      setStaff([created, ...staff]);
    }

    setShowModal(false);
  };

  return (
    <div className="space-y-3 text-xs font-sans p-1">
      {/* Top Header */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white p-3 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-indigo-100 text-indigo-800 flex items-center justify-center font-bold">
            <UserCheck className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900 flex items-center gap-1.5">
              <span>Xodimlar & Agentlar Boshqaruvi (Login, Parol va Cheklovlar)</span>
            </h2>
            <p className="text-[11px] text-slate-500">
              Admin xodimlarga kirish uchun Login va Parol biriktiradi va agentlar ko'rishi mumkin bo'lgan mahsulot kategoriyalarini belgilaydi.
            </p>
          </div>
        </div>

        <button
          onClick={handleOpenAdd}
          className="bg-indigo-600 hover:bg-indigo-700 text-white font-bold px-3.5 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md shadow-indigo-600/20 transition-all"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Xodim Yaratish</span>
        </button>
      </div>

      {/* Staff Table */}
      <div className="bg-white border border-slate-200 rounded-2xl overflow-hidden shadow-sm">
        <table className="w-full text-left text-[11px] border-collapse">
          <thead className="bg-[#24275f] text-white font-extrabold border-b border-indigo-950 uppercase tracking-wider text-[10px]">
            <tr>
              <th className="p-3 border-r border-indigo-900">Xodim F.I.SH.</th>
              <th className="p-3 border-r border-indigo-900">Lavozim / Rol</th>
              <th className="p-3 border-r border-indigo-900 font-mono">Login & Parol</th>
              <th className="p-3 border-r border-indigo-900">Agent Cheklovlari (Kategoriyalar)</th>
              <th className="p-3 border-r border-indigo-900 font-mono">Telefon</th>
              <th className="p-3 border-r border-indigo-900 text-center">Status</th>
              <th className="p-3 text-right">Amal</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 font-medium text-slate-800">
            {staff.map((st) => {
              const allowedCats = st.permissions?.allowedCategoryIds || [];
              const priceType = priceTypes.find((pt) => pt.code === st.permissions?.assignedPriceTypeId);

              return (
                <tr key={st.id} className="hover:bg-indigo-50/50 transition-colors">
                  {/* Name */}
                  <td className="p-3 border-r border-slate-100">
                    <div className="font-extrabold text-slate-900 text-xs">{st.name}</div>
                    <div className="text-[10px] text-slate-400 font-semibold">{st.branchName}</div>
                  </td>

                  {/* Role */}
                  <td className="p-3 border-r border-slate-100">
                    <span
                      className={`px-2 py-0.5 rounded-lg text-[10px] font-extrabold ${
                        st.role === 'super_admin'
                          ? 'bg-rose-100 text-rose-800'
                          : st.role === 'sales_agent'
                          ? 'bg-indigo-100 text-indigo-800'
                          : st.role === 'accountant'
                          ? 'bg-purple-100 text-purple-800'
                          : st.role === 'manager'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-emerald-100 text-emerald-800'
                      }`}
                    >
                      {st.role === 'super_admin'
                        ? 'Super Admin'
                        : st.role === 'sales_agent'
                        ? 'Savdo Agenti'
                        : st.role === 'accountant'
                        ? 'Buhgalter'
                        : st.role === 'manager'
                        ? 'Menejer'
                        : 'Kuryer'}
                    </span>
                  </td>

                  {/* Login & Password */}
                  <td className="p-3 border-r border-slate-100 font-mono">
                    <div className="flex flex-col gap-0.5">
                      <div className="text-indigo-950 font-black flex items-center gap-1">
                        <KeyRound className="w-3 h-3 text-indigo-500" />
                        <span>Login: {st.login || 'admin'}</span>
                      </div>
                      <div className="text-slate-500 text-[10px]">
                        Parol: <span className="font-bold text-slate-800">{st.password || '123'}</span>
                      </div>
                    </div>
                  </td>

                  {/* Permissions & Restrictions */}
                  <td className="p-3 border-r border-slate-100">
                    {st.role === 'sales_agent' ? (
                      <div className="space-y-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="text-[10px] font-bold text-slate-700 bg-slate-100 px-1.5 py-0.5 rounded-md flex items-center gap-1">
                            <Layers className="w-3 h-3 text-indigo-600" />
                            {allowedCats.length === 0
                              ? 'Barcha Kategoriyalar'
                              : `${allowedCats.length} ta kategoriya ruxsat`}
                          </span>

                          <span className="text-[10px] font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded-md">
                            Narx: {priceType ? priceType.nameUz : 'Ulgurji'}
                          </span>
                        </div>
                      </div>
                    ) : (
                      <span className="text-slate-400 italic text-[10px]">Cheklov yo'q</span>
                    )}
                  </td>

                  {/* Phone */}
                  <td className="p-3 border-r border-slate-100 font-mono font-bold text-slate-900">
                    {st.phone}
                  </td>

                  {/* Status */}
                  <td className="p-3 border-r border-slate-100 text-center">
                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-extrabold ${
                        st.status === 'active'
                          ? 'bg-emerald-100 text-emerald-800'
                          : 'bg-slate-100 text-slate-600'
                      }`}
                    >
                      ● {st.status === 'active' ? 'Faol' : "Ta'tilda"}
                    </span>
                  </td>

                  {/* Actions */}
                  <td className="p-3 text-right">
                    <div className="flex justify-end gap-1.5">
                      <button
                        onClick={() => handleOpenEdit(st)}
                        className="px-2 py-1 text-slate-700 hover:text-indigo-600 bg-slate-100 hover:bg-indigo-50 rounded-lg font-bold border border-slate-200 transition-colors flex items-center gap-1"
                        title="Tahrirlash va Login berish"
                      >
                        <Edit3 className="w-3.5 h-3.5" />
                        <span>Tahrirlash</span>
                      </button>

                      <button
                        onClick={async () => {
                          if (confirm(`"${st.name}" xodimini o'chirishga ishonchingiz komilmi?`)) {
                            await deleteStaff(st.id);
                            setStaff((prev) => prev.filter((s) => s.id !== st.id));
                          }
                        }}
                        className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg border border-rose-200"
                        title="O'chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Add / Edit Staff Modal */}
      {showModal && (
        <div className="fixed inset-0 bg-slate-950/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl border border-slate-200 shadow-2xl w-full max-w-xl p-6 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="text-base font-extrabold text-slate-900 flex items-center gap-2">
                <UserCheck className="w-5 h-5 text-indigo-600" />
                <span>{editingStaff ? 'Xodim Profilini va Loginini Tahrirlash' : 'Yangi Xodim va Login Yaratish'}</span>
              </h3>
              <button onClick={() => setShowModal(false)} className="text-slate-400 hover:text-slate-600 font-bold">
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveStaff} className="space-y-4 text-xs">
              {/* Basic Fields */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-800 font-bold mb-1">Xodim F.I.SH. *</label>
                  <input
                    type="text"
                    required
                    placeholder="Jasur Bekmirzayev"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                  />
                </div>

                <div>
                  <label className="block text-slate-800 font-bold mb-1">Lavozim / Rol *</label>
                  <select
                    value={formData.role}
                    onChange={(e) => setFormData({ ...formData, role: e.target.value as any })}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2.5 text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                  >
                    <option value="sales_agent">Savdo Agenti (Agent SFA)</option>
                    <option value="courier">Kuryer / Yetkazib beruvchi</option>
                    <option value="accountant">Buhgalter / Kassa</option>
                    <option value="manager">Filial Menejeri</option>
                    <option value="super_admin">Super Admin</option>
                  </select>
                </div>
              </div>

              {/* Login Credentials Section */}
              <div className="bg-indigo-50/70 border border-indigo-200 rounded-2xl p-4 space-y-3">
                <div className="flex items-center gap-2 font-extrabold text-indigo-950 text-xs">
                  <KeyRound className="w-4 h-4 text-indigo-600" />
                  <span>Xodimning Tizimga Kirish Login va Paroli</span>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-indigo-900 font-bold mb-1">Login (Kirish) *</label>
                    <input
                      type="text"
                      required
                      value={formData.login}
                      onChange={(e) => setFormData({ ...formData, login: e.target.value })}
                      placeholder="agent1"
                      className="w-full bg-white border border-indigo-300 rounded-xl p-2 text-indigo-950 font-mono font-extrabold focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-indigo-900 font-bold mb-1">Parol *</label>
                    <input
                      type="text"
                      required
                      value={formData.password}
                      onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                      placeholder="123"
                      className="w-full bg-white border border-indigo-300 rounded-xl p-2 text-indigo-950 font-mono font-extrabold focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-indigo-900 font-bold mb-1">Telefon *</label>
                    <input
                      type="text"
                      required
                      value={formData.phone}
                      onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                      className="w-full bg-white border border-indigo-300 rounded-xl p-2 text-slate-900 font-mono font-bold focus:outline-none focus:border-indigo-600"
                    />
                  </div>

                  <div>
                    <label className="block text-indigo-900 font-bold mb-1">Filial / Ombor</label>
                    <input
                      type="text"
                      value={formData.branchName}
                      onChange={(e) => setFormData({ ...formData, branchName: e.target.value })}
                      className="w-full bg-white border border-indigo-300 rounded-xl p-2 text-slate-900 font-bold focus:outline-none focus:border-indigo-600"
                    />
                  </div>
                </div>
              </div>

              {/* Agent Restrictions (if role is sales_agent) */}
              {formData.role === 'sales_agent' && (
                <div className="bg-amber-50/80 border border-amber-200 rounded-2xl p-4 space-y-3">
                  <div className="flex items-center gap-2 font-extrabold text-amber-950 text-xs">
                    <Shield className="w-4 h-4 text-amber-600" />
                    <span>Agent uchun Mahsulot va Narx Cheklovlari (Admin Sozlamalari)</span>
                  </div>

                  <div>
                    <label className="block text-amber-900 font-bold mb-1">
                      Agentga biriktirilgan Narx Turi:
                    </label>
                    <select
                      value={formData.assignedPriceTypeId}
                      onChange={(e) => setFormData({ ...formData, assignedPriceTypeId: e.target.value })}
                      className="w-full bg-white border border-amber-300 rounded-xl p-2 text-slate-900 font-bold focus:outline-none focus:border-amber-600"
                    >
                      {priceTypes.map((pt) => (
                        <option key={pt.id} value={pt.code}>
                          {pt.nameUz} ({pt.code})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-amber-900 font-bold mb-1.5">
                      Ruxsat etilgan Mahsulot Kategoriyalari:
                    </label>
                    <p className="text-[10px] text-amber-800 mb-2">
                      (Agar hech biri belgilanmasa, agent barcha kategoriyalarni ko'ra oladi)
                    </p>

                    <div className="grid grid-cols-2 gap-2 max-h-36 overflow-y-auto bg-white p-2.5 rounded-xl border border-amber-200">
                      {categories.map((cat) => {
                        const isChecked = formData.allowedCategoryIds.includes(cat.id);
                        return (
                          <label
                            key={cat.id}
                            className={`flex items-center gap-2 p-1.5 rounded-lg border cursor-pointer transition-all ${
                              isChecked
                                ? 'bg-amber-100/80 border-amber-400 font-bold text-amber-950'
                                : 'bg-slate-50 border-slate-200 text-slate-700'
                            }`}
                          >
                            <input
                              type="checkbox"
                              checked={isChecked}
                              onChange={() => handleToggleCategoryPermission(cat.id)}
                              className="w-4 h-4 text-amber-600 rounded"
                            />
                            <span className="text-xs">{cat.nameUz}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>

                  <div>
                    <label className="block text-amber-900 font-bold mb-1">
                      Maksimal Chegirma Limit Foizi (%):
                    </label>
                    <input
                      type="number"
                      value={formData.maxDiscountPercent}
                      onChange={(e) => setFormData({ ...formData, maxDiscountPercent: Number(e.target.value) })}
                      className="w-full bg-white border border-amber-300 rounded-xl p-2 text-slate-900 font-bold focus:outline-none focus:border-amber-600"
                    />
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  className="px-4 py-2 rounded-xl bg-slate-100 text-slate-700 font-bold hover:bg-slate-200"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 rounded-xl bg-indigo-600 text-white font-bold hover:bg-indigo-700 shadow-md shadow-indigo-600/20"
                >
                  {editingStaff ? 'O\'zgarishlarni Saqlash' : 'Xodimlarga Kirish Yaratish'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
