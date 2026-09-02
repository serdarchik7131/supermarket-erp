import React, { useState, useEffect } from 'react';
import {
  Truck,
  MapPin,
  Clock,
  CheckCircle2,
  Phone,
  User,
  ShieldAlert,
  Navigation,
  Image as ImageIcon,
  FileSignature,
} from 'lucide-react';
import { Order, Courier } from '../../types';
import { fetchOrders, fetchCouriers, updateOrderStatus } from '../../services/api';

export const DeliveryModule: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [couriers, setCouriers] = useState<Courier[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    const [oList, cList] = await Promise.all([fetchOrders(), fetchCouriers()]);
    setOrders(oList);
    setCouriers(cList);
    if (oList.length > 0) setSelectedOrder(oList[0]);
  };

  const handleStatusChange = async (orderId: string, newStatus: Order['orderStatus']) => {
    const updated = await updateOrderStatus(orderId, newStatus);
    setOrders((prev) => prev.map((o) => (o.id === orderId ? updated : o)));
    if (selectedOrder?.id === orderId) setSelectedOrder(updated);
  };

  return (
    <div className="h-[82vh] flex gap-2 text-xs font-sans">
      {/* Left Orders Queue */}
      <div className="w-80 bg-white border border-slate-300 rounded-lg p-2 flex flex-col space-y-2 shadow-xs">
        <div className="flex justify-between items-center pb-1.5 border-b border-slate-200">
          <h3 className="font-extrabold text-xs text-slate-900 flex items-center gap-1.5">
            <Truck className="w-3.5 h-3.5 text-blue-600" />
            <span>Kuryerlik Buyurtmalari</span>
          </h3>
          <span className="text-[10px] bg-blue-50 text-blue-800 px-1.5 py-0.5 rounded font-mono font-bold border border-blue-200">
            {orders.length} ta
          </span>
        </div>

        <div className="flex-1 overflow-y-auto space-y-1 pr-1">
          {orders.map((o) => (
            <button
              key={o.id}
              onClick={() => setSelectedOrder(o)}
              className={`w-full text-left p-1.5 rounded border transition-all ${
                selectedOrder?.id === o.id
                  ? 'bg-blue-50 border-blue-500 shadow-2xs'
                  : 'bg-slate-50 border-slate-200 hover:border-slate-300'
              }`}
            >
              <div className="flex justify-between items-center mb-0.5">
                <span className="font-bold text-[11px] text-blue-800 font-mono">#{o.orderNumber}</span>
                <span className="text-[11px] font-black text-emerald-700 font-mono">{o.finalTotal.toLocaleString('ru-RU')} SUM</span>
              </div>

              <div className="text-[10px] text-slate-600 space-y-0.5">
                <p className="font-semibold text-slate-900 truncate">Mijoz: {o.customerName}</p>
                <p className="truncate text-slate-500">Manzil: {o.deliveryAddress.address}</p>
              </div>

              <div className="mt-1 pt-1 border-t border-slate-200 flex justify-between items-center text-[10px]">
                <span className="capitalize bg-white px-1.5 py-0.2 rounded border border-slate-300 text-blue-800 font-bold text-[9px]">
                  {o.orderStatus}
                </span>
                <span className="text-slate-400 font-mono">{new Date(o.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* Right - Live Courier GPS & Order Details */}
      {selectedOrder ? (
        <div className="flex-1 bg-white border border-slate-300 rounded-lg p-3 flex flex-col justify-between shadow-xs">
          <div className="space-y-3">
            <div className="flex justify-between items-center pb-2 border-b border-slate-200">
              <div>
                <h3 className="font-extrabold text-xs text-slate-900">
                  Buyurtma #{selectedOrder.orderNumber}
                </h3>
                <p className="text-[10px] text-slate-500">
                  {selectedOrder.branchName} • Yetkazib berish: <span className="text-blue-700 font-bold uppercase">{selectedOrder.deliveryType}</span>
                </p>
              </div>

              <div className="flex items-center gap-1">
                {['pending', 'assembling', 'in_delivery', 'delivered'].map((st) => (
                  <button
                    key={st}
                    onClick={() => handleStatusChange(selectedOrder.id, st as any)}
                    className={`px-2 py-0.5 rounded text-[10px] font-bold capitalize transition-all ${
                      selectedOrder.orderStatus === st
                        ? 'bg-[#24275f] text-white'
                        : 'bg-slate-100 text-slate-700 hover:bg-slate-200 border border-slate-300'
                    }`}
                  >
                    {st}
                  </button>
                ))}
              </div>
            </div>

            {/* Simulated Live GPS Map View */}
            <div className="w-full h-44 bg-slate-900 rounded-lg border border-slate-300 relative overflow-hidden flex items-center justify-center">
              <div className="absolute inset-0 bg-[radial-gradient(#334155_1px,transparent_1px)] [background-size:12px_12px] opacity-60"></div>

              {/* Simulated Map Route Lines */}
              <div className="absolute w-56 h-1 bg-gradient-to-r from-blue-500 to-rose-500 rotate-12 top-20 left-12 rounded-full blur-[0.5px]"></div>

              {/* Branch Pin */}
              <div className="absolute top-12 left-16 bg-blue-600 text-white px-1.5 py-0.5 rounded-full shadow font-bold text-[9px] flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>Supermarket Ombor</span>
              </div>

              {/* Courier Scooter Pin */}
              <div className="absolute top-20 left-36 bg-amber-400 text-slate-950 p-1.5 rounded-full shadow animate-bounce">
                <Truck className="w-3.5 h-3.5" />
              </div>

              {/* Customer Pin */}
              <div className="absolute bottom-10 right-20 bg-rose-600 text-white px-1.5 py-0.5 rounded-full shadow font-bold text-[9px] flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                <span>Mijoz Manzili</span>
              </div>

              <div className="absolute bottom-2 left-2 bg-slate-950/80 backdrop-blur-xs px-2 py-1 rounded border border-slate-700 text-[10px] text-slate-200 flex items-center gap-1.5">
                <Navigation className="w-3 h-3 text-blue-400" />
                <span>Live GPS: <strong>Yandex Maps</strong> (Masofa: 2.4 km • ETA: 12 daq)</span>
              </div>
            </div>

            {/* Courier Info & Delivery Proof */}
            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="bg-slate-50 p-2 rounded border border-slate-200 space-y-1">
                <h4 className="font-bold text-slate-800 text-[10px]">Kur'er Ma'lumotlari:</h4>
                <div className="flex items-center gap-2">
                  <div className="w-7 h-7 rounded-full bg-amber-100 text-amber-800 flex items-center justify-center font-bold">
                    <User className="w-4 h-4" />
                  </div>
                  <div>
                    <span className="font-bold text-slate-900 block leading-none">{selectedOrder.courierName || 'Biriktirilmagan'}</span>
                    <span className="text-[10px] font-mono text-slate-600">{selectedOrder.courierPhone || '+998 90 123 45 67'}</span>
                  </div>
                </div>
              </div>

              <div className="bg-slate-50 p-2 rounded border border-slate-200 space-y-1">
                <h4 className="font-bold text-slate-800 text-[10px]">Yetkazilganlik Isboti (Proof):</h4>
                <div className="flex items-center gap-3 text-[10px] font-medium text-slate-700">
                  <div className="flex items-center gap-1 text-emerald-700 font-bold">
                    <ImageIcon className="w-3.5 h-3.5" />
                    <span>Photo Proof: Bor</span>
                  </div>
                  <div className="flex items-center gap-1 text-emerald-700 font-bold">
                    <FileSignature className="w-3.5 h-3.5" />
                    <span>Imzo: OK</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Items Summary */}
          <div className="pt-2 border-t border-slate-200 flex justify-between items-center text-[11px]">
            <span className="text-slate-600 font-medium">Jami mahsulotlar: {selectedOrder.items.length} turdagi</span>
            <span className="font-black text-emerald-700 font-mono text-xs">
              Jami summasi: {selectedOrder.finalTotal.toLocaleString('ru-RU')} SUM
            </span>
          </div>
        </div>
      ) : (
        <div className="flex-1 bg-white border border-slate-300 rounded-lg flex items-center justify-center text-slate-400">
          Buyurtmani tanlang
        </div>
      )}
    </div>
  );
};
