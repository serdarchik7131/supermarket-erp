import React, { useState, useEffect } from 'react';
import {
  ShieldCheck,
  Lock as LockIcon,
  Download,
  Upload,
  Activity,
  UserCheck,
  Key,
  Server,
  RefreshCw,
} from 'lucide-react';
import { AuditLog } from '../../types';
import { fetchAuditLogs } from '../../services/api';

export const SecurityAuditModule: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);

  useEffect(() => {
    fetchAuditLogs().then((l) => setLogs(l));
  }, []);

  const handleBackupDownload = () => {
    window.open('/api/backup/download', '_blank');
  };

  return (
    <div className="space-y-6">
      {/* System Security Overview */}
      <div className="grid grid-cols-4 gap-4 text-xs">
        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-lg">
          <span className="text-slate-400">Ruxsat Tizimi (RBAC)</span>
          <h3 className="font-extrabold text-slate-100 text-sm">Role-Based Active</h3>
          <span className="text-[10px] text-emerald-400">5 ta Rol (SuperAdmin, Cashier...)</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-lg">
          <span className="text-slate-400">2FA & JWT Auth Status</span>
          <h3 className="font-extrabold text-emerald-400 text-sm">ENCRYPTED (256-bit)</h3>
          <span className="text-[10px] text-slate-400">HMAC SHA-256 Tokens</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-lg">
          <span className="text-slate-400">Rate Limiting Protection</span>
          <h3 className="font-extrabold text-sky-400 text-sm">100 req/min Active</h3>
          <span className="text-[10px] text-slate-400">Redis Leaky Bucket</span>
        </div>

        <div className="bg-slate-900 border border-slate-800 p-4 rounded-2xl space-y-1 shadow-lg">
          <span className="text-slate-400">Database Backup System</span>
          <button
            onClick={handleBackupDownload}
            className="mt-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold px-3 py-1 rounded text-[11px] flex items-center gap-1"
          >
            <Download className="w-3.5 h-3.5" />
            <span>Download JSON Dump</span>
          </button>
        </div>
      </div>

      {/* Audit Logs Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 space-y-3 shadow-xl">
        <div className="flex justify-between items-center pb-2 border-b border-slate-800">
          <h3 className="font-bold text-sm text-slate-100 flex items-center gap-2">
            <Activity className="w-4 h-4 text-sky-400" />
            <span>Xavfsizlik Audit Loglari (Real-Time System Audit Logs)</span>
          </h3>

          <span className="text-xs text-slate-400 font-mono">Oxirgi loglar ({logs.length})</span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-300">
            <thead className="bg-slate-950 text-slate-400 font-semibold uppercase text-[10px] border-b border-slate-800">
              <tr>
                <th className="p-3">Vaqt</th>
                <th className="p-3">Foydalanuvchi</th>
                <th className="p-3">Modul</th>
                <th className="p-3">Harakat (Action)</th>
                <th className="p-3">Batafsil</th>
                <th className="p-3">IP Manzil</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800">
              {logs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-800/40">
                  <td className="p-3 text-slate-400 font-mono text-[11px]">
                    {new Date(log.timestamp).toLocaleTimeString()}
                  </td>
                  <td className="p-3 font-semibold text-slate-200">{log.userName}</td>
                  <td className="p-3">
                    <span className="bg-slate-950 px-2 py-0.5 rounded border border-slate-800 text-sky-400 font-mono text-[10px]">
                      {log.module}
                    </span>
                  </td>
                  <td className="p-3 font-bold text-emerald-400">{log.action}</td>
                  <td className="p-3 text-slate-300">{log.details}</td>
                  <td className="p-3 text-slate-500 font-mono text-[10px]">{log.ipAddress}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
