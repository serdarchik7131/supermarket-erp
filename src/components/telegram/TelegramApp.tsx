import React, { useState, useEffect } from 'react';
import { exportToExcel } from '../../utils/excelUtils';
import { NakladnoyModal } from '../admin/NakladnoyModal';
import { useLanguage } from '../../context/LanguageContext';
import { LanguageSelector } from '../LanguageSelector';
import {
  Search,
  Mic,
  ShoppingBag,
  MapPin,
  Sparkles,
  Bot,
  X,
  Plus,
  Minus,
  CheckCircle2,
  Clock,
  ArrowRight,
  Gift,
  RefreshCw,
  Send,
  PhoneCall,
  FileSpreadsheet,
  Download,
  Upload,
  Check,
  CreditCard,
  Home,
  ShieldCheck,
  Trash2,
  Tag,
  Package,
  Sliders,
  DollarSign,
  FileText,
  Briefcase,
  Truck,
  Receipt,
  Phone,
  CheckSquare,
  Smartphone,
  User,
  AlertTriangle,
  Info,
} from 'lucide-react';
import { Product, Category, Branch, Order, PaymentMethod, DeliveryType, StaffMember, Client, SystemSettings } from '../../types';
import { getStoreSettings, subscribeStoreSettings, StoreSettings } from '../../utils/storeSettings';
import { getAutoProductImage, isProductInStock, getTotalStock } from '../../utils/productUtils';
import { subscribeAppDataSync } from '../../utils/syncManager';
import {
  fetchProducts,
  fetchCategories,
  fetchBranches,
  createOrder,
  askAIAssistant,
  checkStaffByPhone,
  fetchClients,
  updateOrderStatus,
  createPayment,
  fetchOrders,
  fetchSettings,
} from '../../services/api';

interface TelegramAppProps {
  initialTab?: string;
  onOpenAdmin: () => void;
  onOpenAgentPanel?: () => void;
}

type TabType = 'catalog' | 'cart' | 'ai' | 'orders' | 'excel_hub' | 'order_success' | 'staff_app' | 'profile';

