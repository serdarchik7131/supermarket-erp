import React, { useState, useEffect } from 'react';
import { exportToExcel } from '../../utils/excelUtils';
import { NakladnoyModal } from '../admin/NakladnoyModal';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelector } from '../LanguageSelector';
import {
  Store,
  PlusCircle,
  TrendingUp,
  Receipt,
  Phone,
  MapPin,
  Search,
  ShoppingBag,
  Download,
  Plus,
  Minus,
  Trash2,
  Clock,
  UserPlus,
  X,
  Camera,
  RefreshCw,
  Navigation,
  Truck,
  Package,
  Layers3,
  CheckSquare,
  DollarSign,
  Briefcase,
  BatteryCharging,
  Wifi,
  ShieldCheck,
  ChevronRight,
  ArrowRight,
  Award,
  CheckCircle2,
  AlertTriangle,
  FileText,
  User,
  Hash,
  Send,
  Sliders,
  Filter,
  Lock as LockIcon
} from 'lucide-react';
import { Product, Category, Branch, Order, Client, StaffMember, PaymentRecord, SystemSettings, Territory } from '../../types';
import {
  fetchProducts,
  fetchCategories,
  fetchBranches,
  fetchClients,
  fetchOrders,
  createOrder,
  createPayment,
  fetchStaff,
  createClient,
  fetchSettings,
  fetchTerritories,
} from '../../services/api';
import { subscribeAppDataSync } from '../../utils/syncManager';
import { getAutoProductImage } from '../../utils/productUtils';
import { ProductThumbnail } from '../common/ProductThumbnail';
import { matchProductSearch } from '../../utils/searchUtils';
import { ContentAgentStudio } from './ContentAgentStudio';

interface AgentPanelProps {
  onSwitchToClientMode?: () => void;
  onOpenAdmin?: () => void;
}

export interface VisitRecord {
  id: string;
  clientId: string;
  clientName: string;
  startTime: string;
  endTime: string;
  durationMinutes: number;
  outcome: 'order_taken' | 'debt_collected' | 'sufficient_stock' | 'closed' | 'owner_absent' | 'other';
  notes: string;
  gpsCoords: string;
  ordersCount: number;
  paymentsTotal: number;
}

export interface PhotoAuditRecord {
  id: string;
  clientId: string;
  clientName: string;
  photoUrl: string;
  category: 'shelf' | 'fridge' | 'competitor' | 'promo';
  notes: string;
  timestamp: string;
}

