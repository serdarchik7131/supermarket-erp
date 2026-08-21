import React, { useState, useEffect } from 'react';
import { Map as MapIcon, Plus, Search, Trash2, Edit2, CheckCircle2, MapPin, Building2, Save, X, RefreshCw } from 'lucide-react';
import { Territory, Client } from '../../types';
import { fetchTerritories, createTerritory, updateTerritory, deleteTerritory, fetchClients } from '../../services/api';

export const TerritoryManagementModule: React.FC = () => {
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>('');

  // Form / Modal state
  const [isModalOpen, setIsModalOpen] = useState<boolean>(false);
  const [editingTerritory, setEditingTerritory] = useState<Territory | null>(null);
  const [nameInput, setNameInput] = useState<string>('');
  const [codeInput, setCodeInput] = useState<string>('');
  const [descriptionInput, setDescriptionInput] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);
  const [actionSuccess, setActionSuccess] = useState<string | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setLoading(true);
      const [terrs, clis] = await Promise.all([fetchTerritories(), fetchClients()]);
      setTerritories(terrs);
      setClients(clis);
    } catch (err) {
      console.error('Error loading territory data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenAddModal = () => {
    setEditingTerritory(null);
    setNameInput('');
    setCodeInput('');
    setDescriptionInput('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (territory: Territory) => {
    setEditingTerritory(territory);
    setNameInput(territory.name);
    setCodeInput(territory.code || '');
    setDescriptionInput(territory.description || '');
    setIsModalOpen(true);
  };

  const handleDelete = async (id: string, name: string) => {
    if (!window.confirm(`"${name}" teritoriyasini o'chirishni tasdiqlaysizmi?`)) return;
    try {
      await deleteTerritory(id);
      setTerritories(territories.filter((t) => t.id !== id));
      showToast(`"${name}" teritoriyasi o'chirildi`);
    } catch (err) {
      console.error('Error deleting territory:', err);
      alert('Teritoriyani o\'chirishda xatolik yuz berdi');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!nameInput.trim()) return;

    try {
      setIsSubmitting(true);
      if (editingTerritory) {
        const updated = await updateTerritory(editingTerritory.id, {
          name: nameInput.trim(),
          code: codeInput.trim() || nameInput.trim().substring(0, 3).toUpperCase(),
          description: descriptionInput.trim(),
        });
        setTerritories(territories.map((t) => (t.id === updated.id ? updated : t)));
        showToast(`"${updated.name}" teritoriyasi yangilandi`);
      } else {
        const created = await createTerritory({
          name: nameInput.trim(),
          code: codeInput.trim() || nameInput.trim().substring(0, 3).toUpperCase(),
          description: descriptionInput.trim(),
          active: true,
        });
        setTerritories([...territories, created]);
        showToast(`Yangi "${created.name}" teritoriyasi qo'shildi`);
      }
      setIsModalOpen(false);
    } catch (err) {
      console.error('Error saving territory:', err);
      alert('Teritoriyani saqlashda xatolik yuz berdi');
    } finally {
      setIsSubmitting(false);
    }
  };

  const showToast = (msg: string) => {
    setActionSuccess(msg);
    setTimeout(() => setActionSuccess(null), 3000);
  };

  const filteredTerritories = territories.filter((t) =>
    t.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    (t.code && t.code.toLowerCase().includes(searchQuery.toLowerCase())) ||
    (t.description && t.description.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className="space-y-4 text-xs font-sans p-1 max-w-6xl mx-auto animate-fadeIn">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white p-4 rounded-2xl border border-slate-200 shadow-sm">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
            <MapIcon className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-sm font-black text-slate-900">
              Teritoriyalar (Hududlar) Boshqaruvi
            </h2>
            <p className="text-[11px] text-slate-500">
              Admin tomonidan qo'shiladigan hududlar ro'yxati. Agent klient qo'shayotganda ushbu teritoriyalardan birini tanlaydi.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {actionSuccess && (
            <div className="bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold px-3 py-1.5 rounded-xl text-xs flex items-center gap-1.5 animate-bounce">
              <CheckCircle2 className="w-4 h-4 text-emerald-600" />
              <span>{actionSuccess}</span>
            </div>
          )}

          <button
            onClick={handleOpenAddModal}
            className="bg-teal-600 hover:bg-teal-700 text-white font-extrabold px-4 py-2.5 rounded-xl flex items-center gap-2 shadow-lg shadow-teal-600/20 transition-all shrink-0"
          >
            <Plus className="w-4 h-4" />
            <span>Yangi Teritoriya Qo'shish</span>
          </button>
        </div>
      </div>

      {/* Search & Stats Bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
        <div className="md:col-span-3 bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center gap-2">
          <Search className="w-4 h-4 text-slate-400 shrink-0 ml-2" />
          <input
            type="text"
            placeholder="Teritoriyalar bo'yicha qidirish (nomi, kodi, tavsifi)..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full bg-transparent text-slate-900 font-medium placeholder-slate-400 focus:outline-none text-xs"
          />
          {searchQuery && (
            <button onClick={() => setSearchQuery('')} className="text-slate-400 hover:text-slate-600 mr-2">
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        <div className="bg-white p-2.5 rounded-2xl border border-slate-200 shadow-sm flex items-center justify-between px-4">
          <span className="text-slate-500 font-bold">Jami Teritoriyalar:</span>
          <span className="font-mono font-black text-teal-700 text-sm">{territories.length} ta</span>
        </div>
      </div>

      {/* Territories Grid / Table */}
      {loading ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center text-slate-400 font-bold animate-pulse">
          Teritoriyalar yuklanmoqda...
        </div>
      ) : filteredTerritories.length === 0 ? (
        <div className="bg-white p-12 rounded-3xl border border-slate-200 text-center space-y-3">
          <MapPin className="w-10 h-10 text-slate-300 mx-auto" />
          <p className="text-slate-500 font-bold">Hozircha birorta ham teritoriya topilmadi.</p>
          <button
            onClick={handleOpenAddModal}
            className="bg-teal-600 text-white font-bold px-4 py-2 rounded-xl text-xs"
          >
            + Birinchi Teritoriyani Qo'shish
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredTerritories.map((ter) => {
            const linkedClientsCount = clients.filter(
              (c) => c.territoryId === ter.id || c.territoryName === ter.name
            ).length;

            return (
              <div
                key={ter.id}
                className="bg-white p-4 rounded-3xl border border-slate-200 shadow-sm space-y-3 hover:border-teal-300 transition-all group relative flex flex-col justify-between"
              >
                <div>
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-xl bg-teal-50 text-teal-700 font-black font-mono flex items-center justify-center text-xs shrink-0">
                        {ter.code || 'TER'}
                      </div>
                      <div>
                        <h3 className="font-extrabold text-slate-900 text-sm group-hover:text-teal-700 transition-colors">
                          {ter.name}
                        </h3>
                        <span className="text-[10px] text-slate-400 font-mono">ID: {ter.id}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={() => handleOpenEditModal(ter)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 transition-all"
                        title="Tahrirlash"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(ter.id, ter.name)}
                        className="p-1.5 rounded-lg text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition-all"
                        title="O'chirish"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {ter.description && (
                    <p className="text-[11px] text-slate-600 mt-2 bg-slate-50 p-2 rounded-xl border border-slate-100">
                      {ter.description}
                    </p>
                  )}
                </div>

                <div className="pt-2 border-t border-slate-100 flex justify-between items-center text-[11px]">
                  <span className="text-slate-500 font-medium flex items-center gap-1">
                    <Building2 className="w-3.5 h-3.5 text-teal-600" />
                    <span>Biriktirilgan Do'konlar:</span>
                  </span>
                  <span className="font-mono font-black text-slate-900 bg-slate-100 px-2 py-0.5 rounded-full">
                    {linkedClientsCount} ta mijoz
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* MODAL: ADD / EDIT TERRITORY */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white border border-slate-200 w-full max-w-md rounded-3xl p-6 shadow-2xl space-y-4 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-3 border-b border-slate-100 pb-3">
              <div className="w-10 h-10 rounded-2xl bg-teal-100 text-teal-700 flex items-center justify-center font-bold">
                <MapPin className="w-5 h-5" />
              </div>
              <div>
                <h3 className="font-black text-sm text-slate-900">
                  {editingTerritory ? 'Teritoriyani Tahrirlash' : 'Yangi Teritoriya Qo\'shish'}
                </h3>
                <p className="text-[11px] text-slate-500">Agentlar mijoz biriktirishda foydalanadi</p>
              </div>
            </div>

            <form onSubmit={handleSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Teritoriya (Hudud) Nomi (*):</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Chilonzor tumani, Farg'ona vodiysi..."
                  value={nameInput}
                  onChange={(e) => setNameInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl font-bold text-xs focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Hudud Kodi (Qisqartma):</label>
                <input
                  type="text"
                  placeholder="Masalan: CHIL, YUN, SAM"
                  value={codeInput}
                  onChange={(e) => setCodeInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl font-mono uppercase font-bold text-xs focus:outline-none focus:border-teal-600"
                />
              </div>

              <div>
                <label className="block text-slate-700 font-bold mb-1">Tavsif / Hudud Chegarasi Izohi:</label>
                <textarea
                  rows={3}
                  placeholder="Masalan: Chilonzor 1-26 mavzelar, Farhod bozori atrofi..."
                  value={descriptionInput}
                  onChange={(e) => setDescriptionInput(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 text-slate-900 p-2.5 rounded-xl text-xs focus:outline-none focus:border-teal-600"
                />
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="flex-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold py-2.5 rounded-xl text-xs"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="flex-1 bg-teal-600 hover:bg-teal-700 text-white font-extrabold py-2.5 rounded-xl text-xs shadow-lg shadow-teal-600/20 flex items-center justify-center gap-1.5"
                >
                  <Save className="w-4 h-4" />
                  <span>{isSubmitting ? 'Saqlanmoqda...' : 'Saqlash'}</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