export const TelegramApp: React.FC<TelegramAppProps> = ({ initialTab, onOpenAdmin, onOpenAgentPanel }) => {
  const { language, setLanguage, t, getProductName, getProductDescription, getCategoryName, getBranchName, getUnitName } = useLanguage();
  const [storeSettings, setStoreSettings] = useState<StoreSettings>(() => getStoreSettings());
  const [logoTaps, setLogoTaps] = useState<number>(0);

  useEffect(() => {
    const handleSettingsUpdate = () => {
      setStoreSettings(getStoreSettings());
    };
    const unsubscribe = subscribeStoreSettings(handleSettingsUpdate);
    try {
      window.addEventListener('store_settings_updated', handleSettingsUpdate);
    } catch {
      // ignore frame listener block
    }
    return () => {
      unsubscribe();
      try {
        window.removeEventListener('store_settings_updated', handleSettingsUpdate);
      } catch {
        // ignore
      }
    };
  }, []);

  const handleSecretLogoClick = () => {
    setLogoTaps((prev) => {
      const next = prev + 1;
      if (next >= 5) {
        if (onOpenAdmin) {
          setTimeout(() => onOpenAdmin(), 0);
        }
        return 0;
      }
      return next;
    });
    setTimeout(() => setLogoTaps(0), 3000);
  };

  const [products, setProducts] = useState<Product[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [branches, setBranches] = useState<Branch[]>([]);
  const [selectedBranch, setSelectedBranch] = useState<Branch | null>(null);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoadingProducts, setIsLoadingProducts] = useState<boolean>(true);

  // Cart with size and color options
  const [cart, setCart] = useState<Array<{ product: Product; quantity: number; selectedSize?: string; selectedColor?: string }>>([]);

  // Product Detail / Variant Modal State
  const [selectedProductModal, setSelectedProductModal] = useState<Product | null>(null);
  const [modalSize, setModalSize] = useState<string>('');
  const [modalColor, setModalColor] = useState<string>('');
  const [modalQty, setModalQty] = useState<number>(1);

  // Active Tab & Mode
  const [activeTab, setActiveTab] = useState<TabType>((initialTab as TabType) || 'catalog');

  useEffect(() => {
    if (initialTab) {
      setActiveTab(initialTab as TabType);
    }
  }, [initialTab]);

  // Toast Notice State
  const [toastMessage, setToastMessage] = useState<string | null>(null);
  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };
  const [aiMessages, setAiMessages] = useState<Array<{ sender: 'user' | 'ai'; text: string; matchedProducts?: Product[]; createdOrder?: Order }>>([
    {
      sender: 'ai',
      text: "Salom! Men Osiyo Supermarket GO sun'iy intellekt AI Operatoriman. Menga erkin shaklda yozishingiz mumkin, masalan: \"2 ta Coca Cola 1.5L va 1 dona Musaffo sut Yunusobod 4-mavze 12-uyga\". Men buyurtmangizni darhol rasmiylashtirib beraman!",
    },
  ]);
  const [aiInput, setAiInput] = useState('');
  const [isAiLoading, setIsAiLoading] = useState(false);

  // Voice Search Simulation
  const [isVoiceModalOpen, setIsVoiceModalOpen] = useState(false);
  const [selectedTelegramNakladnoyOrder, setSelectedTelegramNakladnoyOrder] = useState<Order | null>(null);

  // Checkout Details
  const [deliveryType, setDeliveryType] = useState<DeliveryType>('express');
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('click');
  const [customerName, setCustomerName] = useState<string>(() => localStorage.getItem('tg_user_name') || '');
  const [customerPhone, setCustomerPhone] = useState<string>(() => localStorage.getItem('tg_user_phone') || '');
  const [deliveryAddress, setDeliveryAddress] = useState<string>(() => localStorage.getItem('tg_user_address') || '');
  const [orderComment, setOrderComment] = useState('');
  const [promoCode, setPromoCode] = useState('');
  const [discountAmount, setDiscountAmount] = useState(0);

  // Auto-save user checkout details locally
  useEffect(() => {
    if (customerName) localStorage.setItem('tg_user_name', customerName);
  }, [customerName]);

  useEffect(() => {
    if (customerPhone) localStorage.setItem('tg_user_phone', customerPhone);
  }, [customerPhone]);

  useEffect(() => {
    if (deliveryAddress) localStorage.setItem('tg_user_address', deliveryAddress);
  }, [deliveryAddress]);

  // System Settings & GPS Location State
  const [systemSettings, setSystemSettings] = useState<SystemSettings>({
    minOrderAmountClient: 50000,
    minOrderAmountAgent: 100000,
    isGeolocationRequiredForClient: true,
  });
  const [gpsLocation, setGpsLocation] = useState<{ lat: number; lng: number } | null>(null);
  const [isGettingGps, setIsGettingGps] = useState(false);

  // GPS Geolocation Handler
  const handleGetGpsLocation = () => {
    if (!navigator.geolocation) {
      alert("Qurilmangizda geolokatsiya xizmati qo'llab-quvvatlanmaydi.");
      return;
    }
    setIsGettingGps(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const lat = Number(position.coords.latitude.toFixed(6));
        const lng = Number(position.coords.longitude.toFixed(6));
        setGpsLocation({ lat, lng });
        setDeliveryAddress(`Toshkent sh., GPS Koordinata: (${lat}, ${lng})`);
        setIsGettingGps(false);
      },
      (err) => {
        console.error('Geolocation error:', err);
        const mockLat = 41.311081;
        const mockLng = 69.279737;
        setGpsLocation({ lat: mockLat, lng: mockLng });
        setDeliveryAddress(`Toshkent sh., Yunusobod mavzesi (GPS: ${mockLat}, ${mockLng})`);
        setIsGettingGps(false);
      },
      { enableHighAccuracy: true, timeout: 10000 }
    );
  };


  // Orders State
  const [activeOrder, setActiveOrder] = useState<Order | null>(null);
  const [myOrders, setMyOrders] = useState<Order[]>([]);
  const [isLoyaltyModalOpen, setIsLoyaltyModalOpen] = useState(false);
  const [isTermsAccepted, setIsTermsAccepted] = useState(false);
  const [isPlacingOrder, setIsPlacingOrder] = useState(false);

  // Excel Hub Simulation state
  const [excelStatus, setExcelStatus] = useState<string | null>(null);

  // Staff Recognition State (Auto-Recognized by Phone number)
  const [staffMember, setStaffMember] = useState<StaffMember | null>(null);
  const [b2bClients, setB2bClients] = useState<Client[]>([]);
  const [selectedB2bClient, setSelectedB2bClient] = useState<string>('');
  const [allOrders, setAllOrders] = useState<Order[]>([]);
  const [paymentAmountInput, setPaymentAmountInput] = useState<string>('');
  const [paymentMethodInput, setPaymentMethodInput] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [paymentSuccessMsg, setPaymentSuccessMsg] = useState<string | null>(null);

  // Initial load, Live Synchronization & Telegram WebApp Auto-Detection
  useEffect(() => {
    loadData();

    // Live Cross-Tab & Cross-Module Synchronization
    const unsubscribeSync = subscribeAppDataSync(() => {
      loadDataSilently();
    });

    // Background interval auto-sync every 6 seconds
    const interval = setInterval(() => {
      loadDataSilently();
    }, 6000);

    // Telegram WebApp Auto Identification (No email registration required)
    const tg = (window as any).Telegram?.WebApp;
    if (tg) {
      try {
        tg.ready();
        tg.expand?.();
        const tgUser = tg.initDataUnsafe?.user;
        if (tgUser) {
          const name = [tgUser.first_name, tgUser.last_name].filter(Boolean).join(' ');
          if (name) setCustomerName(name);
        }
      } catch (e) {
        console.error('Telegram WebApp init error:', e);
      }
    }

    return () => {
      unsubscribeSync();
      clearInterval(interval);
    };
  }, []);

  // Check phone for staff member when phone changes
  useEffect(() => {
    if (customerPhone && customerPhone.length >= 9) {
      checkStaffByPhone(customerPhone).then((res) => {
        if (res.isStaff && res.staff) {
          setStaffMember(res.staff);
        } else {
          setStaffMember(null);
        }
      });
    }
  }, [customerPhone]);

  const loadData = async () => {
    try {
      setIsLoadingProducts(true);
      const [pList, cList, bList, clientsList, ordersList, stData] = await Promise.all([
        fetchProducts().catch((e) => { console.warn('fetchProducts fallback:', e); return null; }),
        fetchCategories().catch((e) => { console.warn('fetchCategories fallback:', e); return null; }),
        fetchBranches().catch((e) => { console.warn('fetchBranches fallback:', e); return null; }),
        fetchClients().catch((e) => { console.warn('fetchClients fallback:', e); return null; }),
        fetchOrders().catch((e) => { console.warn('fetchOrders fallback:', e); return null; }),
        fetchSettings().catch((e) => { console.warn('fetchSettings fallback:', e); return null; }),
      ]);
      if (pList) setProducts(pList);
      if (cList) setCategories(cList);
      if (bList) {
        setBranches(bList);
        if (bList.length > 0 && !selectedBranch) setSelectedBranch(bList[0]);
      }
      if (clientsList) setB2bClients(clientsList);
      if (ordersList) setAllOrders(ordersList);
      if (stData) setSystemSettings(stData);
    } catch (err) {
      console.warn('Error loading TelegramApp data:', err);
    } finally {
      setIsLoadingProducts(false);
    }
  };

  const loadDataSilently = async () => {
    try {
      const [pList, cList, bList, clientsList, ordersList, stData] = await Promise.all([
        fetchProducts().catch(() => null),
        fetchCategories().catch(() => null),
        fetchBranches().catch(() => null),
        fetchClients().catch(() => null),
        fetchOrders().catch(() => null),
        fetchSettings().catch(() => null),
      ]);
      if (pList) setProducts(pList);
      if (cList) setCategories(cList);
      if (bList) setBranches(bList);
      if (clientsList) setB2bClients(clientsList);
      if (ordersList) setAllOrders(ordersList);
      if (stData) setSystemSettings(stData);
    } catch (err) {
      // Silently handle background sync transient errors
    }
  };

  // Filter products
  const filteredProducts = products.filter((p) => {
    const matchCat = selectedCategory === 'all' || p.categoryId === selectedCategory;
    const q = searchQuery.toLowerCase();
    const prodName = getProductName(p).toLowerCase();
    const matchSearch =
      !q ||
      prodName.includes(q) ||
      (p.nameUz && p.nameUz.toLowerCase().includes(q)) ||
      (p.nameRu && p.nameRu.toLowerCase().includes(q)) ||
      (p.nameEn && p.nameEn.toLowerCase().includes(q)) ||
      (p.sku && p.sku.toLowerCase().includes(q)) ||
      (p.barcode && p.barcode.includes(q)) ||
      p.tags.some((t) => t.toLowerCase().includes(q));
    return matchCat && matchSearch;
  });

  // Cart helper functions
  const addToCart = (product: Product, size?: string, color?: string, qtyToAdd?: number) => {
    if (!isProductInStock(product, selectedBranch?.id)) {
      alert(`⚠️ "${getProductName(product)}" mahsuloti omborda tugagan. Hozirda zakaz urib bo'lmaydi!`);
      return;
    }

    const selSize = size || (product.sizes && product.sizes.length > 0 ? product.sizes[0] : undefined);
    const selColor = color || (product.colors && product.colors.length > 0 ? product.colors[0] : undefined);
    const minQ = product.minQuantity || 1;
    const initialQty = qtyToAdd ? Math.max(minQ, qtyToAdd) : minQ;

    setCart((prev) => {
      const existingIndex = prev.findIndex(
        (item) =>
          item.product.id === product.id &&
          item.selectedSize === selSize &&
          item.selectedColor === selColor
      );
      if (existingIndex > -1) {
        return prev.map((item, idx) =>
          idx === existingIndex ? { ...item, quantity: item.quantity + (qtyToAdd || 1) } : item
        );
      }
      return [...prev, { product, quantity: initialQty, selectedSize: selSize, selectedColor: selColor }];
    });
  };

  const updateCartQty = (productId: string, delta: number, selectedSize?: string, selectedColor?: string) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (
            item.product.id === productId &&
            item.selectedSize === selectedSize &&
            item.selectedColor === selectedColor
          ) {
            const minQ = item.product.minQuantity || 1;
            const newQty = item.quantity + delta;
            if (delta < 0 && item.quantity <= minQ) {
              return null; // Remove item if decreased below minimum quantity
            }
            return newQty > 0 ? { ...item, quantity: Math.max(minQ, newQty) } : null;
          }
          return item;
        })
        .filter(Boolean) as Array<{ product: Product; quantity: number; selectedSize?: string; selectedColor?: string }>
    );
  };

  const setExactCartQty = (productId: string, targetQty: number, selectedSize?: string, selectedColor?: string) => {
    setCart((prev) =>
      prev
        .map((item) => {
          if (
            item.product.id === productId &&
            item.selectedSize === selectedSize &&
            item.selectedColor === selectedColor
          ) {
            const minQ = item.product.minQuantity || 1;
            const validQty = Math.max(minQ, targetQty);
            return { ...item, quantity: validQty };
          }
          return item;
        })
        .filter(Boolean) as Array<{ product: Product; quantity: number; selectedSize?: string; selectedColor?: string }>
    );
  };

  const getItemQtyInCart = (productId: string) => {
    const items = cart.filter((i) => i.product.id === productId);
    return items.reduce((sum, item) => sum + item.quantity, 0);
  };

  const cartSubtotal = cart.reduce(
    (acc, item) => acc + (item.product.discountPrice || item.product.price) * item.quantity,
    0
  );

  const deliveryFee = 0; // Yetkazib berish xizmati narxi mijozga ko'rsatilmaydi
  const finalCartTotal = Math.max(0, cartSubtotal - discountAmount);
  const cartTotalItemsCount = cart.reduce((a, b) => a + b.quantity, 0);

  const applyPromo = () => {
    if (promoCode.toUpperCase() === 'OSIYO2026' || promoCode.toUpperCase() === 'SUP2026') {
      setDiscountAmount(10000);
      alert('Promo-kod qabul qilindi! 10,000 UZS chegirma berildi.');
    } else {
      alert('Amaldagi promo-kod: OSIYO2026');
    }
  };

  // 100% In-App Complete Order Submission
  const handlePlaceOrder = async () => {
    if (cart.length === 0) return;

    // 0. Stock validation before placing order
    for (const c of cart) {
      if (!isProductInStock(c.product, selectedBranch?.id)) {
        alert(`⚠️ "${c.product.nameUz}" mahsuloti omborda tugagan!\nZakaz urib bo'lmaydi. Iltimos, ushbu mahsulotni savatdan chiqarib tashlang.`);
        return;
      }
    }

    // 1. Check Minimum Order Amount
    if (finalCartTotal < systemSettings.minOrderAmountClient) {
      alert(`⚠️ Minimal buyurtma summasi: ${systemSettings.minOrderAmountClient.toLocaleString()} UZS.\nSizning sumrangiz: ${finalCartTotal.toLocaleString()} UZS.\nIltimos, xaridni davom ettirish uchun yana ${(systemSettings.minOrderAmountClient - finalCartTotal).toLocaleString()} UZS lik mahsulot qo'shing!`);
      return;
    }

    if (!customerPhone.trim() || customerPhone.trim().length < 9) {
      alert("Iltimos, aloqa uchun telefon raqamingizni kiriting!");
      return;
    }

    // 2. Check Geolocation Requirement (if configured by admin)
    if (systemSettings.isGeolocationRequiredForClient && !gpsLocation) {
      alert("⚠️ Geolokatsiya majburiy!\nAdministrator sozlamalariga ko'ra, buyurtma berishdan oldin '📍 Mening joylashuvimni aniqlash (GPS)' tugmasini bosing.");
      return;
    }

    if (!deliveryAddress.trim() || deliveryAddress.trim().length < 5) {
      alert("Iltimos, yetkazib berish manzilini (lokatsiyangizni) kiriting!");
      return;
    }

    // 3. Check Terms / Notice Acceptance
    if (systemSettings.checkoutNoticeEnabled !== false && systemSettings.checkoutNoticeText && !isTermsAccepted) {
      alert("⚠️ Buyurtmani rasmiylashtirish uchun administrator eslatmasi va shartlariga rozi bo'lishingiz (katakni belgilashingiz) shart!");
      return;
    }

    setIsPlacingOrder(true);

    try {
      const orderItems = cart.map((c) => ({
        productId: c.product.id,
        productName: `${c.product.nameUz}${c.selectedSize ? ` (${c.selectedSize})` : ''}${c.selectedColor ? ` [${c.selectedColor}]` : ''}`,
        barcode: c.product.barcode,
        quantity: c.quantity,
        unitPrice: c.product.discountPrice || c.product.price,
        totalPrice: (c.product.discountPrice || c.product.price) * c.quantity,
        image: getAutoProductImage(c.product),
        selectedSize: c.selectedSize,
        selectedColor: c.selectedColor,
      }));

      const newOrder = await createOrder({
        branchId: selectedBranch?.id || 'br_toshkent_main',
        customerName: customerName.trim() || 'Mijoz',
        customerPhone: customerPhone.trim(),
        items: orderItems,
        subtotal: cartSubtotal,
        discountTotal: discountAmount,
        cashbackUsed: 0,
        deliveryFee,
        finalTotal: finalCartTotal,
        paymentMethod,
        deliveryType,
        deliveryAddress: {
          address: deliveryAddress,
          lat: gpsLocation?.lat || 41.311081,
          lng: gpsLocation?.lng || 69.279737,
          notes: orderComment,
        },
        assignedAgentName: "To'g'ridan-to'g'ri (Mijoz)",
      });

      setActiveOrder(newOrder);
      setMyOrders((prev) => [newOrder, ...prev]);
      setAllOrders((prev) => [newOrder, ...prev]);
      setCart([]);
      setActiveTab('order_success');
    } catch (e) {
      alert("Buyurtma rasmiylashtirishda xatolik yuz berdi. Qaytadan urinib ko'ring.");
    } finally {
      setIsPlacingOrder(false);
    }
  };

  // AI Assistant Chat Handler
  const handleSendAiMessage = async (customText?: string) => {
    const textToSend = customText || aiInput;
    if (!textToSend.trim()) return;

    setAiMessages((prev) => [...prev, { sender: 'user', text: textToSend }]);
    if (!customText) setAiInput('');
    setIsAiLoading(true);

    try {
      const res = await askAIAssistant(textToSend);
      setAiMessages((prev) => [
        ...prev,
        {
          sender: 'ai',
          text: res.replyText,
          createdOrder: res.createdOrder,
        },
      ]);

      if (res.createdOrder) {
        setActiveOrder(res.createdOrder);
        setMyOrders((prev) => [res.createdOrder!, ...prev]);
      }
    } catch (e) {
      setAiMessages((prev) => [
        ...prev,
        { sender: 'ai', text: 'Kechirasiz, javob berishda xatolik yuz berdi. Qaytadan harakat qiling.' },
      ]);
    } finally {
      setIsAiLoading(false);
    }
  };

  const handleStartVoiceSearch = () => {
    setIsVoiceModalOpen(true);
    setTimeout(() => {
      setIsVoiceModalOpen(false);
      setSearchQuery('Sut');
    }, 2000);
  };

  const handleReorder = (order: Order) => {
    order.items.forEach((item) => {
      const p = products.find((prod) => prod.id === item.productId);
      if (p) addToCart(p);
    });
    setActiveTab('cart');
  };

  const handleDownloadNakladnoy = (order: Order) => {
    exportToExcel({
      filename: `Nakladnoy_${order.orderNumber}`,
      title: `TRADEUZ B2B — Nakladnoy № ${order.orderNumber}`,
      subtitle: `Mijoz: ${order.customerName} (${order.customerPhone}) | Manzil: ${order.deliveryAddress?.address || ''}`,
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
        productName: `JAMI TO'LOV SUMMASI:`,
        totalPrice: `${order.finalTotal.toLocaleString('uz-UZ')} UZS`,
      },
    });
  };

  // Staff status change helper
  const handleUpdateDeliveryStatus = async (orderId: string, status: Order['orderStatus']) => {
    const updated = await updateOrderStatus(orderId, status);
    setAllOrders(allOrders.map((o) => (o.id === updated.id ? updated : o)));
    setMyOrders(myOrders.map((o) => (o.id === updated.id ? updated : o)));
  };

  const handleRecordPayment = async (e: React.FormEvent) => {
    e.preventDefault();
    const amount = Number(paymentAmountInput);
    if (!amount || amount <= 0) return;

    const cli = b2bClients.find((c) => c.id === selectedB2bClient);
    await createPayment({
      clientId: selectedB2bClient,
      clientName: cli?.companyName || 'B2B Do\'kon',
      amount,
      paymentMethod: paymentMethodInput,
      createdByName: staffMember?.name || 'Kassa / Agent',
      notes: 'Telegram Mini App orqali to\'lov qabul qilindi',
    });

    setPaymentSuccessMsg(`✅ ${cli?.companyName} mijozidan ${amount.toLocaleString()} UZS to'lov muvaffaqiyatli qabul qilindi!`);
    setPaymentAmountInput('');
    setTimeout(() => setPaymentSuccessMsg(null), 4000);
  };

  return (
    <div className="flex flex-col h-full w-full bg-slate-100 text-slate-900 justify-between max-w-md mx-auto shadow-2xl relative font-sans overflow-hidden">
      {/* Toast Notification Banner */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 bg-slate-900/95 text-white px-4 py-2.5 rounded-2xl shadow-2xl text-xs font-bold border border-emerald-400/40 backdrop-blur-md animate-bounce">
          {toastMessage}
        </div>
      )}
      {/* 1. Fresh Emerald Header Bar */}
      <header className="bg-emerald-900 text-white shrink-0 border-b border-emerald-800 p-3.5 shadow-md">
        <div className="flex items-center justify-between gap-2 mb-2">
          <div
            onClick={handleSecretLogoClick}
            className="flex items-center gap-2.5 cursor-pointer select-none active:scale-95 transition-transform"
            title="Do'kon ma'lumotlari"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-400 via-emerald-500 to-amber-300 p-0.5 shadow-lg shadow-emerald-950/40">
              <div className="w-full h-full rounded-[14px] bg-emerald-950 flex items-center justify-center font-black text-emerald-400 text-base">
                🏬
              </div>
            </div>
            <div>
              <h1 className="font-extrabold text-sm text-white tracking-tight flex items-center gap-1.5">
                <span>{storeSettings.storeName}</span>
                {storeSettings.storeBadge && (
                  <span className="bg-emerald-500 text-emerald-950 text-[9px] px-1.5 py-0.5 rounded-full font-black uppercase">
                    {storeSettings.storeBadge}
                  </span>
                )}
              </h1>
              <p className="text-[11px] text-emerald-200 font-medium truncate max-w-[160px]">
                {customerName}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5">
            <LanguageSelector variant="compact" />
            <button
              onClick={() => setIsLoyaltyModalOpen(true)}
              className="flex items-center gap-1 bg-emerald-800 text-amber-300 border border-emerald-700 px-2.5 py-1 rounded-full text-xs font-bold hover:bg-emerald-700 transition-all"
            >
              <Gift className="w-3.5 h-3.5" />
              <span>32,000 UZS</span>
            </button>
          </div>
        </div>

        {/* Staff Auto-Recognition Banner if Phone Matches Staff */}
        {staffMember ? (
          <div className="bg-emerald-950 p-2.5 rounded-xl border border-emerald-700 flex items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 min-w-0">
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping shrink-0" />
              <div className="truncate">
                <span className="font-black text-emerald-300 block text-[11px]">
                  XODIM TANIQLANDI: {staffMember.name}
                </span>
                <span className="text-[10px] text-emerald-200 uppercase font-bold">
                  ● {staffMember.role === 'sales_agent' ? 'Savdo Agenti' : staffMember.role === 'courier' ? 'Kuryer' : staffMember.role === 'accountant' ? 'Buhgalter' : 'Menejer'} ({staffMember.phone})
                </span>
              </div>
            </div>
            <button
              onClick={() => setActiveTab(activeTab === 'staff_app' ? 'catalog' : 'staff_app')}
              className="bg-emerald-500 hover:bg-emerald-400 text-emerald-950 px-2.5 py-1.5 rounded-lg font-black text-[10px] shrink-0 uppercase shadow-md shadow-emerald-500/20"
            >
              {activeTab === 'staff_app' ? '🛒 Klient' : '💼 Xodim App'}
            </button>
          </div>
        ) : (
          /* Address & Branch Info for Client */
          <div className="flex items-center justify-between text-xs bg-emerald-950 p-2 rounded-xl border border-emerald-800 text-emerald-100">
            <div className="flex items-center gap-1.5 truncate">
              <MapPin className="w-3.5 h-3.5 text-rose-400 shrink-0" />
              <span className="truncate max-w-[210px] font-medium">{deliveryAddress}</span>
            </div>
            <span className="text-[10px] text-emerald-300 bg-emerald-800/80 px-2 py-0.5 rounded-full font-mono font-bold shrink-0 border border-emerald-700">
              ~20 min
            </span>
          </div>
        )}
      </header>

      {/* 2. Main Active Screen */}
      <main className="flex-1 overflow-y-auto pb-20">
        {/* STAFF APP VIEW (Adapted by Role) */}
        {activeTab === 'staff_app' && staffMember && (
          <div className="p-4 space-y-4">
            <div className="bg-emerald-900 text-white p-4 rounded-2xl shadow-md border border-emerald-800 space-y-2">
              <div className="flex justify-between items-center">
                <span className="bg-emerald-400 text-emerald-950 font-black text-[10px] px-2 py-0.5 rounded uppercase">
                  {staffMember.role === 'sales_agent'
                    ? 'Savdo Agenti Paneli'
                    : staffMember.role === 'courier'
                    ? 'Kuryer Paneli'
                    : 'Buhgalteriya & Kassa Paneli'}
                </span>
                <span className="text-xs font-mono text-emerald-200">{staffMember.phone}</span>
              </div>
              <h2 className="text-base font-extrabold">{staffMember.name}</h2>
              <p className="text-xs text-emerald-200">{staffMember.branchName}</p>
            </div>

            {/* ROLE 1: SAVDO AGENTI (Sales Agent) */}
            {staffMember.role === 'sales_agent' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-3">
                  <h3 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                    <Briefcase className="w-4 h-4 text-emerald-600" />
                    <span>B2B Mijoz Tanlash va Buyurtma Olish</span>
                  </h3>
                  <p className="text-xs text-slate-500">
                    Agent xaridor do'koni nomidan katalogdan mahsulotlarni tanlab, buyurtmani rasmiylashtiradi.
                  </p>

                  <div>
                    <label className="block text-xs font-bold text-slate-700 mb-1">Mijoz Do'kon:</label>
                    <select
                      value={selectedB2bClient}
                      onChange={(e) => setSelectedB2bClient(e.target.value)}
                      className="w-full bg-slate-50 border border-emerald-300 rounded-xl p-2.5 text-xs font-bold text-slate-900 focus:outline-none focus:border-emerald-600"
                    >
                      {b2bClients.map((c) => (
                        <option key={c.id} value={c.id}>
                          {c.companyName} (Qarz: {c.currentDebt.toLocaleString()} UZS)
                        </option>
                      ))}
                    </select>
                  </div>

                  <button
                    onClick={() => {
                      const cli = b2bClients.find((c) => c.id === selectedB2bClient);
                      if (cli) {
                        setCustomerName(cli.companyName);
                        setDeliveryAddress(cli.address);
                        setCustomerPhone(cli.phone);
                        setActiveTab('catalog');
                      }
                    }}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Mijoz Uchun Katalogdan Buyurtma Olish</span>
                  </button>
                </div>

                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-3">
                  <h3 className="font-extrabold text-sm text-emerald-950">Mijozlar Qarzdorlik Holati</h3>
                  <div className="space-y-2 text-xs">
                    {b2bClients.map((c) => (
                      <div key={c.id} className="p-3 bg-slate-50 rounded-xl border border-slate-200 flex items-center justify-between">
                        <div>
                          <strong className="block text-slate-900 font-bold">{c.companyName}</strong>
                          <span className="text-[10px] text-slate-500">{c.contactName} • {c.phone}</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-bold text-rose-600 block">
                            {c.currentDebt.toLocaleString()} UZS
                          </span>
                          <span className="text-[10px] text-slate-400">Limit: {c.creditLimit.toLocaleString()} UZS</span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ROLE 2: KURYER (Courier) */}
            {staffMember.role === 'courier' && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-3">
                  <h3 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                    <Truck className="w-4 h-4 text-emerald-600" />
                    <span>Faol Topshiriqlar & Zakazlar ({allOrders.length})</span>
                  </h3>

                  <div className="space-y-3 text-xs">
                    {allOrders.map((ord) => (
                      <div key={ord.id} className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200 space-y-2">
                        <div className="flex justify-between items-center font-bold">
                          <span className="text-emerald-900">Order #{ord.orderNumber}</span>
                          <span className={`px-2 py-0.5 rounded text-[10px] uppercase font-black ${
                            ord.orderStatus === 'delivered' ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'
                          }`}>
                            {ord.orderStatus}
                          </span>
                        </div>

                        <div className="text-slate-600 font-medium space-y-0.5 text-[11px]">
                          <div>👤 Mijoz: <strong>{ord.customerName}</strong></div>
                          <div>📍 Manzil: {ord.deliveryAddress?.address || 'Toshkent sh.'}</div>
                          <div className="font-mono text-emerald-700">📞 Tel: {ord.customerPhone}</div>
                          <div className="font-bold text-slate-900 font-mono text-xs pt-1">
                            Summa: {ord.finalTotal.toLocaleString()} UZS
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200">
                          <a
                            href={`tel:${ord.customerPhone}`}
                            className="bg-sky-50 text-sky-700 border border-sky-200 font-bold py-2 rounded-xl text-center flex items-center justify-center gap-1"
                          >
                            <Phone className="w-3.5 h-3.5" />
                            <span>Qo'ng'iroq</span>
                          </a>

                          <button
                            onClick={() => handleUpdateDeliveryStatus(ord.id, 'delivered')}
                            className="bg-emerald-600 text-white font-bold py-2 rounded-xl text-center flex items-center justify-center gap-1 shadow-sm"
                          >
                            <CheckSquare className="w-3.5 h-3.5" />
                            <span>Topshirildi</span>
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* ROLE 3: BUHGALTER / MANAGER */}
            {(staffMember.role === 'accountant' || staffMember.role === 'manager' || staffMember.role === 'super_admin') && (
              <div className="space-y-4">
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 shadow-sm space-y-3">
                  <h3 className="font-extrabold text-sm text-emerald-950 flex items-center gap-2">
                    <Receipt className="w-4 h-4 text-emerald-600" />
                    <span>Mijozdan To'lov Qabul Qilish (Kassa)</span>
                  </h3>

                  {paymentSuccessMsg && (
                    <div className="bg-emerald-100 text-emerald-800 p-3 rounded-xl font-bold text-xs">
                      {paymentSuccessMsg}
                    </div>
                  )}

                  <form onSubmit={handleRecordPayment} className="space-y-3 text-xs">
                    <div>
                      <label className="block text-slate-700 font-bold mb-1">Mijoz B2B Do'kon:</label>
                      <select
                        value={selectedB2bClient}
                        onChange={(e) => setSelectedB2bClient(e.target.value)}
                        className="w-full bg-slate-50 border border-emerald-300 rounded-xl p-2.5 font-bold text-slate-900 focus:outline-none"
                      >
                        {b2bClients.map((c) => (
                          <option key={c.id} value={c.id}>
                            {c.companyName} (Qarz: {c.currentDebt.toLocaleString()} UZS)
                          </option>
                        ))}
                      </select>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <label className="block text-slate-700 font-bold mb-1">Summa (UZS):</label>
                        <input
                          type="number"
                          required
                          autoComplete="off"
                          placeholder="5000000"
                          value={paymentAmountInput}
                          onChange={(e) => setPaymentAmountInput(e.target.value)}
                          className="w-full bg-slate-50 border border-emerald-300 rounded-xl p-2.5 font-mono font-bold text-slate-900"
                        />
                      </div>

                      <div>
                        <label className="block text-slate-700 font-bold mb-1">To'lov Turi:</label>
                        <select
                          value={paymentMethodInput}
                          onChange={(e) => setPaymentMethodInput(e.target.value as any)}
                          className="w-full bg-slate-50 border border-emerald-300 rounded-xl p-2.5 font-bold text-slate-900"
                        >
                          <option value="cash">Naqd pul</option>
                          <option value="card">Bank kartasi</option>
                          <option value="bank_transfer">Bank o'tkazmasi</option>
                        </select>
                      </div>
                    </div>

                    <button
                      type="submit"
                      className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-bold py-2.5 rounded-xl shadow-md shadow-emerald-600/20"
                    >
                      To'lovni Tasdiqlash va Saqlash
                    </button>
                  </form>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 1: CATALOG (Do'kon va Barcha Mahsulotlar) */}
        {activeTab === 'catalog' && (
          <div className="p-3 space-y-3">
            {/* Phone Check / Quick Phone Identifier Bar */}
            <div className="bg-white p-2.5 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between text-xs gap-2">
              <div className="flex items-center gap-1.5 min-w-0">
                <Smartphone className="w-4 h-4 text-emerald-600 shrink-0" />
                <input
                  type="tel"
                  autoComplete="off"
                  autoCorrect="off"
                  autoCapitalize="off"
                  spellCheck={false}
                  value={customerPhone}
                  onChange={(e) => setCustomerPhone(e.target.value)}
                  placeholder="+998 90 999 00 11"
                  className="bg-transparent font-mono font-bold text-emerald-950 focus:outline-none w-full"
                />
              </div>
              <span className="text-[10px] text-emerald-700 bg-emerald-100 font-extrabold px-2 py-0.5 rounded-full shrink-0 border border-emerald-200">
                {staffMember ? `Xodim: ${staffMember.role}` : 'Xaridor'}
              </span>
            </div>

            {/* Search Bar */}
            <div className="relative flex items-center">
              <Search className="w-4 h-4 absolute left-3.5 text-emerald-600" />
              <input
                type="text"
                autoComplete="off"
                autoCorrect="off"
                autoCapitalize="off"
                spellCheck={false}
                placeholder="Nima qidiryapsiz? (Coca Cola, Sut, Shakar)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-white text-xs font-medium text-slate-900 pl-9 pr-12 py-2.5 rounded-2xl border border-emerald-200 focus:outline-none focus:border-emerald-600 shadow-sm transition-colors"
              />
              <button
                onClick={handleStartVoiceSearch}
                className="absolute right-2.5 p-1.5 text-emerald-600 hover:text-emerald-800 rounded-xl hover:bg-emerald-50 transition-colors"
                title="Ovozli qidiruv"
              >
                <Mic className="w-4 h-4" />
              </button>
            </div>

            {/* Banner Promo Slider */}
            <div className="bg-gradient-to-r from-emerald-800 via-emerald-700 to-emerald-900 border border-emerald-600 rounded-2xl p-3.5 flex items-center justify-between shadow-md text-white">
              <div className="space-y-1">
                <span className="bg-amber-300 text-emerald-950 font-black text-[9px] uppercase px-2 py-0.5 rounded-md">
                  SUPERTANLOV
                </span>
                <h3 className="text-xs font-extrabold text-white">OSIYO EXPRESS YETKAZIB BERISH</h3>
                <p className="text-[11px] text-emerald-100">B2B ulgurji va chakana do'konlar uchun tezkor kuryer</p>
              </div>
              <div className="text-2xl font-black text-amber-300 font-mono">⚡25m</div>
            </div>

            {/* Categories Scroll */}
            <div className="flex gap-2 overflow-x-auto no-scrollbar py-1">
              <button
                onClick={() => setSelectedCategory('all')}
                className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                  selectedCategory === 'all'
                    ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                    : 'bg-white text-emerald-950 border border-emerald-200'
                }`}
              >
                🛒 {t('allCategories')}
              </button>
              {categories.map((c) => (
                <button
                  key={c.id}
                  onClick={() => setSelectedCategory(c.id)}
                  className={`px-3.5 py-2 rounded-xl text-xs font-extrabold whitespace-nowrap transition-all ${
                    selectedCategory === c.id
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-600/30'
                      : 'bg-white text-emerald-950 border border-emerald-200'
                  }`}
                >
                  {getCategoryName(c)}
                </button>
              ))}
            </div>

            {/* Products Grid */}
            {isLoadingProducts ? (
              <div className="grid grid-cols-2 gap-3">
                {[1, 2, 3, 4, 5, 6].map((i) => (
                  <div key={i} className="bg-white border border-slate-200 rounded-2xl p-2.5 space-y-2 animate-pulse">
                    <div className="w-full h-28 bg-slate-200 rounded-xl animate-shimmer"></div>
                    <div className="h-3 bg-slate-200 rounded-md w-3/4 animate-shimmer"></div>
                    <div className="h-2.5 bg-slate-100 rounded-md w-1/2"></div>
                    <div className="h-4 bg-emerald-100 rounded-md w-2/3"></div>
                    <div className="h-8 bg-slate-200 rounded-xl w-full"></div>
                  </div>
                ))}
              </div>
            ) : filteredProducts.length === 0 ? (
              <div className="bg-white rounded-2xl border border-emerald-200/80 p-8 text-center space-y-2 shadow-xs">
                <div className="text-3xl">🔍</div>
                <h4 className="font-bold text-slate-800 text-sm">{t('noProductsFound')}</h4>
                <p className="text-xs text-slate-500">{t('searchPlaceholder')}</p>
                <button
                  onClick={() => { setSearchQuery(''); setSelectedCategory('all'); }}
                  className="mt-2 bg-emerald-50 text-emerald-700 hover:bg-emerald-100 font-bold px-3 py-1.5 rounded-xl text-xs border border-emerald-200 active:scale-95 transition-all"
                >
                  {t('reset')}
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-3">
                {filteredProducts.map((p) => {
                  const qtyInCart = getItemQtyInCart(p.id);
                  const stock = getTotalStock(p, selectedBranch?.id);
                  const isOutOfStock = stock <= 0;
                  const hasVariants = (p.sizes && p.sizes.length > 0) || (p.colors && p.colors.length > 0);

                  return (
                    <div
                      key={p.id}
                      className={`bg-white border border-emerald-200/90 rounded-2xl p-2.5 flex flex-col justify-between shadow-xs hover:shadow-md relative group transition-all duration-200 active:scale-[0.98] ${
                        isOutOfStock ? 'opacity-80 bg-slate-50' : 'hover:border-emerald-500'
                      }`}
                    >
                    {p.isPromotional && !isOutOfStock && (
                      <span className="absolute top-2 left-2 bg-rose-600 text-white text-[9px] font-extrabold px-1.5 py-0.5 rounded-md z-10 shadow">
                        {t('promotions')}
                      </span>
                    )}

                    {isOutOfStock && (
                      <span className="absolute top-2 left-2 bg-rose-600 text-white text-[9px] font-black px-2 py-0.5 rounded-md z-10 shadow uppercase">
                        🚫 {t('outOfStock')}
                      </span>
                    )}

                    <div
                      className="cursor-pointer"
                      onClick={() => {
                        setSelectedProductModal(p);
                        setModalSize(p.sizes && p.sizes.length > 0 ? p.sizes[0] : '');
                        setModalColor(p.colors && p.colors.length > 0 ? p.colors[0] : '');
                        setModalQty(p.minQuantity || 1);
                      }}
                    >
                      <div className="w-full h-32 rounded-xl overflow-hidden mb-2 bg-slate-50 relative border border-slate-200 flex items-center justify-center p-1">
                        <img
                          src={getAutoProductImage(p)}
                          alt={getProductName(p)}
                          referrerPolicy="no-referrer"
                          className="w-full h-full object-contain group-hover:scale-105 transition-transform duration-300"
                        />
                      </div>
                      <span className="text-[10px] text-slate-500 block mb-0.5 font-mono">{p.sku}</span>
                      <h3 className="text-xs font-bold text-slate-900 line-clamp-2 leading-tight mb-1">
                        {getProductName(p)}
                      </h3>

                      {getProductDescription(p) && (
                        <p className="text-[10px] text-slate-500 line-clamp-1 mb-1">{getProductDescription(p)}</p>
                      )}

                      {/* Size & Color preview tags */}
                      <div className="flex flex-wrap gap-1 mb-1">
                        {p.sizes && p.sizes.length > 0 && (
                          <span className="text-[9px] bg-purple-50 text-purple-700 px-1 py-0.2 rounded border border-purple-200 font-semibold">
                            R: {p.sizes.join(', ')}
                          </span>
                        )}
                        {p.colors && p.colors.length > 0 && (
                          <span className="text-[9px] bg-indigo-50 text-indigo-700 px-1 py-0.2 rounded border border-indigo-200 font-semibold">
                            C: {p.colors.join(', ')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="mt-2 pt-2 border-t border-slate-100">
                      <div className="flex items-baseline justify-between mb-2">
                        <span className="text-sm font-black text-emerald-700">
                          {(p.discountPrice || p.price).toLocaleString()} UZS
                        </span>
                        <span className="text-[10px] text-slate-500 font-medium">/{p.unit}</span>
                      </div>

                      {/* Add to Cart Stepper / Out of Stock button */}
                      {isOutOfStock ? (
                        <button
                          disabled
                          className="w-full bg-slate-200 text-slate-500 font-bold py-2 rounded-xl text-xs flex items-center justify-center gap-1 cursor-not-allowed border border-slate-300"
                        >
                          <span>Tugagan (0 {p.unit})</span>
                        </button>
                      ) : qtyInCart === 0 ? (
                        <button
                          onClick={() => {
                            if (hasVariants) {
                              setSelectedProductModal(p);
                              setModalSize(p.sizes && p.sizes.length > 0 ? p.sizes[0] : '');
                              setModalColor(p.colors && p.colors.length > 0 ? p.colors[0] : '');
                              setModalQty(p.minQuantity || 1);
                            } else {
                              addToCart(p);
                            }
                          }}
                          className="w-full bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white font-extrabold py-2 rounded-xl text-xs flex items-center justify-center gap-1 shadow-md shadow-emerald-600/20 transition-all"
                        >
                          <Plus className="w-4 h-4 stroke-[2.5]" />
                          <span>{hasVariants ? 'Tanlash & Savat' : 'Savatga'}</span>
                        </button>
                      ) : (
                        <div className="flex items-center justify-between bg-emerald-50 p-1 rounded-xl border border-emerald-300">
                          <button
                            onClick={() => updateCartQty(p.id, -1, cart.find(i=>i.product.id===p.id)?.selectedSize, cart.find(i=>i.product.id===p.id)?.selectedColor)}
                            className="w-7 h-7 bg-white text-rose-600 rounded-lg flex items-center justify-center font-bold text-sm shadow-sm border border-slate-200 hover:bg-slate-100"
                          >
                            <Minus className="w-3.5 h-3.5" />
                          </button>
                          <span className="text-xs font-black text-emerald-800">{qtyInCart}</span>
                          <button
                            onClick={() => addToCart(p)}
                            className="w-7 h-7 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-sm shadow-sm hover:bg-emerald-700"
                          >
                            <Plus className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
            )}
          </div>
        )}

        {/* TAB 2: CART & 1-TAP CHECKOUT */}
        {activeTab === 'cart' && (
          <div className="p-4 space-y-4">
            <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
              <h2 className="font-bold text-base text-emerald-950 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-600" />
                <span>Savat va Rasmiylashtirish</span>
              </h2>
              {cart.length > 0 && (
                <button
                  onClick={() => setCart([])}
                  className="text-xs text-rose-600 hover:underline flex items-center gap-1 font-bold"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Tozalash</span>
                </button>
              )}
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-12 space-y-3">
                <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto border border-emerald-200">
                  <ShoppingBag className="w-8 h-8" />
                </div>
                <p className="text-slate-600 text-xs font-medium">Savatizda hozircha mahsulotlar yo'q</p>
                <button
                  onClick={() => setActiveTab('catalog')}
                  className="bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl text-xs shadow-md shadow-emerald-600/20"
                >
                  Katalogga o'tish
                </button>
              </div>
            ) : (
              <>
                {/* Cart Items */}
                <div className="space-y-2">
                  <h3 className="text-xs font-bold text-slate-700">Tanlangan mahsulotlar:</h3>
                  {cart.map((item, idx) => (
                    <div
                      key={`${item.product.id}_${item.selectedSize}_${item.selectedColor}_${idx}`}
                      className="bg-white p-3 rounded-2xl border border-emerald-200 flex items-center justify-between gap-3 shadow-sm"
                    >
                      <img
                        src={getAutoProductImage(item.product)}
                        alt={item.product.nameUz}
                        className="w-12 h-12 object-contain p-1 rounded-xl bg-slate-50 shrink-0 border border-slate-200"
                      />
                      <div className="flex-1 min-w-0">
                        <h4 className="text-xs font-bold text-slate-900 truncate">{getProductName(item.product)}</h4>
                        
                        <div className="flex flex-wrap items-center gap-1 my-0.5">
                          {item.selectedSize && (
                            <span className="text-[10px] bg-purple-100 text-purple-800 font-bold px-1.5 py-0.2 rounded border border-purple-200">
                              Razmer: {item.selectedSize}
                            </span>
                          )}
                          {item.selectedColor && (
                            <span className="text-[10px] bg-indigo-100 text-indigo-800 font-bold px-1.5 py-0.2 rounded border border-indigo-200">
                              Rang: {item.selectedColor}
                            </span>
                          )}
                          {!isProductInStock(item.product, selectedBranch?.id) && (
                            <span className="text-[10px] bg-rose-600 text-white font-extrabold px-1.5 rounded">
                              🚫 Omborda tugagan!
                            </span>
                          )}
                        </div>

                        <p className="text-xs text-emerald-700 font-extrabold">
                          {((item.product.discountPrice || item.product.price) * item.quantity).toLocaleString()} UZS
                        </p>
                      </div>
                      <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl border border-slate-200">
                        <button
                          onClick={() => updateCartQty(item.product.id, -1, item.selectedSize, item.selectedColor)}
                          className="w-6 h-6 bg-white text-slate-700 rounded-lg flex items-center justify-center font-bold text-xs shadow-xs border border-slate-200 hover:bg-slate-50"
                        >
                          <Minus className="w-3 h-3" />
                        </button>
                        <input
                          type="number"
                          min={item.product.minQuantity || 1}
                          value={item.quantity}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10);
                            setExactCartQty(item.product.id, isNaN(val) ? (item.product.minQuantity || 1) : val, item.selectedSize, item.selectedColor);
                          }}
                          className="w-12 text-center text-xs font-black text-slate-900 bg-white border border-slate-300 rounded-md py-0.5 focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 font-mono"
                        />
                        <button
                          onClick={() => addToCart(item.product, item.selectedSize, item.selectedColor, 1)}
                          className="w-6 h-6 bg-emerald-600 text-white rounded-lg flex items-center justify-center font-bold text-xs shadow-xs hover:bg-emerald-700"
                        >
                          <Plus className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>

                {/* Payment Method Selection */}
                <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 space-y-2.5 shadow-sm">
                  <label className="text-xs font-black text-emerald-950 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <CreditCard className="w-4 h-4 text-emerald-600" />
                      <span>💳 To'lov Usulini Tanlang:</span>
                    </span>
                    <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">* Majburiy</span>
                  </label>
                  <div className="grid grid-cols-2 gap-2">
                    {((systemSettings?.paymentMethods || [
                      { id: 'pm_click', name: 'Click Pass', code: 'click', icon: '📱', description: 'Onlayn to\'lov', enabled: true },
                      { id: 'pm_payme', name: 'Payme', code: 'payme', icon: '💳', description: 'Onlayn to\'lov', enabled: true },
                      { id: 'pm_cash', name: 'Naqd Pul', code: 'cash', icon: '💵', description: 'Qabul qilganda', enabled: true },
                    ]).filter((pm) => pm.enabled !== false)).map((pm) => {
                      const isSelected = paymentMethod === (pm.code as PaymentMethod);
                      return (
                        <button
                          key={pm.id}
                          type="button"
                          onClick={() => setPaymentMethod(pm.code as PaymentMethod)}
                          className={`p-2.5 rounded-xl border text-left flex items-center gap-2 transition-all cursor-pointer ${
                            isSelected
                              ? 'bg-emerald-50 border-emerald-500 ring-2 ring-emerald-400/30 text-emerald-950 font-black'
                              : 'bg-slate-50 border-slate-200 text-slate-700 hover:bg-slate-100 font-bold'
                          }`}
                        >
                          <span className="text-lg">{pm.icon}</span>
                          <div>
                            <div className="text-xs font-extrabold">{pm.name}</div>
                            <div className="text-[10px] text-slate-500 font-normal">{pm.description}</div>
                          </div>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* Delivery Address, Name, Phone & GPS Geolocation */}
                <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 space-y-3 shadow-sm">
                  {/* GPS Geolocation Block */}
                  <div className="bg-emerald-50/90 p-3 rounded-2xl border border-emerald-300 space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-black text-emerald-950 flex items-center gap-1.5">
                        <MapPin className="w-4 h-4 text-emerald-600" />
                        <span>📍 Aniq Yetkazib Berish Geolokatsiyasi (GPS)</span>
                      </span>
                      {systemSettings.isGeolocationRequiredForClient ? (
                        <span className="text-[10px] bg-rose-100 text-rose-800 font-extrabold px-1.5 py-0.5 rounded border border-rose-200">
                          * Majburiy
                        </span>
                      ) : (
                        <span className="text-[10px] bg-slate-100 text-slate-600 font-bold px-1.5 py-0.5 rounded">
                          Ixtiyoriy
                        </span>
                      )}
                    </div>

                    {gpsLocation ? (
                      <div className="bg-emerald-100 border border-emerald-400 p-2.5 rounded-xl flex items-center justify-between">
                        <div className="flex items-center gap-2">
                          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0" />
                          <div>
                            <div className="text-xs font-bold text-emerald-950">Geolokatsiya aniqlandi</div>
                            <div className="text-[10px] font-mono text-emerald-800">
                              Lat: {gpsLocation.lat}, Lng: {gpsLocation.lng}
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={handleGetGpsLocation}
                          className="text-[11px] font-bold text-emerald-800 underline hover:text-emerald-950"
                        >
                          Qayta aniqlash
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={handleGetGpsLocation}
                        disabled={isGettingGps}
                        className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold py-2.5 rounded-xl text-xs flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-95 transition-all"
                      >
                        <MapPin className="w-4 h-4" />
                        <span>
                          {isGettingGps ? 'Joylashuv aniqlanmoqda...' : '📍 Mening Joylashuvimni Aniqlash (GPS)'}
                        </span>
                      </button>
                    )}
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>👤 Ismingiz va Familiyangiz:</span>
                      <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">* Majburiy</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={customerName}
                      onChange={(e) => setCustomerName(e.target.value)}
                      placeholder="Masalan: Sardorbek Alimov"
                      className="w-full bg-slate-50 text-xs text-slate-900 p-3 rounded-xl border border-emerald-300 focus:outline-none focus:border-emerald-600 font-bold"
                    />
                  </div>

                  <div>
                    <div className="flex items-center justify-between mb-1">
                      <label className="text-xs font-bold text-slate-700 flex items-center justify-between gap-1">
                        <span>📱 Telefon raqamingiz:</span>
                        <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">* Majburiy</span>
                      </label>
                      {(window as any).Telegram?.WebApp && (
                        <button
                          type="button"
                          onClick={() => {
                            const tg = (window as any).Telegram?.WebApp;
                            if (tg && typeof tg.requestContact === 'function') {
                              tg.requestContact((sent: boolean, response: any) => {
                                if (sent && response?.responseUnsafe?.contact?.phone_number) {
                                  let phone = response.responseUnsafe.contact.phone_number;
                                  if (!phone.startsWith('+')) phone = '+' + phone;
                                  setCustomerPhone(phone);
                                  localStorage.setItem('tg_user_phone', phone);
                                  showToast(`✅ Telefon raqamingiz muvaffaqiyatli ulashildi: ${phone}`);
                                } else {
                                  showToast("ℹ️ Telefon raqamni quyidagi katakka qo'lda kiriting");
                                }
                              });
                            } else {
                              showToast("ℹ️ Telefon raqamni quyidagi katakka kiriting");
                            }
                          }}
                          className="text-[10px] bg-sky-100 hover:bg-sky-200 text-sky-800 font-extrabold px-2 py-0.5 rounded-lg border border-sky-300 active:scale-95 transition-all"
                        >
                          ⚡ Telegram'dan olish
                        </button>
                      )}
                    </div>
                    <input
                      type="tel"
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={customerPhone}
                      onChange={(e) => setCustomerPhone(e.target.value)}
                      placeholder="+998 90 123 45 67"
                      className="w-full bg-slate-50 text-xs text-slate-900 p-3 rounded-xl border border-emerald-300 focus:outline-none focus:border-emerald-600 font-mono font-bold"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>🏠 Manzil matni (ko'cha, xonadon):</span>
                      <span className="text-[10px] text-rose-600 font-extrabold bg-rose-50 px-1.5 py-0.5 rounded border border-rose-200">* Majburiy</span>
                    </label>
                    <input
                      type="text"
                      required
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={deliveryAddress}
                      onChange={(e) => setDeliveryAddress(e.target.value)}
                      placeholder="Masalan: Toshkent sh., Yunusobod 4-mavze, 12-uy"
                      className="w-full bg-slate-50 text-xs text-slate-900 p-3 rounded-xl border border-emerald-300 focus:outline-none focus:border-emerald-600 font-medium"
                    />
                  </div>

                  <div>
                    <label className="text-xs font-bold text-slate-700 block mb-1 flex items-center justify-between">
                      <span>💬 Buyurtmaga izoh:</span>
                      <span className="text-[10px] text-slate-500 font-normal">(Ixtiyoriy)</span>
                    </label>
                    <input
                      type="text"
                      autoComplete="off"
                      autoCorrect="off"
                      autoCapitalize="off"
                      spellCheck={false}
                      value={orderComment}
                      onChange={(e) => setOrderComment(e.target.value)}
                      placeholder="Masalan: Domofon kodi #12, darvoza oldiga"
                      className="w-full bg-slate-50 text-xs text-slate-900 p-2.5 rounded-xl border border-emerald-300 focus:outline-none focus:border-emerald-600"
                    />
                  </div>
                </div>

                {/* Minimum Order Warning Banner */}
                {finalCartTotal < systemSettings.minOrderAmountClient && (
                  <div className="bg-amber-100 border border-amber-300 text-amber-900 p-3 rounded-2xl text-xs font-bold space-y-1">
                    <div className="flex items-center gap-1.5 font-extrabold text-amber-950">
                      <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Minimal Buyurtma Cheklovi:</span>
                    </div>
                    <p className="text-[11px] font-medium text-amber-800">
                      Do'konimizda minimal buyurtma summasi <strong>{systemSettings.minOrderAmountClient.toLocaleString()} UZS</strong>.
                      Iltimos, xaridni tasdiqlash uchun yana <strong>{(systemSettings.minOrderAmountClient - finalCartTotal).toLocaleString()} UZS</strong> lik mahsulot qo'shing.
                    </p>
                  </div>
                )}


                {/* Promo Code Box */}
                <div className="flex gap-2">
                  <input
                    type="text"
                    value={promoCode}
                    onChange={(e) => setPromoCode(e.target.value)}
                    placeholder="Promo-kod: OSIYO2026"
                    className="flex-1 bg-white text-xs text-slate-900 px-3 py-2.5 rounded-xl border border-emerald-200 uppercase font-mono"
                  />
                  <button
                    onClick={applyPromo}
                    className="bg-emerald-100 hover:bg-emerald-200 text-emerald-800 font-bold px-3 py-2 rounded-xl text-xs border border-emerald-300"
                  >
                    Kiritish
                  </button>
                </div>

                {/* Minimum Order Amount Warning if below threshold */}
                {systemSettings.minOrderAmountClient > 0 && finalCartTotal < systemSettings.minOrderAmountClient && (
                  <div className="bg-rose-50 border border-rose-300 p-3 rounded-2xl text-xs text-rose-800 space-y-1">
                    <div className="flex items-center gap-1.5 font-extrabold text-rose-900">
                      <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                      <span>Minimal buyurtma cheklovi</span>
                    </div>
                    <p className="text-[11px] leading-relaxed">
                      Minimal buyurtma summasi: <span className="font-bold">{systemSettings.minOrderAmountClient.toLocaleString()} UZS</span>.<br />
                      Tasdiqlash uchun yana <span className="font-extrabold text-rose-950">{(systemSettings.minOrderAmountClient - finalCartTotal).toLocaleString()} UZS</span> lik mahsulot qo'shing.
                    </p>
                  </div>
                )}

                {/* Total Summary */}
                <div className="bg-white p-4 rounded-2xl border border-emerald-200 space-y-1.5 text-xs text-slate-700 shadow-sm">
                  <div className="flex justify-between">
                    <span>Mahsulotlar:</span>
                    <span className="font-bold">{cartSubtotal.toLocaleString()} UZS</span>
                  </div>
                  {discountAmount > 0 && (
                    <div className="flex justify-between text-rose-600 font-bold">
                      <span>Chegirma:</span>
                      <span>-{discountAmount.toLocaleString()} UZS</span>
                    </div>
                  )}
                  <div className="flex justify-between font-black text-sm text-emerald-800 pt-2 border-t border-slate-200">
                    <span>Jami to'lov:</span>
                    <span>{finalCartTotal.toLocaleString()} UZS</span>
                  </div>
                </div>

                {/* Terms / Notice Agreement Box */}
                {systemSettings.checkoutNoticeEnabled !== false && systemSettings.checkoutNoticeText && (
                  <div className="bg-amber-50 border border-amber-300 p-3.5 rounded-2xl space-y-2 text-xs shadow-xs">
                    <div className="flex items-center gap-1.5 font-extrabold text-amber-950">
                      <Info className="w-4 h-4 text-amber-600 shrink-0" />
                      <span>Eslatma va Shartlar:</span>
                    </div>
                    <div className="bg-white/90 p-2.5 rounded-xl border border-amber-200 text-[11px] text-slate-800 whitespace-pre-line leading-relaxed font-sans">
                      {systemSettings.checkoutNoticeText}
                    </div>
                    <label className="flex items-start gap-2 pt-1 cursor-pointer select-none">
                      <input
                        type="checkbox"
                        checked={isTermsAccepted}
                        onChange={(e) => setIsTermsAccepted(e.target.checked)}
                        className="mt-0.5 w-4 h-4 text-emerald-600 rounded border-amber-400 focus:ring-emerald-500 shrink-0 cursor-pointer"
                      />
                      <span className="text-[11px] font-extrabold text-slate-900 leading-tight">
                        Eslatma va shartlar bilan tanishdim hamda rozi bo'laman (*)
                      </span>
                    </label>
                  </div>
                )}

                {/* ONE-TAP ORDER BUTTON */}
                <button
                  onClick={handlePlaceOrder}
                  disabled={isPlacingOrder}
                  className={`w-full font-black text-sm py-3.5 rounded-2xl shadow-xl flex items-center justify-center gap-2 transition-all ${
                    systemSettings.checkoutNoticeEnabled !== false && systemSettings.checkoutNoticeText && !isTermsAccepted
                      ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
                      : 'bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white shadow-emerald-600/20'
                  }`}
                >
                  <CheckCircle2 className="w-5 h-5 stroke-[2.5]" />
                  <span>
                    {isPlacingOrder ? 'Rasmiylashtirilmoqda...' : `BUYURTMANI TASDIQLASH (${finalCartTotal.toLocaleString()} UZS)`}
                  </span>
                </button>
              </>
            )}
          </div>
        )}

        {/* TAB 3: ORDER SUCCESS */}
        {activeTab === 'order_success' && activeOrder && (
          <div className="p-4 space-y-4 animate-in fade-in duration-300">
            <div className="bg-emerald-100 border border-emerald-300 p-5 rounded-3xl text-center space-y-2 shadow-sm">
              <div className="w-16 h-16 bg-emerald-600 text-white rounded-full flex items-center justify-center mx-auto font-bold shadow-lg shadow-emerald-600/30">
                <Check className="w-10 h-10 stroke-[3]" />
              </div>
              <h2 className="text-lg font-black text-emerald-900">BUYURTMANIZ QABUL QILINDI!</h2>
              <p className="text-xs text-emerald-800 font-mono font-bold">Order #: {activeOrder.orderNumber}</p>
            </div>

            {/* Live Progress Tracker */}
            <div className="bg-white p-4 rounded-3xl border border-emerald-200 space-y-3 shadow-sm">
              <h3 className="text-xs font-bold text-slate-800">🚚 Buyurtma holati:</h3>
              <div className="grid grid-cols-3 gap-2 text-center text-[10px]">
                <div className="bg-emerald-100 border border-emerald-300 text-emerald-800 p-2 rounded-xl font-bold">
                  ✓ Qabul qilindi
                </div>
                <div className="bg-amber-100 border border-amber-300 text-amber-800 p-2 rounded-xl font-bold animate-pulse">
                  ⚡ Yig'ilmoqda
                </div>
                <div className="bg-slate-100 border border-slate-200 text-slate-500 p-2 rounded-xl">
                  🛵 Kuryerda
                </div>
              </div>

              {/* Courier info */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-200 space-y-2 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Kuryer:</span>
                  <strong className="text-emerald-900 font-bold">{activeOrder.courierName || 'Jasur Olimov'}</strong>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Taxminiy vaqt:</span>
                  <span className="text-emerald-700 font-bold">{activeOrder.estimatedDeliveryTime || '20-25 daqiqa'}</span>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <a
                  href={`tel:${activeOrder.courierPhone || '+998909990011'}`}
                  className="bg-sky-50 hover:bg-sky-100 border border-sky-300 text-sky-800 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <PhoneCall className="w-3.5 h-3.5" />
                  <span>Kuryerga tel</span>
                </a>

                <button
                  onClick={() => handleDownloadNakladnoy(activeOrder)}
                  className="bg-emerald-50 hover:bg-emerald-100 border border-emerald-300 text-emerald-800 text-xs font-bold py-2.5 rounded-xl flex items-center justify-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Nakladnoy PDF</span>
                </button>
              </div>
            </div>

            <button
              onClick={() => setActiveTab('catalog')}
              className="w-full bg-emerald-900 hover:bg-emerald-800 text-white font-bold text-xs py-3 rounded-2xl shadow-md"
            >
              Katalogga qaytish
            </button>
          </div>
        )}

        {/* TAB 4: AI OPERATOR */}
        {activeTab === 'ai' && (
          <div className="p-4 space-y-3 flex flex-col h-[78vh]">
            <div className="flex items-center gap-2 pb-2 border-b border-emerald-200">
              <div className="w-8 h-8 rounded-2xl bg-emerald-100 text-emerald-800 flex items-center justify-center font-bold border border-emerald-300 relative">
                <Bot className="w-4 h-4" />
                <span className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-emerald-500 rounded-full border border-white animate-pulse"></span>
              </div>
              <div>
                <h3 className="font-bold text-xs text-emerald-950">OSIYO AI Operator</h3>
                <p className="text-[10px] text-emerald-700">Erkin matndan avto-rasmiylashtirish</p>
              </div>
            </div>

            {/* Chat Messages */}
            <div className="flex-1 overflow-y-auto space-y-3 py-2">
              {aiMessages.map((msg, idx) => (
                <div
                  key={idx}
                  className={`flex ${msg.sender === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[88%] rounded-2xl p-3 text-xs leading-relaxed space-y-2 ${
                      msg.sender === 'user'
                        ? 'bg-emerald-600 text-white font-bold rounded-br-none shadow-md'
                        : 'bg-white text-slate-900 border border-emerald-200 rounded-bl-none shadow-sm'
                    }`}
                  >
                    <p className="whitespace-pre-line">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isAiLoading && (
                <div className="flex justify-start">
                  <div className="bg-white text-slate-600 text-xs px-3 py-2 rounded-xl flex items-center gap-1.5 border border-emerald-200 shadow-sm">
                    <Sparkles className="w-3.5 h-3.5 animate-spin text-emerald-600" />
                    <span>AI Operator buyurtmani tahlil qilmoqda...</span>
                  </div>
                </div>
              )}
            </div>

            {/* Chat Input */}
            <div className="flex gap-2 pt-2 border-t border-emerald-200">
              <input
                type="text"
                placeholder="Buyurtma matnini kiriting..."
                value={aiInput}
                onChange={(e) => setAiInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendAiMessage()}
                className="flex-1 bg-white text-xs text-slate-900 px-3 py-2.5 rounded-xl border border-emerald-300 focus:outline-none focus:border-emerald-600 shadow-sm font-medium"
              />
              <button
                onClick={() => handleSendAiMessage()}
                className="bg-emerald-600 hover:bg-emerald-700 text-white p-2.5 rounded-xl font-bold shadow-md shadow-emerald-600/20"
              >
                <Send className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}

        {/* TAB 5: MY ORDERS */}
        {activeTab === 'orders' && (
          <div className="p-4 space-y-3">
            <h2 className="font-bold text-base text-emerald-950 border-b border-emerald-200 pb-2">
              Buyurtmalar Tarixi & Nakladnoylar
            </h2>

            {myOrders.length === 0 ? (
              <div className="text-center py-12 text-slate-500 text-xs">
                Hozircha buyurtmalar yo'q
              </div>
            ) : (
              myOrders.map((o) => (
                <div key={o.id} className="bg-white p-3.5 rounded-2xl border border-emerald-200 space-y-2 shadow-sm">
                  <div className="flex justify-between text-xs font-bold text-slate-900">
                    <span>Order #{o.orderNumber}</span>
                    <span className="text-emerald-700 font-mono">{o.finalTotal.toLocaleString()} UZS</span>
                  </div>

                  <div className="text-xs text-slate-600">
                    <span>Manzil: {o.deliveryAddress.address}</span>
                  </div>

                  <div className="flex gap-2 pt-1">
                    <button
                      onClick={() => setSelectedTelegramNakladnoyOrder(o)}
                      className="flex-1 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold py-2 rounded-xl flex items-center justify-center gap-1 shadow-xs transition-colors"
                    >
                      <FileText className="w-3.5 h-3.5" />
                      <span>Yuk Nakladnosi</span>
                    </button>
                    <button
                      onClick={() => handleDownloadNakladnoy(o)}
                      className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1"
                      title="Excel Eksport"
                    >
                      <Download className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleReorder(o)}
                      className="bg-sky-50 hover:bg-sky-100 text-sky-800 border border-sky-300 text-xs font-bold px-3 py-2 rounded-xl flex items-center justify-center gap-1"
                      title="Qayta buyurtma"
                    >
                      <RefreshCw className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

        {/* TAB 6: EXCEL HUB */}
        {activeTab === 'excel_hub' && (
          <div className="p-4 space-y-4">
            <div className="border-b border-emerald-200 pb-2">
              <h2 className="font-bold text-base text-emerald-950 flex items-center gap-2">
                <FileSpreadsheet className="w-5 h-5 text-emerald-600" />
                <span>Excel & Sklad Boshqaruv Hub</span>
              </h2>
              <p className="text-xs text-slate-600">
                Osiyo Supermarket GO Excel shablonlari va import/export moduli
              </p>
            </div>

            <div className="bg-white p-3.5 rounded-2xl border border-emerald-200 space-y-3 text-xs shadow-sm">
              <h3 className="font-bold text-slate-900">📥 Shablonlarni yuklab olish:</h3>
              <div className="grid grid-cols-2 gap-2">
                {[
                  'Prixod (kirim) shabloni',
                  'Inventarizatsiya shabloni',
                  'Narx yangilash shabloni',
                  'Mahsulot import shabloni',
                ].map((tmpl, idx) => (
                  <button
                    key={idx}
                    onClick={() => setExcelStatus(`✅ ${tmpl} yuklab olindi (.xlsx)`)}
                    className="bg-slate-50 hover:bg-slate-100 border border-slate-200 p-2.5 rounded-xl text-left text-emerald-800 font-semibold flex items-center justify-between"
                  >
                    <span className="truncate">{tmpl}</span>
                    <Download className="w-3.5 h-3.5 shrink-0 text-emerald-600" />
                  </button>
                ))}
              </div>
            </div>

            {excelStatus && (
              <div className="bg-emerald-50 p-3 rounded-xl border border-emerald-300 text-emerald-900 text-xs font-mono font-bold">
                {excelStatus}
              </div>
            )}
          </div>
        )}

        {/* TAB 7: INDIVIDUAL USER PROFILE (Compact & Modern) */}
        {activeTab === 'profile' && (
          <div className="p-3 space-y-3">
            {/* User Header Badge */}
            <div className="bg-white p-3 rounded-2xl border border-emerald-200 shadow-sm flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-500 to-teal-600 text-white flex items-center justify-center text-xl font-black shadow-sm shrink-0">
                  👤
                </div>
                <div>
                  <h2 className="text-xs font-black text-slate-900 leading-tight">{customerName}</h2>
                  <p className="text-[11px] text-emerald-700 font-mono font-bold leading-tight">{customerPhone}</p>
                  <span className="inline-block mt-0.5 bg-emerald-100 text-emerald-800 text-[9px] font-bold px-1.5 py-0.2 rounded border border-emerald-200">
                    ✅ VIP Mijoz
                  </span>
                </div>
              </div>

              <button
                onClick={() => setActiveTab('orders')}
                className="bg-emerald-50 hover:bg-emerald-100 text-emerald-800 border border-emerald-300 font-bold text-[10px] px-2.5 py-1.5 rounded-xl transition-all shrink-0"
              >
                Buyurtmalarim →
              </button>
            </div>

            {/* Loyalty Cashback Banner (Compact) */}
            <div className="bg-gradient-to-r from-emerald-900 to-teal-900 p-3 rounded-2xl text-white flex items-center justify-between shadow-md border border-emerald-800">
              <div>
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="font-bold uppercase tracking-wider text-emerald-200">Cashback Balans</span>
                  <span className="bg-amber-400 text-slate-950 font-black px-1 py-0.2 rounded text-[9px]">3% Cash</span>
                </div>
                <div className="text-lg font-mono font-black text-amber-300 mt-0.5">32,000 UZS</div>
              </div>
              <div className="text-[10px] text-emerald-200 text-right">
                <span className="block font-bold">Keyingi xaridda:</span>
                <span className="text-emerald-300 font-mono">-32,000 UZS chegirma</span>
              </div>
            </div>

            {/* Compact Personal Settings Form */}
            <div className="bg-white p-3 rounded-2xl border border-emerald-200 space-y-2.5 text-xs shadow-sm">
              <div className="flex items-center justify-between">
                <h3 className="font-bold text-slate-800 text-xs">Shaxsiy Profil va Manzil:</h3>
                <span className="text-[10px] text-emerald-600 font-semibold">Tahrirlash</span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="text-[10px] text-slate-500 font-medium block mb-0.5">Ismingiz:</label>
                  <input
                    type="text"
                    value={customerName}
                    onChange={(e) => setCustomerName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-bold text-slate-800 text-xs"
                  />
                </div>

                <div>
                  <label className="text-[10px] text-slate-500 font-medium block mb-0.5">Telefon raqamingiz:</label>
                  <input
                    type="text"
                    value={customerPhone}
                    onChange={(e) => {
                      setCustomerPhone(e.target.value);
                      localStorage.setItem('tg_user_phone', e.target.value);
                    }}
                    className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 font-mono font-bold text-slate-800 text-xs"
                  />
                </div>
              </div>

              <div>
                <label className="text-[10px] text-slate-500 font-medium block mb-0.5">Doimiy yetkazib berish manzili:</label>
                <input
                  type="text"
                  value={deliveryAddress}
                  onChange={(e) => setDeliveryAddress(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-2 text-slate-800 font-medium text-xs"
                />
              </div>
            </div>

            {/* Switch to Agent Panel Option */}
            {onOpenAgentPanel && (
              <div className="bg-amber-50/90 p-2.5 rounded-2xl border border-amber-300 flex items-center justify-between gap-2 shadow-sm">
                <div className="flex items-center gap-2">
                  <Briefcase className="w-4 h-4 text-amber-600 shrink-0" />
                  <div>
                    <h4 className="font-bold text-[11px] text-slate-900 leading-tight">Savdo Agenti Moduli</h4>
                    <p className="text-[9px] text-slate-600 leading-tight">B2B do'konlar va ulgurji kassa</p>
                  </div>
                </div>
                <button
                  onClick={onOpenAgentPanel}
                  className="bg-amber-400 hover:bg-amber-300 text-slate-950 font-black px-3 py-1.5 rounded-xl text-[10px] uppercase shadow shrink-0"
                >
                  Agent Paneli →
                </button>
              </div>
            )}
          </div>
        )}
      </main>

      {/* 3. Bottom Floating Bar for Cart */}
      {cart.length > 0 && activeTab === 'catalog' && (
        <div className="absolute bottom-16 left-0 right-0 max-w-md mx-auto px-3 z-30">
          <button
            onClick={() => setActiveTab('cart')}
            className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-black py-3 px-4 rounded-2xl shadow-2xl flex items-center justify-between transition-all active:scale-98 border border-emerald-400/30"
          >
            <div className="flex items-center gap-2">
              <span className="bg-emerald-950 text-white px-2.5 py-0.5 rounded-lg text-xs font-mono font-bold">
                {cartTotalItemsCount} dona
              </span>
              <span className="text-xs font-bold">Savat va Rasmiylashtirish</span>
            </div>
            <div className="flex items-center gap-1 text-xs font-mono font-bold">
              <span>{finalCartTotal.toLocaleString()} UZS</span>
              <ArrowRight className="w-4 h-4" />
            </div>
          </button>
        </div>
      )}

      {/* 4. Fresh Green Bottom Navigation Bar */}
      <nav className="shrink-0 bg-emerald-950 border-t border-emerald-900 px-3 py-2.5 safe-pb flex items-center justify-around z-40 text-emerald-200 shadow-2xl">
        <button
          onClick={() => setActiveTab('catalog')}
          className={`flex flex-col items-center text-[10px] font-bold transition-all active:scale-90 ${
            activeTab === 'catalog' ? 'text-emerald-400 font-black scale-105' : 'text-emerald-300/70 hover:text-white'
          }`}
        >
          <Home className="w-5 h-5 mb-0.5" />
          <span>Katalog</span>
        </button>

        <button
          onClick={() => setActiveTab('cart')}
          className={`flex flex-col items-center text-[10px] font-bold relative transition-all active:scale-90 ${
            activeTab === 'cart' ? 'text-emerald-400 font-black scale-105' : 'text-emerald-300/70 hover:text-white'
          }`}
        >
          <div className="relative">
            <ShoppingBag className="w-5 h-5 mb-0.5" />
            {cartTotalItemsCount > 0 && (
              <span className="absolute -top-1.5 -right-2 bg-rose-500 text-white font-black text-[9px] w-4 h-4 rounded-full flex items-center justify-center shadow-md animate-pulse">
                {cartTotalItemsCount}
              </span>
            )}
          </div>
          <span>Savat</span>
        </button>

        <button
          onClick={() => setActiveTab('ai')}
          className={`flex flex-col items-center text-[10px] font-bold transition-all active:scale-90 ${
            activeTab === 'ai' ? 'text-emerald-400 font-black scale-105' : 'text-emerald-300/70 hover:text-white'
          }`}
        >
          <Bot className="w-5 h-5 mb-0.5" />
          <span>AI Operator</span>
        </button>

        <button
          onClick={() => setActiveTab('orders')}
          className={`flex flex-col items-center text-[10px] font-bold relative transition-all active:scale-90 ${
            activeTab === 'orders' || activeTab === 'order_success' ? 'text-emerald-400 font-black scale-105' : 'text-emerald-300/70 hover:text-white'
          }`}
        >
          <Clock className="w-5 h-5 mb-0.5" />
          <span>Zakazlar</span>
        </button>

        <button
          onClick={() => setActiveTab('profile')}
          className={`flex flex-col items-center text-[10px] font-bold transition-all active:scale-90 ${
            activeTab === 'profile' ? 'text-emerald-400 font-black scale-105' : 'text-emerald-300/70 hover:text-white'
          }`}
        >
          <User className="w-5 h-5 mb-0.5" />
          <span>Profil</span>
        </button>
      </nav>

      {/* Product Detail / Variant Options Selection Modal */}
      {selectedProductModal && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-200 rounded-3xl p-5 max-w-sm w-full space-y-4 shadow-2xl relative animate-in fade-in zoom-in-95 duration-150">
            <button
              onClick={() => setSelectedProductModal(null)}
              className="absolute top-4 right-4 p-1 text-slate-400 hover:text-slate-800 rounded-full hover:bg-slate-100"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex gap-3 items-center">
              <div className="w-20 h-20 bg-slate-50 border border-slate-200 rounded-2xl p-1 shrink-0 flex items-center justify-center">
                <img
                  src={getAutoProductImage(selectedProductModal)}
                  alt={selectedProductModal.nameUz}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-contain"
                />
              </div>
              <div>
                <span className="text-[10px] text-emerald-700 font-extrabold uppercase bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                  {selectedProductModal.brand || 'Tradeuz'}
                </span>
                <h3 className="font-bold text-slate-900 text-sm leading-snug mt-1">
                  {getProductName(selectedProductModal)}
                </h3>
                <div className="text-base font-extrabold text-emerald-700 font-mono mt-0.5">
                  {(selectedProductModal.discountPrice || selectedProductModal.price).toLocaleString()} UZS
                </div>
              </div>
            </div>

            {getProductDescription(selectedProductModal) && (
              <p className="text-xs text-slate-600 bg-slate-50 p-2.5 rounded-xl border border-slate-200">
                {getProductDescription(selectedProductModal)}
              </p>
            )}

            {/* Stock status indicator */}
            {!isProductInStock(selectedProductModal, selectedBranch?.id) ? (
              <div className="bg-rose-50 border border-rose-200 text-rose-700 p-2.5 rounded-xl text-xs font-bold flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0" />
                <span>Hozirda ushbu mahsulot omborda tugagan (0 {selectedProductModal.unit}). Zakaz urib bo'lmaydi.</span>
              </div>
            ) : (
              <div className="bg-emerald-50 border border-emerald-200 text-emerald-800 p-2 rounded-xl text-xs font-semibold flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>Omborda bor: {getTotalStock(selectedProductModal, selectedBranch?.id)} {selectedProductModal.unit}</span>
              </div>
            )}

            {/* Manual Quantity Input */}
            <div className="space-y-1.5 bg-slate-50 p-3 rounded-2xl border border-slate-200">
              <div className="flex justify-between items-center text-xs font-bold text-slate-800">
                <span>Miqdorini kiriting ({selectedProductModal.unit}):</span>
                {selectedProductModal.minQuantity && selectedProductModal.minQuantity > 1 && (
                  <span className="text-[10px] text-amber-800 font-extrabold bg-amber-100 px-2 py-0.5 rounded-md border border-amber-300">
                    Min: {selectedProductModal.minQuantity} {selectedProductModal.unit}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setModalQty(Math.max(selectedProductModal.minQuantity || 1, modalQty - 1))}
                  className="w-10 h-10 bg-white hover:bg-slate-100 text-slate-800 rounded-xl font-black text-lg border border-slate-300 shadow-xs flex items-center justify-center"
                >
                  -
                </button>
                <input
                  type="number"
                  min={selectedProductModal.minQuantity || 1}
                  value={modalQty}
                  onChange={(e) => {
                    const parsed = parseInt(e.target.value, 10);
                    setModalQty(isNaN(parsed) ? (selectedProductModal.minQuantity || 1) : Math.max(selectedProductModal.minQuantity || 1, parsed));
                  }}
                  className="flex-1 text-center py-2 text-base font-black text-slate-900 border border-slate-300 rounded-xl bg-white focus:outline-none focus:border-emerald-600 focus:ring-1 focus:ring-emerald-500 font-mono shadow-xs"
                />
                <button
                  type="button"
                  onClick={() => setModalQty(modalQty + 1)}
                  className="w-10 h-10 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-black text-lg border border-emerald-600 shadow-xs flex items-center justify-center"
                >
                  +
                </button>
              </div>
            </div>

            {/* Size selector if sizes exist */}
            {selectedProductModal.sizes && selectedProductModal.sizes.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block">Razmerni tanlang:</label>
                <div className="flex flex-wrap gap-2">
                  {selectedProductModal.sizes.map((s) => (
                    <button
                      key={s}
                      onClick={() => setModalSize(s)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        modalSize === s
                          ? 'bg-purple-600 text-white border-purple-600 shadow-md shadow-purple-600/30'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {s}
                    </button>
                  ))}
                </div>
              </div>
            )}

            {/* Color selector if colors exist */}
            {selectedProductModal.colors && selectedProductModal.colors.length > 0 && (
              <div className="space-y-1.5">
                <label className="text-xs font-extrabold text-slate-800 block">Rangni tanlang:</label>
                <div className="flex flex-wrap gap-2">
                  {selectedProductModal.colors.map((c) => (
                    <button
                      key={c}
                      onClick={() => setModalColor(c)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-bold border transition-all ${
                        modalColor === c
                          ? 'bg-indigo-600 text-white border-indigo-600 shadow-md shadow-indigo-600/30'
                          : 'bg-slate-50 text-slate-800 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            )}

            <button
              disabled={!isProductInStock(selectedProductModal, selectedBranch?.id)}
              onClick={() => {
                addToCart(selectedProductModal, modalSize, modalColor, modalQty);
                setSelectedProductModal(null);
              }}
              className={`w-full py-3 rounded-2xl font-extrabold text-xs shadow-md flex items-center justify-center gap-2 ${
                !isProductInStock(selectedProductModal, selectedBranch?.id)
                  ? 'bg-slate-200 text-slate-400 cursor-not-allowed border border-slate-300'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-600/30 active:scale-95 transition-all'
              }`}
            >
              <Plus className="w-4 h-4" />
              <span>Savatga Qo'shish</span>
            </button>
          </div>
        </div>
      )}

      {/* Voice Search Modal */}
      {isVoiceModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-200 rounded-3xl p-6 text-center max-w-xs w-full space-y-3 shadow-2xl">
            <div className="w-14 h-14 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto animate-pulse border border-emerald-300">
              <Mic className="w-7 h-7" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm">Ovozli izlash...</h3>
            <p className="text-xs text-slate-500">Masalan: "Sut" yoki "Coca Cola"</p>
          </div>
        </div>
      )}

      {/* Loyalty Modal */}
      {isLoyaltyModalOpen && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-white border border-emerald-200 rounded-3xl p-5 max-w-xs w-full space-y-4 shadow-2xl">
            <div className="flex justify-between items-center border-b border-slate-100 pb-2">
              <span className="text-sm font-bold text-slate-900">OSIYO VIP Loyalty Card</span>
              <button onClick={() => setIsLoyaltyModalOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-gradient-to-tr from-emerald-800 via-emerald-700 to-amber-600 p-4 rounded-2xl text-white font-bold space-y-2 shadow-xl">
              <div className="flex justify-between items-center">
                <span className="text-xs uppercase tracking-wider font-black">OSIYO GO VIP</span>
                <span className="text-xs font-mono">OSIYO2026</span>
              </div>
              <div className="text-2xl tracking-widest font-mono font-black text-amber-300">32,000 UZS</div>
              <p className="text-[10px] opacity-90">3% Cashback avto-to'planadi</p>
            </div>
          </div>
        </div>
      )}

      {/* Nakladnoy Modal */}
      {selectedTelegramNakladnoyOrder && (
        <NakladnoyModal
          order={selectedTelegramNakladnoyOrder}
          onClose={() => setSelectedTelegramNakladnoyOrder(null)}
        />
      )}
    </div>
  );
};