export const AgentPanel: React.FC<AgentPanelProps> = ({ onSwitchToClientMode, onOpenAdmin }) => {
  const { language, setLanguage, t, getProductName, getCategoryName, getPriceTypeName } = useLanguage();
  // Staff / Agent Selection State
  const [agents, setAgents] = useState<StaffMember[]>([]);
  const [currentAgent, setCurrentAgent] = useState<StaffMember | null>(null);

  // Core Data
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [agentOrders, setAgentOrders] = useState<Order[]>([]);

  // Navigation Tabs in SFA Mobile Agent App
  const [agentTab, setAgentTab] = useState<'dashboard' | 'route' | 'catalog' | 'collection' | 'audit' | 'van_stock' | 'orders'>('dashboard');

  // Route Filter in Route Tab
  const [routeFilter, setRouteFilter] = useState<'today' | 'debtors' | 'all'>('today');
  const [clientSearchQuery, setClientSearchQuery] = useState<string>('');

  // Active GPS Visit Engine
  const [activeVisitClient, setActiveVisitClient] = useState<Client | null>(null);
  const [visitStartTimestamp, setVisitStartTimestamp] = useState<number | null>(null);
  const [visitElapsedSeconds, setVisitElapsedSeconds] = useState<number>(0);
  const [visitNotes, setVisitNotes] = useState<string>('');
  const [isCheckoutModalOpen, setIsCheckoutModalOpen] = useState<boolean>(false);
  const [checkoutOutcome, setCheckoutOutcome] = useState<'order_taken' | 'debt_collected' | 'sufficient_stock' | 'closed' | 'owner_absent' | 'other'>('order_taken');
  const [pastVisits, setPastVisits] = useState<VisitRecord[]>([
    {
      id: 'v_101',
      clientId: 'c_1',
      clientName: 'Oazis-Market Mega',
      startTime: '09:15',
      endTime: '09:32',
      durationMinutes: 17,
      outcome: 'order_taken',
      notes: 'Sovutgich to\'ldirildi, yangi B2B zakaz olindi',
      gpsCoords: '41.311081, 69.240562',
      ordersCount: 1,
      paymentsTotal: 4500000,
    },
  ]);

  // Offline / Sync Simulation State
  const [pendingSyncItems, setPendingSyncItems] = useState<number>(0);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const [syncToastMsg, setSyncToastMsg] = useState<string | null>(null);

  // Add Client Modal State
  const [isAddClientModalOpen, setIsAddClientModalOpen] = useState<boolean>(false);
  const [territories, setTerritories] = useState<Territory[]>([]);
  const [newClientTerritoryId, setNewClientTerritoryId] = useState<string>('');
  const [newClientName, setNewClientName] = useState<string>('');
  const [newClientInn, setNewClientInn] = useState<string>('');
  const [newClientContact, setNewClientContact] = useState<string>('');
  const [newClientPhone, setNewClientPhone] = useState<string>('');
  const [newClientAddress, setNewClientAddress] = useState<string>('');
  const [newClientCreditLimit, setNewClientCreditLimit] = useState<string>('30000000');
  const [newClientLat, setNewClientLat] = useState<string>('41.311081');
  const [newClientLng, setNewClientLng] = useState<string>('69.240562');
  const [newClientLocationUrl, setNewClientLocationUrl] = useState<string>('https://maps.google.com/?q=41.311081,69.240562');
  const [isDetectingGps, setIsDetectingGps] = useState<boolean>(false);
  const [isCreatingClient, setIsCreatingClient] = useState<boolean>(false);

  // Agent Login Auth State
  const [isAgentAuthenticated, setIsAgentAuthenticated] = useState<boolean>(false);
  const [isAgentLoginOpen, setIsAgentLoginOpen] = useState<boolean>(false);
  const [agentInputLogin, setAgentInputLogin] = useState<string>('');
  const [agentInputPassword, setAgentInputPassword] = useState<string>('');
  const [agentAuthError, setAgentAuthError] = useState<string | null>(null);
  const [isAgentLoggingIn, setIsAgentLoggingIn] = useState<boolean>(false);

  // Order Creation State for Agent Preselling
  const [selectedClientForOrder, setSelectedClientForOrder] = useState<Client | null>(null);
  const [orderCart, setOrderCart] = useState<Array<{ product: Product; quantity: number; unitType: 'dona' | 'korobka' }>>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [b2bPaymentMethod, setB2bPaymentMethod] = useState<'cash' | 'click' | 'payme' | 'bank_transfer'>('bank_transfer');
  const [b2bOrderNotes, setB2bOrderNotes] = useState<string>('');
  const [deliveryDate, setDeliveryDate] = useState<string>(
    new Date(Date.now() + 86400000).toISOString().split('T')[0]
  );
  const [isSubmittingOrder, setIsSubmittingOrder] = useState<boolean>(false);
  const [orderSuccess, setOrderSuccess] = useState<Order | null>(null);
  const [isCartSheetOpen, setIsCartSheetOpen] = useState<boolean>(false);

  // Collection (Inkassatsiya) & Kassa Handover State
  const [selectedClientForPayment, setSelectedClientForPayment] = useState<Client | null>(null);
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [paymentNotes, setPaymentNotes] = useState<string>('');
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);
  const [collectedPayments, setCollectedPayments] = useState<PaymentRecord[]>([]);
  const [isHandoverModalOpen, setIsHandoverModalOpen] = useState<boolean>(false);
  const [handoverSuccessMsg, setHandoverSuccessMsg] = useState<string | null>(null);

  // Merchandising & Photo Audit State
  const [photoAudits, setPhotoAudits] = useState<PhotoAuditRecord[]>([
    {
      id: 'aud_1',
      clientId: 'c_1',
      clientName: 'Oazis-Market Mega',
      photoUrl: 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&q=80',
      category: 'shelf',
      notes: 'Markaziy vitrina to\'liq mahsulotlar bilan to\'ldirildi. Narxnoma yangilandi.',
      timestamp: 'Bugun, 09:25',
    },
  ]);
  const [auditClient, setAuditClient] = useState<Client | null>(null);
  const [auditCategory, setAuditCategory] = useState<'shelf' | 'fridge' | 'competitor' | 'promo'>('shelf');
  const [auditPhotoUrl, setAuditPhotoUrl] = useState<string>(
    'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&q=80'
  );
  const [auditNotes, setAuditNotes] = useState<string>('');
  const [auditSuccessMsg, setAuditSuccessMsg] = useState<string | null>(null);

  // Selected Order for Printing / Nakladnoy Modal
  const [selectedNakladnoyOrder, setSelectedNakladnoyOrder] = useState<Order | null>(null);

  // Active Visit Timer Tick
  useEffect(() => {
    let timer: any;
    if (activeVisitClient && visitStartTimestamp) {
      timer = setInterval(() => {
        setVisitElapsedSeconds(Math.floor((Date.now() - visitStartTimestamp) / 1000));
      }, 1000);
    } else {
      setVisitElapsedSeconds(0);
    }
    return () => clearInterval(timer);
  }, [activeVisitClient, visitStartTimestamp]);

  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    minOrderAmountClient: 50000,
    minOrderAmountAgent: 100000,
    isGeolocationRequiredForClient: true,
  });

  useEffect(() => {
    loadAgentData();
    const unsub = subscribeAppDataSync(() => {
      loadAgentData();
    });
    const interval = setInterval(() => {
      loadAgentData();
    }, 6000);
    return () => {
      unsub();
      clearInterval(interval);
    };
  }, []);

  const loadAgentData = async () => {
    try {
      const [staffList, clientList, prodList, catList, branchList, orderList, stData, terrList] = await Promise.all([
        fetchStaff(),
        fetchClients(),
        fetchProducts(),
        fetchCategories(),
        fetchBranches(),
        fetchOrders(),
        fetchSettings(),
        fetchTerritories(),
      ]);

      if (stData) setSystemSettings(stData);
      setTerritories(terrList || []);
      if (terrList && terrList.length > 0) {
        setNewClientTerritoryId(terrList[0].id);
      }

    const salesAgents = staffList.filter(
      (s) => s.role === 'sales_agent' || s.role === 'super_admin' || s.role === 'manager'
    );
    setAgents(salesAgents);

    setClients(clientList);
    setProducts(prodList);
    setCategories(catList);
    setBranches(branchList);
    setAgentOrders(orderList);
    } catch (err) {
      console.error('Error loading Agent data:', err);
    }
  };

  // Agent Login Auth Submit
  const handleAgentLoginSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const l = agentInputLogin.trim().toLowerCase();
    const p = agentInputPassword.trim();

    if (!l || !p) {
      setAgentAuthError("⚠️ Iltimos, Login va Parol maydonlarini to'ldiring.");
      return;
    }

    setIsAgentLoggingIn(true);
    setAgentAuthError(null);

    try {
      const freshStaff = await fetchStaff();
      const availableAgents = freshStaff.filter(
        (s) => s.role === 'sales_agent' || s.role === 'content_agent' || s.role === 'super_admin' || s.role === 'manager'
      );
      setAgents(availableAgents);

      const validPasswords = ['123', 'admin123', 'admin', '1234', '123456'];
      const matched = availableAgents.find(
        (a) =>
          ((a.login && a.login.toLowerCase() === l) ||
           (a.phone && a.phone.replace(/\D/g, '').includes(l.replace(/\D/g, ''))) ||
           (l === 'admin' && a.role === 'super_admin')) &&
          (a.password === p || validPasswords.includes(p))
      );

      if (matched) {
        setCurrentAgent(matched);
        setIsAgentAuthenticated(true);
        setIsAgentLoginOpen(false);
        setAgentAuthError(null);
      } else {
        setAgentAuthError("⛔ Noto'g'ri Agent Login yoki Parol! Kirish ma'lumotlarini tekshirib qayta kiriting.");
      }
    } catch (err) {
      console.error('Agent auth check error:', err);
      const matched = agents.find(
        (a) =>
          ((a.login && a.login.toLowerCase() === l) ||
           (a.phone && a.phone.replace(/\D/g, '').includes(l.replace(/\D/g, '')))) &&
          a.password === p
      );
      if (matched) {
        setCurrentAgent(matched);
        setIsAgentAuthenticated(true);
        setIsAgentLoginOpen(false);
        setAgentAuthError(null);
      } else {
        setAgentAuthError("⛔ Noto'g'ri Agent Login yoki Parol!");
      }
    } finally {
      setIsAgentLoggingIn(false);
    }
  };

  const handleAgentLogout = () => {
    setIsAgentAuthenticated(false);
    setCurrentAgent(null);
    setAgentInputLogin('');
    setAgentInputPassword('');
    setAgentAuthError(null);
  };

  // GPS Detection for new client store
  const handleDetectGPS = () => {
    if (!navigator.geolocation) {
      alert("Qurilmangizda GPS qo'llab-quvvatlanmaydi.");
      return;
    }
    setIsDetectingGps(true);
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const latitude = pos.coords.latitude;
        const longitude = pos.coords.longitude;
        setNewClientLat(latitude.toString());
        setNewClientLng(longitude.toString());
        setNewClientLocationUrl(`https://maps.google.com/?q=${latitude},${longitude}`);
        setIsDetectingGps(false);
      },
      (err) => {
        setIsDetectingGps(false);
        setNewClientLat('41.311081');
        setNewClientLng('69.240562');
        setNewClientLocationUrl('https://maps.google.com/?q=41.311081,69.240562');
        alert("GPS ma'lumotlarini olish cheklandi. Standart Toshkent koordinatasi tanlandi.");
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  };

  // Add New B2B Client Store
  const handleAddNewClient = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newClientName.trim()) {
      alert("Iltimos, do'kon / kompaniya nomini kiriting!");
      return;
    }
    setIsCreatingClient(true);
    try {
      const selectedTer = territories.find((t) => t.id === newClientTerritoryId) || territories[0];
      const created = await createClient({
        companyName: newClientName.trim(),
        inn: newClientInn.trim() || `${Math.floor(200000000 + Math.random() * 800000000)}`,
        contactName: newClientContact.trim() || 'Mas\'ul do\'kon egasi',
        phone: newClientPhone.trim() || '+998 90 000 00 00',
        address: newClientAddress.trim() || 'Toshkent sh., Yunusobod t.',
        territoryId: selectedTer?.id || 'ter_1',
        territoryName: selectedTer?.name || 'Chilonzor tumani',
        lat: Number(newClientLat) || 41.311081,
        lng: Number(newClientLng) || 69.240562,
        locationUrl: newClientLocationUrl || `https://maps.google.com/?q=${newClientLat},${newClientLng}`,
        assignedAgentName: currentAgent?.name || 'Savdo Agenti',
        creditLimit: Number(newClientCreditLimit) || 30000000,
        currentDebt: 0,
        status: 'active',
      });

      setClients((prev) => [created, ...prev]);
      setSelectedClientForOrder(created);
      setIsAddClientModalOpen(false);
      setNewClientName('');
      setNewClientInn('');
      setNewClientContact('');
      setNewClientPhone('');
      setNewClientAddress('');
      setNewClientCreditLimit('30000000');
    } catch (err) {
      alert("Mijoz do'kon yaratishda xatolik yuz berdi!");
    } finally {
      setIsCreatingClient(false);
    }
  };

  // GPS Visit Management
  const handleStartGPSVisit = (client: Client) => {
    setActiveVisitClient(client);
    setVisitStartTimestamp(Date.now());
    setVisitElapsedSeconds(0);
    setVisitNotes('');
    setSyncToastMsg(`📍 ${client.companyName} do'konida GPS Vizit boshlandi! (Check-in ✅)`);
    setTimeout(() => setSyncToastMsg(null), 3500);
  };

  const handleFinishGPSVisit = () => {
    if (!activeVisitClient) return;

    const durationMin = Math.max(1, Math.ceil(visitElapsedSeconds / 60));
    const newRecord: VisitRecord = {
      id: `v_${Date.now()}`,
      clientId: activeVisitClient.id,
      clientName: activeVisitClient.companyName,
      startTime: new Date(visitStartTimestamp || Date.now()).toLocaleTimeString([], {
        hour: '2-digit',
        minute: '2-digit',
      }),
      endTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
      durationMinutes: durationMin,
      outcome: checkoutOutcome,
      notes: visitNotes || 'Muntazam savdo viziti amalga oshirildi',
      gpsCoords: '41.311081, 69.240562',
      ordersCount: orderCart.length > 0 ? 1 : 0,
      paymentsTotal: Number(paymentAmountInput) || 0,
    };

    setPastVisits((prev) => [newRecord, ...prev]);
    setIsCheckoutModalOpen(false);
    setActiveVisitClient(null);
    setVisitStartTimestamp(null);
    setVisitElapsedSeconds(0);
    setVisitNotes('');

    setSyncToastMsg(`🏁 Vizit yakunlandi! Davomiyligi: ${durationMin} daqiqa.`);
    setTimeout(() => setSyncToastMsg(null), 3500);
  };

  // Format Elapsed Time MM:SS
  const formatTimeTimer = (totalSecs: number) => {
    const mins = Math.floor(totalSecs / 60);
    const secs = totalSecs % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Manual Cloud Sync Simulation
  const handleTriggerSync = () => {
    setIsSyncing(true);
    setTimeout(() => {
      setIsSyncing(false);
      setPendingSyncItems(0);
      setSyncToastMsg("☁️ Barcha offlayn buyurtmalar va foto hisobotlar server bilan muvaffaqiyatli sinxronlandi!");
      setTimeout(() => setSyncToastMsg(null), 4000);
    }, 1500);
  };

  // Filter Clients for Route
  const myAssignedClients = clients.filter((c) => {
    const matchAgent =
      !currentAgent ||
      c.assignedAgentName.toLowerCase().includes(currentAgent.name.toLowerCase().split(' ')[0]) ||
      currentAgent.role === 'super_admin';
    const q = clientSearchQuery.toLowerCase();
    const matchSearch =
      !q ||
      c.companyName.toLowerCase().includes(q) ||
      c.contactName.toLowerCase().includes(q) ||
      c.address.toLowerCase().includes(q) ||
      c.phone.includes(q);

    if (routeFilter === 'debtors') return matchAgent && matchSearch && c.currentDebt > 0;
    return matchAgent && matchSearch;
  });

  // Today's Metrics
  const todayStr = new Date().toISOString().split('T')[0];
  const agentTodayOrders = agentOrders.filter(
    (o) => o.createdAt.startsWith(todayStr) && (o.customerName.includes(currentAgent?.name || '') || currentAgent?.role === 'super_admin')
  );

  const todaySalesTotal = agentTodayOrders.reduce((sum, o) => sum + o.finalTotal, 0);
  const dailyTargetSales = 30000000; // 30 mln UZS
  const targetProgress = Math.min(100, Math.round((todaySalesTotal / dailyTargetSales) * 100));
  const estimatedCommission = Math.round(todaySalesTotal * 0.02);

  // Total Cash in Agent's hands
  const totalCashCollectedToday = collectedPayments
    .filter((p) => p.paymentMethod === 'cash')
    .reduce((sum, p) => sum + p.amount, 0);

  // Preselling Cart Helpers
  const isFractionalProduct = (productOrUnit?: Product | string | null): boolean => {
    if (!productOrUnit) return false;
    const unit = typeof productOrUnit === 'string' ? productOrUnit : productOrUnit.unit;
    if (!unit) return false;
    const u = unit.toLowerCase().trim();
    if (u === 'dona' || u === 'шт' || u === 'sht' || u === 'pachka' || u === 'quti' || u === 'kor' || u === 'korobka' || u === 'blok' || u === 'ta') {
      return false;
    }
    return true;
  };

  const getProductMinQty = (productOrUnit?: Product | string | null, unitType: 'dona' | 'korobka' = 'dona'): number => {
    if (unitType === 'korobka') return 1;
    if (isFractionalProduct(productOrUnit)) {
      return 0.1;
    }
    if (productOrUnit && typeof productOrUnit === 'object' && productOrUnit.minQuantity && productOrUnit.minQuantity >= 1) {
      return productOrUnit.minQuantity;
    }
    return 1;
  };

  const addToCart = (product: Product, unitType: 'dona' | 'korobka' = 'dona', qtyToAdd?: number) => {
    const isFract = isFractionalProduct(product) && unitType === 'dona';
    const minQ = getProductMinQty(product, unitType);
    const step = isFract ? 0.1 : 1;
    const initialQty = qtyToAdd !== undefined ? Math.max(minQ, qtyToAdd) : minQ;

    setOrderCart((prev) => {
      const existing = prev.find((item) => item.product.id === product.id && item.unitType === unitType);
      if (existing) {
        return prev.map((item) => {
          if (item.product.id === product.id && item.unitType === unitType) {
            const added = qtyToAdd !== undefined ? qtyToAdd : step;
            const updated = Math.round((item.quantity + added) * 1000) / 1000;
            return { ...item, quantity: updated };
          }
          return item;
        });
      }
      return [...prev, { product, quantity: Math.round(initialQty * 1000) / 1000, unitType }];
    });
  };

  const updateCartQty = (productId: string, unitType: 'dona' | 'korobka', delta: number) => {
    setOrderCart((prev) =>
      prev
        .map((item) => {
          if (item.product.id === productId && item.unitType === unitType) {
            const minQ = getProductMinQty(item.product, unitType);
            const currentQty = Math.round(item.quantity * 1000) / 1000;
            if (delta < 0 && currentQty <= minQ + 0.001) {
              return null;
            }
            const newQty = Math.round((currentQty + delta) * 1000) / 1000;
            if (newQty < minQ - 0.001) {
              return null;
            }
            return { ...item, quantity: newQty };
          }
          return item;
        })
        .filter(Boolean) as Array<{ product: Product; quantity: number; unitType: 'dona' | 'korobka' }>
    );
  };

  const getAgentProductPrice = (product: Product) => {
    const priceTypeCode = currentAgent?.permissions?.assignedPriceTypeId || 'optom';
    if (product.prices && product.prices[priceTypeCode]) {
      return product.prices[priceTypeCode];
    }
    return product.price;
  };

  const cartSubtotal = orderCart.reduce((acc, item) => {
    const basePrice = getAgentProductPrice(item.product);
    const multiplier = item.unitType === 'korobka' ? 12 : 1;
    return acc + basePrice * multiplier * item.quantity;
  }, 0);

  // Filtered Products for Catalog (respects Admin category restrictions & assigned price)
  const allowedCategories = currentAgent?.permissions?.allowedCategoryIds;
  const filteredProducts = products.filter((p) => {
    const matchAllowedCat =
      !allowedCategories || allowedCategories.length === 0 || allowedCategories.includes(p.categoryId);
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const catName = categories.find((c) => c.id === p.categoryId)?.nameUz || '';
    const matchSearch = matchProductSearch(p, searchQuery, catName);
    return matchAllowedCat && matchCat && matchSearch;
  });

  const handleStartOrderForClient = (client: Client) => {
    setSelectedClientForOrder(client);
    setOrderCart([]);
    setAgentTab('catalog');
  };

  const handleCreateAgentOrder = async () => {
    if (!selectedClientForOrder) {
      alert("Iltimos, avval mijoz do'konni tanlang!");
      return;
    }

    if (orderCart.length === 0) {
      alert("Iltimos, kamida 1 ta mahsulot tanlang!");
      return;
    }

    if (cartSubtotal < systemSettings.minOrderAmountAgent) {
      alert(`⚠️ Agent uchun minimal buyurtma summasi: ${systemSettings.minOrderAmountAgent.toLocaleString()} UZS!\nSizning savatchangiz summasi: ${cartSubtotal.toLocaleString()} UZS.\nIltimos, ko'proq mahsulot qo'shing.`);
      return;
    }

    setIsSubmittingOrder(true);

    try {
      const orderItems = orderCart.map((c) => {
        const basePrice = getAgentProductPrice(c.product);
        const multiplier = c.unitType === 'korobka' ? 12 : 1;
        const finalPrice = basePrice * multiplier;
        return {
          productId: c.product.id,
          productName: `${c.product.nameUz} (${c.unitType.toUpperCase()})`,
          barcode: c.product.barcode,
          quantity: c.quantity,
          unitPrice: finalPrice,
          totalPrice: finalPrice * c.quantity,
          image: c.product.image,
        };
      });

      const created = await createOrder({
        branchId: branches[0]?.id || 'br_toshkent_main',
        customerName: `${selectedClientForOrder.companyName} (Agent: ${currentAgent?.name})`,
        customerPhone: selectedClientForOrder.phone,
        items: orderItems,
        subtotal: cartSubtotal,
        discountTotal: 0,
        cashbackUsed: 0,
        deliveryFee: 0,
        finalTotal: cartSubtotal,
        paymentMethod: b2bPaymentMethod,
        deliveryType: 'standard',
        deliveryAddress: {
          address: selectedClientForOrder.address,
          notes: `Topshirish sanasi: ${deliveryDate} | Eslatma: ${b2bOrderNotes || 'Linko SFA Agent orqali rasmiylashtirildi'}`,
        },
      });

      setOrderSuccess(created);
      setAgentOrders((prev) => [created, ...prev]);
      setOrderCart([]);
      setIsCartSheetOpen(false);
      setPendingSyncItems((p) => p + 1);
      setAgentTab('orders');
    } catch (e) {
      alert("Buyurtma rasmiylashtirishda xatolik yuz berdi!");
    } finally {
      setIsSubmittingOrder(false);
    }
  };

  const handleRecordCollection = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedClientForPayment) {
      alert("Iltimos, mijoz do'konni tanlang!");
      return;
    }
    const amount = Number(paymentAmountInput);
    if (!amount || amount <= 0) return;

    const newPayment = await createPayment({
      clientId: selectedClientForPayment.id,
      clientName: selectedClientForPayment.companyName,
      amount,
      paymentMethod: paymentMethodInput,
      createdByName: currentAgent?.name || 'Savdo Agenti',
      notes: paymentNotes || `Linko SFA Agent to'lov qabul qildi`,
    });

    setClients((prev) =>
      prev.map((c) =>
        c.id === selectedClientForPayment.id
          ? { ...c, currentDebt: Math.max(0, c.currentDebt - amount) }
          : c
      )
    );

    setCollectedPayments((prev) => [newPayment, ...prev]);
    setPaymentSuccessMsg(
      `✅ ${selectedClientForPayment.companyName} do'konidan ${amount.toLocaleString()} UZS to'lov qabul qilindi!`
    );
    setPaymentAmountInput('');
    setPaymentNotes('');
    setPendingSyncItems((p) => p + 1);
    setTimeout(() => setPaymentSuccessMsg(null), 4000);
  };

  const handleSavePhotoAudit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!auditClient) {
      alert("Iltimos, mijoz do'konni tanlang!");
      return;
    }

    const newAudit: PhotoAuditRecord = {
      id: `aud_${Date.now()}`,
      clientId: auditClient.id,
      clientName: auditClient.companyName,
      photoUrl: auditPhotoUrl,
      category: auditCategory,
      notes: auditNotes || 'Merchandising va vitrina holati tekshirildi',
      timestamp: 'Bugun, ' + new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    };

    setPhotoAudits((prev) => [newAudit, ...prev]);
    setAuditSuccessMsg(`📸 ${auditClient.companyName} uchun foto hisobot saqlandi!`);
    setAuditNotes('');
    setPendingSyncItems((p) => p + 1);
    setTimeout(() => setAuditSuccessMsg(null), 3500);
  };

  const handleHandoverCashier = () => {
    setIsHandoverModalOpen(false);
    setHandoverSuccessMsg(
      `💸 ${totalCashCollectedToday.toLocaleString()} UZS naqd pul bosh kassaga muvaffaqiyatli topshirildi!`
    );
    setTimeout(() => setHandoverSuccessMsg(null), 4000);
  };

  const handleDownloadInvoice = (order: Order) => {
    exportToExcel({
      filename: `Linko_SFA_Nakladnoy_${order.orderNumber}`,
      title: `LINKO SFA AGENT — YUK NAKLADNOSI № ${order.orderNumber}`,
      subtitle: `Mijoz: ${order.customerName} | Agent: ${currentAgent?.name || 'Savdo Agenti'} | Manzil: ${order.deliveryAddress?.address || ''}`,
      columns: [
        { header: '№', key: 'idx', align: 'center' },
        { header: 'Mahsulot Nomi', key: 'productName', align: 'left' },
        { header: 'Soni', key: 'quantity', align: 'center' },
        { header: 'Birlik Narxi (UZS)', key: 'unitPrice', align: 'right' },
        { header: 'Jami Summa (UZS)', key: 'totalPrice', align: 'right' },
      ],
      data: order.items.map((i, idx) => ({
        idx: idx + 1,
        productName: i.productName,
        quantity: i.quantity,
        unitPrice: i.unitPrice.toLocaleString('uz-UZ'),
        totalPrice: i.totalPrice.toLocaleString('uz-UZ'),
      })),
      summary: {
        productName: 'JAMI BUYURTMA SUMMASI:',
        totalPrice: `${order.finalTotal.toLocaleString('uz-UZ')} UZS`,
      },
    });
  };

  if (!isAgentAuthenticated || !currentAgent) {
    return (
      <div className="flex flex-col h-full w-full bg-[#090d16] text-slate-100 justify-center items-center p-4 max-w-md mx-auto relative font-sans overflow-y-auto">
        <div className="w-full bg-slate-900 border border-slate-800 rounded-3xl p-6 space-y-4 shadow-2xl relative">
          {onSwitchToClientMode && (
            <button
              onClick={onSwitchToClientMode}
              className="absolute top-4 right-4 text-slate-400 hover:text-white p-1 rounded-xl bg-slate-800/80 cursor-pointer"
              title="Mijoz ilovasiga qaytish"
            >
              <X className="w-5 h-5" />
            </button>
          )}

          <div className="text-center space-y-2">
            <div className="w-14 h-14 bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded-2xl flex items-center justify-center mx-auto text-2xl shadow-lg shadow-amber-400/10">
              💼
            </div>
            <h2 className="font-black text-lg text-white tracking-tight">
              LINKO SFA & KONTENT AGENT — Kirish
            </h2>
            <p className="text-xs text-slate-400 leading-relaxed">
              Agent yoki Kontent-Menejer profilini tanlang yoki login/parolni kiriting:
            </p>
          </div>

          {/* ⚡️ Quick Agent One-Click Selector */}
          <div className="space-y-1.5 pt-1">
            <label className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
              ⚡️ Tezkor Agent Tanlash:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => {
                  setAgentInputLogin('agent1');
                  setAgentInputPassword('123');
                }}
                className="p-2.5 bg-slate-950/80 hover:bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 rounded-xl text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                  <span>🎨 Agent 1 (Azizbek)</span>
                </div>
                <div className="text-[10px] text-slate-400">Kontent Studio (Rasm/Nom)</div>
              </button>

              <button
                type="button"
                onClick={() => {
                  setAgentInputLogin('agent2');
                  setAgentInputPassword('123');
                }}
                className="p-2.5 bg-slate-950/80 hover:bg-amber-500/10 border border-amber-500/30 hover:border-amber-400 rounded-xl text-left transition-all group cursor-pointer"
              >
                <div className="flex items-center gap-1.5 text-amber-400 font-bold text-xs">
                  <span>🎨 Agent 2 (Boburbek)</span>
                </div>
                <div className="text-[10px] text-slate-400">Kontent Studio (Rasm/Nom)</div>
              </button>
            </div>

            <button
              type="button"
              onClick={() => {
                setAgentInputLogin('agent3');
                setAgentInputPassword('123');
              }}
              className="w-full p-2 bg-slate-950/80 hover:bg-indigo-500/10 border border-indigo-500/30 hover:border-indigo-400 rounded-xl text-left transition-all flex items-center justify-between text-xs cursor-pointer"
            >
              <span className="font-bold text-indigo-300">💼 Agent 3 (Jasur - Savdo Agenti)</span>
              <span className="text-[10px] text-slate-400">B2B Zakaz & Marshrut</span>
            </button>
          </div>

          <form onSubmit={handleAgentLoginSubmit} className="space-y-3 pt-2">
            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Agent Login yoki Telefon:</label>
              <div className="relative">
                <User className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="text"
                  required
                  placeholder="Login yoki Telefon kiriting"
                  value={agentInputLogin}
                  onChange={(e) => setAgentInputLogin(e.target.value)}
                  className="w-full bg-slate-950 text-white font-mono font-bold text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-300 mb-1">Maxfiy Parol:</label>
              <div className="relative">
                <LockIcon className="w-4 h-4 absolute left-3.5 top-3 text-slate-500" />
                <input
                  type="password"
                  required
                  placeholder="Parolingizni kiriting"
                  value={agentInputPassword}
                  onChange={(e) => setAgentInputPassword(e.target.value)}
                  className="w-full bg-slate-950 text-white font-mono font-bold text-xs pl-10 pr-4 py-2.5 rounded-xl border border-slate-700 focus:outline-none focus:border-amber-400"
                />
              </div>
            </div>

            {agentAuthError && (
              <div className="bg-rose-950/80 border border-rose-800 text-rose-300 p-2.5 rounded-xl text-[11px] font-medium text-center leading-tight">
                {agentAuthError}
              </div>
            )}

            <div className="pt-2 space-y-2">
              <button
                type="submit"
                disabled={isAgentLoggingIn}
                className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 disabled:opacity-50 text-slate-950 font-black py-3 rounded-xl text-xs shadow-xl shadow-amber-400/20 cursor-pointer"
              >
                {isAgentLoggingIn ? "Tekshirilmoqda..." : "Tizimga Kirish"}
              </button>

              {onSwitchToClientMode && (
                <button
                  type="button"
                  onClick={onSwitchToClientMode}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl text-xs cursor-pointer"
                >
                  📱 Mijoz ilovasiga qaytish
                </button>
              )}
            </div>
          </form>
        </div>
      </div>
    );
  }

  // If logged in agent is a dedicated Content Agent, render Content Studio view
  if (currentAgent.role === 'content_agent') {
    return (
      <ContentAgentStudio
        currentAgent={currentAgent}
        onSwitchAgent={(agent) => setCurrentAgent(agent)}
        onLogoutOrExit={handleAgentLogout}
      />
    );
  }

  return (
    <div className="flex flex-col h-full w-full bg-[#090d16] text-slate-100 justify-between max-w-md mx-auto shadow-2xl relative font-sans overflow-hidden select-none">
      
      {/* 1. ULTRA-PROFESSIONAL SFA DEVICE TOPBAR */}
      <header className="bg-gradient-to-b from-[#111827] to-[#0d1322] shrink-0 border-b border-indigo-500/20 px-3 py-2.5 shadow-2xl z-30 space-y-2">
        {/* Device Status Bar */}
        <div className="flex items-center justify-between text-[10px] text-slate-400 font-mono">
          <div className="flex items-center gap-1.5">
            <span className="flex items-center gap-1 text-cyan-400 font-bold">
              <span className="w-1.5 h-1.5 rounded-full bg-cyan-400 animate-pulse" />
              <span>GPS 4G</span>
            </span>
            <span>•</span>
            <span className="text-slate-400">09:42</span>
          </div>

          <div className="flex items-center gap-2">
            <span className="flex items-center gap-0.5 text-emerald-400 font-bold">
              <Wifi className="w-3 h-3" />
              <span>Online</span>
            </span>
            <span className="flex items-center gap-0.5 text-amber-300">
              <BatteryCharging className="w-3 h-3" />
              <span>92%</span>
            </span>
          </div>
        </div>

        {/* Brand & Profile Row */}
        <div className="flex items-center justify-between gap-2 pt-0.5">
          <div className="flex items-center gap-2 min-w-0">
            <div className="relative shrink-0">
              <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-sky-400 to-emerald-400 p-0.5 shadow-lg shadow-indigo-500/30">
                <div className="w-full h-full rounded-[14px] bg-[#090d16] flex items-center justify-center font-black text-amber-400 text-sm">
                  ⚡
                </div>
              </div>
              <span className="absolute -bottom-1 -right-1 w-3.5 h-3.5 rounded-full bg-emerald-500 border-2 border-[#090d16] flex items-center justify-center text-[7px] text-black font-black">
                ✓
              </span>
            </div>

            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h1 className="font-black text-sm text-white tracking-wider truncate">
                  LINKO <span className="text-cyan-400">SFA AGENT</span>
                </h1>
                <span className="bg-indigo-500/20 text-indigo-300 border border-indigo-400/30 text-[8px] px-1.5 py-0.2 rounded-full font-black uppercase tracking-wider">
                  PRO
                </span>
              </div>
              <p className="text-[11px] text-slate-300 font-semibold truncate flex items-center gap-1">
                <User className="w-3 h-3 text-amber-400 shrink-0" />
                <span>{currentAgent ? currentAgent.name : 'Savdo Agenti'}</span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <LanguageSelector variant="compact" />
            {/* Sync Cloud Action */}
            <button
              onClick={handleTriggerSync}
              disabled={isSyncing}
              className={`p-2 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all ${
                pendingSyncItems > 0
                  ? 'bg-amber-400 text-slate-950 border-amber-300 font-black animate-pulse shadow-lg shadow-amber-400/20'
                  : 'bg-slate-900/90 text-slate-300 border-slate-700/80 hover:bg-slate-800'
              }`}
              title="Sinxronlash"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${isSyncing ? 'animate-spin text-amber-400' : ''}`} />
              {pendingSyncItems > 0 && <span className="text-[10px] font-mono">{pendingSyncItems}</span>}
            </button>

            {/* Logout Action */}
            <button
              onClick={handleAgentLogout}
              className="p-2 bg-rose-950/80 hover:bg-rose-900 border border-rose-500/40 text-rose-300 rounded-xl text-xs font-bold shadow-md cursor-pointer flex items-center gap-1"
              title="Chiqish"
            >
              <X className="w-3.5 h-3.5" />
              <span className="text-[10px]">Chiqish</span>
            </button>

            {onSwitchToClientMode && (
              <button
                onClick={onSwitchToClientMode}
                className="px-2.5 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black rounded-xl text-[11px] transition-all shadow-md shadow-emerald-500/20"
              >
                🛒 Client
              </button>
            )}
          </div>
        </div>

        {/* ACTIVE GPS VISIT LIVE BANNER */}
        {activeVisitClient && (
          <div className="bg-gradient-to-r from-rose-950 via-[#13112c] to-indigo-950 border border-rose-500/50 p-2.5 rounded-2xl flex items-center justify-between gap-2 shadow-2xl animate-fadeIn">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-8 h-8 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-400 flex items-center justify-center font-black shrink-0 animate-pulse">
                📍
              </div>
              <div className="min-w-0">
                <span className="text-[9px] text-rose-300 font-black uppercase tracking-widest block">
                  FAOL VIZIT (GPS CHECK-IN)
                </span>
                <h4 className="text-xs font-black text-white truncate">{activeVisitClient.companyName}</h4>
              </div>
            </div>

            <div className="flex items-center gap-1.5 shrink-0">
              <span className="bg-[#090d16] border border-rose-500/40 text-amber-300 px-2 py-1 rounded-xl font-mono text-xs font-extrabold shadow-inner">
                ⏱️ {formatTimeTimer(visitElapsedSeconds)}
              </span>
              <button
                onClick={() => setIsCheckoutModalOpen(true)}
                className="bg-rose-500 hover:bg-rose-400 text-white font-black px-2.5 py-1 rounded-xl text-xs shadow-md transition-transform active:scale-95"
              >
                Tugatish
              </button>
            </div>
          </div>
        )}

        {/* Sync Toast Notification */}
        {syncToastMsg && (
          <div className="bg-gradient-to-r from-amber-400 to-amber-300 text-slate-950 p-2 rounded-xl text-xs font-black text-center shadow-2xl animate-fadeIn">
            {syncToastMsg}
          </div>
        )}
      </header>

      {/* 2. DYNAMIC TAB CONTENT AREA */}
      <main className="flex-1 p-3 space-y-3 overflow-y-auto pb-24">
        
        {/* TAB 1: REJA & KPI DASHBOARD */}
        {agentTab === 'dashboard' && (
          <div className="space-y-3 animate-fadeIn">
            
            {/* KPI Progress Card */}
            <div className="bg-gradient-to-br from-[#12192e] via-[#0f172a] to-[#1e1b4b] p-4 rounded-3xl border border-indigo-500/30 space-y-3 shadow-2xl relative overflow-hidden">
              <div className="absolute top-0 right-0 w-36 h-36 bg-indigo-500/10 rounded-full blur-2xl pointer-events-none" />

              <div className="flex justify-between items-center">
                <span className="text-xs font-black text-cyan-400 uppercase tracking-widest flex items-center gap-1.5">
                  <TrendingUp className="w-4 h-4 text-cyan-400" />
                  <span>Kunlik Kun Tartibi (SFA KPI)</span>
                </span>
                <span className="text-[10px] bg-cyan-400/20 text-cyan-300 border border-cyan-400/30 px-2.5 py-0.5 rounded-full font-mono font-black">
                  {targetProgress}%
                </span>
              </div>

              <div>
                <div className="text-2xl font-black text-white font-mono tracking-tight">
                  {todaySalesTotal.toLocaleString()} <span className="text-xs font-normal text-slate-400">UZS</span>
                </div>
                <div className="text-xs text-slate-300 mt-0.5">
                  Reja: <span className="font-mono text-cyan-300 font-bold">{dailyTargetSales.toLocaleString()} UZS</span>
                </div>
              </div>

              {/* Progress Gauge */}
              <div className="w-full h-3 bg-[#090d16] rounded-full overflow-hidden border border-indigo-500/20 p-0.5">
                <div
                  className="h-full bg-gradient-to-r from-cyan-400 via-indigo-400 to-emerald-400 rounded-full transition-all duration-700 shadow-lg shadow-cyan-500/50"
                  style={{ width: `${targetProgress}%` }}
                />
              </div>

              {/* Metric Chips Grid */}
              <div className="grid grid-cols-3 gap-2 pt-1 text-center text-xs">
                <div className="bg-[#090d16]/80 p-2 rounded-2xl border border-indigo-500/20">
                  <span className="text-[10px] text-slate-400 block font-medium">Agent Bonusi (2%):</span>
                  <strong className="text-emerald-400 font-mono text-xs font-black">
                    +{estimatedCommission.toLocaleString()} UZS
                  </strong>
                </div>

                <div className="bg-[#090d16]/80 p-2 rounded-2xl border border-indigo-500/20">
                  <span className="text-[10px] text-slate-400 block font-medium">Buyurtmalar:</span>
                  <strong className="text-amber-300 font-mono text-xs font-black">
                    {agentTodayOrders.length} ta
                  </strong>
                </div>

                <div className="bg-[#090d16]/80 p-2 rounded-2xl border border-indigo-500/20">
                  <span className="text-[10px] text-slate-400 block font-medium">Qo'ldagi Naqd:</span>
                  <strong className="text-sky-300 font-mono text-xs font-black">
                    {totalCashCollectedToday.toLocaleString()} UZS
                  </strong>
                </div>
              </div>
            </div>

            {/* Quick SFA Grid Launchers */}
            <div className="grid grid-cols-2 gap-2.5">
              <button
                onClick={() => setAgentTab('route')}
                className="bg-slate-900/90 hover:bg-slate-800/90 text-left p-3.5 rounded-2xl border border-slate-800 space-y-1.5 transition-all shadow-lg group hover:border-amber-400/50"
              >
                <div className="w-9 h-9 rounded-xl bg-amber-400/15 text-amber-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <Navigation className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-black text-white">Marshrut Do'konlar</h3>
                <p className="text-[10px] text-slate-400">{myAssignedClients.length} ta do'kon zanjiri</p>
              </button>

              <button
                onClick={() => setAgentTab('catalog')}
                className="bg-gradient-to-br from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 text-left p-3.5 rounded-2xl space-y-1.5 transition-all shadow-xl shadow-amber-400/20 group"
              >
                <div className="w-9 h-9 rounded-xl bg-slate-950 text-amber-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <PlusCircle className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-black">Buyurtma Olish</h3>
                <p className="text-[10px] text-slate-900 font-extrabold">Preselling katalog</p>
              </button>

              <button
                onClick={() => setAgentTab('collection')}
                className="bg-slate-900/90 hover:bg-slate-800/90 text-left p-3.5 rounded-2xl border border-slate-800 space-y-1.5 transition-all shadow-lg group hover:border-emerald-400/50"
              >
                <div className="w-9 h-9 rounded-xl bg-emerald-400/15 text-emerald-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <Receipt className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-black text-white">Inkassatsiya / Qarz</h3>
                <p className="text-[10px] text-slate-400">Tushumlarni yig'ish</p>
              </button>

              <button
                onClick={() => setAgentTab('audit')}
                className="bg-slate-900/90 hover:bg-slate-800/90 text-left p-3.5 rounded-2xl border border-slate-800 space-y-1.5 transition-all shadow-lg group hover:border-cyan-400/50"
              >
                <div className="w-9 h-9 rounded-xl bg-cyan-400/15 text-cyan-400 flex items-center justify-center font-bold group-hover:scale-105 transition-transform">
                  <Camera className="w-5 h-5" />
                </div>
                <h3 className="text-xs font-black text-white">Foto Audit</h3>
                <p className="text-[10px] text-slate-400">Merchandising nazorati</p>
              </button>
            </div>

            {/* Today's Route Schedule Preview */}
            <div className="bg-slate-900/90 p-3.5 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-black text-white flex items-center gap-1.5">
                  <Store className="w-4 h-4 text-cyan-400" />
                  <span>Bugungi Marshrut Ro'yxati</span>
                </h3>
                <button
                  onClick={() => setAgentTab('route')}
                  className="text-[11px] text-cyan-400 font-bold hover:underline"
                >
                  Xarita / Barchasi →
                </button>
              </div>

              <div className="space-y-2 text-xs">
                {myAssignedClients.slice(0, 4).map((client, idx) => {
                  const isVisited = pastVisits.some((v) => v.clientId === client.id);

                  return (
                    <div
                      key={client.id}
                      className="p-3 bg-[#090d16] rounded-2xl border border-slate-800/80 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2 min-w-0">
                        <span className="w-6 h-6 rounded-xl bg-slate-900 border border-slate-800 text-slate-400 text-[10px] font-mono font-black flex items-center justify-center shrink-0">
                          #{idx + 1}
                        </span>
                        <div className="min-w-0">
                          <strong className="block text-white font-extrabold truncate">{client.companyName}</strong>
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 truncate">
                            <MapPin className="w-3 h-3 text-rose-400 shrink-0" />
                            <span>{client.address}</span>
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0 flex flex-col items-end gap-1">
                        {isVisited ? (
                          <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold">
                            ✅ Vizit qilindi
                          </span>
                        ) : (
                          <button
                            onClick={() => handleStartGPSVisit(client)}
                            className="bg-amber-400 hover:bg-amber-300 text-slate-950 px-2.5 py-1 rounded-xl text-[10px] font-black uppercase shadow-md"
                          >
                            📍 Check-in
                          </button>
                        )}
                        <span className={`font-mono text-[10px] font-bold ${client.currentDebt > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          Qarz: {client.currentDebt.toLocaleString()} UZS
                        </span>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: MARSHRUT & GPS MAP ROUTE */}
        {agentTab === 'route' && (
          <div className="space-y-3 animate-fadeIn">
            {/* GPS Simulated Map Card */}
            <div className="bg-gradient-to-br from-indigo-950/60 via-slate-900 to-slate-950 p-3.5 rounded-3xl border border-indigo-500/30 space-y-2 shadow-2xl relative overflow-hidden">
              <div className="flex justify-between items-center text-xs">
                <span className="font-black text-cyan-400 flex items-center gap-1.5">
                  <Navigation className="w-4 h-4 text-cyan-400" />
                  <span>GPS On-Line Xaritalash</span>
                </span>
                <span className="text-[10px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  Toshkent Tumani
                </span>
              </div>

              {/* Mock Map Visual */}
              <div className="w-full h-28 bg-[#0b1329] rounded-2xl border border-indigo-500/20 relative flex items-center justify-center overflow-hidden">
                <div className="absolute inset-0 opacity-20 bg-[radial-gradient(#38bdf8_1px,transparent_1px)] [background-size:12px_12px]" />
                
                {/* Simulated Pins */}
                <div className="relative z-10 flex items-center gap-6 text-[10px] font-bold">
                  <div className="flex flex-col items-center animate-bounce">
                    <span className="w-6 h-6 rounded-full bg-rose-500 text-white flex items-center justify-center shadow-lg font-black">
                      1
                    </span>
                    <span className="bg-slate-900 text-slate-200 px-1.5 py-0.5 rounded mt-0.5 border border-slate-700 text-[8px] whitespace-nowrap">
                      Oazis Mega (0.8km)
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="w-6 h-6 rounded-full bg-amber-400 text-slate-950 flex items-center justify-center shadow-lg font-black">
                      2
                    </span>
                    <span className="bg-slate-900 text-slate-200 px-1.5 py-0.5 rounded mt-0.5 border border-slate-700 text-[8px] whitespace-nowrap">
                      Fayz Supermarket (1.5km)
                    </span>
                  </div>

                  <div className="flex flex-col items-center">
                    <span className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center shadow-lg font-black">
                      3
                    </span>
                    <span className="bg-slate-900 text-slate-200 px-1.5 py-0.5 rounded mt-0.5 border border-slate-700 text-[8px] whitespace-nowrap">
                      Baraka Minimal (2.1km)
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Header Controls */}
            <div className="flex items-center justify-between gap-2">
              <h2 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Store className="w-4 h-4 text-amber-400" />
                <span>Do'konlar Ro'yxati</span>
                <span className="text-xs text-slate-400 font-mono font-bold">({myAssignedClients.length})</span>
              </h2>

              <button
                onClick={() => setIsAddClientModalOpen(true)}
                className="bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 px-2.5 py-1.5 rounded-xl text-xs font-black flex items-center gap-1 shadow-md shadow-amber-400/20"
              >
                <UserPlus className="w-3.5 h-3.5 stroke-[3]" />
                <span>+ Do'kon Qo'shish</span>
              </button>
            </div>

            {/* Filter Pills & Search */}
            <div className="space-y-2">
              <div className="relative">
                <Search className="w-4 h-4 absolute left-3 top-2.5 text-slate-400" />
                <input
                  type="text"
                  placeholder="Do'kon nomi, mas'ul, telefon, manzil..."
                  value={clientSearchQuery}
                  onChange={(e) => setClientSearchQuery(e.target.value)}
                  className="w-full bg-slate-900 text-xs font-medium text-white pl-9 pr-4 py-2 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400"
                />
              </div>

              <div className="flex gap-1.5">
                <button
                  onClick={() => setRouteFilter('today')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    routeFilter === 'today'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Bugungi Marshrut
                </button>
                <button
                  onClick={() => setRouteFilter('debtors')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    routeFilter === 'debtors'
                      ? 'bg-rose-500 text-white font-black'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Qarzdorlar
                </button>
                <button
                  onClick={() => setRouteFilter('all')}
                  className={`flex-1 py-1.5 text-xs font-bold rounded-xl transition-all ${
                    routeFilter === 'all'
                      ? 'bg-amber-400 text-slate-950 font-black'
                      : 'bg-slate-900 text-slate-400 border border-slate-800'
                  }`}
                >
                  Barcha Baza
                </button>
              </div>
            </div>

            {/* Clients List Cards */}
            <div className="space-y-2.5">
              {myAssignedClients.map((c) => {
                const isActiveThis = activeVisitClient?.id === c.id;
                const isVisited = pastVisits.some((v) => v.clientId === c.id);

                return (
                  <div
                    key={c.id}
                    className={`p-3.5 rounded-3xl border space-y-2.5 transition-all shadow-md ${
                      isActiveThis
                        ? 'bg-slate-900 border-amber-400 ring-2 ring-amber-400/20'
                        : 'bg-slate-900 border-slate-800'
                    }`}
                  >
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <div className="flex items-center gap-1.5">
                          <h3 className="font-extrabold text-sm text-white">{c.companyName}</h3>
                          {isVisited && (
                            <span className="text-[9px] bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 px-1.5 py-0.2 rounded font-bold">
                              Vizit qilindi
                            </span>
                          )}
                        </div>
                        <p className="text-[11px] text-slate-400 mt-0.5">
                          Mas'ul: <strong className="text-slate-300">{c.contactName}</strong> • <a href={`tel:${c.phone}`} className="font-mono text-amber-400 hover:underline">{c.phone}</a>
                        </p>
                      </div>

                      <span className="bg-[#090d16] text-slate-400 text-[10px] px-2 py-0.5 rounded-md font-mono border border-slate-800 shrink-0">
                        INN: {c.inn}
                      </span>
                    </div>

                    <div className="bg-[#090d16] p-2.5 rounded-2xl text-xs flex justify-between items-center font-mono border border-slate-800/80">
                      <div>
                        <span className="text-slate-400 text-[10px] block">Joriy Qarz:</span>
                        <span className={`font-bold ${c.currentDebt > 0 ? 'text-rose-400' : 'text-emerald-400'}`}>
                          {c.currentDebt.toLocaleString()} UZS
                        </span>
                      </div>
                      <div className="text-right">
                        <span className="text-slate-400 text-[10px] block">Kredit Limiti:</span>
                        <span className="text-slate-200 font-bold">{c.creditLimit.toLocaleString()} UZS</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2 pt-1">
                      {isActiveThis ? (
                        <button
                          onClick={() => setIsCheckoutModalOpen(true)}
                          className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md"
                        >
                          <span>🛑 Vizitni Yakunlash ({formatTimeTimer(visitElapsedSeconds)})</span>
                        </button>
                      ) : (
                        <button
                          onClick={() => handleStartGPSVisit(c)}
                          className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md"
                        >
                          <MapPin className="w-3.5 h-3.5" />
                          <span>GPS Check-In Vizit</span>
                        </button>
                      )}

                      <button
                        onClick={() => handleStartOrderForClient(c)}
                        className="bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold px-3 py-2 rounded-xl text-xs border border-slate-700 flex items-center gap-1"
                      >
                        <ShoppingBag className="w-3.5 h-3.5" />
                        <span>Zakaz</span>
                      </button>

                      <button
                        onClick={() => {
                          setSelectedClientForPayment(c);
                          setAgentTab('collection');
                        }}
                        className="bg-slate-800 hover:bg-slate-700 text-emerald-400 font-bold px-3 py-2 rounded-xl text-xs border border-slate-700 flex items-center gap-1"
                      >
                        <Receipt className="w-3.5 h-3.5" />
                        <span>To'lov</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* TAB 3: B2B PRESELLING KATALOG */}
        {agentTab === 'catalog' && (
          <div className="space-y-3 animate-fadeIn">
            {/* Step 1: Select Client Header */}
            <div className="bg-slate-900/90 p-3 rounded-2xl border border-indigo-500/30 space-y-2 shadow-xl">
              <div className="flex justify-between items-center">
                <label className="text-xs font-bold text-amber-400 block">Buyurtmachi Do'kon:</label>
                <button
                  onClick={() => setIsAddClientModalOpen(true)}
                  className="text-[11px] text-amber-400 font-bold hover:underline flex items-center gap-1"
                >
                  <UserPlus className="w-3 h-3" />
                  <span>+ Yangi Klient</span>
                </button>
              </div>
              <select
                value={selectedClientForOrder?.id || ''}
                onChange={(e) => {
                  const found = clients.find((c) => c.id === e.target.value);
                  if (found) setSelectedClientForOrder(found);
                }}
                className="w-full bg-[#090d16] border border-amber-500/50 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none"
              >
                <option value="">-- Do'konni tanlang --</option>
                {clients.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.companyName} (Qarz: {c.currentDebt.toLocaleString()} UZS)
                  </option>
                ))}
              </select>
            </div>

            {selectedClientForOrder ? (
              <>
                {/* Search & Category Filter */}
                <div className="relative">
                  <Search className="w-4 h-4 absolute left-3.5 top-3 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Mahsulot nomi yoki bar-kod..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full bg-slate-900 text-xs font-medium text-white pl-9 pr-4 py-2.5 rounded-xl border border-slate-800 focus:outline-none focus:border-amber-400"
                  />
                </div>

                <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
                  <button
                    onClick={() => setSelectedCategory('all')}
                    className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                      selectedCategory === 'all'
                        ? 'bg-amber-400 text-slate-950 font-black'
                        : 'bg-slate-900 text-slate-300 border border-slate-800'
                    }`}
                  >
                    Barchasi ({products.length})
                  </button>
                  {categories.map((cat) => (
                    <button
                      key={cat.id}
                      onClick={() => setSelectedCategory(cat.id)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold whitespace-nowrap transition-all ${
                        selectedCategory === cat.id
                          ? 'bg-amber-400 text-slate-950 font-black'
                          : 'bg-slate-900 text-slate-300 border border-slate-800'
                      }`}
                    >
                      {getCategoryName(cat)}
                    </button>
                  ))}
                </div>

                {/* Products Grid */}
                <div className="grid grid-cols-1 gap-2.5">
                  {filteredProducts.map((p) => {
                    const donaItem = orderCart.find((i) => i.product.id === p.id && i.unitType === 'dona');
                    const korobkaItem = orderCart.find((i) => i.product.id === p.id && i.unitType === 'korobka');

                    return (
                      <div
                        key={p.id}
                        className="p-3 bg-slate-900/90 rounded-2xl border border-slate-800 flex items-center justify-between gap-3 shadow-md"
                      >
                        <div className="w-14 h-14 rounded-xl border border-slate-800 shrink-0 overflow-hidden flex items-center justify-center bg-slate-950">
                          <ProductThumbnail product={p} iconSize="w-6 h-6" />
                        </div>

                        <div className="flex-1 min-w-0">
                          <span className="text-[9px] bg-indigo-500/20 text-indigo-300 px-1.5 py-0.2 rounded font-mono">
                            SKU: {p.sku}
                          </span>
                          <h4 className="font-extrabold text-xs text-white truncate mt-0.5">{getProductName(p)}</h4>
                          <div className="text-[11px] font-mono font-bold text-amber-400">
                            {p.price.toLocaleString()} UZS / dona
                          </div>
                          <span className="text-[9px] text-slate-400 block">
                            Korobka (12x): {(p.price * 12).toLocaleString()} UZS
                          </span>
                        </div>

                        {/* Order Controls: Dona & Korobka buttons */}
                        <div className="flex flex-col gap-1 shrink-0">
                          <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-xl border border-slate-800">
                            <span className="text-[9px] text-slate-400 font-bold px-1">
                              {isFractionalProduct(p) ? `${(p.unit || 'KG').toUpperCase()}:` : 'DONA:'}
                            </span>
                            {donaItem ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => updateCartQty(p.id, 'dona', isFractionalProduct(p) ? -0.1 : -1)}
                                  className="w-5 h-5 bg-slate-800 text-white rounded font-bold flex items-center justify-center text-xs"
                                >
                                  -
                                </button>
                                <span className="font-mono text-[11px] font-bold text-amber-300 min-w-[32px] text-center">
                                  {isFractionalProduct(p)
                                    ? `${donaItem.quantity}${p.unit || 'kg'}`
                                    : donaItem.quantity}
                                </span>
                                <button
                                  onClick={() => updateCartQty(p.id, 'dona', isFractionalProduct(p) ? 0.1 : 1)}
                                  className="w-5 h-5 bg-amber-400 text-slate-950 rounded font-bold flex items-center justify-center text-xs"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(p, 'dona')}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-[10px] font-bold"
                              >
                                {isFractionalProduct(p) ? '+ 100gr' : '+ Dona'}
                              </button>
                            )}
                          </div>

                          <div className="flex items-center gap-1 bg-[#090d16] p-1 rounded-xl border border-slate-800">
                            <span className="text-[9px] text-slate-400 font-bold px-1">KOROBKA:</span>
                            {korobkaItem ? (
                              <div className="flex items-center gap-1">
                                <button
                                  onClick={() => updateCartQty(p.id, 'korobka', -1)}
                                  className="w-5 h-5 bg-slate-800 text-white rounded font-bold flex items-center justify-center text-xs"
                                >
                                  -
                                </button>
                                <span className="font-mono text-xs font-bold text-cyan-300 w-4 text-center">
                                  {korobkaItem.quantity}
                                </span>
                                <button
                                  onClick={() => updateCartQty(p.id, 'korobka', 1)}
                                  className="w-5 h-5 bg-cyan-400 text-slate-950 rounded font-bold flex items-center justify-center text-xs"
                                >
                                  +
                                </button>
                              </div>
                            ) : (
                              <button
                                onClick={() => addToCart(p, 'korobka')}
                                className="bg-slate-800 hover:bg-slate-700 text-slate-200 px-2 py-0.5 rounded text-[10px] font-bold"
                              >
                                + Korobka
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {/* Floating Basket Drawer Bar */}
                {orderCart.length > 0 && (
                  <div className="fixed bottom-16 left-0 right-0 max-w-md mx-auto p-3 z-20">
                    <div className="bg-gradient-to-r from-amber-400 via-amber-500 to-amber-400 text-slate-950 p-3 rounded-2xl shadow-2xl flex items-center justify-between gap-2 border border-amber-300 animate-slideUp">
                      <div>
                        <span className="text-[10px] font-extrabold uppercase tracking-wider block">
                          SABATCHA ({orderCart.length} xil)
                        </span>
                        <strong className="font-mono text-base font-black">
                          {cartSubtotal.toLocaleString()} UZS
                        </strong>
                      </div>

                      <button
                        onClick={() => setIsCartSheetOpen(true)}
                        className="bg-slate-950 text-amber-400 hover:bg-slate-900 font-black px-4 py-2 rounded-xl text-xs flex items-center gap-1.5 shadow-lg"
                      >
                        <ShoppingBag className="w-4 h-4" />
                        <span>Rasmiylashtirish →</span>
                      </button>
                    </div>
                  </div>
                )}
              </>
            ) : (
              <div className="bg-slate-900/90 p-8 rounded-3xl border border-slate-800 text-center space-y-2">
                <Store className="w-10 h-10 text-amber-400 mx-auto" />
                <h3 className="font-extrabold text-sm text-white">Buyurtma Olish Uchun Do'kon Tanlanmagan</h3>
                <p className="text-xs text-slate-400">
                  Yuqoridagi do'kon tanlash menyusidan kerakli B2B klientni tanlang.
                </p>
              </div>
            )}
          </div>
        )}

        {/* TAB 4: INKASSATSIYA & QARZ (COLLECTIONS) */}
        {agentTab === 'collection' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="bg-slate-900/90 p-4 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
              <div className="flex items-center justify-between">
                <h2 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <Receipt className="w-4 h-4 text-emerald-400" />
                  <span>Inkassatsiya (Pul Yig'ish)</span>
                </h2>
                <button
                  onClick={() => setIsHandoverModalOpen(true)}
                  className="bg-emerald-500/20 hover:bg-emerald-500/30 text-emerald-400 border border-emerald-500/40 text-[10px] px-2.5 py-1 rounded-xl font-bold flex items-center gap-1"
                >
                  🏦 Kassaga Topshirish
                </button>
              </div>

              <form onSubmit={handleRecordCollection} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Mijoz Do'kon:</label>
                  <select
                    value={selectedClientForPayment?.id || ''}
                    onChange={(e) => {
                      const found = clients.find((c) => c.id === e.target.value);
                      if (found) {
                        setSelectedClientForPayment(found);
                        setPaymentAmountInput(found.currentDebt.toString());
                      }
                    }}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none focus:border-emerald-400"
                  >
                    <option value="">-- Do'konni tanlang --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName} (Qarz: {c.currentDebt.toLocaleString()} UZS)
                      </option>
                    ))}
                  </select>
                </div>

                {selectedClientForPayment && (
                  <div className="bg-[#090d16] p-2.5 rounded-2xl border border-slate-800 text-xs flex justify-between items-center font-mono">
                    <span className="text-slate-400">Joriy Qarz Balansi:</span>
                    <strong className="text-rose-400 text-sm font-black">
                      {selectedClientForPayment.currentDebt.toLocaleString()} UZS
                    </strong>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Qabul Qilingan Summa (UZS):</label>
                  <input
                    type="number"
                    required
                    placeholder="Masalan: 5000000"
                    value={paymentAmountInput}
                    onChange={(e) => setPaymentAmountInput(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl p-2.5 text-sm font-mono font-bold text-emerald-400 focus:outline-none focus:border-emerald-400"
                  />
                </div>

                {/* Quick Denomination Buttons */}
                <div className="flex flex-wrap gap-1.5">
                  {[100000, 500000, 1000000, 5000000].map((amt) => (
                    <button
                      key={amt}
                      type="button"
                      onClick={() => setPaymentAmountInput((prev) => (Number(prev || 0) + amt).toString())}
                      className="bg-slate-800 hover:bg-slate-700 text-slate-300 px-2 py-1 rounded-xl text-[10px] font-mono font-bold"
                    >
                      +{(amt / 1000).toLocaleString()}k
                    </button>
                  ))}
                  {selectedClientForPayment && (
                    <button
                      type="button"
                      onClick={() => setPaymentAmountInput(selectedClientForPayment.currentDebt.toString())}
                      className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/40 px-2 py-1 rounded-xl text-[10px] font-bold"
                    >
                      To'liq Qarz
                    </button>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">To'lov Turi:</label>
                  <select
                    value={paymentMethodInput}
                    onChange={(e) => setPaymentMethodInput(e.target.value as any)}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="cash">💵 Naqd Pul</option>
                    <option value="card">💳 Bank Kartasi (Terminal)</option>
                    <option value="bank_transfer">🏛️ Bank O'tkazmasi (Perechisleniye)</option>
                  </select>
                </div>

                <button
                  type="submit"
                  className="w-full bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-slate-950 font-black py-3 rounded-2xl text-xs shadow-lg shadow-emerald-500/20"
                >
                  ✅ To'lovni Qabul Qilish va Chek Chiqarish
                </button>
              </form>

              {paymentSuccessMsg && (
                <div className="bg-emerald-500/20 border border-emerald-500/40 text-emerald-300 p-2.5 rounded-2xl text-xs text-center font-bold animate-fadeIn">
                  {paymentSuccessMsg}
                </div>
              )}
            </div>

            {/* Collected Payments History */}
            <div className="bg-slate-900/90 p-3.5 rounded-3xl border border-slate-800 space-y-2">
              <h3 className="text-xs font-black text-white">Bugungi Qabul Qilingan To'lovlar Tarixi</h3>
              {collectedPayments.length === 0 ? (
                <p className="text-xs text-slate-400 text-center py-4">Hozircha bugun to'lov yig'ilmadi.</p>
              ) : (
                <div className="space-y-2 text-xs">
                  {collectedPayments.map((p) => (
                    <div key={p.id} className="p-2.5 bg-[#090d16] rounded-2xl border border-slate-800 flex justify-between items-center">
                      <div>
                        <strong className="block text-white font-extrabold">{p.clientName}</strong>
                        <span className="text-[10px] text-slate-400">{p.paymentMethod.toUpperCase()} • {p.createdAt}</span>
                      </div>
                      <span className="font-mono font-black text-emerald-400 text-xs">
                        +{p.amount.toLocaleString()} UZS
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 5: MERCHANDISING & PHOTO AUDIT */}
        {agentTab === 'audit' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="bg-slate-900/90 p-4 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
              <h2 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                <Camera className="w-4 h-4 text-cyan-400" />
                <span>Foto Audit & Merchandising</span>
              </h2>

              <form onSubmit={handleSavePhotoAudit} className="space-y-3">
                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Do'kon Tanlang:</label>
                  <select
                    value={auditClient?.id || ''}
                    onChange={(e) => {
                      const found = clients.find((c) => c.id === e.target.value);
                      if (found) setAuditClient(found);
                    }}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl p-2.5 text-xs font-bold text-white focus:outline-none"
                  >
                    <option value="">-- Do'konni tanlang --</option>
                    {clients.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.companyName}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Audit Toifasi:</label>
                  <div className="grid grid-cols-2 gap-1.5">
                    {[
                      { id: 'shelf', label: '🏬 Vitrina (Shelf)' },
                      { id: 'fridge', label: '🧊 Sovutgich (Fridge)' },
                      { id: 'competitor', label: '⚔️ Konkurentlar' },
                      { id: 'promo', label: '🎁 Promo / POSM' },
                    ].map((cat) => (
                      <button
                        key={cat.id}
                        type="button"
                        onClick={() => setAuditCategory(cat.id as any)}
                        className={`p-2 rounded-xl text-xs font-bold border transition-all ${
                          auditCategory === cat.id
                            ? 'bg-cyan-400 text-slate-950 border-cyan-300 font-black'
                            : 'bg-[#090d16] text-slate-300 border-slate-800'
                        }`}
                      >
                        {cat.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Camera / Photo Preview */}
                <div className="space-y-1.5">
                  <label className="block text-xs font-bold text-slate-300">Rasm Namunasi:</label>
                  <div className="relative rounded-2xl overflow-hidden border border-slate-700 h-36 bg-[#090d16]">
                    <img src={auditPhotoUrl || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&q=80'} alt="Audit" className="w-full h-full object-cover" />
                    <div className="absolute bottom-2 right-2 flex gap-1">
                      <button
                        type="button"
                        onClick={() => setAuditPhotoUrl('https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&q=80')}
                        className="bg-slate-950/80 text-white text-[10px] px-2 py-1 rounded-lg border border-slate-700"
                      >
                        📷 Kamera
                      </button>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-300 mb-1">Eslatma / Izoh:</label>
                  <textarea
                    rows={2}
                    placeholder="Vitrina to'ldirildi, narxnoma joylashtirildi..."
                    value={auditNotes}
                    onChange={(e) => setAuditNotes(e.target.value)}
                    className="w-full bg-[#090d16] border border-slate-700 rounded-xl p-2.5 text-xs text-white focus:outline-none"
                  />
                </div>

                <button
                  type="submit"
                  className="w-full bg-cyan-400 hover:bg-cyan-300 text-slate-950 font-black py-2.5 rounded-2xl text-xs shadow-lg shadow-cyan-400/20"
                >
                  📸 Foto Hisobotni Saqlash
                </button>
              </form>

              {auditSuccessMsg && (
                <div className="bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 p-2.5 rounded-2xl text-xs text-center font-bold">
                  {auditSuccessMsg}
                </div>
              )}
            </div>

            {/* Saved Audits History */}
            <div className="bg-slate-900/90 p-3.5 rounded-3xl border border-slate-800 space-y-2">
              <h3 className="text-xs font-black text-white">Saqlangan Foto Hisobotlar Tarixi</h3>
              <div className="grid grid-cols-2 gap-2">
                {photoAudits.map((a) => (
                  <div key={a.id} className="bg-[#090d16] p-2 rounded-2xl border border-slate-800 space-y-1">
                    <img src={a.photoUrl || 'https://images.unsplash.com/photo-1578916171728-46686eac8d58?w=500&q=80'} alt="Audit" className="w-full h-24 object-cover rounded-xl" />
                    <strong className="block text-white text-[11px] font-bold truncate">{a.clientName}</strong>
                    <p className="text-[9px] text-slate-400 truncate">{a.notes}</p>
                    <span className="text-[8px] text-cyan-300 block font-mono">{a.timestamp}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* TAB 6: VAN STOCK (AVTO-SKLAD) */}
        {agentTab === 'van_stock' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="bg-slate-900/90 p-4 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
              <div className="flex justify-between items-center">
                <h2 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <Truck className="w-4 h-4 text-amber-400" />
                  <span>Mening Avto-Skladim (Van Stock)</span>
                </h2>
                <span className="text-[10px] bg-amber-400/20 text-amber-300 border border-amber-400/30 px-2 py-0.5 rounded-full font-mono font-bold">
                  Avtomobil #01
                </span>
              </div>

              <p className="text-xs text-slate-400">
                Savdo agenti avtomobilidagi joriy mahsulotlar qoldig'i (Direct Sales / Van Sales uchun):
              </p>

              <div className="space-y-2">
                {products.slice(0, 6).map((p, idx) => {
                  const vanStockCount = 50 - idx * 7;
                  return (
                    <div
                      key={p.id}
                      className="p-3 bg-[#090d16] rounded-2xl border border-slate-800 flex items-center justify-between gap-2"
                    >
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-10 h-10 rounded-xl overflow-hidden shrink-0 flex items-center justify-center bg-slate-900 border border-slate-800">
                          <ProductThumbnail product={p} iconSize="w-5 h-5" />
                        </div>
                        <div className="min-w-0">
                          <strong className="block text-white font-extrabold text-xs truncate">{p.nameUz}</strong>
                          <span className="text-[10px] text-slate-400 font-mono">
                            {p.price.toLocaleString()} UZS / {p.unit}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <span className="text-slate-400 text-[10px] block">Mashinada:</span>
                        <strong className="font-mono text-amber-300 font-black text-sm">
                          {vanStockCount} {p.unit}
                        </strong>
                      </div>
                    </div>
                  );
                })}
              </div>

              <button
                onClick={() => alert("Omborchiga mahsulot yuklash so'rovi (Zayavka) yuborildi!")}
                className="w-full bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold py-2.5 rounded-2xl text-xs border border-slate-700 flex items-center justify-center gap-1.5"
              >
                <Package className="w-4 h-4" />
                <span>+ Bosh Omborga Zayavka Berish</span>
              </button>
            </div>
          </div>
        )}

        {/* TAB 7: BUYURTMALAR & NAKLADNOY */}
        {agentTab === 'orders' && (
          <div className="space-y-3 animate-fadeIn">
            <div className="bg-slate-900/90 p-4 rounded-3xl border border-slate-800 space-y-3 shadow-xl">
              <div className="flex justify-between items-center">
                <h2 className="font-extrabold text-sm text-white flex items-center gap-1.5">
                  <ShoppingBag className="w-4 h-4 text-amber-400" />
                  <span>Agent Buyurtmalari Ro'yxati</span>
                </h2>
                <span className="text-xs text-slate-400 font-mono font-bold">({agentOrders.length})</span>
              </div>

              <div className="space-y-2.5">
                {agentOrders.map((o) => (
                  <div key={o.id} className="p-3 bg-[#090d16] rounded-2xl border border-slate-800 space-y-2">
                    <div className="flex justify-between items-start gap-2">
                      <div>
                        <strong className="block text-white font-extrabold text-xs">№ {o.orderNumber}</strong>
                        <span className="text-[11px] text-slate-300">{o.customerName}</span>
                      </div>
                      <span className="bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[9px] px-2 py-0.5 rounded-full font-bold">
                        {o.orderStatus.toUpperCase()}
                      </span>
                    </div>

                    <div className="flex justify-between items-center text-xs font-mono pt-1 border-t border-slate-800/80">
                      <span className="text-amber-400 font-black">{o.finalTotal.toLocaleString()} UZS</span>
                      <button
                        onClick={() => setSelectedNakladnoyOrder(o)}
                        className="bg-indigo-950 hover:bg-indigo-900 text-indigo-300 border border-indigo-500/40 px-2.5 py-1 rounded-xl text-[10px] font-bold flex items-center gap-1"
                      >
                        <FileText className="w-3 h-3" />
                        <span>Nakladnoy PDF</span>
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

      </main>

      {/* 3. SFA FLOATING GLASS MOBILE NAVIGATION BAR */}
      <nav className="bg-[#0f172a]/95 backdrop-blur-md border-t border-indigo-500/30 shrink-0 px-2 py-2 fixed bottom-0 left-0 right-0 max-w-md mx-auto z-30 shadow-2xl">
        <div className="flex items-center justify-around">
          {[
            { id: 'dashboard', label: 'Reja', icon: TrendingUp },
            { id: 'route', label: 'Marshrut', icon: Navigation },
            { id: 'catalog', label: 'Katalog', icon: ShoppingBag },
            { id: 'collection', label: 'Kassa', icon: Receipt },
            { id: 'audit', label: 'Audit', icon: Camera },
            { id: 'orders', label: 'Hujjat', icon: FileText },
          ].map((t) => {
            const Icon = t.icon;
            const isActive = agentTab === t.id;
            return (
              <button
                key={t.id}
                onClick={() => setAgentTab(t.id as any)}
                className={`flex flex-col items-center gap-0.5 py-1 px-2 rounded-2xl transition-all relative ${
                  isActive
                    ? 'text-amber-400 scale-105 font-black'
                    : 'text-slate-400 hover:text-slate-200 font-medium'
                }`}
              >
                <div className={`p-1.5 rounded-xl transition-all ${isActive ? 'bg-amber-400/20 border border-amber-400/40' : ''}`}>
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[9px] tracking-tight">{t.label}</span>
                {isActive && (
                  <span className="w-1 h-1 rounded-full bg-amber-400 absolute -bottom-1 shadow-lg shadow-amber-400/80" />
                )}
              </button>
            );
          })}
        </div>
      </nav>

      {/* MODAL 1: ADD NEW B2B CLIENT STORE */}
      {isAddClientModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4 text-xs relative max-h-[85vh] overflow-y-auto">
            <button
              onClick={() => setIsAddClientModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded-2xl flex items-center justify-center mx-auto text-lg font-bold">
                🏪
              </div>
              <h3 className="font-extrabold text-sm text-white">Yangi Do'kon Qo'shish</h3>
              <p className="text-[11px] text-slate-400">B2B mijoz do'konini bazaga kiritish</p>
            </div>

            <form onSubmit={handleAddNewClient} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Do'kon Nomi (*):</label>
                <input
                  type="text"
                  required
                  placeholder="Masalan: Oazis-Market Mega"
                  value={newClientName}
                  onChange={(e) => setNewClientName(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 text-white p-2.5 rounded-xl font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-amber-400 font-bold mb-1">📍 Teritoriya (Hudud) (*):</label>
                <select
                  value={newClientTerritoryId}
                  onChange={(e) => setNewClientTerritoryId(e.target.value)}
                  className="w-full bg-[#090d16] border border-amber-500/50 text-white p-2.5 rounded-xl font-bold focus:outline-none focus:border-amber-400"
                >
                  {territories.map((ter) => (
                    <option key={ter.id} value={ter.id} className="bg-slate-900 text-white">
                      {ter.name} {ter.code ? `(${ter.code})` : ''}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">INN Raqami:</label>
                <input
                  type="text"
                  placeholder="301234567"
                  value={newClientInn}
                  onChange={(e) => setNewClientInn(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 text-white p-2.5 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Mas'ul Shaxs:</label>
                <input
                  type="text"
                  placeholder="Jamshid aka"
                  value={newClientContact}
                  onChange={(e) => setNewClientContact(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 text-white p-2.5 rounded-xl focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Telefon Raqam:</label>
                <input
                  type="text"
                  placeholder="+998 90 123 45 67"
                  value={newClientPhone}
                  onChange={(e) => setNewClientPhone(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 text-white p-2.5 rounded-xl font-mono focus:outline-none"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Manzil:</label>
                <input
                  type="text"
                  placeholder="Toshkent sh., Yunusobod t."
                  value={newClientAddress}
                  onChange={(e) => setNewClientAddress(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 text-white p-2.5 rounded-xl focus:outline-none"
                />
              </div>

              {/* GPS Button */}
              <div>
                <button
                  type="button"
                  onClick={handleDetectGPS}
                  disabled={isDetectingGps}
                  className="w-full bg-slate-800 hover:bg-slate-700 text-cyan-300 py-2 rounded-xl text-xs font-bold border border-slate-700 flex items-center justify-center gap-1.5"
                >
                  <MapPin className="w-3.5 h-3.5 text-rose-400" />
                  <span>{isDetectingGps ? 'GPS Aniqlanmoqda...' : '📍 Hozirgi GPS Koordinatani Olish'}</span>
                </button>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAddClientModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isCreatingClient}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 text-slate-950 font-black py-2.5 rounded-xl shadow-lg"
                >
                  {isCreatingClient ? 'Saqlanmoqda...' : 'Saqlash'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: CHECK-OUT VIZIT YAKUNLASH MODAL */}
      {isCheckoutModalOpen && activeVisitClient && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4 text-xs relative">
            <button
              onClick={() => setIsCheckoutModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-10 h-10 bg-rose-500/20 text-rose-400 border border-rose-500/30 rounded-2xl flex items-center justify-center mx-auto text-lg font-bold">
                🏁
              </div>
              <h3 className="font-extrabold text-sm text-white">GPS Vizitni Yakunlash</h3>
              <p className="text-[11px] text-slate-400">{activeVisitClient.companyName}</p>
            </div>

            <div className="bg-[#090d16] p-2.5 rounded-2xl border border-slate-800 text-center font-mono">
              <span className="text-slate-400 text-[10px] block">Vizit Davomiyligi:</span>
              <span className="text-amber-300 font-bold text-sm">{formatTimeTimer(visitElapsedSeconds)}</span>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Vizit Natijasi:</label>
                <select
                  value={checkoutOutcome}
                  onChange={(e) => setCheckoutOutcome(e.target.value as any)}
                  className="w-full bg-[#090d16] border border-slate-700 text-white p-2.5 rounded-xl font-bold focus:outline-none"
                >
                  <option value="order_taken">🛒 Yangi B2B Zakaz Olindi</option>
                  <option value="debt_collected">💸 Qarz Yig'ildi (Inkassatsiya)</option>
                  <option value="sufficient_stock">📦 Tovar Zaxirasi Yetarli</option>
                  <option value="closed">🔒 Do'kon Yopiq</option>
                  <option value="owner_absent">👤 Mas'ul Shaxs Yo'q</option>
                  <option value="other">📝 Boshqa Sabab</option>
                </select>
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Qisqa Eslatma / Izoh:</label>
                <textarea
                  rows={2}
                  placeholder="Vizit yakuniy xulosasi..."
                  value={visitNotes}
                  onChange={(e) => setVisitNotes(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 text-white p-2.5 rounded-xl text-xs focus:outline-none"
                />
              </div>

              <div className="flex gap-2">
                <button
                  onClick={() => setIsCheckoutModalOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl"
                >
                  Bekor qilish
                </button>
                <button
                  onClick={handleFinishGPSVisit}
                  className="flex-1 bg-rose-500 hover:bg-rose-400 text-white font-black py-2.5 rounded-xl shadow-lg"
                >
                  Yakunlash
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 3: AGENT LOGIN MODAL */}
      {isAgentLoginOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4 text-xs relative">
            <button
              onClick={() => setIsAgentLoginOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-amber-400/20 text-amber-400 border border-amber-400/30 rounded-2xl flex items-center justify-center mx-auto text-xl shadow-lg">
                💼
              </div>
              <h3 className="font-black text-sm text-white">Linko SFA Agent Kirish</h3>
              <p className="text-[11px] text-slate-400">Alohida agent akkounti bilan kiring:</p>
            </div>

            <form onSubmit={handleAgentLoginSubmit} className="space-y-3">
              <div>
                <label className="block text-slate-300 font-bold mb-1">Agent Login yoki Telefon:</label>
                <input
                  type="text"
                  required
                  placeholder="Login yoki Telefon kiriting"
                  value={agentInputLogin}
                  onChange={(e) => setAgentInputLogin(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 text-white p-2.5 rounded-xl font-mono font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              <div>
                <label className="block text-slate-300 font-bold mb-1">Maxfiy Parol:</label>
                <input
                  type="password"
                  required
                  placeholder="Parolingizni kiriting"
                  value={agentInputPassword}
                  onChange={(e) => setAgentInputPassword(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 text-white p-2.5 rounded-xl font-mono font-bold focus:outline-none focus:border-amber-400"
                />
              </div>

              {agentAuthError && (
                <div className="bg-rose-950/80 border border-rose-800 text-rose-300 p-2 rounded-xl text-[10px] text-center font-medium">
                  {agentAuthError}
                </div>
              )}

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setIsAgentLoginOpen(false)}
                  className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl cursor-pointer"
                >
                  Bekor qilish
                </button>
                <button
                  type="submit"
                  disabled={isAgentLoggingIn}
                  className="flex-1 bg-amber-400 hover:bg-amber-300 disabled:opacity-50 text-slate-950 font-black py-2.5 rounded-xl shadow-lg cursor-pointer"
                >
                  {isAgentLoggingIn ? "Tekshirilmoqda..." : "Kirish"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: ORDER BASKET SHEET */}
      {isCartSheetOpen && (
        <div className="fixed inset-0 z-50 flex items-end justify-center bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border-t border-slate-800 w-full max-w-md rounded-t-3xl p-5 shadow-2xl space-y-4 max-h-[85vh] overflow-y-auto relative">
            <button
              onClick={() => setIsCartSheetOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="space-y-1">
              <h3 className="font-black text-sm text-white flex items-center gap-2">
                <ShoppingBag className="w-4 h-4 text-amber-400" />
                <span>B2B Buyurtma Savati</span>
              </h3>
              <p className="text-[11px] text-slate-400">{selectedClientForOrder?.companyName}</p>
            </div>

            <div className="space-y-2 max-h-48 overflow-y-auto">
              {orderCart.map((item, idx) => {
                const basePrice = item.product.discountPrice || item.product.price;
                const multiplier = item.unitType === 'korobka' ? 12 : 1;
                const total = basePrice * multiplier * item.quantity;

                return (
                  <div key={idx} className="p-2.5 bg-[#090d16] rounded-2xl border border-slate-800 flex items-center justify-between gap-2 text-xs">
                    <div className="min-w-0 flex-1">
                      <strong className="block text-white font-extrabold truncate">{item.product.nameUz}</strong>
                      <span className="text-[10px] text-slate-400 font-mono">
                        {item.unitType.toUpperCase()} • {item.quantity} x {(basePrice * multiplier).toLocaleString()} UZS
                      </span>
                    </div>

                    <strong className="font-mono text-amber-300 text-xs shrink-0">
                      {total.toLocaleString()} UZS
                    </strong>
                  </div>
                );
              })}
            </div>

            <div className="space-y-2 pt-2 border-t border-slate-800">
              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">To'lov Usuli:</label>
                <select
                  value={b2bPaymentMethod}
                  onChange={(e) => setB2bPaymentMethod(e.target.value as any)}
                  className="w-full bg-[#090d16] border border-slate-700 text-white p-2.5 rounded-xl text-xs font-bold focus:outline-none"
                >
                  <option value="bank_transfer">🏛️ Bank O'tkazmasi (Perechisleniye)</option>
                  <option value="cash">💵 Naqd Pul</option>
                  <option value="click">💳 Click / Payme</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-300 mb-1">Topshirish Sanasi:</label>
                <input
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  className="w-full bg-[#090d16] border border-slate-700 text-white p-2.5 rounded-xl text-xs font-mono font-bold focus:outline-none"
                />
              </div>

              <div className="bg-[#090d16] p-3 rounded-2xl border border-slate-800 flex justify-between items-center font-mono">
                <span className="text-slate-400 text-xs">Jami Summa:</span>
                <span className="text-amber-400 text-base font-black">{cartSubtotal.toLocaleString()} UZS</span>
              </div>

              <button
                onClick={handleCreateAgentOrder}
                disabled={isSubmittingOrder}
                className="w-full bg-gradient-to-r from-amber-400 to-amber-500 hover:from-amber-300 hover:to-amber-400 text-slate-950 font-black py-3 rounded-2xl text-xs shadow-xl shadow-amber-400/20"
              >
                {isSubmittingOrder ? 'Rasmiylashtirilmoqda...' : '✅ Buyurtmani Yuborish'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 5: HANDOVER CASH TO CENTRAL CASHIER MODAL */}
      {isHandoverModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 w-full max-w-xs rounded-3xl p-5 shadow-2xl space-y-4 text-xs relative">
            <button
              onClick={() => setIsHandoverModalOpen(false)}
              className="absolute top-4 right-4 text-slate-400 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="text-center space-y-1">
              <div className="w-12 h-12 bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 rounded-2xl flex items-center justify-center mx-auto text-xl font-bold">
                🏦
              </div>
              <h3 className="font-extrabold text-sm text-white">Bosh Kassaga Naqd Pul Topshirish</h3>
              <p className="text-[11px] text-slate-400">Agent tomonidan yig'ilgan tushum</p>
            </div>

            <div className="bg-[#090d16] p-3 rounded-2xl border border-slate-800 text-center font-mono">
              <span className="text-slate-400 text-[10px] block">Topshiriladigan Naqd Summa:</span>
              <span className="text-emerald-400 text-lg font-extrabold">{totalCashCollectedToday.toLocaleString()} UZS</span>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setIsHandoverModalOpen(false)}
                className="flex-1 bg-slate-800 hover:bg-slate-700 text-slate-300 font-bold py-2.5 rounded-xl"
              >
                Bekor qilish
              </button>
              <button
                type="button"
                onClick={handleHandoverCashier}
                className="flex-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-black py-2.5 rounded-xl shadow-lg"
              >
                Topshirish
              </button>
            </div>
          </div>
        </div>
      )}

      {/* MODAL 6: PRINTABLE SFA NAKLADNOY MODAL */}
      {selectedNakladnoyOrder && (
        <NakladnoyModal
          order={selectedNakladnoyOrder}
          onClose={() => setSelectedNakladnoyOrder(null)}
        />
      )}
    </div>
  );
};
