import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { Product, Category, PriceType, Branch } from '../types';

export type Language = 'uz' | 'ru' | 'en';

export const LANGUAGE_LABELS: Record<Language, { label: string; flag: string; code: string }> = {
  uz: { label: "O'zbekcha", flag: '🇺🇿', code: 'UZ' },
  ru: { label: 'Русский', flag: '🇷🇺', code: 'RU' },
  en: { label: 'English', flag: '🇬🇧', code: 'EN' },
};

// Complete multi-language dictionary for the application
export const translations: Record<string, Record<Language, string>> = {
  // Navigation & Views
  catalog: { uz: 'Katalog', ru: 'Каталог', en: 'Catalog' },
  cart: { uz: 'Savatcha', ru: 'Корзина', en: 'Cart' },
  aiOperator: { uz: 'AI Operator', ru: 'AI Оператор', en: 'AI Assistant' },
  orders: { uz: 'Buyurtmalar', ru: 'Заказы', en: 'Orders' },
  profile: { uz: 'Profil', ru: 'Профиль', en: 'Profile' },
  agentPanel: { uz: 'Agent Paneli', ru: 'Панель Агента', en: 'Agent Panel' },
  adminPanel: { uz: 'Admin Paneli', ru: 'Панель Админа', en: 'Admin Panel' },
  allBranches: { uz: 'Barcha filiallar', ru: 'Все филиалы', en: 'All Branches' },
  nearestBranch: { uz: 'Eng yaqin ombor', ru: 'Ближайший склад', en: 'Nearest Branch' },
  clientAppMode: { uz: 'Mijoz ilovasi', ru: 'Клиентское приложение', en: 'Client App' },
  staffApp: { uz: 'Xodim paneli', ru: 'Панель сотрудника', en: 'Staff Panel' },
  excelHub: { uz: 'Excel Hub', ru: 'Excel Хаб', en: 'Excel Hub' },

  // Search & Catalog
  searchPlaceholder: {
    uz: 'Nomi yoki shtrix-kod bo’yicha qidirish...',
    ru: 'Поиск по названию или штрихкоду...',
    en: 'Search by name or barcode...',
  },
  allCategories: { uz: 'Barcha kategoriyalar', ru: 'Все категории', en: 'All Categories' },
  popularProducts: { uz: 'Ommabop mahsulotlar', ru: 'Популярные товары', en: 'Popular Products' },
  promotions: { uz: 'Aktsiyalar va Chegirmalar', ru: 'Акции и Скидки', en: 'Promotions & Discounts' },
  inStock: { uz: 'Mavjud', ru: 'В наличии', en: 'In stock' },
  outOfStock: { uz: 'Tugagan', ru: 'Нет в наличии', en: 'Out of stock' },
  lowStock: { uz: 'Kam qoldi', ru: 'Мало на складе', en: 'Low stock' },
  addToCart: { uz: 'Savatga qo’shish', ru: 'В корзину', en: 'Add to Cart' },
  inCart: { uz: 'Savatda', ru: 'В корзине', en: 'In Cart' },
  price: { uz: 'Narxi', ru: 'Цена', en: 'Price' },
  barcode: { uz: 'Shtrix-kod', ru: 'Штрихкод', en: 'Barcode' },
  unit: { uz: 'Birlik', ru: 'Ед. изм.', en: 'Unit' },
  brand: { uz: 'Brend', ru: 'Бренд', en: 'Brand' },
  description: { uz: 'Tavsif', ru: 'Описание', en: 'Description' },
  noProductsFound: { uz: 'Mahsulotlar topilmadi', ru: 'Товары не найдены', en: 'No products found' },
  selectBranch: { uz: 'Filialni tanlang', ru: 'Выберите филиал', en: 'Select Branch' },
  totalStock: { uz: 'Umumiy qoldiq', ru: 'Общий остаток', en: 'Total Stock' },
  minStockAlert: { uz: 'Minimal zaxira', ru: 'Мин. остаток', en: 'Min Stock' },

  // Cart & Checkout
  cartTitle: { uz: 'Xaridlar savatchasi', ru: 'Корзина покупок', en: 'Shopping Cart' },
  emptyCart: { uz: 'Savatchangiz bo’sh', ru: 'Ваша корзина пуста', en: 'Your cart is empty' },
  startShopping: { uz: 'Xaridlarni boshlash', ru: 'Начать покупки', en: 'Start shopping' },
  subtotal: { uz: 'Mahsulotlar summasi', ru: 'Сумма товаров', en: 'Subtotal' },
  deliveryFee: { uz: 'Yetkazib berish', ru: 'Доставка', en: 'Delivery fee' },
  freeDelivery: { uz: 'Bepul', ru: 'Бесплатно', en: 'Free' },
  discount: { uz: 'Chegirma', ru: 'Скидка', en: 'Discount' },
  finalTotal: { uz: 'Jami to’lanadigan', ru: 'Итого к оплате', en: 'Total' },
  checkout: { uz: 'Buyurtmani rasmiylashtirish', ru: 'Оформить заказ', en: 'Checkout' },
  deliveryType: { uz: 'Yetkazib berish turi', ru: 'Тип доставки', en: 'Delivery Type' },
  expressDelivery: { uz: 'Express (Tezkor 30-45 min)', ru: 'Экспресс (Быстрая 30-45 мин)', en: 'Express (Fast 30-45 min)' },
  standardDelivery: { uz: 'Standart (Bugun davomida)', ru: 'Стандартная (В течение дня)', en: 'Standard (Today)' },
  pickup: { uz: 'Olib ketish (Samovivoz)', ru: 'Самовывоз из магазина', en: 'Store Pickup' },
  paymentMethod: { uz: 'To’lov usuli', ru: 'Способ оплаты', en: 'Payment Method' },
  customerName: { uz: 'Ismingiz va familiyangiz', ru: 'Ваше имя и фамилия', en: 'Full Name' },
  customerPhone: { uz: 'Telefon raqamingiz', ru: 'Номер телефона', en: 'Phone Number' },
  deliveryAddress: { uz: 'Yetkazib berish manzili', ru: 'Адрес доставки', en: 'Delivery Address' },
  useGps: { uz: 'GPS Lokatsiyani aniqlash', ru: 'Определить по GPS', en: 'Detect GPS' },
  promoCode: { uz: 'Promo-kod kiritish', ru: 'Ввести промокод', en: 'Promo Code' },
  apply: { uz: 'Qo’llash', ru: 'Применить', en: 'Apply' },
  orderNotes: { uz: 'Buyurtma uchun izoh (Kipod, domofon...)', ru: 'Комментарий к заказу (Подъезд, домофон...)', en: 'Order Notes (Entrance, intercom...)' },
  confirmOrder: { uz: 'Buyurtmani tasdiqlash', ru: 'Подтвердить заказ', en: 'Confirm Order' },
  minOrderNotice: { uz: 'Minimal buyurtma summasi', ru: 'Минимальная сумма заказа', en: 'Minimum order amount' },
  clearCart: { uz: 'Savatni tozalash', ru: 'Очистить корзину', en: 'Clear Cart' },

  // Order Statuses & History
  orderNumber: { uz: 'Buyurtma №', ru: 'Заказ №', en: 'Order #' },
  orderDate: { uz: 'Sana', ru: 'Дата', en: 'Date' },
  statusPending: { uz: 'Kutilmoqda', ru: 'В ожидании', en: 'Pending' },
  statusAccepted: { uz: 'Qabul qilindi', ru: 'Принят', en: 'Accepted' },
  statusAssembling: { uz: 'Yig’ilmoqda', ru: 'Собирается', en: 'Assembling' },
  statusInDelivery: { uz: 'Yetkazilmoqda', ru: 'В пути', en: 'In delivery' },
  statusDelivered: { uz: 'Yetkazildi', ru: 'Доставлен', en: 'Delivered' },
  statusCancelled: { uz: 'Bekor qilindi', ru: 'Отменен', en: 'Cancelled' },
  noOrders: { uz: 'Sizda hali buyurtmalar mavjud emas', ru: 'У вас пока нет заказов', en: 'No order history yet' },
  orderSuccessTitle: { uz: 'Rahmat! Buyurtmangiz qabul qilindi', ru: 'Спасибо! Ваш заказ принят', en: 'Thank you! Order received' },
  orderSuccessDesc: {
    uz: 'Operatormiz va kuryerimiz tez orada siz bilan bog’lanadi.',
    ru: 'Наш оператор и курьер скоро свяжутся с вами.',
    en: 'Our operator and courier will contact you shortly.',
  },
  trackOrder: { uz: 'Buyurtmani kuzatish', ru: 'Отследить заказ', en: 'Track Order' },

  // AI Assistant
  aiOperatorTitle: { uz: 'AI Qandolat & Oziq-ovqat Operator', ru: 'AI Кондитерский & Продуктовый Оператор', en: 'AI Food & Grocery Assistant' },
  aiWelcomeMessage: {
    uz: "Salom! Men Osiyo Supermarket AI Operatoriman. Menga istalgan shaklda yozishingiz mumkin, masalan: \"2 ta Krember Tetlis shokolad va 1 dona Musaffo sut Yunusobod 4-mavze 12-uyga\". Men buyurtmangizni darhol rasmiylashtirib beraman!",
    ru: 'Здравствуйте! Я AI Оператор Азия Супермаркет. Вы можете написать мне список товаров в свободной форме, например: "2 шт шоколад Крембер Тетлис и 1 шт молоко Мусаффо на Юнусабад 4 кв дом 12". Я оформить ваш заказ мгновенно!',
    en: 'Hello! I am Osiyo Supermarket AI Operator. You can write your shopping list in plain text, for example: "2 pcs Krember Tetlis chocolate and 1 pc Musaffo milk to Yunusabad block 4, building 12". I will process your order immediately!',
  },
  aiInputPlaceholder: {
    uz: 'Xabaringizni yozing yoki mikrofondan foydalaning...',
    ru: 'Напишите сообщение или используйте микрофон...',
    en: 'Type your message or use microphone...',
  },
  send: { uz: 'Yuborish', ru: 'Отправить', en: 'Send' },
  voiceSearch: { uz: 'Ovozli qidiruv', ru: 'Голосовой поиск', en: 'Voice Search' },
  listening: { uz: 'Eshitilmoqda...', ru: 'Слушаю...', en: 'Listening...' },

  // Agent Panel & B2B
  agentPanelTitle: { uz: 'Savdo Agenti Paneli', ru: 'Панель Торгового Агента', en: 'Sales Agent Panel' },
  selectAgent: { uz: 'Agentni tanlang', ru: 'Выберите агента', en: 'Select Agent' },
  clientsList: { uz: 'Mijozlar (Do’konlar)', ru: 'Клиенты (Магазины)', en: 'Clients (Stores)' },
  addClient: { uz: 'Yangi do’kon qo’shish', ru: 'Добавить магазин', en: 'Add Store' },
  takeOrder: { uz: 'Buyurtma olish', ru: 'Принять заказ', en: 'Take Order' },
  collectPayment: { uz: 'To’lov yig’ish', ru: 'Сбор оплаты', en: 'Collect Payment' },
  aktSverka: { uz: 'Akt Sverka', ru: 'Акт Сверки', en: 'Reconciliation Statement' },
  clientDebt: { uz: 'Mijoz qarzi', ru: 'Долг клиента', en: 'Client Debt' },
  creditLimit: { uz: 'Kredit limiti', ru: 'Кредитный лимит', en: 'Credit Limit' },
  photoAudit: { uz: 'Foto-audit', ru: 'Фото-аудит', en: 'Photo Audit' },
  agentVisits: { uz: 'Tashriflar ro’yxati', ru: 'Список визитов', en: 'Visits Log' },
  priceType: { uz: 'Narx turi', ru: 'Тип цены', en: 'Price List' },
  roznitsa: { uz: 'Chakana', ru: 'Розница', en: 'Retail' },
  optom: { uz: 'Ulgurji (Optom)', ru: 'Оптом', en: 'Wholesale' },
  vipPrice: { uz: 'VIP narx', ru: 'VIP цена', en: 'VIP Price' },
  exportExcel: { uz: 'Excel yuklab olish', ru: 'Скачать Excel', en: 'Export Excel' },
  startVisit: { uz: 'Tashrifni boshlash', ru: 'Начать визит', en: 'Start Visit' },
  endVisit: { uz: 'Tashrifni yakunlash', ru: 'Завершить визит', en: 'End Visit' },

  // Admin Panel & Modules
  adminTitle: { uz: 'Boshqaruv Tizimi (ERP / POS)', ru: 'Система Управления (ERP / POS)', en: 'Management System (ERP / POS)' },
  analytics: { uz: 'Analitika & Hisobotlar', ru: 'Аналитика и Отчеты', en: 'Analytics & Reports' },
  productManagement: { uz: 'Tovarlar boshqaruvi', ru: 'Управление товарами', en: 'Product Management' },
  ordersModule: { uz: 'Buyurtmalar monitoringi', ru: 'Мониторинг заказов', en: 'Orders Monitoring' },
  clientsModule: { uz: 'Mijozlar bazasi', ru: 'База клиентов', en: 'Client Base' },
  inventory: { uz: 'Ombor va Zaxiralar', ru: 'Склад и Остатки', en: 'Warehouse & Inventory' },
  posModule: { uz: 'POS Kassa', ru: 'POS Касса', en: 'POS Cashier' },
  pricesModule: { uz: 'Narx turlari', ru: 'Типы цен', en: 'Price Types' },
  staffModule: { uz: 'Xodimlar va Huquqlar', ru: 'Сотрудники и Права', en: 'Staff & Permissions' },
  systemSettings: { uz: 'Tizim sozlamalari', ru: 'Настройки системы', en: 'System Settings' },
  loginTitle: { uz: 'Tizimga kirish (Admin / Agent / Kassa)', ru: 'Вход в систему (Админ / Агент / Касса)', en: 'System Login (Admin / Agent / POS)' },
  username: { uz: 'Login', ru: 'Логин', en: 'Username' },
  password: { uz: 'Parol', ru: 'Пароль', en: 'Password' },
  loginButton: { uz: 'Tizimga kirish', ru: 'Войти в систему', en: 'Log In' },
  selectLanguage: { uz: 'Tilni tanlang', ru: 'Выберите язык', en: 'Select Language' },
  logout: { uz: 'Chiqish', ru: 'Выход', en: 'Logout' },

  // Common Units & Actions
  unitDona: { uz: 'dona', ru: 'шт', en: 'pcs' },
  unitKg: { uz: 'kg', ru: 'кг', en: 'kg' },
  unitLitr: { uz: 'litr', ru: 'л', en: 'L' },
  unitQuti: { uz: 'quti', ru: 'кор', en: 'box' },
  unitPachka: { uz: 'pachka', ru: 'пач', en: 'pack' },
  currency: { uz: 'so’m', ru: 'сум', en: 'UZS' },
  save: { uz: 'Saqlash', ru: 'Сохранить', en: 'Save' },
  cancel: { uz: 'Bekor qilish', ru: 'Отмена', en: 'Cancel' },
  close: { uz: 'Yopish', ru: 'Закрыть', en: 'Close' },
  delete: { uz: 'O’chirish', ru: 'Удалить', en: 'Delete' },
  edit: { uz: 'Tahrirlash', ru: 'Редактировать', en: 'Edit' },
  add: { uz: 'Qo’shish', ru: 'Добавить', en: 'Add' },
  success: { uz: 'Muvaffaqiyatli', ru: 'Успешно', en: 'Success' },
  error: { uz: 'Xatolik', ru: 'Ошибка', en: 'Error' },
  loading: { uz: 'Yuklanmoqda...', ru: 'Загрузка...', en: 'Loading...' },
  back: { uz: 'Orqaga', ru: 'Назад', en: 'Back' },
  print: { uz: 'Chop etish', ru: 'Печать', en: 'Print' },
  filter: { uz: 'Filtrlash', ru: 'Фильтр', en: 'Filter' },
  reset: { uz: 'Tozalash', ru: 'Сбросить', en: 'Reset' },
  all: { uz: 'Barchasi', ru: 'Все', en: 'All' },
};

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: string) => string;
  getProductName: (product: Product) => string;
  getProductDescription: (product: Product) => string;
  getCategoryName: (category: Category) => string;
  getPriceTypeName: (priceType: PriceType) => string;
  getBranchName: (branch: Branch) => string;
  getUnitName: (unit: string) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>(() => {
    try {
      const saved = localStorage.getItem('app_language') as Language;
      if (saved && (saved === 'uz' || saved === 'ru' || saved === 'en')) {
        return saved;
      }
    } catch (e) {
      console.error('Failed to load saved language:', e);
    }
    return 'uz'; // Default language
  });

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    try {
      localStorage.setItem('app_language', lang);
      // Dispatch custom DOM event for external non-React listeners if needed
      window.dispatchEvent(new CustomEvent('language_changed', { detail: { language: lang } }));
    } catch (e) {
      console.error('Failed to save language:', e);
    }
  };

  const t = (key: string): string => {
    if (translations[key] && translations[key][language]) {
      return translations[key][language];
    }
    // Fallback to Uzbek, or the key itself
    if (translations[key] && translations[key]['uz']) {
      return translations[key]['uz'];
    }
    return key;
  };

  const getProductName = (product: Product): string => {
    if (!product) return '';
    if (language === 'ru') return product.nameRu || product.nameUz || product.nameEn || '';
    if (language === 'en') return product.nameEn || product.nameUz || product.nameRu || '';
    return product.nameUz || product.nameRu || product.nameEn || '';
  };

  const getProductDescription = (product: Product): string => {
    if (!product) return '';
    if (language === 'ru') return product.descriptionRu || product.descriptionUz || product.descriptionEn || product.description || '';
    if (language === 'en') return product.descriptionEn || product.descriptionUz || product.descriptionRu || product.description || '';
    return product.descriptionUz || product.description || product.descriptionRu || product.descriptionEn || '';
  };

  const getCategoryName = (category: Category): string => {
    if (!category) return '';
    if (language === 'ru') return category.nameRu || category.nameUz || category.nameEn || '';
    if (language === 'en') return category.nameEn || category.nameUz || category.nameRu || '';
    return category.nameUz || category.nameRu || category.nameEn || '';
  };

  const getPriceTypeName = (priceType: PriceType): string => {
    if (!priceType) return '';
    if (language === 'ru') {
      if (priceType.code === 'prixod') return 'Цена прихода';
      if (priceType.code === 'roznitsa') return 'Розница';
      if (priceType.code === 'optom') return 'Оптовая цена';
      if (priceType.code === 'vip') return 'VIP цена';
    }
    if (language === 'en') {
      if (priceType.code === 'prixod') return 'Purchase Price';
      if (priceType.code === 'roznitsa') return 'Retail Price';
      if (priceType.code === 'optom') return 'Wholesale Price';
      if (priceType.code === 'vip') return 'VIP Price';
    }
    return priceType.nameUz || priceType.code;
  };

  const getBranchName = (branch: Branch): string => {
    if (!branch) return '';
    if (language === 'ru') {
      if (branch.name.includes('Bosh ombor')) return branch.name.replace('Bosh ombor', 'Главный склад');
      if (branch.name.includes('filiali')) return branch.name.replace('filiali', 'филиал');
    }
    if (language === 'en') {
      if (branch.name.includes('Bosh ombor')) return branch.name.replace('Bosh ombor', 'Main Warehouse');
      if (branch.name.includes('filiali')) return branch.name.replace('filiali', 'branch');
    }
    return branch.name;
  };

  const getUnitName = (unit: string): string => {
    switch (unit) {
      case 'dona':
        return t('unitDona');
      case 'kg':
        return t('unitKg');
      case 'litr':
        return t('unitLitr');
      case 'quti':
        return t('unitQuti');
      case 'pachka':
        return t('unitPachka');
      default:
        return unit;
    }
  };

  return (
    <LanguageContext.Provider
      value={{
        language,
        setLanguage,
        t,
        getProductName,
        getProductDescription,
        getCategoryName,
        getPriceTypeName,
        getBranchName,
        getUnitName,
      }}
    >
      {children}
    </LanguageContext.Provider>
  );
};

export const useLanguage = (): LanguageContextType => {
  const context = useContext(LanguageContext);
  if (!context) {
    throw new Error('useLanguage must be used within a LanguageProvider');
  }
  return context;
};
