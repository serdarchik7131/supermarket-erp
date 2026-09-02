import React, { useState, useEffect } from 'react';
import { Building2, Plus, MapPin, Phone, Truck, DollarSign, UserCheck } from 'lucide-react';
import { Branch } from '../../types';
import { fetchBranches } from '../../services/api';

export const BranchManagement: React.FC = () => {
  const [branches, setBranches] = useState<Branch[]>([]);

  useEffect(() => {
    fetchBranches().then((b) => setBranches(b));
  }, []);

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center bg-slate-900 p-4 rounded-2xl border border-slate-800 shadow-lg">
        <div>
          <h2 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Building2 className="w-4 h-4 text-sky-400" />
            <span>Supermarket Filiallari Boshqaruvi</span>
          </h2>
          <p className="text-xs text-slate-400">Multi-branch narx, ombor va kur'erlar muvofiqligi</p>
        </div>

        <button
          onClick={() => alert("Yangi filial qo'shish modali")}
          className="bg-sky-500 hover:bg-sky-400 text-slate-950 font-bold px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-md"
        >
          <Plus className="w-4 h-4" />
          <span>Yangi Filial Qo'shish</span>
        </button>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {branches.map((b) => (
          <div
            key={b.id}
            className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-4 shadow-xl hover:border-sky-500/50 transition-all"
          >
            <div className="flex justify-between items-start border-b border-slate-800 pb-3">
              <div>
                <h3 className="font-bold text-sm text-slate-100">{b.name}</h3>
                <p className="text-xs text-slate-400 flex items-center gap-1 mt-0.5">
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{b.city}, {b.address}</span>
                </p>
              </div>
              {b.isMain && (
                <span className="bg-amber-500/10 text-amber-300 border border-amber-500/30 text-[10px] font-bold px-2 py-0.5 rounded">
                  Bosh Baza
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-2 text-xs">
              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px]">Kunlik Tushum</span>
                <p className="font-bold text-emerald-400">{b.dailyRevenue.toLocaleString()} UZS</p>
              </div>

              <div className="bg-slate-950 p-2.5 rounded-xl border border-slate-800 space-y-0.5">
                <span className="text-slate-400 text-[10px]">Faol Kur'erlar</span>
                <p className="font-bold text-sky-400">{b.activeCouriers} kuryer</p>
              </div>
            </div>

            <div className="text-xs text-slate-400 space-y-1">
              <p className="flex items-center gap-1.5">
                <Phone className="w-3.5 h-3.5 text-slate-500" />
                <span>{b.phone}</span>
              </p>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
