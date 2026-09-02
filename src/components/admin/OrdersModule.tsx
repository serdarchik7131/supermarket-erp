import React, { useState, useEffect } from 'react';
import { printElementById, printHtml } from '../../utils/printUtils';
import { exportToExcel } from '../../utils/excelUtils';
import { NakladnoyModal } from './NakladnoyModal';
import {
  FileSpreadsheet,
  Download,
  RefreshCw,
  CheckCircle2,
  Clock,
  Truck,
  AlertCircle,
  Eye,
  Printer,
  Search,
  Building2,
  User,
  Phone,
  MapPin,
  Map,
  CreditCard,
  Plus,
  X,
  Filter,
  CheckSquare,
  Square,
  Send,
  Sliders,
  History,
  Store,
  Percent,
  ChevronLeft,
  ChevronRight,
  RotateCcw,
  DollarSign,
  AlertTriangle,
  Layers,
  Edit,
  Trash2,
  Package,
  Save
} from 'lucide-react';
import { Order, OrderStatus, OrderItem, PaymentMethod, Product } from '../../types';
import { fetchOrders, updateOrderStatus, updateOrder, deleteOrder, fetchProducts } from '../../services/api';
import { subscribeAppDataSync } from '../../utils/syncManager';

export const OrdersModule: React.FC = () => {
  const [orders, setOrders] = useState<Order[]>([]);
  const [selectedOrder, setSelectedOrder] = useState<Order | null>(null);
  const [search, setSearch] = useState('');
  const [statusTab, setStatusTab] = useState<'active' | 'delivering' | 'delivered' | 'all'>('active');
  const [selectedOrderIds, setSelectedOrderIds] = useState<string[]>([]);
  
  // Compact layout density state
  const [isSuperCompact, setIsSuperCompact] = useState(true);

  // Modals state
  const [isMapModalOpen, setIsMapModalOpen] = useState(false);
  const [isBatchPaymentModalOpen, setIsBatchPaymentModalOpen] = useState(false);
  const [isBatchAssignModalOpen, setIsBatchAssignModalOpen] = useState(false);
  const [isAddOrderModalOpen, setIsAddOrderModalOpen] = useState(false);
  const [selectedCourier, setSelectedCourier] = useState('Абдурахмон Оператор');
  const [batchPaymentMethod, setBatchPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Edit order modal state
  const [editingOrder, setEditingOrder] = useState<Order | null>(null);
  const [editCustomerName, setEditCustomerName] = useState('');
  const [editCustomerPhone, setEditCustomerPhone] = useState('');
  const [editDeliveryAddress, setEditDeliveryAddress] = useState('');
  const [editZoneName, setEditZoneName] = useState('');
  const [editAgentName, setEditAgentName] = useState('');
  const [editDelivererName, setEditDelivererName] = useState('');
  const [editPaymentMethod, setEditPaymentMethod] = useState<PaymentMethod>('click');
  const [editOrderStatus, setEditOrderStatus] = useState<OrderStatus>('pending');
  const [editDeliveryFee, setEditDeliveryFee] = useState(12000);
  const [editItems, setEditItems] = useState<OrderItem[]>([]);
  const [availableProducts, setAvailableProducts] = useState<Product[]>([]);
  const [selectedProductIdToAdd, setSelectedProductIdToAdd] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);

  // New order form state
  const [newOrderClient, setNewOrderClient] = useState('35232 Киргули Торговый центр ЯтТ Обиджон');
  const [newOrderZone, setNewOrderZone] = useState('Асадулло Пайшанба');
  const [newOrderType, setNewOrderType] = useState('Розница');
  const [newOrderAmount, setNewOrderAmount] = useState(250000);
  const [newOrderAgent, setNewOrderAgent] = useState('3 Асадулло Агент');

  useEffect(() => {
    loadOrders();
    const unsub = subscribeAppDataSync(() => {
      loadOrders();
    });
    const interval = setInterval(() => {
      loadOrders();
    }, 6000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const showNotification = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  const loadOrders = async () => {
    const data = await fetchOrders();
    // Enrich data with Tradeuz SFA extra fields if not present
    const enriched = data.map((o, idx) => {
      const rawAgent = (o as any).agentName || (o as any).assignedAgentName;
      const isClientOrder = (o as any).orderSource === 'telegram_client' || (o as any).orderSource === 'telegram' || (o as any).customerId?.includes('cust') || !(o as any).salesAgentId;
      const resolvedAgent = rawAgent || (isClientOrder ? 'Mijoz' : 'Mijoz');

      return {
        ...o,
        zoneName: (o as any).zoneName || ['Асадулло Пайшанба', 'NAVOIY YARMARKA', 'Хазора', '11 Чирчик', '22 Шайхонтохур 1', '25 Куйи Чирчик'][idx % 6],
        orderType: (o as any).orderType || ['Розница', 'Оптом', 'Магазин'][idx % 3],
        companyBrand: (o as any).companyBrand || 'Био Лайф',
        delivererName: (o as any).delivererName || (idx % 3 === 0 ? 'Абдурахмон Оператор' : idx % 4 === 0 ? 'Бухоро Оператор' : 'Не указано'),
        deliveryDate: (o as any).deliveryDate || '08 авг. 2026',
        agentName: resolvedAgent,
        clientBalance: (o as any).clientBalance !== undefined ? (o as any).clientBalance : [-1646996, -196, -13308240, -10557240, 0, -660, 1140000][idx % 7],
        hasDiscount: idx % 2 === 0,
      };
    });
    setOrders(enriched);
  };

  const handleStatusChange = async (orderId: string, newStatus: OrderStatus) => {
    const updated = await updateOrderStatus(orderId, newStatus);
    setOrders(orders.map((o) => (o.id === orderId ? { ...o, orderStatus: newStatus } : o)));
    if (selectedOrder && selectedOrder.id === orderId) {
      setSelectedOrder({ ...selectedOrder, orderStatus: newStatus });
    }
    showNotification(`Buyurtma #${orderId} statusi o'zgartirildi`);
  };

  // Toggle selection
  const toggleSelectAll = () => {
    if (selectedOrderIds.length === filteredOrders.length) {
      setSelectedOrderIds([]);
    } else {
      setSelectedOrderIds(filteredOrders.map((o) => o.id));
    }
  };

  const toggleSelectRow = (id: string) => {
    if (selectedOrderIds.includes(id)) {
      setSelectedOrderIds(selectedOrderIds.filter((item) => item !== id));
    } else {
      setSelectedOrderIds([...selectedOrderIds, id]);
    }
  };

  // Batch actions
  const handleApplyBatchPayment = () => {
    setOrders(
      orders.map((o) =>
        selectedOrderIds.includes(o.id)
          ? { ...o, paymentStatus: 'paid', clientBalance: 0 }
          : o
      )
    );
    showNotification(`✅ ${selectedOrderIds.length} ta buyurtma to'lovi muvaffaqiyatli qabul qilindi!`);
    setIsBatchPaymentModalOpen(false);
    setSelectedOrderIds([]);
  };

  const handleApplyBatchCourier = () => {
    setOrders(
      orders.map((o) =>
        selectedOrderIds.includes(o.id)
          ? { ...o, delivererName: selectedCourier, orderStatus: 'in_delivery' }
          : o
      )
    );
    showNotification(`🚚 ${selectedOrderIds.length} ta buyurtma "${selectedCourier}" ga biriktirildi!`);
    setIsBatchAssignModalOpen(false);
    setSelectedOrderIds([]);
  };

  const handleAddOrder = (e: React.FormEvent) => {
    e.preventDefault();
    const newOrd: any = {
      id: `ord_${Date.now()}`,
      orderNumber: `${Math.floor(930000 + Math.random() * 9999)}`,
      customerName: newOrderClient,
      customerPhone: '+998 90 123 45 67',
      deliveryAddress: { address: 'Toshkent sh., Yunusobod 4-mavze' },
      items: [
        {
          productId: 'p1',
          productName: 'Coca-Cola 1.5l Klasik',
          barcode: '47800001',
          quantity: 10,
          unitPrice: 12000,
          totalPrice: 120000,
        },
      ],
      totalAmount: newOrderAmount,
      deliveryFee: 0,
      discountAmount: 0,
      finalTotal: newOrderAmount,
      paymentMethod: 'click',
      paymentStatus: 'unpaid',
      orderStatus: 'pending',
      createdAt: new Date().toISOString(),
      zoneName: newOrderZone,
      orderType: newOrderType,
      companyBrand: 'Био Лайф',
      delivererName: 'Не указано',
      deliveryDate: '08 авг. 2026',
      agentName: newOrderAgent,
      clientBalance: -50000,
      hasDiscount: true,
    };
    setOrders([newOrd, ...orders]);
    setIsAddOrderModalOpen(false);
    showNotification(`Yangi buyurtma #${newOrd.orderNumber} muvaffaqiyatli qo'shildi!`);
  };

  // Order Edit Handlers
  const openEditOrderModal = async (ord: Order) => {
    setEditingOrder(ord);
    setEditCustomerName(ord.customerName || '');
    setEditCustomerPhone(ord.customerPhone || '');
    setEditDeliveryAddress(ord.deliveryAddress?.address || '');
    setEditZoneName((ord as any).zoneName || '');
    setEditAgentName((ord as any).agentName || ord.assignedAgentName || 'Mijoz');
    setEditDelivererName((ord as any).delivererName || 'Не указано');
    setEditPaymentMethod(ord.paymentMethod || 'click');
    setEditOrderStatus(ord.orderStatus || 'pending');
    setEditDeliveryFee(ord.deliveryFee || 0);
    setEditItems(JSON.parse(JSON.stringify(ord.items || [])));

    if (availableProducts.length === 0) {
      try {
        const prods = await fetchProducts();
        setAvailableProducts(prods);
      } catch (err) {
        console.error('Error fetching products for order edit:', err);
      }
    }
  };

  const handleItemQuantityChange = (index: number, newQty: number) => {
    if (newQty < 1) return;
    const updated = [...editItems];
    updated[index].quantity = newQty;
    updated[index].totalPrice = newQty * updated[index].unitPrice;
    setEditItems(updated);
  };

  const handleItemPriceChange = (index: number, newPrice: number) => {
    if (newPrice < 0) return;
    const updated = [...editItems];
    updated[index].unitPrice = newPrice;
    updated[index].totalPrice = updated[index].quantity * newPrice;
    setEditItems(updated);
  };

  const handleRemoveItem = (index: number) => {
    setEditItems(editItems.filter((_, i) => i !== index));
  };

  const handleAddItemToEditOrder = (productId: string) => {
    const p = availableProducts.find((prod) => prod.id === productId);
    if (!p) return;
    const newItem: OrderItem = {
      productId: p.id,
      productName: p.nameUz,
      barcode: p.barcode || '',
      quantity: 1,
      unitPrice: p.price,
      totalPrice: p.price,
      image: p.image || '',
    };
    setEditItems([...editItems, newItem]);
  };

  const handleSaveOrderEdit = async () => {
    if (!editingOrder) return;
    setIsSavingEdit(true);

    const subtotal = editItems.reduce((sum, item) => sum + item.totalPrice, 0);
    const finalTotal = subtotal + editDeliveryFee;

    const updatePayload: Partial<Order> = {
      customerName: editCustomerName,
      customerPhone: editCustomerPhone,
      deliveryAddress: { address: editDeliveryAddress },
      paymentMethod: editPaymentMethod,
      orderStatus: editOrderStatus,
      deliveryFee: editDeliveryFee,
      subtotal,
      finalTotal,
      items: editItems,
      courierName: editAgentName,
      ...({
        zoneName: editZoneName,
        agentName: editAgentName,
        delivererName: editDelivererName,
      } as any),
    };

    try {
      const updated = await updateOrder(editingOrder.id, updatePayload);
      setOrders(orders.map((o) => (o.id === editingOrder.id ? { ...o, ...updated } : o)));
      showNotification(`✅ Buyurtma #${editingOrder.orderNumber} muvaffaqiyatli tahrirlandi!`);
      setEditingOrder(null);
    } catch (err) {
      console.error('Order update error:', err);
      showNotification(`❌ Xatolik berdi: Buyurtma tahrirlanmadi`);
    } finally {
      setIsSavingEdit(false);
    }
  };

  const handleDeleteSingleOrder = async (ord: Order) => {
    if (!window.confirm(`Buyurtma #${ord.orderNumber} ni o'chirishga ishonchingiz komilmi?`)) {
      return;
    }

    try {
      await deleteOrder(ord.id);
      setOrders(orders.filter((o) => o.id !== ord.id));
      if (editingOrder?.id === ord.id) setEditingOrder(null);
      if (selectedOrder?.id === ord.id) setSelectedOrder(null);
      showNotification(`🗑️ Buyurtma #${ord.orderNumber} o'chirildi`);
    } catch (err) {
      console.error('Delete order error:', err);
      showNotification(`❌ Xatolik: Buyurtma o'chirilmadi`);
    }
  };

  // Generate Excel Nakladnoy download as a formatted Excel (.xls)
  const handleExportExcelNakladnoy = (order: Order) => {
    exportToExcel({
      filename: `Nakladnoy_${order.orderNumber}`,
      title: `TRADEUZ SFA — ULGURJI NAKLADNOY #${order.orderNumber}`,
      subtitle: `Mijoz: ${order.customerName} (${order.customerPhone}) | Manzil: ${order.deliveryAddress?.address || '-'} | Agent: ${(order as any).agentName || '-'}`,
      columns: [
        { header: '№', key: 'index', align: 'center' },
        { header: 'Shtrixkod', key: 'barcode', align: 'center' },
        { header: 'Mahsulot Nomi', key: 'productName', align: 'left' },
        { header: 'Miqdori', key: 'quantity', align: 'center' },
        { header: 'Birlik Narxi (UZS)', key: 'unitPrice', align: 'right' },
        { header: 'Jami Summa (UZS)', key: 'totalPrice', align: 'right' },
      ],
      data: order.items.map((it, idx) => ({
        index: idx + 1,
        barcode: it.barcode,
        productName: it.productName,
        quantity: it.quantity,
        unitPrice: it.unitPrice.toLocaleString('uz-UZ'),
        totalPrice: it.totalPrice.toLocaleString('uz-UZ'),
      })),
      summary: {
        productName: 'JAMI TO\'LANADIGAN SUMMA:',
        totalPrice: order.finalTotal.toLocaleString('uz-UZ') + ' UZS',
      },
    });
  };

  // Export full list of filtered orders to Excel
  const handleExportOrdersListExcel = () => {
    exportToExcel({
      filename: `buyurtmalar_royxati_${Date.now()}`,
      title: 'TRADEUZ SFA — Buyurtmalar Ro\'yxati Hisoboti',
      subtitle: `Filtr bo'yicha jami: ${filteredOrders.length} ta buyurtma`,
      columns: [
        { header: '№ Buyurtma', key: 'orderNumber', align: 'center' },
        { header: 'Mijoz Nomi', key: 'customerName', align: 'left' },
        { header: 'Telefon', key: 'phone', align: 'center' },
        { header: 'Agent', key: 'agentName', align: 'left' },
        { header: 'Hudud / Zona', key: 'zoneName', align: 'left' },
        { header: 'Buyurtma Holati', key: 'statusLabel', align: 'center' },
        { header: 'To\'lov Usuli', key: 'paymentMethod', align: 'center' },
        { header: 'Jami Summa (UZS)', key: 'finalTotal', align: 'right' },
        { header: 'Yaratilgan Vaqt', key: 'createdAt', align: 'center' },
      ],
      data: filteredOrders.map((o) => ({
        orderNumber: o.orderNumber,
        customerName: o.customerName,
        phone: o.customerPhone,
        agentName: o.agentName || 'Tizim',
        zoneName: (o as any).zoneName || '-',
        statusLabel: o.orderStatus === 'delivered' ? 'Yetkazildi' : o.orderStatus === 'in_delivery' ? 'Yo\'lda' : 'Kutilmoqda',
        paymentMethod: o.paymentMethod === 'cash' ? 'Naqd' : o.paymentMethod === 'bank_transfer' ? 'Perexod' : 'Karta',
        finalTotal: o.finalTotal.toLocaleString('uz-UZ'),
        createdAt: new Date(o.createdAt).toLocaleString('uz-UZ'),
      })),
      summary: {
        customerName: 'JAMI SUMMA:',
        finalTotal: filteredOrders.reduce((sum, o) => sum + o.finalTotal, 0).toLocaleString('uz-UZ') + ' UZS',
      },
    });
  };

  // Filter logic
  const filteredOrders = orders.filter((o: any) => {
    const matchesSearch =
      o.orderNumber.toLowerCase().includes(search.toLowerCase()) ||
      o.customerName.toLowerCase().includes(search.toLowerCase()) ||
      (o.agentName && o.agentName.toLowerCase().includes(search.toLowerCase())) ||
      (o.zoneName && o.zoneName.toLowerCase().includes(search.toLowerCase()));

    let matchesTab = true;
    if (statusTab === 'active') matchesTab = o.orderStatus === 'pending' || o.orderStatus === 'assembling';
    if (statusTab === 'delivering') matchesTab = o.orderStatus === 'in_delivery';
    if (statusTab === 'delivered') matchesTab = o.orderStatus === 'delivered';

    return matchesSearch && matchesTab;
  });

  // Calculate Summary Metrics
  const totalSum = filteredOrders.reduce((acc, curr) => acc + curr.finalTotal, 0);
  const totalWeight = Math.round(filteredOrders.length * 220.5);
  const totalSelectedSum = orders
    .filter((o) => selectedOrderIds.includes(o.id))
    .reduce((acc, curr) => acc + curr.finalTotal, 0);

  return (
    <div className="space-y-2 text-xs font-sans select-none">
      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-4 right-4 z-50 bg-slate-900 text-white px-3.5 py-2 rounded-xl shadow-2xl border border-slate-700 flex items-center gap-2 text-xs animate-fade-in font-medium">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* 1. TOP CONTROL & BADGES BAR (Exact Tradeuz Top Strip) */}
      <div className="flex flex-wrap items-center justify-between gap-2 bg-white px-3 py-1.5 rounded-lg border border-slate-200 shadow-xs">
        {/* Left: Star Title & Status Badges */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex items-center gap-1.5 text-slate-800 font-bold text-xs">
            <span className="text-amber-500">★</span>
            <span className="text-slate-500 font-normal">Избранные</span>
            <span className="text-slate-300">|</span>
            <span className="text-slate-900 font-extrabold text-sm">Заказы</span>
          </div>

          <div className="flex items-center gap-1.5 ml-2">
            <span className="bg-blue-600 text-white font-extrabold px-2 py-0.5 rounded text-[11px] flex items-center gap-1 shadow-2xs">
              <AlertCircle className="w-3 h-3" />
              <span>651 Заказы на сегодня</span>
            </span>

            <span className="bg-rose-500 text-white font-black px-1.5 py-0.5 rounded text-[11px] flex items-center gap-0.5">
              <span>226</span>
              <AlertTriangle className="w-3 h-3" />
            </span>

            <span className="bg-amber-500 text-white font-black px-1.5 py-0.5 rounded text-[11px] flex items-center gap-0.5">
              <Clock className="w-3 h-3" />
              <span>9</span>
            </span>

            <span className="bg-indigo-600 text-white font-black px-1.5 py-0.5 rounded text-[11px] flex items-center gap-0.5">
              <Truck className="w-3 h-3" />
              <span>253</span>
            </span>
          </div>
        </div>

        {/* Right: Primary Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={() => setIsMapModalOpen(true)}
            className="bg-[#3b82f6] hover:bg-blue-600 text-white font-medium text-[11px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 shadow-2xs"
          >
            <Map className="w-3 h-3" />
            <span>Показать на карте</span>
          </button>

          <button
            onClick={() => {
              if (selectedOrderIds.length === 0) {
                showNotification('Iltimos, avval jadvaldan kamida 1 ta buyurtmani belgilang!');
                return;
              }
              setIsBatchPaymentModalOpen(true);
            }}
            className="bg-[#3b82f6] hover:bg-blue-600 text-white font-medium text-[11px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 shadow-2xs"
          >
            <CreditCard className="w-3 h-3" />
            <span>Групповая оплата {selectedOrderIds.length > 0 && `(${selectedOrderIds.length})`}</span>
          </button>

          <label className="bg-[#3b82f6] hover:bg-blue-600 text-white font-medium text-[11px] px-2.5 py-1 rounded transition-colors flex items-center gap-1 shadow-2xs cursor-pointer">
            <FileSpreadsheet className="w-3 h-3" />
            <span>Импортировать</span>
            <input
              type="file"
              accept=".xlsx, .xls, .csv"
              className="hidden"
              onChange={(e) => {
                if (e.target.files && e.target.files[0]) {
                  const file = e.target.files[0];
                  showNotification(`✅ "${file.name}" faylidan buyurtmalar muvaffaqiyatli import qilindi!`);
                  e.target.value = '';
                }
              }}
            />
          </label>

          <button
            onClick={() => setIsAddOrderModalOpen(true)}
            className="bg-[#22c55e] hover:bg-green-600 text-white font-bold text-[11px] px-3 py-1 rounded transition-colors flex items-center gap-1 shadow-2xs"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Добавить</span>
          </button>
        </div>
      </div>

      {/* 2. STATUS TABS BAR (Active, In Delivery, Delivered, All) */}
      <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-lg border border-slate-200">
        <button
          onClick={() => setStatusTab('active')}
          className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
            statusTab === 'active'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          Активные
        </button>

        <button
          onClick={() => setStatusTab('delivering')}
          className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
            statusTab === 'delivering'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          Доставляется
        </button>

        <button
          onClick={() => setStatusTab('delivered')}
          className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
            statusTab === 'delivered'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          Доставленные
        </button>

        <button
          onClick={() => setStatusTab('all')}
          className={`px-3 py-1 rounded-md text-[11px] font-bold transition-all ${
            statusTab === 'all'
              ? 'bg-blue-600 text-white shadow-xs'
              : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
          }`}
        >
          Все
        </button>
      </div>

      {/* 3. TRADEUZ SUMMARY BLUE BANNER (Exact Banner from Tradeuz Screenshot) */}
      <div className="bg-[#3b82f6] text-white px-3 py-1 rounded-md flex flex-wrap items-center justify-between font-bold text-[11px] tracking-tight shadow-xs">
        <div>
          <span>Заказы: </span>
          <span className="font-extrabold">{totalSum.toLocaleString('ru-RU')} SUM</span>
          <span className="font-normal opacity-90"> , {totalWeight.toLocaleString('ru-RU')} КГ</span>
        </div>

        <div>
          <span>Возвраты: </span>
          <span>0 SUM , 0 КГ</span>
        </div>

        <div>
          <span>Факт: </span>
          <span className="font-extrabold">{totalSum.toLocaleString('ru-RU')} SUM</span>
          <span className="font-normal opacity-90"> , {totalWeight.toLocaleString('ru-RU')} КГ</span>
        </div>
      </div>

      {/* 4. COMPACT TABLE TOOLBAR & CONTROLS BAR */}
      <div className="bg-slate-200/70 p-1.5 rounded-lg border border-slate-300 flex flex-wrap items-center justify-between gap-2">
        {/* Left Search & Filter */}
        <div className="flex items-center gap-1.5 flex-1 min-w-[200px]">
          <div className="flex items-center gap-1 bg-white px-2 py-0.5 rounded border border-slate-300 text-slate-700">
            <span className="text-[11px] font-medium text-slate-600">Фильтр: 1 элемента</span>
            <button
              onClick={() => setSearch('')}
              className="p-0.5 hover:text-rose-600 text-slate-400"
              title="Filtrni tozalash"
            >
              <X className="w-3 h-3" />
            </button>
          </div>

          <div className="relative flex-1 max-w-xs">
            <Search className="w-3.5 h-3.5 absolute left-2 top-1.5 text-slate-400" />
            <input
              type="text"
              placeholder="Поиск..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full bg-white border border-slate-300 text-slate-900 pl-7 pr-2 py-1 rounded text-[11px] focus:outline-none focus:border-blue-500 font-medium placeholder:text-slate-400"
            />
          </div>
        </div>

        {/* Right Pagination & Action Buttons */}
        <div className="flex items-center gap-1.5">
          <select className="bg-white border border-slate-300 text-slate-800 text-[11px] px-1.5 py-0.5 rounded font-medium focus:outline-none">
            <option>25</option>
            <option>50</option>
            <option>100</option>
            <option>250</option>
          </select>

          <span className="text-slate-600 text-[11px] font-medium">
            1 - {filteredOrders.length} из 1488
          </span>

          <div className="flex items-center border border-slate-300 bg-white rounded overflow-hidden">
            <button className="p-1 hover:bg-slate-100 border-r border-slate-200 text-slate-600">
              <ChevronLeft className="w-3 h-3" />
            </button>
            <button className="p-1 hover:bg-slate-100 text-slate-600">
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>

          <div className="h-4 w-px bg-slate-300 mx-0.5"></div>

          {/* Quick Toolbar Icons */}
          <button
            onClick={() => setIsSuperCompact(!isSuperCompact)}
            className={`p-1 rounded border transition-colors ${
              isSuperCompact
                ? 'bg-blue-600 text-white border-blue-600'
                : 'bg-white text-slate-600 border-slate-300 hover:bg-slate-100'
            }`}
            title="Ixcham ko'rinish rejimini yoqish/o'chirish"
          >
            <Sliders className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={loadOrders}
            className="p-1 bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-100"
            title="Yangilash"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => printElementById('orders-table-container', "Buyurtmalar Ro'yxati")}
            className="p-1 bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-100"
            title="Chop etish"
          >
            <Printer className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={handleExportOrdersListExcel}
            className="p-1 bg-white border border-slate-300 rounded text-slate-600 hover:bg-slate-100"
            title="Excel eksport"
          >
            <Download className="w-3.5 h-3.5" />
          </button>

          <button
            onClick={() => {
              if (selectedOrderIds.length === 0) {
                showNotification('Iltimos, kuryerga biriktirish uchun buyurtmalarni tanlang!');
                return;
              }
              setIsBatchAssignModalOpen(true);
            }}
            className="bg-[#22c55e] hover:bg-green-600 text-white font-bold text-[11px] px-2.5 py-1 rounded flex items-center gap-1 shadow-2xs"
            title="Biriktirilgan kuryerga topshirish"
          >
            <Send className="w-3 h-3" />
            <span>Передать</span>
          </button>
        </div>
      </div>

      {/* Batch Selection Information Bar (When rows selected) */}
      {selectedOrderIds.length > 0 && (
        <div className="bg-amber-50 border border-amber-300 p-2 rounded-lg flex items-center justify-between text-[11px] text-amber-900 font-medium animate-fade-in">
          <div className="flex items-center gap-2">
            <span className="font-bold bg-amber-200 px-2 py-0.5 rounded text-amber-900 font-mono">
              {selectedOrderIds.length} ta tanlandi
            </span>
            <span>Jami Tanlangan Summa:</span>
            <span className="font-black text-rose-700 text-xs">
              {totalSelectedSum.toLocaleString('ru-RU')} SUM
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsBatchPaymentModalOpen(true)}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-2.5 py-1 rounded font-bold text-[11px] flex items-center gap-1"
            >
              <CreditCard className="w-3 h-3" />
              <span>Guruhli To'lov Qabul Qilish</span>
            </button>

            <button
              onClick={() => setIsBatchAssignModalOpen(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-2.5 py-1 rounded font-bold text-[11px] flex items-center gap-1"
            >
              <Send className="w-3 h-3" />
              <span>Kuryerga Topshirish</span>
            </button>

            <button
              onClick={() => setSelectedOrderIds([])}
              className="text-slate-500 hover:text-slate-900 underline ml-2"
            >
              Tanlovni bekor qilish
            </button>
          </div>
        </div>
      )}

      {/* 5. HIGH-DENSITY HIGH-PRECISION TRADEUZ TABLE */}
      <div id="orders-table-container" className="bg-white border border-slate-300 rounded-lg overflow-hidden shadow-xs">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-[11px]">
            {/* Table Header */}
            <thead className="bg-[#24275f] text-white font-semibold border-b border-slate-400">
              <tr>
                <th className="p-1.5 text-center w-8 border-r border-indigo-900">
                  <input
                    type="checkbox"
                    checked={
                      filteredOrders.length > 0 &&
                      selectedOrderIds.length === filteredOrders.length
                    }
                    onChange={toggleSelectAll}
                    className="rounded cursor-pointer accent-blue-500 w-3.5 h-3.5"
                  />
                </th>
                <th className="p-1.5 border-r border-indigo-900 w-16 text-center font-mono">№</th>
                <th className="p-1.5 border-r border-indigo-900">Клиент</th>
                <th className="p-1.5 border-r border-indigo-900">Тип</th>
                <th className="p-1.5 border-r border-indigo-900">Дата создания</th>
                <th className="p-1.5 border-r border-indigo-900">Доставщик</th>
                <th className="p-1.5 border-r border-indigo-900">Дата доставки</th>
                <th className="p-1.5 border-r border-indigo-900">Агент</th>
                <th className="p-1.5 border-r border-indigo-900 text-right">Сумма заказа</th>
                <th className="p-1.5 border-r border-indigo-900 text-right">Баланс</th>
                <th className="p-1.5 text-center">Статус</th>
              </tr>
            </thead>

            {/* Table Body */}
            <tbody className="divide-y divide-slate-200 font-medium text-slate-800">
              {filteredOrders.length === 0 ? (
                <tr>
                  <td colSpan={11} className="p-8 text-center text-slate-400">
                    Buyurtmalar topilmadi
                  </td>
                </tr>
              ) : (
                filteredOrders.map((ord: any) => {
                  const isSelected = selectedOrderIds.includes(ord.id);

                  return (
                    <tr
                      key={ord.id}
                      className={`hover:bg-blue-50/70 transition-colors ${
                        isSelected ? 'bg-blue-100/60 font-semibold' : 'even:bg-slate-50/50'
                      }`}
                    >
                      {/* Checkbox */}
                      <td className="p-1 text-center border-r border-slate-200">
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelectRow(ord.id)}
                          className="rounded cursor-pointer accent-blue-600 w-3.5 h-3.5"
                        />
                      </td>

                      {/* Order Number & Time */}
                      <td
                        onClick={() => setSelectedOrder(ord)}
                        className="p-1 text-center border-r border-slate-200 font-mono text-slate-800 hover:text-blue-600 cursor-pointer font-bold"
                      >
                        {ord.orderNumber}
                      </td>

                      {/* Client Name & Zone */}
                      <td
                        onClick={() => setSelectedOrder(ord)}
                        className="p-1 border-r border-slate-200 cursor-pointer"
                      >
                        <div className="font-bold text-slate-900 hover:text-blue-600 line-clamp-1">
                          {ord.customerName}
                        </div>
                        <div className="text-[10px] text-blue-600 font-normal line-clamp-1">
                          Зона: {ord.zoneName}
                        </div>
                      </td>

                      {/* Type & Brand */}
                      <td className="p-1 border-r border-slate-200">
                        <div className="text-slate-800">{ord.orderType}</div>
                        <div className="text-[10px] text-slate-500">{ord.companyBrand}</div>
                      </td>

                      {/* Creation Date */}
                      <td className="p-1 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                        {new Date(ord.createdAt).toLocaleDateString('ru-RU', {
                          day: '2-digit',
                          month: 'short',
                        })}{' '}
                        {new Date(ord.createdAt).toLocaleTimeString('ru-RU', {
                          hour: '2-digit',
                          minute: '2-digit',
                        })}
                      </td>

                      {/* Deliverer */}
                      <td className="p-1 border-r border-slate-200">
                        <div
                          className={`font-semibold ${
                            ord.delivererName === 'Не указано' ? 'text-slate-400' : 'text-blue-700'
                          }`}
                        >
                          {ord.delivererName}
                        </div>
                        <div className="text-[10px] text-slate-400">
                          {ord.delivererName === 'Не указано' ? 'Не указано' : 'Kuryer'}
                        </div>
                      </td>

                      {/* Delivery Date */}
                      <td className="p-1 border-r border-slate-200 text-slate-700 whitespace-nowrap">
                        {ord.deliveryDate}
                      </td>

                      {/* Sales Agent */}
                      <td className="p-1 border-r border-slate-200 text-slate-800 whitespace-nowrap">
                        {ord.agentName === 'Mijoz' || ord.agentName?.toLowerCase().includes('mijoz') ? (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[11px] font-bold bg-sky-100/80 text-sky-800 border border-sky-200">
                            👤 Mijoz
                          </span>
                        ) : (
                          <span className="font-medium text-slate-800">{ord.agentName || 'Mijoz'}</span>
                        )}
                      </td>

                      {/* Order Amount */}
                      <td className="p-1 border-r border-slate-200 text-right font-bold text-slate-900 whitespace-nowrap">
                        {ord.finalTotal.toLocaleString('ru-RU')} SUM
                      </td>

                      {/* Client Balance */}
                      <td className="p-1 border-r border-slate-200 text-right whitespace-nowrap font-bold">
                        {ord.clientBalance < 0 ? (
                          <span className="text-rose-600">
                            {ord.clientBalance.toLocaleString('ru-RU')} SUM
                          </span>
                        ) : ord.clientBalance > 0 ? (
                          <span className="text-emerald-600">
                            {ord.clientBalance.toLocaleString('ru-RU')} SUM
                          </span>
                        ) : (
                          <span className="text-slate-400">0 SUM</span>
                        )}
                      </td>

                      {/* Status Badges & Quick Action */}
                      <td className="p-1 text-center" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-center gap-1">
                          <select
                            value={ord.orderStatus}
                            onChange={(e) => handleStatusChange(ord.id, e.target.value as OrderStatus)}
                            className={`text-[10px] font-bold px-1.5 py-0.5 rounded border focus:outline-none cursor-pointer ${
                              ord.orderStatus === 'delivered'
                                ? 'bg-emerald-100 text-emerald-800 border-emerald-300'
                                : ord.orderStatus === 'in_delivery'
                                ? 'bg-blue-100 text-blue-800 border-blue-300'
                                : ord.orderStatus === 'assembling'
                                ? 'bg-amber-100 text-amber-800 border-amber-300'
                                : ord.orderStatus === 'cancelled'
                                ? 'bg-rose-100 text-rose-800 border-rose-300'
                                : 'bg-slate-100 text-slate-800 border-slate-300'
                            }`}
                          >
                            <option value="pending">🆕 Yangi</option>
                            <option value="assembling">📦 Yig'ilmoqda</option>
                            <option value="in_delivery">🚚 Yo'lda</option>
                            <option value="delivered">✅ Yetkazildi</option>
                            <option value="cancelled">❌ Bekor qilindi</option>
                          </select>

                          <button
                            onClick={() => setSelectedOrder(ord)}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                            title="Nakladnoyni ko'rish"
                          >
                            <Eye className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => openEditOrderModal(ord)}
                            className="p-1 bg-amber-50 hover:bg-amber-100 text-amber-700 rounded border border-amber-300"
                            title="Buyurtmani tahrirlash"
                          >
                            <Edit className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => handleExportExcelNakladnoy(ord)}
                            className="p-1 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 rounded border border-emerald-300"
                            title="Excel nakladnoy yuklab olish"
                          >
                            <Download className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedOrder(ord);
                              setTimeout(() => printElementById('printable-nakladnoy-document', `Nakladnoy_${ord.orderNumber}`), 250);
                            }}
                            className="p-1 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded border border-slate-300"
                            title="Chop etish"
                          >
                            <Printer className="w-3 h-3" />
                          </button>

                          <button
                            onClick={() => handleDeleteSingleOrder(ord)}
                            className="p-1 bg-rose-50 hover:bg-rose-100 text-rose-700 rounded border border-rose-300"
                            title="Buyurtmani o'chirish"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* MODAL 1: DELIVERY MAP VIEW MODAL ("Показать на карте") */}
      {isMapModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl w-full max-w-4xl h-[80vh] flex flex-col shadow-2xl overflow-hidden">
            <div className="bg-[#24275f] text-white p-3 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2 font-bold text-sm">
                <Map className="w-4 h-4 text-sky-400" />
                <span>Tradeuz SFA — Buyurtmalarni Xaritada Ko'rish</span>
              </div>
              <button
                onClick={() => setIsMapModalOpen(false)}
                className="text-slate-300 hover:text-white"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 flex overflow-hidden">
              {/* Map Canvas Simulation */}
              <div className="flex-1 bg-slate-100 relative overflow-hidden flex items-center justify-center border-r border-slate-300">
                <div
                  className="absolute inset-0 bg-cover bg-center opacity-80"
                  style={{
                    backgroundImage:
                      'radial-gradient(#cbd5e1 1px, transparent 1px), radial-gradient(#cbd5e1 1px, #f8fafc 1px)',
                    backgroundSize: '20px 20px',
                  }}
                ></div>

                {/* Simulated Interactive Map Markers */}
                <div className="absolute top-1/4 left-1/3 bg-rose-600 text-white p-1.5 rounded-full shadow-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer animate-bounce">
                  <MapPin className="w-4 h-4" />
                  <span>#930614 (149k)</span>
                </div>

                <div className="absolute top-1/2 left-1/2 bg-blue-600 text-white p-1.5 rounded-full shadow-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer">
                  <MapPin className="w-4 h-4" />
                  <span>#930612 (409k)</span>
                </div>

                <div className="absolute top-2/3 left-1/4 bg-emerald-600 text-white p-1.5 rounded-full shadow-lg font-bold text-[10px] flex items-center gap-1 cursor-pointer">
                  <MapPin className="w-4 h-4" />
                  <span>#930605 (1.1M)</span>
                </div>

                {/* Map Control Overlay */}
                <div className="absolute top-3 left-3 bg-white/90 backdrop-blur-xs p-2 rounded-xl border border-slate-300 shadow-md text-xs space-y-1">
                  <div className="font-bold text-slate-800">Toshkent va Viloyatlar Rejimida:</div>
                  <div className="flex items-center gap-2 text-[10px] text-slate-600">
                    <span className="w-2.5 h-2.5 rounded-full bg-rose-600"></span> Yangi
                    <span className="w-2.5 h-2.5 rounded-full bg-blue-600"></span> Yo'lda
                    <span className="w-2.5 h-2.5 rounded-full bg-emerald-600"></span> Yetkazildi
                  </div>
                </div>
              </div>

              {/* Sidebar Active Order List */}
              <div className="w-80 bg-white p-3 overflow-y-auto space-y-2 shrink-0 border-l border-slate-200">
                <h4 className="font-bold text-xs text-slate-900 border-b border-slate-200 pb-2">
                  Xaritadagi Buyurtmalar ({filteredOrders.length})
                </h4>

                <div className="space-y-1.5 text-xs">
                  {filteredOrders.map((o: any) => (
                    <div
                      key={o.id}
                      onClick={() => {
                        setSelectedOrder(o);
                        setIsMapModalOpen(false);
                      }}
                      className="p-2 rounded-lg border border-slate-200 hover:border-blue-500 hover:bg-blue-50 cursor-pointer space-y-1 transition-colors"
                    >
                      <div className="flex items-center justify-between font-bold">
                        <span className="text-blue-700">#{o.orderNumber}</span>
                        <span className="text-slate-900">{o.finalTotal.toLocaleString()} UZS</span>
                      </div>
                      <div className="text-[11px] text-slate-700 font-medium line-clamp-1">{o.customerName}</div>
                      <div className="text-[10px] text-slate-400 flex items-center gap-1">
                        <MapPin className="w-3 h-3 text-rose-500 shrink-0" />
                        <span className="truncate">{o.deliveryAddress.address}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 2: BATCH PAYMENT MODAL ("Групповая оплата") */}
      {isBatchPaymentModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <CreditCard className="w-4 h-4 text-emerald-600" />
                <span>Guruhli To'lov Qabul Qilish</span>
              </h3>
              <button
                onClick={() => setIsBatchPaymentModalOpen(false)}
                className="text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-emerald-50 border border-emerald-200 p-3 rounded-xl space-y-1">
              <div className="text-slate-600 font-medium">Tanlangan Buyurtmalar Soni:</div>
              <div className="text-lg font-black text-emerald-800">
                {selectedOrderIds.length} ta buyurtma
              </div>
              <div className="text-slate-600 font-medium pt-1">Umumiy To'lanadigan Summa:</div>
              <div className="text-xl font-black text-rose-700">
                {totalSelectedSum.toLocaleString('ru-RU')} SUM
              </div>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">To'lov Turi:</label>
                <div className="grid grid-cols-3 gap-2">
                  <button
                    type="button"
                    onClick={() => setBatchPaymentMethod('cash')}
                    className={`py-2 rounded-xl font-bold border transition-colors ${
                      batchPaymentMethod === 'cash'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    💵 Naqd
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchPaymentMethod('card')}
                    className={`py-2 rounded-xl font-bold border transition-colors ${
                      batchPaymentMethod === 'card'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    💳 Click / Payme
                  </button>
                  <button
                    type="button"
                    onClick={() => setBatchPaymentMethod('bank_transfer')}
                    className={`py-2 rounded-xl font-bold border transition-colors ${
                      batchPaymentMethod === 'bank_transfer'
                        ? 'bg-emerald-600 text-white border-emerald-600'
                        : 'bg-slate-50 text-slate-700 border-slate-300'
                    }`}
                  >
                    🏛️ Перечисление
                  </button>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsBatchPaymentModalOpen(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleApplyBatchPayment}
                className="px-5 py-2 bg-emerald-600 text-white font-bold rounded-xl shadow-md hover:bg-emerald-700"
              >
                To'lovni Tasdiqlash
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: BATCH COURIER ASSIGN MODAL ("Передать") */}
      {isBatchAssignModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-md w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Send className="w-4 h-4 text-blue-600" />
                <span>Kuryer / Operatorgan Topshirish</span>
              </h3>
              <button
                onClick={() => setIsBatchAssignModalOpen(false)}
                className="text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="bg-blue-50 border border-blue-200 p-3 rounded-xl">
              <div className="text-slate-700 font-medium">Tanlangan buyurtmalar soni:</div>
              <div className="text-lg font-black text-blue-900">{selectedOrderIds.length} ta</div>
            </div>

            <div>
              <label className="block text-slate-700 font-bold mb-1">Mas'ul Kuryer / Yetkazib beruvchi:</label>
              <select
                value={selectedCourier}
                onChange={(e) => setSelectedCourier(e.target.value)}
                className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2.5 font-bold text-slate-800"
              >
                <option value="Абдурахмон Оператор">🚚 Абдурахмон Оператор</option>
                <option value="Бухоро Оператор">🚚 Бухоро Оператор</option>
                <option value="Шахбоз Оптом">🚚 Шахбоз Оптом</option>
                <option value="Jasur Bekmirzayev">🚚 Jasur Bekmirzayev</option>
              </select>
            </div>

            <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
              <button
                onClick={() => setIsBatchAssignModalOpen(false)}
                className="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl"
              >
                Bekor qilish
              </button>
              <button
                onClick={handleApplyBatchCourier}
                className="px-5 py-2 bg-blue-600 text-white font-bold rounded-xl shadow-md hover:bg-blue-700"
              >
                Topshirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 4: ADD NEW ORDER MODAL */}
      {isAddOrderModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-slate-200 rounded-2xl p-5 max-w-lg w-full space-y-4 shadow-2xl text-xs">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200">
              <h3 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Plus className="w-4 h-4 text-green-600" />
                <span>Yangi Ulgurji Buyurtma Kiritish</span>
              </h3>
              <button
                onClick={() => setIsAddOrderModalOpen(false)}
                className="text-slate-400 hover:text-slate-800"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddOrder} className="space-y-3">
              <div>
                <label className="block text-slate-700 font-bold mb-1">Mijoz / Do'kon Nomi:</label>
                <input
                  type="text"
                  required
                  value={newOrderClient}
                  onChange={(e) => setNewOrderClient(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium"
                />
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Hudud / Zona:</label>
                  <input
                    type="text"
                    value={newOrderZone}
                    onChange={(e) => setNewOrderZone(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Savdo Turi:</label>
                  <select
                    value={newOrderType}
                    onChange={(e) => setNewOrderType(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium"
                  >
                    <option value="Розница">Розница</option>
                    <option value="Оптом">Оптом</option>
                    <option value="Магазин">Магазин</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-700 font-bold mb-1">Jami Summa (UZS):</label>
                  <input
                    type="number"
                    value={newOrderAmount}
                    onChange={(e) => setNewOrderAmount(Number(e.target.value))}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-bold text-rose-700"
                  />
                </div>

                <div>
                  <label className="block text-slate-700 font-bold mb-1">Mas'ul Agent:</label>
                  <input
                    type="text"
                    value={newOrderAgent}
                    onChange={(e) => setNewOrderAgent(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-300 rounded-xl p-2 font-medium"
                  />
                </div>
              </div>

              <div className="pt-3 border-t border-slate-200 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOrderModalOpen(false)}
                  className="px-4 py-2 bg-slate-200 text-slate-800 font-bold rounded-xl"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-green-600 text-white font-bold rounded-xl shadow-md hover:bg-green-700"
                >
                  Saqlash
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 5: EDIT ORDER MODAL */}
      {editingOrder && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-2 sm:p-4 overflow-y-auto">
          <div className="bg-white rounded-2xl shadow-2xl border border-slate-300 w-full max-w-4xl max-h-[92vh] flex flex-col overflow-hidden text-xs">
            {/* Modal Header */}
            <div className="bg-[#24275f] text-white p-3 px-4 flex items-center justify-between shrink-0">
              <div className="flex items-center gap-2">
                <Edit className="w-4 h-4 text-amber-400" />
                <span className="font-bold text-sm">BUYURTMANI TAHRIRLASH № {editingOrder.orderNumber}</span>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 px-2 py-0.5 rounded font-mono uppercase">
                  {editingOrder.orderStatus}
                </span>
              </div>
              <button
                onClick={() => setEditingOrder(null)}
                className="text-slate-300 hover:text-white p-1 rounded-lg"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-4 overflow-y-auto flex-1 space-y-4 bg-slate-50">
              {/* Section 1: Customer & Logistics info */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <h4 className="font-bold text-slate-800 text-xs border-b border-slate-200 pb-1.5 flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5 text-blue-600" />
                  <span>Mijoz va Logistika Ma'lumotlari</span>
                </h4>

                <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Mijoz / Do'kon Nomi:</label>
                    <input
                      type="text"
                      value={editCustomerName}
                      onChange={(e) => setEditCustomerName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Telefon Raqami:</label>
                    <input
                      type="text"
                      value={editCustomerPhone}
                      onChange={(e) => setEditCustomerPhone(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Yetkazish Manzili:</label>
                    <input
                      type="text"
                      value={editDeliveryAddress}
                      onChange={(e) => setEditDeliveryAddress(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Hudud / Zona:</label>
                    <input
                      type="text"
                      value={editZoneName}
                      onChange={(e) => setEditZoneName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Mas'ul Agent:</label>
                    <input
                      type="text"
                      value={editAgentName}
                      onChange={(e) => setEditAgentName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:bg-white focus:border-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Yetkazib Beruvchi (Kuryer):</label>
                    <select
                      value={editDelivererName}
                      onChange={(e) => setEditDelivererName(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:bg-white focus:border-blue-500"
                    >
                      <option value="Не указано">Не указано</option>
                      <option value="Абдурахмон Оператор">Абдурахмон Оператор</option>
                      <option value="Бухоро Оператор">Бухоро Оператор</option>
                      <option value="Шахбоз Оптом">Шахбоз Оптом</option>
                      <option value="Jasur Bekmirzayev">Jasur Bekmirzayev</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">To'lov Usuli:</label>
                    <select
                      value={editPaymentMethod}
                      onChange={(e) => setEditPaymentMethod(e.target.value as PaymentMethod)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:bg-white focus:border-blue-500"
                    >
                      <option value="cash">Naqd pul (Cash)</option>
                      <option value="click">Click / Payme</option>
                      <option value="card">Terminal / Plastik</option>
                      <option value="bank_transfer">Perexod (Bank o'tkazmasi)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Buyurtma Holati:</label>
                    <select
                      value={editOrderStatus}
                      onChange={(e) => setEditOrderStatus(e.target.value as OrderStatus)}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-medium focus:bg-white focus:border-blue-500"
                    >
                      <option value="pending">🆕 Yangi</option>
                      <option value="assembling">📦 Yig'ilmoqda</option>
                      <option value="in_delivery">🚚 Yo'lda</option>
                      <option value="delivered">✅ Yetkazildi</option>
                      <option value="cancelled">❌ Bekor qilindi</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-slate-600 font-bold mb-1">Yetkazib Berish Narxi (UZS):</label>
                    <input
                      type="number"
                      value={editDeliveryFee}
                      onChange={(e) => setEditDeliveryFee(Number(e.target.value))}
                      className="w-full bg-slate-50 border border-slate-300 rounded-lg p-2 font-bold text-slate-800 focus:bg-white focus:border-blue-500"
                    />
                  </div>
                </div>
              </div>

              {/* Section 2: Order Items Table & Product Adder */}
              <div className="bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200 pb-2">
                  <h4 className="font-bold text-slate-800 text-xs flex items-center gap-1.5">
                    <Package className="w-3.5 h-3.5 text-emerald-600" />
                    <span>Buyurtma Tarkibidagi Mahsulotlar ({editItems.length} tur)</span>
                  </h4>

                  {/* Product Selector to Add Item */}
                  <div className="flex items-center gap-2 flex-1 max-w-md justify-end">
                    <select
                      value={selectedProductIdToAdd}
                      onChange={(e) => setSelectedProductIdToAdd(e.target.value)}
                      className="bg-slate-50 border border-slate-300 text-slate-800 text-[11px] rounded-lg p-1.5 max-w-[240px] truncate"
                    >
                      <option value="">-- Mahsulot tanlang --</option>
                      {availableProducts.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.nameUz} ({p.price.toLocaleString()} UZS)
                        </option>
                      ))}
                    </select>

                    <button
                      type="button"
                      onClick={() => {
                        if (selectedProductIdToAdd) {
                          handleAddItemToEditOrder(selectedProductIdToAdd);
                          setSelectedProductIdToAdd('');
                        }
                      }}
                      disabled={!selectedProductIdToAdd}
                      className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 text-white font-bold px-2.5 py-1.5 rounded-lg flex items-center gap-1 transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      <span>Qo'shish</span>
                    </button>
                  </div>
                </div>

                {/* Table of Order Items */}
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-[11px]">
                    <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-300">
                      <tr>
                        <th className="p-2 w-8 text-center">№</th>
                        <th className="p-2">Mahsulot Nomi</th>
                        <th className="p-2 w-28 text-center">Miqdori</th>
                        <th className="p-2 w-32 text-right">Birlik Narxi (UZS)</th>
                        <th className="p-2 w-32 text-right">Jami Summa</th>
                        <th className="p-2 w-10 text-center"></th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-200">
                      {editItems.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="p-6 text-center text-slate-400 font-medium">
                            Buyurtmada xozircha mahsulotlar yo'q. Yuqoridagi ro'yxatdan tanlab qo'shing.
                          </td>
                        </tr>
                      ) : (
                        editItems.map((item, idx) => (
                          <tr key={idx} className="hover:bg-slate-50">
                            <td className="p-2 text-center text-slate-400 font-mono">{idx + 1}</td>
                            <td className="p-2">
                              <div className="font-bold text-slate-900">{item.productName}</div>
                              <div className="text-[10px] text-slate-400 font-mono">Shtrixkod: {item.barcode || '-'}</div>
                            </td>
                            <td className="p-2 text-center">
                              <div className="flex items-center justify-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => handleItemQuantityChange(idx, item.quantity - 1)}
                                  className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center"
                                >
                                  -
                                </button>
                                <input
                                  type="number"
                                  min="1"
                                  value={item.quantity}
                                  onChange={(e) => handleItemQuantityChange(idx, Number(e.target.value))}
                                  className="w-12 text-center border border-slate-300 rounded font-bold text-slate-900 py-0.5 text-xs"
                                />
                                <button
                                  type="button"
                                  onClick={() => handleItemQuantityChange(idx, item.quantity + 1)}
                                  className="w-6 h-6 rounded bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold flex items-center justify-center"
                                >
                                  +
                                </button>
                              </div>
                            </td>
                            <td className="p-2 text-right">
                              <input
                                type="number"
                                value={item.unitPrice}
                                onChange={(e) => handleItemPriceChange(idx, Number(e.target.value))}
                                className="w-24 text-right border border-slate-300 rounded font-bold text-slate-900 py-0.5 px-1 text-xs"
                              />
                            </td>
                            <td className="p-2 text-right font-bold text-slate-900">
                              {item.totalPrice.toLocaleString('uz-UZ')} UZS
                            </td>
                            <td className="p-2 text-center">
                              <button
                                type="button"
                                onClick={() => handleRemoveItem(idx)}
                                className="p-1 hover:bg-rose-100 text-rose-600 rounded transition-colors"
                                title="O'chirish"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Recalculated Totals Summary */}
                {(() => {
                  const subtotal = editItems.reduce((s, it) => s + (it.totalPrice || it.quantity * it.unitPrice), 0);
                  const grandTotal = subtotal + editDeliveryFee;
                  return (
                    <div className="bg-amber-50/80 border border-amber-200 p-3 rounded-xl flex flex-wrap items-center justify-between gap-3 text-xs font-bold text-slate-900">
                      <div>
                        <span>Mahsulotlar Summasi: </span>
                        <span className="text-blue-700 font-extrabold">{subtotal.toLocaleString('uz-UZ')} UZS</span>
                      </div>

                      <div>
                        <span>Yetkazish xizmati: </span>
                        <span className="text-slate-700">{editDeliveryFee.toLocaleString('uz-UZ')} UZS</span>
                      </div>

                      <div className="text-sm">
                        <span>JAMI TO'LANADIGAN: </span>
                        <span className="text-rose-700 font-black">{grandTotal.toLocaleString('uz-UZ')} UZS</span>
                      </div>
                    </div>
                  );
                })()}
              </div>
            </div>

            {/* Modal Footer Actions */}
            <div className="p-3 px-4 bg-white border-t border-slate-200 flex items-center justify-between gap-2 shrink-0">
              <button
                type="button"
                onClick={() => handleDeleteSingleOrder(editingOrder)}
                className="px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-300 font-bold rounded-xl flex items-center gap-1 transition-colors"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Buyurtmani O'chirish</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setEditingOrder(null)}
                  className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-bold rounded-xl transition-colors"
                >
                  Bekor qilish
                </button>
                <button
                  type="button"
                  onClick={handleSaveOrderEdit}
                  disabled={isSavingEdit}
                  className="px-5 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-md transition-colors flex items-center gap-1.5 disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  <span>{isSavingEdit ? "Saqlanmoqda..." : "O'zgarishlarni Saqlash"}</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: DETAILED ORDER NAKLADNOY VIEW MODAL */}
      {selectedOrder && (
        <NakladnoyModal
          order={selectedOrder}
          onClose={() => setSelectedOrder(null)}
          onStatusChange={handleStatusChange}
          onEditOrder={(ord) => openEditOrderModal(ord)}
        />
      )}
    </div>
  );
};

